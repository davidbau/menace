#!/usr/bin/env python3
"""Plan a session move sequence by adaptively navigating to the downstairs.

Usage:
    python3 plan_session.py <seed> [--max-moves N]

This script discovers the move sequence needed to navigate from the upstairs
to the downstairs on Dlvl:1. It works adaptively:

1. Launches the C binary with the given seed
2. Captures the terrain grid via #dumpmap
3. Finds the player position and the downstairs
4. Runs BFS to plan a cardinal-only path
5. Sends one move at a time, re-planning after each step

The adaptive approach handles obstacles that a static pre-planned sequence
cannot: monster encounters (which consume move keys for attacks), locked
doors (which consume move keys for kicks), and death/resurrection in
wizard mode.

Output: the final key sequence that can be passed to run_session.py.

Example workflow:
    # Step 1: Discover the move sequence
    python3 plan_session.py 1
    # Output: :hhhhhhhhhhhhhhjhhkkhhhhjj...>

    # Step 2: Capture the session with the discovered sequence
    python3 run_session.py 1 sessions/seed1.session.json '<sequence>'

Note: The discovered sequence includes one extra directional key at each
obstacle (monster kill, locked door kick) that bumps harmlessly into a wall
in run_session.py. This is because run_session.py doesn't handle Die?
prompts between keys -- instead, the next directional key in the sequence
serves as the 'n' response to Die? (since any non-'y' key means 'no').
"""

import sys
import os
import time
import subprocess
import tempfile
import shutil
import re
from collections import deque

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
INSTALL_DIR = os.path.join(PROJECT_ROOT, 'nethack-c', 'install', 'games', 'lib', 'nethackdir')
NETHACK_BINARY = os.path.join(INSTALL_DIR, 'nethack')
RESULTS_DIR = os.path.join(SCRIPT_DIR, 'results')
DEFAULT_FIXED_DATETIME = '20000110090000'

# Terrain types that are walkable (from include/rm.h)
WALKABLE = {23, 24, 25, 26, 27, 28}  # DOOR, CORR, ROOM, STAIRS, LADDER, FOUNTAIN
STAIRS = 26

# Cardinal directions only (diagonal moves can be blocked by adjacent walls)
DIRECTIONS = [(-1, 0, 'h'), (0, 1, 'j'), (0, -1, 'k'), (1, 0, 'l')]

CHARACTER = {
    'name': 'Wizard',
    'role': 'Valkyrie',
    'race': 'human',
    'gender': 'female',
    'align': 'neutral',
}


def fixed_datetime_env():
    dt = os.environ.get('NETHACK_FIXED_DATETIME')
    if dt is None:
        dt = DEFAULT_FIXED_DATETIME
    return f'NETHACK_FIXED_DATETIME={dt} ' if dt else ''


def setup():
    """Prepare the home directory and clean up save files."""
    os.makedirs(RESULTS_DIR, exist_ok=True)
    rc = os.path.join(RESULTS_DIR, '.nethackrc')
    with open(rc, 'w') as f:
        f.write(f'OPTIONS=name:{CHARACTER["name"]}\n')
        f.write(f'OPTIONS=race:{CHARACTER["race"]}\n')
        f.write(f'OPTIONS=role:{CHARACTER["role"]}\n')
        f.write(f'OPTIONS=gender:{CHARACTER["gender"]}\n')
        f.write(f'OPTIONS=align:{CHARACTER["align"]}\n')
        f.write('OPTIONS=!autopickup\n')
        f.write('OPTIONS=suppress_alert:3.4.3\n')
        f.write('OPTIONS=symset:DECgraphics\n')
    # Clean up stale game state to avoid prompts from previous crashed runs.
    # Remove: save files, level/lock files (e.g. 501wizard.0), and bones files.
    import glob
    save_dir = os.path.join(INSTALL_DIR, 'save')
    if os.path.isdir(save_dir):
        for fn in glob.glob(os.path.join(save_dir, '*')):
            os.unlink(fn)
    for fn in glob.glob(os.path.join(INSTALL_DIR, '*wizard*')):
        if not fn.endswith('.lua'):
            os.unlink(fn)
    for fn in glob.glob(os.path.join(INSTALL_DIR, '*Wizard*')):
        if not fn.endswith('.lua'):
            os.unlink(fn)
    for fn in glob.glob(os.path.join(INSTALL_DIR, 'bon*')):
        os.unlink(fn)


def tmux_send(session, keys, delay=0.15):
    subprocess.run(['tmux', 'send-keys', '-t', session, '-l', keys], check=True)
    time.sleep(delay)


def tmux_send_special(session, key, delay=0.15):
    subprocess.run(['tmux', 'send-keys', '-t', session, key], check=True)
    time.sleep(delay)


def tmux_capture(session):
    r = subprocess.run(
        ['tmux', 'capture-pane', '-t', session, '-p', '-S', '0', '-E', '30'],
        capture_output=True, text=True, check=True
    )
    return r.stdout


def clear_prompts(session, max_iter=20):
    """Clear --More--, Die?, and other prompts. Returns final screen content."""
    content = ''
    for _ in range(max_iter):
        time.sleep(0.15)
        content = tmux_capture(session)
        if '--More--' in content:
            tmux_send_special(session, 'Space', 0.15)
            continue
        if 'Die?' in content:
            tmux_send(session, 'n', 0.3)
            time.sleep(0.2)
            print('  [RESURRECTED via wizard mode]')
            continue
        return content
    return content


def wait_ready(session):
    """Navigate startup prompts until the game is ready."""
    for attempt in range(60):
        content = tmux_capture(session)
        if '--More--' in content:
            tmux_send_special(session, 'Space', 0.5)
            continue
        if 'keep the save file' in content or 'keep save' in content.lower():
            tmux_send(session, 'n', 0.5)
            continue
        if 'Destroy old game?' in content or 'destroy old game' in content.lower():
            tmux_send(session, 'y', 0.5)
            continue
        if 'Shall I pick' in content:
            tmux_send(session, 'y', 0.5)
            continue
        if 'Is this ok?' in content:
            tmux_send(session, 'y', 0.5)
            continue
        if 'tutorial' in content.lower():
            tmux_send(session, 'n', 0.5)
            continue
        for prompt, key in [('pick a role', 'v'), ('Pick a role', 'v'),
                            ('pick a race', 'h'), ('Pick a race', 'h'),
                            ('pick a gender', 'f'), ('Pick a gender', 'f'),
                            ('pick an alignment', 'n'), ('Pick an alignment', 'n')]:
            if prompt in content:
                tmux_send(session, key, 0.3)
                break
        else:
            if 'Dlvl:' in content or 'HP:' in content:
                return
            if attempt > 2:
                tmux_send_special(session, 'Space', 0.3)
            else:
                time.sleep(0.5)


def find_player(lines):
    """Find '@' on screen. Returns (screen_col, screen_row) or None."""
    for r, line in enumerate(lines):
        c = line.find('@')
        if c >= 0:
            return (c, r)
    return None


def screen_to_grid(sc, sr):
    """Convert screen coords to grid coords.

    The tmux capture has a 1-column offset: screen_col + 1 = grid_col.
    Screen row 0 is the message line, so screen_row - 1 = grid_row.
    """
    return (sc + 1, sr - 1)


def bfs_path(grid, start, goal):
    """BFS shortest path using cardinal moves only.

    Returns list of (key, target_col, target_row) or None if no path.
    """
    visited = {start}
    parent = {start: None}
    queue = deque([start])

    while queue:
        cx, cy = queue.popleft()
        if (cx, cy) == goal:
            path = []
            cur = goal
            while parent[cur] is not None:
                px, py, key = parent[cur]
                path.append((key, cur[0], cur[1]))
                cur = (px, py)
            path.reverse()
            return path
        for dx, dy, key in DIRECTIONS:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < 80 and 0 <= ny < 21 and (nx, ny) not in visited:
                if grid[ny][nx] in WALKABLE:
                    visited.add((nx, ny))
                    parent[(nx, ny)] = (cx, cy, key)
                    queue.append((nx, ny))
    return None


def find_downstairs(grid):
    """Find the downstairs position in the terrain grid."""
    for y in range(21):
        for x in range(80):
            if grid[y][x] == STAIRS:
                # Check if it's the downstairs (not upstairs)
                # Both are STAIRS type 26; we need the one that isn't our start
                pass  # collect all
    # Return all stairs positions
    stairs = []
    for y in range(21):
        for x in range(80):
            if grid[y][x] == STAIRS:
                stairs.append((x, y))
    return stairs


def read_typ_grid(dumpmap_file):
    if not os.path.exists(dumpmap_file):
        return None
    with open(dumpmap_file) as f:
        grid = []
        for line in f:
            row = [int(x) for x in line.strip().split()]
            grid.append(row)
    return grid if len(grid) == 21 else None


def execute_dumpmap(session, dumpmap_file):
    if os.path.exists(dumpmap_file):
        os.unlink(dumpmap_file)
    tmux_send(session, '#', 0.3)
    time.sleep(0.3)
    tmux_send(session, 'dumpmap', 0.3)
    tmux_send_special(session, 'Enter', 0.8)
    time.sleep(0.5)
    clear_prompts(session, 5)
    time.sleep(0.3)
    return read_typ_grid(dumpmap_file)


def quit_game(session):
    """Cleanly quit the game."""
    tmux_send(session, '#', 0.3)
    time.sleep(0.3)
    tmux_send(session, 'quit', 0.3)
    tmux_send_special(session, 'Enter', 0.5)
    for _ in range(15):
        content = tmux_capture(session)
        if 'Really quit' in content:
            tmux_send(session, 'y', 0.3)
        elif 'do you want your possessions' in content.lower():
            tmux_send(session, 'n', 0.3)
        elif '--More--' in content:
            tmux_send_special(session, 'Space', 0.2)
        time.sleep(0.3)


def main():
    if len(sys.argv) < 2:
        print(f'Usage: {sys.argv[0]} <seed> [--max-moves N]')
        print(f'Example: {sys.argv[0]} 1')
        sys.exit(1)

    seed = int(sys.argv[1])
    max_moves = 80
    for i, arg in enumerate(sys.argv[2:], 2):
        if arg == '--max-moves' and i + 1 < len(sys.argv):
            max_moves = int(sys.argv[i + 1])

    if not os.path.isfile(NETHACK_BINARY):
        print(f'Error: nethack binary not found at {NETHACK_BINARY}')
        print(f'Run setup.sh first: bash {os.path.join(SCRIPT_DIR, "setup.sh")}')
        sys.exit(1)

    setup()
    tmpdir = tempfile.mkdtemp(prefix='plan-session-')
    rng_log = os.path.join(tmpdir, 'rng.txt')
    dumpmap_file = os.path.join(tmpdir, 'dumpmap.txt')
    sess = f'plan-session-{seed}-{os.getpid()}'
    keys_sent = []

    try:
        cmd = (
            f'{fixed_datetime_env()}'
            f'NETHACKDIR={INSTALL_DIR} '
            f'NETHACK_SEED={seed} '
            f'NETHACK_RNGLOG={rng_log} '
            f'NETHACK_DUMPMAP={dumpmap_file} '
            f'HOME={RESULTS_DIR} '
            f'TERM=xterm-256color '
            f'{NETHACK_BINARY} -u {CHARACTER["name"]} -D; '
            f'sleep 999'
        )
        subprocess.run(
            ['tmux', 'new-session', '-d', '-s', sess, '-x', '80', '-y', '24', cmd],
            check=True
        )
        time.sleep(2.0)
        wait_ready(sess)
        time.sleep(0.5)
        clear_prompts(sess)
        time.sleep(0.3)

        # Get starting grid
        grid = execute_dumpmap(sess, dumpmap_file)
        if not grid:
            print('ERROR: Could not capture starting grid')
            return
        clear_prompts(sess)

        # Find player position
        lines = tmux_capture(sess).split('\n')[:24]
        pos = find_player(lines)
        if not pos:
            print('ERROR: Could not find player on screen')
            return
        gx, gy = screen_to_grid(*pos)

        # Find stairs
        stairs = find_downstairs(grid)
        print(f'Seed {seed}: player at grid ({gx},{gy}), stairs at {stairs}')

        # Find the downstairs (the one that isn't our position)
        goal = None
        for sx, sy in stairs:
            if (sx, sy) != (gx, gy):
                goal = (sx, sy)
                break
        if not goal:
            print('ERROR: Could not identify downstairs')
            return
        print(f'Target: downstairs at grid ({goal[0]},{goal[1]})')

        # Verify path exists
        path = bfs_path(grid, (gx, gy), goal)
        if not path:
            print(f'ERROR: No walkable path from ({gx},{gy}) to ({goal[0]},{goal[1]})')
            return
        print(f'BFS shortest path: {len(path)} steps (cardinal only)')
        print()

        # Adaptive navigation
        move_count = 0
        stuck_count = 0

        while move_count < max_moves:
            if (gx, gy) == goal:
                print(f'\nReached downstairs at ({gx},{gy}) after {move_count} moves!')
                # Descend
                tmux_send(sess, '>', 0.3)
                clear_prompts(sess)
                keys_sent.append('>')
                move_count += 1
                lines = tmux_capture(sess).split('\n')[:24]
                for line in lines[22:24]:
                    m = re.search(r'Dlvl:(\d+)', line)
                    if m:
                        print(f'Descended to Dlvl:{m[1]}')
                break

            # Re-plan path from current position
            path = bfs_path(grid, (gx, gy), goal)
            if not path:
                print(f'ERROR: No path from ({gx},{gy}) to ({goal[0]},{goal[1]})')
                break

            # Send next planned move
            key, target_x, target_y = path[0]
            tmux_send(sess, key, 0.2)
            time.sleep(0.15)
            content = clear_prompts(sess)
            keys_sent.append(key)
            move_count += 1

            # Read new position from screen
            lines = content.split('\n')[:24]
            new_pos = find_player(lines)
            if not new_pos:
                # Player might be hidden by a prompt; try again
                time.sleep(0.5)
                content = clear_prompts(sess)
                lines = content.split('\n')[:24]
                new_pos = find_player(lines)
                if not new_pos:
                    print(f'  [{move_count}] ERROR: Cannot find player')
                    for i, line in enumerate(lines[:10]):
                        print(f'    {i}: {line}')
                    break

            new_gx, new_gy = screen_to_grid(*new_pos)
            moved = (new_gx != gx or new_gy != gy)

            if moved:
                stuck_count = 0
            else:
                stuck_count += 1

            # Parse status
            hp_str = ''
            for line in lines[22:24]:
                m = re.search(r'HP:(\d+)\((\d+)\)', line)
                if m:
                    hp_str = f'HP:{m[1]}/{m[2]}'
            msg = lines[0].strip() if lines[0].strip() else ''

            status = 'MOVED' if moved else 'STUCK'
            print(f'  [{move_count:2d}] {key} -> ({new_gx},{new_gy}) [{status}] {hp_str} {msg[:60]}')

            gx, gy = new_gx, new_gy

            # Re-read grid if stuck (door might have opened, changing terrain)
            if stuck_count >= 2:
                new_grid = execute_dumpmap(sess, dumpmap_file)
                if new_grid:
                    grid = new_grid
                clear_prompts(sess)

            if stuck_count > 10:
                print('ERROR: stuck for too many moves, aborting')
                break

        # Output the result
        move_sequence = ''.join(keys_sent)
        print(f'\n{"="*60}')
        print(f'Move sequence ({len(move_sequence)} keys):')
        print(f'  {move_sequence}')
        print()
        print(f'To capture this session:')
        print(f'  python3 {os.path.join(SCRIPT_DIR, "run_session.py")} {seed} \\')
        print(f'      test/comparison/sessions/seed{seed}.session.json \\')
        print(f'      \'{move_sequence}\'')

        # Show final screen
        content = tmux_capture(sess)
        print(f'\nFinal screen:')
        for i, line in enumerate(content.split('\n')[:24]):
            if line.strip():
                print(f'  {i:2d}: {line}')

        # Quit
        quit_game(sess)

    finally:
        subprocess.run(['tmux', 'kill-session', '-t', sess], capture_output=True)
        shutil.rmtree(tmpdir, ignore_errors=True)


if __name__ == '__main__':
    main()
