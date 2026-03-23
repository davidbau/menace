#!/usr/bin/env python3
"""Generate a session trace that tests the \\ (discoveries) command.

Uses seed 2 where Valkyrie gets an oil lamp, making discoveries
interesting (weapons + armor classes are known).

Usage:
    python3 gen_discoveries_session.py [seed] [--out <path>]

Output: test/comparison/sessions/interface_discoveries.session.json
"""

import sys
import os
import importlib.util

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
SESSIONS_DIR = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'sessions')

# Import record_c_session from run_session.py
_spec = importlib.util.spec_from_file_location('run_session', os.path.join(SCRIPT_DIR, 'run_session.py'))
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

record_c_session = _mod.record_c_session


def main():
    args = list(sys.argv[1:])
    out_override = None
    if '--out' in args:
        idx = args.index('--out')
        out_override = args[idx + 1]
        args = args[:idx] + args[idx+2:]

    seed = int(args[0]) if args else 2
    output = out_override or os.path.join(SESSIONS_DIR, 'interface_discoveries.session.json')

    env = {
        'NETHACK_SEED': str(seed),
        'NETHACK_FIXED_DATETIME': '20000110090000',
    }
    nethackrc = (
        'OPTIONS=name:Wizard,role:Valkyrie,race:human,gender:female,align:neutral\n'
        'OPTIONS=!autopickup,symset:DECgraphics,!verbose,!tutorial\n'
        'OPTIONS=suppress_alert:3.4.3\n'
        'WIZARD=Wizard\n'
    )
    # Keys: space (dismiss lore --More--), space (dismiss welcome --More--),
    # then \ (discoveries), then spaces to page through pager
    keys = [' ', ' ', '\\', ' ', ' ', ' ']

    record_c_session(
        env=env,
        nethackrc=nethackrc,
        keys=keys,
        output_path=output,
        regen_metadata={'mode': 'interface', 'subtype': 'in-game'},
        session_type='interface',
        verbose=True,
    )
    print(f'Output: {output}')


if __name__ == '__main__':
    main()
