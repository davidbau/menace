#!/usr/bin/env python3
"""Generate C sessions for miscellaneous low-coverage files.

Targets: explode.js, music.js, dokick.js, sit.js, ball.js

Usage:
    python3 gen_misc_coverage.py --all
    python3 gen_misc_coverage.py --explode --kick --sit --music
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


def gen_explode_fire(seed=1310):
    """Explosion from scroll of fire — tests explode() with fire type."""
    print(f'gen_explode_fire (seed {seed})...')
    moves = ''
    # Create some monsters near player for explosion to hit
    moves += genesis('kobold')
    moves += genesis('newt')
    moves += genesis('gecko')
    # Wish for fire resistance so we survive
    moves += wish('ring of fire resistance')
    moves += 'P' + 'e'  # put on ring
    # Read scroll of fire (triggers explode)
    moves += wish('scroll of fire')
    moves += 'r' + 'f'
    # Create more monsters and do it again
    moves += genesis('kobold')
    moves += genesis('newt')
    moves += wish('scroll of fire')
    moves += 'r' + 'e'
    moves += SP * 20
    run(seed, f'theme24_seed{seed}_wiz_explode-fire_gameplay', moves)


def gen_explode_cold(seed=1311):
    """Cold explosion from wand — tests explode() with cold type."""
    print(f'gen_explode_cold (seed {seed})...')
    moves = ''
    # Create monster targets
    moves += genesis('kobold')
    moves += genesis('newt')
    # Wish for cold resistance
    moves += wish('ring of cold resistance')
    moves += 'P' + 'e'
    # Wish for wand of cold and zap at nearby monsters
    moves += wish('wand of cold')
    moves += 'z' + 'f' + 'j'  # zap south
    moves += 'z' + 'f' + 'k'  # zap north
    moves += 'z' + 'f' + 'l'  # zap east
    moves += SP * 20
    run(seed, f'theme24_seed{seed}_wiz_explode-cold_gameplay', moves)


def gen_kick(seed=1312):
    """Kick various things — tests dokick.js."""
    print(f'gen_kick (seed {seed})...')
    moves = ''
    # Kick south (into air or monster)
    moves += CTRL_I  # identify all
    # Kick in a direction
    moves += extcmd('kick') + 'j'   # kick south
    moves += extcmd('kick') + 'k'   # kick north
    moves += extcmd('kick') + 'l'   # kick east
    # Walk to door and kick it
    for _ in range(5):
        moves += 'l'
    moves += extcmd('kick') + 'l'   # kick east (hopefully door)
    # Walk to wall and kick it
    for _ in range(3):
        moves += 'l'
    moves += extcmd('kick') + 'l'   # kick wall
    # Create a monster and kick it
    moves += genesis('kobold')
    moves += extcmd('kick') + 'j'   # kick monster
    moves += SP * 20
    run(seed, f'theme24_seed{seed}_wiz_kick_gameplay', moves)


def gen_sit(seed=1313):
    """Sit on the floor and on a throne — tests sit.js."""
    print(f'gen_sit (seed {seed})...')
    moves = ''
    # Sit on floor
    moves += extcmd('sit')
    # Walk around
    moves += 'l' + 'l' + 'l'
    # Sit again
    moves += extcmd('sit')
    # Wait
    moves += '.' + '.' + '.'
    moves += SP * 20
    run(seed, f'theme24_seed{seed}_wiz_sit_gameplay', moves)


def gen_music_tooled_horn(seed=1314):
    """Play a tooled horn — tests music.js."""
    print(f'gen_music_tooled_horn (seed {seed})...')
    moves = ''
    # Wish for tooled horn and play it
    moves += wish('tooled horn')
    moves += 'a' + 'e'  # apply tooled horn
    # Need to play notes or a direction
    # Tooled horn just plays when applied
    # Also try a magic harp
    moves += wish('magic harp')
    moves += 'a' + 'f'  # apply magic harp
    # Try a bugle
    moves += wish('bugle')
    moves += 'a' + 'g'  # apply bugle
    # Try a drum of earthquake
    moves += wish('drum of earthquake')
    moves += 'a' + 'h'  # apply drum
    moves += SP * 20
    run(seed, f'theme24_seed{seed}_wiz_music_gameplay', moves)


def gen_ball_chain(seed=1315):
    """Ball & chain manipulation — tests ball.js."""
    print(f'gen_ball_chain (seed {seed})...')
    moves = ''
    # Get punished first
    moves += wish('scroll of punishment')
    moves += 'r' + 'e'
    # Walk around with ball (dragging)
    moves += 'l' + 'l' + 'l' + 'j' + 'j' + 'j'
    # Try to pick up the ball
    moves += ','  # pickup
    # Walk more
    moves += 'h' + 'h' + 'h' + 'k' + 'k' + 'k'
    # Try going upstairs/downstairs movements
    moves += 'l' + 'j' + 'h' + 'k'
    # Remove punishment
    moves += wish('blessed scroll of remove curse')
    moves += 'r' + 'e'
    moves += SP * 20
    run(seed, f'theme24_seed{seed}_wiz_ball-chain_gameplay', moves)


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    generators = {
        '--explode': [gen_explode_fire, gen_explode_cold],
        '--kick': [gen_kick],
        '--sit': [gen_sit],
        '--music': [gen_music_tooled_horn],
        '--ball': [gen_ball_chain],
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
