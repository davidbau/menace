#!/usr/bin/env python3
"""Generate C sessions for coverage round 4.

Targets high-line-count uncovered code:
- zap.js: more wand/spell zapping (ray types, beam bouncing)
- mhitu.js: monster attacks on player (via genesis)
- eat.js: eating various food types including corpses
- potion.js: more quaff effects, throw potions
- do_wear.js: wear/remove various armor types
- pickup.js: pickup in various contexts
- invent.js: inventory operations

Strategy: Each session focuses on exercising ONE code path deeply,
with multiple iterations to cycle through random branches.

Usage:
    python3 gen_coverage_round4.py --all
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


# --- Zap: more wand types ---

def gen_zap_fire(seed=1501):
    """Zap wand of fire at monsters — ray type ZT_FIRE."""
    print(f'gen_zap_fire (seed {seed})...')
    moves = ''
    # Create monsters
    moves += genesis('kobold')
    moves += genesis('gnome')
    moves += genesis('orc')
    # Wish for wand of fire
    moves += wish('wand of fire')
    # Zap at monsters
    moves += 'z' + 'e' + 'j'   # zap south
    moves += 'z' + 'e' + 'k'   # zap north
    moves += 'z' + 'e' + 'l'   # zap east
    moves += 'z' + 'e' + 'h'   # zap west
    # Create more and zap again
    moves += genesis('kobold')
    moves += genesis('kobold')
    moves += 'z' + 'e' + 'j'
    moves += 'z' + 'e' + 'k'
    moves += SP * 15
    run(seed, f'theme27_seed{seed}_wiz_zap-fire_gameplay', moves)


def gen_zap_lightning(seed=1502):
    """Zap wand of lightning — ray type ZT_LIGHTNING."""
    print(f'gen_zap_lightning (seed {seed})...')
    moves = ''
    moves += genesis('kobold')
    moves += genesis('gnome')
    moves += wish('wand of lightning')
    # Get shock resistance first
    moves += wish('ring of shock resistance')
    moves += 'P' + 'f'  # put on ring
    # Zap in various directions
    moves += 'z' + 'e' + 'j'
    moves += 'z' + 'e' + 'l'
    moves += 'z' + 'e' + 'k'
    moves += 'z' + 'e' + 'h'
    # Zap at self
    moves += 'z' + 'e' + '.'
    moves += SP * 15
    run(seed, f'theme27_seed{seed}_wiz_zap-lightning_gameplay', moves)


def gen_zap_sleep(seed=1503):
    """Zap wand of sleep at monsters — ray type ZT_SLEEP."""
    print(f'gen_zap_sleep (seed {seed})...')
    moves = ''
    moves += genesis('kobold')
    moves += genesis('gnome')
    moves += genesis('orc')
    moves += wish('wand of sleep')
    moves += 'z' + 'e' + 'j'
    moves += 'z' + 'e' + 'k'
    moves += 'z' + 'e' + 'l'
    # Wait for monsters to wake up
    moves += '.' * 5
    # Zap again
    moves += 'z' + 'e' + 'j'
    moves += SP * 15
    run(seed, f'theme27_seed{seed}_wiz_zap-sleep_gameplay', moves)


def gen_zap_death(seed=1504):
    """Zap wand of death at monsters — ray type ZT_DEATH."""
    print(f'gen_zap_death (seed {seed})...')
    moves = ''
    moves += genesis('kobold')
    moves += genesis('gnome')
    moves += genesis('orc')
    # Get magic resistance for safety
    moves += wish('cloak of magic resistance')
    moves += 'W' + 'e'  # wear cloak
    moves += wish('wand of death')
    moves += 'z' + 'f' + 'j'
    moves += 'z' + 'f' + 'l'
    moves += 'z' + 'f' + 'k'
    # Create undead (immune to death)
    moves += genesis('zombie')
    moves += 'z' + 'f' + 'j'  # death ray bounces off zombie
    moves += SP * 15
    run(seed, f'theme27_seed{seed}_wiz_zap-death_gameplay', moves)


def gen_zap_polymorph(seed=1505):
    """Zap wand of polymorph at monsters."""
    print(f'gen_zap_polymorph (seed {seed})...')
    moves = ''
    moves += genesis('kobold')
    moves += genesis('gnome')
    moves += genesis('orc')
    moves += wish('wand of polymorph')
    moves += 'z' + 'e' + 'j'
    moves += 'z' + 'e' + 'k'
    moves += 'z' + 'e' + 'l'
    # Wait and observe
    moves += '.' * 5
    moves += SP * 15
    run(seed, f'theme27_seed{seed}_wiz_zap-polymorph_gameplay', moves)


# --- Monster attacks on player (mhitu.js) ---

def gen_mhitu_melee(seed=1510):
    """Get attacked by various melee monsters — exercises mattacku/mhitu."""
    print(f'gen_mhitu_melee (seed {seed})...')
    moves = ''
    # Create aggressive monsters adjacent
    moves += genesis('hill giant')
    moves += genesis('troll')
    moves += genesis('ogre')
    # Wait for them to attack us
    moves += '.' * 15
    # Create more
    moves += genesis('wolf')
    moves += genesis('jackal')
    moves += '.' * 10
    moves += SP * 15
    run(seed, f'theme27_seed{seed}_wiz_mhitu-melee_gameplay', moves)


def gen_mhitu_special(seed=1511):
    """Get attacked by monsters with special attacks (nymph steal, etc)."""
    print(f'gen_mhitu_special (seed {seed})...')
    moves = ''
    # Nymph (steal attack)
    moves += genesis('wood nymph')
    moves += '.' * 5
    # Floating eye (paralyze gaze)
    moves += genesis('floating eye')
    moves += '.' * 5
    # Cockatrice (petrification — need protection)
    moves += wish('gloves')
    moves += 'W' + 'e'  # wear gloves
    moves += genesis('cockatrice')
    moves += '.' * 5
    # Rust monster
    moves += genesis('rust monster')
    moves += '.' * 5
    moves += SP * 15
    run(seed, f'theme27_seed{seed}_wiz_mhitu-special_gameplay', moves)


# --- Eat: various food types ---

def gen_eat_corpses(seed=1520):
    """Eat monster corpses — exercises corpse-specific effects in eat.js."""
    print(f'gen_eat_corpses (seed {seed})...')
    moves = ''
    # Create and kill monsters for corpses
    moves += genesis('newt')
    moves += 'F' + 'j'  # fight south
    moves += 'F' + 'j'
    moves += 'F' + 'j'
    # Pick up and eat corpse
    moves += 'j'  # move to corpse
    moves += ',' # pickup
    moves += 'e' + 'e'  # eat the corpse
    moves += 'y'  # confirm
    # Another monster
    moves += genesis('kobold')
    moves += 'F' + 'j'
    moves += 'F' + 'j'
    moves += 'F' + 'j'
    moves += 'j'
    moves += ','
    moves += 'e' + 'e'
    moves += 'y'
    moves += SP * 15
    run(seed, f'theme27_seed{seed}_wiz_eat-corpses_gameplay', moves)


def gen_eat_tins(seed=1521):
    """Open and eat tins — exercises tinning code in eat.js."""
    print(f'gen_eat_tins (seed {seed})...')
    moves = ''
    # Wish for various tins
    moves += wish('tin of kobold meat')
    moves += wish('tin of newt meat')
    moves += wish('blessed tin of spinach')
    # Eat each
    moves += 'e' + 'e' + 'y'  # eat tin, confirm
    moves += '.' * 5  # wait for opening
    moves += 'e' + 'f' + 'y'
    moves += '.' * 5
    moves += 'e' + 'g' + 'y'
    moves += '.' * 5
    moves += SP * 15
    run(seed, f'theme27_seed{seed}_wiz_eat-tins_gameplay', moves)


# --- Potion: throw and break ---

def gen_potion_throw(seed=1530):
    """Throw potions at monsters — exercises potion breaking/splash code."""
    print(f'gen_potion_throw (seed {seed})...')
    moves = ''
    moves += genesis('kobold')
    moves += genesis('gnome')
    # Wish for various potions
    moves += wish('potion of acid')
    moves += wish('potion of blindness')
    moves += wish('potion of sleeping')
    # Throw potions at monsters
    moves += 't' + 'e' + 'j'  # throw acid south
    moves += 't' + 'f' + 'j'  # throw blindness
    moves += 't' + 'g' + 'k'  # throw sleeping north
    moves += SP * 15
    run(seed, f'theme27_seed{seed}_wiz_potion-throw_gameplay', moves)


def gen_potion_dip_weapons(seed=1531):
    """Dip weapons in potions — exercises potion dipping code."""
    print(f'gen_potion_dip_weapons (seed {seed})...')
    moves = ''
    # Wish for items
    moves += wish('long sword')
    moves += wish('potion of sickness')
    moves += wish('potion of acid')
    # Dip sword in sickness (poison it)
    moves += extcmd('dip') + 'e' + 'f'
    # Dip sword in acid
    moves += extcmd('dip') + 'e' + 'g'
    moves += SP * 15
    run(seed, f'theme27_seed{seed}_wiz_potion-dip-weapons_gameplay', moves)


# --- Wear: various armor types ---

def gen_wear_armor(seed=1540):
    """Wear and remove various armor types — exercises do_wear.js."""
    print(f'gen_wear_armor (seed {seed})...')
    moves = ''
    # Wish for various armor
    moves += wish('plate mail')
    moves += wish('helm of brilliance')
    moves += wish('gauntlets of power')
    moves += wish('speed boots')
    moves += wish('cloak of invisibility')
    moves += wish('shield of reflection')
    # Wear each piece
    moves += 'W' + 'e'  # wear plate mail
    moves += 'W' + 'f'  # wear helm
    moves += 'W' + 'g'  # wear gauntlets
    moves += 'W' + 'h'  # wear boots
    moves += 'W' + 'i'  # wear cloak
    moves += 'W' + 'j'  # wear shield
    # Check inventory
    moves += 'i'
    # Take off each piece
    moves += 'T' + 'i'  # remove cloak (must remove outer first)
    moves += 'T' + 'e'  # remove plate mail
    moves += 'T' + 'f'  # remove helm
    moves += 'T' + 'g'  # remove gauntlets
    moves += 'T' + 'h'  # remove boots
    moves += 'T' + 'j'  # remove shield
    moves += SP * 15
    run(seed, f'theme27_seed{seed}_wiz_wear-armor_gameplay', moves)


def gen_wear_cursed(seed=1541):
    """Wear cursed armor — tests can't-remove paths in do_wear.js."""
    print(f'gen_wear_cursed (seed {seed})...')
    moves = ''
    moves += wish('cursed helm of opposite alignment')
    moves += 'W' + 'e'  # wear it
    # Try to remove (should fail)
    moves += 'T' + 'e'
    # Try remove curse
    moves += wish('blessed scroll of remove curse')
    moves += 'r' + 'f'
    # Now remove
    moves += 'T' + 'e'
    moves += SP * 15
    run(seed, f'theme27_seed{seed}_wiz_wear-cursed_gameplay', moves)


# --- Pickup ---

def gen_pickup_various(seed=1550):
    """Pick up various items on ground — exercises pickup.js."""
    print(f'gen_pickup_various (seed {seed})...')
    moves = ''
    # Walk around and pickup what we find
    for _ in range(5):
        moves += 'l'
    moves += ','  # pickup
    for _ in range(5):
        moves += 'j'
    moves += ','
    for _ in range(5):
        moves += 'h'
    moves += ','
    # Drop items and pick up again
    moves += 'd' + 'a'  # drop first item
    moves += ','  # pick it up
    # Wish for gold and pick up
    moves += wish('300 gold pieces')
    moves += ','
    moves += SP * 15
    run(seed, f'theme27_seed{seed}_wiz_pickup-various_gameplay', moves)


# --- Inventory operations ---

def gen_invent_ops(seed=1560):
    """Inventory operations — adjust, name, organize."""
    print(f'gen_invent_ops (seed {seed})...')
    moves = ''
    # Check inventory
    moves += 'i'
    # Wish for items
    moves += wish('long sword')
    moves += wish('dagger')
    moves += wish('food ration')
    # Check inventory again
    moves += 'i'
    # Name an item
    moves += extcmd('name') + 'e'  # name specific item
    moves += 'MyStaff' + ENTER
    # Wield sword
    moves += 'w' + 'e'
    # Swap weapons
    moves += 'x'
    # Quiver dagger
    moves += 'Q' + 'f'
    # Fire quivered
    moves += 'f' + 'j'  # fire south
    moves += SP * 15
    run(seed, f'theme27_seed{seed}_wiz_invent-ops_gameplay', moves)


# --- Main ---

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    generators = {
        '--zap': [gen_zap_fire, gen_zap_lightning, gen_zap_sleep, gen_zap_death, gen_zap_polymorph],
        '--mhitu': [gen_mhitu_melee, gen_mhitu_special],
        '--eat': [gen_eat_corpses, gen_eat_tins],
        '--potion': [gen_potion_throw, gen_potion_dip_weapons],
        '--wear': [gen_wear_armor, gen_wear_cursed],
        '--pickup': [gen_pickup_various],
        '--invent': [gen_invent_ops],
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
