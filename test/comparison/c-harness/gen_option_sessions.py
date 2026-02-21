#!/usr/bin/env python3
"""Generate C NetHack sessions testing option behaviors.

Usage:
    python3 gen_option_sessions.py [--all] [--option <name>]

Generates session files for testing option behaviors:
- verbose: on/off comparison for instruction messages
- DECgraphics: ASCII vs box-drawing symbols
- time: turn counter display

Output: test/comparison/sessions/seed<N>_<option>_<value>.session.json
"""

import os
import sys
import time
import subprocess
import tempfile
import shutil
import glob
import importlib.util

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
RESULTS_DIR = os.path.join(SCRIPT_DIR, 'results')
SESSIONS_DIR = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'sessions')
INSTALL_DIR = os.path.join(PROJECT_ROOT, 'nethack-c', 'install', 'games', 'lib', 'nethackdir')
NETHACK_BINARY = os.path.join(INSTALL_DIR, 'nethack')

# Import helpers from run_session.py
_spec = importlib.util.spec_from_file_location('run_session', os.path.join(SCRIPT_DIR, 'run_session.py'))
_session = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_session)

tmux_send = _session.tmux_send
tmux_send_special = _session.tmux_send_special
capture_screen_compressed = _session.capture_screen_compressed
parse_rng_lines = _session.parse_rng_lines
compact_session_json = _session.compact_session_json
read_rng_log = _session.read_rng_log
clear_more_prompts = _session.clear_more_prompts
wait_for_game_ready = _session.wait_for_game_ready
quit_game = _session.quit_game
fixed_datetime_env = _session.fixed_datetime_env


def setup_option_home(option_lines):
    """Set up HOME with .nethackrc containing specific option values."""
    os.makedirs(RESULTS_DIR, exist_ok=True)

    # Clean up stale game state
    save_dir = os.path.join(INSTALL_DIR, 'save')
    if os.path.isdir(save_dir):
        for f in glob.glob(os.path.join(save_dir, '*')):
            os.unlink(f)
    for f in glob.glob(os.path.join(INSTALL_DIR, '*wizard*')):
        if not f.endswith('.lua'):
            os.unlink(f)
    for f in glob.glob(os.path.join(INSTALL_DIR, '*Wizard*')):
        if not f.endswith('.lua'):
            os.unlink(f)
    for f in glob.glob(os.path.join(INSTALL_DIR, 'bon*')):
        os.unlink(f)

    # Write .nethackrc
    nethackrc = os.path.join(RESULTS_DIR, '.nethackrc')
    with open(nethackrc, 'w') as f:
        f.write('OPTIONS=name:Wizard\n')
        f.write('OPTIONS=race:elf\n')
        f.write('OPTIONS=role:Wizard\n')
        f.write('OPTIONS=gender:male\n')
        f.write('OPTIONS=align:chaotic\n')
        f.write('OPTIONS=suppress_alert:3.4.3\n')
        for line in option_lines:
            f.write(f'OPTIONS={line}\n')


def generate_option_session(seed, option_name, option_value, option_lines, keys, description, output_override=None):
    """Generate a single option test session.

    Args:
        seed: Random seed
        option_name: Name of option being tested
        option_value: Value of option being tested
        option_lines: List of OPTIONS= lines for .nethackrc
        keys: List of (key, action) tuples to send
        description: Human-readable description
        output_override: If set, write to this path instead of the default
    """
    session_name = f'webhack-option-{seed}-{os.getpid()}'
    tmpdir = tempfile.mkdtemp(prefix='webhack-option-')
    rng_log_file = os.path.join(tmpdir, 'rnglog.txt')

    try:
        setup_option_home(option_lines)

        cmd = (
            f'{fixed_datetime_env()}'
            f'NETHACKDIR={INSTALL_DIR} '
            f'NETHACK_SEED={seed} '
            f'NETHACK_RNGLOG={rng_log_file} '
            f'HOME={RESULTS_DIR} '
            f'TERM=xterm-256color '
            f'{NETHACK_BINARY} -u Wizard -D; '
            f'sleep 999'
        )

        subprocess.run(
            ['tmux', 'new-session', '-d', '-s', session_name, '-x', '80', '-y', '24', cmd],
            check=True
        )
        time.sleep(1.0)

        wait_for_game_ready(session_name, rng_log_file)
        clear_more_prompts(session_name)
        time.sleep(0.1)

        # Capture startup
        startup_screen = capture_screen_compressed(session_name)
        startup_rng_count, startup_rng_lines = read_rng_log(rng_log_file)
        startup_rng_entries = parse_rng_lines(startup_rng_lines)
        startup_actual_rng = sum(1 for e in startup_rng_entries if e[0] not in ('>', '<'))

        # Execute steps
        steps = []
        prev_rng_count = startup_rng_count
        for key, action in keys:
            if key == ' ':
                tmux_send_special(session_name, 'Space', 0.1)
            else:
                tmux_send(session_name, key, 0.1)
            time.sleep(0.1)
            clear_more_prompts(session_name)

            screen = capture_screen_compressed(session_name)
            rng_count, rng_lines = read_rng_log(rng_log_file)
            rng_entries = parse_rng_lines(rng_lines[prev_rng_count:rng_count])

            steps.append({
                'key': key,
                'action': action,
                'rng': rng_entries,
                'screen': screen,
            })
            prev_rng_count = rng_count

        # Build startup step (first step with no key)
        startup_step = {
            'key': None,
            'action': 'startup',
            'rng': startup_rng_entries,
            'screen': startup_screen,
        }

        # Build session data
        value_str = 'on' if option_value else 'off'
        session_data = {
            'version': 3,
            'seed': seed,
            'source': 'c',
            'type': 'option_test',
            'regen': {
                'mode': 'option_test',
                'option': option_name,
                'value': option_value,
            },
            'options': {
                'name': 'Wizard',
                'role': 'Wizard',
                'race': 'elf',
                'gender': 'male',
                'align': 'chaotic',
                'wizard': True,
                'symset': 'DECgraphics' if 'symset:DECgraphics' in option_lines else 'default',
                'autopickup': '!autopickup' not in option_lines,
                option_name: option_value,
                'description': description,
            },
            'steps': [startup_step] + steps,
        }

        quit_game(session_name)

        output_path = output_override or os.path.join(SESSIONS_DIR, f'seed{seed}_{option_name}_{value_str}.session.json')
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w') as f:
            f.write(compact_session_json(session_data))

        print(f"Generated {output_path}")

    finally:
        subprocess.run(['tmux', 'kill-session', '-t', session_name], capture_output=True)
        shutil.rmtree(tmpdir, ignore_errors=True)


def generate_verbose_sessions():
    """Generate sessions testing verbose option (on/off)."""
    print("\n=== Generating verbose option sessions ===")

    # verbose=on: pressing 'm' should show "Next command will..." message
    generate_option_session(
        seed=301,
        option_name='verbose',
        option_value=True,
        option_lines=['verbose', '!autopickup'],
        keys=[('m', 'menu-prefix'), ('.', 'wait')],
        description='Test verbose option - should show "Next command will..." message',
    )

    # verbose=off: pressing 'm' should NOT show message
    generate_option_session(
        seed=302,
        option_name='verbose',
        option_value=False,
        option_lines=['!verbose', '!autopickup'],
        keys=[('m', 'menu-prefix'), ('.', 'wait')],
        description='Test verbose=off - should NOT show "Next command will..." message',
    )


def generate_decgraphics_sessions():
    """Generate sessions testing DECgraphics option (ASCII vs box-drawing)."""
    print("\n=== Generating DECgraphics option sessions ===")

    # DECgraphics=off (ASCII)
    generate_option_session(
        seed=303,
        option_name='DECgraphics',
        option_value=False,
        option_lines=['!autopickup', 'symset:default'],
        keys=[],  # Just capture startup screen
        description='Test DECgraphics=off - should show ASCII walls (| - )',
    )

    # DECgraphics=on (box-drawing)
    generate_option_session(
        seed=304,
        option_name='DECgraphics',
        option_value=True,
        option_lines=['!autopickup', 'symset:DECgraphics'],
        keys=[],
        description='Test DECgraphics=on - should show box-drawing walls',
    )


def generate_time_sessions():
    """Generate sessions testing time option (on/off)."""
    print("\n=== Generating time option sessions ===")

    # time=on: status line should show T:N
    generate_option_session(
        seed=305,
        option_name='time',
        option_value=True,
        option_lines=['time', '!autopickup'],
        keys=[],
        description='Test time=on - should show turn counter T:N in status line',
    )

    # time=off: status line should NOT show T:N
    generate_option_session(
        seed=306,
        option_name='time',
        option_value=False,
        option_lines=['!time', '!autopickup'],
        keys=[],
        description='Test time=off - should NOT show turn counter in status line',
    )


# Lookup table for individual option_test sessions by (option, value)
OPTION_SESSION_SPECS = {
    ('verbose', True):       dict(seed=301, option_lines=['verbose', '!autopickup'],
                                  keys=[('m', 'menu-prefix'), ('.', 'wait')],
                                  description='Test verbose option - should show "Next command will..." message'),
    ('verbose', False):      dict(seed=302, option_lines=['!verbose', '!autopickup'],
                                  keys=[('m', 'menu-prefix'), ('.', 'wait')],
                                  description='Test verbose=off - should NOT show "Next command will..." message'),
    ('DECgraphics', False):  dict(seed=303, option_lines=['!autopickup', 'symset:default'],
                                  keys=[],
                                  description='Test DECgraphics=off - should show ASCII walls (| - )'),
    ('DECgraphics', True):   dict(seed=304, option_lines=['!autopickup', 'symset:DECgraphics'],
                                  keys=[],
                                  description='Test DECgraphics=on - should show box-drawing walls'),
    ('time', True):          dict(seed=305, option_lines=['time', '!autopickup'],
                                  keys=[],
                                  description='Test time=on - should show turn counter T:N in status line'),
    ('time', False):         dict(seed=306, option_lines=['!time', '!autopickup'],
                                  keys=[],
                                  description='Test time=off - should NOT show turn counter in status line'),
}


def main():
    if not os.path.isfile(NETHACK_BINARY):
        print(f"Error: nethack binary not found at {NETHACK_BINARY}")
        print(f"Run setup.sh first: bash {os.path.join(SCRIPT_DIR, 'setup.sh')}")
        sys.exit(1)

    # Parse --out and --value flags
    args = list(sys.argv[1:])
    out_override = None
    value_filter = None
    if '--out' in args:
        idx = args.index('--out')
        out_override = args[idx + 1]
        args = args[:idx] + args[idx+2:]
    if '--value' in args:
        idx = args.index('--value')
        val_str = args[idx + 1].lower()
        value_filter = val_str in ('true', 'on', '1')
        args = args[:idx] + args[idx+2:]

    if '--all' in args or '--option' not in args:
        generate_verbose_sessions()
        generate_decgraphics_sessions()
        generate_time_sessions()
        print("\nAll option sessions generated successfully")
    elif '--option' in args:
        idx = args.index('--option')
        option = args[idx + 1] if idx + 1 < len(args) else None

        # If --value and --out specified, generate a single targeted session
        if value_filter is not None and out_override:
            spec = OPTION_SESSION_SPECS.get((option, value_filter))
            if not spec:
                print(f"Unknown option/value: {option}={value_filter}")
                sys.exit(1)
            generate_option_session(
                seed=spec['seed'], option_name=option, option_value=value_filter,
                option_lines=spec['option_lines'], keys=spec['keys'],
                description=spec['description'], output_override=out_override,
            )
        elif option == 'verbose':
            generate_verbose_sessions()
        elif option == 'DECgraphics':
            generate_decgraphics_sessions()
        elif option == 'time':
            generate_time_sessions()
        else:
            print(f"Unknown option: {option}")
            print("Available options: verbose, DECgraphics, time")
            sys.exit(1)


if __name__ == '__main__':
    main()
