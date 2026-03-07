#!/usr/bin/env python3
"""
make_sessions.py — Generate reference sessions for Hack 1982 parity testing.

Produces 22 session files covering navigation, combat, item use, and stair descent.
Sessions are written to hack/test/sessions/ in v1 format (with rng arrays).

Usage:
  python3 make_sessions.py [--out-dir DIR] [--harness PATH]
"""

import argparse
import subprocess
import sys
import os
import json

# Each entry: (seed, keys, description)
# Key vocabulary:
#   hjklyubn  — 8-direction movement (vi keys)
#   s         — search adjacent squares
#   e         — eat (followed by item letter or space to cancel)
#   i         — show inventory
#   w         — wield weapon (followed by item letter or space)
#   >/<       — go down/up stairs (only works on stair square)
#   Q         — quit (needs y confirmation)
#   y         — confirm quit
#   \x1b      — escape (cancel prompt)
#
# Note: unknown commands print an error but don't crash.
# Note: e/w require follow-up keys; if cancelled they're no-ops.

def movement_loop(dirs, count):
    """Repeat movement directions count times."""
    result = ''
    for i in range(count):
        result += dirs[i % len(dirs)]
    return result

SESSIONS = [
    # --- Rerecord existing 6 sessions (upgrade to v1 with rng) ---
    (1,    "hhhljjjkllhhuubbnnyyuubbQy",   "seed1-basic"),
    (42,   "hhhljjjkQy",                    "seed42-basic"),
    (100,  "llhhkkjjuubbnnyyhjklQy",        "seed100-basic"),
    (777,  "hjkluubbnnyyhjkluubbQy",        "seed777-basic"),
    (1337, "hhhjjjllllkkkhuubbQy",          "seed1337-basic"),
    (2023, "hhjjllkkhhuubbnnQy",            "seed2023-basic"),

    # --- Navigation: explore rooms ---
    (2,    "hhhhjjjjllllkkkkuuuubbbbnnnnyyyyQy",   "seed2-nav"),
    (11,   "jjjjllllkkkkhhhhuuuubbbbnnnnQy",       "seed11-nav"),
    (4,    "kkkkllllhhhhjjjjuuuubbbbyyyyQy",        "seed4-nav"),
    (5,    "hhhhjjjjllllkkkkyyyy uuuubbbbQy",       "seed5-nav"),

    # --- Combat: walk into monsters (long movement sequences) ---
    # seeds 3,10,25,500,1000 hang in C mklev — use alternatives
    (12,   "hjkluubbnnyyhjkluubbnnyyhjklQy",  "seed12-combat"),
    (20,   "llhhkkjjuubbnnyyhhhjjllkklQy",    "seed20-combat"),
    (30,   "jhjklubbnjjklhhjjluubbnnQy",      "seed30-combat"),

    # --- Item use: eat, wield, search ---
    (50,   "hjkl hjkl hjkle hjkle hjklQy",    "seed50-eat"),
    (75,   "hjkl hjkl hjklwb hjkl hjklQy",    "seed75-wield"),
    (99,   "jjjsss lllsss kkkssss hhhssssQy",  "seed99-search"),

    # --- Stair descent: explore then try stairs ---
    (200,  "hjkljjjlllkkkuuubbbhhhkkkjjj>jjjkjk>jjjkQy",  "seed200-stairs"),
    (26,   "hhhjjjlllkkk>hjkl>hjkl>hjklQy",               "seed26-stairs"),
    (999,  "llllkkkuuubbb>hjklhh>hjklhhhjjjQy",            "seed999-stairs"),

    # --- Multi-level: descend and return ---
    (1500, "hjkluubbnnhjkl>hjkl>hjkl<hjkl<hjklQy",  "seed1500-multi"),
    (2000, "hhhljjjk>lll>kkk<jjj<hjklQy",            "seed2000-multi"),
    (5000, "jjjhlll>hhh<kkk>lll<hjklQy",             "seed5000-multi"),
]


def run_session(seed, keys, outfile, harness):
    """Run the harness and write session JSON to outfile."""
    args = [harness, '--seed', str(seed), '--keys', keys, '--out', outfile]
    result = subprocess.run(args, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        print(f'  ERROR: harness failed (seed={seed})', file=sys.stderr)
        if result.stderr:
            print(result.stderr[:200], file=sys.stderr)
        return False
    return True


def main():
    parser = argparse.ArgumentParser(description='Generate Hack 1982 reference sessions')
    parser.add_argument('--out-dir', default=None, help='Output directory for session files')
    parser.add_argument('--harness', default=None, help='Path to hack_harness binary')
    parser.add_argument('--seeds', default=None, help='Comma-separated seed list (default: all)')
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Default harness is in the same directory
    harness = args.harness or os.path.join(script_dir, 'hack_harness')
    if not os.path.exists(harness):
        print(f'Harness not found: {harness}', file=sys.stderr)
        print('Build it first: cd hack-c/patched && make', file=sys.stderr)
        sys.exit(1)

    # Default output dir: ../../test/sessions/ relative to this script
    out_dir = args.out_dir or os.path.join(script_dir, '..', '..', 'test', 'sessions')
    out_dir = os.path.normpath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    # Filter seeds if requested
    seed_filter = None
    if args.seeds:
        seed_filter = set(int(s.strip()) for s in args.seeds.split(','))

    sessions = SESSIONS
    if seed_filter:
        sessions = [(s, k, d) for (s, k, d) in sessions if s in seed_filter]

    print(f'Generating {len(sessions)} session(s) → {out_dir}')
    ok = 0
    fail = 0
    for seed, keys, desc in sessions:
        outfile = os.path.join(out_dir, f'seed{seed}.json')
        print(f'  seed={seed:6d}  {desc:20s}  keys={len(keys):3d}  ...', end='', flush=True)
        if run_session(seed, keys, outfile, harness):
            with open(outfile) as f:
                data = json.load(f)
            nsteps = len(data.get('steps', []))
            rng0 = len(data['steps'][0].get('rng', [])) if nsteps > 0 else 0
            print(f' {nsteps} steps, rng[0]={rng0}')
            ok += 1
        else:
            print(' FAILED')
            fail += 1

    print(f'\nDone: {ok} ok, {fail} failed')
    if fail:
        sys.exit(1)


if __name__ == '__main__':
    main()
