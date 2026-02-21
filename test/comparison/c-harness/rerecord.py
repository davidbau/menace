#!/usr/bin/env python3
"""Re-record C NetHack sessions by reading regen metadata from session JSON files.

Usage:
    python3 rerecord.py <session.json> [session2.json ...]
    python3 rerecord.py --all
    python3 rerecord.py --type gameplay
    python3 rerecord.py --dry-run ...       # show commands without executing
    python3 rerecord.py --parallel ...      # run up to N in parallel (default 4)
    python3 rerecord.py --parallel 8 ...    # run up to 8 in parallel

Reads the `regen` metadata from each session JSON and dispatches the
appropriate recording command (run_session.py, gen_option_sessions.py,
gen_interface_sessions.py, gen_discoveries_session.py, or
keylog_to_session.py).
"""

import argparse
import glob
import json
import os
import shlex
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
SESSIONS_DIR = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'sessions')
MAPS_DIR = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'maps')
MANUAL_DIR = os.path.join(SESSIONS_DIR, 'manual')

RUN_SESSION = os.path.join(SCRIPT_DIR, 'run_session.py')
GEN_OPTION = os.path.join(SCRIPT_DIR, 'gen_option_sessions.py')
GEN_INTERFACE = os.path.join(SCRIPT_DIR, 'gen_interface_sessions.py')
GEN_DISCOVERIES = os.path.join(SCRIPT_DIR, 'gen_discoveries_session.py')
KEYLOG_TO_SESSION = os.path.join(SCRIPT_DIR, 'keylog_to_session.py')

# Character presets — duplicated from run_session.py to avoid heavy import
CHARACTER_PRESETS = {
    'valkyrie': {'name': 'Wizard', 'role': 'Valkyrie', 'race': 'human', 'gender': 'female', 'align': 'neutral'},
    'wizard':   {'name': 'Wizard', 'role': 'Wizard',   'race': 'human', 'gender': 'male',   'align': 'neutral'},
    'ranger':   {'name': 'ricky', 'role': 'Ranger',   'race': 'human', 'gender': 'female', 'align': 'chaotic'},
    'barbarian': {'name': 'brak', 'role': 'Barbarian', 'race': 'human', 'gender': 'male', 'align': 'neutral'},
    'knight':    {'name': 'lancelot', 'role': 'Knight', 'race': 'human', 'gender': 'male', 'align': 'lawful'},
    'monk':      {'name': 'sumi', 'role': 'Monk', 'race': 'human', 'gender': 'female', 'align': 'neutral'},
    'priest':    {'name': 'clara', 'role': 'Priest', 'race': 'human', 'gender': 'female', 'align': 'neutral'},
    'rogue':     {'name': 'shade', 'role': 'Rogue', 'race': 'human', 'gender': 'male', 'align': 'chaotic'},
    'samurai':   {'name': 'akira', 'role': 'Samurai', 'race': 'human', 'gender': 'male', 'align': 'lawful'},
    'tourist':   {'name': 'mabel', 'role': 'Tourist', 'race': 'human', 'gender': 'female', 'align': 'neutral'},
    'archeologist': {'name': 'indy', 'role': 'Archeologist', 'race': 'human', 'gender': 'male', 'align': 'neutral'},
    'caveman':   {'name': 'ugo', 'role': 'Caveman', 'race': 'human', 'gender': 'male', 'align': 'neutral'},
    'healer':    {'name': 'flora', 'role': 'Healer', 'race': 'human', 'gender': 'female', 'align': 'neutral'},
}

# Default character (matches run_session.py default)
DEFAULT_CHARACTER = {
    'name': 'Wizard', 'role': 'Valkyrie', 'race': 'human', 'gender': 'female', 'align': 'neutral',
}


def find_preset(options):
    """Match session options against CHARACTER_PRESETS, return preset name or None."""
    if not options:
        return None
    session_char = {
        'name': options.get('name'),
        'role': options.get('role'),
        'race': options.get('race'),
        'gender': options.get('gender'),
        'align': options.get('align'),
    }
    for preset_name, preset_vals in CHARACTER_PRESETS.items():
        if all(session_char.get(k) == v for k, v in preset_vals.items()):
            return preset_name
    return None


def build_command(session_path, data):
    """Build the command to re-record a session. Returns (cmd, description) or (None, reason)."""
    regen = data.get('regen')
    if not regen or not regen.get('mode'):
        return None, 'legacy session (no regen.mode) — use gen_map_sessions.py'

    mode = regen['mode']
    seed = data.get('seed', 0)
    options = data.get('options', {})
    output = os.path.abspath(session_path)

    if mode == 'gameplay':
        return _build_gameplay(seed, output, regen, options)
    elif mode == 'chargen':
        return _build_chargen(seed, output, regen)
    elif mode == 'wizload':
        return _build_wizload(seed, output, regen)
    elif mode == 'interface':
        return _build_interface(seed, output, regen)
    elif mode == 'option_test':
        return _build_option_test(output, regen)
    elif mode == 'keylog':
        return _build_keylog(output, regen, data)
    else:
        return None, f'unknown regen.mode: {mode}'


def _build_gameplay(seed, output, regen, options):
    moves = regen.get('moves', '...........')
    cmd = ['python3', RUN_SESSION, str(seed), output, moves]

    # Character matching
    preset = find_preset(options)
    if preset:
        if preset != 'valkyrie':  # valkyrie is the default
            cmd += ['--character', preset]
    else:
        # No preset match — use --role and --name flags (the only individual overrides
        # supported by run_session.py)
        role = options.get('role')
        name = options.get('name')
        if role and role != DEFAULT_CHARACTER['role']:
            cmd += ['--role', role]
        if name and name != DEFAULT_CHARACTER['name']:
            cmd += ['--name', name]

    if regen.get('raw_moves') or regen.get('rawMoves'):
        cmd.append('--raw-moves')
    if options.get('wizard') is False:
        cmd.append('--no-wizard')

    return cmd, f'gameplay seed={seed}'


def _build_chargen(seed, output, regen):
    selections = regen.get('selections', '')
    cmd = ['python3', RUN_SESSION, str(seed), output, '--chargen', selections]
    tutorial = regen.get('tutorial', 'n')
    if str(tutorial).lower() in ('y', 'true'):
        cmd += ['--tutorial', 'y']
    else:
        cmd += ['--tutorial', 'n']
    return cmd, f'chargen seed={seed} sel={selections}'


def _build_wizload(seed, output, regen):
    level = regen.get('level', '')
    cmd = ['python3', RUN_SESSION, str(seed), output, '--wizload', level]
    return cmd, f'wizload seed={seed} level={level}'


def _build_interface(seed, output, regen):
    subtype = regen.get('subtype', '')
    keys = regen.get('keys')

    # Interface sessions generated by gen_interface_sessions.py
    if subtype in ('startup', 'options', 'chargen', 'tutorial'):
        flag = f'--{subtype}'
        cmd = ['python3', GEN_INTERFACE, flag, '--out', output]
        return cmd, f'interface subtype={subtype}'

    # Discoveries session generated by gen_discoveries_session.py
    if subtype == 'in-game' and keys and '\\' in keys:
        cmd = ['python3', GEN_DISCOVERIES]
        if seed:
            cmd.append(str(seed))
        cmd += ['--out', output]
        return cmd, f'interface discoveries seed={seed}'

    # In-game interface sessions with explicit keys (run_session.py already takes output)
    if keys is not None:
        cmd = ['python3', RUN_SESSION, str(seed), output, '--interface', keys]
        return cmd, f'interface seed={seed} keys={repr(keys)}'

    return None, f'interface session with no keys and unrecognized subtype={subtype}'


def _build_option_test(output, regen):
    option = regen.get('option', '')
    value = regen.get('value')
    value_str = 'on' if value else 'off'
    cmd = ['python3', GEN_OPTION, '--option', option, '--value', value_str, '--out', output]
    return cmd, f'option_test option={option} value={value_str}'


def _build_keylog(output, regen, data):
    keylog_path = regen.get('keylog', '')
    if not keylog_path:
        return None, 'keylog session with no keylog path'

    # Make keylog path absolute relative to project root
    if not os.path.isabs(keylog_path):
        keylog_path = os.path.join(PROJECT_ROOT, keylog_path)

    cmd = ['python3', KEYLOG_TO_SESSION, '--in', keylog_path, '--out', output]

    # Seed override
    seed = data.get('seed')
    if seed:
        cmd += ['--seed', str(seed)]

    # Character fields
    char = data.get('character', {})
    if not char:
        char = data.get('options', {})
    for field in ('name', 'role', 'race', 'gender', 'align'):
        val = char.get(field)
        if val:
            cmd += [f'--{field}', val]

    # Symset
    symset = data.get('symset') or data.get('options', {}).get('symset')
    if symset:
        cmd += ['--symset', symset]

    # Startup mode
    startup_mode = regen.get('startupMode')
    if startup_mode:
        cmd += ['--startup-mode', startup_mode]

    # Screen capture
    screen_capture = regen.get('screenCapture')
    if screen_capture:
        cmd += ['--screen-capture', screen_capture]

    # Tutorial
    tutorial = regen.get('tutorial')
    if tutorial is True:
        cmd += ['--tutorial', 'on']
    elif tutorial is False:
        cmd += ['--tutorial', 'off']

    # Drop leading spaces
    drop = regen.get('dropLeadingSpaces', 0)
    if drop:
        cmd += ['--drop-leading-spaces', str(drop)]

    return cmd, f'keylog keylog={regen.get("keylog")}'


def discover_sessions():
    """Find all session JSON files."""
    patterns = [
        os.path.join(SESSIONS_DIR, '*.session.json'),
        os.path.join(MAPS_DIR, '*.session.json'),
        os.path.join(MANUAL_DIR, '*.session.json'),
    ]
    files = []
    for pattern in patterns:
        files.extend(sorted(glob.glob(pattern)))
    return files


def run_command(cmd, description, dry_run=False):
    """Execute a recording command. Returns (success, description)."""
    if dry_run:
        print(f'  [dry-run] {description}')
        print(f'    {shell_quote_cmd(cmd)}')
        return True, description

    print(f'  Recording: {description}')
    print(f'    {shell_quote_cmd(cmd)}')
    result = subprocess.run(cmd, cwd=SCRIPT_DIR)
    if result.returncode != 0:
        print(f'  FAILED (exit {result.returncode}): {description}')
        return False, description
    print(f'  OK: {description}')
    return True, description


def shell_quote_cmd(cmd):
    """Format a command list as a shell-safe string for display."""
    return ' '.join(shlex.quote(arg) for arg in cmd)


def _run_one(args_tuple):
    """Worker for parallel execution."""
    cmd, description = args_tuple
    result = subprocess.run(cmd, cwd=SCRIPT_DIR)
    return result.returncode == 0, description


def main():
    parser = argparse.ArgumentParser(description='Re-record C NetHack sessions from regen metadata')
    parser.add_argument('sessions', nargs='*', help='Session JSON files to re-record')
    parser.add_argument('--all', action='store_true', help='Re-record all sessions')
    parser.add_argument('--type', dest='filter_type', help='Only re-record sessions with this regen.mode')
    parser.add_argument('--dry-run', action='store_true', help='Show commands without executing')
    parser.add_argument('--parallel', nargs='?', const=4, type=int, default=None,
                        help='Run up to N sessions in parallel (default 4)')
    args = parser.parse_args()

    if not args.sessions and not args.all and not args.filter_type:
        parser.print_help()
        sys.exit(1)

    # Collect session files
    if args.all or args.filter_type:
        session_files = discover_sessions()
    else:
        session_files = args.sessions

    # Build commands
    commands = []
    skipped = 0
    warnings = []
    for path in session_files:
        if not os.path.isfile(path):
            print(f'Warning: file not found: {path}')
            continue

        with open(path) as f:
            data = json.load(f)

        regen = data.get('regen', {})
        mode = regen.get('mode', '') if regen else ''

        # Filter by type if requested
        if args.filter_type and mode != args.filter_type:
            continue

        cmd, description = build_command(path, data)
        if cmd is None:
            skipped += 1
            warnings.append(f'  skip: {os.path.basename(path)} — {description}')
            continue

        commands.append((cmd, f'{os.path.basename(path)}: {description}'))

    # Print warnings
    if warnings:
        print(f'\nSkipped {skipped} session(s):')
        for w in warnings:
            print(w)
        print()

    if not commands:
        print('No sessions to re-record.')
        return

    print(f'Re-recording {len(commands)} session(s)...\n')

    # Execute
    if args.parallel and not args.dry_run:
        successes = 0
        failures = []
        print(f'Running with up to {args.parallel} parallel workers\n')
        with ProcessPoolExecutor(max_workers=args.parallel) as executor:
            futures = {executor.submit(_run_one, (cmd, desc)): desc for cmd, desc in commands}
            for future in as_completed(futures):
                ok, desc = future.result()
                if ok:
                    successes += 1
                    print(f'  OK: {desc}')
                else:
                    failures.append(desc)
                    print(f'  FAILED: {desc}')
        print(f'\nDone: {successes} succeeded, {len(failures)} failed')
        if failures:
            print('Failed:')
            for f in failures:
                print(f'  {f}')
            sys.exit(1)
    else:
        successes = 0
        failures = []
        for cmd, description in commands:
            ok, _ = run_command(cmd, description, dry_run=args.dry_run)
            if ok:
                successes += 1
            else:
                failures.append(description)

        if not args.dry_run:
            print(f'\nDone: {successes} succeeded, {len(failures)} failed')
            if failures:
                print('Failed:')
                for f in failures:
                    print(f'  {f}')
                sys.exit(1)
        else:
            print(f'\n{len(commands)} command(s) shown')


if __name__ == '__main__':
    main()
