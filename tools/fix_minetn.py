#!/usr/bin/env python3
"""
Fix converted minetn/astral level files with nested function blocks.
Handles: if/then/end, function()...end, for loops, object properties (= to :)
"""

import sys
import re

def fix_minetn_file(input_file, output_file):
    # Read the original Lua file
    lua_file = input_file.replace('js/levels/', 'nethack-c/dat/').replace('.js', '.lua')
    print(f"Converting from {lua_file}")

    with open(lua_file, 'r') as f:
        lua = f.read()

    # Step 1: Convert Lua comments to JS comments (but not in template literals)
    lines = lua.split('\n')
    result_lines = []
    in_template = False

    for line in lines:
        # Track template literals
        if '[[' in line or ']]' in line:
            # Will be converted to backticks later
            pass
        elif '`' in line:
            backtick_count = line.count('`')
            if backtick_count % 2 == 1:
                in_template = not in_template

        # Only convert comments if not in template
        if not in_template:
            # Convert line comments
            line = re.sub(r'^(\s*)--\s+', r'\1// ', line)
            # Convert inline comments (but preserve -- in strings/maps)
            if ' -- ' in line and '"' not in line:
                line = re.sub(r'(\s+)--\s+', r'\1// ', line)

        result_lines.append(line)

    js = '\n'.join(result_lines)

    # Step 2: Convert Lua string literals [[ to backticks
    js = js.replace('[[', '`')
    js = js.replace(']]', '`')

    # Step 3: Convert object property syntax = to : (before other conversions)
    # Match after { or , to only catch object properties
    js = re.sub(r'([{,]\s*)(\w+)\s*=\s*', r'\1\2: ', js)

    # Step 4: Convert function() to () => { (with optional parameters)
    js = re.sub(r'function\(([^)]*)\)', r'(\1) => {', js)

    # Step 5: Convert local variable declarations
    js = re.sub(r'\blocal\s+(\w+)', r'let \1', js)

    # Step 5b: Rename JavaScript reserved words used as variables
    js = re.sub(r'\bprotected\b', 'protectedArea', js)

    # Step 6: Convert for loops
    js = re.sub(r'for\s+(\w+)\s*=\s*(\d+)\s*,\s*(\d+)\s+do', r'for (let \1 = \2; \1 <= \3; \1++) {', js)

    # Step 7: Convert if percent(X) then
    js = re.sub(r'if\s+percent\((\d+)\)\s+then', r'if (percent(\1)) {', js)

    # Step 8: Convert other if/then
    js = re.sub(r'if\s+(.+?)\s+then', r'if (\1) {', js)

    # Step 9: Convert else/elseif
    js = re.sub(r'\belseif\s+(.+?)\s+then', r'} else if (\1) {', js)
    js = re.sub(r'\belse\s*$', r'} else {', js, flags=re.MULTILINE)

    # Step 10: Convert 'end' keywords to '}'
    js = re.sub(r'\bend\b', '}', js)

    # Step 10b: Convert Lua method call syntax (object:method() to object.method())
    js = re.sub(r'(\w+):(\w+)\(', r'\1.\2(', js)

    # Step 11: Fix coordinate/array syntax {x,y,...} to [x,y,...]
    # Handle 2-element, 4-element, and other numeric arrays
    js = re.sub(r'\{(\d+(?:\s*,\s*\d+)+)\}', r'[\1]', js)

    # Step 12: Fix octal literals (0X to X)
    js = re.sub(r'\b0(\d)\b', r'\1', js)

    # Step 13: Add semicolons where needed
    lines = js.split('\n')
    fixed_lines = []
    for i, line in enumerate(lines):
        # Check if line ends with ) but not ); or ), or }) or },
        if re.search(r'des\.(feature|door|monster|altar|room|terrain|wallify|message)\([^)]*\)\s*$', line):
            # Don't add semicolon if next line starts with }
            if i + 1 < len(lines) and not lines[i + 1].strip().startswith('}'):
                line = line.rstrip() + ';'
        fixed_lines.append(line)
    js = '\n'.join(fixed_lines)

    # Step 14: Add imports and exports
    header = '''/**
 * ''' + input_file.split('/')[-1].replace('.js', '') + ''' - NetHack special level
 * Converted from: ''' + lua_file.split('/')[-1] + '''
 */

import * as des from '../sp_lev.js';
import { percent } from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export function generate() {
'''

    # Find where the actual des code starts (after comments)
    match = re.search(r'((?://[^\n]*\n)*)(des\.)', js)
    if match:
        comments = match.group(1)
        rest = js[match.start(2):]
        js = header + comments + '\n    ' + rest
    else:
        js = header + js

    # Step 15: Add helper functions if needed
    if 'monkfoodshop()' in js:
        monkfood_func = '''
    // Monk food shop helper
    function monkfoodshop() {
        return percent(50) ? "health food shop" : "delicatessen";
    }

    // Alignment tracking for temples
    const align = [null, "law", "neutral", "chaos"];

'''
        js = js.replace('    // NetHack', monkfood_func + '    // NetHack', 1)

    # Step 16: Add closing
    if not js.rstrip().endswith('return des.finalize_level();\n}'):
        js += '\n\n    return des.finalize_level();\n}\n'

    # Write output
    with open(output_file, 'w') as f:
        f.write(js)

    print(f"Wrote {output_file}")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: fix_minetn.py <input.js> <output.js>")
        sys.exit(1)

    fix_minetn_file(sys.argv[1], sys.argv[2])
