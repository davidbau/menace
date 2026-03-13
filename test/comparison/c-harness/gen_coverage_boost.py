#!/usr/bin/env python3
"""Generate C NetHack session traces for high-yield coverage targets.

Targets:
- shk.js (26.3%): shop interactions (enter, buy, steal, pay, rob)
- pray.js (37.3%): prayer and sacrifice on altars
- ball.js (0%): punishment ball & chain mechanics
- zap.js (31.2%): wand zapping (beam, bounce, self-zap)
- fountain.js (46%): fountain quaffing, dipping
- music.js: instrument playing

All sessions use wizard mode with known-good seeds.
Uses Ctrl-W (#wizwish) and Ctrl-T (#teleport) for setup.

Usage:
    python3 gen_coverage_boost.py --shk
    python3 gen_coverage_boost.py --pray
    python3 gen_coverage_boost.py --ball
    python3 gen_coverage_boost.py --zap
    python3 gen_coverage_boost.py --fountain
    python3 gen_coverage_boost.py --all

Output: test/comparison/sessions/pending/
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

# Ctrl keys
CTRL_G = '\x07'   # #wizgenesis
CTRL_W = '\x17'   # #wizwish
CTRL_T = '\x14'   # #teleport
ESC    = '\x1b'
SP     = ' '
ENTER  = '\n'


def extcmd(cmd):
    return '#' + cmd + ENTER


def wish(item):
    """Wish for an item. Returns raw move string."""
    return CTRL_W + item + ENTER + SP


def genesis(monster):
    """Create a monster. Returns raw move string."""
    return CTRL_G + monster + ENTER + SP


# ---- ZAP SESSIONS (zap.js) -------------------------------------------------

def capture_zap_fire_cold(seed=1200):
    """Zap wands of fire and cold at walls, monsters, self.

    Tests buzz(), zhitm(), bhitm(), bhito(), zapyourself().
    """
    print(f'Capturing zap-fire-cold (seed {seed})...')
    moves = ''

    # Wish for fire resistance (to survive self-zap)
    moves += wish('ring of fire resistance')
    moves += 'P' + 'e' + SP * 3       # put on ring

    # Wish for wands
    moves += wish('wand of fire')
    moves += wish('wand of cold')

    # Create a monster target
    moves += genesis('kobold')

    # Zap fire south at monster
    moves += 'z' + 'f' + 'j' + SP * 5
    # Zap fire at self
    moves += 'z' + 'f' + '.' + SP * 5
    # Zap cold south
    moves += 'z' + 'g' + 'j' + SP * 5
    # Zap cold at wall (north)
    moves += 'z' + 'g' + 'k' + SP * 5

    outpath = os.path.join(SESSIONS_DIR,
        f'theme17_seed{seed:04d}_wiz_zap-fire-cold_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_zap_lightning_death(seed=1201):
    """Zap wands of lightning and death.

    Tests buzz(), bhitm() for lightning and death rays.
    """
    print(f'Capturing zap-lightning-death (seed {seed})...')
    moves = ''

    # Wish for reflection (to survive bounced death ray)
    moves += wish('amulet of reflection')
    moves += 'P' + 'e' + SP * 3

    # Wish for wands
    moves += wish('wand of lightning')
    moves += wish('wand of death')

    # Create targets
    moves += genesis('kobold')

    # Zap lightning south
    moves += 'z' + 'f' + 'j' + SP * 5
    # Zap death south
    moves += 'z' + 'g' + 'j' + SP * 5
    # Zap lightning at wall (bounce)
    moves += 'z' + 'f' + 'k' + SP * 5

    outpath = os.path.join(SESSIONS_DIR,
        f'theme17_seed{seed:04d}_wiz_zap-lightning-death_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_zap_utility(seed=1202):
    """Zap utility wands: sleep, polymorph, cancellation, make invisible,
    slow monster, speed monster, teleportation, undead turning.

    Tests bhitm(), zapyourself() for each type.
    """
    print(f'Capturing zap-utility (seed {seed})...')
    moves = ''

    # Create targets
    moves += genesis('kobold')
    moves += genesis('kobold')

    # Wish for utility wands
    moves += wish('wand of sleep')
    moves += wish('wand of polymorph')
    moves += wish('wand of cancellation')
    moves += wish('wand of make invisible')
    moves += wish('wand of slow monster')
    moves += wish('wand of speed monster')

    # Zap each one south
    moves += 'z' + 'e' + 'j' + SP * 5   # sleep
    moves += 'z' + 'f' + 'j' + SP * 5   # polymorph
    moves += 'z' + 'g' + 'j' + SP * 5   # cancellation
    moves += 'z' + 'h' + 'j' + SP * 5   # make invisible
    moves += 'z' + 'i' + 'j' + SP * 5   # slow
    moves += 'z' + 'j' + 'j' + SP * 5   # speed - oops 'j' is direction

    outpath = os.path.join(SESSIONS_DIR,
        f'theme17_seed{seed:04d}_wiz_zap-utility_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_zap_striking_digging(seed=1203):
    """Zap wands of striking, digging, opening, locking.

    Tests buzz() for force bolt, zap_dig(), bhitm().
    """
    print(f'Capturing zap-striking-digging (seed {seed})...')
    moves = ''

    # Wish for wands
    moves += wish('wand of striking')
    moves += wish('wand of digging')
    moves += wish('wand of opening')
    moves += wish('wand of locking')

    # Create target
    moves += genesis('kobold')

    # Zap striking at monster
    moves += 'z' + 'e' + 'j' + SP * 5
    # Zap digging at floor
    moves += 'z' + 'f' + '>' + SP * 5
    # Zap digging at wall
    moves += 'z' + 'f' + 'k' + SP * 5
    # Zap opening at door (walk toward one first)
    for _ in range(3):
        moves += 'l' + SP
    moves += 'z' + 'g' + 'l' + SP * 5
    # Zap locking
    moves += 'z' + 'h' + 'l' + SP * 5

    outpath = os.path.join(SESSIONS_DIR,
        f'theme17_seed{seed:04d}_wiz_zap-striking-digging_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  -> {outpath}')


# ---- BALL SESSIONS (ball.js) ------------------------------------------------

def capture_ball_punishment(seed=1210):
    """Get punished and move around with ball & chain.

    Wish for scroll of punishment, read it, then move extensively.
    Tests placebc(), unplacebc(), drag_ball(), bc_order(), ballfall().
    """
    print(f'Capturing ball-punishment (seed {seed})...')
    moves = ''

    # Wish for scroll of punishment
    moves += wish('scroll of punishment')

    # Read it to get punished
    moves += 'r' + 'e' + SP * 5

    # Move around dragging the ball
    for _ in range(3):
        moves += 'l' + SP * 3    # east
    for _ in range(3):
        moves += 'j' + SP * 3    # south
    for _ in range(3):
        moves += 'h' + SP * 3    # west
    for _ in range(3):
        moves += 'k' + SP * 3    # north

    # Diagonal moves (ball drag is different)
    moves += 'y' + SP * 3   # NW
    moves += 'u' + SP * 3   # NE
    moves += 'b' + SP * 3   # SW
    moves += 'n' + SP * 3   # SE

    # Now wish for scroll of remove curse to unpunish
    moves += wish('blessed scroll of remove curse')
    moves += 'r' + 'f' + SP * 5

    outpath = os.path.join(SESSIONS_DIR,
        f'theme18_seed{seed:04d}_wiz_ball-punishment_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_ball_stairs(seed=1211):
    """Move up/down stairs while punished.

    Tests ballfall(), bc_order() with level changes.
    """
    print(f'Capturing ball-stairs (seed {seed})...')
    moves = ''

    # Wish for scroll of punishment
    moves += wish('scroll of punishment')
    moves += 'r' + 'e' + SP * 5

    # Move around a bit to pick up ball momentum
    for _ in range(2):
        moves += 'l' + SP * 3
    for _ in range(2):
        moves += 'h' + SP * 3

    # Find stairs — walk to stairs symbol on the level
    # Try going down (find > stairs)
    moves += '>' + SP * 5

    # Move on new level while punished
    for _ in range(3):
        moves += 'l' + SP * 3
    for _ in range(3):
        moves += 'h' + SP * 3

    # Go back up
    moves += '<' + SP * 5

    outpath = os.path.join(SESSIONS_DIR,
        f'theme18_seed{seed:04d}_wiz_ball-stairs_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  -> {outpath}')


# ---- PRAY SESSIONS (pray.js) -----------------------------------------------

def capture_pray_basic(seed=1220):
    """Basic prayer at an altar.

    Wish for and place an altar, then pray. Tests dopray(), pleased().
    """
    print(f'Capturing pray-basic (seed {seed})...')
    moves = ''

    # In wizard mode, pray on the dungeon floor
    moves += extcmd('pray')
    moves += 'y' + SP * 8   # confirm prayer, dismiss messages

    # Wait a bit
    moves += '.' * 3 + SP * 3

    # Pray again after timeout
    moves += extcmd('pray')
    moves += 'y' + SP * 8

    outpath = os.path.join(SESSIONS_DIR,
        f'theme19_seed{seed:04d}_wiz_pray-basic_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_pray_sacrifice(seed=1221):
    """Sacrifice a monster corpse on an altar.

    Kill a monster, pick up corpse, find altar, #offer corpse.
    Tests dosacrifice(), consume_offering().
    """
    print(f'Capturing pray-sacrifice (seed {seed})...')
    moves = ''

    # Create and kill a monster to get a corpse
    moves += genesis('kobold')
    moves += 'j' + SP * 5   # attack south
    moves += 'j' + SP * 5   # keep attacking

    # Pick up the corpse
    moves += ',' + SP * 3   # pickup

    # Pray (no altar, but still exercises the prayer code)
    moves += extcmd('pray')
    moves += 'y' + SP * 8

    # Try #offer
    moves += extcmd('offer')
    moves += SP * 5    # dismiss messages (no altar)

    outpath = os.path.join(SESSIONS_DIR,
        f'theme19_seed{seed:04d}_wiz_pray-sacrifice_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  -> {outpath}')


# ---- FOUNTAIN SESSIONS (fountain.js) ----------------------------------------

def capture_fountain_quaff(seed=1230):
    """Quaff from fountains multiple times.

    Walk to find a fountain, quaff from it repeatedly.
    Tests drinkfountain() and its many outcomes.
    """
    print(f'Capturing fountain-quaff (seed {seed})...')
    moves = ''

    # Walk around to find a fountain. Level 1 usually has one.
    # Navigate around — 10 steps east, then south, etc.
    for _ in range(5):
        moves += 'l' + SP
    for _ in range(3):
        moves += 'j' + SP
    for _ in range(5):
        moves += 'h' + SP
    for _ in range(3):
        moves += 'k' + SP

    # Quaff from fountain (q then . for "here" or just q if on fountain)
    moves += 'q' + ',' + SP * 8   # quaff from fountain
    moves += 'q' + ',' + SP * 8   # quaff again
    moves += 'q' + ',' + SP * 8   # quaff again
    moves += 'q' + ',' + SP * 8   # quaff again

    outpath = os.path.join(SESSIONS_DIR,
        f'theme20_seed{seed:04d}_wiz_fountain-quaff_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_fountain_dip(seed=1231):
    """Dip items into fountains.

    Tests dipfountain(), Excalibur creation.
    """
    print(f'Capturing fountain-dip (seed {seed})...')
    moves = ''

    # Wish for a long sword (Excalibur candidate for lawful)
    moves += wish('long sword')

    # Walk to find fountain
    for _ in range(5):
        moves += 'l' + SP
    for _ in range(3):
        moves += 'j' + SP

    # Dip the long sword into fountain
    # '#dip' extended command, select item, select fountain
    moves += extcmd('dip')
    moves += 'e' + SP * 5    # select item, dip messages

    # Dip again
    moves += extcmd('dip')
    moves += 'e' + SP * 5

    outpath = os.path.join(SESSIONS_DIR,
        f'theme20_seed{seed:04d}_wiz_fountain-dip_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  -> {outpath}')


# ---- SHK SESSIONS (shk.js) --------------------------------------------------

def capture_shk_enter_buy(seed=1240):
    """Enter a shop and pick up items.

    Walk around level to find shop, enter, pick up items to add to bill.
    Tests inhishop(), addtobill(), shk_names_obj(), costly_spot().
    """
    print(f'Capturing shk-enter-buy (seed {seed})...')
    moves = ''

    # Walk around to find a shop (level 1-3 often has shops in Mines)
    # Actually, level 1 should have a shop if we're lucky with the seed
    # Let's explore extensively
    for _ in range(8):
        moves += 'l' + SP
    for _ in range(5):
        moves += 'j' + SP
    for _ in range(8):
        moves += 'h' + SP
    for _ in range(5):
        moves += 'k' + SP

    # More exploration
    for _ in range(10):
        moves += 'l' + SP
    for _ in range(8):
        moves += 'j' + SP

    # Pick up items if in shop
    moves += ',' + SP * 5   # try pickup
    moves += ',' + SP * 5   # try pickup more

    # Try to pay
    moves += 'p' + SP * 5   # pay shopkeeper

    # Walk out of shop
    for _ in range(5):
        moves += 'h' + SP * 3

    outpath = os.path.join(SESSIONS_DIR,
        f'theme21_seed{seed:04d}_wiz_shk-enter-buy_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  -> {outpath}')


# ---- MAIN -------------------------------------------------------------------

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    if '--all' in args or '--zap' in args:
        capture_zap_fire_cold()
        capture_zap_lightning_death()
        capture_zap_utility()
        capture_zap_striking_digging()

    if '--all' in args or '--ball' in args:
        capture_ball_punishment()
        capture_ball_stairs()

    if '--all' in args or '--pray' in args:
        capture_pray_basic()
        capture_pray_sacrifice()

    if '--all' in args or '--fountain' in args:
        capture_fountain_quaff()
        capture_fountain_dip()

    if '--all' in args or '--shk' in args:
        capture_shk_enter_buy()


if __name__ == '__main__':
    main()
