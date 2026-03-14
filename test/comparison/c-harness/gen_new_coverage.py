#!/usr/bin/env python3
"""Generate C NetHack session traces for low-coverage files.

Targets:
- read.js (24.1%): reading scrolls (enchant weapon, enchant armor, teleport,
  create monster, fire, earth, charging, identify, remove curse, magic mapping)
- dig.js (29.9%): digging with pick-axe (walls, down), dig command
- artifact.js (23.4%): wishing for artifacts, artifact properties
- trap.js (31.1%): triggering traps, setting traps with beartrap

All sessions use wizard mode on level 1 with known-good seeds.
Uses Ctrl-W (#wizwish) to create needed items.
Uses Ctrl-G (#wizgenesis) to create needed monsters.

Usage:
    python3 gen_new_coverage.py --read
    python3 gen_new_coverage.py --dig
    python3 gen_new_coverage.py --artifact
    python3 gen_new_coverage.py --trap
    python3 gen_new_coverage.py --all

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


# ---- READ SESSIONS (read.js) ------------------------------------------------

def capture_read_enchant_weapon(seed=960):
    """Read scroll of enchant weapon with wielded weapon.

    Wish for a long sword, wield it, then read enchant weapon scrolls
    (blessed and uncursed). Tests seffect_enchant_weapon().

    Targets: doread(), seffect_enchant_weapon(), chwepon()
    """
    print(f'Capturing read-enchant-weapon (seed {seed})...')
    moves = ''

    # Wish for a long sword and wield it
    moves += wish('long sword')
    moves += 'w' + 'e' + SP * 3       # wield the long sword

    # Wish for scrolls of enchant weapon
    moves += wish('blessed scroll of enchant weapon')
    moves += wish('scroll of enchant weapon')
    moves += wish('cursed scroll of enchant weapon')

    # Read each scroll: 'r' = read, select inventory letter
    moves += 'r' + 'f' + SP * 5       # read blessed enchant weapon
    moves += 'r' + 'g' + SP * 5       # read uncursed enchant weapon
    moves += 'r' + 'h' + SP * 5       # read cursed enchant weapon

    outpath = os.path.join(SESSIONS_DIR,
        f'theme13_seed{seed:03d}_wiz_read-enchant-weapon_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_read_enchant_armor(seed=962):
    """Read scroll of enchant armor while wearing armor.

    Wish for leather armor, wear it, then read enchant armor scrolls.
    Tests seffect_enchant_armor().

    Targets: doread(), seffect_enchant_armor()
    """
    print(f'Capturing read-enchant-armor (seed {seed})...')
    moves = ''

    # Wish for leather armor and wear it
    moves += wish('leather armor')
    moves += 'W' + 'e' + SP * 3       # wear the armor

    # Wish for scrolls of enchant armor
    moves += wish('blessed scroll of enchant armor')
    moves += wish('scroll of enchant armor')

    # Read each scroll
    moves += 'r' + 'f' + SP * 5       # read blessed enchant armor
    moves += 'r' + 'g' + SP * 5       # read uncursed enchant armor

    outpath = os.path.join(SESSIONS_DIR,
        f'theme13_seed{seed:03d}_wiz_read-enchant-armor_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_read_teleport(seed=963):
    """Read scroll of teleportation.

    Tests seffect_teleportation() — wizard mode teleport control
    means we get a prompt for destination coordinates.

    Targets: doread(), seffect_teleportation(), tele(), teleds()
    """
    print(f'Capturing read-teleport (seed {seed})...')
    moves = ''

    # Wish for scrolls of teleportation
    moves += wish('scroll of teleportation')
    moves += wish('cursed scroll of teleportation')

    # Read teleportation scroll — in wizard mode with teleport control,
    # we get a coordinate prompt. Use '.' to accept current position.
    moves += 'r' + 'e' + '.' + SP * 5  # read, select, accept position
    moves += 'r' + 'f' + '.' + SP * 5  # read cursed (level teleport?), decline

    outpath = os.path.join(SESSIONS_DIR,
        f'theme13_seed{seed:03d}_wiz_read-teleport_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_read_create_monster(seed=964):
    """Read scroll of create monster.

    Tests seffect_create_monster() — creates monsters around the player.

    Targets: doread(), seffect_create_monster(), makemon()
    """
    print(f'Capturing read-create-monster (seed {seed})...')
    moves = ''

    # Wish for scrolls of create monster
    moves += wish('scroll of create monster')
    moves += wish('blessed scroll of create monster')

    # Read create monster scrolls
    moves += 'r' + 'e' + SP * 5       # read uncursed create monster
    moves += 'r' + 'f' + SP * 5       # read blessed create monster

    # Wait a turn to see results
    moves += '.' + SP * 3

    outpath = os.path.join(SESSIONS_DIR,
        f'theme13_seed{seed:03d}_wiz_read-create-monster_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_read_fire(seed=967):
    """Read scroll of fire.

    Tests seffect_fire() — creates fire explosion around player.
    Wish for fire resistance first so we survive.

    Targets: doread(), seffect_fire(), explode()
    """
    print(f'Capturing read-fire (seed {seed})...')
    moves = ''

    # Wish for fire resistance ring first
    moves += wish('ring of fire resistance')
    moves += 'P' + 'e' + SP * 3       # put on ring

    # Wish for scroll of fire
    moves += wish('scroll of fire')

    # Read fire scroll
    moves += 'r' + 'f' + SP * 8       # read fire (explosion messages)

    outpath = os.path.join(SESSIONS_DIR,
        f'theme13_seed{seed:03d}_wiz_read-fire_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_read_earth(seed=968):
    """Read scroll of earth.

    Tests seffect_earth() — drops boulders.

    Targets: doread(), seffect_earth()
    """
    print(f'Capturing read-earth (seed {seed})...')
    moves = ''

    # Wish for scroll of earth
    moves += wish('scroll of earth')

    # Read earth scroll (drops boulders around player)
    moves += 'r' + 'e' + SP * 8       # read earth (boulder drop messages)

    # Wait to see results
    moves += '.' + SP * 3

    outpath = os.path.join(SESSIONS_DIR,
        f'theme13_seed{seed:03d}_wiz_read-earth_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_read_charging(seed=969):
    """Read scroll of charging on a wand.

    Wish for a wand, zap it a few times, then read charging on it.
    Tests seffect_charging().

    Targets: doread(), seffect_charging(), recharge()
    """
    print(f'Capturing read-charging (seed {seed})...')
    moves = ''

    # Wish for a wand of fire and zap it a few times to drain charges
    moves += wish('wand of fire')
    moves += 'z' + 'e' + 'j' + SP * 3    # zap south
    moves += 'z' + 'e' + 'j' + SP * 3    # zap south again
    moves += 'z' + 'e' + 'j' + SP * 3    # zap south again

    # Wish for scroll of charging
    moves += wish('blessed scroll of charging')

    # Read charging — prompts for item to charge
    moves += 'r' + 'f' + 'e' + SP * 5    # read, select scroll, charge wand e

    outpath = os.path.join(SESSIONS_DIR,
        f'theme13_seed{seed:03d}_wiz_read-charging_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_read_identify_mapping(seed=970):
    """Read scroll of identify and scroll of magic mapping.

    Tests seffect_identify() and seffect_magic_mapping().

    Targets: doread(), seffect_identify(), seffect_magic_mapping(),
    do_mapping(), openone()
    """
    print(f'Capturing read-identify-mapping (seed {seed})...')
    moves = ''

    # Wish for scrolls
    moves += wish('blessed scroll of identify')
    moves += wish('scroll of magic mapping')

    # Read blessed identify — identifies all items
    moves += 'r' + 'e' + SP * 8       # read blessed identify

    # Read magic mapping — reveals the map
    moves += 'r' + 'f' + SP * 8       # read magic mapping

    outpath = os.path.join(SESSIONS_DIR,
        f'theme13_seed{seed:03d}_wiz_read-identify-mapping_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_read_remove_curse(seed=977):
    """Read scroll of remove curse with cursed items.

    Wish for cursed items, then read remove curse to uncurse them.
    Tests seffect_remove_curse().

    Targets: doread(), seffect_remove_curse(), uncurse()
    """
    print(f'Capturing read-remove-curse (seed {seed})...')
    moves = ''

    # Wish for a cursed weapon and wear it
    moves += wish('cursed long sword')
    moves += 'w' + 'e' + SP * 3       # wield cursed sword (can't unwield!)

    # Wish for blessed remove curse scroll
    moves += wish('blessed scroll of remove curse')

    # Read remove curse
    moves += 'r' + 'f' + SP * 5       # read blessed remove curse

    outpath = os.path.join(SESSIONS_DIR,
        f'theme13_seed{seed:03d}_wiz_read-remove-curse_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


# ---- DIG SESSIONS (dig.js) --------------------------------------------------

def capture_dig_pickaxe_down(seed=978):
    """Dig downward with a pick-axe.

    Wish for a pick-axe, apply it to dig down.
    Tests dig(), dig_check(), dighole().

    Targets: dig_down(), dighole(), use_pick_axe(), dig_check()
    """
    print(f'Capturing dig-pickaxe-down (seed {seed})...')
    moves = ''

    # Wish for a pick-axe
    moves += wish('pick-axe')

    # Apply pick-axe to dig down: 'a' = apply, select item, '>' = down
    moves += 'a' + 'e' + '>' + SP * 3

    # Wait for digging to complete (digging takes multiple turns)
    moves += '.' * 8 + SP * 5

    # We should now have a hole; try going down
    moves += '>' + SP * 3

    outpath = os.path.join(SESSIONS_DIR,
        f'theme14_seed{seed:03d}_wiz_dig-pickaxe-down_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_dig_pickaxe_wall(seed=979):
    """Dig into walls with a pick-axe.

    Wish for a pick-axe, walk to a wall, dig into it.
    Tests dig(), zap_dig(), dig_corridor().

    Targets: use_pick_axe(), dig(), dig_corridor()
    """
    print(f'Capturing dig-pickaxe-wall (seed {seed})...')
    moves = ''

    # Wish for a pick-axe
    moves += wish('pick-axe')

    # Walk north toward the room edge (5 steps should get to a wall)
    for _ in range(5):
        moves += 'k' + SP

    # Apply pick-axe north into wall
    moves += 'a' + 'e' + 'k' + SP * 3

    # Wait for digging to complete
    moves += '.' * 8 + SP * 5

    # Walk through the dug corridor
    moves += 'k' + SP * 3

    # Dig again in same direction
    moves += 'a' + 'e' + 'k' + SP * 3
    moves += '.' * 8 + SP * 5

    outpath = os.path.join(SESSIONS_DIR,
        f'theme14_seed{seed:03d}_wiz_dig-pickaxe-wall_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_dig_wand(seed=981):
    """Dig with wand of digging — zap downward and at walls.

    Tests zap_dig(), digactualhole(), bhitm() for digging.

    Targets: zap_dig(), dig_typ(), digactualhole()
    """
    print(f'Capturing dig-wand (seed {seed})...')
    moves = ''

    # Wish for wand of digging
    moves += wish('wand of digging')

    # Zap downward to dig a hole
    moves += 'z' + 'e' + '>' + SP * 5   # zap down

    # Walk north toward wall
    for _ in range(5):
        moves += 'k' + SP

    # Zap north into wall
    moves += 'z' + 'e' + 'k' + SP * 5   # zap north

    # Walk through
    moves += 'k' + SP * 3

    outpath = os.path.join(SESSIONS_DIR,
        f'theme14_seed{seed:03d}_wiz_dig-wand_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


# ---- ARTIFACT SESSIONS (artifact.js) ----------------------------------------

def capture_artifact_wish(seed=986):
    """Wish for named artifacts and test their properties.

    Wish for Excalibur, Magicbane, Mjollnir, and test wielding/properties.
    Tests touch_artifact(), spec_applies().

    Targets: touch_artifact(), spec_applies(), artifact_hit(),
    arti_invoke(), doinvoke()
    """
    print(f'Capturing artifact-wish (seed {seed})...')
    moves = ''

    # Wish for artifacts
    moves += wish('Excalibur')
    moves += 'w' + 'e' + SP * 5         # wield Excalibur

    moves += wish('Magicbane')
    moves += wish('Mjollnir')

    # Try to wield Magicbane (will prompt about Excalibur)
    moves += 'w' + 'f' + 'y' + SP * 5   # wield, select, confirm switch

    # Try wielding Mjollnir
    moves += 'w' + 'g' + 'y' + SP * 5   # wield, select, confirm switch

    # Wait a turn
    moves += '.' + SP * 3

    outpath = os.path.join(SESSIONS_DIR,
        f'theme15_seed{seed:03d}_wiz_artifact-wish_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_artifact_invoke(seed=988):
    """Invoke artifacts that have invocable powers.

    Wish for artifacts with invoke abilities and test #invoke.
    Tests arti_invoke(), doinvoke().

    Targets: doinvoke(), arti_invoke()
    """
    print(f'Capturing artifact-invoke (seed {seed})...')
    moves = ''

    # Wish for Magicbane (invoke = scare monsters)
    moves += wish('Magicbane')
    moves += 'w' + 'e' + SP * 5         # wield it

    # Invoke the artifact
    moves += extcmd('invoke')
    moves += SP * 5                      # dismiss messages

    # Wish for Frost Brand (cold attack)
    moves += wish('Frost Brand')
    moves += 'w' + 'f' + 'y' + SP * 5   # wield, confirm switch

    # Genesis a monster to test artifact combat
    moves += genesis('kobold')
    moves += 'j' + SP * 5               # attack south with artifact

    outpath = os.path.join(SESSIONS_DIR,
        f'theme15_seed{seed:03d}_wiz_artifact-invoke_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_artifact_combat(seed=989):
    """Fight monsters with artifact weapons to test spec_applies/artifact_hit.

    Wish for Excalibur, genesis undead, and attack them.
    Excalibur does bonus damage to non-chaotic.

    Targets: artifact_hit(), spec_applies(), spec_dbon(), Sting_effects()
    """
    print(f'Capturing artifact-combat (seed {seed})...')
    moves = ''

    # Wish for Excalibur and wield
    moves += wish('Excalibur')
    moves += 'w' + 'e' + SP * 5

    # Genesis some targets
    moves += genesis('zombie')
    moves += genesis('orc')

    # Attack them
    moves += 'j' + SP * 5   # attack south
    moves += 'j' + SP * 5   # attack south again
    moves += 'j' + SP * 5   # keep attacking

    # Wait
    moves += '.' + SP * 3

    outpath = os.path.join(SESSIONS_DIR,
        f'theme15_seed{seed:03d}_wiz_artifact-combat_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


# ---- TRAP SESSIONS (trap.js) ------------------------------------------------

def capture_trap_fall(seed=991):
    """Trigger a pit trap by walking into it.

    Use #wizgenesis to place a monster on known trap, or just explore.
    More reliable: wish for levitation, fly over traps, land on them.

    For simplicity, walk around level 1 extensively to trigger random traps.

    Targets: dotrap(), fall_through(), set_utrap(), trapeffect_pit_trap(),
    trapeffect_falling_rock_trap()
    """
    print(f'Capturing trap-fall (seed {seed})...')
    moves = ''

    # Walk around the level extensively to find and trigger traps
    # Level 1 has random traps placed during generation
    for _ in range(3):
        for _ in range(6):
            moves += 'l' + SP
        for _ in range(3):
            moves += 'j' + SP
        for _ in range(6):
            moves += 'h' + SP
        for _ in range(3):
            moves += 'k' + SP

    # Extra spaces for any trap messages
    moves += SP * 10

    outpath = os.path.join(SESSIONS_DIR,
        f'theme16_seed{seed:03d}_wiz_trap-fall_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_trap_beartrap(seed=992):
    """Set a bear trap and trigger it.

    Wish for a beartrap (from #wizwish as 'beartrap'),
    set it with #untrap or by applying, then step on it.

    Targets: dotrap(), trapeffect_bear_trap(), set_utrap(),
    mintrap(), closeholdingtrap()
    """
    print(f'Capturing trap-beartrap (seed {seed})...')
    moves = ''

    # Wish for a beartrap
    moves += wish('beartrap')

    # Set the trap: apply beartrap, it gets placed at feet
    moves += 'a' + 'e' + SP * 3         # apply beartrap

    # Walk away
    moves += 'l' + SP + 'l' + SP

    # Walk back onto it to trigger
    moves += 'h' + SP + 'h' + SP * 5    # step on beartrap

    # Try to escape (move while trapped)
    moves += 'l' + SP * 3               # try to move while trapped
    moves += 'l' + SP * 3               # try again
    moves += '.' + SP * 3               # wait

    outpath = os.path.join(SESSIONS_DIR,
        f'theme16_seed{seed:03d}_wiz_trap-beartrap_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


def capture_trap_teleport(seed=993):
    """Trigger a teleport trap.

    Walk around level 1 and hope to hit a teleport trap,
    or wish for a scroll of gold detection to reveal traps (blessed).

    Targets: dotrap(), trapeffect_teleportation_trap(), tele(),
    level_tele_trap()
    """
    print(f'Capturing trap-teleport (seed {seed})...')
    moves = ''

    # Wish for blessed scroll of gold detection (reveals traps when blessed+confused)
    # Actually, use wand of secret door detection to find traps
    moves += wish('wand of secret door detection')
    moves += 'z' + 'e' + SP * 5         # zap to reveal features

    # Walk around to explore and possibly hit traps
    for _ in range(4):
        moves += 'l' + SP
    for _ in range(4):
        moves += 'j' + SP
    for _ in range(4):
        moves += 'h' + SP
    for _ in range(4):
        moves += 'k' + SP

    # More exploring
    for _ in range(3):
        moves += 'l' + SP
    for _ in range(3):
        moves += 'j' + SP

    # Extra spaces for trap messages
    moves += SP * 10

    outpath = os.path.join(SESSIONS_DIR,
        f'theme16_seed{seed:03d}_wiz_trap-teleport_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ,
                    record_more_spaces=True)
    print(f'  -> {outpath}')


# ---- MAIN -------------------------------------------------------------------

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    if '--all' in args:
        # Read sessions
        capture_read_enchant_weapon()
        capture_read_enchant_armor()
        capture_read_teleport()
        capture_read_create_monster()
        capture_read_fire()
        capture_read_earth()
        capture_read_charging()
        capture_read_identify_mapping()
        capture_read_remove_curse()
        # Dig sessions
        capture_dig_pickaxe_down()
        capture_dig_pickaxe_wall()
        capture_dig_wand()
        # Artifact sessions
        capture_artifact_wish()
        capture_artifact_invoke()
        capture_artifact_combat()
        # Trap sessions
        capture_trap_fall()
        capture_trap_beartrap()
        capture_trap_teleport()
        return

    if '--read' in args:
        capture_read_enchant_weapon()
        capture_read_enchant_armor()
        capture_read_teleport()
        capture_read_create_monster()
        capture_read_fire()
        capture_read_earth()
        capture_read_charging()
        capture_read_identify_mapping()
        capture_read_remove_curse()
    if '--dig' in args:
        capture_dig_pickaxe_down()
        capture_dig_pickaxe_wall()
        capture_dig_wand()
    if '--artifact' in args:
        capture_artifact_wish()
        capture_artifact_invoke()
        capture_artifact_combat()
    if '--trap' in args:
        capture_trap_fall()
        capture_trap_beartrap()
        capture_trap_teleport()


if __name__ == '__main__':
    main()
