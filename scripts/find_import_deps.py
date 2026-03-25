#!/usr/bin/env python3
"""
Find top-level const/let declarations in JS files that reference imported names.
"""

import os
import re
import glob

JS_DIR = "/Users/davidbau/git/mazesofmenace/mac/js"

# Regex patterns
IMPORT_NAMED = re.compile(r"""^import\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"]""")
IMPORT_DEFAULT = re.compile(r"""^import\s+(\w+)\s+from\s+['"][^'"]+['"]""")
IMPORT_NAMESPACE = re.compile(r"""^import\s+\*\s+as\s+(\w+)\s+from\s+['"][^'"]+['"]""")
# re-export: export { x } from '...'
REEXPORT = re.compile(r"""^export\s+\{[^}]*\}\s+from\s+['"][^'"]+['"]""")

# Pure literal RHS patterns (to exclude)
PURE_LITERAL = re.compile(
    r"""^\s*(?:
        -?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?  # number
        | 0x[0-9a-fA-F]+                   # hex
        | 0o[0-7]+                          # octal
        | 0b[01]+                           # binary
        | '[^']*'                           # single-quoted string
        | "[^"]*"                           # double-quoted string
        | `[^`]*`                           # template literal (no interpolation)
        | true | false                      # boolean
        | null | undefined                  # null/undefined
        | \[\s*\]                           # empty array
        | \{\s*\}                           # empty object
    )\s*;?\s*$""",
    re.VERBOSE,
)


def extract_imported_names(lines):
    """Parse all import statements and return set of imported names."""
    names = set()
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        # Skip re-exports
        if REEXPORT.match(line):
            i += 1
            continue
        # Named imports: import { x, y as z } from '...'
        m = IMPORT_NAMED.match(line)
        if m:
            specifiers = m.group(1)
            for spec in specifiers.split(","):
                spec = spec.strip()
                if " as " in spec:
                    # import { x as localName } - we want the local name
                    local = spec.split(" as ")[1].strip()
                    names.add(local)
                elif spec:
                    names.add(spec)
            i += 1
            continue
        # Default import: import foo from '...'
        m = IMPORT_DEFAULT.match(line)
        if m:
            names.add(m.group(1))
            i += 1
            continue
        # Namespace import: import * as ns from '...'
        m = IMPORT_NAMESPACE.match(line)
        if m:
            names.add(m.group(1))
            i += 1
            continue
        i += 1
    return names


def extract_identifier_refs(rhs):
    """Extract all identifier names referenced in the RHS expression."""
    # Remove string literals to avoid false matches inside strings
    # Remove single-quoted strings
    rhs = re.sub(r"'(?:[^'\\]|\\.)*'", "''", rhs)
    # Remove double-quoted strings
    rhs = re.sub(r'"(?:[^"\\]|\\.)*"', '""', rhs)
    # Remove template literals (simple, no nesting)
    rhs = re.sub(r'`(?:[^`\\]|\\.)*`', "``", rhs)
    # Remove comments
    rhs = re.sub(r"//.*$", "", rhs, flags=re.MULTILINE)
    # Find all identifiers
    return set(re.findall(r"\b([A-Za-z_$][A-Za-z0-9_$]*)\b", rhs))


def is_pure_literal(rhs):
    """Check if the RHS is a pure literal (no identifier refs needed)."""
    rhs = rhs.strip().rstrip(";").strip()
    return bool(PURE_LITERAL.match(rhs))


def collect_top_level_declarations(lines):
    """
    Collect top-level const/let declarations.
    Returns list of (line_number_1based, full_declaration_text, rhs_text).

    Handles multi-line declarations by brace/bracket/paren balancing.
    A declaration starts at column 0 with 'const ' or 'let ' (optionally preceded by 'export ').
    """
    declarations = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Match top-level const/let (optionally exported)
        # Must start at column 0
        if not (line.startswith("const ") or line.startswith("let ")
                or line.startswith("export const ") or line.startswith("export let ")):
            i += 1
            continue

        # Skip re-export lines
        if REEXPORT.match(line.rstrip()):
            i += 1
            continue

        # Collect the full declaration (may span multiple lines)
        start_line = i
        decl_lines = [line.rstrip()]
        depth = 0
        # Count open/close braces, brackets, parens in this line
        def count_depth(s, d):
            for ch in s:
                if ch in "({[":
                    d += 1
                elif ch in ")}]":
                    d -= 1
            return d

        depth = count_depth(line, 0)
        # A simple single-line declaration ends with ';' and depth==0
        # A multi-line one continues until depth==0 and we see a semicolon or a line ending a statement
        j = i + 1
        while j < len(lines):
            # Check if previous line ended the declaration
            # If depth is 0 and the last decl_lines entry ends with ; we're done
            if depth == 0 and decl_lines[-1].rstrip().endswith(";"):
                break
            # Also stop if depth is 0 and the next line starts a new top-level thing
            if depth == 0:
                next_line = lines[j] if j < len(lines) else ""
                if (next_line.startswith("const ") or next_line.startswith("let ")
                        or next_line.startswith("export ") or next_line.startswith("import ")
                        or next_line.startswith("function ") or next_line.startswith("class ")):
                    break
            next_line = lines[j].rstrip()
            decl_lines.append(next_line)
            depth = count_depth(next_line, depth)
            j += 1

        full_decl = "\n".join(decl_lines)

        # Extract the RHS: everything after the first '='
        # Strip 'export ' prefix for easier parsing
        decl_for_parse = full_decl
        if decl_for_parse.startswith("export "):
            decl_for_parse = decl_for_parse[len("export "):]

        # Find '=' sign (skip destructuring assignment heads like const { x } = ...)
        eq_idx = decl_for_parse.find("=")
        if eq_idx == -1:
            # No assignment - skip (e.g. `let x;`)
            i = j
            continue

        rhs = decl_for_parse[eq_idx + 1:].strip()

        declarations.append((start_line + 1, full_decl, rhs))
        i = j

    return declarations


def analyze_file(filepath, imported_names):
    """Analyze a single JS file and return findings."""
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    lines = content.splitlines()
    findings = []

    declarations = collect_top_level_declarations(lines)

    for lineno, decl, rhs in declarations:
        if is_pure_literal(rhs):
            continue

        refs = extract_identifier_refs(rhs)
        # Filter to only identifiers that are imported names
        used_imports = refs & imported_names
        # Also exclude JS keywords and built-ins that can appear in expressions
        BUILTINS = {
            "undefined", "null", "true", "false", "NaN", "Infinity",
            "Math", "Object", "Array", "String", "Number", "Boolean",
            "Date", "RegExp", "Error", "Map", "Set", "WeakMap", "WeakSet",
            "Promise", "Symbol", "BigInt", "JSON", "console", "window",
            "document", "globalThis", "self", "parseInt", "parseFloat",
            "isNaN", "isFinite", "decodeURIComponent", "encodeURIComponent",
            "setTimeout", "clearTimeout", "setInterval", "clearInterval",
            "requestAnimationFrame", "cancelAnimationFrame",
            "performance", "crypto", "fetch", "URL", "URLSearchParams",
            "new", "typeof", "instanceof", "void", "delete", "in", "of",
            "Proxy", "Reflect", "Uint8Array", "Int32Array", "Float64Array",
            "ArrayBuffer", "DataView", "TextEncoder", "TextDecoder",
        }
        used_imports -= BUILTINS

        if used_imports:
            # Get just the first line for display (or truncate long decls)
            display_decl = decl.replace("\n", " ").strip()
            if len(display_decl) > 120:
                display_decl = display_decl[:117] + "..."
            findings.append((lineno, display_decl, sorted(used_imports)))

    return findings


def main():
    js_files = sorted(glob.glob(os.path.join(JS_DIR, "*.js")))
    # Also check subdirectories
    js_files += sorted(glob.glob(os.path.join(JS_DIR, "**/*.js"), recursive=True))
    # Deduplicate (in case of overlap)
    js_files = sorted(set(js_files))

    total_findings = 0

    for filepath in js_files:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        lines = content.splitlines()
        imported_names = extract_imported_names(lines)

        if not imported_names:
            continue

        findings = analyze_file(filepath, imported_names)

        if findings:
            rel = os.path.relpath(filepath, JS_DIR)
            print(f"\n{'='*70}")
            print(f"FILE: {rel}")
            print(f"  Imports: {', '.join(sorted(imported_names))}")
            print()
            for lineno, decl, used in findings:
                print(f"  Line {lineno:4d}: {decl}")
                print(f"           Uses: {', '.join(used)}")
                print()
            total_findings += len(findings)

    print(f"\n{'='*70}")
    print(f"Total findings: {total_findings} across {len(js_files)} files")


if __name__ == "__main__":
    main()
