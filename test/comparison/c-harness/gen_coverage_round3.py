#!/usr/bin/env python3
"""Generate C sessions for coverage round 3.

Targets high-impact low-coverage files:
- fountain.js: drink/dip fountain, drink/dip sink
- sit.js: sit on thrones (regular + Vlad's), rndcurse, attrcurse
- pray.js: pray, sacrifice, turn undead
- trap.js: various trap triggers
- dig.js: digging with pick-axe and wand

Usage:
    python3 gen_coverage_round3.py --all
    python3 gen_coverage_round3.py --fountain --sit --pray --dig --trap
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


# --- Fountain: drink ---

def gen_fountain_drink_multi(seed=1401):
    """Drink from fountain multiple times to cycle through rnd(30) effects."""
    print(f'gen_fountain_drink_multi (seed {seed})...')
    moves = ''
    # Walk to find fountain — or create water
    # Just walk around a bit and try quaffing on every tile
    # Better approach: wish can't create fountains, but we can walk to one
    # On seed 1401, try walking around the starting room
    for _ in range(3):
        moves += 'l'
    for _ in range(3):
        moves += 'j'
    # Try quaffing at each position (will say "no fountain here" if none)
    moves += 'q' + 'y'  # quaff from fountain if on one
    for _ in range(3):
        moves += 'k'
    for _ in range(3):
        moves += 'h'
    moves += 'q' + 'y'
    # Walk more to explore
    for _ in range(5):
        moves += 'l'
    moves += 'q' + 'y'
    for _ in range(5):
        moves += 'j'
    moves += 'q' + 'y'
    # Try quaffing many times on same spot
    for _ in range(8):
        moves += 'q' + 'y'
    moves += SP * 20
    run(seed, f'theme26_seed{seed}_wiz_fountain-drink_gameplay', moves)


def gen_fountain_dip(seed=1402):
    """Dip items in fountain — long sword for Excalibur, and other items."""
    print(f'gen_fountain_dip (seed {seed})...')
    moves = ''
    # Wish for items to dip
    moves += wish('long sword')
    # Walk around to find a fountain
    for _ in range(5):
        moves += 'l'
    for _ in range(5):
        moves += 'j'
    for _ in range(5):
        moves += 'h'
    for _ in range(5):
        moves += 'k'
    # Try dipping
    moves += extcmd('dip') + 'e' + 'y'  # dip sword in fountain
    # Dip more items
    moves += wish('dagger')
    moves += extcmd('dip') + 'f' + 'y'
    # Keep dipping
    for _ in range(5):
        moves += extcmd('dip') + 'e' + 'y'
    moves += SP * 20
    run(seed, f'theme26_seed{seed}_wiz_fountain-dip_gameplay', moves)


def gen_sink_drink(seed=1403):
    """Drink from sink — exercises drinksink() with rn2(20) effects."""
    print(f'gen_sink_drink (seed {seed})...')
    moves = ''
    # Walk around to find a sink (kitchens in mines town etc)
    # On a standard level, sinks are rare. Try walking around.
    for _ in range(8):
        moves += 'l'
    for _ in range(8):
        moves += 'j'
    # Quaff at each position
    for _ in range(6):
        moves += 'q' + 'y'
    for _ in range(8):
        moves += 'h'
    for _ in range(8):
        moves += 'k'
    for _ in range(6):
        moves += 'q' + 'y'
    moves += SP * 20
    run(seed, f'theme26_seed{seed}_wiz_sink-drink_gameplay', moves)


# --- Pray ---

def gen_pray_basic(seed=1410):
    """Basic prayer — tests dopray, prayer_done, pleased paths."""
    print(f'gen_pray_basic (seed {seed})...')
    moves = ''
    # Pray immediately (should be aligned, first prayer)
    moves += extcmd('pray') + 'y'  # confirm prayer
    # Wait for prayer to complete (3 turns)
    moves += '.' * 5
    # Walk a bit
    moves += 'l' + 'l' + 'l'
    # Pray again (too soon — tests prayer cooldown)
    moves += extcmd('pray') + 'y'
    moves += '.' * 5
    moves += SP * 20
    run(seed, f'theme26_seed{seed}_wiz_pray-basic_gameplay', moves)


def gen_pray_on_altar(seed=1411):
    """Pray on altar — tests water_prayer, altar alignment checks."""
    print(f'gen_pray_on_altar (seed {seed})...')
    moves = ''
    # Walk around to find altar, or just pray from starting position
    # Wish for potions to bless on altar
    moves += wish('potion of water')
    moves += wish('potion of water')
    # Walk to find altar
    for _ in range(5):
        moves += 'l'
    for _ in range(5):
        moves += 'j'
    # Pray on this position (may or may not be altar)
    moves += extcmd('pray') + 'y'
    moves += '.' * 5
    # Walk more
    for _ in range(5):
        moves += 'h'
    for _ in range(5):
        moves += 'k'
    moves += extcmd('pray') + 'y'
    moves += '.' * 5
    moves += SP * 20
    run(seed, f'theme26_seed{seed}_wiz_pray-altar_gameplay', moves)


def gen_sacrifice(seed=1412):
    """Sacrifice corpses on altar — tests dosacrifice, offer_corpse."""
    print(f'gen_sacrifice (seed {seed})...')
    moves = ''
    # Create some monsters, kill them for corpses
    moves += genesis('kobold')
    moves += genesis('newt')
    moves += genesis('gecko')
    # Attack monsters (they should be adjacent)
    moves += 'F' + 'j'  # fight south
    moves += 'F' + 'j'
    moves += 'F' + 'j'
    moves += 'F' + 'j'
    moves += 'F' + 'j'
    moves += 'F' + 'j'
    moves += 'F' + 'k'
    moves += 'F' + 'k'
    moves += 'F' + 'k'
    # Pick up corpses
    moves += ','
    moves += 'j'
    moves += ','
    # Walk to altar (if any nearby)
    for _ in range(5):
        moves += 'l'
    # Try offering
    moves += extcmd('offer')
    moves += 'e'  # select corpse
    moves += SP * 5
    # Try offering more
    moves += extcmd('offer')
    moves += SP * 5
    moves += SP * 20
    run(seed, f'theme26_seed{seed}_wiz_sacrifice_gameplay', moves)


def gen_turn_undead(seed=1413):
    """Turn undead — tests doturn with undead monsters."""
    print(f'gen_turn_undead (seed {seed})...')
    moves = ''
    # Create undead monsters
    moves += genesis('zombie')
    moves += genesis('skeleton')
    moves += genesis('ghoul')
    moves += genesis('wraith')
    # Turn undead
    moves += extcmd('turn')
    # Wait
    moves += '.' * 3
    # Create more undead and turn again
    moves += genesis('mummy')
    moves += genesis('vampire')
    moves += extcmd('turn')
    moves += '.' * 3
    # Turn while confused
    moves += wish('potion of confusion')
    moves += 'q' + 'e'  # quaff confusion
    moves += extcmd('turn')
    moves += SP * 20
    run(seed, f'theme26_seed{seed}_wiz_turn-undead_gameplay', moves)


# --- Dig ---

def gen_dig_pickaxe(seed=1420):
    """Dig with pick-axe — tests dig.js dig_check, dighole, etc."""
    print(f'gen_dig_pickaxe (seed {seed})...')
    moves = ''
    # Wish for pick-axe
    moves += wish('pick-axe')
    # Wield it
    moves += 'w' + 'e'
    # Apply (dig) in various directions
    moves += 'a' + 'e' + 'l'  # dig east
    moves += '.' * 8  # wait for digging to complete
    moves += 'a' + 'e' + 'l'  # dig east more
    moves += '.' * 8
    # Dig down
    moves += 'a' + 'e' + '>'  # dig down
    moves += '.' * 8
    # Walk and dig more
    moves += 'l' + 'l'
    moves += 'a' + 'e' + 'j'  # dig south
    moves += '.' * 8
    moves += SP * 20
    run(seed, f'theme26_seed{seed}_wiz_dig-pickaxe_gameplay', moves)


def gen_dig_wand(seed=1421):
    """Dig with wand of digging — tests zap-based digging paths."""
    print(f'gen_dig_wand (seed {seed})...')
    moves = ''
    # Wish for wand of digging
    moves += wish('wand of digging')
    # Zap in various directions
    moves += 'z' + 'e' + 'l'  # zap east
    moves += 'l' + 'l' + 'l'  # walk through
    moves += 'z' + 'e' + 'j'  # zap south
    moves += 'j' + 'j' + 'j'  # walk through
    # Zap downward
    moves += 'z' + 'e' + '>'  # zap down
    # Fall through hole (answer prompts)
    moves += 'y'
    moves += '.' * 3
    # Zap more on new level
    moves += 'z' + 'e' + 'l'
    moves += 'l' + 'l'
    moves += SP * 20
    run(seed, f'theme26_seed{seed}_wiz_dig-wand_gameplay', moves)


# --- Trap ---

def gen_trap_trigger(seed=1430):
    """Walk over traps — tests trap.js dotrap, various trap types."""
    print(f'gen_trap_trigger (seed {seed})...')
    moves = ''
    # Explore aggressively to trigger traps
    for _ in range(10):
        moves += 'l'
    for _ in range(10):
        moves += 'j'
    for _ in range(10):
        moves += 'h'
    for _ in range(10):
        moves += 'k'
    # Diagonal movement
    for _ in range(5):
        moves += 'y'  # NW
    for _ in range(5):
        moves += 'n'  # SE
    for _ in range(5):
        moves += 'u'  # NE
    for _ in range(5):
        moves += 'b'  # SW
    moves += SP * 20
    run(seed, f'theme26_seed{seed}_wiz_trap-trigger_gameplay', moves)


def gen_trap_set(seed=1431):
    """Set and trigger traps — tests settrap, launch_obj."""
    print(f'gen_trap_set (seed {seed})...')
    moves = ''
    # Wish for beartrap
    moves += wish('beartrap')
    # Set trap: apply it
    moves += 'a' + 'e'
    # Walk off and back
    moves += 'l' + 'l' + 'h' + 'h'
    # Wish for land mine
    moves += wish('land mine')
    moves += 'a' + 'f'
    # Walk around
    moves += 'l' + 'l' + 'h' + 'h'
    # Create monsters to walk into traps
    moves += genesis('kobold')
    moves += genesis('kobold')
    moves += '.' * 10  # wait for monsters to move around
    moves += SP * 20
    run(seed, f'theme26_seed{seed}_wiz_trap-set_gameplay', moves)


# --- Main ---

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    generators = {
        '--fountain': [gen_fountain_drink_multi, gen_fountain_dip, gen_sink_drink],
        '--pray': [gen_pray_basic, gen_pray_on_altar, gen_sacrifice, gen_turn_undead],
        '--dig': [gen_dig_pickaxe, gen_dig_wand],
        '--trap': [gen_trap_trigger, gen_trap_set],
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
