#!/usr/bin/env python3
"""
gen_artifacts.py — Parse NetHack artilist.h and generate js/artifacts.js

Reads the C macro definitions in artilist.h and artifact.h and produces
a JavaScript data file with the artifact table, SPFX_* constants, ART_*
enum constants, and invoke property constants.

Usage:
    python3 gen_artifacts.py > js/artifacts.js
"""

import re
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_ARTILIST_H_CANDIDATES = [
    os.path.join(SCRIPT_DIR, 'nethack-c', 'include', 'artilist.h'),
    os.path.join(SCRIPT_DIR, '..', '..', 'nethack-c', 'include', 'artilist.h'),
]
ARTILIST_H = next((p for p in _ARTILIST_H_CANDIDATES if os.path.exists(p)), _ARTILIST_H_CANDIDATES[0])

# ── SPFX_ flags (from artifact.h) ─────────────────────────────────────
SPFX = {
    'SPFX_NONE':    0x00000000,
    'SPFX_NOGEN':   0x00000001,
    'SPFX_RESTR':   0x00000002,
    'SPFX_INTEL':   0x00000004,
    'SPFX_SPEAK':   0x00000008,
    'SPFX_SEEK':    0x00000010,
    'SPFX_WARN':    0x00000020,
    'SPFX_ATTK':    0x00000040,
    'SPFX_DEFN':    0x00000080,
    'SPFX_DRLI':    0x00000100,
    'SPFX_SEARCH':  0x00000200,
    'SPFX_BEHEAD':  0x00000400,
    'SPFX_HALRES':  0x00000800,
    'SPFX_ESP':     0x00001000,
    'SPFX_STLTH':   0x00002000,
    'SPFX_REGEN':   0x00004000,
    'SPFX_EREGEN':  0x00008000,
    'SPFX_HSPDAM':  0x00010000,
    'SPFX_HPHDAM':  0x00020000,
    'SPFX_TCTRL':   0x00040000,
    'SPFX_LUCK':    0x00080000,
    'SPFX_DMONS':   0x00100000,
    'SPFX_DCLAS':   0x00200000,
    'SPFX_DFLAG1':  0x00400000,
    'SPFX_DFLAG2':  0x00800000,
    'SPFX_DALIGN':  0x01000000,
    'SPFX_DBONUS':  0x01F00000,
    'SPFX_XRAY':    0x02000000,
    'SPFX_REFLECT': 0x04000000,
    'SPFX_PROTECT': 0x08000000,
}

# ── Alignment constants ───────────────────────────────────────────────
ALIGN = {
    'A_NONE': -128,
    'A_CHAOTIC': -1,
    'A_NEUTRAL': 0,
    'A_LAWFUL': 1,
}

# ── Color constants ───────────────────────────────────────────────────
COLORS = {
    'NO_COLOR': 8,
    'CLR_BLACK': 0, 'CLR_RED': 1, 'CLR_GREEN': 2, 'CLR_BROWN': 3,
    'CLR_BLUE': 4, 'CLR_MAGENTA': 5, 'CLR_CYAN': 6, 'CLR_GRAY': 7,
    'CLR_ORANGE': 9, 'CLR_BRIGHT_GREEN': 10,
    'CLR_YELLOW': 11, 'CLR_BRIGHT_BLUE': 12,
    'CLR_BRIGHT_MAGENTA': 13, 'CLR_BRIGHT_CYAN': 14, 'CLR_WHITE': 15,
}

# ── Object type constants (from objects.js) ───────────────────────────
OBJ_TYPES = {
    'STRANGE_OBJECT': 0,
    'LONG_SWORD': 54, 'RUNESWORD': 58, 'WAR_HAMMER': 76,
    'BATTLE_AXE': 45, 'ORCISH_DAGGER': 36, 'ELVEN_BROADSWORD': 53,
    'ELVEN_DAGGER': 35, 'ATHAME': 38, 'BROADSWORD': 52,
    'SILVER_MACE': 74, 'SILVER_SABER': 51, 'MORNING_STAR': 75,
    'KATANA': 56, 'TSURUGI': 57,
    'QUARTERSTAFF': 79, 'MACE': 73, 'BOW': 83,
    'CRYSTAL_BALL': 229, 'LUCKSTONE': 467, 'MIRROR': 228,
    'HELM_OF_BRILLIANCE': 96, 'SKELETON_KEY': 219,
    'CREDIT_CARD': 221, 'LENSES': 230, 'AMULET_OF_ESP': 199,
}

# ── Monster/role constants ────────────────────────────────────────────
# C artilist.h uses PM_* for role fields — these are the monster indices
MON_PM = {
    'NON_PM': -1,
    'PM_ARCHEOLOGIST': 331, 'PM_BARBARIAN': 332, 'PM_CAVE_DWELLER': 333,
    'PM_HEALER': 334, 'PM_KNIGHT': 335, 'PM_MONK': 336,
    'PM_CLERIC': 337, 'PM_RANGER': 338, 'PM_ROGUE': 339,
    'PM_SAMURAI': 340, 'PM_TOURIST': 341, 'PM_VALKYRIE': 342,
    'PM_WIZARD': 343,
    # Race pseudo-monsters
    'PM_ELF': 264, 'PM_ORC': 72, 'PM_HUMAN': 260,
}

# ── Monster class symbols ─────────────────────────────────────────────
MONSYMS = {
    'S_DRAGON': 30, 'S_OGRE': 41, 'S_TROLL': 46,
}

# ── Monster flags ─────────────────────────────────────────────────────
MFLAGS = {
    'M2_UNDEAD': 0x00000002, 'M2_WERE': 0x00000004,
    'M2_ELF': 0x00000010, 'M2_ORC': 0x00000080,
    'M2_DEMON': 0x00000100, 'M2_GIANT': 0x00002000,
}

# ── Attack damage types (from monsters.js) ────────────────────────────
AD_TYPES = {
    'AD_PHYS': 0, 'AD_MAGM': 1, 'AD_FIRE': 2, 'AD_COLD': 3,
    'AD_ELEC': 6, 'AD_DRST': 7, 'AD_BLND': 11, 'AD_STUN': 12,
    'AD_DRLI': 15, 'AD_WERE': 29,
}

# ── Invoke properties (from artifact.h, LAST_PROP=63) ────────────────
LAST_PROP = 63
# Regular properties used as inv_prop values (from prop.h / const.js)
PROP_CONSTANTS = {
    'INVIS': 33,
    'LEVITATION': 38,
    'CONFLICT': 41,
}

INVOKE_PROPS = {
    'TAMING':        LAST_PROP + 1,  # 64
    'HEALING':       LAST_PROP + 2,
    'ENERGY_BOOST':  LAST_PROP + 3,
    'UNTRAP':        LAST_PROP + 4,
    'CHARGE_OBJ':    LAST_PROP + 5,
    'LEV_TELE':      LAST_PROP + 6,
    'CREATE_PORTAL': LAST_PROP + 7,
    'ENLIGHTENING':  LAST_PROP + 8,
    'CREATE_AMMO':   LAST_PROP + 9,
    'BANISH':        LAST_PROP + 10,
    'FLING_POISON':  LAST_PROP + 11,
    'FIRESTORM':     LAST_PROP + 12,
    'SNOWSTORM':     LAST_PROP + 13,
    'BLINDING_RAY':  LAST_PROP + 14,
}

# Combined constant lookup (order matters — more specific first)
ALL_CONSTANTS = {}
ALL_CONSTANTS.update(SPFX)
ALL_CONSTANTS.update(ALIGN)
ALL_CONSTANTS.update(COLORS)
ALL_CONSTANTS.update(OBJ_TYPES)
ALL_CONSTANTS.update(MON_PM)
ALL_CONSTANTS.update(MONSYMS)
ALL_CONSTANTS.update(MFLAGS)
ALL_CONSTANTS.update(AD_TYPES)
ALL_CONSTANTS.update(PROP_CONSTANTS)
ALL_CONSTANTS.update(INVOKE_PROPS)

# ── Helpers ───────────────────────────────────────────────────────────

def resolve_expr(expr):
    """Resolve a C constant expression to a numeric value."""
    expr = expr.strip()
    # Remove L suffix
    expr = re.sub(r'(\d+)L\b', r'\1', expr)

    # Simple integer
    if re.match(r'^-?\d+$', expr):
        return int(expr)
    if re.match(r'^0x[0-9a-fA-F]+$', expr):
        return int(expr, 16)

    # Single known constant
    if expr in ALL_CONSTANTS:
        return ALL_CONSTANTS[expr]

    # Bitwise OR expression: (SPFX_A | SPFX_B | ...)
    # Strip outer parens
    inner = expr.strip()
    if inner.startswith('(') and inner.endswith(')'):
        inner = inner[1:-1].strip()

    parts = [p.strip() for p in inner.split('|')]
    if all(p in ALL_CONSTANTS or re.match(r'^0x[0-9a-fA-F]+$|^-?\d+$', p) for p in parts):
        result = 0
        for p in parts:
            if p in ALL_CONSTANTS:
                result |= ALL_CONSTANTS[p]
            elif re.match(r'^0x', p):
                result |= int(p, 16)
            else:
                result |= int(p)
        return result

    print(f"WARNING: Cannot resolve expression: {expr!r}", file=sys.stderr)
    return 0


def parse_attack_macro(text):
    """Parse an attack macro like PHYS(5,10), DRLI(0,0), NO_ATTK, DFNS(AD_MAGM), CARY(AD_FIRE)."""
    text = text.strip()

    if text in ('NO_ATTK', 'NO_DFNS', 'NO_CARY'):
        return {'at': 0, 'ad': 0, 'dice': 0, 'sides': 0}

    # DFNS(c) or CARY(c) => {0, c, 0, 0}
    m = re.match(r'(?:DFNS|CARY)\((\w+)\)', text)
    if m:
        ad = resolve_expr(m.group(1))
        return {'at': 0, 'ad': ad, 'dice': 0, 'sides': 0}

    # PHYS(a,b), DRLI(a,b), COLD(a,b), etc.
    macro_to_ad = {
        'PHYS': 'AD_PHYS', 'DRLI': 'AD_DRLI', 'COLD': 'AD_COLD',
        'FIRE': 'AD_FIRE', 'ELEC': 'AD_ELEC', 'STUN': 'AD_STUN',
        'POIS': 'AD_DRST',
    }
    m = re.match(r'(\w+)\(([^,]+),\s*([^)]+)\)', text)
    if m and m.group(1) in macro_to_ad:
        macro_name = m.group(1)
        a = resolve_expr(m.group(2))
        b = resolve_expr(m.group(3))
        ad = AD_TYPES[macro_to_ad[macro_name]]
        return {'at': 0, 'ad': ad, 'dice': a, 'sides': b}

    # Raw {0, AD_PHYS, a, b} — shouldn't appear, but handle
    print(f"WARNING: Unknown attack macro: {text!r}", file=sys.stderr)
    return {'at': 0, 'ad': 0, 'dice': 0, 'sides': 0}


def split_top_level_args(text):
    """Split comma-separated arguments respecting parentheses."""
    args = []
    depth = 0
    current = []
    for ch in text:
        if ch == '(' :
            depth += 1
            current.append(ch)
        elif ch == ')':
            depth -= 1
            current.append(ch)
        elif ch == ',' and depth == 0:
            args.append(''.join(current).strip())
            current = []
        else:
            current.append(ch)
    if current:
        args.append(''.join(current).strip())
    return args


def parse_artilist():
    """Parse artilist.h and return list of artifact entries."""
    with open(ARTILIST_H) as f:
        text = f.read()

    # Remove C comments
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    text = re.sub(r'//.*', '', text)

    # Skip #if 0 blocks
    lines = text.split('\n')
    filtered = []
    skip_depth = 0
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('#if 0'):
            skip_depth += 1
            continue
        if skip_depth > 0:
            if stripped.startswith('#if'):
                skip_depth += 1
            elif stripped.startswith('#endif'):
                skip_depth -= 1
            continue
        # Skip preprocessor directives
        if stripped.startswith('#'):
            continue
        filtered.append(line)

    text = '\n'.join(filtered)

    # Find all A(...) macro invocations
    # They span multiple lines; we need to match balanced parens
    artifacts = []
    i = 0
    while i < len(text):
        # Find A( at start of expression context
        m = re.search(r'\bA\s*\(', text[i:])
        if not m:
            break
        start = i + m.start() + m.end() - m.start()
        # Now find matching close paren
        depth = 1
        j = i + m.end()
        while j < len(text) and depth > 0:
            if text[j] == '(':
                depth += 1
            elif text[j] == ')':
                depth -= 1
            j += 1
        if depth != 0:
            break
        body = text[i + m.end():j - 1]
        i = j

        # Parse the 17 arguments
        args = split_top_level_args(body)
        if len(args) < 17:
            if len(args) >= 2 and args[0].strip() == '0' and args[1].strip() == '0':
                # terminator entry
                continue
            print(f"WARNING: A() with {len(args)} args: {args[:3]}...", file=sys.stderr)
            continue

        nam_raw = args[0].strip()
        if nam_raw == '0' or nam_raw == 'NULL':
            nam = ''
        else:
            nam = nam_raw.strip('"')
        typ = args[1].strip()
        s1 = args[2].strip()   # spfx
        s2 = args[3].strip()   # cspfx
        mt = args[4].strip()   # mtype
        atk = args[5].strip()  # attack macro
        dfn = args[6].strip()  # defense macro
        cry = args[7].strip()  # carry macro
        inv = args[8].strip()  # invoke property
        al = args[9].strip()   # alignment
        cl = args[10].strip()  # role
        rac = args[11].strip() # race
        gs = args[12].strip()  # gen_spe
        gv = args[13].strip()  # gift_value
        cost = args[14].strip()# cost
        clr = args[15].strip() # acolor
        bn = args[16].strip()  # basename (for ART_##bn)

        artifacts.append({
            'name': nam,
            'bn': bn,
            'otyp': resolve_expr(typ),
            'otyp_name': typ,
            'spfx': resolve_expr(s1),
            'cspfx': resolve_expr(s2),
            'mtype': resolve_expr(mt),
            'attk': parse_attack_macro(atk),
            'defn': parse_attack_macro(dfn),
            'cary': parse_attack_macro(cry),
            'inv_prop': resolve_expr(inv),
            'alignment': resolve_expr(al),
            'role': resolve_expr(cl),
            'race': resolve_expr(rac),
            'gen_spe': resolve_expr(gs),
            'gift_value': resolve_expr(gv),
            'cost': resolve_expr(cost.rstrip('L')),
            'acolor': resolve_expr(clr),
        })

    return artifacts


def format_attack(atk):
    """Format an attack object as JS."""
    return f"{{at:{atk['at']},ad:{atk['ad']},dice:{atk['dice']},sides:{atk['sides']}}}"


def generate_js(artifacts):
    """Generate the artifacts.js JavaScript source."""
    lines = []
    lines.append('// artifacts.js — Auto-generated from nethack-c/include/artilist.h')
    lines.append('// DO NOT EDIT — regenerate with: python3 scripts/generators/gen_artifacts.py > js/artifacts.js')
    lines.append('')

    # SPFX constants
    lines.append('// ── SPFX_ flags (artifact special effects) ──')
    for name, val in SPFX.items():
        lines.append(f'export const {name} = 0x{val:08X};')
    lines.append('')

    # Invoke property constants
    lines.append('// ── Invoke property types ──')
    for name, val in INVOKE_PROPS.items():
        lines.append(f'export const {name} = {val};')
    lines.append('')

    # ART_ enum constants
    lines.append('// ── ART_ artifact index constants ──')
    lines.append(f'export const ART_NONARTIFACT = 0;')
    for i, art in enumerate(artifacts):
        if art['name'] == '':
            continue
        lines.append(f"export const ART_{art['bn']} = {i};")
    lines.append(f'export const AFTER_LAST_ARTIFACT = {len(artifacts)};')
    lines.append(f'export const NROFARTIFACTS = {len(artifacts) - 1};')
    lines.append('')

    # artilist array
    lines.append('// ── Artifact data table ──')
    lines.append('// Fields: otyp, name, spfx, cspfx, mtype, attk, defn, cary,')
    lines.append('//         inv_prop, alignment, role, race, gen_spe, gift_value, cost, acolor')
    lines.append('export const artilist = [')

    for i, art in enumerate(artifacts):
        name_str = f'"{art["name"]}"' if art['name'] else '""'
        atk_str = format_attack(art['attk'])
        dfn_str = format_attack(art['defn'])
        cry_str = format_attack(art['cary'])
        comment = f' // [{i}] {art["name"]}' if art['name'] else f' // [{i}] dummy'
        lines.append(f'  {{otyp:{art["otyp"]},name:{name_str},'
                     f'spfx:0x{art["spfx"]:08X},cspfx:0x{art["cspfx"]:08X},'
                     f'mtype:{art["mtype"]},'
                     f'attk:{atk_str},defn:{dfn_str},cary:{cry_str},'
                     f'inv_prop:{art["inv_prop"]},'
                     f'alignment:{art["alignment"]},role:{art["role"]},race:{art["race"]},'
                     f'gen_spe:{art["gen_spe"]},gift_value:{art["gift_value"]},'
                     f'cost:{art["cost"]},acolor:{art["acolor"]}}},{comment}')

    lines.append('];')
    lines.append('')

    return '\n'.join(lines) + '\n'


if __name__ == '__main__':
    artifacts = parse_artilist()
    if not artifacts:
        print("ERROR: No artifacts parsed!", file=sys.stderr)
        sys.exit(1)

    js = generate_js(artifacts)
    sys.stdout.write(js)

    # Summary to stderr
    print(f"Generated {len(artifacts)} artifacts ({len(artifacts)-1} real + 1 dummy)", file=sys.stderr)
