#!/usr/bin/env python3
"""Generate C NetHack session traces for coverage campaign.

Creates targeted sessions exercising low-coverage files:
- potion.js (19% → target 40%+): quaff various potions
- zap.js (21% → target 40%+): zap various wands
- pray.js (22% → target 40%+): prayer and sacrifice
- sit.js (9% → target 30%+): sitting on various terrain

All sessions use wizard mode on level 1 to stay simple and fast.
Uses Ctrl-W (#wizwish) to create needed items.
Uses Ctrl-G (#wizgenesis) to create needed monsters.

Usage:
    python3 gen_coverage_sessions.py --quaff
    python3 gen_coverage_sessions.py --zap
    python3 gen_coverage_sessions.py --pray
    python3 gen_coverage_sessions.py --sit
    python3 gen_coverage_sessions.py --all

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

CHARACTER_VALK = {
    'name': 'Wizard',
    'role': 'Valkyrie',
    'race': 'human',
    'gender': 'female',
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


# ─── POTION SESSIONS ───────────────────────────────────────────────

def capture_quaff_healing(seed=620):
    """Quaff healing potions: healing, extra healing, full healing.
    Test blessed/cursed variants.

    Targets: peffect_healing(), peffect_extra_healing(), peffect_full_healing(),
    healup(), handleQuaff()
    """
    print(f'Capturing quaff-healing (seed {seed})...')
    moves = ''
    # Wish for potions
    moves += wish('blessed potion of healing')
    moves += wish('cursed potion of healing')
    moves += wish('potion of extra healing')
    moves += wish('blessed potion of full healing')

    # Quaff them: q + inventory letter + confirm if needed
    # After wizard starting inventory, wished items start around slot 'e'
    moves += 'q' + 'e' + SP * 3   # quaff blessed healing
    moves += 'q' + 'f' + SP * 3   # quaff cursed healing
    moves += 'q' + 'g' + SP * 3   # quaff extra healing
    moves += 'q' + 'h' + SP * 3   # quaff full healing

    outpath = os.path.join(SESSIONS_DIR,
        f'theme06_seed{seed:03d}_wiz_quaff-healing_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  → {outpath}')


def capture_quaff_status(seed=621):
    """Quaff status-effect potions: speed, confusion, blindness,
    hallucination, sleeping, paralysis.

    Targets: peffect_speed(), peffect_confusion(), peffect_blindness(),
    peffect_hallucination(), peffect_sleeping(), peffect_paralysis(),
    make_confused(), make_stunned(), make_blinded(), make_hallucinated()
    """
    print(f'Capturing quaff-status (seed {seed})...')
    moves = ''
    moves += wish('potion of speed')
    moves += wish('potion of confusion')
    moves += wish('potion of blindness')
    moves += wish('potion of hallucination')
    moves += wish('potion of sleeping')
    # Skip paralysis — it immobilizes and complicates the session

    # Quaff each
    moves += 'q' + 'e' + SP * 3   # speed
    moves += '.' * 3               # wait for effects to show
    moves += 'q' + 'f' + SP * 3   # confusion
    moves += '.' * 3
    moves += 'q' + 'g' + SP * 3   # blindness
    moves += '.' * 3
    moves += 'q' + 'h' + SP * 3   # hallucination
    moves += '.' * 3
    moves += 'q' + 'i' + SP * 3   # sleeping
    moves += SP * 5                # extra spaces to dismiss --More-- from waking up

    outpath = os.path.join(SESSIONS_DIR,
        f'theme06_seed{seed:03d}_wiz_quaff-status_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  → {outpath}')


def capture_quaff_ability(seed=622):
    """Quaff ability potions: gain ability, restore ability, gain level,
    gain energy, sickness, acid.

    Targets: peffect_gain_ability(), peffect_restore_ability(),
    peffect_gain_level(), peffect_gain_energy(), peffect_sickness(),
    peffect_acid()
    """
    print(f'Capturing quaff-ability (seed {seed})...')
    moves = ''
    moves += wish('potion of gain ability')
    moves += wish('blessed potion of restore ability')
    moves += wish('potion of gain level')
    moves += wish('potion of gain energy')
    moves += wish('potion of sickness')
    moves += wish('potion of acid')

    # Quaff each
    moves += 'q' + 'e' + SP * 3   # gain ability
    moves += 'q' + 'f' + SP * 3   # restore ability
    moves += 'q' + 'g' + SP * 3   # gain level
    moves += 'q' + 'h' + SP * 3   # gain energy
    moves += 'q' + 'i' + SP * 3   # sickness (dangerous but wizard mode)
    moves += 'q' + 'j' + SP * 3   # acid

    outpath = os.path.join(SESSIONS_DIR,
        f'theme06_seed{seed:03d}_wiz_quaff-ability_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  → {outpath}')


def capture_quaff_misc(seed=623):
    """Quaff miscellaneous potions: invisibility, see invisible,
    levitation, polymorph, enlightenment, booze, oil, water, monster detection,
    object detection.

    Targets: peffect_invisibility(), peffect_see_invisible(),
    peffect_levitation(), peffect_polymorph(), peffect_enlightenment(),
    peffect_booze(), peffect_oil(), peffect_water(),
    peffect_monster_detection(), peffect_object_detection()
    """
    print(f'Capturing quaff-misc (seed {seed})...')
    moves = ''
    moves += wish('potion of invisibility')
    moves += wish('potion of see invisible')
    moves += wish('potion of levitation')
    moves += wish('potion of monster detection')
    moves += wish('potion of object detection')
    moves += wish('potion of booze')
    moves += wish('potion of enlightenment')
    moves += wish('potion of water')

    # Quaff each
    moves += 'q' + 'e' + SP * 3   # invisibility
    moves += 'q' + 'f' + SP * 3   # see invisible
    moves += 'q' + 'g' + SP * 3   # levitation
    moves += SP * 5                # extra spaces for levitation messages
    moves += '.' * 5               # wait for levitation to wear off or not
    moves += SP * 5
    moves += 'q' + 'h' + SP * 5   # monster detection (may show map)
    moves += 'q' + 'i' + SP * 5   # object detection
    moves += 'q' + 'j' + SP * 3   # booze
    moves += 'q' + 'k' + SP * 5   # enlightenment (shows long list)
    moves += 'q' + 'l' + SP * 3   # water

    outpath = os.path.join(SESSIONS_DIR,
        f'theme06_seed{seed:03d}_wiz_quaff-misc_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  → {outpath}')


# ─── ZAP SESSIONS ──────────────────────────────────────────────────

def capture_zap_rays(seed=630):
    """Zap ray wands at genesis'd monsters on level 1.

    Targets: handleZap(), dobuzz(), zhitm(), burnarmor(),
    destroy_item(), backfire()
    """
    print(f'Capturing zap-rays (seed {seed})...')
    moves = ''

    # Wish for wands
    moves += wish('wand of fire')
    moves += wish('wand of cold')
    moves += wish('wand of lightning')
    moves += wish('wand of magic missile')
    moves += wish('wand of sleep')
    moves += wish('wand of death')

    # Genesis monsters south of us
    moves += genesis('kobold')
    moves += genesis('orc')

    # Move north to create distance, then zap south
    moves += 'k' + SP  # move north
    moves += 'k' + SP  # move north again

    # Zap each wand southward
    # Wished wands should be in slots after starting inventory
    moves += 'z' + 'e' + 'j' + SP * 3   # fire south
    moves += 'z' + 'f' + 'j' + SP * 3   # cold south
    moves += 'z' + 'g' + 'j' + SP * 3   # lightning south
    moves += 'z' + 'h' + 'j' + SP * 3   # magic missile south
    moves += 'z' + 'i' + 'j' + SP * 3   # sleep south
    moves += 'z' + 'j' + 'j' + SP * 3   # death south

    # Also test zapping at self
    moves += wish('wand of polymorph')
    moves += 'z' + 'k' + '.' + SP * 3   # polymorph self
    # Answer polymorph prompt if any
    moves += SP * 5

    outpath = os.path.join(SESSIONS_DIR,
        f'theme06_seed{seed:03d}_wiz_zap-rays_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  → {outpath}')


def capture_zap_utility(seed=631):
    """Zap utility wands: opening, locking, probing, make invisible,
    slow monster, speed monster, undead turning, light, create monster,
    cancellation, teleportation, striking, digging.

    Targets: zapnodir(), bhitm(), bhit_zapped_wand(), probe_monster(),
    cancel_monst(), zap_updown()
    """
    print(f'Capturing zap-utility (seed {seed})...')
    moves = ''

    # NODIR wands
    moves += wish('wand of light')
    moves += wish('wand of create monster')
    moves += wish('wand of secret door detection')
    moves += wish('wand of enlightenment')

    # IMMEDIATE wands
    moves += wish('wand of probing')
    moves += wish('wand of make invisible')
    moves += wish('wand of slow monster')
    moves += wish('wand of speed monster')
    moves += wish('wand of striking')
    moves += wish('wand of opening')
    moves += wish('wand of digging')

    # Genesis a target for immediate wands
    moves += genesis('zombie')

    # Zap NODIR wands (no direction prompt)
    moves += 'z' + 'e' + SP * 3          # light
    moves += 'z' + 'f' + SP * 3          # create monster
    moves += 'z' + 'g' + SP * 3          # secret door detection
    moves += 'z' + 'h' + SP * 3          # enlightenment

    # Zap IMMEDIATE/RAY wands at monster (south)
    moves += 'z' + 'i' + 'j' + SP * 3   # probing
    moves += 'z' + 'j' + 'j' + SP * 3   # make invisible
    moves += 'z' + 'k' + 'j' + SP * 3   # slow monster
    moves += 'z' + 'l' + 'j' + SP * 3   # speed monster
    moves += 'z' + 'm' + 'j' + SP * 3   # striking
    moves += 'z' + 'n' + 'j' + SP * 3   # opening
    moves += 'z' + 'o' + 'j' + SP * 3   # digging down

    outpath = os.path.join(SESSIONS_DIR,
        f'theme06_seed{seed:03d}_wiz_zap-utility_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  → {outpath}')


# ─── PRAYER SESSIONS ───────────────────────────────────────────────

def capture_pray_basic(seed=640):
    """Basic prayer on level 1.

    Targets: dopray(), prayer_done(), can_pray(), in_trouble(),
    pleased(), fix_worst_trouble()
    """
    print(f'Capturing pray-basic (seed {seed})...')
    moves = ''

    # Wait a few turns to accumulate some game state
    moves += '.' * 3

    # Pray
    moves += extcmd('pray')
    moves += 'y'  # "Are you sure you want to pray?" → yes
    moves += SP * 10  # dismiss prayer result messages

    # Wait and pray again
    moves += '.' * 5
    moves += extcmd('pray')
    moves += 'y'
    moves += SP * 10

    outpath = os.path.join(SESSIONS_DIR,
        f'theme07_seed{seed:03d}_wiz_pray-basic_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  → {outpath}')


def capture_pray_trouble(seed=641):
    """Prayer while in trouble (low HP).

    Wishes for a monster to fight, takes damage, then prays.

    Targets: in_trouble(), critically_low_hp(), fix_worst_trouble(),
    fix_curse_trouble()
    """
    print(f'Capturing pray-trouble (seed {seed})...')
    moves = ''

    # Genesis a hostile monster to take damage from
    moves += genesis('hill giant')

    # Wait for it to hit us
    moves += '.' * 8
    moves += SP * 10  # dismiss combat messages

    # Now pray while hopefully damaged
    moves += extcmd('pray')
    moves += 'y'
    moves += SP * 10

    outpath = os.path.join(SESSIONS_DIR,
        f'theme07_seed{seed:03d}_wiz_pray-trouble_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  → {outpath}')


def capture_turn_undead(seed=642):
    """Turn undead command with undead monsters.

    Targets: doturn()
    """
    print(f'Capturing turn-undead (seed {seed})...')
    moves = ''

    # Genesis undead monsters
    moves += genesis('zombie')
    moves += genesis('skeleton')
    moves += genesis('ghoul')

    # Turn undead
    moves += extcmd('turn')
    moves += SP * 5

    # Try again
    moves += extcmd('turn')
    moves += SP * 5

    outpath = os.path.join(SESSIONS_DIR,
        f'theme07_seed{seed:03d}_wiz_turn-undead_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  → {outpath}')


# ─── SIT SESSIONS ──────────────────────────────────────────────────

def capture_sit_various(seed=650):
    """Sit on floor, sit while levitating, sit near features.

    Stays on level 1 — no level changes.

    Targets: dosit() floor/levitation/object branches
    """
    print(f'Capturing sit-various (seed {seed})...')
    moves = ''

    # Sit on floor
    moves += extcmd('sit')
    moves += SP * 3

    # Wish for levitation boots to test levitating-sit branch
    moves += wish('levitation boots')
    moves += 'W' + 'e' + SP * 3   # wear levitation boots (slot e hopefully)

    # Try to sit while levitating
    moves += extcmd('sit')
    moves += SP * 3

    # Remove boots
    moves += 'T' + 'e' + SP * 3

    # Walk around and sit in different spots
    for d in 'hhhjjj':
        moves += d + SP
    moves += extcmd('sit')
    moves += SP * 3

    for d in 'lllkkk':
        moves += d + SP
    moves += extcmd('sit')
    moves += SP * 3

    # Drop an item and sit on it (object-sitting branch)
    moves += 'd' + 'a' + SP * 3   # drop item a
    moves += extcmd('sit')
    moves += SP * 3

    outpath = os.path.join(SESSIONS_DIR,
        f'theme01_seed{seed:03d}_wiz_sit-various_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  → {outpath}')


# ─── MAIN ──────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    if '--all' in args:
        # Potion sessions
        capture_quaff_healing()
        capture_quaff_status()
        capture_quaff_ability()
        capture_quaff_misc()
        # Zap sessions
        capture_zap_rays()
        capture_zap_utility()
        # Prayer sessions
        capture_pray_basic()
        capture_pray_trouble()
        capture_turn_undead()
        # Sit sessions
        capture_sit_various()
        return

    if '--quaff' in args:
        capture_quaff_healing()
        capture_quaff_status()
        capture_quaff_ability()
        capture_quaff_misc()
    if '--zap' in args:
        capture_zap_rays()
        capture_zap_utility()
    if '--pray' in args:
        capture_pray_basic()
        capture_pray_trouble()
        capture_turn_undead()
    if '--sit' in args:
        capture_sit_various()


if __name__ == '__main__':
    main()
