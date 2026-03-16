#!/usr/bin/env python3
"""
Driver for the Fortran Dungeon binary.

Sends all commands at once, captures stdout and stderr, then parses
the output into per-move entries with game output and SURVEIL state.

Usage:
    python3 dungeon_driver.py [--seed N] --input speedrun.json [--output log.json]
    python3 dungeon_driver.py [--seed N] --commands "look" "n" "quit" "y"

Produces a JSON log with one entry per move:
{
  "seed": 13,
  "moves": [
    {
      "move": 1,
      "command": "look",
      "output": [" line1", " line2"],
      "surveil": {"here": 2, "thfpos": 189, ...},
      "rng_calls": 287
    }
  ],
  "summary": {"passed": 170, "failed": 5, "total": 175}
}
"""

import subprocess
import json
import sys
import os
import re
import argparse


def run_dungeon(commands, seed=None, binary_dir=None):
    """Run Dungeon with given commands, return (stdout, stderr)."""
    if binary_dir is None:
        binary_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fortran-src')

    env = dict(os.environ)
    if seed is not None:
        env['DUNGEON_SEED'] = str(seed)

    input_text = '\n'.join(commands) + '\n'

    result = subprocess.run(
        ['./dungeon'],
        input=input_text,
        capture_output=True,
        text=True,
        timeout=120,
        cwd=binary_dir,
        env=env,
    )
    return result.stdout, result.stderr


def parse_output(stdout, stderr, commands):
    """Parse stdout into per-move output, stderr into SURVEIL entries."""

    # Split stdout on ' > ' prompts into chunks
    # Each ' > ' starts a new prompt. Text after ' > ' on the same line
    # is the beginning of the response.
    chunks = []  # chunks[0] = welcome, chunks[i+1] = output after command i
    current = []
    for line in stdout.split('\n'):
        if line.startswith(' > ') or line == ' >':
            chunks.append(current)
            current = []
            after = line[3:].rstrip() if line.startswith(' > ') else ''
            if after:
                current.append(' ' + after)
        else:
            current.append(line)
    if current:
        chunks.append(current)

    # Parse SURVEIL lines from stderr
    surveil_lines = [l for l in stderr.split('\n') if l.startswith('SURVEIL:')]

    # Count RNG calls between SURVEIL lines
    stderr_lines = stderr.split('\n')
    rng_counts = []
    count = 0
    for line in stderr_lines:
        if line.strip().startswith('RNG #'):
            count += 1
        elif line.startswith('SURVEIL:'):
            rng_counts.append(count)
            count = 0

    # Build moves
    welcome = chunks[0] if chunks else []
    moves = []

    for i, cmd in enumerate(commands):
        output = chunks[i + 1] if i + 1 < len(chunks) else []

        # Parse SURVEIL for this move
        surveil = {}
        if i < len(surveil_lines):
            for m in re.finditer(r'(\w+)=\s*([^ ]+)', surveil_lines[i]):
                key, val = m.group(1), m.group(2)
                if val in ('T', 'F'):
                    surveil[key] = val == 'T'
                else:
                    try:
                        surveil[key] = int(val)
                    except ValueError:
                        surveil[key] = val

        rng = rng_counts[i] if i < len(rng_counts) else 0

        moves.append({
            'move': i + 1,
            'command': cmd,
            'output': output,
            'surveil': surveil,
            'rng_calls': rng,
        })

    return welcome, moves


def validate_moves(moves, steps):
    """Check moves against speedrun step expectations."""
    for i, move in enumerate(moves):
        if i >= len(steps):
            break
        step = steps[i]
        expect = step.get('expect', [])
        output_text = '\n'.join(move['output']).lower()

        issues = []
        for kw in expect:
            if kw.lower() not in output_text:
                issues.append(f'missing "{kw}"')
        if "can't see any" in output_text and not step.get('expectFail'):
            issues.append("can't see any")
        if "don't understand" in output_text and not step.get('expectFail'):
            issues.append("don't understand")

        move['status'] = 'FAIL' if issues else 'pass'
        if issues:
            move['issues'] = issues


def main():
    parser = argparse.ArgumentParser(description='Dungeon game driver')
    parser.add_argument('--seed', type=int, default=None, help='RNG seed (overrides speedrun.json)')
    parser.add_argument('--input', type=str, help='speedrun.json input file')
    parser.add_argument('--output', type=str, help='JSON log output file (default: stdout)')
    parser.add_argument('--stop-on-error', action='store_true', help='Only report up to first failure')
    parser.add_argument('--binary-dir', type=str, help='Path to fortran-src directory')
    parser.add_argument('--commands', nargs='*', help='Commands to send (alternative to --input)')
    parser.add_argument('--brief', action='store_true', help='Print brief summary to stderr')
    args = parser.parse_args()

    # Get commands and seed
    steps = None
    if args.input:
        with open(args.input) as f:
            speedrun = json.load(f)
        steps = speedrun.get('steps', [])
        commands = [s['cmd'] for s in steps]
        seed = args.seed if args.seed is not None else speedrun.get('seed', 13)
    elif args.commands:
        commands = args.commands
        seed = args.seed if args.seed is not None else 13
    else:
        print("Error: provide --input or --commands", file=sys.stderr)
        sys.exit(1)

    # Run
    stdout, stderr = run_dungeon(commands, seed=seed, binary_dir=args.binary_dir)
    welcome, moves = parse_output(stdout, stderr, commands)

    # Validate if we have step expectations
    if steps:
        validate_moves(moves, steps)

    # Build log
    log = {
        'seed': seed,
        'welcome': welcome,
        'moves': moves,
    }

    if steps:
        passed = sum(1 for m in moves if m.get('status') == 'pass')
        failed = sum(1 for m in moves if m.get('status') == 'FAIL')
        log['summary'] = {'passed': passed, 'failed': failed, 'total': len(moves)}

    # Find first failure for --stop-on-error reporting
    if args.stop_on_error and steps:
        for m in moves:
            if m.get('status') == 'FAIL':
                print(f"FAIL step {m['move']}: \"{m['command']}\"", file=sys.stderr)
                for iss in m.get('issues', []):
                    print(f"  {iss}", file=sys.stderr)
                if m['output']:
                    print(f"  output: {m['output'][0][:80]}", file=sys.stderr)
                break

    # Brief summary
    if args.brief or args.stop_on_error:
        s = log.get('summary', {})
        print(f"{s.get('passed', '?')}/{s.get('total', '?')} passed", file=sys.stderr)

    # Output
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(log, f, indent=2)
        print(f"Log written to {args.output}", file=sys.stderr)
    else:
        json.dump(log, sys.stdout, indent=2)
        print(file=sys.stdout)


if __name__ == '__main__':
    main()
