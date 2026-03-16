#!/usr/bin/env python3
"""Generate C sessions for coverage round 5.

Targets SPECIFIC uncovered code paths identified from coverage reports:
- Zap up/down (zap_updown in zap.js)
- Break wand (break_wand in zap.js)
- Wand of drain life (drain_item in zap.js)
- Wand of teleportation, wand of cancellation
- Spell casting (various spells)
- Wand of make invisible, wand of undead turning
- Lock/unlock (wand of opening/locking)
- Wand of probing, wand of slow monster, wand of speed monster

Usage:
    python3 gen_coverage_round5.py --all
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


# --- Zap up/down (zap_updown) ---

def gen_zap_updown(seed=1601):
    """Zap wands up and down — exercises zap_updown() in zap.js."""
    print(f'gen_zap_updown (seed {seed})...')
    moves = ''
    # Wand of striking upward (dislodge rocks)
    moves += wish('wand of striking')
    moves += 'z' + 'e' + '>'  # zap down
    moves += 'z' + 'e' + '<'  # zap up (k for up? No, < and > for up/down)
    # Try wand of opening up/down
    moves += wish('wand of opening')
    moves += 'z' + 'f' + '>'
    moves += 'z' + 'f' + '<'
    # Wand of locking
    moves += wish('wand of locking')
    moves += 'z' + 'g' + '>'
    moves += 'z' + 'g' + '<'
    # Wand of probing at self
    moves += wish('wand of probing')
    moves += 'z' + 'h' + '.'
    moves += SP * 15
    run(seed, f'theme28_seed{seed}_wiz_zap-updown_gameplay', moves)


# --- Wand of teleportation ---

def gen_zap_teleport(seed=1602):
    """Zap wand of teleportation at monsters and self."""
    print(f'gen_zap_teleport (seed {seed})...')
    moves = ''
    moves += genesis('kobold')
    moves += genesis('gnome')
    moves += wish('wand of teleportation')
    # Zap at monsters
    moves += 'z' + 'e' + 'j'
    moves += 'z' + 'e' + 'k'
    # Zap at self
    moves += 'z' + 'e' + '.'
    # Answer teleport prompt
    moves += '.' * 3
    moves += SP * 15
    run(seed, f'theme28_seed{seed}_wiz_zap-teleport_gameplay', moves)


# --- Wand of cancellation ---

def gen_zap_cancellation(seed=1603):
    """Zap wand of cancellation at monsters and items."""
    print(f'gen_zap_cancellation (seed {seed})...')
    moves = ''
    moves += genesis('kobold')
    moves += genesis('gnome')
    moves += wish('wand of cancellation')
    moves += 'z' + 'e' + 'j'
    moves += 'z' + 'e' + 'k'
    # Zap at self (dangerous but wizard mode)
    moves += 'z' + 'e' + '.'
    moves += SP * 15
    run(seed, f'theme28_seed{seed}_wiz_zap-cancellation_gameplay', moves)


# --- Wand of make invisible ---

def gen_zap_invisible(seed=1604):
    """Zap wand of make invisible at monsters and self."""
    print(f'gen_zap_invisible (seed {seed})...')
    moves = ''
    moves += genesis('kobold')
    moves += genesis('gnome')
    moves += wish('wand of make invisible')
    moves += 'z' + 'e' + 'j'
    moves += 'z' + 'e' + 'k'
    moves += 'z' + 'e' + '.'  # make self invisible
    moves += '.' * 5
    moves += SP * 15
    run(seed, f'theme28_seed{seed}_wiz_zap-invisible_gameplay', moves)


# --- Wand of slow/speed monster ---

def gen_zap_slow_speed(seed=1605):
    """Zap wand of slow monster and speed monster."""
    print(f'gen_zap_slow_speed (seed {seed})...')
    moves = ''
    moves += genesis('kobold')
    moves += genesis('gnome')
    # Slow monster
    moves += wish('wand of slow monster')
    moves += 'z' + 'e' + 'j'
    moves += 'z' + 'e' + 'k'
    moves += 'z' + 'e' + '.'  # slow self
    # Speed monster
    moves += wish('wand of speed monster')
    moves += 'z' + 'f' + 'j'
    moves += 'z' + 'f' + '.'  # speed self
    moves += '.' * 3
    moves += SP * 15
    run(seed, f'theme28_seed{seed}_wiz_zap-slow-speed_gameplay', moves)


# --- Wand of undead turning ---

def gen_zap_undead_turning(seed=1606):
    """Zap wand of undead turning at undead monsters."""
    print(f'gen_zap_undead_turning (seed {seed})...')
    moves = ''
    moves += genesis('zombie')
    moves += genesis('skeleton')
    moves += genesis('mummy')
    moves += wish('wand of undead turning')
    moves += 'z' + 'e' + 'j'
    moves += 'z' + 'e' + 'k'
    moves += 'z' + 'e' + 'l'
    moves += '.' * 3
    moves += SP * 15
    run(seed, f'theme28_seed{seed}_wiz_zap-undead-turning_gameplay', moves)


# --- Wand of drain life ---

def gen_zap_drain_life(seed=1607):
    """Zap wand of drain life at monsters — exercises drain_item."""
    print(f'gen_zap_drain_life (seed {seed})...')
    moves = ''
    moves += genesis('kobold')
    moves += genesis('gnome')
    moves += genesis('orc')
    moves += wish('wand of drain life')
    moves += 'z' + 'e' + 'j'
    moves += 'z' + 'e' + 'k'
    moves += 'z' + 'e' + 'l'
    # Zap at self (drains XP)
    moves += 'z' + 'e' + '.'
    moves += SP * 15
    run(seed, f'theme28_seed{seed}_wiz_zap-drain-life_gameplay', moves)


# --- Wand of light ---

def gen_zap_light(seed=1608):
    """Zap wand of light — litroom effects."""
    print(f'gen_zap_light (seed {seed})...')
    moves = ''
    moves += wish('wand of light')
    # Zap in a direction (creates light)
    moves += 'z' + 'e' + 'j'
    moves += 'z' + 'e' + 'l'
    # Zap at self (lights area)
    moves += 'z' + 'e' + '.'
    moves += '.' * 3
    moves += SP * 15
    run(seed, f'theme28_seed{seed}_wiz_zap-light_gameplay', moves)


# --- Lock/unlock with wands ---

def gen_lock_unlock(seed=1610):
    """Use wand of opening and locking on doors."""
    print(f'gen_lock_unlock (seed {seed})...')
    moves = ''
    moves += wish('wand of opening')
    moves += wish('wand of locking')
    # Walk to find a door
    for _ in range(8):
        moves += 'l'
    # Zap opening at door direction
    moves += 'z' + 'e' + 'l'
    moves += 'z' + 'e' + 'h'
    # Zap locking
    moves += 'z' + 'f' + 'l'
    moves += 'z' + 'f' + 'h'
    # Walk more
    for _ in range(5):
        moves += 'j'
    moves += 'z' + 'e' + 'j'
    moves += 'z' + 'f' + 'j'
    moves += SP * 15
    run(seed, f'theme28_seed{seed}_wiz_lock-unlock_gameplay', moves)


# --- Spell casting ---

def gen_cast_spells(seed=1620):
    """Cast spells from spellbook — wizard starts with spellbooks."""
    print(f'gen_cast_spells (seed {seed})...')
    moves = ''
    # Wizard has spellbooks in starting inventory
    # Cast force bolt (attack spell wizards know)
    moves += genesis('kobold')
    moves += 'Z' + 'a'  # cast spell 'a' (force bolt typically)
    moves += 'j'        # direction
    # Cast again
    moves += genesis('gnome')
    moves += 'Z' + 'a' + 'k'
    # Cast healing
    moves += 'Z' + 'b' + '.'  # heal self
    # Wait
    moves += '.' * 3
    # Cast more
    moves += 'Z' + 'a' + 'l'
    moves += SP * 15
    run(seed, f'theme28_seed{seed}_wiz_cast-spells_gameplay', moves)


# --- Wand of create monster ---

def gen_zap_create_monster(seed=1621):
    """Zap wand of create monster — creates monsters adjacent."""
    print(f'gen_zap_create_monster (seed {seed})...')
    moves = ''
    moves += wish('wand of create monster')
    moves += 'z' + 'e' + '.'  # create monster
    moves += '.' * 3  # wait
    moves += 'z' + 'e' + '.'  # create more
    moves += '.' * 3
    moves += 'z' + 'e' + '.'
    moves += '.' * 3
    moves += SP * 15
    run(seed, f'theme28_seed{seed}_wiz_zap-create-monster_gameplay', moves)


# --- Wand of nothing/wishing ---

def gen_zap_nothing(seed=1622):
    """Zap wand of nothing — minimal effect but exercises zap path."""
    print(f'gen_zap_nothing (seed {seed})...')
    moves = ''
    moves += wish('wand of nothing')
    moves += 'z' + 'e' + 'j'
    moves += 'z' + 'e' + 'k'
    moves += 'z' + 'e' + '.'
    # Also try stone to flesh wand
    moves += wish('wand of stone to flesh')
    moves += 'z' + 'f' + 'j'
    moves += 'z' + 'f' + '.'
    moves += SP * 15
    run(seed, f'theme28_seed{seed}_wiz_zap-nothing_gameplay', moves)


# --- Main ---

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    generators = {
        '--zap-special': [gen_zap_updown, gen_zap_teleport, gen_zap_cancellation,
                          gen_zap_invisible, gen_zap_slow_speed, gen_zap_undead_turning,
                          gen_zap_drain_life, gen_zap_light],
        '--lock': [gen_lock_unlock],
        '--spell': [gen_cast_spells],
        '--create': [gen_zap_create_monster, gen_zap_nothing],
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
