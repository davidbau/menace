#!/usr/bin/env python3
"""
Simple Lua to JavaScript converter for NetHack special level files.
Uses sequential regex replacements for reliability.

Based on fix_minetn.py approach with enhancements:
- Dynamic import detection
- Recursive nested array conversion
- Better math function handling
"""

import sys
import re
import os
from pathlib import Path


class SimpleLuaConverter:
    def __init__(self):
        self.imports_needed = set(['des'])

    def _preprocess_problematic_files(self, lua_content, filename):
        """Apply file-specific preprocessing for known problematic files."""
        basename = Path(filename).stem

        # bigrm-6, bigrm-13: Remove extra 'end' statements that create unbalanced braces
        if basename in ['bigrm-6', 'bigrm-13']:
            lines = lua_content.split('\n')
            # Remove standalone 'end' at end of file before last few lines
            for i in range(len(lines) - 5, len(lines)):
                if i >= 0 and lines[i].strip() == 'end':
                    lines[i] = '-- removed extra end'
            lua_content = '\n'.join(lines)

        # minend-3, minetn-5, minetn-6, orcus: Similar issue
        if basename in ['minend-3', 'minetn-5', 'minetn-6', 'orcus']:
            # Count 'for' and 'function' vs 'end' to balance
            for_count = lua_content.count('for ')
            func_count = lua_content.count('function ')
            if_count = lua_content.count(' if ')
            expected_ends = for_count + func_count + if_count
            actual_ends = lua_content.count('\nend')

            if actual_ends > expected_ends:
                # Remove extra ends from the end of file
                lines = lua_content.split('\n')
                ends_to_remove = actual_ends - expected_ends
                for i in range(len(lines) - 1, -1, -1):
                    if ends_to_remove <= 0:
                        break
                    if lines[i].strip() == 'end':
                        lines[i] = '-- removed extra end'
                        ends_to_remove -= 1
                lua_content = '\n'.join(lines)

        # themerms: Fix function declaration inside if statement
        if basename == 'themerms':
            # Convert problematic function declarations to function expressions
            lua_content = re.sub(
                r'(\s+)function\s+(\w+)\s*\(',
                r'\1local \2 = function(',
                lua_content
            )

        return lua_content

    def convert_file(self, lua_content, filename):
        """Convert Lua content to JavaScript."""
        js = lua_content

        # Step 0a: Apply file-specific preprocessing for problematic files
        js = self._preprocess_problematic_files(js, filename)

        # Step 0b: Extract and protect Lua long strings from conversion
        protected_strings = []
        def protect_long_string(match):
            content = match.group(1)
            placeholder = f'__LONGSTRING_{len(protected_strings)}__'
            protected_strings.append(content)
            return f'`{placeholder}`'

        # Match [[...]] long strings (non-greedy)
        js = re.sub(r'\[\[(.*?)\]\]', protect_long_string, js, flags=re.DOTALL)

        # Step 1: Convert Lua comments to JS comments
        js = self._convert_comments(js)

        # Step 3: Track what we need to import (before conversions)
        self._detect_imports(js)

        # Step 4: Convert object property syntax (in tables/objects)
        # Match after { or , to only catch object properties
        js = re.sub(r'([{,]\s*)(\w+)\s*=\s*', r'\1\2: ', js)

        # Step 5: Protect Lua varargs (...) from string concatenation conversion
        js = js.replace('...', '__VARARGS__')

        # Step 6: Convert function expressions (add opening brace)
        # Handle both named functions and anonymous functions
        js = re.sub(r'function\s+(\w+)\s*\(([^)]*)\)', r'function \1(\2) {', js)  # named
        js = re.sub(r'function\s*\(([^)]*)\)', r'function(\1) {', js)  # anonymous

        # Step 7: Convert local variable declarations to let (not const)
        js = re.sub(r'\blocal\s+(\w+)', r'let \1', js)

        # Step 8: Rename JavaScript reserved words
        js = re.sub(r'\bprotected\b', 'protected_region', js)

        # Step 9: Convert for loops
        # Numeric: for i = 1, 10 do  or  for i = 1, 10, 2 do
        # Need to handle complex expressions, so we'll do line-by-line
        js = self._convert_for_loops(js)

        # Step 10: Convert elseif FIRST (before if/then conversion)
        js = re.sub(r'\belseif\s+(.+?)\s+then', r'} else if (\1) {', js)

        # Step 11: Convert else
        js = re.sub(r'^(\s*)else\s*$', r'\1} else {', js, flags=re.MULTILINE)

        # Step 12: Convert if statements (after elseif)
        js = re.sub(r'if\s+(.+?)\s+then', r'if (\1) {', js)

        # Step 13: Convert 'end' keywords to '}'
        js = re.sub(r'\bend\b', '}', js)

        # Step 14: Convert method call syntax (obj:method() to obj.method())
        # Handle both word:method and ):method patterns
        js = re.sub(r'(\w+):(\w+)\(', r'\1.\2(', js)
        js = re.sub(r'(\)):(\w+)\(', r'\1.\2(', js)

        # Step 15: Convert Lua operators to JS
        js = self._convert_operators(js)

        # Step 16: Restore varargs as JavaScript rest parameters
        # In function parameters: __VARARGS__ → ...args
        # In function bodies: {__VARARGS__} → [...args] or just args
        js = re.sub(r'function\s*\(__VARARGS__\)', 'function(...args)', js)
        js = re.sub(r'function\s+(\w+)\s*\(__VARARGS__\)', r'function \1(...args)', js)
        # Inside bodies: { __VARARGS__ } → args  (simpler than [...args])
        js = js.replace('[ __VARARGS__]', 'args')
        js = js.replace('__VARARGS__', '...args')

        # Step 16: Convert math functions
        js = re.sub(r'\bmath\.random\b', 'Math.random', js)
        js = re.sub(r'\bmath\.floor\b', 'Math.floor', js)
        js = re.sub(r'\bmath\.ceil\b', 'Math.ceil', js)
        js = re.sub(r'\bmath\.min\b', 'Math.min', js)
        js = re.sub(r'\bmath\.max\b', 'Math.max', js)
        js = re.sub(r'\bmath\.abs\b', 'Math.abs', js)

        # Step 17: Convert arrays (recursive for nested)
        js = self._convert_arrays(js)

        # Step 18: Fix octal literals (08 -> 8, 09 -> 9)
        js = re.sub(r'\b0([0-9])\b', r'\1', js)

        # Step 19: Add semicolons to des.* calls
        js = self._add_semicolons(js)

        # Step 20: Restore protected long strings
        for i, content in enumerate(protected_strings):
            placeholder = f'__LONGSTRING_{i}__'
            js = js.replace(f'`{placeholder}`', f'`\n{content}\n`')

        # Step 21: Wrap in module structure
        js = self._wrap_module(js, filename)

        # Step 22: Postprocessing fixes for problematic files
        js = self._postprocess_fixes(js, filename)

        return js

    def _convert_comments(self, js):
        """Convert Lua comments to JS comments."""
        lines = js.split('\n')
        result = []

        for line in lines:
            # Skip if line is inside a string or template literal (simple heuristic)
            if line.strip().startswith('--'):
                # Line comment
                result.append(re.sub(r'^(\s*)--\s*', r'\1// ', line))
            elif ' -- ' in line and not '[[' in line and not '`' in line:
                # Inline comment (but not in maps/templates)
                result.append(re.sub(r'(\s+)--\s+', r'\1// ', line))
            else:
                result.append(line)

        return '\n'.join(result)

    def _detect_imports(self, js):
        """Detect what needs to be imported."""
        if re.search(r'\bpercent\s*\(', js):
            self.imports_needed.add('percent')
        if re.search(r'\bselection[.(\s]', js):
            self.imports_needed.add('selection')
        if re.search(r'\bshuffle\s*\(', js):
            self.imports_needed.add('shuffle')
        if re.search(r'\brn2\s*\(', js):
            self.imports_needed.add('rn2')
        if re.search(r'\brnd\s*\(', js):
            self.imports_needed.add('rnd')
        if re.search(r'\bd\s*\(', js):
            self.imports_needed.add('d')

    def _convert_for_loops(self, js):
        """Convert Lua for loops to JavaScript, handling complex expressions."""
        lines = js.split('\n')
        result = []

        for line in lines:
            # Match: for var = start, end do  or  for var = start, end, step do
            match = re.match(r'^(\s*)for\s+(\w+)\s*=\s*(.+)\s+do\s*$', line)
            if match:
                indent = match.group(1)
                var = match.group(2)
                range_expr = match.group(3)

                # Split by commas, but respect parentheses
                parts = self._split_by_comma(range_expr)

                if len(parts) >= 2:
                    start = parts[0].strip()
                    end = parts[1].strip()
                    step = parts[2].strip() if len(parts) > 2 else '1'

                    if step == '1':
                        result.append(f'{indent}for (let {var} = {start}; {var} <= {end}; {var}++) {{')
                    else:
                        result.append(f'{indent}for (let {var} = {start}; {var} <= {end}; {var} += {step}) {{')
                else:
                    # Fallback - keep original
                    result.append(line)
            else:
                result.append(line)

        return '\n'.join(result)

    def _split_by_comma(self, expr):
        """Split expression by comma, respecting parentheses."""
        parts = []
        current = []
        depth = 0
        in_string = False
        string_char = None

        for i, char in enumerate(expr):
            if char in ['"', "'"] and (i == 0 or expr[i-1] != '\\'):
                if not in_string:
                    in_string = True
                    string_char = char
                elif char == string_char:
                    in_string = False
                current.append(char)
            elif not in_string:
                if char == '(':
                    depth += 1
                    current.append(char)
                elif char == ')':
                    depth -= 1
                    current.append(char)
                elif char == ',' and depth == 0:
                    parts.append(''.join(current))
                    current = []
                else:
                    current.append(char)
            else:
                current.append(char)

        if current:
            parts.append(''.join(current))

        return parts

    def _convert_operators(self, js):
        """Convert Lua operators to JavaScript."""
        # String concatenation
        js = re.sub(r'\s*\.\.\s*', ' + ', js)

        # Logical operators (use word boundaries to avoid partial matches)
        js = re.sub(r'\band\b', '&&', js)
        js = re.sub(r'\bor\b', '||', js)
        js = re.sub(r'\bnot\b', '!', js)

        # Comparison operators
        js = js.replace('~=', '!==')
        # Only convert = to === when it's a comparison (not <, >, !, ~ or in for loops)
        # Actually, skip this - JavaScript will handle it, and we risk breaking assignments
        # js = re.sub(r'([^=!<>~])=([^=])', r'\1===\2', js)

        # nil to null
        js = re.sub(r'\bnil\b', 'null', js)

        # Array/string length
        js = re.sub(r'#(\w+)', r'\1.length', js)

        return js

    def _convert_arrays(self, js):
        """Convert Lua array/table literals to JavaScript arrays."""
        # This handles nested arrays recursively
        # BUT: skip block braces (those after ) or at start of line)

        def convert_array_literal(text):
            """Recursively convert {x,y} style arrays to [x,y]."""
            result = []
            i = 0

            while i < len(text):
                if text[i] == '{':
                    # Check if this is a block brace (after ) or after keywords like else/do)
                    is_block_brace = False
                    if i > 0:
                        # Look back for ) or keywords
                        j = i - 1
                        while j >= 0 and text[j] in [' ', '\t', '\n']:
                            j -= 1
                        # Block brace if preceded by )
                        if j >= 0 and text[j] == ')':
                            is_block_brace = True
                        # Or if preceded by keywords: else, do
                        elif j >= 3 and text[j-3:j+1] == 'else':
                            is_block_brace = True
                        elif j >= 1 and text[j-1:j+1] == 'do':
                            is_block_brace = True

                    if is_block_brace:
                        # Keep as block brace
                        result.append('{')
                        i += 1
                        continue

                    # Find matching closing brace
                    depth = 1
                    j = i + 1
                    in_string = False
                    string_char = None

                    while j < len(text) and depth > 0:
                        if text[j] in ['"', "'", '`'] and (j == 0 or text[j-1] != '\\'):
                            if not in_string:
                                in_string = True
                                string_char = text[j]
                            elif text[j] == string_char:
                                in_string = False
                        elif not in_string:
                            if text[j] == '{':
                                depth += 1
                            elif text[j] == '}':
                                depth -= 1
                        j += 1

                    # Extract the content
                    content = text[i+1:j-1]

                    # Check if it's an array (no key: value pairs)
                    # Object properties have already been converted to key: value
                    if ':' not in content or self._is_array_like(content):
                        # It's an array - recursively convert
                        converted_content = convert_array_literal(content)
                        result.append('[' + converted_content + ']')
                    else:
                        # It's an object - keep braces but recursively convert content
                        converted_content = convert_array_literal(content)
                        result.append('{' + converted_content + '}')

                    i = j
                elif text[i] == '}':
                    # Closing brace - keep as is
                    result.append('}')
                    i += 1
                else:
                    result.append(text[i])
                    i += 1

            return ''.join(result)

        return convert_array_literal(js)

    def _is_array_like(self, content):
        """Check if content is array-like (no key:value at depth 0)."""
        depth = 0
        in_string = False
        string_char = None

        for i, char in enumerate(content):
            if char in ['"', "'", '`'] and (i == 0 or content[i-1] != '\\'):
                if not in_string:
                    in_string = True
                    string_char = char
                elif char == string_char:
                    in_string = False
            elif not in_string:
                if char in ['{', '[']:
                    depth += 1
                elif char in ['}', ']']:
                    depth -= 1
                elif char == ':' and depth == 0:
                    # Found colon at top level - it's an object
                    return False

        return True

    def _add_semicolons(self, js):
        """Add semicolons to des.* function calls."""
        lines = js.split('\n')
        result = []

        for i, line in enumerate(lines):
            stripped = line.strip()
            # Add semicolon to des.* calls that don't have one
            if (stripped.startswith('des.') and
                not stripped.endswith((';', '{', '}', ',')) and
                ')' in stripped):
                line = line.rstrip() + ';'
            result.append(line)

        return '\n'.join(result)

    def _postprocess_fixes(self, js, filename):
        """Apply targeted fixes for known problematic patterns."""

        # Fix 0: Handle duplicate variable declarations (let place, let sel)
        # Track seen variables and convert subsequent ones to assignments
        lines = js.split('\n')
        seen_vars = {}
        for i, line in enumerate(lines):
            match = re.match(r'^(\s*)let\s+(\w+)\s*=', line)
            if match:
                indent = match.group(1)
                varname = match.group(2)
                if varname in seen_vars:
                    # Already declared, convert to assignment
                    lines[i] = re.sub(r'^(\s*)let\s+', r'\1', line)
                else:
                    seen_vars[varname] = True
        js = '\n'.join(lines)

        # Fix 1: Remove extra ] after arrays containing string brackets
        # Pattern: [ "L", "T", "[", "."]]; → [ "L", "T", "[", "."];
        js = re.sub(r'(\[ [^\]]+\"\[\"+[^\]]*\])(\])', r'\1', js)
        js = re.sub(r'(\[ [^\]]+\"\{"+[^\]]*\])(\])', r'\1', js)

        # Fix 2: Fix object shorthand initializers (= should be :)
        # In object literals, convert base = -1 to base: -1
        lines = js.split('\n')
        result_lines = []
        in_object = 0
        for line in lines:
            # Track object depth
            in_object += line.count('{') - line.count('}')

            # If inside an object and line has standalone = (not in strings/===/!=)
            if in_object > 0 and '=' in line and ':' not in line:
                # Check if it's an assignment not a comparison
                stripped = line.strip()
                if (re.match(r'^\w+\s*=\s*[^=]', stripped) and
                    not stripped.startswith('let ') and
                    not stripped.startswith('const ') and
                    not '===' in stripped and
                    not '!==' in stripped):
                    # Convert first = to :
                    line = re.sub(r'(\w+)\s*=\s*', r'\1: ', line, count=1)

            result_lines.append(line)
        js = '\n'.join(result_lines)

        # Fix 3: Remove illegal return statements at top level
        # Convert standalone return at module level to commented out
        js = re.sub(r'^(\s*)return\s+', r'\1// return ', js, flags=re.MULTILINE)

        # Fix 4: Fix method calls that still have : (aggressive)
        # Find any remaining : followed by ( that's not in strings
        js = re.sub(r':(\w+)\(', r'.\1(', js)

        # Fix 5: Remove orphan return statements (return outside function)
        # Pattern: }\n    return des.finalize_level();\n}
        # Should be: }\n} (return is added by wrap_module)
        js = re.sub(r'}\s*\n\s*return des\.finalize_level\(\);\s*\n}', '}\n}', js)

        # Fix 6: Complete unclosed objects/functions by counting braces
        open_braces = js.count('{')
        close_braces = js.count('}')
        if open_braces > close_braces:
            # Add missing closing braces before final return
            missing = open_braces - close_braces
            if 'return des.finalize_level();' in js:
                js = js.replace('return des.finalize_level();',
                               '}\n' * missing + '    return des.finalize_level();')

        return js

    def _wrap_module(self, js, filename):
        """Wrap converted code in ES6 module structure."""
        level_name = Path(filename).stem
        lua_name = Path(filename).name

        # Generate imports
        imports = ['import * as des from \'../sp_lev.js\';']

        # Collect imports from sp_lev.js
        splev_imports = []
        if 'selection' in self.imports_needed:
            splev_imports.append('selection')
        if 'percent' in self.imports_needed:
            splev_imports.append('percent')
        if 'shuffle' in self.imports_needed:
            splev_imports.append('shuffle')

        if splev_imports:
            imports.append(f"import {{ {', '.join(splev_imports)} }} from '../sp_lev.js';")

        rng_imports = []
        if 'rn2' in self.imports_needed:
            rng_imports.append('rn2')
        if 'rnd' in self.imports_needed:
            rng_imports.append('rnd')
        if 'd' in self.imports_needed:
            rng_imports.append('d')
        if rng_imports:
            imports.append(f"import {{ {', '.join(rng_imports)} }} from '../rng.js';")

        # Build the module
        header = f'''/**
 * {level_name} - NetHack special level
 * Converted from: {lua_name}
 */

'''
        header += '\n'.join(imports)
        header += '\n\nexport function generate() {\n'

        # Indent the body
        body_lines = []
        for line in js.split('\n'):
            if line.strip():
                body_lines.append('    ' + line)
            else:
                body_lines.append('')

        footer = '\n\n    return des.finalize_level();\n}\n'

        return header + '\n'.join(body_lines) + footer


def convert_lua_file(input_path, output_path=None):
    """Convert a single Lua file to JavaScript."""
    with open(input_path, 'r', encoding='utf-8') as f:
        lua_content = f.read()

    converter = SimpleLuaConverter()
    js_content = converter.convert_file(lua_content, os.path.basename(input_path))

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(js_content)
        print(f"Converted {input_path} → {output_path}")
    else:
        print(js_content)

    return js_content


def main():
    if len(sys.argv) < 2:
        print("Usage: lualevel_to_js.py <input.lua> [output.js]")
        print("   or: lualevel_to_js.py --batch <input_dir> <output_dir>")
        sys.exit(1)

    if sys.argv[1] == '--batch':
        if len(sys.argv) < 4:
            print("Usage: lualevel_to_js.py --batch <input_dir> <output_dir>")
            sys.exit(1)

        input_dir = Path(sys.argv[2])
        output_dir = Path(sys.argv[3])
        output_dir.mkdir(exist_ok=True)

        lua_files = sorted(input_dir.glob('*.lua'))
        print(f"Found {len(lua_files)} Lua files to convert")

        success_count = 0
        for lua_file in lua_files:
            output_file = output_dir / (lua_file.stem + '.js')
            try:
                convert_lua_file(lua_file, output_file)
                success_count += 1
            except Exception as e:
                print(f"ERROR converting {lua_file}: {e}")

        print(f"\nConverted {success_count}/{len(lua_files)} files successfully")
    else:
        input_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else None
        convert_lua_file(input_file, output_file)


if __name__ == '__main__':
    main()
