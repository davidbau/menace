#!/usr/bin/env python3
"""
Fix test files that use hardcoded _CLASS values or import _CLASS from const.js.

1. bones.test.js: Replace hardcoded oclass numbers with named constants
2. autopickup_test.js: Replace hardcoded oclass number with named constant
3. pickup_types.test.js: Change import source from const.js to objects.js
4. object_accuracy.test.js: Update hardcoded expected values to match new C numbering
5. object_types_accuracy.test.js: Same
6. potion_scroll_accuracy.test.js: Update hardcoded POTION_CLASS/SCROLL_CLASS values
7. spell_accuracy.test.js: Update hardcoded SPBOOK_CLASS value
"""

import re

# New C-canonical values (RANDOM_CLASS=0 added, everything shifted +1)
NEW_VALUES = {
    'RANDOM_CLASS': 0, 'ILLOBJ_CLASS': 1, 'WEAPON_CLASS': 2, 'ARMOR_CLASS': 3,
    'RING_CLASS': 4, 'AMULET_CLASS': 5, 'TOOL_CLASS': 6, 'FOOD_CLASS': 7,
    'POTION_CLASS': 8, 'SCROLL_CLASS': 9, 'SPBOOK_CLASS': 10, 'WAND_CLASS': 11,
    'COIN_CLASS': 12, 'GEM_CLASS': 13, 'ROCK_CLASS': 14, 'BALL_CLASS': 15,
    'CHAIN_CLASS': 16, 'VENOM_CLASS': 17,
}

def fix_file(filepath, edits):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    changed = False
    for lineno, old_text, new_text in edits:
        idx = lineno - 1
        if idx < len(lines) and old_text in lines[idx]:
            lines[idx] = lines[idx].replace(old_text, new_text)
            changed = True
        else:
            # Try fuzzy match on any line
            for i, line in enumerate(lines):
                if old_text in line:
                    lines[i] = line.replace(old_text, new_text)
                    changed = True
                    break

    if changed:
        with open(filepath, 'w') as f:
            f.writelines(lines)
    return changed

def fix_with_content(filepath, replacements):
    """Apply string replacements to file content."""
    with open(filepath, 'r') as f:
        content = f.read()

    original = content
    for old, new in replacements:
        content = content.replace(old, new)

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

# 1. Fix bones.test.js — add import and replace hardcoded oclass values
print("Fixing bones.test.js...")
with open('test/unit/bones.test.js', 'r') as f:
    content = f.read()

# Add import if missing
if 'WEAPON_CLASS' not in content.split("from '../../js/objects.js'")[0] if "from '../../js/objects.js'" in content else True:
    # Add import for class constants from objects.js
    old_import = "import { COLNO, ROWNO, ACCESSIBLE } from '../../js/const.js';"
    new_import = old_import + "\nimport { WEAPON_CLASS, ARMOR_CLASS, FOOD_CLASS, GEM_CLASS, TOOL_CLASS } from '../../js/objects.js';"
    content = content.replace(old_import, new_import)

# Replace all hardcoded oclass values based on item name context
# Use regex to be precise about what we're replacing
replacements = [
    # dagger/sword -> WEAPON_CLASS
    (r"(name: 'dagger'[^}]*?)oclass: \d+", r"\1oclass: WEAPON_CLASS"),
    (r"(name: 'sword'[^}]*?)oclass: \d+", r"\1oclass: WEAPON_CLASS"),
    # shield -> ARMOR_CLASS
    (r"(name: 'shield'[^}]*?)oclass: \d+", r"\1oclass: ARMOR_CLASS"),
    # plate mail -> ARMOR_CLASS
    (r"(name: 'plate mail'[^}]*?)oclass: \d+", r"\1oclass: ARMOR_CLASS"),
    # food/food ration -> FOOD_CLASS
    (r"(name: 'food'[^,]*,[^}]*?)oclass: \d+", r"\1oclass: FOOD_CLASS"),
    (r"(name: 'food ration'[^}]*?)oclass: \d+", r"\1oclass: FOOD_CLASS"),
    # corpse -> FOOD_CLASS
    (r"(name: 'corpse'[^}]*?)oclass: \d+", r"\1oclass: FOOD_CLASS"),
    # gem -> GEM_CLASS
    (r"(name: 'gem'[^}]*?)oclass: \d+", r"\1oclass: GEM_CLASS"),
    # sack -> TOOL_CLASS
    (r"(name: 'sack'[^}]*?)oclass: \d+", r"\1oclass: TOOL_CLASS"),
]

for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content)

# Remove old inline comments about class mapping
content = content.replace("   // WEAPON_CLASS -> ')'", '')
content = content.replace("      // FOOD_CLASS -> '%'", '')

with open('test/unit/bones.test.js', 'w') as f:
    f.write(content)
print("  Done")

# 2. Fix autopickup_test.js
print("Fixing autopickup_test.js...")
with open('test/unit/autopickup_test.js', 'r') as f:
    content = f.read()

# Already imports WEAPON_CLASS from const.js, but const.js no longer exports it
# Change to import from objects.js
if "from '../../js/const.js'" in content:
    content = content.replace(
        "import { POTION_CLASS, SCROLL_CLASS, WEAPON_CLASS, RING_CLASS } from '../../js/const.js';",
        "import { POTION_CLASS, SCROLL_CLASS, WEAPON_CLASS, RING_CLASS } from '../../js/objects.js';"
    )

content = content.replace('oclass: 10', 'oclass: WEAPON_CLASS')

with open('test/unit/autopickup_test.js', 'w') as f:
    f.write(content)
print("  Done")

# 3. Fix pickup_types.test.js — change import from const.js to objects.js
print("Fixing pickup_types.test.js...")
fix_with_content('test/unit/pickup_types.test.js', [
    ("from '../../js/const.js'", "from '../../js/objects.js'"),
])
print("  Done")

# 4. Fix object_accuracy.test.js — update all hardcoded values
print("Fixing object_accuracy.test.js...")
replacements_oa = [
    # Import RANDOM_CLASS too
    ("  VENOM_CLASS\n} from '../../js/objects.js';",
     "  VENOM_CLASS, RANDOM_CLASS, MAXOCLASSES\n} from '../../js/objects.js';"),

    # Update "should match C NetHack object classes" test
    ("assert.strictEqual(ILLOBJ_CLASS, 0, 'ILLOBJ_CLASS should be 0');",
     "assert.strictEqual(RANDOM_CLASS, 0, 'RANDOM_CLASS should be 0');\n      assert.strictEqual(ILLOBJ_CLASS, 1, 'ILLOBJ_CLASS should be 1');"),
    ("WEAPON_CLASS, 1, 'WEAPON_CLASS should be 1'", "WEAPON_CLASS, 2, 'WEAPON_CLASS should be 2'"),
    ("ARMOR_CLASS, 2, 'ARMOR_CLASS should be 2'", "ARMOR_CLASS, 3, 'ARMOR_CLASS should be 3'"),
    ("RING_CLASS, 3, 'RING_CLASS should be 3'", "RING_CLASS, 4, 'RING_CLASS should be 4'"),
    ("AMULET_CLASS, 4, 'AMULET_CLASS should be 4'", "AMULET_CLASS, 5, 'AMULET_CLASS should be 5'"),
    ("TOOL_CLASS, 5, 'TOOL_CLASS should be 5'", "TOOL_CLASS, 6, 'TOOL_CLASS should be 6'"),
    ("FOOD_CLASS, 6, 'FOOD_CLASS should be 6'", "FOOD_CLASS, 7, 'FOOD_CLASS should be 7'"),
    ("POTION_CLASS, 7, 'POTION_CLASS should be 7'", "POTION_CLASS, 8, 'POTION_CLASS should be 8'"),
    ("SCROLL_CLASS, 8, 'SCROLL_CLASS should be 8'", "SCROLL_CLASS, 9, 'SCROLL_CLASS should be 9'"),
    ("SPBOOK_CLASS, 9, 'SPBOOK_CLASS should be 9'", "SPBOOK_CLASS, 10, 'SPBOOK_CLASS should be 10'"),
    ("WAND_CLASS, 10, 'WAND_CLASS should be 10'", "WAND_CLASS, 11, 'WAND_CLASS should be 11'"),
    ("COIN_CLASS, 11, 'COIN_CLASS should be 11'", "COIN_CLASS, 12, 'COIN_CLASS should be 12'"),
    ("GEM_CLASS, 12, 'GEM_CLASS should be 12'", "GEM_CLASS, 13, 'GEM_CLASS should be 13'"),
    ("ROCK_CLASS, 13, 'ROCK_CLASS should be 13'", "ROCK_CLASS, 14, 'ROCK_CLASS should be 14'"),
    ("BALL_CLASS, 14, 'BALL_CLASS should be 14'", "BALL_CLASS, 15, 'BALL_CLASS should be 15'"),
    ("CHAIN_CLASS, 15, 'CHAIN_CLASS should be 15'", "CHAIN_CLASS, 16, 'CHAIN_CLASS should be 16'"),
    ("VENOM_CLASS, 16, 'VENOM_CLASS should be 16'", "VENOM_CLASS, 17, 'VENOM_CLASS should be 17'"),

    # Update sequential test — add RANDOM_CLASS at start
    ("// C ref: Object classes are sequential from 0 to 16\n      const classes = [\n        ILLOBJ_CLASS,",
     "// C ref: Object classes are sequential from 0 to 17\n      const classes = [\n        RANDOM_CLASS, ILLOBJ_CLASS,"),

    # Update ILLOBJ_CLASS semantics test
    ("assert.strictEqual(ILLOBJ_CLASS, 0,\n        'ILLOBJ_CLASS (illegal object) should be 0');",
     "assert.strictEqual(ILLOBJ_CLASS, 1,\n        'ILLOBJ_CLASS (illegal object) should be 1');"),

    # Update "should have exactly 17 object classes"
    ("it('should have exactly 17 object classes'",
     "it('should have exactly 18 object classes (including RANDOM_CLASS)'"),
    ("// C ref: NetHack has 17 object classes (0-16)",
     "// C ref: NetHack has 18 object classes (0-17, including RANDOM_CLASS)"),
    ("assert.strictEqual(VENOM_CLASS, 16,\n        'VENOM_CLASS (last class) should be 16');",
     "assert.strictEqual(VENOM_CLASS, 17,\n        'VENOM_CLASS (last class) should be 17');"),

    # Update Special Object Handling
    ("assert.strictEqual(ILLOBJ_CLASS, 0,\n        'ILLOBJ_CLASS is 0 (falsy value for validation)');",
     "assert.strictEqual(ILLOBJ_CLASS, 1,\n        'ILLOBJ_CLASS is 1');"),
    ("assert.strictEqual(COIN_CLASS, 11, 'Coins are class 11');",
     "assert.strictEqual(COIN_CLASS, 12, 'Coins are class 12');"),
    ("assert.strictEqual(VENOM_CLASS, 16, 'VENOM_CLASS is highest (16)');",
     "assert.strictEqual(VENOM_CLASS, 17, 'VENOM_CLASS is highest (17)');"),

    # Update Documentation test
    ("// ILLOBJ=0, WEAPON=1, ARMOR=2, RING=3, AMULET=4, TOOL=5,\n      // FOOD=6, POTION=7, SCROLL=8, SPBOOK=9, WAND=10, COIN=11,\n      // GEM=12, ROCK=13, BALL=14, CHAIN=15, VENOM=16",
     "// RANDOM=0, ILLOBJ=1, WEAPON=2, ARMOR=3, RING=4, AMULET=5, TOOL=6,\n      // FOOD=7, POTION=8, SCROLL=9, SPBOOK=10, WAND=11, COIN=12,\n      // GEM=13, ROCK=14, BALL=15, CHAIN=16, VENOM=17"),
    ("ILLOBJ_CLASS: 0, WEAPON_CLASS: 1, ARMOR_CLASS: 2, RING_CLASS: 3,\n        AMULET_CLASS: 4, TOOL_CLASS: 5, FOOD_CLASS: 6, POTION_CLASS: 7,\n        SCROLL_CLASS: 8, SPBOOK_CLASS: 9, WAND_CLASS: 10, COIN_CLASS: 11,\n        GEM_CLASS: 12, ROCK_CLASS: 13, BALL_CLASS: 14, CHAIN_CLASS: 15,\n        VENOM_CLASS: 16",
     "RANDOM_CLASS: 0, ILLOBJ_CLASS: 1, WEAPON_CLASS: 2, ARMOR_CLASS: 3,\n        RING_CLASS: 4, AMULET_CLASS: 5, TOOL_CLASS: 6, FOOD_CLASS: 7,\n        POTION_CLASS: 8, SCROLL_CLASS: 9, SPBOOK_CLASS: 10, WAND_CLASS: 11,\n        COIN_CLASS: 12, GEM_CLASS: 13, ROCK_CLASS: 14, BALL_CLASS: 15,\n        CHAIN_CLASS: 16, VENOM_CLASS: 17"),
]
fix_with_content('test/unit/object_accuracy.test.js', replacements_oa)
print("  Done")

# 5. Fix object_types_accuracy.test.js
print("Fixing object_types_accuracy.test.js...")
replacements_ota = [
    # Import RANDOM_CLASS + MAXOCLASSES
    ("  GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, VENOM_CLASS,",
     "  GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, VENOM_CLASS,\n  RANDOM_CLASS, MAXOCLASSES,"),

    # Fix all value assertions
    ("ILLOBJ_CLASS, 0, 'ILLOBJ_CLASS should be 0'", "ILLOBJ_CLASS, 1, 'ILLOBJ_CLASS should be 1'"),
    ("WEAPON_CLASS, 1, 'WEAPON_CLASS should be 1'", "WEAPON_CLASS, 2, 'WEAPON_CLASS should be 2'"),
    ("ARMOR_CLASS, 2, 'ARMOR_CLASS should be 2'", "ARMOR_CLASS, 3, 'ARMOR_CLASS should be 3'"),
    ("RING_CLASS, 3, 'RING_CLASS should be 3'", "RING_CLASS, 4, 'RING_CLASS should be 4'"),
    ("AMULET_CLASS, 4, 'AMULET_CLASS should be 4'", "AMULET_CLASS, 5, 'AMULET_CLASS should be 5'"),
    ("TOOL_CLASS, 5, 'TOOL_CLASS should be 5'", "TOOL_CLASS, 6, 'TOOL_CLASS should be 6'"),
    ("FOOD_CLASS, 6, 'FOOD_CLASS should be 6'", "FOOD_CLASS, 7, 'FOOD_CLASS should be 7'"),
    ("POTION_CLASS, 7, 'POTION_CLASS should be 7'", "POTION_CLASS, 8, 'POTION_CLASS should be 8'"),
    ("SCROLL_CLASS, 8, 'SCROLL_CLASS should be 8'", "SCROLL_CLASS, 9, 'SCROLL_CLASS should be 9'"),
    ("SPBOOK_CLASS, 9, 'SPBOOK_CLASS should be 9'", "SPBOOK_CLASS, 10, 'SPBOOK_CLASS should be 10'"),
    ("WAND_CLASS, 10, 'WAND_CLASS should be 10'", "WAND_CLASS, 11, 'WAND_CLASS should be 11'"),
    ("COIN_CLASS, 11, 'COIN_CLASS should be 11'", "COIN_CLASS, 12, 'COIN_CLASS should be 12'"),
    ("GEM_CLASS, 12, 'GEM_CLASS should be 12'", "GEM_CLASS, 13, 'GEM_CLASS should be 13'"),
    ("ROCK_CLASS, 13, 'ROCK_CLASS should be 13'", "ROCK_CLASS, 14, 'ROCK_CLASS should be 14'"),
    ("BALL_CLASS, 14, 'BALL_CLASS should be 14'", "BALL_CLASS, 15, 'BALL_CLASS should be 15'"),
    ("CHAIN_CLASS, 15, 'CHAIN_CLASS should be 15'", "CHAIN_CLASS, 16, 'CHAIN_CLASS should be 16'"),
    ("VENOM_CLASS, 16, 'VENOM_CLASS should be 16'", "VENOM_CLASS, 17, 'VENOM_CLASS should be 17'"),

    # Sequential test
    ("it('object classes should be sequential from 0-16'",
     "it('object classes should be sequential from 0-17'"),
    ("ILLOBJ_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS,\n        AMULET_CLASS, TOOL_CLASS, FOOD_CLASS, POTION_CLASS,\n        SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS, COIN_CLASS,\n        GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, VENOM_CLASS\n      ];\n      for (let i = 0; i < classes.length; i++) {\n        assert.strictEqual(classes[i], i, `Object class ${i} should be ${i}`);",
     "RANDOM_CLASS, ILLOBJ_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS,\n        AMULET_CLASS, TOOL_CLASS, FOOD_CLASS, POTION_CLASS,\n        SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS, COIN_CLASS,\n        GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, VENOM_CLASS\n      ];\n      for (let i = 0; i < classes.length; i++) {\n        assert.strictEqual(classes[i], i, `Object class ${i} should be ${i}`);"),

    # ILLOBJ_CLASS should be 0 test -> 1
    ("it('ILLOBJ_CLASS should be 0 (illegal/invalid object)'",
     "it('ILLOBJ_CLASS should be 1 (illegal/invalid object)'"),
    ("ILLOBJ_CLASS, 0, 'ILLOBJ_CLASS is 0 (invalid)'",
     "ILLOBJ_CLASS, 1, 'ILLOBJ_CLASS is 1 (invalid)'"),

    # Unique count 17 -> 18
    ("unique.size, 17, 'All 17 object classes should be unique'",
     "unique.size, 18, 'All 18 object classes should be unique'"),

    # WEAPON_CLASS first after ILLOBJ
    ("WEAPON_CLASS, 1, 'Weapons are first real class'",
     "WEAPON_CLASS, ILLOBJ_CLASS + 1, 'Weapons are first real class'"),

    # Equipment early — widen range
    ("WEAPON_CLASS < 5, 'WEAPON_CLASS early'", "WEAPON_CLASS < 6, 'WEAPON_CLASS early'"),
    ("ARMOR_CLASS < 5, 'ARMOR_CLASS early'", "ARMOR_CLASS < 6, 'ARMOR_CLASS early'"),
    ("RING_CLASS < 5, 'RING_CLASS early'", "RING_CLASS < 6, 'RING_CLASS early'"),
    ("AMULET_CLASS < 5, 'AMULET_CLASS early'", "AMULET_CLASS < 6, 'AMULET_CLASS early'"),

    # Consumables middle — widen range
    ("FOOD_CLASS > 5 && FOOD_CLASS < 10", "FOOD_CLASS > 6 && FOOD_CLASS < 11"),
    ("POTION_CLASS > 5 && POTION_CLASS < 10", "POTION_CLASS > 6 && POTION_CLASS < 11"),
    ("SCROLL_CLASS > 5 && SCROLL_CLASS < 10", "SCROLL_CLASS > 6 && SCROLL_CLASS < 11"),

    # VENOM last
    ("VENOM_CLASS, 16, 'VENOM_CLASS is last (16)'", "VENOM_CLASS, 17, 'VENOM_CLASS is last (17)'"),

    # Range [0, 16] -> [0, 17]
    ("cls >= 0 && cls <= 16", "cls >= 0 && cls <= 17"),
    ("'all object classes should be in valid range [0, 16]'",
     "'all object classes should be in valid range [0, 17]'"),

    # Potion/Scroll constant tests
    ("POTION_CLASS, 7, 'POTION_CLASS is 7'", "POTION_CLASS, 8, 'POTION_CLASS is 8'"),
    ("SCROLL_CLASS, 8, 'SCROLL_CLASS is 8'", "SCROLL_CLASS, 9, 'SCROLL_CLASS is 9'"),
    ("SPBOOK_CLASS, 9, 'SPBOOK_CLASS is 9'", "SPBOOK_CLASS, 10, 'SPBOOK_CLASS is 10'"),

    # 17 object classes -> 18
    ("it('should have exactly 17 object classes'", "it('should have exactly 18 object classes'"),
    ("VENOM_CLASS - ILLOBJ_CLASS + 1, 17, '17 object classes'",
     "VENOM_CLASS - RANDOM_CLASS + 1, 18, '18 object classes'"),

    # Critical constants
    ("it('ILLOBJ_CLASS should be 0 (invalid object marker)'",
     "it('ILLOBJ_CLASS should be 1 (invalid object marker)'"),
    ("ILLOBJ_CLASS, 0, 'ILLOBJ_CLASS must be 0'",
     "ILLOBJ_CLASS, 1, 'ILLOBJ_CLASS must be 1'"),
    ("it('WEAPON_CLASS should be 1 (first valid class)'",
     "it('WEAPON_CLASS should be 2 (first valid class)'"),
    ("WEAPON_CLASS, 1, 'WEAPON_CLASS must be 1'",
     "WEAPON_CLASS, 2, 'WEAPON_CLASS must be 2'"),
    ("it('VENOM_CLASS should be 16 (last object class)'",
     "it('VENOM_CLASS should be 17 (last object class)'"),
    ("VENOM_CLASS, 16, 'VENOM_CLASS must be 16'",
     "VENOM_CLASS, 17, 'VENOM_CLASS must be 17'"),

    # Uniqueness test — add RANDOM_CLASS to the list
    ("const classes = [\n        ILLOBJ_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS,\n        AMULET_CLASS, TOOL_CLASS, FOOD_CLASS, POTION_CLASS,\n        SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS, COIN_CLASS,\n        GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, VENOM_CLASS\n      ];\n      const unique = new Set(classes);\n      assert.strictEqual(unique.size, 18",
     "const classes = [\n        RANDOM_CLASS, ILLOBJ_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS,\n        AMULET_CLASS, TOOL_CLASS, FOOD_CLASS, POTION_CLASS,\n        SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS, COIN_CLASS,\n        GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, VENOM_CLASS\n      ];\n      const unique = new Set(classes);\n      assert.strictEqual(unique.size, 18"),
]
fix_with_content('test/unit/object_types_accuracy.test.js', replacements_ota)
print("  Done")

# 6. Fix potion_scroll_accuracy.test.js
print("Fixing potion_scroll_accuracy.test.js...")
replacements_ps = [
    ("POTION_CLASS, 7, 'POTION_CLASS should be 7'", "POTION_CLASS, 8, 'POTION_CLASS should be 8'"),
    ("SCROLL_CLASS, 8, 'SCROLL_CLASS should be 8'", "SCROLL_CLASS, 9, 'SCROLL_CLASS should be 9'"),
]
fix_with_content('test/unit/potion_scroll_accuracy.test.js', replacements_ps)
print("  Done")

# 7. Fix spell_accuracy.test.js
print("Fixing spell_accuracy.test.js...")
replacements_sa = [
    ("SPBOOK_CLASS, 9, 'SPBOOK_CLASS should be 9'", "SPBOOK_CLASS, 10, 'SPBOOK_CLASS should be 10'"),
    ("// SPBOOK_CLASS=9 follows SCROLL_CLASS=8", "// SPBOOK_CLASS=10 follows SCROLL_CLASS=9"),
    ("SPBOOK_CLASS, 9, 'Spellbooks follow scrolls'", "SPBOOK_CLASS, 10, 'Spellbooks follow scrolls'"),
]
fix_with_content('test/unit/spell_accuracy.test.js', replacements_sa)
print("  Done")

print("\nAll test constant fixes applied.")
