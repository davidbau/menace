#!/usr/bin/env python3
"""
find_monster_seed.py — scan seeds using C harness to find target monsters near player.

Usage:
  python3 hack/test/find_monster_seed.py E          # floating eye
  python3 hack/test/find_monster_seed.py E,R,N,A,y  # any of these on level 1
  python3 hack/test/find_monster_seed.py P --dlevel 5 --keys "...descent..."
  python3 hack/test/find_monster_seed.py E --maxdist 2 --limit 5 --start 1
"""
import subprocess, json, sys, os, argparse

HARNESS = os.path.join(os.path.dirname(__file__), '../hack-c/patched/hack_harness')
RUN_SESSION = os.path.join(os.path.dirname(__file__), '../hack-c/patched/run_session.py')

def find_at(screen):
    """Find player '@' position on screen."""
    for r, row in enumerate(screen):
        c = row.find('@')
        if c >= 0:
            return (c, r)
    return None

def scan_seed(seed, target_mlets, keys, maxdist):
    """Run seed with keys, check if any target monster is within maxdist of player."""
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
        outpath = f.name
    try:
        result = subprocess.run(
            [sys.executable, RUN_SESSION, '--seed', str(seed), '--keys', keys, '--out', outpath],
            capture_output=True, timeout=10
        )
        if result.returncode != 0:
            return None
        with open(outpath) as f:
            data = json.load(f)
        # Look at last step's screen
        if not data.get('steps'):
            return None
        screen = data['steps'][-1]['screen']
        player = find_at(screen)
        if not player:
            return None
        px, py = player
        found = []
        for r, row in enumerate(screen):
            for c, ch in enumerate(row):
                if ch in target_mlets:
                    dist = max(abs(c - px), abs(r - py))
                    if dist <= maxdist:
                        found.append({'mlet': ch, 'x': c, 'y': r, 'dist': dist})
        return found if found else None
    except (subprocess.TimeoutExpired, Exception):
        return None
    finally:
        try: os.unlink(outpath)
        except: pass

def main():
    p = argparse.ArgumentParser()
    p.add_argument('mlets', help='Monster letters, comma-separated (e.g. E,R,N)')
    p.add_argument('--dlevel', type=int, default=1)
    p.add_argument('--keys', default=None, help='Custom key sequence to get to target level')
    p.add_argument('--maxdist', type=int, default=4)
    p.add_argument('--limit', type=int, default=10)
    p.add_argument('--start', type=int, default=1)
    p.add_argument('--end', type=int, default=50000)
    args = p.parse_args()

    target = set(args.mlets.split(','))

    # Default descent keys: repeat "jjjjhhjjjjl>" for each level needed
    if args.keys:
        keys = args.keys
    elif args.dlevel <= 1:
        keys = 'h'  # just take a step to reveal starting state
    else:
        # Naive descent: try stair-finding sequence
        descent = 'jjjjhhjjjjl>'
        keys = descent * (args.dlevel - 1) + 'h'

    print(f"Scanning seeds {args.start}-{args.end} for {target} at dlevel={args.dlevel} maxdist={args.maxdist}")
    found_count = 0
    for seed in range(args.start, args.end + 1):
        matches = scan_seed(seed, target, keys, args.maxdist)
        if matches:
            for m in matches:
                print(f"seed={seed:6d}  mlet={m['mlet']}  pos=({m['x']:2d},{m['y']:2d})  dist={m['dist']}")
            found_count += 1
            if found_count >= args.limit:
                break
    if found_count == 0:
        print('No seeds found.')

if __name__ == '__main__':
    main()
