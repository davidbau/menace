#!/usr/bin/env python3
"""Generate individual C sessions for uncovered scroll effects in read.js.

Each session tests ONE scroll effect in isolation using wizard mode.
Uses record_more_spaces=True for auto --More-- handling.
No trailing spaces on wish/genesis strings.

Targets: seffect_light, seffect_confuse_monster, seffect_scare_monster,
         seffect_punishment, seffect_taming, seffect_gold_detection,
         seffect_food_detection, seffect_amnesia, seffect_destroy_armor,
         seffect_stinking_cloud

Usage:
    python3 gen_scroll_effects.py [--all | --light | --confuse | --scare | ...]
"""

import sys
import os
import importlib.util

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
SESSIONS_DIR = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'sessions', 'pending')

# Import run_session helpers
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

CTRL_G = '\x07'   # #wizgenesis
CTRL_W = '\x17'   # #wizwish
CTRL_I = '\x09'   # #wizidentify
ESC    = '\x1b'
SP     = ' '
ENTER  = '\n'


def wish(item):
    """Wish for an item via Ctrl-W."""
    return CTRL_W + item + ENTER


def genesis(monster):
    """Create a monster via Ctrl-G."""
    return CTRL_G + monster + ENTER


def run(seed, name, moves, suffix='gameplay'):
    """Run a session and save it."""
    outpath = os.path.join(SESSIONS_DIR, f'{name}.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  -> {outpath}')


# --- Individual scroll effect sessions ---

def gen_light(seed=1301):
    """Scroll of light — litroom, lightdamage, tame lights (confused)."""
    print(f'gen_light (seed {seed})...')
    moves = ''
    # Phase 1: uncursed light (lights up room)
    moves += wish('scroll of light')
    moves += 'r' + 'e'  # read scroll e
    # Phase 2: cursed light (darkens room)
    moves += wish('cursed scroll of light')
    moves += 'r' + 'e'
    # Phase 3: confused light (creates tame lights = monsters)
    # First confuse ourselves
    moves += wish('potion of confusion')
    moves += 'q' + 'e'  # quaff it
    moves += wish('scroll of light')
    moves += 'r' + 'e'  # read while confused
    moves += SP * 15
    run(seed, f'theme23_seed{seed}_wiz_scroll-light_gameplay', moves)


def gen_confuse_monster(seed=1302):
    """Scroll of confuse monster — touch-of-confusion."""
    print(f'gen_confuse_monster (seed {seed})...')
    moves = ''
    # Phase 1: uncursed (gives hands-glow touch-of-confusion)
    moves += wish('scroll of confuse monster')
    moves += 'r' + 'e'
    # Phase 2: blessed (more powerful)
    moves += wish('blessed scroll of confuse monster')
    moves += 'r' + 'e'
    # Phase 3: cursed (confuses the reader)
    moves += wish('cursed scroll of confuse monster')
    moves += 'r' + 'e'
    moves += SP * 15
    run(seed, f'theme23_seed{seed}_wiz_scroll-confuse_gameplay', moves)


def gen_scare_monster(seed=1303):
    """Scroll of scare monster — scares nearby monsters."""
    print(f'gen_scare_monster (seed {seed})...')
    moves = ''
    # Create some monsters to scare
    moves += genesis('kobold')
    moves += genesis('newt')
    # Read scare monster scroll
    moves += wish('scroll of scare monster')
    moves += 'r' + 'e'
    moves += SP * 15
    run(seed, f'theme23_seed{seed}_wiz_scroll-scare_gameplay', moves)


def gen_punishment(seed=1304):
    """Scroll of punishment — punish/unpunish."""
    print(f'gen_punishment (seed {seed})...')
    moves = ''
    # Read punishment scroll (attaches ball & chain)
    moves += wish('scroll of punishment')
    moves += 'r' + 'e'
    # Walk around with ball
    moves += 'l' + 'l' + 'l'
    # Read remove curse to unpunish
    moves += wish('blessed scroll of remove curse')
    moves += 'r' + 'e'
    moves += SP * 15
    run(seed, f'theme23_seed{seed}_wiz_scroll-punishment_gameplay', moves)


def gen_taming(seed=1305):
    """Scroll of taming — tames nearby monsters."""
    print(f'gen_taming (seed {seed})...')
    moves = ''
    # Create monsters to tame
    moves += genesis('kitten')
    moves += genesis('pony')
    moves += genesis('kobold')
    # Read taming scroll
    moves += wish('scroll of taming')
    moves += 'r' + 'e'
    # Walk a bit to see tame behavior
    moves += '.' + '.' + '.'
    moves += SP * 15
    run(seed, f'theme23_seed{seed}_wiz_scroll-taming_gameplay', moves)


def gen_gold_detection(seed=1306):
    """Scroll of gold detection — gold_detect."""
    print(f'gen_gold_detection (seed {seed})...')
    moves = ''
    # Read gold detection scroll
    moves += wish('scroll of gold detection')
    moves += 'r' + 'e'
    moves += SP * 15
    run(seed, f'theme23_seed{seed}_wiz_scroll-gold-detect_gameplay', moves)


def gen_food_detection(seed=1307):
    """Scroll of food detection — food_detect."""
    print(f'gen_food_detection (seed {seed})...')
    moves = ''
    # Read food detection scroll
    moves += wish('scroll of food detection')
    moves += 'r' + 'e'
    moves += SP * 15
    run(seed, f'theme23_seed{seed}_wiz_scroll-food-detect_gameplay', moves)


def gen_amnesia(seed=1308):
    """Scroll of amnesia — forget."""
    print(f'gen_amnesia (seed {seed})...')
    moves = ''
    # Explore a bit first so there's something to forget
    moves += 'l' + 'l' + 'l' + 'j' + 'j'
    # Read amnesia scroll
    moves += wish('scroll of amnesia')
    moves += 'r' + 'e'
    # Walk around to see forgotten map
    moves += 'h' + 'h' + 'h'
    moves += SP * 15
    run(seed, f'theme23_seed{seed}_wiz_scroll-amnesia_gameplay', moves)


def gen_destroy_armor(seed=1309):
    """Scroll of destroy armor — destroys worn armor."""
    print(f'gen_destroy_armor (seed {seed})...')
    moves = ''
    # Wish for armor and wear it
    moves += wish('leather armor')
    moves += 'W' + 'e'  # wear armor
    # Read destroy armor scroll
    moves += wish('scroll of destroy armor')
    moves += 'r' + 'f'  # read scroll f
    moves += SP * 15
    run(seed, f'theme23_seed{seed}_wiz_scroll-destroy-armor_gameplay', moves)


# --- Main ---

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    generators = {
        '--light': gen_light,
        '--confuse': gen_confuse_monster,
        '--scare': gen_scare_monster,
        '--punishment': gen_punishment,
        '--taming': gen_taming,
        '--gold': gen_gold_detection,
        '--food': gen_food_detection,
        '--amnesia': gen_amnesia,
        '--destroy': gen_destroy_armor,
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
            print(f'Valid options: --all {" ".join(generators.keys())}')
            sys.exit(1)


if __name__ == '__main__':
    main()
