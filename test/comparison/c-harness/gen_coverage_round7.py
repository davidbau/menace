#!/usr/bin/env python3
"""Generate C sessions for coverage round 7.

Targets biggest coverage gaps:
- trap.js (37%) — trigger various traps
- dokick.js (28%) — kick doors, monsters, objects
- dig.js (34%) — dig with pick-axe, wand of digging
- shk.js (42%) — shop buy/sell/steal
- mkmaze.js (28%) — maze level generation (via descending)
- polyself.js (50%) — polymorph into various forms

Usage:
    python3 gen_coverage_round7.py --all
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

def run(seed, name, moves):
    outpath = os.path.join(SESSIONS_DIR, f'{name}.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  -> {outpath}')


# --- Trap encounters ---

def gen_trap_pit(seed=1901):
    """Walk into traps — pit, spiked pit, trap door."""
    print(f'gen_trap_pit (seed {seed})...')
    moves = ''
    # Wish for a trap
    # Use wizard genesis to make traps by stepping on them
    # Walk around a lot on level 1 — likely to hit traps
    for _ in range(15):
        moves += 'l'
    for _ in range(15):
        moves += 'j'
    for _ in range(15):
        moves += 'h'
    for _ in range(15):
        moves += 'k'
    # Diagonal exploration
    for _ in range(10):
        moves += 'n'
    for _ in range(10):
        moves += 'y'
    for _ in range(10):
        moves += 'u'
    for _ in range(10):
        moves += 'b'
    # Search for traps
    moves += 's' * 10
    # More walking
    for _ in range(10):
        moves += 'l'
    for _ in range(10):
        moves += 'j'
    moves += SP * 20
    run(seed, f'theme31_seed{seed}_wiz_trap-explore_gameplay', moves)


def gen_trap_bear(seed=1902):
    """Encounter bear traps and similar."""
    print(f'gen_trap_bear (seed {seed})...')
    moves = ''
    # Walk extensively on level 2-3 for more traps
    # First descend
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
    # Explore level 2 extensively
    for _ in range(20):
        moves += 'l'
    for _ in range(20):
        moves += 'j'
    for _ in range(20):
        moves += 'h'
    for _ in range(20):
        moves += 'k'
    moves += 's' * 5
    moves += SP * 20
    run(seed, f'theme31_seed{seed}_wiz_trap-explore2_gameplay', moves)


# --- Kicking ---

def gen_kick_door(seed=1910):
    """Kick locked doors and objects."""
    print(f'gen_kick_door (seed {seed})...')
    moves = ''
    # Walk to find a door
    for _ in range(5):
        moves += 'l'
    # Kick in each direction
    moves += CTRL_I  # identify all
    # Kick east
    moves += extcmd('kick') + 'l'
    # Walk more, kick more
    for _ in range(5):
        moves += 'j'
    moves += extcmd('kick') + 'j'
    for _ in range(5):
        moves += 'h'
    moves += extcmd('kick') + 'h'
    for _ in range(5):
        moves += 'k'
    moves += extcmd('kick') + 'k'
    # Try kicking objects
    moves += wish('large box')
    moves += 'd' + 'e'  # drop it
    moves += 'h'  # step away
    moves += extcmd('kick') + 'l'  # kick the box
    # Kick a sink (if we find one)
    for _ in range(8):
        moves += 'l'
    moves += extcmd('kick') + 'j'
    for _ in range(8):
        moves += 'j'
    moves += extcmd('kick') + 'h'
    moves += SP * 15
    run(seed, f'theme31_seed{seed}_wiz_kick-door_gameplay', moves)


def gen_kick_monster(seed=1911):
    """Kick monsters — exercises dokick.js monster paths."""
    print(f'gen_kick_monster (seed {seed})...')
    moves = ''
    # Create monsters and kick them
    moves += genesis('kobold')
    moves += extcmd('kick') + 'j'
    moves += extcmd('kick') + 'j'
    moves += genesis('grid bug')
    moves += extcmd('kick') + 'l'
    moves += extcmd('kick') + 'l'
    # Kick while blind
    moves += wish('potion of blindness')
    moves += 'q' + 'e'
    moves += genesis('newt')
    moves += extcmd('kick') + 'j'
    moves += '.' * 5
    moves += SP * 15
    run(seed, f'theme31_seed{seed}_wiz_kick-monster_gameplay', moves)


# --- Digging ---

def gen_dig_pickaxe(seed=1920):
    """Dig with a pick-axe — exercises dig.js."""
    print(f'gen_dig_pickaxe (seed {seed})...')
    moves = ''
    # Wish for digging tools
    moves += wish('pick-axe')
    moves += 'w' + 'e'  # wield
    # Apply pick-axe to dig down
    moves += 'a' + 'e' + '>'
    moves += '.' * 10  # wait while digging
    moves += SP * 5
    # Dig in a direction
    moves += 'a' + 'e' + 'l'
    moves += '.' * 10
    moves += SP * 5
    # Dig another direction
    moves += 'a' + 'e' + 'j'
    moves += '.' * 10
    moves += SP * 5
    # Walk through the tunnel
    moves += 'l' + 'l' + 'l'
    moves += SP * 10
    run(seed, f'theme31_seed{seed}_wiz_dig-pickaxe_gameplay', moves)


def gen_dig_wand(seed=1921):
    """Dig with wand of digging — different code path."""
    print(f'gen_dig_wand (seed {seed})...')
    moves = ''
    moves += wish('wand of digging')
    # Zap downward
    moves += 'z' + 'e' + '>'
    moves += SP * 5
    # Zap in a direction
    moves += wish('wand of digging')
    moves += 'z' + 'e' + 'l'
    moves += SP * 3
    # Walk through
    moves += 'l' + 'l' + 'l'
    # Zap another direction
    moves += wish('wand of digging')
    moves += 'z' + 'e' + 'j'
    moves += SP * 3
    # Zap at a wall
    moves += wish('wand of digging')
    moves += 'z' + 'e' + 'h'
    moves += SP * 15
    run(seed, f'theme31_seed{seed}_wiz_dig-wand_gameplay', moves)


# --- Polymorph self ---

def gen_polyself(seed=1930):
    """Polymorph into various forms."""
    print(f'gen_polyself (seed {seed})...')
    moves = ''
    # Polymorph
    moves += wish('wand of polymorph')
    moves += 'z' + 'e' + '.'  # zap self
    moves += SP * 3
    # Walk around in polymorphed form
    moves += 'l' * 5
    moves += 'j' * 5
    # Wait for polymorph to wear off
    moves += '.' * 20
    moves += SP * 5
    # Polymorph again
    moves += wish('potion of polymorph')
    moves += 'q' + 'e'
    moves += SP * 3
    # Exercise polymorphed abilities
    moves += 'l' * 3
    moves += 'j' * 3
    moves += '.' * 20
    moves += SP * 15
    run(seed, f'theme31_seed{seed}_wiz_polyself_gameplay', moves)


def gen_polyself_forms(seed=1931):
    """Polymorph using different seeds to get different forms."""
    print(f'gen_polyself_forms (seed {seed})...')
    moves = ''
    moves += wish('wand of polymorph')
    # Zap self multiple times
    moves += 'z' + 'e' + '.'
    moves += SP * 3
    moves += '.' * 15
    moves += SP * 5
    # Polymorph again after reverting
    moves += 'z' + 'e' + '.'
    moves += SP * 3
    moves += '.' * 15
    moves += SP * 5
    # And again
    moves += 'z' + 'e' + '.'
    moves += SP * 3
    moves += '.' * 10
    moves += SP * 15
    run(seed, f'theme31_seed{seed}_wiz_polyself-forms_gameplay', moves)


# --- Shop interactions ---

def gen_shop_buy(seed=1940):
    """Shop buying — walk into shop, pick up items, pay."""
    print(f'gen_shop_buy (seed {seed})...')
    moves = ''
    # Descend to mines town (best chance of shops)
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
    # Explore extensively for shops
    for _ in range(15):
        moves += 'l'
    moves += ','  # pickup
    for _ in range(15):
        moves += 'j'
    moves += ','
    for _ in range(15):
        moves += 'h'
    moves += ','
    for _ in range(15):
        moves += 'k'
    moves += ','
    # Pay
    moves += 'p'
    moves += SP * 20
    run(seed, f'theme31_seed{seed}_wiz_shop-buy_gameplay', moves)


def gen_shop_steal(seed=1941):
    """Shop stealing — teleport out with items."""
    print(f'gen_shop_steal (seed {seed})...')
    moves = ''
    # Walk to find shop
    for _ in range(10):
        moves += 'l'
    moves += ','  # try to pick up
    for _ in range(10):
        moves += 'j'
    moves += ','
    # Teleport away with goods
    moves += wish('scroll of teleportation')
    moves += 'r' + 'e'
    moves += SP * 3
    # Walk more
    for _ in range(10):
        moves += 'l'
    for _ in range(10):
        moves += 'k'
    moves += SP * 15
    run(seed, f'theme31_seed{seed}_wiz_shop-steal_gameplay', moves)


# --- Maze level generation ---

def gen_maze_levels(seed=1950):
    """Rush deep to trigger maze level generation (Gehennom)."""
    print(f'gen_maze_levels (seed {seed})...')
    moves = ''
    # Use levelchange to jump deep
    moves += extcmd('levelchange')
    moves += '10' + ENTER  # go 10 levels deeper
    moves += SP * 3
    # Explore maze level
    for _ in range(10):
        moves += 'l'
    for _ in range(10):
        moves += 'j'
    for _ in range(10):
        moves += 'h'
    for _ in range(10):
        moves += 'k'
    # Go deeper
    moves += extcmd('levelchange')
    moves += '5' + ENTER
    moves += SP * 3
    for _ in range(10):
        moves += 'l'
    for _ in range(10):
        moves += 'j'
    moves += SP * 15
    run(seed, f'theme31_seed{seed}_wiz_maze-levels_gameplay', moves)


# --- Combined trap + kick session ---

def gen_trap_kick_combo(seed=1960):
    """Kick into traps, kick while trapped."""
    print(f'gen_trap_kick_combo (seed {seed})...')
    moves = ''
    # Walk around to find traps
    for _ in range(12):
        moves += 'l'
    for _ in range(12):
        moves += 'j'
    for _ in range(12):
        moves += 'h'
    for _ in range(12):
        moves += 'k'
    # Search
    moves += 's' * 5
    # Kick nearby
    moves += extcmd('kick') + 'l'
    moves += extcmd('kick') + 'j'
    # Force fighting into empty space (might trigger traps)
    moves += 'F' + 'l'
    moves += 'F' + 'j'
    # More exploration
    for _ in range(8):
        moves += 'n'
    for _ in range(8):
        moves += 'y'
    moves += 's' * 5
    moves += SP * 15
    run(seed, f'theme31_seed{seed}_wiz_trap-kick-combo_gameplay', moves)


# --- Main ---

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    generators = {
        '--trap': [gen_trap_pit, gen_trap_bear],
        '--kick': [gen_kick_door, gen_kick_monster],
        '--dig': [gen_dig_pickaxe, gen_dig_wand],
        '--poly': [gen_polyself, gen_polyself_forms],
        '--shop': [gen_shop_buy, gen_shop_steal],
        '--maze': [gen_maze_levels],
        '--combo': [gen_trap_kick_combo],
    }

    if '--all' in args:
        for gens in generators.values():
            for gen in gens:
                gen()
        return

    for arg in args:
        if arg in generators:
            for gen in generators[arg]:
                gen()
        else:
            print(f'Unknown option: {arg}')
            sys.exit(1)


if __name__ == '__main__':
    main()
