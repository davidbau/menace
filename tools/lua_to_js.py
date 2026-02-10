#!/usr/bin/env python3
"""
Lua to JavaScript converter for NetHack special level files.

Converts NetHack .lua special level files to JavaScript modules that work
with our des.* API implementation.
"""

import re
import sys
import os
from pathlib import Path


class LuaToJsConverter:
    def __init__(self):
        self.imports_needed = set()

    def convert_file(self, lua_content, filename):
        """Convert a Lua special level file to JavaScript."""
        self.imports_needed = set(['des', 'finalize_level'])

        js_lines = []

        # Add header comment
        level_name = Path(filename).stem
        js_lines.append(f"/**")
        js_lines.append(f" * {level_name} - NetHack special level")
        js_lines.append(f" * Converted from: {filename}")
        js_lines.append(f" */")
        js_lines.append("")

        # Convert the main content
        converted_body = self.convert_body(lua_content)

        # Add imports
        js_lines.extend(self.generate_imports())
        js_lines.append("")

        # Wrap in export function
        js_lines.append("export function generate() {")

        # Add converted body with indentation
        for line in converted_body.split('\n'):
            if line.strip():
                js_lines.append("    " + line)
            else:
                js_lines.append("")

        # Add finalize
        js_lines.append("")
        js_lines.append("    return des.finalize_level();")
        js_lines.append("}")

        return '\n'.join(js_lines)

    def generate_imports(self):
        """Generate import statements based on what's needed."""
        imports = []

        # Always import des
        imports.append("import * as des from '../sp_lev.js';")

        # Check if we need other imports
        if 'selection' in self.imports_needed:
            imports.append("import { selection } from '../sp_lev.js';")
        if 'percent' in self.imports_needed:
            imports.append("import { percent } from '../util.js';")
        if 'rn2' in self.imports_needed or 'rnd' in self.imports_needed:
            rng_imports = []
            if 'rn2' in self.imports_needed:
                rng_imports.append('rn2')
            if 'rnd' in self.imports_needed:
                rng_imports.append('rnd')
            imports.append(f"import {{ {', '.join(rng_imports)} }} from '../rng.js';")
        if 'nh' in self.imports_needed:
            imports.append("import * as nh from '../util.js';")

        return imports

    def convert_body(self, lua_content):
        """Convert the main Lua code body."""
        lines = lua_content.split('\n')
        js_lines = []

        i = 0
        while i < len(lines):
            line = lines[i]

            # Skip Lua comments at start (will be in header)
            if line.strip().startswith('--'):
                i += 1
                continue

            # Convert the line
            converted = self.convert_line(line)
            if converted is not None:
                js_lines.append(converted)

            i += 1

        return '\n'.join(js_lines)

    def convert_line(self, line):
        """Convert a single line of Lua to JavaScript."""
        stripped = line.strip()
        indent = line[:len(line) - len(line.lstrip())]

        # Skip empty lines
        if not stripped:
            return ""

        # Skip Lua comments (inline comments will be handled separately)
        if stripped.startswith('--'):
            # Convert to JS comment
            comment_text = stripped[2:].strip()
            return f"{indent}// {comment_text}"

        # Function definitions: function name() ... end
        if stripped.startswith('function '):
            # function foo() → function foo() {
            func_line = stripped.replace('function ', 'function ')
            if not func_line.endswith('{'):
                func_line = func_line.rstrip() + ' {'
            return indent + func_line

        # Local function definitions
        if stripped.startswith('local function '):
            func_line = stripped.replace('local function ', 'function ')
            if not func_line.endswith('{'):
                func_line = func_line.rstrip() + ' {'
            return indent + func_line

        # End keyword
        if stripped == 'end' or stripped.startswith('end;') or stripped.startswith('end,'):
            suffix = stripped[3:]
            return indent + '}' + suffix

        # Local variable declarations
        if stripped.startswith('local '):
            # local x = y → const x = y
            var_line = stripped.replace('local ', 'const ', 1)
            return indent + self.convert_expression(var_line)

        # If statements
        if stripped.startswith('if ') and ' then' in stripped:
            # if condition then → if (condition) {
            condition = stripped[3:stripped.index(' then')]
            condition = self.convert_condition(condition)
            suffix = stripped[stripped.index(' then') + 5:].strip()
            result = f"{indent}if ({condition}) {{"
            if suffix:
                result += ' ' + self.convert_expression(suffix)
            return result

        # Elseif
        if stripped.startswith('elseif '):
            condition = stripped[7:stripped.index(' then')]
            condition = self.convert_condition(condition)
            return f"{indent}}} else if ({condition}) {{"

        # Else
        if stripped == 'else':
            return f"{indent}}} else {{"

        # For loops: for i = start, end do
        if stripped.startswith('for ') and ' do' in stripped:
            # for i = 1,10 do → for (let i = 1; i <= 10; i++) {
            loop_def = stripped[4:stripped.index(' do')]
            loop_js = self.convert_for_loop(loop_def)
            return f"{indent}{loop_js}"

        # For-in loops: for k,v in pairs(t) do
        if stripped.startswith('for ') and ' in ' in stripped:
            # Handle iterator loops
            loop_js = self.convert_iterator_loop(stripped)
            return f"{indent}{loop_js}"

        # While loops
        if stripped.startswith('while ') and ' do' in stripped:
            condition = stripped[6:stripped.index(' do')]
            condition = self.convert_condition(condition)
            return f"{indent}while ({condition}) {{"

        # Repeat-until (convert to do-while)
        if stripped == 'repeat':
            return f"{indent}do {{"

        if stripped.startswith('until '):
            condition = self.convert_condition(stripped[6:])
            # Negate condition for do-while
            return f"{indent}}} while (!({condition}));"

        # Return statements
        if stripped.startswith('return '):
            expr = self.convert_expression(stripped[7:])
            return f"{indent}return {expr};"

        # Table definitions
        if stripped == '{' or stripped.endswith(' = {'):
            return indent + self.convert_expression(stripped)

        # Otherwise, convert as expression
        return indent + self.convert_expression(stripped)

    def convert_expression(self, expr):
        """Convert a Lua expression to JavaScript."""
        expr = expr.strip()

        # Track what we're using
        if 'percent(' in expr:
            self.imports_needed.add('percent')
        if 'selection.' in expr:
            self.imports_needed.add('selection')
        if 'rn2(' in expr:
            self.imports_needed.add('rn2')
        if 'rnd(' in expr:
            self.imports_needed.add('rnd')
        if 'nh.' in expr:
            self.imports_needed.add('nh')

        # String concatenation: .. → +
        expr = re.sub(r'\s*\.\.\s*', ' + ', expr)

        # Logical operators: and → &&, or → ||, not → !
        expr = re.sub(r'\band\b', '&&', expr)
        expr = re.sub(r'\bor\b', '||', expr)
        expr = re.sub(r'\bnot\b', '!', expr)

        # Inequality: ~= → !==
        expr = expr.replace('~=', '!==')

        # Don't convert = to === in object literals (key = value)
        # Only convert comparison operators
        # This is complex - let's handle it more carefully
        # For now, skip this conversion as it causes issues

        # Math functions
        expr = re.sub(r'\bmath\.random\(', 'Math.random(', expr)
        expr = re.sub(r'\bmath\.floor\(', 'Math.floor(', expr)
        expr = re.sub(r'\bmath\.ceil\(', 'Math.ceil(', expr)
        expr = re.sub(r'\bmath\.min\(', 'Math.min(', expr)
        expr = re.sub(r'\bmath\.max\(', 'Math.max(', expr)

        # Table length: # → .length
        expr = re.sub(r'#(\w+)', r'\1.length', expr)

        # Array indexing: [1] → [0] (Lua is 1-indexed)
        # This is tricky and may need manual review

        # String methods
        expr = re.sub(r'string\.', '', expr)  # JS strings have methods directly

        # Boolean values
        expr = re.sub(r'\bnil\b', 'null', expr)

        # Add semicolon if it's a statement
        if expr and not expr.endswith(('{', '}', ';', ',', ')')):
            # Check if it looks like a statement
            if any(expr.startswith(kw) for kw in ['const ', 'let ', 'var ', 'des.', 'return ']):
                if not expr.endswith(';'):
                    expr += ';'

        return expr

    def convert_condition(self, condition):
        """Convert a Lua condition to JavaScript."""
        condition = condition.strip()

        # Convert operators
        condition = re.sub(r'\band\b', '&&', condition)
        condition = re.sub(r'\bor\b', '||', condition)
        condition = re.sub(r'\bnot\b', '!', condition)
        condition = condition.replace('~=', '!==')
        condition = re.sub(r'([^=!])=([^=])', r'\1===\2', condition)

        return condition

    def convert_for_loop(self, loop_def):
        """Convert a Lua for loop to JavaScript."""
        # for i = 1,10 → for (let i = 1; i <= 10; i++)
        # for i = 1,10,2 → for (let i = 1; i <= 10; i += 2)

        parts = loop_def.split('=')
        var_name = parts[0].strip()
        range_parts = parts[1].split(',')

        start = range_parts[0].strip()
        end = range_parts[1].strip()
        step = range_parts[2].strip() if len(range_parts) > 2 else '1'

        if step == '1':
            return f"for (let {var_name} = {start}; {var_name} <= {end}; {var_name}++) {{"
        else:
            return f"for (let {var_name} = {start}; {var_name} <= {end}; {var_name} += {step}) {{"

    def convert_iterator_loop(self, loop_line):
        """Convert Lua iterator loops (pairs, ipairs) to JavaScript."""
        # for k,v in pairs(table) do → for (const [k, v] of Object.entries(table)) {
        # for i,v in ipairs(array) do → for (const [i, v] of array.entries()) {

        match = re.match(r'for\s+([\w,\s]+)\s+in\s+(\w+)\(([\w.]+)\)\s+do', loop_line)
        if match:
            vars_str = match.group(1)
            iterator = match.group(2)
            collection = match.group(3)

            if iterator == 'pairs':
                return f"for (const [{vars_str}] of Object.entries({collection})) {{"
            elif iterator == 'ipairs':
                return f"for (const [{vars_str}] of {collection}.entries()) {{"

        # Fallback
        return loop_line.replace(' do', ' {')


def convert_lua_file(input_path, output_path=None):
    """Convert a single Lua file to JavaScript."""
    with open(input_path, 'r') as f:
        lua_content = f.read()

    converter = LuaToJsConverter()
    js_content = converter.convert_file(lua_content, os.path.basename(input_path))

    if output_path:
        with open(output_path, 'w') as f:
            f.write(js_content)
        print(f"Converted {input_path} → {output_path}")
    else:
        print(js_content)

    return js_content


def main():
    if len(sys.argv) < 2:
        print("Usage: lua_to_js.py <input.lua> [output.js]")
        print("   or: lua_to_js.py --batch <input_dir> <output_dir>")
        sys.exit(1)

    if sys.argv[1] == '--batch':
        # Batch convert directory
        input_dir = Path(sys.argv[2])
        output_dir = Path(sys.argv[3])
        output_dir.mkdir(exist_ok=True)

        for lua_file in input_dir.glob('*.lua'):
            output_file = output_dir / (lua_file.stem + '.js')
            convert_lua_file(lua_file, output_file)
    else:
        # Single file
        input_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else None
        convert_lua_file(input_file, output_file)


if __name__ == '__main__':
    main()
