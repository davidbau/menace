#!/usr/bin/env python3
"""
gen_constants.py — Parse C headers and patch generated constants blocks in js/const.js.

Sources:
- include/global.h, rm.h (map/global block)
- include/skills.h, monst.h (weapon/skills block)
- include/*.h (all const-style object macros)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

from marker_patch import MarkerSpec, patch_between_markers


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def _pick_existing(*candidates: str) -> str:
    return next((p for p in candidates if os.path.exists(p)), candidates[0])


SKILLS_H = _pick_existing(
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "skills.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "skills.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "skills.h"),
)
MONST_H = _pick_existing(
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "monst.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "monst.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "monst.h"),
)
GLOBAL_H = _pick_existing(
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "global.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "global.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "global.h"),
)
RM_H = _pick_existing(
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "rm.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "rm.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "rm.h"),
)
HACK_H = _pick_existing(
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "hack.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "hack.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "hack.h"),
)
INCLUDE_DIR = os.path.dirname(HACK_H)

OUTPUT_PATH = os.path.join(SCRIPT_DIR, "..", "..", "js", "const.js")
MARKER_GLOBAL_RM = MarkerSpec("CONST_GLOBAL_RM")
MARKER_ALL_HEADERS = MarkerSpec("CONST_ALL_HEADERS")
MARKER_ALL_HEADERS_POST = MarkerSpec("CONST_ALL_HEADERS_POST")
MARKER_WEAPON = MarkerSpec("CONST_WEAPON_SKILLS")

# Version constants are owned manually/version.js integration at top of const.js.
HEADER_MACRO_BLACKLIST_EXACT = {
    "PATCHLEVEL",
}
HEADER_MACRO_BLACKLIST_PREFIXES = (
    "VERSION_",
)

# Header macros which are compile-time annotations or runtime expressions in C
# and should not be emitted as JS constants.
HEADER_MACRO_NON_EMITTABLE: dict[str, str] = {
    "SHOP_WALL_DMG": "depends on runtime ACURRSTR (not a pure constant)",
    "UNDEFINED_PTR": "C pointer sentinel (NULL), not meaningful as JS const",
    "VOICEONLY": "macro alias to UNUSED (compile-time annotation)",
    "SOUNDLIBONLY": "macro alias to UNUSED (compile-time annotation)",
    "N_DIRS_Z": "kept manual with direction arrays and DIR_* ordering contract",
    "DLBFILE": "platform/filesystem path constant; not used in web runtime",
    "DUMPLOG_FILE": "platform/filesystem path template; not used in web runtime",
    "HACKDIR": "platform/filesystem path constant; not used in web runtime",
    "NROFARTIFACTS": "owned by artifacts.js (derived from AFTER_LAST_ARTIFACT)",
    "P": "objects.h alias; owned by objects.js with objclass.h direction constants",
    "S": "objects.h alias; owned by objects.js with objclass.h direction constants",
    "B": "objects.h alias; owned by objects.js with objclass.h direction constants",
    "PAPER": "objects.h alias; owned by objects.js material constants",
}

# Header ownership routing: const.js intentionally does not emit these.
HEADER_OWNED_BY_LEAF: set[str] = {
    "display.h",   # owned by symbols.js
    "permonst.h",  # owned by monsters.js
    "objclass.h",  # owned by objects.js
    "artifact.h",  # owned by artifacts.js (SPFX_*, ART_*, invoke constants)
    "monattk.h",   # owned by monsters.js (AD_*, AT_*)
    "monsym.h",    # owned by monsters.js (S_*)
    "monflag.h",   # owned by monsters.js (M1_*, M2_*, M3_*, G_*, MZ_*, MS_*)
}

# Root blocker ownership hints for deferred constants.
# These map unresolved symbols to the leaf module that owns them.
ROOT_BLOCKER_OWNER_HINTS: dict[str, str] = {
    # monsters.js generated constants
    "NUMMONS": "monsters.js",
    "PM_LONG_WORM_TAIL": "monsters.js",
    # objects.js generated constants
    "NUM_OBJECTS": "objects.js",
    "FIRST_REAL_GEM": "objects.js",
    "LAST_REAL_GEM": "objects.js",
    "FIRST_GLASS_GEM": "objects.js",
    "LAST_GLASS_GEM": "objects.js",
    "FIRST_SPELL": "objects.js",
    "LAST_SPELL": "objects.js",
    # artifacts.js generated constants
    "AFTER_LAST_ARTIFACT": "artifacts.js",
    # symbols.js generated constants
    "MAXPCHARS": "symbols.js",
    "MAXMCLASSES": "symbols.js",
    "GLYPH_ALTAR_OFF": "symbols.js",
    "GLYPH_ZAP_OFF": "symbols.js",
    "GLYPH_SWALLOW_OFF": "symbols.js",
    # objects.js
    "MAXOCLASSES": "objects.js",
}

# Platform compatibility defaults for curses-ish environments (Ubuntu/ncurses).
# These are explicit JS fallbacks where C headers depend on external ncurses
# macros that are not available in this JS build.
PLATFORM_DEFAULT_CONSTS: list[tuple[str, str, str]] = [
    ("LEFTBUTTON", "0x2", "FROM_LEFT_1ST_BUTTON_PRESSED fallback"),
    ("MIDBUTTON", "0x80", "FROM_LEFT_2ND_BUTTON_PRESSED fallback"),
    ("RIGHTBUTTON", "0x800", "RIGHTMOST_BUTTON_PRESSED fallback"),
    ("MOUSEMASK", "(LEFTBUTTON | RIGHTBUTTON | MIDBUTTON)", "mouse button mask fallback"),
    ("A_LEFTLINE", "0", "A_LEFT fallback disabled in web renderer"),
    ("A_RIGHTLINE", "0", "A_RIGHT fallback disabled in web renderer"),
    ("A_ITALIC", "0", "A_UNDERLINE fallback disabled in web renderer"),
]


def _read(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _strip_c_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    return text


def _strip_cpp_comment_outside_quotes(line: str) -> str:
    out: list[str] = []
    in_single = False
    in_double = False
    escaped = False
    i = 0
    while i < len(line):
        ch = line[i]
        nxt = line[i + 1] if i + 1 < len(line) else ""
        if escaped:
            out.append(ch)
            escaped = False
            i += 1
            continue
        if ch == "\\":
            out.append(ch)
            escaped = True
            i += 1
            continue
        if not in_double and ch == "'":
            in_single = not in_single
            out.append(ch)
            i += 1
            continue
        if not in_single and ch == '"':
            in_double = not in_double
            out.append(ch)
            i += 1
            continue
        if not in_single and not in_double and ch == "/" and nxt == "/":
            break
        out.append(ch)
        i += 1
    return "".join(out)


def _collapse_line_continuations(text: str) -> str:
    return re.sub(r"\\\n", "", text)


def _parse_defines(text: str, names: list[str]) -> dict[str, str]:
    cleaned = _strip_c_comments(_collapse_line_continuations(text))
    result: dict[str, str] = {}
    for n in names:
        m = re.search(rf"^\s*#define\s+{re.escape(n)}\s+(.+?)\s*$", cleaned, re.MULTILINE)
        if m:
            result[n] = _strip_cpp_comment_outside_quotes(m.group(1)).strip()
    return result


def _parse_define_int(text: str, name: str) -> str | None:
    m = re.search(rf"^\s*#define\s+{re.escape(name)}\s+([^\s/][^\n]*)$", text, re.MULTILINE)
    if not m:
        return None
    return m.group(1).strip()


def _parse_enum_block(text: str, enum_name: str) -> list[tuple[str, str]]:
    m = re.search(rf"enum\s+{re.escape(enum_name)}\s*\{{(.*?)\}};", text, re.DOTALL)
    if not m:
        return []
    body = _strip_c_comments(m.group(1))
    out: list[tuple[str, str]] = []
    for raw in body.split(","):
        line = raw.strip()
        if not line or "=" not in line:
            continue
        name, val = line.split("=", 1)
        out.append((name.strip(), val.strip()))
    return out


def _parse_object_defines(text: str, *, ignore: set[str] | None = None) -> list[tuple[str, str]]:
    ignore = ignore or set()
    cleaned = _strip_c_comments(_collapse_line_continuations(text))
    out: list[tuple[str, str]] = []
    for raw in cleaned.splitlines():
        line = _strip_cpp_comment_outside_quotes(raw).strip()
        if not line:
            continue
        m = re.match(r"^#define\s+([A-Z][A-Z0-9_]*)(\(([^)]*)\))?\s+(.+)$", line)
        if not m:
            continue
        name = m.group(1)
        if name in ignore:
            continue
        is_function_like = bool(m.group(2))
        if is_function_like:
            continue
        value = m.group(4).strip()
        if value:
            out.append((name, value))
    return out


def _split_csv_top_level(body: str) -> list[str]:
    parts: list[str] = []
    cur: list[str] = []
    depth = 0
    in_single = False
    in_double = False
    escaped = False
    for ch in body:
        if escaped:
            cur.append(ch)
            escaped = False
            continue
        if ch == "\\":
            cur.append(ch)
            escaped = True
            continue
        if not in_double and ch == "'":
            in_single = not in_single
            cur.append(ch)
            continue
        if not in_single and ch == '"':
            in_double = not in_double
            cur.append(ch)
            continue
        if in_single or in_double:
            cur.append(ch)
            continue
        if ch in "([{":
            depth += 1
            cur.append(ch)
            continue
        if ch in ")]}":
            depth = max(0, depth - 1)
            cur.append(ch)
            continue
        if ch == "," and depth == 0:
            token = "".join(cur).strip()
            if token:
                parts.append(token)
            cur = []
            continue
        cur.append(ch)
    tail = "".join(cur).strip()
    if tail:
        parts.append(tail)
    return parts


def _parse_enum_constants(text: str) -> list[tuple[str, str]]:
    cleaned = _strip_c_comments(_collapse_line_continuations(text))
    out: list[tuple[str, str]] = []

    i = 0
    n = len(cleaned)
    while i < n:
        m = re.search(r"\benum\b", cleaned[i:])
        if not m:
            break
        enum_pos = i + m.start()
        brace = cleaned.find("{", enum_pos)
        if brace < 0:
            i = enum_pos + 4
            continue

        # Ensure this "enum" really introduces this brace (skip forward decls).
        semi = cleaned.find(";", enum_pos)
        if semi >= 0 and semi < brace:
            i = semi + 1
            continue

        depth = 1
        j = brace + 1
        while j < n and depth > 0:
            if cleaned[j] == "{":
                depth += 1
            elif cleaned[j] == "}":
                depth -= 1
            j += 1
        if depth != 0:
            i = brace + 1
            continue

        body = cleaned[brace + 1 : j - 1]
        prev_name: str | None = None
        for item in _split_csv_top_level(body):
            if not item:
                continue
            # Keep only macro-style enum constants for const.js.
            m_item = re.match(r"^\s*([A-Z_][A-Z0-9_]*)\s*(?:=\s*(.+))?$", item)
            if not m_item:
                continue
            name = m_item.group(1)
            expr = m_item.group(2).strip() if m_item.group(2) else (f"({prev_name} + 1)" if prev_name else "0")
            out.append((name, _sanitize_c_expr_for_js(expr)))
            prev_name = name

        i = j
    return out


def _is_blacklisted_header_macro(name: str) -> bool:
    if name in HEADER_MACRO_BLACKLIST_EXACT:
        return True
    return any(name.startswith(prefix) for prefix in HEADER_MACRO_BLACKLIST_PREFIXES)


def _parse_local_includes(text: str) -> list[str]:
    includes: list[str] = []
    for line in text.splitlines():
        m = re.match(r'^\s*#\s*include\s+[<"]([^">]+)[">]', line)
        if not m:
            continue
        includes.append(os.path.basename(m.group(1)))
    return includes


def _header_paths_include_order(include_dir: str) -> list[str]:
    header_names = sorted(name for name in os.listdir(include_dir) if name.endswith(".h"))
    header_set = set(header_names)
    deps: dict[str, list[str]] = {}
    for name in header_names:
        text = _read(os.path.join(include_dir, name))
        deps[name] = [dep for dep in _parse_local_includes(text) if dep in header_set]

    order: list[str] = []
    visiting: set[str] = set()
    visited: set[str] = set()

    def dfs(name: str) -> None:
        if name in visited:
            return
        if name in visiting:
            # Cycle: keep deterministic behavior by breaking recursion.
            return
        visiting.add(name)
        for dep in deps.get(name, []):
            dfs(dep)
        visiting.remove(name)
        visited.add(name)
        order.append(name)

    for name in header_names:
        dfs(name)
    return [os.path.join(include_dir, name) for name in order]


def _sanitize_c_expr_for_js(expr: str) -> str:
    expr = expr.strip()
    # Drop C-style casts for lowercase type names (e.g., "(seenV) 0x01" -> "0x01").
    # This preserves grouping for uppercase macro groupings like "(MAXOCLASSES + 1)".
    expr = re.sub(r"\(\s*[A-Za-z_]*[a-z][A-Za-z0-9_]*(?:\s*\*+)?\s*\)\s*", "", expr)
    # Remove C integer suffixes (U/L/UL/...) from literals.
    expr = re.sub(r"\b(0[xX][0-9A-Fa-f]+|\d+)([uUlL]+)\b", r"\1", expr)
    # Convert legacy C-style octal integer literals (e.g., 011) to JS 0o11 form.
    expr = re.sub(
        r"(?<![A-Za-z0-9_])0([0-7]{2,})(?![A-Za-z0-9_])",
        lambda m: f"0o{m.group(1)}",
        expr,
    )
    return expr


def _expr_identifiers(expr: str) -> list[str]:
    no_strings = re.sub(r'"(?:[^"\\]|\\.)*"', '""', expr)
    no_strings = re.sub(r"'(?:[^'\\]|\\.)*'", "''", no_strings)
    return re.findall(r"\b[A-Za-z_]\w*\b", no_strings)


def _is_potential_const_style(expr: str) -> bool:
    if any(tok in expr for tok in ("{", "}", ";", "->", "sizeof", "#")):
        return False
    if re.search(r"\b[A-Za-z_]\w*\s*\(", expr):
        return False
    # identifiers must be macro-style (all caps/underscore)
    for ident in _expr_identifiers(expr):
        if not re.fullmatch(r"[A-Z_][A-Z0-9_]*", ident):
            return False
    return True


def _existing_export_names_before_marker(path: str, marker_tag: str) -> set[str]:
    text = _read(path)
    begin = f"// AUTO-IMPORT-BEGIN: {marker_tag}"
    names: set[str] = set()
    for line in text.splitlines():
        if begin in line:
            break
        m = re.match(r"^\s*export const\s+([A-Z][A-Z0-9_]*)\b", line)
        if m:
            names.add(m.group(1))
    return names


def _existing_export_names_outside_marker(path: str, marker_tag: str) -> set[str]:
    text = _read(path)
    begin = f"// AUTO-IMPORT-BEGIN: {marker_tag}"
    end = f"// AUTO-IMPORT-END: {marker_tag}"
    in_marker = False
    names: set[str] = set()
    for line in text.splitlines():
        if begin in line:
            in_marker = True
            continue
        if end in line:
            in_marker = False
            continue
        if in_marker:
            continue
        m = re.match(r"^\s*export const\s+([A-Z][A-Z0-9_]*)\b", line)
        if m:
            names.add(m.group(1))
    return names


def generate_global_rm_block() -> str:
    global_h = _read(GLOBAL_H)
    rm_h = _read(RM_H)

    colno = _parse_define_int(global_h, "COLNO")
    rowno = _parse_define_int(global_h, "ROWNO")
    if not colno or not rowno:
        raise RuntimeError("Failed parsing COLNO/ROWNO from C headers.")

    levl_types = _parse_enum_block(rm_h, "levl_typ_types")
    if not levl_types:
        raise RuntimeError("Failed parsing enum levl_typ_types from rm.h")

    door_names = ["D_NODOOR", "D_BROKEN", "D_ISOPEN", "D_CLOSED", "D_LOCKED", "D_TRAPPED", "D_SECRET"]
    door_defs = _parse_defines(rm_h, door_names)
    if any(name not in door_defs for name in door_names):
        missing = [n for n in door_names if n not in door_defs]
        raise RuntimeError(f"Failed parsing door constants from rm.h: {missing}")

    lines: list[str] = []
    lines.append("// Auto-imported global/rm constants from C headers")
    lines.append(f"// Sources: {os.path.basename(GLOBAL_H)}, {os.path.basename(RM_H)}")
    lines.append("")
    lines.append("// Map dimensions — cf. global.h")
    lines.append(f"export const COLNO = {colno};")
    lines.append(f"export const ROWNO = {rowno};")
    lines.append("")
    lines.append("// Level location types — cf. rm.h enum levl_typ_types")
    for name, value in levl_types:
        if name in ("MATCH_WALL", "INVALID_TYPE"):
            continue
        lines.append(f"export const {name} = {value};")
    lines.append("")
    lines.append("// Door states — cf. rm.h")
    for name in door_names:
        lines.append(f"export const {name} = {door_defs[name]};")
    lines.append("")
    return "\n".join(lines)


def _collect_header_const_candidates(existing_exports_outside: set[str]) -> list[tuple[str, str, str]]:
    header_paths = _header_paths_include_order(INCLUDE_DIR)
    platform_names = {name for name, _expr, _note in PLATFORM_DEFAULT_CONSTS}

    merged: dict[str, tuple[str, str]] = {}
    for path in header_paths:
        header_name = os.path.basename(path)
        if header_name in HEADER_OWNED_BY_LEAF:
            continue
        guard_guess = os.path.splitext(header_name)[0].upper() + "_H"
        for name, value in _parse_enum_constants(_read(path)):
            if _is_blacklisted_header_macro(name):
                continue
            if name in HEADER_MACRO_NON_EMITTABLE:
                continue
            if name in platform_names:
                continue
            merged.setdefault(name, (header_name, value))
        for name, value in _parse_object_defines(_read(path), ignore={guard_guess}):
            if _is_blacklisted_header_macro(name):
                continue
            if name in HEADER_MACRO_NON_EMITTABLE:
                continue
            if name in platform_names:
                continue
            merged.setdefault(name, (header_name, _sanitize_c_expr_for_js(value)))

    # Candidate constants: const-style macros not already exported elsewhere.
    candidates: list[tuple[str, str, str]] = []
    for name, (src, expr) in merged.items():
        if name in existing_exports_outside:
            continue
        if _is_potential_const_style(expr):
            candidates.append((name, src, expr))
    return candidates


def _resolve_const_candidates(
    candidates: list[tuple[str, str, str]], known_initial: set[str]
) -> tuple[list[tuple[str, str, str]], list[tuple[str, str, str]]]:
    known = set(known_initial)
    emitted: list[tuple[str, str, str]] = []
    pending = list(candidates)
    while pending:
        progress = False
        next_pending: list[tuple[str, str, str]] = []
        for name, src, expr in pending:
            deps = set(_expr_identifiers(expr))
            if deps.issubset(known | {name}):
                emitted.append((name, expr, src))
                known.add(name)
                progress = True
            else:
                next_pending.append((name, src, expr))
        pending = next_pending
        if not progress:
            break
    return emitted, pending


def _unresolved_dependency_details(
    unresolved: list[tuple[str, str, str]],
    known_names: set[str],
) -> list[tuple[str, str, list[str], list[str], str]]:
    unresolved_expr: dict[str, str] = {name: expr for name, _src, expr in unresolved}
    unresolved_deps: dict[str, set[str]] = {}
    for name, _src, expr in unresolved:
        unresolved_deps[name] = {d for d in _expr_identifiers(expr) if d != name and d not in known_names}

    def root_blockers(name: str, visiting: set[str] | None = None) -> set[str]:
        visiting = visiting or set()
        if name in visiting:
            return set()
        visiting = set(visiting)
        visiting.add(name)
        roots: set[str] = set()
        for dep in unresolved_deps.get(name, set()):
            if dep in known_names:
                continue
            if dep in unresolved_expr:
                roots.update(root_blockers(dep, visiting))
            else:
                roots.add(dep)
        return roots

    details: list[tuple[str, str, list[str], list[str], str]] = []
    for name, src, expr in unresolved:
        missing = sorted(unresolved_deps.get(name, set()))
        roots = sorted(root_blockers(name))
        details.append((name, src, missing, roots, expr))
    return details


def _emit_header_block(
    *,
    title: str,
    emitted: list[tuple[str, str, str]],
    unresolved: list[tuple[str, str, str]],
    known_names: set[str],
    include_deferred: bool,
    include_platform_defaults: bool,
) -> str:
    unresolved_names = [(name, src) for name, src, _expr in unresolved]

    lines: list[str] = []
    lines.append(f"// {title}")
    lines.append(f"// Source dir: {INCLUDE_DIR}")
    lines.append("//")
    lines.append("// Rules:")
    lines.append("// - include object-like #define macros (not function-like) and enum constants")
    lines.append("// - include only const-style expressions (no runtime/lowercase identifiers)")
    lines.append("// - preserve include dependency order and in-header declaration order")
    lines.append("// - emit only when dependencies are resolvable at this marker location")
    lines.append(f"// - non-emittable blacklist count: {len(HEADER_MACRO_NON_EMITTABLE)}")
    lines.append("")
    if include_platform_defaults:
        lines.append("// Platform fallback constants (Ubuntu/ncurses-style defaults)")
        for name, expr, note in PLATFORM_DEFAULT_CONSTS:
            lines.append(f"// {note}")
            lines.append(f"export const {name} = {expr};")
        lines.append("")
    lines.append(f"// Added direct exports: {len(emitted)}")
    lines.append(f"// Deferred unresolved const-style macros: {len(unresolved_names)}")
    current_src: str | None = None
    for name, expr, src in emitted:
        if src != current_src:
            if current_src is not None:
                lines.append("")
            lines.append(f"// ===== {src} =====")
            current_src = src
        lines.append(f"// {src}")
        lines.append(f"export const {name} = {expr};")
    lines.append("")
    if include_deferred:
        unresolved_details = _unresolved_dependency_details(unresolved, known_names)
        root_counts: dict[str, int] = {}
        for _name, _src, _deps, roots, _expr in unresolved_details:
            if not roots:
                root_counts["<unknown>"] = root_counts.get("<unknown>", 0) + 1
                continue
            for dep in roots:
                root_counts[dep] = root_counts.get(dep, 0) + 1

        lines.append("export const DEFERRED_HEADER_CONST_MACROS = Object.freeze([")
        for name, src in unresolved_names:
            lines.append(f'    "{name} ({src})",')
        lines.append("]);")
        lines.append("")
        lines.append("export const DEFERRED_HEADER_CONST_MACRO_DETAILS = Object.freeze([")
        for name, src, deps, roots, expr in unresolved_details:
            deps_js = ", ".join(f'"{d}"' for d in deps)
            roots_js = ", ".join(f'"{d}"' for d in roots)
            expr_js = expr.replace("\\", "\\\\").replace('"', '\\"')
            lines.append("    Object.freeze({")
            lines.append(f'        name: "{name}",')
            lines.append(f'        source: "{src}",')
            lines.append(f"        missingDeps: Object.freeze([{deps_js}]),")
            lines.append(f"        rootMissingDeps: Object.freeze([{roots_js}]),")
            lines.append(f'        expr: "{expr_js}",')
            lines.append("    }),")
        lines.append("]);")
        lines.append("")
        lines.append("export const DEFERRED_HEADER_CONST_ROOT_BLOCKERS = Object.freeze([")
        for dep, count in sorted(root_counts.items(), key=lambda kv: (-kv[1], kv[0])):
            owner = ROOT_BLOCKER_OWNER_HINTS.get(dep, "unknown")
            lines.append("    Object.freeze({")
            lines.append(f'        name: "{dep}",')
            lines.append(f"        count: {count},")
            lines.append(f'        ownerHint: "{owner}",')
            lines.append("    }),")
        lines.append("]);")
        lines.append("")
        lines.append("export const HEADER_MACRO_NON_EMITTABLE = Object.freeze([")
        for name, why in sorted(HEADER_MACRO_NON_EMITTABLE.items()):
            lines.append(f'    "{name}: {why}",')
        lines.append("]);")
        lines.append("")
    return "\n".join(lines)


def _resolve_all_headers(
    existing_exports_before_pre: set[str],
    existing_exports_before_post: set[str],
    existing_exports_outside_pre: set[str],
) -> dict[str, object]:
    candidates = _collect_header_const_candidates(existing_exports_outside_pre)
    pre_known = set(existing_exports_before_pre) | {name for name, _expr, _note in PLATFORM_DEFAULT_CONSTS}
    pre_emitted, pre_pending = _resolve_const_candidates(candidates, pre_known)

    post_known = (
        set(existing_exports_before_post)
        | {name for name, _expr, _note in PLATFORM_DEFAULT_CONSTS}
        | {name for name, _expr, _src in pre_emitted}
    )
    post_emitted, post_pending = _resolve_const_candidates(pre_pending, post_known)
    return {
        "pre_known": pre_known,
        "pre_emitted": pre_emitted,
        "pre_pending": pre_pending,
        "post_known": post_known,
        "post_emitted": post_emitted,
        "post_pending": post_pending,
    }


def generate_all_headers_blocks(
    existing_exports_before_pre: set[str],
    existing_exports_before_post: set[str],
    existing_exports_outside_pre: set[str],
) -> tuple[str, str]:
    resolved = _resolve_all_headers(
        existing_exports_before_pre,
        existing_exports_before_post,
        existing_exports_outside_pre,
    )
    pre_known = resolved["pre_known"]
    pre_emitted = resolved["pre_emitted"]
    pre_pending = resolved["pre_pending"]
    post_known = resolved["post_known"]
    post_emitted = resolved["post_emitted"]
    post_pending = resolved["post_pending"]

    pre_block = _emit_header_block(
        title="Auto-imported header constants (pre-symbol pass)",
        emitted=pre_emitted,
        unresolved=pre_pending,
        known_names=pre_known | {name for name, _expr, _src in pre_emitted},
        include_deferred=False,
        include_platform_defaults=True,
    )
    post_block = _emit_header_block(
        title="Auto-imported header constants (post-symbol pass)",
        emitted=post_emitted,
        unresolved=post_pending,
        known_names=post_known | {name for name, _expr, _src in post_emitted},
        include_deferred=True,
        include_platform_defaults=False,
    )
    return pre_block, post_block


def generate_weapon_constants_block() -> str:
    skills = _read(SKILLS_H)
    monst = _read(MONST_H)

    p_skills = _parse_enum_block(skills, "p_skills")
    skill_levels = _parse_enum_block(skills, "skill_levels")
    weapon_check = _parse_enum_block(monst, "wpn_chk_flags")

    define_names = [
        "P_FIRST_WEAPON",
        "P_LAST_WEAPON",
        "P_FIRST_SPELL",
        "P_LAST_SPELL",
        "P_FIRST_H_TO_H",
        "P_LAST_H_TO_H",
        "P_MARTIAL_ARTS",
        "P_SKILL_LIMIT",
    ]
    defs = _parse_defines(skills, define_names)

    if not p_skills or not skill_levels or not weapon_check:
        raise RuntimeError("Failed parsing required weapon constants from C headers.")

    lines: list[str] = []
    lines.append("// Auto-imported weapon/skill constants from C headers")
    lines.append(f"// Sources: {os.path.basename(SKILLS_H)}, {os.path.basename(MONST_H)}")
    lines.append("")
    lines.append("// Skill constants — cf. skills.h enum p_skills")
    for name, value in p_skills:
        lines.append(f"export const {name} = {value};")
    lines.append("")

    for n in define_names:
        value = defs.get(n)
        if value:
            lines.append(f"export const {n} = {value};")
    lines.append("")

    lines.append("// Skill levels — cf. skills.h enum skill_levels")
    for name, value in skill_levels:
        lines.append(f"export const {name} = {value};")
    lines.append("")

    lines.append("// Monster weapon_check states — cf. monst.h enum wpn_chk_flags")
    for name, value in weapon_check:
        lines.append(f"export const {name} = {value};")
    lines.append("")
    lines.append("// Distance limits (hack.h)")
    lines.append("export const BOLT_LIM = 8;")
    lines.append("export const AKLYS_LIM = BOLT_LIM / 2;")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Patch generated constants blocks in js/const.js")
    parser.add_argument("--stdout", action="store_true", help="Print generated constants blocks to stdout.")
    parser.add_argument(
        "--report-deferred",
        action="store_true",
        help="Print deferred header macro details and dependency summary without patching.",
    )
    parser.add_argument(
        "--report-deferred-json",
        action="store_true",
        help="Print deferred header macro report as JSON without patching.",
    )
    parser.add_argument("--output", default=OUTPUT_PATH, help="Target js file (default: js/const.js).")
    args = parser.parse_args()

    global_rm_block = generate_global_rm_block()
    before = _existing_export_names_before_marker(args.output, MARKER_ALL_HEADERS.tag)
    outside = _existing_export_names_outside_marker(args.output, MARKER_ALL_HEADERS.tag)
    before_post = _existing_export_names_before_marker(args.output, MARKER_ALL_HEADERS_POST.tag)
    resolved = _resolve_all_headers(before, before_post, outside)
    pre_emitted = resolved["pre_emitted"]
    post_emitted = resolved["post_emitted"]
    post_pending = resolved["post_pending"]
    post_known = resolved["post_known"] | {name for name, _expr, _src in post_emitted}

    if args.report_deferred or args.report_deferred_json:
        dep_counts: dict[str, int] = {}
        root_counts: dict[str, int] = {}
        owner_counts: dict[str, int] = {}
        details = _unresolved_dependency_details(post_pending, post_known)
        payload_details: list[dict[str, object]] = []
        for name, src, missing, roots, expr in details:
            out_missing = missing if missing else ["<unknown>"]
            out_roots = roots if roots else ["<unknown>"]
            for dep in out_missing:
                dep_counts[dep] = dep_counts.get(dep, 0) + 1
            for dep in out_roots:
                root_counts[dep] = root_counts.get(dep, 0) + 1
                owner = ROOT_BLOCKER_OWNER_HINTS.get(dep, "unknown")
                owner_counts[owner] = owner_counts.get(owner, 0) + 1
            payload_details.append(
                {
                    "name": name,
                    "source": src,
                    "missingDeps": out_missing,
                    "rootMissingDeps": out_roots,
                    "expr": expr,
                }
            )

        payload = {
            "deferredCount": len(post_pending),
            "details": payload_details,
            "immediateMissingCounts": dict(sorted(dep_counts.items(), key=lambda kv: (-kv[1], kv[0]))),
            "rootMissingCounts": dict(sorted(root_counts.items(), key=lambda kv: (-kv[1], kv[0]))),
            "rootBlockers": [
                {
                    "name": dep,
                    "count": count,
                    "ownerHint": ROOT_BLOCKER_OWNER_HINTS.get(dep, "unknown"),
                }
                for dep, count in sorted(root_counts.items(), key=lambda kv: (-kv[1], kv[0]))
            ],
            "ownerSummary": [
                {"ownerHint": owner, "count": count}
                for owner, count in sorted(owner_counts.items(), key=lambda kv: (-kv[1], kv[0]))
            ],
            "unknownOwnerBlockers": [
                dep for dep, _count in sorted(root_counts.items(), key=lambda kv: kv[0])
                if ROOT_BLOCKER_OWNER_HINTS.get(dep, "unknown") == "unknown"
            ],
        }

        if args.report_deferred_json:
            json.dump(payload, sys.stdout, indent=2, sort_keys=True)
            print("")
            return

        print(f"Deferred macro count: {payload['deferredCount']}")
        for entry in payload_details:
            print(f"{entry['name']} ({entry['source']})")
            print(f"  missing: {', '.join(entry['missingDeps'])}")
            print(f"  roots: {', '.join(entry['rootMissingDeps'])}")
            print(f"  expr: {entry['expr']}")
        print("")
        print("Top missing dependencies (immediate):")
        for dep, count in payload["immediateMissingCounts"].items():
            print(f"  {dep}: {count}")
        print("")
        print("Top root blockers (transitive):")
        for dep, count in payload["rootMissingCounts"].items():
            owner = ROOT_BLOCKER_OWNER_HINTS.get(dep, "unknown")
            print(f"  {dep}: {count} (owner: {owner})")
        print("")
        print("Owner summary:")
        for entry in payload["ownerSummary"]:
            print(f"  {entry['ownerHint']}: {entry['count']}")
        if payload["unknownOwnerBlockers"]:
            print("")
            print("Unknown owner blockers:")
            for dep in payload["unknownOwnerBlockers"]:
                print(f"  {dep}")
        return

    all_headers_block, all_headers_post_block = generate_all_headers_blocks(before, before_post, outside)
    weapon_block = generate_weapon_constants_block()

    if args.stdout:
        print(f"/* {MARKER_GLOBAL_RM.tag} */")
        print(global_rm_block)
        print(f"/* {MARKER_ALL_HEADERS.tag} */")
        print(all_headers_block)
        print(f"/* {MARKER_ALL_HEADERS_POST.tag} */")
        print(all_headers_post_block)
        print(f"/* {MARKER_WEAPON.tag} */")
        print(weapon_block)
        return

    patch_between_markers(args.output, MARKER_GLOBAL_RM, global_rm_block)
    patch_between_markers(args.output, MARKER_ALL_HEADERS, all_headers_block)
    patch_between_markers(args.output, MARKER_ALL_HEADERS_POST, all_headers_post_block)
    patch_between_markers(args.output, MARKER_WEAPON, weapon_block)
    print(
        (
            f"Patched {args.output} "
            f"({MARKER_GLOBAL_RM.tag}, {MARKER_ALL_HEADERS.tag}, {MARKER_ALL_HEADERS_POST.tag}, {MARKER_WEAPON.tag})"
        ),
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
