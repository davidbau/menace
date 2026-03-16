#!/usr/bin/env python3
"""Generate C sessions with deep dungeon exploration.

These sessions descend stairs to reach deeper levels, exploring:
- The Gnomish Mines entrance (dlvl 2-4)
- Shops (random, but common in mines)
- Temples and altars
- Various room types
- Multiple level generation paths

Strategy: Walk around the starting level, find and use downstairs,
explore the next level. Repeat for 3-4 levels. Use many seeds to
find diverse level layouts.

Usage:
    python3 gen_deep_explore.py --all
    python3 gen_deep_explore.py --descend --mines
"""

import sys
import os
import importlib.util

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
SESSIONS_DIR = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'sessions', 'pending')

_spec = importlib.util.spec_from_file_location(
    'run_session', os.path.join(SCRIPT_DIR, 'run_session.py'))
_rs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_rs)

CHARACTER_WIZ = {
    'name': 'Wizard',
    'role': 'Wizard',
    'race': 'human',
    'gender': 'male',
    'align': 'neutral',
}

CHARACTER_VAL = {
    'name': 'Valkyrie',
    'role': 'Valkyrie',
    'race': 'human',
    'gender': 'female',
    'align': 'neutral',
}

CTRL_G = '\x07'
CTRL_W = '\x17'
CTRL_I = '\x09'
ESC    = '\x1b'
SP     = ' '
ENTER  = '\n'


def wish(item):
    return CTRL_W + item + ENTER

def genesis(monster):
    return CTRL_G + monster + ENTER

def extcmd(cmd):
    return '#' + cmd + ENTER

def run(seed, name, moves, character=None):
    outpath = os.path.join(SESSIONS_DIR, f'{name}.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    char = character or CHARACTER_WIZ
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=char, record_more_spaces=True)
    print(f'  -> {outpath}')


# Exploration pattern: walk around room, find stairs
def explore_and_descend():
    """Walk around searching for downstairs, then descend."""
    moves = ''
    # Explore current room/area
    for _ in range(5):
        moves += 'l'
    for _ in range(5):
        moves += 'j'
    for _ in range(5):
        moves += 'h'
    for _ in range(5):
        moves += 'k'
    # Diagonal exploration
    for _ in range(3):
        moves += 'n'  # SE
    for _ in range(3):
        moves += 'y'  # NW
    for _ in range(3):
        moves += 'u'  # NE
    for _ in range(3):
        moves += 'b'  # SW
    # Try going down at current position
    moves += '>'
    # More exploration
    for _ in range(8):
        moves += 'l'
    moves += '>'
    for _ in range(8):
        moves += 'j'
    moves += '>'
    for _ in range(8):
        moves += 'h'
    moves += '>'
    for _ in range(8):
        moves += 'k'
    moves += '>'
    return moves


# --- Descend sessions (different seeds) ---

def gen_descend_explore(seed):
    """Explore level 1 and try to descend."""
    print(f'gen_descend_explore (seed {seed})...')
    moves = ''
    # Explore level 1 extensively
    moves += explore_and_descend()
    # If we descended, explore level 2
    moves += explore_and_descend()
    moves += SP * 15
    run(seed, f'theme30_seed{seed}_wiz_descend-explore_gameplay', moves)


def gen_descend_multi(seeds):
    """Generate multiple descend sessions with different seeds."""
    for seed in seeds:
        gen_descend_explore(seed)


# --- Deep dive: rush downstairs ---

def gen_rush_down(seed=1810):
    """Rush downstairs as fast as possible to reach deeper levels."""
    print(f'gen_rush_down (seed {seed})...')
    moves = ''
    # Quick exploration pattern then downstairs
    for level in range(4):
        # Short explore
        for _ in range(4):
            moves += 'l'
        moves += '>'
        for _ in range(4):
            moves += 'j'
        moves += '>'
        for _ in range(4):
            moves += 'h'
        moves += '>'
        for _ in range(4):
            moves += 'k'
        moves += '>'
        for _ in range(4):
            moves += 'n'
        moves += '>'
        for _ in range(4):
            moves += 'y'
        moves += '>'
        for _ in range(6):
            moves += 'l'
        moves += '>'
        for _ in range(6):
            moves += 'j'
        moves += '>'
    moves += SP * 15
    run(seed, f'theme30_seed{seed}_wiz_rush-down_gameplay', moves)


# --- Valkyrie exploration (different starting gear/role) ---

def gen_valkyrie_explore(seed=1820):
    """Explore as Valkyrie — different role exercises different paths."""
    print(f'gen_valkyrie_explore (seed {seed})...')
    moves = ''
    moves += explore_and_descend()
    moves += explore_and_descend()
    moves += SP * 15
    run(seed, f'theme30_seed{seed}_val_explore_gameplay', moves, character=CHARACTER_VAL)


# --- Shop interaction ---

def gen_shop_interact(seed=1830):
    """Try to find and interact with shops."""
    print(f'gen_shop_interact (seed {seed})...')
    moves = ''
    # Explore extensively to find shops
    for _ in range(10):
        moves += 'l'
    for _ in range(10):
        moves += 'j'
    # Try to pick stuff up in case we're in a shop
    moves += ','
    for _ in range(5):
        moves += 'h'
    moves += ','
    for _ in range(5):
        moves += 'k'
    moves += ','
    # Drop something (triggers shop billing)
    moves += 'd' + 'a'
    # Try to pay
    moves += 'p'
    # Walk more
    for _ in range(10):
        moves += 'l'
    moves += ','
    for _ in range(10):
        moves += 'k'
    moves += ','
    moves += SP * 15
    run(seed, f'theme30_seed{seed}_wiz_shop-interact_gameplay', moves)


# --- Complex multi-action session ---

def gen_complex_session(seed=1840):
    """A complex session combining many actions for maximum coverage."""
    print(f'gen_complex_session (seed {seed})...')
    moves = ''
    # Identify all
    moves += CTRL_I
    # Explore
    for _ in range(5):
        moves += 'l'
    for _ in range(5):
        moves += 'j'
    # Zap a wand
    moves += wish('wand of magic missile')
    moves += 'z' + 'e' + 'l'
    # Create and fight a monster
    moves += genesis('kobold')
    moves += 'F' + 'j'
    moves += 'F' + 'j'
    # Pick up corpse and eat it
    moves += 'j'
    moves += ','
    moves += 'e' + 'e' + 'y'
    # Wear armor
    moves += wish('leather armor')
    moves += 'W' + 'f'
    # Cast a spell
    moves += 'Z' + 'a' + 'l'
    # Search
    moves += 's' + 's' + 's'
    # Read a scroll
    moves += wish('scroll of magic mapping')
    moves += 'r' + 'g'
    # Quaff a potion
    moves += wish('potion of healing')
    moves += 'q' + 'g'
    # Put on a ring
    moves += wish('ring of protection')
    moves += 'P' + 'g'
    # Try to descend
    moves += '>'
    for _ in range(8):
        moves += 'l'
    moves += '>'
    # Engrave
    moves += 'E' + '-' + 'Elbereth' + ENTER
    # Wait
    moves += '.' * 5
    moves += SP * 20
    run(seed, f'theme30_seed{seed}_wiz_complex-session_gameplay', moves)


# --- Main ---

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    generators = {
        '--descend': lambda: gen_descend_multi([1801, 1802, 1803, 1804, 1805]),
        '--rush': lambda: gen_rush_down(),
        '--valkyrie': lambda: gen_valkyrie_explore(),
        '--shop': lambda: gen_shop_interact(),
        '--complex': lambda: gen_complex_session(),
    }

    if '--all' in args:
        for gen in generators.values():
            gen()
        return

    for arg in args:
        if arg in generators:
            generators[arg]()
        else:
            print(f'Unknown option: {arg}')
            sys.exit(1)


if __name__ == '__main__':
    main()
