#!/usr/bin/env python3
"""Generate C sessions for coverage round 6.

Targets deeper uncovered paths:
- Wand of wishing (#wizwish tests existing — try wand-based wishing)
- Scroll of teleportation, scroll of identify, scroll of enchant weapon
- More armor interactions (boots, gloves, shields)
- Dip in fountain (requires finding one — try many seeds)
- Pet interactions (drop food for pet, etc)
- Ring effects (put on/remove various rings)
- Amulet effects (various amulets)

Usage:
    python3 gen_coverage_round6.py --all
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


# --- Ring effects ---

def gen_ring_effects(seed=1701):
    """Put on and remove various rings — exercises do_wear.js ring paths."""
    print(f'gen_ring_effects (seed {seed})...')
    moves = ''
    # Wish for various rings
    moves += wish('ring of protection')
    moves += wish('ring of teleportation')
    moves += wish('ring of invisibility')
    moves += wish('ring of see invisible')
    moves += wish('ring of levitation')
    # Put on rings
    moves += 'P' + 'e'  # put on protection
    moves += 'P' + 'f'  # put on teleportation
    # Remove and swap
    moves += 'R' + 'e'  # remove protection
    moves += 'P' + 'g'  # put on invisibility
    # Wait to observe effects
    moves += '.' * 5
    # Remove all rings
    moves += 'R' + 'f'
    moves += 'R' + 'g'
    # Put on levitation ring
    moves += 'P' + 'i'
    moves += '.' * 3
    # Remove to descend
    moves += 'R' + 'i'
    moves += SP * 15
    run(seed, f'theme29_seed{seed}_wiz_ring-effects_gameplay', moves)


def gen_ring_stats(seed=1702):
    """Put on stat-boosting rings."""
    print(f'gen_ring_stats (seed {seed})...')
    moves = ''
    moves += wish('ring of gain strength')
    moves += wish('ring of gain constitution')
    moves += wish('ring of increase accuracy')
    moves += wish('ring of increase damage')
    moves += wish('ring of adornment')
    # Put on
    moves += 'P' + 'e'
    moves += 'P' + 'f'
    # Check stats
    moves += '@'  # attributes
    # Swap rings
    moves += 'R' + 'e'
    moves += 'P' + 'g'
    moves += 'R' + 'f'
    moves += 'P' + 'h'
    moves += '@'
    moves += SP * 15
    run(seed, f'theme29_seed{seed}_wiz_ring-stats_gameplay', moves)


# --- Amulet effects ---

def gen_amulet_effects(seed=1710):
    """Wear various amulets — exercises do_wear.js amulet paths."""
    print(f'gen_amulet_effects (seed {seed})...')
    moves = ''
    moves += wish('amulet of reflection')
    moves += 'P' + 'e'
    moves += '.' * 3
    moves += 'R' + 'e'
    moves += wish('amulet of ESP')
    moves += 'P' + 'f'
    moves += '.' * 3
    moves += 'R' + 'f'
    moves += wish('amulet of life saving')
    moves += 'P' + 'g'
    moves += SP * 15
    run(seed, f'theme29_seed{seed}_wiz_amulet-effects_gameplay', moves)


# --- Scroll of identify ---

def gen_scroll_identify(seed=1720):
    """Read scroll of identify — exercises identify path in read.js."""
    print(f'gen_scroll_identify (seed {seed})...')
    moves = ''
    # Wish for some unidentified items
    moves += wish('ring of protection')
    moves += wish('potion of speed')
    moves += wish('wand of fire')
    # Read identify scroll
    moves += wish('scroll of identify')
    moves += 'r' + 'h'  # read it
    moves += 'e'        # identify first item
    # Read another
    moves += wish('blessed scroll of identify')
    moves += 'r' + 'h'  # blessed identifies all
    moves += SP * 15
    run(seed, f'theme29_seed{seed}_wiz_scroll-identify_gameplay', moves)


# --- Scroll of teleportation ---

def gen_scroll_teleport(seed=1721):
    """Read scroll of teleportation."""
    print(f'gen_scroll_teleport (seed {seed})...')
    moves = ''
    moves += wish('scroll of teleportation')
    moves += 'r' + 'e'
    # Might need to answer teleport direction prompt
    moves += '.' * 3
    # Cursed teleport (random destination)
    moves += wish('cursed scroll of teleportation')
    moves += 'r' + 'e'
    moves += '.' * 3
    moves += SP * 15
    run(seed, f'theme29_seed{seed}_wiz_scroll-teleport_gameplay', moves)


# --- Scroll of enchant weapon/armor ---

def gen_scroll_enchant(seed=1722):
    """Read scroll of enchant weapon and armor."""
    print(f'gen_scroll_enchant (seed {seed})...')
    moves = ''
    # Wield a weapon
    moves += wish('long sword')
    moves += 'w' + 'e'
    # Enchant weapon
    moves += wish('scroll of enchant weapon')
    moves += 'r' + 'f'
    # Enchant again
    moves += wish('scroll of enchant weapon')
    moves += 'r' + 'f'
    # Wear armor and enchant it
    moves += wish('leather armor')
    moves += 'W' + 'f'
    moves += wish('scroll of enchant armor')
    moves += 'r' + 'g'
    moves += SP * 15
    run(seed, f'theme29_seed{seed}_wiz_scroll-enchant_gameplay', moves)


# --- Scroll of create monster ---

def gen_scroll_create_monster(seed=1723):
    """Read scroll of create monster."""
    print(f'gen_scroll_create_monster (seed {seed})...')
    moves = ''
    moves += wish('scroll of create monster')
    moves += 'r' + 'e'
    moves += '.' * 5
    # Read another (confused = creates acid blob)
    moves += wish('potion of confusion')
    moves += 'q' + 'e'
    moves += wish('scroll of create monster')
    moves += 'r' + 'e'
    moves += '.' * 5
    moves += SP * 15
    run(seed, f'theme29_seed{seed}_wiz_scroll-create-monster_gameplay', moves)


# --- Scroll of earth ---

def gen_scroll_earth(seed=1724):
    """Read scroll of earth — creates boulders."""
    print(f'gen_scroll_earth (seed {seed})...')
    moves = ''
    moves += wish('scroll of earth')
    moves += 'r' + 'e'
    moves += '.' * 3
    # Walk around boulders
    moves += 'l' + 'l' + 'l'
    # Read another
    moves += wish('scroll of earth')
    moves += 'r' + 'e'
    moves += SP * 15
    run(seed, f'theme29_seed{seed}_wiz_scroll-earth_gameplay', moves)


# --- More scroll effects ---

def gen_scroll_misc(seed=1725):
    """Read miscellaneous scrolls: remove curse, magic mapping, stinking cloud."""
    print(f'gen_scroll_misc (seed {seed})...')
    moves = ''
    # Magic mapping
    moves += wish('scroll of magic mapping')
    moves += 'r' + 'e'
    # Stinking cloud
    moves += wish('scroll of stinking cloud')
    moves += 'r' + 'f'
    # Need to give a position — try '.'
    moves += '.'
    moves += '.' * 3
    # Remove curse
    moves += wish('cursed ring of teleportation')
    moves += 'P' + 'g'  # put on cursed ring
    moves += wish('blessed scroll of remove curse')
    moves += 'r' + 'h'
    moves += SP * 15
    run(seed, f'theme29_seed{seed}_wiz_scroll-misc_gameplay', moves)


# --- Pet interactions ---

def gen_pet_feeding(seed=1730):
    """Feed pets and interact — exercises dog.js/dogmove.js."""
    print(f'gen_pet_feeding (seed {seed})...')
    moves = ''
    # Create a pet
    moves += genesis('kitten')
    # Drop food for it
    moves += wish('tripe ration')
    moves += 'd' + 'e'  # drop tripe
    # Walk away and back
    moves += 'l' + 'l' + 'l'
    moves += '.' * 3
    moves += 'h' + 'h' + 'h'
    # Create another pet
    moves += genesis('pony')
    moves += wish('apple')
    moves += 'd' + 'f'  # drop apple
    moves += '.' * 5
    moves += SP * 15
    run(seed, f'theme29_seed{seed}_wiz_pet-feeding_gameplay', moves)


# --- Wield special weapons ---

def gen_wield_special(seed=1740):
    """Wield and use special weapons — exercises weapon.js/wield.js."""
    print(f'gen_wield_special (seed {seed})...')
    moves = ''
    # Wish for special weapons
    moves += wish('silver saber')
    moves += 'w' + 'e'  # wield
    # Create a monster and attack
    moves += genesis('kobold')
    moves += 'F' + 'j'
    moves += 'F' + 'j'
    # Swap to another weapon
    moves += wish('dwarvish mattock')
    moves += 'w' + 'f'
    moves += genesis('gnome')
    moves += 'F' + 'j'
    moves += 'F' + 'j'
    # Two-weapon fighting
    moves += wish('short sword')
    moves += 'w' + 'g'
    moves += extcmd('twoweapon')
    moves += genesis('orc')
    moves += 'F' + 'j'
    moves += 'F' + 'j'
    moves += SP * 15
    run(seed, f'theme29_seed{seed}_wiz_wield-special_gameplay', moves)


# --- Extended commands: loot, look, etc ---

def gen_extended_cmds(seed=1750):
    """Various extended commands — exercises cmd.js dispatch."""
    print(f'gen_extended_cmds (seed {seed})...')
    moves = ''
    # Look at position
    moves += ':'  # look here
    # What is here
    moves += ';' + '.'  # far look at self
    # Enhanced view
    moves += '/'  # what is
    moves += '.'  # at cursor
    moves += ENTER
    # Walk and look around
    moves += 'l' + 'l'
    moves += ':'
    moves += 'j' + 'j'
    moves += ':'
    # Search
    moves += 's'  # search
    moves += 's'
    moves += 's'
    # Toggle autopickup
    moves += '@'
    moves += SP * 15
    run(seed, f'theme29_seed{seed}_wiz_extended-cmds_gameplay', moves)


# --- Main ---

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    generators = {
        '--ring': [gen_ring_effects, gen_ring_stats],
        '--amulet': [gen_amulet_effects],
        '--scroll': [gen_scroll_identify, gen_scroll_teleport, gen_scroll_enchant,
                     gen_scroll_create_monster, gen_scroll_earth, gen_scroll_misc],
        '--pet': [gen_pet_feeding],
        '--wield': [gen_wield_special],
        '--extended': [gen_extended_cmds],
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
