#!/usr/bin/env python3
"""Record map sessions using wizard ^V level-teleport.

Each session starts in wizard mode, dismisses startup --More-- prompts,
then uses ^V to teleport to levels 2-5 (level 1 is the starting level).

Usage:
    python3 record_map_sessions.py [--seed N] [--all] [--verbose]
"""

import os
import sys
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from run_session import record_c_session, probe_startup_keys

MAP_SEEDS = [16, 72, 119, 163, 306, 331]
MAX_DEPTH = 5
MAPS_DIR = os.path.join(SCRIPT_DIR, '..', 'maps')

NETHACKRC = (
    "OPTIONS=name:Wizard,role:Valkyrie,race:human,gender:female,align:neutral\n"
    "OPTIONS=!autopickup,symset:DECgraphics,!verbose\n"
    "OPTIONS=!tutorial\n"
    "WIZARD=Wizard\n"
)


def build_map_keys(startup_keys, max_depth=5):
    """Build key sequence: startup + ^V level-teleport to depths 2..max_depth."""
    keys = list(startup_keys)
    for depth in range(2, max_depth + 1):
        # ^V = Ctrl-V (level teleport in wizard mode)
        keys.append('\x16')
        # Type the depth number and press Enter
        keys.extend(list(str(depth)))
        keys.append('\n')
        # May need to dismiss --More-- after teleport (e.g., "You materialize...")
        # Add a space in case there's a --More--
        # Actually, we capture whatever screen appears; the harness handles it
    return keys


def record_map_session(seed, max_depth=5, verbose=False):
    env = {
        'NETHACK_SEED': str(seed),
        'NETHACK_FIXED_DATETIME': '20000110090000',
    }

    # Probe startup keys
    startup_keys = probe_startup_keys(env, NETHACKRC)
    if verbose:
        print(f"  Startup keys: {len(startup_keys)} spaces")

    # Build key sequence
    keys = build_map_keys(startup_keys, max_depth)
    if verbose:
        print(f"  Total keys: {len(keys)}")

    output_path = os.path.join(MAPS_DIR, f'seed{seed}_map_gameplay.session.json')

    # Use longer delays for level teleport (level gen takes time)
    # Steps after startup need more time for level generation
    delay_overrides = {}
    startup_len = len(startup_keys)
    for i in range(startup_len, len(keys)):
        # ^V and Enter keys trigger level gen — give them extra time
        delay_overrides[i] = 0.5

    record_c_session(
        env=env,
        nethackrc=NETHACKRC,
        keys=keys,
        output_path=output_path,
        key_delay_s=0.02,
        key_delay_overrides=delay_overrides,
        session_type='gameplay',
        regen_metadata={
            'mode': 'map-teleport',
            'max_depth': max_depth,
        },
        verbose=verbose,
    )

    # Verify the output
    if os.path.exists(output_path):
        with open(output_path) as f:
            session = json.load(f)
        steps = session.get('steps', [])
        print(f"  Recorded {len(steps)} steps to {os.path.basename(output_path)}")
        return True
    else:
        print(f"  ERROR: output file not created")
        return False


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Record map sessions with ^V level-teleport')
    parser.add_argument('--seed', type=int, help='Record a single seed')
    parser.add_argument('--all', action='store_true', help='Record all map seeds')
    parser.add_argument('--verbose', '-v', action='store_true')
    args = parser.parse_args()

    seeds = MAP_SEEDS if args.all else ([args.seed] if args.seed else MAP_SEEDS)

    ok = 0
    fail = 0
    for seed in seeds:
        print(f"Recording seed {seed}...")
        try:
            if record_map_session(seed, MAX_DEPTH, verbose=args.verbose):
                ok += 1
            else:
                fail += 1
        except Exception as e:
            print(f"  ERROR: {e}")
            fail += 1

    print(f"\nDone: {ok} ok, {fail} failed")


if __name__ == '__main__':
    main()
