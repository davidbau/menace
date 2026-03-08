#!/usr/bin/env python3
"""
make_coverage_sessions.py — Generate sessions targeting JS coverage gaps.

Sessions target:
  - command.js: help(), u_level(), identify(), call_item(), picky_inven, version, ctrl-r
  - rip.js:     death() — player dies in wizard mode at high level
  - wizard.js:  Ctrl-D, Ctrl-E, Ctrl-A, @, Ctrl-I (new wizard commands)
  - rings.js:   ring_on/ring_off edge cases
  - pack.js:    picky_inven

Each session is compared against the C harness for screen parity.
"""

import subprocess
import os
import sys
import json
import argparse

HERE     = os.path.dirname(os.path.abspath(__file__))
HARNESS  = os.path.join(HERE, "rogue_harness")
RUNNER   = os.path.join(HERE, "run_session.py")

SESSIONS_DIR = os.path.normpath(os.path.join(HERE, "../../test/sessions"))


def run_session(name, seed, keys, outfile, wizard=False, timeout=60):
    """Run C harness, optionally inject wizard=true, save JSON."""
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
            print("  stderr:", result.stderr.decode(errors="replace")[:300])
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


SEED = 42   # primary seed for coverage sessions


# ===== Command.js coverage =====
#
# help():      '?' + char   (lines 382-420)
# u_level():   '<'          (lines 359-376)
# identify():  '/' + char   (lines 483-519)
# call_item(): 'c'          (lines 426-477)
# picky_inven: 'I'          (line 241)
# version:     'v'          (line 267)
# Ctrl-R:      '\x12'       (line 274-275)

COMMAND_SESSIONS = [
    # help for all (*) — exercises the full-screen help path
    ("help_all",     SEED, False, "?* "),        # '?' + '*' + space to close
    # help for single key 'h' — exercises the single-char lookup path
    ("help_single",  SEED, False, "?h"),
    # try to go up without amulet — "I see no way up."
    ("u_level_fail", SEED, False, "<"),
    # identify a monster ('K' = kobold)
    ("identify_K",   SEED, False, "/K"),
    # identify → escape (ESC path in identify)
    ("identify_esc", SEED, False, "/\x1b"),
    # version message ('v')
    ("version",      SEED, False, "v"),
    # Ctrl-R reprint message
    ("ctrl_r",       SEED, False, "\x12"),
    # picky inventory — show items with type filter, then escape
    ("picky_inven",  SEED, False, "I\x1b"),
    # quit then say no ('Q' + 'n')
    ("quit_no",      SEED, False, "Qn"),
]

# call_item: wizard session — create a potion then call it
# After C!0: potion at 'b', press 'c' to call, select 'b', type name + Enter
# The name we type goes through get_line() which reads chars until Enter
CALL_ITEM_SESSIONS = [
    # Create confuse potion (C!0), then call it 'c' + 'b' + "Grog" + Enter
    ("call_item_potion", SEED, True, "C!0cb" + "Grog" + "\r"),
    # Call already-identified item ('I' inventory first, then try 'c' on ring_mail)
    # ring_mail is identified (ISKNOW), so 'c' should say "already identified"
    ("call_item_known",  SEED, False, "cbyy"),   # 'c' on a non-callable item → "can't call that"
]


# ===== rip.js coverage =====
#
# death(): go to high level in wizard mode, walk into monsters
# Ctrl-D × 18 → level 19, then move around until death
# At level 19: monsters include Quagga(Q), Rattlesnake(R), Slime(S), Troll(T)...
# Troll: lvl=6, arm=4, dmg="1d8/1d8/2d6" ≈ 16 avg/round
# Player HP ≈ 12, armor AC ≈ 4. Should die in 1 round vs Troll.
# Use enough moves (40) to guarantee monster encounter.
# NO extra space needed (C exits after death, JS throws SessionDone in wait_for).
DEATH_SESSIONS = [
    # wizard, level 19, south+east movement
    ("death_wizard_19", SEED, True, "\x04" * 18 + "j" * 20 + "l" * 20),
    # wizard, level 26, direct south (maximum danger)
    ("death_wizard_26", SEED, True, "\x04" * 25 + "j" * 15),
]


# ===== Wizard.js coverage =====
#
# These exercise the new Ctrl-key wizard commands (lines 126-213 of wizard.js).
# All in wizard mode (seed=42).
WIZARD_CMD_SESSIONS = [
    # Ctrl-A: show pack item count  (line ~148)
    ("wizard_ctrl_a",  SEED, True, "\x01"),
    # Ctrl-E: show food_left         (line ~143)
    ("wizard_ctrl_e",  SEED, True, "\x05"),
    # @: show hero position          (line ~127)
    ("wizard_at",      SEED, True, "@"),
    # Ctrl-D × 2: go down 2 levels   (line ~134)
    ("wizard_ctrl_d2", SEED, True, "\x04\x04"),
    # Ctrl-X: show monsters window    (line ~138)
    ("wizard_ctrl_x",  SEED, True, "\x18"),
    # Ctrl-I: floor inventory         (line ~131)
    ("wizard_ctrl_i",  SEED, True, "\x09\x1b"),   # I + ESC to close inventory
    # Ctrl-H: god mode (9 levels + best gear)  (line ~154)
    ("wizard_ctrl_h",  SEED, True, "\x08"),
    # Unknown wizard command → "Illegal command"
    ("wizard_unknown", SEED, True, "\x02"),   # Ctrl-B: unknown
]


# ===== Rings.js coverage (additional) =====
#
# Lines 43-46: trying to put on ring when slot already full
# Lines 55-62: ring_off()
# Lines 98-125: ring effects in ring_on
# Lines 138-140: specific ring type handlers
# Lines 147-159: ring type handlers
#
# Wizard: create ring, put on, then remove (ring_off)
# Wearing a ring while another ring is on triggers "already wearing" message

RING_EXTRA_SESSIONS = [
    # Create aggravate ring, put on (exercises aggravate effect in ring_on)
    # Then put on another ring on same finger → "already wearing" msg
    # C=6=R_AGGR: "C=6Pbr" puts on aggravate ring on right finger
    # Then try to put on another ring on right: "C=0nPbr" (protect ring on right)
    # With both Pb and another Pb: second Pb triggers "wearing two" branch
    ("ring_double_right", SEED, True, "C=6Pbr" + "C=0nPbr"),   # two rings right
    # Put ring on left finger ('l' direction): P + b + 'l'
    ("ring_left_finger",  SEED, True, "C=3Pbl"),   # search ring on left finger
    # ring_off: Put ring on, then take it off ('R')
    ("ring_off_right",    SEED, True, "C=3PbrRbr"),  # put on right, take off right
    # ring_off: not wearing any ring
    ("ring_off_none",     SEED, False, "Rb"),  # try to remove ring when not wearing any
]


def make_sessions(category_name, sessions):
    """sessions: list of (name, seed, wizard, keys)"""
    print(f"=== {category_name} ===")
    for (name, seed, wizard, keys) in sessions:
        fname = os.path.join(SESSIONS_DIR, f"cov_{name}.json")
        run_session(name, seed, keys, fname, wizard=wizard)


def main():
    p = argparse.ArgumentParser(description="Generate coverage gap sessions")
    p.add_argument("--category",
                   choices=["command", "call", "death", "wizard", "rings", "all"],
                   default="all")
    args = p.parse_args()

    os.makedirs(SESSIONS_DIR, exist_ok=True)

    if not os.path.exists(HARNESS):
        print(f"ERROR: harness not found at {HARNESS}", file=sys.stderr)
        sys.exit(1)

    cat = args.category
    if cat in ("command", "all"): make_sessions("Command.js coverage", COMMAND_SESSIONS)
    if cat in ("call",    "all"): make_sessions("call_item coverage",   CALL_ITEM_SESSIONS)
    if cat in ("death",   "all"): make_sessions("rip.js coverage",      DEATH_SESSIONS)
    if cat in ("wizard",  "all"): make_sessions("wizard.js coverage",   WIZARD_CMD_SESSIONS)
    if cat in ("rings",   "all"): make_sessions("rings.js extra",       RING_EXTRA_SESSIONS)

    print("Done.")


if __name__ == "__main__":
    main()
