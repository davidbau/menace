#!/usr/bin/env python3
"""
gen_symbols.py — Parse NetHack defsym.h and generate JS symbol constants/tables.

This generator extracts:
- PCHAR/PCHAR2 rows -> S_* cmap constants, MAXPCHARS, defsyms[]
- MONSYM rows       -> monster class constants, MAXMCLASSES, def_monsyms[]
- OBJCLASS/OBJCLASS2 rows -> object class constants/symbols, MAXOCLASSES, def_oc_syms[]

Usage:
  python3 scripts/generators/gen_symbols.py --stdout
"""

from __future__ import annotations

import argparse
import os
import re
import sys

from marker_patch import MarkerSpec, patch_between_markers


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def _pick_existing(*candidates: str) -> str:
    return next((p for p in candidates if os.path.exists(p)), candidates[0])


DEFSYM_H = _pick_existing(
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "defsym.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "defsym.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "defsym.h"),
)
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "..", "..", "js", "symbols.js")
MARKER = MarkerSpec("SYMBOLS")


def _read(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _strip_c_block_comments(text: str) -> str:
    return re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)


def _collapse_line_continuations(text: str) -> str:
    return re.sub(r"\\\n", "", text)


def _split_args(arg_str: str) -> list[str]:
    args: list[str] = []
    cur: list[str] = []
    depth = 0
    in_string = False
    quote = ""
    i = 0
    while i < len(arg_str):
        ch = arg_str[i]
        if in_string:
            cur.append(ch)
            if ch == "\\" and i + 1 < len(arg_str):
                i += 1
                cur.append(arg_str[i])
            elif ch == quote:
                in_string = False
            i += 1
            continue
        if ch in ("'", '"'):
            in_string = True
            quote = ch
            cur.append(ch)
            i += 1
            continue
        if ch == "(":
            depth += 1
            cur.append(ch)
            i += 1
            continue
        if ch == ")":
            depth -= 1
            cur.append(ch)
            i += 1
            continue
        if ch == "," and depth == 0:
            args.append("".join(cur).strip())
            cur = []
            i += 1
            continue
        cur.append(ch)
        i += 1
    tail = "".join(cur).strip()
    if tail:
        args.append(tail)
    return args


def _extract_calls(text: str, names: set[str]) -> list[tuple[str, list[str]]]:
    calls: list[tuple[str, list[str]]] = []
    i = 0
    while i < len(text):
        m = re.search(r"\b([A-Z][A-Z0-9_]*)\s*\(", text[i:])
        if not m:
            break
        name = m.group(1)
        if name not in names:
            i += m.end()
            continue
        start = i + m.start()
        open_paren = i + m.end() - 1
        depth = 1
        j = open_paren + 1
        in_string = False
        quote = ""
        while j < len(text) and depth > 0:
            ch = text[j]
            if in_string:
                if ch == "\\" and j + 1 < len(text):
                    j += 2
                    continue
                if ch == quote:
                    in_string = False
                j += 1
                continue
            if ch in ("'", '"'):
                in_string = True
                quote = ch
                j += 1
                continue
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            j += 1
        if depth != 0:
            i = start + 1
            continue
        args_raw = text[open_paren + 1 : j - 1]
        calls.append((name, _split_args(args_raw)))
        i = j
    return calls


def _decode_c_char_literal(s: str) -> str:
    s = s.strip()
    if len(s) < 2 or s[0] != "'" or s[-1] != "'":
        return s
    inner = s[1:-1]
    # Use python unicode escape for C-style escaped char forms.
    try:
        return bytes(inner, "utf-8").decode("unicode_escape")
    except Exception:
        return inner


def _decode_c_string_literal(s: str) -> str:
    s = s.strip()
    if len(s) < 2 or s[0] != '"' or s[-1] != '"':
        return s
    inner = s[1:-1]
    try:
        return bytes(inner, "utf-8").decode("unicode_escape")
    except Exception:
        return inner


def parse_defsym() -> tuple[list[dict], list[dict], list[dict]]:
    text = _collapse_line_continuations(_strip_c_block_comments(_read(DEFSYM_H)))
    # Ignore preprocessor lines so macro definitions don't get parsed as calls.
    text = "\n".join(line for line in text.splitlines() if not line.lstrip().startswith("#"))
    calls = _extract_calls(text, {"PCHAR", "PCHAR2", "MONSYM", "OBJCLASS", "OBJCLASS2"})

    pchars: list[dict] = []
    monsyms: list[dict] = []
    objclasses: list[dict] = []

    for name, args in calls:
        if name == "PCHAR" and len(args) == 5:
            pchars.append(
                {
                    "idx": int(args[0], 0),
                    "ch": _decode_c_char_literal(args[1]),
                    "sym": args[2].strip(),
                    "desc": _decode_c_string_literal(args[3]),
                    "color": args[4].strip(),
                }
            )
        elif name == "PCHAR2" and len(args) == 6:
            pchars.append(
                {
                    "idx": int(args[0], 0),
                    "ch": _decode_c_char_literal(args[1]),
                    "sym": args[2].strip(),
                    "tilenm": _decode_c_string_literal(args[3]),
                    "desc": _decode_c_string_literal(args[4]),
                    "color": args[5].strip(),
                }
            )
        elif name == "MONSYM" and len(args) == 5:
            monsyms.append(
                {
                    "idx": int(args[0], 0),
                    "ch": _decode_c_char_literal(args[1]),
                    "basename": args[2].strip(),
                    "sym": args[3].strip(),
                    "desc": _decode_c_string_literal(args[4]),
                }
            )
        elif name == "OBJCLASS" and len(args) == 6:
            basename = args[2].strip()
            objclasses.append(
                {
                    "idx": int(args[0], 0),
                    "ch": _decode_c_char_literal(args[1]),
                    "basename": basename,
                    "class": f"{basename}_CLASS",
                    "defchar": f"{basename}_SYM",
                    "sym": args[3].strip(),
                    "name": _decode_c_string_literal(args[4]),
                    "explain": _decode_c_string_literal(args[5]),
                }
            )
        elif name == "OBJCLASS2" and len(args) == 7:
            basename = args[2].strip()
            objclasses.append(
                {
                    "idx": int(args[0], 0),
                    "ch": _decode_c_char_literal(args[1]),
                    "basename": basename,
                    "sname": args[3].strip(),
                    "class": f"{basename}_CLASS",
                    "defchar": args[3].strip(),
                    "sym": args[4].strip(),
                    "name": _decode_c_string_literal(args[5]),
                    "explain": _decode_c_string_literal(args[6]),
                }
            )

    pchars.sort(key=lambda r: r["idx"])
    monsyms.sort(key=lambda r: r["idx"])
    objclasses.sort(key=lambda r: r["idx"])
    return pchars, monsyms, objclasses


def emit_js() -> str:
    pchars, monsyms, objclasses = parse_defsym()
    if not pchars or not monsyms or not objclasses:
        raise RuntimeError("Failed parsing defsym.h rows for one or more symbol groups.")

    out: list[str] = []
    out.append("// Auto-generated symbol constants/tables from include/defsym.h")
    out.append("// DO NOT EDIT — regenerate with: python3 scripts/generators/gen_symbols.py")
    out.append("")

    # Collect color names used in PCHAR_DRAWING and emit import from const.js
    color_names = sorted(set(row["color"] for row in pchars))
    if color_names:
        out.append(f'import {{ {", ".join(color_names)} }} from "./const.js";')
        out.append("")

    out.append("// 1) PCHAR_S_ENUM")
    for row in pchars:
        out.append(f'export const {row["sym"]} = {row["idx"]};')
    out.append("")

    out.append("// 2) PCHAR_DRAWING")
    out.append("export const defsyms = [")
    for row in pchars:
        ch = row["ch"].replace("\\", "\\\\").replace("'", "\\'")
        desc = row["desc"].replace("\\", "\\\\").replace('"', '\\"')
        out.append(f"    {{ ch: '{ch}', desc: \"{desc}\", color: {row['color']} }}, // {row['sym']}")
    out.append("];")
    out.append("")

    out.append("// 3) PCHAR_PARSE")
    out.append("export const PCHAR_PARSE_ROWS = Object.freeze([")
    for row in pchars:
        out.append(f'    ["{row["sym"]}", {row["sym"]}],')
    out.append("]);")
    out.append("")

    out.append("// 4) MONSYMS_DEFCHAR_ENUM")
    for row in monsyms:
        ch = row["ch"].replace("\\", "\\\\").replace("'", "\\'")
        out.append(f"export const DEF_{row['basename']} = '{ch}'.charCodeAt(0);")
    out.append("")

    # 5) MONSYMS_S_ENUM — SKIPPED: S_* constants owned by monsters.js (gen_monsters.py)
    # Emit import for S_* and MAXMCLASSES from monsters.js
    monsym_names = [row["sym"] for row in monsyms]
    out.append(f'import {{ {", ".join(monsym_names)}, MAXMCLASSES }} from "./monsters.js";')
    out.append("")

    out.append("// 6) MONSYMS_DRAWING")
    out.append("export const def_monsyms = [")
    out.append("    { sym: '\\\\0', name: \"\", explain: \"\" },")
    for row in monsyms:
        ch = row["ch"].replace("\\", "\\\\").replace("'", "\\'")
        desc = row["desc"].replace("\\", "\\\\").replace('"', '\\"')
        out.append(f"    {{ sym: '{ch}', name: \"\", explain: \"{desc}\" }}, // {row['sym']}")
    out.append("];")
    out.append("")

    out.append("// 7) MONSYMS_PARSE")
    out.append("export const MONSYMS_PARSE_ROWS = Object.freeze([")
    for row in monsyms:
        out.append(f'    ["{row["sym"]}", {row["sym"]}],')
    out.append("]);")
    out.append("")

    out.append("// 8) OBJCLASS_DEFCHAR_ENUM")
    for row in objclasses:
        ch = row["ch"].replace("\\", "\\\\").replace("'", "\\'")
        out.append(f"export const {row['defchar']} = '{ch}'.charCodeAt(0);")
    out.append("")

    # 9) OBJCLASS_CLASS_ENUM — SKIPPED: _CLASS constants owned by objects.js (gen_objects.py)

    out.append("// 10) OBJCLASS_S_ENUM")
    for row in objclasses:
        out.append(f'export const {row["sym"]} = {row["idx"]};')
    out.append("")

    out.append("// 11) OBJCLASS_DRAWING")
    out.append("export const def_oc_syms = [")
    out.append("    { sym: '\\\\0', name: \"\", explain: \"\" },")
    for row in objclasses:
        ch = row["ch"].replace("\\", "\\\\").replace("'", "\\'")
        name = row["name"].replace("\\", "\\\\").replace('"', '\\"')
        explain = row["explain"].replace("\\", "\\\\").replace('"', '\\"')
        out.append(f"    {{ sym: '{ch}', name: \"{name}\", explain: \"{explain}\" }}, // {row['class']}")
    out.append("];")
    out.append(f"export const MAXPCHARS = {pchars[-1]['idx'] + 1};")
    # MAXMCLASSES — SKIPPED: owned by monsters.js (gen_monsters.py)
    # MAXOCLASSES — SKIPPED: owned by objects.js (gen_objects.py)
    out.append("")

    out.append("// 12) OBJCLASS_PARSE")
    out.append("export const OBJCLASS_PARSE_ROWS = Object.freeze([")
    for row in objclasses:
        out.append(f'    ["{row["sym"]}", {row["sym"]}],')
    out.append("]);")
    out.append("")

    out.append("// 13) PCHAR_TILES")
    out.append("export const PCHAR_TILES_ROWS = Object.freeze([")
    for row in pchars:
        tile_name = row.get("tilenm", row["desc"])
        tile_name = tile_name.replace("\\", "\\\\").replace('"', '\\"')
        desc = row["desc"].replace("\\", "\\\\").replace('"', '\\"')
        out.append(f'    [{row["sym"]}, "{tile_name}", "{desc}"],')
    out.append("]);")
    out.append("")

    out.append("// Derived constants that depend on PCHAR symbol ordinals")
    out.append("export const MAXDCHARS = S_water - S_stone + 1;")
    out.append("export const MAXECHARS = S_expl_br - S_vbeam + 1;")
    out.append("")
    return "\n".join(out)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate JS symbols from defsym.h")
    parser.add_argument("--stdout", action="store_true", help="Print generated JS to stdout")
    parser.add_argument("--output", default=OUTPUT_PATH, help="Target file path (default: js/const.js)")
    args = parser.parse_args()

    js = emit_js()
    if args.stdout:
        print(js)
        return
    patch_between_markers(args.output, MARKER, js)
    print(f"Patched {args.output} ({MARKER.tag})", file=sys.stderr)


if __name__ == "__main__":
    main()
