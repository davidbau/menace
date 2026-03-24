#!/usr/bin/env python3
"""Re-record an existing session with the current C binary.

Takes an existing session JSON file and re-records it by replaying the
same keys through the C harness. Produces a new session file with
updated screen captures (NOMUX or tmux) and RNG logs.

Usage:
    python3 rerecord_session.py <input_session.json> <output_session.json> [--nomux]
    NOMUX=1 python3 rerecord_session.py <input.json> <output.json>

The new session preserves env, nethackrc, and keys from the original.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run_session import record_c_session


def rerecord(input_path, output_path, use_nomux=False):
    with open(input_path) as f:
        session = json.load(f)

    env = session.get('env', {})
    nethackrc = session.get('nethackrc', '')
    steps = session.get('steps', [])
    keys = [step['key'] for step in steps if step.get('key')]

    # Extract key delays if available
    regen = session.get('regen', {})
    base_delay = (regen.get('keyDelayMs', 20) or 20) / 1000.0
    key_delays = {}
    if regen.get('key_delays_s'):
        for k, v in regen['key_delays_s'].items():
            key_delays[int(k)] = float(v)

    if use_nomux:
        os.environ['NOMUX'] = '1'
    else:
        os.environ.pop('NOMUX', None)

    print(f'Re-recording {os.path.basename(input_path)}: {len(keys)} keys, '
          f'delay={base_delay}s, nomux={use_nomux}')

    record_c_session(
        env=env,
        nethackrc=nethackrc,
        keys=keys,
        output_path=output_path,
        key_delay_s=base_delay,
        key_delay_overrides=key_delays,
        verbose=True,
    )


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    use_nomux = '--nomux' in sys.argv or os.environ.get('NOMUX') == '1'

    rerecord(input_path, output_path, use_nomux=use_nomux)
