#!/usr/bin/env python3
"""
run_session.py — Run patched Hack with seed + keystrokes → session JSON.

Usage:
  python3 run_session.py --seed 42 --keys "hhhljj.ss" --out sessions/seed42.json

The harness binary must be built first:
  cd hack-c/patched && make
"""

import argparse
import subprocess
import sys
import os
import json

def run_session(seed, keys, outfile=None, harness='./hack_harness'):
    """Run the harness and return session JSON."""
    args = [harness, '--seed', str(seed), '--keys', keys]
    if outfile:
        args += ['--out', outfile]
    result = subprocess.run(args, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        print(f'Harness failed with code {result.returncode}', file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        return None
    if outfile:
        with open(outfile) as f:
            return json.load(f)
    return json.loads(result.stdout)


def main():
    parser = argparse.ArgumentParser(description='Run Hack 1982 harness session')
    parser.add_argument('--seed', type=int, default=42, help='RNG seed')
    parser.add_argument('--keys', default='Q', help='Keystroke sequence')
    parser.add_argument('--out', default=None, help='Output JSON file')
    parser.add_argument('--harness', default=None, help='Path to hack_harness binary')
    args = parser.parse_args()

    # Find harness binary
    script_dir = os.path.dirname(os.path.abspath(__file__))
    harness = args.harness or os.path.join(script_dir, 'hack_harness')
    if not os.path.exists(harness):
        print(f'Harness not found: {harness}', file=sys.stderr)
        print('Build it first: cd hack-c/patched && make', file=sys.stderr)
        sys.exit(1)

    session = run_session(args.seed, args.keys, args.out, harness)
    if session is None:
        sys.exit(1)
    if not args.out:
        print(json.dumps(session, indent=2))
    else:
        print(f'Session written to {args.out}: {len(session.get("steps", []))} steps')


if __name__ == '__main__':
    main()
