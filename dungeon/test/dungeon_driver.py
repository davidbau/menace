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

    # Collect RNG calls, ENTER/EXIT events, grouped by SURVEIL markers
    stderr_lines = stderr.split('\n')
    rng_per_move = []    # list of lists of {seq, val, n, result}
    trace_per_move = []  # list of lists of "ENTER X" / "EXIT X" strings
    current_rng = []
    current_trace = []
    for line in stderr_lines:
        stripped = line.strip()
        if stripped.startswith('RNG #'):
            m = re.match(r'RNG #\s*(\d+)\s*:\s*val=\s*([^ ]+)\s*n=\s*(\d+)\s*result=\s*(\d+)', stripped)
            if m:
                current_rng.append({
                    'seq': int(m.group(1)),
                    'val': float(m.group(2)),
                    'n': int(m.group(3)),
                    'result': int(m.group(4)),
                })
        elif stripped.startswith('ENTER ') or stripped.startswith('EXIT '):
            current_trace.append(stripped)
        elif line.startswith('SURVEIL:'):
            rng_per_move.append(current_rng)
            trace_per_move.append(current_trace)
            current_rng = []
            current_trace = []

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

        rng_calls = rng_per_move[i] if i < len(rng_per_move) else []
        trace = trace_per_move[i] if i < len(trace_per_move) else []

        moves.append({
            'move': i + 1,
            'command': cmd,
            'output': output,
            'surveil': surveil,
            'rng_calls': rng_calls,
            'trace': trace,
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


def run_js(commands, seed=None, js_dir=None):
    """Run JS Dungeon with given commands, return (stdout, stderr)."""
    if js_dir is None:
        js_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'js')

    # Use absolute paths to avoid cwd issues
    abs_js_dir = os.path.abspath(js_dir)
    abs_data = os.path.join(abs_js_dir, 'dungeon-data.json')
    abs_text = os.path.join(abs_js_dir, 'dungeon-text.json')

    script = f"""
import {{ DungeonGame }} from '{abs_js_dir}/game.js';
import {{ dungeonRngTrace, dungeonRngCount }} from '{abs_js_dir}/support.js';
import {{ readFileSync }} from 'fs';
const data = JSON.parse(readFileSync('{abs_data}'));
const text = JSON.parse(readFileSync('{abs_text}'));
const game = new DungeonGame();
game.init(data, text);
{'game._rngSeed = ' + str(seed) + ';' if seed is not None else ''}
dungeonRngTrace(true);
const cmds = {json.dumps(commands)};
let i = 0;
const outputs = [];
let currentOut = [];
let welcomeDone = false;
await game.run(async () => {{
  if (!welcomeDone) {{
    // First call: output so far is the welcome text
    outputs.push([...currentOut]); // welcome as outputs[0]
    currentOut = [];
    welcomeDone = true;
  }} else {{
    outputs.push([...currentOut]);
    currentOut = [];
  }}
  if (i >= cmds.length) {{ game.gameOver = true; return null; }}
  return cmds[i++];
}}, (t) => {{ currentOut.push(t || ''); }}).catch(() => {{}});
if (currentOut.length) outputs.push([...currentOut]);
// outputs[0] = welcome, outputs[1..N] = command responses
console.log(JSON.stringify(outputs));
"""
    result = subprocess.run(
        ['node', '--input-type=module', '-e', script],
        capture_output=True, text=True, timeout=120,
        cwd=os.path.dirname(js_dir),
    )
    return result.stdout, result.stderr


def parse_js_output(stdout, stderr, commands):
    """Parse JS output into moves."""
    # stdout is a single JSON array of arrays
    # all_outputs[0] = welcome text, all_outputs[1..N] = command responses
    try:
        raw_outputs = json.loads(stdout.strip())
    except (json.JSONDecodeError, ValueError):
        raw_outputs = []
    # Skip welcome (index 0), command outputs start at index 1
    all_outputs = raw_outputs[1:] if len(raw_outputs) > 1 else []

    # Parse RNG calls from stderr (format: RNG #N: seed=S result=R)
    rng_per_move = [[]]  # first bucket for welcome/setup RNG calls
    for line in stderr.split('\n'):
        stripped = line.strip()
        m = re.match(r'RNG #(\d+):\s*seed=(\d+)\s*result=([0-9.]+)', stripped)
        if m:
            rng_per_move[-1].append({
                'seq': int(m.group(1)),
                'seed': int(m.group(2)),
                'val': float(m.group(3)),
            })

    moves = []
    for i, cmd in enumerate(commands):
        output = all_outputs[i] if i < len(all_outputs) else []
        rng = rng_per_move[i + 1] if i + 1 < len(rng_per_move) else []
        moves.append({
            'move': i + 1,
            'command': cmd,
            'output': output,
            'rng_calls': rng,
        })

    return moves


def _normalize(lines):
    """Normalize output lines for comparison: strip, collapse whitespace, skip prompts."""
    result = []
    for l in lines:
        s = ' '.join(l.split()).strip()  # collapse whitespace
        if s and s != '>':
            result.append(s)
    return result


def compare_logs(fortran_moves, js_moves):
    """Compare Fortran and JS move outputs, report divergences."""
    max_moves = min(len(fortran_moves), len(js_moves))
    matches = 0
    divergences = []
    for i in range(max_moves):
        fm = fortran_moves[i]
        jm = js_moves[i]
        fo = _normalize(fm['output'])
        jo = _normalize(jm['output'])
        if fo == jo:
            matches += 1
        else:
            divergences.append({
                'move': i + 1,
                'command': fm['command'],
                'fortran': fo[:3],
                'js': jo[:3],
            })
    return {
        'matches': matches,
        'divergences': len(divergences),
        'total': max_moves,
        'first_divergences': divergences[:10],
    }


def main():
    parser = argparse.ArgumentParser(description='Dungeon game driver')
    parser.add_argument('--seed', type=int, default=None, help='RNG seed (overrides speedrun.json)')
    parser.add_argument('--input', type=str, help='speedrun.json input file')
    parser.add_argument('--output', type=str, help='JSON log output file (default: stdout)')
    parser.add_argument('--stop-on-error', action='store_true', help='Only report up to first failure')
    parser.add_argument('--binary-dir', type=str, help='Path to fortran-src directory')
    parser.add_argument('--commands', nargs='*', help='Commands to send (alternative to --input)')
    parser.add_argument('--brief', action='store_true', help='Print brief summary to stderr')
    parser.add_argument('--js', action='store_true', help='Run JS engine instead of Fortran')
    parser.add_argument('--compare', action='store_true', help='Run both and compare')
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

    if args.compare:
        # Run both engines and compare
        print("Running Fortran...", file=sys.stderr)
        f_stdout, f_stderr = run_dungeon(commands, seed=seed, binary_dir=args.binary_dir)
        f_welcome, f_moves = parse_output(f_stdout, f_stderr, commands)

        print("Running JS...", file=sys.stderr)
        js_stdout, js_stderr = run_js(commands, seed=seed)
        js_moves = parse_js_output(js_stdout, js_stderr, commands)

        comparison = compare_logs(f_moves, js_moves)
        print(f"{comparison['matches']}/{comparison['total']} match "
              f"({100*comparison['matches']/max(1,comparison['total']):.1f}%)", file=sys.stderr)

        if comparison['first_divergences']:
            for d in comparison['first_divergences'][:5]:
                print(f"  Step {d['move']} ({d['command']}):", file=sys.stderr)
                print(f"    F: {d['fortran'][0] if d['fortran'] else '(empty)'}", file=sys.stderr)
                print(f"    J: {d['js'][0] if d['js'] else '(empty)'}", file=sys.stderr)

        log = {'comparison': comparison, 'seed': seed}
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(log, f, indent=2)
        else:
            json.dump(log, sys.stdout, indent=2)
            print()
        return

    # Single engine run
    if args.js:
        js_stdout, js_stderr = run_js(commands, seed=seed)
        moves = parse_js_output(js_stdout, js_stderr, commands)
        welcome = []
    else:
        stdout, stderr = run_dungeon(commands, seed=seed, binary_dir=args.binary_dir)
        welcome, moves = parse_output(stdout, stderr, commands)

    # Validate if we have step expectations
    if steps:
        validate_moves(moves, steps)

    # Build log
    log = {
        'seed': seed,
        'engine': 'js' if args.js else 'fortran',
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
