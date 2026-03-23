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
import importlib.util

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
SESSIONS_DIR = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'sessions')
INSTALL_DIR = os.path.join(PROJECT_ROOT, 'nethack-c', 'install', 'games', 'lib', 'nethackdir')
NETHACK_BINARY = os.path.join(INSTALL_DIR, 'nethack')

# Import record_c_session from run_session.py
_spec = importlib.util.spec_from_file_location('run_session', os.path.join(SCRIPT_DIR, 'run_session.py'))
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
record_c_session = _mod.record_c_session

# Option test specifications: (option_name, value) -> session config
OPTION_SPECS = {
    ('verbose', True): dict(
        seed=301, option_lines=['verbose', '!autopickup'],
        gameplay_keys=['m', '.'],
        description='verbose on — "Next command will..." message',
    ),
    ('verbose', False): dict(
        seed=302, option_lines=['!verbose', '!autopickup'],
        gameplay_keys=['m', '.'],
        description='verbose off — no "Next command will..." message',
    ),
    ('DECgraphics', False): dict(
        seed=303, option_lines=['!autopickup', 'symset:default'],
        gameplay_keys=[],
        description='DECgraphics off — ASCII walls',
    ),
    ('DECgraphics', True): dict(
        seed=304, option_lines=['!autopickup', 'symset:DECgraphics'],
        gameplay_keys=[],
        description='DECgraphics on — box-drawing walls',
    ),
    ('time', True): dict(
        seed=305, option_lines=['time', '!autopickup'],
        gameplay_keys=[],
        description='time on — T:N in status line',
    ),
    ('time', False): dict(
        seed=306, option_lines=['!time', '!autopickup'],
        gameplay_keys=[],
        description='time off — no turn counter',
    ),
}


def build_nethackrc(option_lines):
    """Build .nethackrc from character preset + option overrides."""
    lines = [
        'OPTIONS=name:Wizard,role:Valkyrie,race:human,gender:female,align:neutral',
    ]
    for opt in option_lines:
        lines.append(f'OPTIONS={opt}')
    lines.append('OPTIONS=!tutorial')
    lines.append('OPTIONS=suppress_alert:3.4.3')
    lines.append('WIZARD=Wizard')
    lines.append('')
    return '\n'.join(lines)


def generate_option_session(option_name, option_value, spec, output_override=None):
    """Generate a single option test session via record_c_session."""
    seed = spec['seed']
    value_str = 'on' if option_value else 'off'
    output = output_override or os.path.join(
        SESSIONS_DIR, f'seed{seed}_{option_name}_{value_str}.session.json'
    )

    env = {
        'NETHACK_SEED': str(seed),
        'NETHACK_FIXED_DATETIME': '20000110090000',
    }
    nethackrc = build_nethackrc(spec['option_lines'])

    # Startup: space (lore --More--), space (welcome --More--)
    # Then gameplay keys
    keys = [' ', ' '] + spec['gameplay_keys']

    print(f"  Recording: seed={seed} {option_name}={value_str}")
    record_c_session(
        env=env,
        nethackrc=nethackrc,
        keys=keys,
        output_path=output,
        regen_metadata={
            'mode': 'option_test',
            'option': option_name,
            'value': option_value,
        },
        session_type='option_test',
        verbose=False,
    )
    print(f"  OK: {os.path.basename(output)}")


def main():
    if not os.path.isfile(NETHACK_BINARY):
        print(f'Error: {NETHACK_BINARY} not found. Run setup.sh first.', file=sys.stderr)
        sys.exit(1)

    args = sys.argv[1:]
    do_all = '--all' in args
    target_option = None
    if '--option' in args:
        idx = args.index('--option')
        target_option = args[idx + 1]

    if not do_all and not target_option:
        print("Usage: python3 gen_option_sessions.py [--all] [--option <name>]")
        print("Options: verbose, DECgraphics, time")
        sys.exit(0)

    for (opt_name, opt_value), spec in OPTION_SPECS.items():
        if target_option and opt_name != target_option:
            continue
        if not do_all and not target_option:
            continue
        generate_option_session(opt_name, opt_value, spec)


if __name__ == '__main__':
    main()
