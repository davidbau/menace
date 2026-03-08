#!/usr/bin/env python3
"""
make_wizard_sessions.py — Generate wizard-mode coverage sessions for Rogue 3.6.

Uses the C harness with --wizard flag to create sessions that exercise:
- All potion types (P_CONFUSE..P_NOP)
- All scroll types (S_CONFUSE..S_GENOCIDE)
- All weapon types (MACE..SPEAR)
- All armor types (LEATHER..PLATE_MAIL)
- All ring types (R_PROTECT..R_STEALTH)
- All stick types (WS_LIGHT..WS_CANCEL)

Starting pack in wizard mode (seed=42):
  a=food, b=ring_mail(worn), c=mace(wielded), d=bow, e=arrows

After wizard create, pack slot depends on item type:
  Potion(!), Scroll(?), Ring(=), Stick(/): inserted at b (rest shift)
  Weapon()), Armor(]): inserted at c (after ring_mail)

So after creating item at b: a=food, b=new_item, c=ring_mail, d=mace, e=bow, f=arrows
After creating item at c: a=food, b=ring_mail, c=new_item, d=mace, e=bow, f=arrows

Sessions are saved to rogue/test/sessions/ with names wizard_<category>_<N>_<name>.json
Each session JSON has "wizard": true so replay_test.mjs enables g.wizard=true.
"""

import subprocess
import os
import sys
import json
import argparse

HERE    = os.path.dirname(os.path.abspath(__file__))
HARNESS = os.path.join(HERE, "rogue_harness")
RUNNER  = os.path.join(HERE, "run_session.py")

SESSIONS_DIR = os.path.normpath(os.path.join(HERE, "../../test/sessions"))

SEED = 42


def run_session(name, seed, keys, outfile, wizard=True, timeout=30):
    """Run the C harness and save session JSON with wizard=true added."""
    tmp = outfile + ".tmp"
    cmd = [sys.executable, RUNNER,
           "--seed", str(seed),
           "--keys", keys,
           "--out", tmp]
    if wizard:
        cmd.append("--wizard")

    try:
        result = subprocess.run(cmd, capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        print(f"  TIMEOUT: {name}", flush=True)
        return False

    if not os.path.exists(tmp):
        print(f"  FAILED (no output): {name}", flush=True)
        if result.stderr:
            print("  stderr:", result.stderr.decode(errors="replace")[:200])
        return False

    with open(tmp) as f:
        data = json.load(f)
    os.unlink(tmp)

    if wizard:
        data["wizard"] = True

    with open(outfile, "w") as f:
        json.dump(data, f, separators=(',', ':'))
        f.write('\n')

    n_steps = len(data.get("steps", []))
    print(f"  OK: {name} ({n_steps} steps)", flush=True)
    return True


def which_char(n):
    """Convert 0-15 to 0-9 / a-f."""
    return str(n) if n < 10 else chr(ord('a') + n - 10)


# ---- POTIONS ----
# After C!<w>: item at slot 'b', ring_mail at 'c', mace at 'd'
# P_CONFUSE=0  P_PARALYZE=1  P_POISON=2   P_STRENGTH=3  P_SEEINVIS=4
# P_HEALING=5  P_MFIND=6     P_TFIND=7    P_RAISE=8     P_XHEAL=9
# P_HASTE=10   P_RESTORE=11  P_BLIND=12   P_NOP=13
POTION_SESSIONS = [
    (0,  "confuse",   "C!0qb"),
    (1,  "paralyze",  "C!1qb"),
    (2,  "poison",    "C!2qb"),
    (3,  "strength",  "C!3qb"),
    (4,  "seeinvis",  "C!4qb"),
    (5,  "healing",   "C!5qb"),
    (6,  "mfind",     "C!6qb"),
    (7,  "tfind",     "C!7qb"),
    (8,  "raise",     "C!8qb"),
    (9,  "xheal",     "C!9qb"),
    (10, "haste",     "C!aqb"),
    (11, "restore",   "C!bqb"),
    (12, "blind",     "C!cqb"),
    (13, "nop",       "C!dqb"),
]

# ---- SCROLLS ----
# After C?<w>: scroll at 'b', ring_mail at 'c', mace at 'd', bow at 'e', arrows at 'f'
# S_CONFUSE=0  S_MAP=1    S_LIGHT=2   S_HOLD=3    S_SLEEP=4
# S_ARMOR=5    S_IDENT=6  S_SCARE=7   S_GFIND=8   S_TELEP=9
# S_ENCH=10    S_CREATE=11 S_REMOVE=12 S_AGGR=13  S_NOP=14  S_GENOCIDE=15
SCROLL_SESSIONS = [
    (0,  "confuse",   "C?0rb"),          # S_CONFUSE
    (1,  "map",       "C?1rb"),          # S_MAP
    (2,  "light",     "C?2rb"),          # S_LIGHT
    (3,  "hold",      "C?3rb"),          # S_HOLD
    (4,  "sleep",     "C?4rb"),          # S_SLEEP
    (5,  "armor",     "C?5rbc"),         # S_ARMOR — enchant worn armor (at 'c')
    (6,  "ident",     "C?6rba"),         # S_IDENT — identify food (at 'a')
    (7,  "scare",     "C?7rb"),          # S_SCARE (drop and scare monsters)
    (8,  "gfind",     "C?8rb"),          # S_GFIND (gold find)
    (9,  "telep",     "C?9rb"),          # S_TELEP (teleport)
    (10, "ench",      "C?arbd"),         # S_ENCH — enchant wielded weapon (at 'd')
    (11, "create",    "C?brb"),          # S_CREATE (create monster)
    (12, "remove",    "C?crb"),          # S_REMOVE (remove curse — shows cursed items)
    (13, "aggr",      "C?drb"),          # S_AGGR (aggravate monsters)
    (14, "nop",       "C?erb"),          # S_NOP (blank scroll)
    (15, "genocide",  "C?frbA"),         # S_GENOCIDE — target 'A' (Ants)
]

# ---- WEAPONS ----
# After C)<w><bless>: weapon at 'c', ring_mail at 'b', mace at 'd'
# Wield 'c' to equip.
# MACE=0 SWORD=1 BOW=2 ARROW=3 DAGGER=4 ROCK=5 TWOSWORD=6
# SLING=7 DART=8 CROSSBOW=9 BOLT=10 SPEAR=11
WEAPON_SESSIONS = [
    (0,  "mace",     "C)0nwc"),
    (1,  "sword",    "C)1nwc"),
    (2,  "bow",      "C)2nwc"),
    (3,  "arrow",    "C)3nwc"),
    (4,  "dagger",   "C)4nwc"),
    (5,  "rock",     "C)5nwc"),
    (6,  "twosword", "C)6nwc"),
    (7,  "sling",    "C)7nwc"),
    (8,  "dart",     "C)8nwc"),
    (9,  "crossbow", "C)9nwc"),
    (10, "bolt",     "C)anwc"),
    (11, "spear",    "C)bnwc"),
]

# ---- ARMOR ----
# After C]<w><bless>: armor at 'c', ring_mail at 'b', mace at 'd'
# Take off current armor ('T'), then wear new ('W' + 'c')
# LEATHER=0 RING_MAIL=1 STUDDED=2 SCALE=3 CHAIN=4 SPLINT=5 BANDED=6 PLATE=7
ARMOR_SESSIONS = [
    (0, "leather",  "C]0nTWc"),
    (1, "ringmail",  "C]1nTWc"),
    (2, "studded",   "C]2nTWc"),
    (3, "scale",     "C]3nTWc"),
    (4, "chain",     "C]4nTWc"),
    (5, "splint",    "C]5nTWc"),
    (6, "banded",    "C]6nTWc"),
    (7, "plate",     "C]7nTWc"),
]

# ---- RINGS ----
# After C=<w>[bless]: ring at 'b', ring_mail at 'c', mace at 'd'
# For R_PROTECT(0), R_ADDSTR(1), R_ADDHIT(7), R_ADDDAM(8): blessing prompt ('n')
# For others: no blessing prompt
# Put on right finger: P + b + r
# R_PROTECT=0 R_ADDSTR=1 R_SUSTSTR=2 R_SEARCH=3 R_SEEINVIS=4 R_NOP=5
# R_AGGR=6 R_ADDHIT=7 R_ADDDAM=8 R_REGEN=9 R_DIGEST=10 R_TELEPORT=11 R_STEALTH=12
RING_SESSIONS = [
    (0,  "protect",  "C=0nPbr"),   # R_PROTECT — blessing 'n' → rnd(2)+1
    (1,  "addstr",   "C=1nPbr"),   # R_ADDSTR
    (2,  "suststr",  "C=2Pbr"),    # no blessing
    (3,  "search",   "C=3Pbr"),
    (4,  "seeinvis", "C=4Pbr"),
    (5,  "nop",      "C=5Pbr"),
    (6,  "aggr",     "C=6Pbr"),
    (7,  "addhit",   "C=7nPbr"),   # R_ADDHIT — blessing 'n'
    (8,  "adddam",   "C=8nPbr"),   # R_ADDDAM — blessing 'n'
    (9,  "regen",    "C=9Pbr"),
    (10, "digest",   "C=aPbr"),
    (11, "teleport", "C=bPbr"),
    (12, "stealth",  "C=cPbr"),
]

# ---- STICKS ----
# After C/<w>: stick at 'b', ring_mail at 'c', mace at 'd', bow at 'e'
# Zap: z + b + h (direction west)
# WS_LIGHT=0 WS_HIT=1 WS_ELECT=2 WS_FIRE=3 WS_COLD=4 WS_POLYMORPH=5
# WS_MISSILE=6 WS_HASTE_M=7 WS_SLOW_M=8 WS_DRAIN=9 WS_NOP=10
# WS_TELAWAY=11 WS_TELTO=12 WS_CANCEL=13
STICK_SESSIONS = [
    (0,  "light",     "C/0zbh"),
    (1,  "hit",       "C/1zbh"),
    (2,  "elect",     "C/2zbh"),
    (3,  "fire",      "C/3zbh"),
    (4,  "cold",      "C/4zbh"),
    (5,  "polymorph", "C/5zbh"),
    (6,  "missile",   "C/6zbh"),
    (7,  "haste_m",   "C/7zbh"),
    (8,  "slow_m",    "C/8zbh"),
    (9,  "drain",     "C/9zbh"),
    (10, "nop",       "C/azbh"),
    (11, "telaway",   "C/bzbh"),
    (12, "telto",     "C/czbh"),
    (13, "cancel",    "C/dzbh"),
]


def make_sessions(category_name, sessions_list, prefix, seed):
    print(f"=== {category_name} ===")
    for (which, name, keys) in sessions_list:
        fname = os.path.join(SESSIONS_DIR, f"wizard_{prefix}_{which:02d}_{name}.json")
        run_session(f"{prefix}_{which:02d}_{name}", seed, keys, fname)


def main():
    p = argparse.ArgumentParser(description="Generate wizard-mode coverage sessions")
    p.add_argument("--category",
                   choices=["potions","scrolls","weapons","armor","rings","sticks","all"],
                   default="all")
    p.add_argument("--seed", type=int, default=SEED)
    args = p.parse_args()

    seed = args.seed

    os.makedirs(SESSIONS_DIR, exist_ok=True)

    if not os.path.exists(HARNESS):
        print(f"ERROR: harness not found at {HARNESS}", file=sys.stderr)
        sys.exit(1)

    cat = args.category
    if cat in ("potions", "all"):  make_sessions("Potions", POTION_SESSIONS, "potion", seed)
    if cat in ("scrolls", "all"):  make_sessions("Scrolls", SCROLL_SESSIONS, "scroll", seed)
    if cat in ("weapons", "all"):  make_sessions("Weapons", WEAPON_SESSIONS, "weapon", seed)
    if cat in ("armor",   "all"):  make_sessions("Armor",   ARMOR_SESSIONS,  "armor",  seed)
    if cat in ("rings",   "all"):  make_sessions("Rings",   RING_SESSIONS,   "ring",   seed)
    if cat in ("sticks",  "all"):  make_sessions("Sticks",  STICK_SESSIONS,  "stick",  seed)

    print("Done.")


if __name__ == "__main__":
    main()
