#!/usr/bin/env python3
"""
run_session.py — CLI runner for the Rogue 3.6 harness.

Usage:
    python3 run_session.py --seed N --keys "hjkl..." --out output.json

Runs rogue_harness with the given seed and keystroke sequence,
producing a JSON session file.
"""

import subprocess
import os
import sys
import argparse
import json


def main():
    p = argparse.ArgumentParser(
        description="Run Rogue 3.6 harness and produce a JSON session file"
    )
    p.add_argument("--seed", type=int, required=True, help="RNG seed")
    p.add_argument("--keys", type=str, required=True, help="Keystroke sequence")
    p.add_argument("--out", type=str, required=True, help="Output JSON file path")
    p.add_argument("--timeout", type=float, default=30.0, help="Timeout in seconds")
    p.add_argument("--wizard", action="store_true", help="Enable wizard mode")
    args = p.parse_args()

    harness = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rogue_harness")
    if not os.path.exists(harness):
        print(f"ERROR: harness binary not found at {harness}", file=sys.stderr)
        print("Run 'make' in the patched directory first.", file=sys.stderr)
        sys.exit(1)

    env = os.environ.copy()
    env["HARNESS_SEED"] = str(args.seed)
    env["HARNESS_KEYS"] = args.keys
    env["HARNESS_OUT"] = args.out

    cmd = [harness]
    if args.wizard:
        cmd.append("--wizard")

    try:
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            timeout=args.timeout,
        )
    except subprocess.TimeoutExpired:
        print(
            f"ERROR: harness timed out after {args.timeout}s", file=sys.stderr
        )
        sys.exit(1)

    if not os.path.exists(args.out):
        print("ERROR: harness did not produce output file", file=sys.stderr)
        if result.stderr:
            print(result.stderr.decode(errors="replace"), file=sys.stderr)
        sys.exit(1)

    # Validate JSON
    try:
        with open(args.out) as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"ERROR: output is not valid JSON: {e}", file=sys.stderr)
        sys.exit(1)

    n_steps = len(data.get("steps", []))
    seed_out = data.get("seed", "?")
    print(f"OK: seed={seed_out} steps={n_steps}")


if __name__ == "__main__":
    main()
