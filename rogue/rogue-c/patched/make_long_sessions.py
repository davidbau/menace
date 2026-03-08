#!/usr/bin/env python3
"""
make_long_sessions.py — Generate long multi-level Rogue sessions (~200 steps).

Strategy per session:
  - Move in all directions to explore rooms and corridors
  - Use running moves (HJKLYUBN) to traverse faster
  - Press '>' frequently to descend stairs when standing on them
  - Search with 's' to find secret doors
  - Pick up items with ','
  - Use items: 'e' eat, 'q' quaff potion, 'r' read scroll, 'w' wield, 'W' wear
  - End with 'Q' + 'y' to quit cleanly

Keys:
  hjklyubn = move one step
  HJKLYUBN = run until hitting a wall/monster
  >        = descend stairs
  s        = search adjacent squares
  ,        = pick up item at current position
  e        = eat food
  q        = quaff potion (a = first potion)
  r        = read scroll  (a = first scroll)
  w        = wield weapon (a = first weapon)
  W        = wear armor   (a = first armor)
  i        = show inventory
  Q y      = quit

Sequences are designed to explore broadly, find stairs, and descend.
"""

import subprocess
import os
import sys
import json
import argparse

HARNESS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rogue_harness")
SESSIONS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                             "../../test/sessions")

# Each entry: (seed, keys)
# Keys designed to: explore level, find stairs, descend, repeat for multiple levels.
# '>' only works when standing on stairs; otherwise it's a no-op and costs no turn.
# Running moves (uppercase) are efficient for corridor traversal.
# We intersperse '>' every ~10 moves to catch stairs when we stumble on them.

def movement_block(directions, n, stair_freq=8):
    """Generate n moves in given directions, trying '>' every stair_freq steps."""
    keys = []
    for i in range(n):
        keys.append(directions[i % len(directions)])
        if (i + 1) % stair_freq == 0:
            keys.append('>')
    return ''.join(keys)

def explore_level(run_dirs, step_dirs, n_run=6, n_step=4, repeats=8, stair_freq=6):
    """Explore a level by running in various directions, stepping, and trying stairs."""
    keys = []
    for i in range(repeats):
        # Run in a direction
        rd = run_dirs[i % len(run_dirs)]
        for _ in range(n_run):
            keys.append(rd)
        # Try stairs
        keys.append('>')
        # Step in step directions
        for j in range(n_step):
            keys.append(step_dirs[j % len(step_dirs)])
        # Search corners
        keys.append('s')
        keys.append('s')
        # Try stairs again
        keys.append('>')
    return ''.join(keys)


SESSIONS = [
    # Seed, keys — each designed for multi-level exploration ~200 steps
    (10001,
     # Explore broadly, run in all 8 directions, use stairs frequently
     explore_level('HJKLYUBNhjklyubn', 'hjklyubn', n_run=8, n_step=6, repeats=12, stair_freq=5)
     + 'ssss>>>>hjhjhjhjklklklkl'
     + explore_level('KHLJyubn', 'lkjhyubn', n_run=6, n_step=4, repeats=10)
     + 'Q y'),

    (10002,
     # Start by running right/down to find rooms quickly
     'LLLLLLLl>JJJJJJJj>HHHHHHh>KKKKKk>'
     + explore_level('LJHKlkjh', 'yubnjkhl', n_run=7, n_step=5, repeats=10)
     + 'ssss>ssss>'
     + explore_level('YBNUhjkl', 'lkjhyubn', n_run=6, n_step=4, repeats=8)
     + 'Q y'),

    (10003,
     # Diagonal-heavy exploration
     explore_level('YUBNyubn', 'hjklyubn', n_run=8, n_step=4, repeats=10)
     + '>ssss>'
     + explore_level('HJKLhjkl', 'yubnjkhl', n_run=6, n_step=6, repeats=10)
     + '>ssss>'
     + explore_level('LKJHyubn', 'hjklyubn', n_run=5, n_step=5, repeats=6)
     + 'Q y'),

    (10004,
     # Pick up items, use them, descend
     'HHHHHl>JJJJJj>LLLLLl>'
     + explore_level('LJHKyubn', 'hjkljkhl', n_run=7, n_step=5, repeats=8)
     + ',ear>wa>Wa>'  # pick up, eat, quaff(a), read(a), wield(a), wear(a)
     + explore_level('YBNUhjkl', 'lkjhyubn', n_run=6, n_step=4, repeats=8)
     + ',ear>,ear>'
     + explore_level('HKLJyubn', 'yubnhjkl', n_run=6, n_step=4, repeats=6)
     + 'Q y'),

    (10005,
     # Heavy running, fast descent strategy
     'LLLLLLLLLJJJJJJJJ>KKKKKKKKHHHHHHHH>'
     + 'LLLLLLLLLJJJJJJJJ>KKKKKKKKHHHHHHHH>'
     + 'YYYYYYYYBUBUBUBU>NUNUNUNU>>'
     + explore_level('HJKLyubn', 'hjklyubn', n_run=6, n_step=4, repeats=10)
     + '>>'
     + explore_level('LJHKuynb', 'lkjhbuyn', n_run=5, n_step=5, repeats=8)
     + 'Q y'),

    (10006,
     # Thorough search strategy — lots of 's', find secret doors
     explore_level('hjkl', 'ssss', n_run=4, n_step=8, repeats=12)
     + '>>>>>>'
     + explore_level('yubn', 'ssss', n_run=4, n_step=8, repeats=10)
     + '>>>>>>'
     + explore_level('hjkl', 'hjkl', n_run=6, n_step=4, repeats=8)
     + 'Q y'),

    (10007,
     # Mixed: run corridors, search, use items
     'HHHHHHHHjjjjjjjj>LLLLLLLLkkkkkkkk>'
     + ',,' + explore_level('JLKHyubn', 'hjklssss', n_run=6, n_step=6, repeats=9)
     + 'ea>ra>'
     + explore_level('KHLJbuyn', 'lkjhssss', n_run=6, n_step=6, repeats=8)
     + ',ea>ra>'
     + 'ssssssss>>>>>'
     + 'Q y'),

    (10008,
     # Down-right bias — finds stairs faster in many seeds
     'JJJJJJJJLLLLLLLLjjjjjjjjllllllll>'
     + explore_level('JLjl', 'JLjlYUBN', n_run=8, n_step=4, repeats=10)
     + '>>'
     + explore_level('KHkhuynb', 'hjklyubn', n_run=6, n_step=4, repeats=10)
     + '>>'
     + explore_level('LJlj', 'KHkh', n_run=6, n_step=6, repeats=6)
     + 'Q y'),

    (10009,
     # Inventory management + multi-level
     explore_level('HJKLhjkl', 'yubnyubn', n_run=6, n_step=4, repeats=6)
     + 'i>'  # check inventory, try stairs
     + explore_level('YUBNyubn', 'hjklhjkl', n_run=6, n_step=4, repeats=6)
     + ',i>'
     + explore_level('JLKHjlkh', 'yubnyubn', n_run=6, n_step=4, repeats=6)
     + ',ear>i>'
     + explore_level('KHLJkhlj', 'hjklyubn', n_run=5, n_step=4, repeats=6)
     + 'Q y'),

    (10010,
     # Aggressive combat — move into monsters, keep fighting
     explore_level('hjklyubn', 'hjklyubn', n_run=5, n_step=5, repeats=15)
     + '>>'
     + explore_level('HJKLYUBN', 'hjklyubn', n_run=8, n_step=3, repeats=10)
     + '>>'
     + explore_level('hjklyubn', 'HJKLYUBN', n_run=4, n_step=6, repeats=8)
     + 'Q y'),
]


def run_session(seed, keys, out_path, timeout=60):
    env = os.environ.copy()
    env["HARNESS_SEED"] = str(seed)
    env["HARNESS_KEYS"] = keys
    env["HARNESS_OUT"] = out_path
    try:
        result = subprocess.run([HARNESS], env=env, capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return None, "timeout"
    if not os.path.exists(out_path):
        return None, result.stderr.decode(errors="replace")
    with open(out_path) as f:
        data = json.load(f)
    return data, None


def max_level(data):
    best = 1
    for step in data.get("steps", []):
        for line in step.get("screen", []):
            if "Level:" in line:
                try:
                    lv = int(line.split("Level:")[1].split()[0])
                    if lv > best:
                        best = lv
                except (ValueError, IndexError):
                    pass
    return best


def main():
    os.makedirs(SESSIONS_DIR, exist_ok=True)

    for seed, keys in SESSIONS:
        out = os.path.join(SESSIONS_DIR, f"seed{seed}.json")
        print(f"Generating seed{seed} ({len(keys)} keys)...", end=" ", flush=True)
        data, err = run_session(seed, keys, out)
        if err:
            print(f"ERROR: {err}")
            continue
        steps = len(data.get("steps", []))
        lv = max_level(data)
        print(f"{steps} steps, max level {lv}")


if __name__ == "__main__":
    main()
