#!/usr/bin/env python3
"""Generate high-yield long-form coverage sessions (pending).

Strategy:
- one session per run
- target ~800 steps
- mix commands/interactions to maximize coverage-per-turn
"""

import os
import argparse
import importlib.util


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "..", ".."))
SESSIONS_DIR = os.path.join(PROJECT_ROOT, "test", "comparison", "sessions", "pending")

_spec = importlib.util.spec_from_file_location(
    "run_session", os.path.join(SCRIPT_DIR, "run_session.py"))
_rs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_rs)


CHARACTER_WIZ = {
    "name": "Wizard",
    "role": "Wizard",
    "race": "human",
    "gender": "male",
    "align": "neutral",
}

CTRL_G = "\x07"  # #wizgenesis
CTRL_W = "\x17"  # #wizwish
CTRL_F = "\x06"  # #wizmap
CTRL_I = "\x09"  # #wizidentify
CTRL_V = "\x16"  # #wizlevelport
ENTER = "\n"
SP = " "


def wish(item: str) -> str:
    return CTRL_W + item + ENTER + SP


def genesis(monster: str) -> str:
    return CTRL_G + monster + ENTER + SP


def levelport(depth: int) -> str:
    return CTRL_V + str(depth) + ENTER + (SP * 2)


def build_covmax1_moves() -> str:
    moves = ""

    # Initial diagnostics and setup.
    moves += CTRL_F + SP
    moves += CTRL_I + SP

    # Broad inventory/tool coverage (short names to keep keycount efficient).
    for item in [
        "wand of fire",
        "wand of cold",
        "wand of digging",
        "potion of healing",
        "potion of confusion",
        "scroll of identify",
        "scroll of teleportation",
        "pick-axe",
        "stethoscope",
        "oil lamp",
    ]:
        moves += wish(item)

    # Spawn combat targets and pets/hostiles.
    for mon in ["orc", "kobold", "newt", "jackal", "lichen"]:
        moves += genesis(mon)

    # Exercise item flows (letters are intentionally broad; invalid selections
    # still drive parser/menu branches and prompt paths).
    for letter in "efghij":
        moves += "q" + letter + (SP * 2)        # quaff
    for letter in "klmn":
        moves += "r" + letter + (SP * 2)        # read
    for letter in "efg":
        moves += "z" + letter + "j" + (SP * 2)  # zap south
    for letter in "op":
        moves += "w" + letter + (SP * 2)        # wield
    for letter in "qr":
        moves += "W" + letter + (SP * 2)        # wear
    for letter in "qr":
        moves += "T" + letter + (SP * 2)        # takeoff
    for letter in "st":
        moves += "a" + letter + (SP * 2)        # apply

    # Structured dungeon traversal to hit map/combat/AI/trap/door paths.
    route = "lllljjjjhhhhkkkk" + "lljjhhkk" + "s" * 4 + "." * 2 + "," + "d"
    for depth in [2, 6, 10]:
        moves += levelport(depth)
        moves += CTRL_F + SP
        moves += CTRL_I + SP
        for _ in range(3):
            moves += route + (SP * 2)
        moves += "#pray" + ENTER + (SP * 2)
        moves += "#sit" + ENTER + (SP * 2)

    # End with sustained local exploration/combat churn.
    for _ in range(8):
        moves += "lljjhhkk" + "f" + "j" + "." + "s" + (SP * 2)

    return moves


def build_covmax2_moves() -> str:
    moves = ""

    # No initial wiz-map identify to avoid immediate display-only drift.
    for item in [
        "wand of striking",
        "wand of opening",
        "wand of locking",
        "wand of digging",
        "skeleton key",
        "lock pick",
        "pick-axe",
        "oilskin sack",
        "scroll of remove curse",
        "scroll of enchant armor",
        "scroll of destroy armor",
        "scroll of create monster",
        "scroll of charging",
        "potion of object detection",
        "potion of monster detection",
        "potion of blindness",
        "potion of levitation",
    ]:
        moves += wish(item)

    for mon in ["kobold", "orc", "jackal", "goblin", "floating eye", "acid blob"]:
        moves += genesis(mon)

    # Inventory and command-path churn before movement.
    for letter in "efghijk":
        moves += "r" + letter + (SP * 2)
    for letter in "efghi":
        moves += "z" + letter + "j" + (SP * 2)
    for letter in "lmn":
        moves += "a" + letter + (SP * 2)
    for letter in "opq":
        moves += "q" + letter + (SP * 2)

    # Door/terrain interactions.
    for _ in range(4):
        moves += "s" * 4 + "o" + "l" + (SP * 2) + "k" + "l" + "h" + "j"
        moves += "." + "," + "d" + (SP * 2)

    # Depth hopping with mixed actions.
    for depth in [3, 7]:
        moves += levelport(depth)
        for _ in range(2):
            moves += "lllljjjjhhhhkkkk" + "s" * 2 + "." + "," + "d" + (SP * 2)
            moves += "f" + "j" + (SP * 2) + "t" + "j" + (SP * 2)
        moves += "#pray" + ENTER + (SP * 2)
        moves += "#sit" + ENTER + (SP * 2)

    # Digging + command variability.
    for _ in range(8):
        moves += "a" + "n" + (SP * 2)       # apply pick/lock tool slot guess
        moves += "z" + "h" + "j" + (SP * 2) # zap digging/utility
        moves += "lljjhhkk" + "s" + "." + (SP * 2)

    return moves


def build_covmax3_moves() -> str:
    moves = ""

    # Setup: bias toward diverse interaction systems without over-indexing on
    # repeated read-scroll chains (which are already exercised by covmax2).
    for item in [
        "pick-axe",
        "wand of digging",
        "wand of opening",
        "wand of locking",
        "wand of striking",
        "wand of magic missile",
        "stethoscope",
        "skeleton key",
        "lock pick",
        "tin opener",
        "oil lamp",
        "blindfold",
        "food ration",
        "apple",
        "potion of levitation",
        "potion of healing",
        "scroll of teleportation",
        "scroll of remove curse",
    ]:
        moves += wish(item)

    for mon in [
        "jackal",
        "kobold",
        "goblin",
        "newt",
        "grid bug",
        "floating eye",
        "acid blob",
        "lichen",
    ]:
        moves += genesis(mon)

    # Route pattern for repeated exploration loops.
    loop = "lljjhhkk" + "s" + "." + "," + "d"

    # Early depth cycle: levelport + mixed actions.
    for depth in [2, 4, 6]:
        moves += levelport(depth)
        moves += CTRL_F + SP
        moves += CTRL_I + SP
        for _ in range(3):
            moves += loop + (SP * 2)
            moves += "f" + "j" + (SP * 2)      # fight south
            moves += "t" + "j" + (SP * 2)      # throw south
            moves += "o" + "l" + (SP * 2)      # open
            moves += "c" + "l" + (SP * 2)      # close

    # Tool/wand churn with directional prompts and confirmation handling.
    for _ in range(4):
        moves += "a" + "m" + (SP * 2)          # apply tool (lockpick/key guess)
        moves += "a" + "n" + (SP * 2)          # apply alternate tool slot
        moves += "z" + "h" + "j" + (SP * 2)    # zap + dir
        moves += "z" + "i" + "l" + (SP * 2)    # zap + dir
        moves += "q" + "p" + (SP * 2)          # quaff
        moves += "q" + "q" + (SP * 2)          # quaff
        moves += loop + (SP * 2)

    # Longer explore/combat tail to drive movement+AI+object interactions.
    for _ in range(8):
        moves += "lljjhhkk" + "s" * 2 + "." + "," + "d" + (SP * 2)
        moves += "f" + "j" + (SP * 2)
        moves += "F" + "J" + (SP * 2)          # force fight variant
        moves += "T" + "r" + (SP * 2)          # takeoff (likely invalid too)
        moves += "W" + "r" + (SP * 2)          # wear (likely invalid too)

    # End with prayer/sit to touch role/religion/throne-style branches.
    moves += "#pray" + ENTER + (SP * 2)
    moves += "#sit" + ENTER + (SP * 2)

    return moves


def main():
    parser = argparse.ArgumentParser(description="Generate one long coverage-max pending session.")
    parser.add_argument("--seed", type=int, default=741, help="Deterministic seed")
    parser.add_argument(
        "--scenario",
        choices=["covmax1", "covmax2", "covmax3"],
        default="covmax1",
        help="Coverage scenario recipe",
    )
    args = parser.parse_args()

    os.environ.setdefault("NETHACK_FIXED_DATETIME", "20000110090000")
    os.makedirs(SESSIONS_DIR, exist_ok=True)

    outpath = os.path.join(
        SESSIONS_DIR,
        f"t11_s{args.seed:03d}_w_{args.scenario}_gp.session.json",
    )
    if args.scenario == "covmax1":
        moves = build_covmax1_moves()
    elif args.scenario == "covmax2":
        moves = build_covmax2_moves()
    else:
        moves = build_covmax3_moves()
    print(f"Seed: {args.seed}")
    print(f"Output: {outpath}")
    print(f"Move keycount: {len(moves)}")

    _rs.run_session(
        args.seed,
        outpath,
        moves,
        raw_moves=True,
        wizard_mode=True,
        character=CHARACTER_WIZ,
        record_more_spaces=False,
    )


if __name__ == "__main__":
    main()
