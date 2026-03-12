#!/usr/bin/env python3
"""Generate high-impact C NetHack sessions targeting hundreds of uncovered branches.

Each session is designed to exercise many code paths in a single run,
covering as much of the targeted file(s) as possible.

Usage:
    python3 gen_high_impact_sessions.py --all
    python3 gen_high_impact_sessions.py --shop
    python3 gen_high_impact_sessions.py --traps
    python3 gen_high_impact_sessions.py --scrolls
    python3 gen_high_impact_sessions.py --fountain
    python3 gen_high_impact_sessions.py --throw
    python3 gen_high_impact_sessions.py --dig
    python3 gen_high_impact_sessions.py --artifact
    python3 gen_high_impact_sessions.py --monster-attack
    python3 gen_high_impact_sessions.py --polyself
    python3 gen_high_impact_sessions.py --insight
    python3 gen_high_impact_sessions.py --potion-deep
    python3 gen_high_impact_sessions.py --zap-deep

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
CTRL_E = '\x05'   # #wizdetect
CTRL_F = '\x06'   # #wizmap
CTRL_I = '\x09'   # #wizidentify
CTRL_V = '\x16'   # #wizlevelport
ESC    = '\x1b'
SP     = ' '
ENTER  = '\n'

def extcmd(cmd):
    return '#' + cmd + ENTER

def wish(item):
    """Wish for an item via Ctrl-W."""
    return CTRL_W + item + ENTER + SP

def genesis(monster):
    """Create a monster via Ctrl-G."""
    return CTRL_G + monster + ENTER + SP


# ─── SHOP SESSION ────────────────────────────────────────────────────
# Targets: shk.js (2520 uncovered), pickup.js, invent.js
# Exercises: entering shop, picking up items, paying, dropping, stealing

def capture_shop_interaction(seed=1001):
    """Exercise shop code: pick up, pay, drop, buy, sell.

    Targets shk.js extensively:
    - shk_move, shk_sniff, inhishop, onbill, addtobill
    - dopay, dopayobj, billx, bill_dummy_object
    - rob_shop, shk_names, shk_chat
    """
    print(f'Capturing shop-interaction (seed {seed})...')
    moves = ''

    # Map the level and identify everything
    moves += CTRL_F + SP   # wizard map
    moves += CTRL_I + SP   # identify all

    # Teleport to a shop (try coordinates near a typical shop)
    moves += CTRL_T + '35,10' + ENTER + SP  # teleport

    # Walk around to find shop contents
    for d in 'lllllllll':
        moves += d + SP * 2

    # Pick up items
    moves += ',' + SP * 5  # pickup

    # Try to leave shop (triggers shk code)
    for d in 'hhhhhh':
        moves += d + SP * 2

    # Pay for items
    moves += 'p' + SP * 5  # pay

    # Drop items in shop (exercises sell code)
    moves += 'd' + 'a' + SP * 3  # drop first item

    # Chat with shopkeeper
    moves += extcmd('chat') + 'l' + SP * 3

    # Pick up more items
    moves += ',' + SP * 5

    # Try different payment scenarios
    moves += 'p' + SP * 5

    outpath = os.path.join(SESSIONS_DIR,
        f'hi01_seed{seed}_wiz_shop-interact_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  → {outpath}')


# ─── TRAP SESSION ────────────────────────────────────────────────────
# Targets: trap.js (2195 uncovered)
# Exercises: creating and stepping on various traps

def capture_trap_encounters(seed=1010):
    """Exercise trap code with wizard-created traps.

    Targets trap.js extensively:
    - dotrap, trapeffect_*, launch_obj, chest_trap
    - float_up, float_down, teleport traps
    - pit, spiked pit, hole, trapdoor, bear trap, web
    - fire/magic/polymorph/sleep/rust traps
    """
    print(f'Capturing trap-encounters (seed {seed})...')
    moves = ''

    # Wish for levitation boots (to test floating over traps)
    moves += wish('levitation boots')

    # Use #wizgenesis to create traps — actually, use #wiztrap
    # Actually, wizard mode doesn't have wiztrap. Let's wish for items
    # and explore to find traps, or create them via terrain.

    # Better approach: teleport to various dungeon levels that have traps
    # Level 5-10 should have some
    moves += CTRL_V + '5' + ENTER + SP * 3  # levelport to 5

    # Map the level to see traps
    moves += CTRL_F + SP

    # Walk around extensively to encounter traps
    for _ in range(3):
        for d in 'llllljjjjjhhhhhkkkkk':
            moves += d + SP * 2

    # Search (reveals hidden traps)
    for _ in range(20):
        moves += 's' + SP * 2

    # Walk more
    for d in 'lllllljjjjjjhhhhhh':
        moves += d + SP * 2

    # Teleport deeper where there are more traps
    moves += CTRL_V + '10' + ENTER + SP * 3
    moves += CTRL_F + SP

    # Walk around
    for _ in range(2):
        for d in 'llllljjjjjhhhhhkkkkk':
            moves += d + SP * 2

    outpath = os.path.join(SESSIONS_DIR,
        f'hi02_seed{seed}_wiz_trap-encounter_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  → {outpath}')


# ─── SCROLL SESSION ─────────────────────────────────────────────────
# Targets: read.js (1628 uncovered)
# Exercises: reading many different scroll types

def capture_scroll_deep(seed=1020):
    """Read many scroll types: enchant, identify, teleport, etc.

    Targets read.js extensively:
    - seffects, literate, confused reading
    - enchant weapon/armor, remove curse, identify
    - create monster, earth, fire, teleportation
    - taming, scare monster, stinking cloud
    """
    print(f'Capturing scroll-deep (seed {seed})...')
    moves = ''

    # Wish for many scroll types
    scrolls = [
        'scroll of enchant weapon',
        'scroll of enchant armor',
        'scroll of remove curse',
        'scroll of identify',
        'blessed scroll of identify',
        'scroll of teleportation',
        'scroll of create monster',
        'scroll of earth',
        'scroll of fire',
        'scroll of taming',
        'scroll of scare monster',
        'scroll of charging',
        'scroll of confuse monster',
        'scroll of destroy armor',
        'scroll of amnesia',
        'scroll of magic mapping',
        'scroll of light',
        'scroll of food detection',
        'scroll of gold detection',
        'scroll of punishment',
        'scroll of stinking cloud',
    ]
    for s in scrolls:
        moves += wish(s)

    # Read each one (they'll be in slots starting around 'e')
    for i, _ in enumerate(scrolls):
        letter = chr(ord('e') + i)
        if letter > 'z':
            letter = chr(ord('A') + (i - (ord('z') - ord('e') + 1)))
        moves += 'r' + letter + SP * 5  # read + dismiss messages

    outpath = os.path.join(SESSIONS_DIR,
        f'hi03_seed{seed}_wiz_scroll-deep_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  → {outpath}')


# ─── FOUNTAIN/ALTAR/SINK SESSION ────────────────────────────────────
# Targets: fountain.js (616), pray.js (1606), sit.js (431)

def capture_fountain_altar(seed=1030):
    """Exercise fountain drinking/dipping, altar praying/sacrificing.

    Targets:
    - fountain.js: drinkfountain, dipfountain, dryup, dogushforth
    - pray.js: dosacrifice, dopray, prayer_done, p_trouble
    - sit.js: dosit on thrones and other features
    """
    print(f'Capturing fountain-altar (seed {seed})...')
    moves = ''

    # Map level
    moves += CTRL_F + SP

    # Wish for items to sacrifice
    moves += wish('corpse')

    # Find fountain — teleport to common locations
    moves += CTRL_T + '20,8' + ENTER + SP

    # Quaff from fountain
    moves += 'q' + 'f' + SP * 5  # quaff fountain (if 'f' is fountain)

    # Actually, quaff from ground feature uses just 'q' then selecting
    # Let's drink from fountain: walk to one and quaff
    for d in 'llll':
        moves += d + SP * 2

    # Drink from fountain (if we're on one)
    moves += 'q' + SP * 5

    # Dip into fountain
    moves += extcmd('dip') + 'a' + SP * 5  # dip first item

    # Pray at altar
    moves += extcmd('pray') + 'y' + SP * 5  # pray (yes really)

    # Sit on current spot
    moves += extcmd('sit') + SP * 5

    # Offer sacrifice
    moves += extcmd('offer') + 'a' + SP * 5

    # Walk to look for more features
    for d in 'jjjjjlllll':
        moves += d + SP * 2

    # Pray again
    moves += extcmd('pray') + 'y' + SP * 5

    # Kick fountain
    moves += extcmd('kick') + 'l' + SP * 5

    outpath = os.path.join(SESSIONS_DIR,
        f'hi04_seed{seed}_wiz_fountain-altar_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  → {outpath}')


# ─── THROW/RANGED SESSION ───────────────────────────────────────────
# Targets: dothrow.js (875 uncovered), uhitm.js (1297)

def capture_throw_ranged(seed=1040):
    """Exercise throwing and ranged combat.

    Targets dothrow.js:
    - dothrow, throwit, throw_obj, hurtle, toss_up
    - hitfloor, tmiss, thitmonst
    Targets uhitm.js:
    - attack, hmon_hitmon, known_hitum
    """
    print(f'Capturing throw-ranged (seed {seed})...')
    moves = ''

    # Wish for throwable items
    moves += wish('3 daggers')
    moves += wish('3 darts')
    moves += wish('boomerang')
    moves += wish('cream pie')
    moves += wish('3 rocks')

    # Create targets
    moves += genesis('newt')
    moves += genesis('grid bug')

    # Throw daggers at monsters
    moves += 't' + 'e' + 'j' + SP * 3  # throw dagger south
    moves += 't' + 'e' + 'l' + SP * 3  # throw dagger east
    moves += 't' + 'f' + 'k' + SP * 3  # throw dart north

    # Throw boomerang
    moves += 't' + 'g' + 'l' + SP * 3  # throw boomerang east

    # Throw cream pie
    moves += 't' + 'h' + 'j' + SP * 3  # throw pie south

    # Throw rocks
    moves += 't' + 'i' + 'l' + SP * 3

    # Throw upward
    moves += 't' + 'i' + '>' + SP * 3  # throw up? (actually '>' is down)

    # More melee combat for uhitm coverage
    moves += genesis('jackal')
    moves += 'j' + SP * 3  # attack south
    moves += 'j' + SP * 3
    moves += genesis('kobold')
    moves += 'l' + SP * 3  # attack east
    moves += 'l' + SP * 3

    outpath = os.path.join(SESSIONS_DIR,
        f'hi05_seed{seed}_wiz_throw-ranged_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  → {outpath}')


# ─── DIG SESSION ────────────────────────────────────────────────────
# Targets: dig.js (1467 uncovered)

def capture_dig_deep(seed=1050):
    """Exercise digging: pick-axe, mattock, wand of digging.

    Targets dig.js:
    - dig, dig_check, digactualhole, dighole, use_pick_axe
    - zap_dig, mdig_tunnel, dig_up_grave
    """
    print(f'Capturing dig-deep (seed {seed})...')
    moves = ''

    # Wish for digging tools
    moves += wish('pick-axe')
    moves += wish('wand of digging')
    moves += wish('mattock')

    # Apply pick-axe to dig in directions
    moves += 'a' + 'e' + 'l' + SP * 5  # apply pick-axe east
    moves += SP * 10  # dismiss messages, wait for dig
    moves += 'a' + 'e' + 'j' + SP * 5  # dig south
    moves += SP * 10
    moves += 'a' + 'e' + '.' + SP * 5  # dig down
    moves += SP * 10

    # Zap wand of digging
    moves += 'z' + 'f' + 'l' + SP * 5  # zap digging east
    moves += 'z' + 'f' + '.' + SP * 5  # zap digging down

    # Walk through dug passages
    for d in 'llllljjjjj':
        moves += d + SP * 2

    outpath = os.path.join(SESSIONS_DIR,
        f'hi06_seed{seed}_wiz_dig-deep_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  → {outpath}')


# ─── ARTIFACT SESSION ───────────────────────────────────────────────
# Targets: artifact.js (1306 uncovered)

def capture_artifact_use(seed=1060):
    """Exercise artifact code: wielding, invoking, special attacks.

    Targets artifact.js:
    - touch_artifact, spec_abon, spec_dbon
    - arti_invoke, arti_speak
    - defends, protects
    """
    print(f'Capturing artifact-use (seed {seed})...')
    moves = ''

    # Wish for artifacts
    moves += wish('Magicbane')
    moves += wish('Frost Brand')
    moves += wish('Fire Brand')
    moves += wish('Sting')

    # Wield Magicbane
    moves += 'w' + 'e' + SP * 3  # wield

    # Create monsters to attack with artifact
    moves += genesis('kobold')
    moves += 'j' + SP * 3  # attack
    moves += 'j' + SP * 3

    # Wield Frost Brand
    moves += 'w' + 'f' + SP * 3
    moves += genesis('orc')
    moves += 'j' + SP * 3
    moves += 'j' + SP * 3

    # Invoke an artifact
    moves += extcmd('invoke') + SP * 5

    # Name a weapon
    moves += extcmd('name') + 'y' + SP * 3  # name individual item

    outpath = os.path.join(SESSIONS_DIR,
        f'hi07_seed{seed}_wiz_artifact-use_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  → {outpath}')


# ─── POLYSELF SESSION ───────────────────────────────────────────────
# Targets: polyself.js (1159 uncovered)

def capture_polyself(seed=1070):
    """Exercise polymorph self code.

    Targets polyself.js:
    - polyself, newman, polyman, polymon
    - uunstick, skinback, break_armor
    - polyfood, could_advance, special form attacks
    """
    print(f'Capturing polyself (seed {seed})...')
    moves = ''

    # Wish for polymorph items
    moves += wish('wand of polymorph')
    moves += wish('potion of polymorph')
    moves += wish('ring of polymorph control')
    moves += wish('amulet of unchanging')

    # Zap self with wand of polymorph
    moves += 'z' + 'e' + '.' + SP * 5  # zap self
    # If poly control asks what: say "dragon"
    moves += 'red dragon' + ENTER + SP * 5

    # Quaff polymorph potion
    moves += 'q' + 'f' + SP * 5
    moves += 'hill giant' + ENTER + SP * 5

    # Put on ring of polymorph control
    moves += 'P' + 'g' + SP * 3

    # Zap self again with control
    moves += 'z' + 'e' + '.' + SP * 5
    moves += 'xorn' + ENTER + SP * 5

    outpath = os.path.join(SESSIONS_DIR,
        f'hi08_seed{seed}_wiz_polyself_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  → {outpath}')


# ─── INSIGHT/ENLIGHTENMENT SESSION ──────────────────────────────────
# Targets: insight.js (1146 uncovered), botl.js (560)

def capture_insight_deep(seed=1080):
    """Exercise enlightenment and status display code.

    Targets insight.js:
    - do_enlightenment, attributes_enlightenment
    - status_enlightenment, characteristics_enlightenment
    - background_enlightenment
    Targets botl.js:
    - bot, bot1, bot2, status_update
    """
    print(f'Capturing insight-deep (seed {seed})...')
    moves = ''

    # Get various status effects
    moves += wish('potion of speed')
    moves += wish('potion of invisibility')
    moves += wish('ring of see invisible')
    moves += wish('ring of free action')
    moves += wish('cloak of protection')

    # Apply status effects
    moves += 'q' + 'e' + SP * 5  # quaff speed
    moves += 'q' + 'f' + SP * 5  # quaff invisibility
    moves += 'P' + 'g' + SP * 3  # put on see invis ring
    moves += 'P' + 'h' + SP * 3  # put on free action ring
    moves += 'W' + 'i' + SP * 3  # wear cloak

    # Check attributes (Ctrl+X = doattributes, exercises insight.js)
    moves += '\x18' + SP * 10  # Ctrl+X

    # Check conduct (#conduct)
    moves += extcmd('conduct') + SP * 10

    # Look at self
    moves += ':' + SP * 3  # look

    # Check inventory details
    moves += 'i' + SP * 3  # inventory

    outpath = os.path.join(SESSIONS_DIR,
        f'hi09_seed{seed}_wiz_insight-deep_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  → {outpath}')


# ─── DEEP POTION SESSION ────────────────────────────────────────────
# Targets: potion.js (1288 uncovered)

def capture_potion_deep(seed=1090):
    """Exercise many potion effects including dipping, mixing.

    Targets potion.js beyond basic quaff:
    - dodip, potionhit, potionbreathe
    - ghost/potionX/potionY effects
    - cursed/blessed variants
    """
    print(f'Capturing potion-deep (seed {seed})...')
    moves = ''

    # Wish for varied potions
    potions = [
        'potion of gain level',
        'potion of monster detection',
        'potion of object detection',
        'potion of levitation',
        'potion of gain energy',
        'potion of restore ability',
        'potion of blindness',
        'potion of hallucination',
        'potion of sleeping',
        'potion of booze',
        'potion of sickness',
        'potion of fruit juice',
        'potion of see invisible',
        'cursed potion of gain level',
        'potion of enlightenment',
    ]
    for p in potions:
        moves += wish(p)

    # Quaff each
    for i in range(len(potions)):
        letter = chr(ord('e') + i)
        moves += 'q' + letter + SP * 5

    # Dip items into potions
    moves += wish('potion of holy water')
    letter = chr(ord('e') + len(potions))
    moves += extcmd('dip') + 'a' + letter + SP * 5  # dip quarterstaff into holy water

    outpath = os.path.join(SESSIONS_DIR,
        f'hi10_seed{seed}_wiz_potion-deep_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  → {outpath}')


# ─── DEEP ZAP SESSION ───────────────────────────────────────────────
# Targets: zap.js (1959 uncovered)

def capture_zap_deep(seed=1100):
    """Exercise many wand types and beam interactions.

    Targets zap.js:
    - weffects, bhit, buzz, zapyourself
    - backfire, wandeffects for each wand type
    - beam bouncing, reflection
    """
    print(f'Capturing zap-deep (seed {seed})...')
    moves = ''

    # Wish for many wand types
    wands = [
        'wand of cold',
        'wand of fire',
        'wand of lightning',
        'wand of sleep',
        'wand of death',
        'wand of polymorph',
        'wand of cancellation',
        'wand of teleportation',
        'wand of undead turning',
        'wand of make invisible',
        'wand of slow monster',
        'wand of speed monster',
        'wand of light',
        'wand of create monster',
    ]
    for w in wands:
        moves += wish(w)

    # Create targets
    moves += genesis('kobold')
    moves += genesis('gnome')

    # Zap each wand at a monster
    for i in range(len(wands)):
        letter = chr(ord('e') + i)
        moves += 'z' + letter + 'j' + SP * 5  # zap south

    # Zap self with a few
    moves += 'z' + 'e' + '.' + SP * 5  # zap cold at self
    moves += 'z' + 'h' + '.' + SP * 5  # zap teleport at self
    moves += SP * 5  # dismiss teleport results

    outpath = os.path.join(SESSIONS_DIR,
        f'hi11_seed{seed}_wiz_zap-deep_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  → {outpath}')


# ─── MONSTER ATTACK SESSION ─────────────────────────────────────────
# Targets: mhitu.js (1569), muse.js (1670)

def capture_monster_attack(seed=1110):
    """Let monsters attack the player to exercise mhitu.js.

    Targets:
    - mattacku, hitmu, missmu, gulpmu
    - hitmsg, mhitm passive damage
    - various attack types (AT_CLAW, AT_BITE, AT_KICK, etc.)
    """
    print(f'Capturing monster-attack (seed {seed})...')
    moves = ''

    # Create dangerous monsters adjacent
    moves += genesis('zombie')
    moves += genesis('wolf')
    moves += genesis('floating eye')
    moves += genesis('yellow light')

    # Wait to let them attack us
    for _ in range(15):
        moves += '.' + SP * 3  # wait

    # Create more
    moves += genesis('giant ant')
    moves += genesis('killer bee')

    # Wait more
    for _ in range(10):
        moves += '.' + SP * 3

    # Create something with special attacks
    moves += genesis('cockatrice')
    moves += wish('gloves')  # need gloves first!
    moves += 'W' + chr(ord('e') + 4) + SP * 3  # wear gloves

    # Wait for attacks
    for _ in range(10):
        moves += '.' + SP * 3

    outpath = os.path.join(SESSIONS_DIR,
        f'hi12_seed{seed}_wiz_monster-attack_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  → {outpath}')


# ─── MAIN ────────────────────────────────────────────────────────────

if __name__ == '__main__':
    args = sys.argv[1:]

    if not args:
        print('Usage: python3 gen_high_impact_sessions.py --all')
        print('       python3 gen_high_impact_sessions.py --shop --traps --scrolls ...')
        sys.exit(1)

    if '--all' in args or '--shop' in args:
        capture_shop_interaction()
    if '--all' in args or '--traps' in args:
        capture_trap_encounters()
    if '--all' in args or '--scrolls' in args:
        capture_scroll_deep()
    if '--all' in args or '--fountain' in args:
        capture_fountain_altar()
    if '--all' in args or '--throw' in args:
        capture_throw_ranged()
    if '--all' in args or '--dig' in args:
        capture_dig_deep()
    if '--all' in args or '--artifact' in args:
        capture_artifact_use()
    if '--all' in args or '--polyself' in args:
        capture_polyself()
    if '--all' in args or '--insight' in args:
        capture_insight_deep()
    if '--all' in args or '--potion-deep' in args:
        capture_potion_deep()
    if '--all' in args or '--zap-deep' in args:
        capture_zap_deep()
    if '--all' in args or '--monster-attack' in args:
        capture_monster_attack()

    print('\nDone. Run sessions with:')
    print('  node test/comparison/test_session_replay.js test/comparison/sessions/pending/hi*.session.json')
