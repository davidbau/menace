#!/usr/bin/env python3
"""Generate C sessions for coverage round 2.

Targets under-exercised code paths:
- apply.js: apply wands, tools (stethoscope, mirror, candle, etc.)
- potion.js: quaff various potions
- eat.js: eat different food types
- steal.js / mhitu.js: monster interaction (via genesis + combat)
- engrave.js: engrave with different tools
- lock.js: lock/unlock

Usage:
    python3 gen_coverage_round2.py --all
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


# --- Apply tools ---

def gen_apply_stethoscope(seed=1320):
    """Apply stethoscope to self and nearby monsters."""
    print(f'gen_apply_stethoscope (seed {seed})...')
    moves = ''
    moves += wish('stethoscope')
    # Apply to self (direction = '.')
    moves += 'a' + 'e' + '.'
    # Create a monster and apply to it
    moves += genesis('kobold')
    moves += 'a' + 'e' + 'j'  # apply south (at monster)
    moves += SP * 15
    run(seed, f'theme25_seed{seed}_wiz_apply-stethoscope_gameplay', moves)


def gen_apply_mirror(seed=1321):
    """Apply mirror to nearby monsters."""
    print(f'gen_apply_mirror (seed {seed})...')
    moves = ''
    moves += wish('mirror')
    # Apply mirror at self
    moves += 'a' + 'e' + '.'
    # Create monsters and flash them
    moves += genesis('kobold')
    moves += 'a' + 'e' + 'j'  # mirror south
    moves += SP * 15
    run(seed, f'theme25_seed{seed}_wiz_apply-mirror_gameplay', moves)


def gen_apply_candle(seed=1322):
    """Apply candle (light/unlight)."""
    print(f'gen_apply_candle (seed {seed})...')
    moves = ''
    moves += wish('wax candle')
    # Apply candle to light it
    moves += 'a' + 'e'
    # Wait a bit
    moves += '.' + '.' + '.'
    # Apply to unlight
    moves += 'a' + 'e'
    moves += SP * 15
    run(seed, f'theme25_seed{seed}_wiz_apply-candle_gameplay', moves)


def gen_apply_whistle(seed=1323):
    """Apply magic whistle (calls pets)."""
    print(f'gen_apply_whistle (seed {seed})...')
    moves = ''
    # Create some pets first
    moves += genesis('kitten')
    moves += genesis('pony')
    # Walk away from them
    moves += 'l' + 'l' + 'l' + 'l'
    # Wish for magic whistle
    moves += wish('magic whistle')
    # Apply it (calls pets to you)
    moves += 'a' + 'e'
    moves += SP * 15
    run(seed, f'theme25_seed{seed}_wiz_apply-whistle_gameplay', moves)


# --- Eat ---

def gen_eat_various(seed=1325):
    """Eat various food items."""
    print(f'gen_eat_various (seed {seed})...')
    moves = ''
    # Wish for different foods
    moves += wish('food ration')
    moves += wish('apple')
    moves += wish('egg')
    moves += wish('tripe ration')
    # Eat each one: 'e' = eat, select letter
    moves += 'e' + 'e'  # eat food ration
    moves += 'e' + 'f'  # eat apple
    moves += 'e' + 'g'  # eat egg
    moves += SP * 15
    run(seed, f'theme25_seed{seed}_wiz_eat-various_gameplay', moves)


# --- Engrave ---

def gen_engrave_various(seed=1326):
    """Engrave with finger and tools."""
    print(f'gen_engrave_various (seed {seed})...')
    moves = ''
    # Engrave with finger: E command, '-' for finger, text, return
    moves += 'E' + '-' + 'Elbereth' + ENTER
    # Wait
    moves += '.'
    # Engrave with athame (if wielded)
    moves += wish('athame')
    moves += 'w' + 'e'  # wield it
    moves += 'E' + 'e' + 'Elbereth' + ENTER
    moves += SP * 15
    run(seed, f'theme25_seed{seed}_wiz_engrave-various_gameplay', moves)


# --- Potion quaff ---

def gen_quaff_healing(seed=1327):
    """Quaff healing potions."""
    print(f'gen_quaff_healing (seed {seed})...')
    moves = ''
    moves += wish('potion of healing')
    moves += wish('potion of extra healing')
    moves += wish('potion of full healing')
    # Quaff each
    moves += 'q' + 'e'  # quaff healing
    moves += 'q' + 'f'  # quaff extra healing
    moves += 'q' + 'g'  # quaff full healing
    moves += SP * 15
    run(seed, f'theme25_seed{seed}_wiz_quaff-healing_gameplay', moves)


def gen_quaff_utility(seed=1328):
    """Quaff utility potions."""
    print(f'gen_quaff_utility (seed {seed})...')
    moves = ''
    moves += wish('potion of speed')
    moves += wish('potion of invisibility')
    moves += wish('potion of levitation')
    # Quaff each
    moves += 'q' + 'e'  # quaff speed
    moves += 'q' + 'f'  # quaff invisibility
    moves += 'q' + 'g'  # quaff levitation (requires direction prompt or answer)
    # Levitation: answer 'n' to "Go up?" if prompted
    moves += 'n'
    # Wait for levitation to time out
    moves += '.' * 5
    moves += SP * 15
    run(seed, f'theme25_seed{seed}_wiz_quaff-utility_gameplay', moves)


# --- Dip ---

def gen_dip_potion(seed=1329):
    """Dip items in potions."""
    print(f'gen_dip_potion (seed {seed})...')
    moves = ''
    # Wish for items to dip
    moves += wish('long sword')
    moves += wish('potion of holy water')
    # Dip command: #dip
    moves += extcmd('dip')
    moves += 'e'  # select sword
    moves += 'f'  # dip in potion
    # Wait
    moves += '.' + '.'
    moves += SP * 15
    run(seed, f'theme25_seed{seed}_wiz_dip-potion_gameplay', moves)


# --- Main ---

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    generators = {
        '--apply': [gen_apply_stethoscope, gen_apply_mirror, gen_apply_candle, gen_apply_whistle],
        '--eat': [gen_eat_various],
        '--engrave': [gen_engrave_various],
        '--quaff': [gen_quaff_healing, gen_quaff_utility],
        '--dip': [gen_dip_potion],
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


if __name__ == '__main__':
    main()
