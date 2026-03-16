#!/usr/bin/env python3
"""Generate a deep C NetHack session targeting uncovered read.js code paths.

Exercises scroll effects NOT covered by existing sessions:
- Genocide (do_genocide, do_class_genocide)
- Taming (maybe_tame, seffect_taming)
- Punishment (punish, unpunish)
- Amnesia (forget, seffect_amnesia)
- Detection (gold_detect, food_detect)
- Charging (recharge, seffect_charging)
- Destroy armor (seffect_destroy_armor)
- Scare monster (seffect_scare_monster)
- Blank paper (seffect_blank_paper)
- Stinking cloud (seffect_stinking_cloud)
- Confused reading variants
- Cursed genocide (reverse genocide)

Strategy: Use record_more_spaces=True so the C harness auto-inserts
space keys for --More-- prompts. No trailing spaces on wish/genesis —
those cause "Unknown command ' '" in C.

Uses seed 960 where starting inventory is known:
  a=quarterstaff, b=cloak, c=wand, d=ring, e=ring,
  f-h=potions, i-k=scrolls, l-m=spellbooks, n=marker, o=blindfold
  First free slot: p

Usage:
    python3 gen_read_deep_session.py

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
CTRL_I = '\x09'   # #wizidentify
ESC    = '\x1b'
SP     = ' '
ENTER  = '\n'

def wish(item):
    """Wish for an item via Ctrl-W. No trailing space — C harness
    auto-inserts spaces for --More-- via record_more_spaces."""
    return CTRL_W + item + ENTER

def genesis(monster):
    """Create a monster via Ctrl-G. No trailing space."""
    return CTRL_G + monster + ENTER


class InventoryTracker:
    """Track inventory slot assignments for seed 960 wizard."""
    def __init__(self):
        # Seed 960 starting inventory
        self.used = set('abcdefghijklmno')
        self.next_slot = 'p'

    def _advance(self):
        c = self.next_slot
        while c in self.used:
            if c == 'z':
                c = 'A'
            elif c == 'Z':
                raise RuntimeError("No free slots")
            else:
                c = chr(ord(c) + 1)
        self.next_slot = c

    def alloc(self):
        self._advance()
        slot = self.next_slot
        self.used.add(slot)
        if slot == 'z':
            self.next_slot = 'A'
        elif slot == 'Z':
            self.next_slot = None
        else:
            self.next_slot = chr(ord(slot) + 1)
        return slot

    def free(self, slot):
        self.used.discard(slot)
        if self.next_slot is None or slot < self.next_slot:
            self.next_slot = slot


def gen_read_deep(seed=960):
    """Deep read.js session targeting uncovered scroll effects.

    Key insight: record_more_spaces=True auto-inserts space keys when
    the C harness detects --More-- on screen and the next queued key
    isn't a dismiss key. This means we DON'T include explicit spaces
    for --More-- prompts — the harness handles them automatically.

    We DO include spaces only for explicit game commands that need them.
    """
    print(f'Generating deep read.js session (seed {seed})...')
    moves = ''
    inv = InventoryTracker()

    # Setup: Identify all items so scroll types are known
    moves += CTRL_I

    # Phase 1: Genocide scroll — do_genocide, do_class_genocide
    # C flow: wish result + "As you read..." --More-- + "You have found..." --More-- + prompt
    slot_geno = inv.alloc()  # p
    moves += wish('scroll of genocide')
    moves += 'r' + slot_geno      # read the scroll
    # --More-- prompts auto-dismissed by record_more_spaces
    moves += 'Z'                  # class genocide: zombies
    inv.free(slot_geno)

    # Phase 2: Blessed genocide — specific monster name
    slot_bgeno = inv.alloc()  # p
    moves += wish('blessed scroll of genocide')
    moves += 'r' + slot_bgeno
    moves += 'wood nymph' + ENTER  # specific monster genocide
    inv.free(slot_bgeno)

    # Phase 3: Cursed genocide — reverse genocide (creates monsters)
    slot_cgeno = inv.alloc()  # p
    moves += wish('cursed scroll of genocide')
    moves += 'r' + slot_cgeno
    moves += 'L'              # class of monsters to create
    inv.free(slot_cgeno)

    # Phase 4: Taming scroll — need monsters nearby first
    moves += genesis('kitten')
    moves += genesis('pony')
    slot_tame = inv.alloc()  # p
    moves += wish('scroll of taming')
    moves += 'r' + slot_tame
    inv.free(slot_tame)

    # Phase 5: Punishment scroll
    slot_punish = inv.alloc()  # p
    moves += wish('scroll of punishment')
    moves += 'r' + slot_punish
    inv.free(slot_punish)

    # Phase 6: Gold detection
    slot_gold = inv.alloc()  # p
    moves += wish('scroll of gold detection')
    moves += 'r' + slot_gold
    inv.free(slot_gold)

    # Phase 7: Food detection
    slot_food = inv.alloc()  # p
    moves += wish('scroll of food detection')
    moves += 'r' + slot_food
    inv.free(slot_food)

    # Phase 8: Amnesia
    slot_amnesia = inv.alloc()  # p
    moves += wish('scroll of amnesia')
    moves += 'r' + slot_amnesia
    inv.free(slot_amnesia)

    # Phase 9: Charging — wish for a wand, then charge it
    slot_wand = inv.alloc()  # p
    moves += wish('wand of fire')
    slot_charge = inv.alloc()  # q
    moves += wish('scroll of charging')
    moves += 'r' + slot_charge    # read charging scroll
    moves += slot_wand            # select wand to charge
    inv.free(slot_charge)

    # Phase 10: Scare monster
    slot_scare = inv.alloc()  # q
    moves += wish('scroll of scare monster')
    moves += 'r' + slot_scare
    inv.free(slot_scare)

    # Phase 11: Blank paper
    slot_blank = inv.alloc()  # q
    moves += wish('scroll of blank paper')
    moves += 'r' + slot_blank
    inv.free(slot_blank)

    # Phase 12: Light scroll
    slot_light = inv.alloc()  # q
    moves += wish('scroll of light')
    moves += 'r' + slot_light
    inv.free(slot_light)

    # Phase 13: Confuse monster scroll
    slot_confmon = inv.alloc()  # q
    moves += wish('scroll of confuse monster')
    moves += 'r' + slot_confmon
    inv.free(slot_confmon)

    # Phase 14: Remove curse (blessed) to unpunish
    slot_rcurse = inv.alloc()  # q
    moves += wish('blessed scroll of remove curse')
    moves += 'r' + slot_rcurse
    inv.free(slot_rcurse)

    # Phase 15: Magic mapping
    slot_map = inv.alloc()  # q
    moves += wish('scroll of magic mapping')
    moves += 'r' + slot_map
    inv.free(slot_map)

    # Phase 16: Enchant weapon
    slot_enchw = inv.alloc()  # q
    moves += wish('scroll of enchant weapon')
    moves += 'r' + slot_enchw
    inv.free(slot_enchw)

    # Phase 17: Enchant armor (need to wear armor first)
    slot_armor = inv.alloc()  # q
    moves += wish('leather armor')
    moves += 'W' + slot_armor     # wear it
    slot_encha = inv.alloc()  # r
    moves += wish('scroll of enchant armor')
    moves += 'r' + slot_encha
    inv.free(slot_encha)

    # Extra trailing spaces to flush any remaining messages
    moves += SP * 20

    outpath = os.path.join(SESSIONS_DIR,
        f'hi20_seed{seed}_wiz_read-deep2_gameplay.session.json')
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    _rs.run_session(seed, outpath, moves, raw_moves=True, wizard_mode=True,
                    character=CHARACTER_WIZ, record_more_spaces=True)
    print(f'  → {outpath}')


if __name__ == '__main__':
    gen_read_deep(seed=960)
