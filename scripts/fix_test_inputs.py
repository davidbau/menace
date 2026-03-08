#!/usr/bin/env python3
"""
Fix all test files that use pushInput:
1. Add setThrowOnEmptyInput/getInputQueueLength to input.js imports
2. Add beforeEach with clearInputQueue + setThrowOnEmptyInput(true)
3. Add afterEach with remaining-input check + setThrowOnEmptyInput(false)
4. Add afterEach import if missing
"""

import re
import glob
import os

test_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'test', 'unit')

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    if 'pushInput' not in content:
        return False

    if 'setThrowOnEmptyInput' in content:
        return False  # already done

    changed = False

    # 1. Add setThrowOnEmptyInput, getInputQueueLength to input.js import
    m = re.search(r"import\s*\{([^}]+)\}\s*from\s*'[^']*input\.js';", content)
    if m:
        existing = m.group(1)
        additions = []
        if 'setThrowOnEmptyInput' not in existing:
            additions.append('setThrowOnEmptyInput')
        if 'getInputQueueLength' not in existing:
            additions.append('getInputQueueLength')
        if additions:
            new_names = existing.rstrip() + ', ' + ', '.join(additions) + ' '
            content = content[:m.start(1)] + new_names + content[m.end(1):]
            changed = True

    # 2. Add afterEach to node:test import if missing
    test_import = re.search(r"import\s*\{([^}]+)\}\s*from\s*'node:test';", content)
    if test_import and 'afterEach' not in test_import.group(1):
        old = test_import.group(1)
        new = old.rstrip() + ', afterEach'
        content = content[:test_import.start(1)] + new + content[test_import.end(1):]
        changed = True

    # 3. Modify existing beforeEach or add new one
    # Find the describe block's beforeEach
    be = re.search(r'([ \t]*)beforeEach\(\s*(?:async\s*)?\(\)\s*=>\s*\{([^}]*)\}', content)
    if be:
        indent = be.group(1)
        body = be.group(2)
        additions = ''
        if 'clearInputQueue' not in body:
            additions += f'\n{indent}    clearInputQueue();'
        if 'setThrowOnEmptyInput' not in body:
            additions += f'\n{indent}    setThrowOnEmptyInput(true);'
        if additions:
            # Insert at start of beforeEach body
            insert_pos = be.start(2)
            content = content[:insert_pos] + additions + content[insert_pos:]
            changed = True
    else:
        # No beforeEach - add one after describe opening
        desc = re.search(r"describe\([^)]*\)\s*(?:=>)?\s*\{?\s*\n", content)
        if not desc:
            desc = re.search(r"describe\([^{]+\{\s*\n", content)
        if desc:
            indent = '    '
            block = f"""{indent}beforeEach(() => {{
{indent}    clearInputQueue();
{indent}    setThrowOnEmptyInput(true);
{indent}}});

"""
            content = content[:desc.end()] + block + content[desc.end():]
            changed = True

    # 4. Add afterEach if not present
    if 'afterEach' not in content.split('describe', 1)[-1] if 'describe' in content else True:
        # Find the end of beforeEach block to insert after
        be = re.search(r'([ \t]*)beforeEach\([^;]*;\s*\n', content, re.DOTALL)
        if not be:
            be = re.search(r'([ \t]*)beforeEach\(.*?\}\);\s*\n', content, re.DOTALL)
        if be:
            indent = be.group(1)
            after_block = f"""
{indent}afterEach(() => {{
{indent}    const remaining = getInputQueueLength();
{indent}    setThrowOnEmptyInput(false);
{indent}    clearInputQueue();
{indent}    assert.equal(remaining, 0, `Test did not consume all pushed inputs (${{remaining}} remaining)`);
{indent}}});

"""
            content = content[:be.end()] + after_block + content[be.end():]
            changed = True

    if changed:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

# Process all test files
files = sorted(glob.glob(os.path.join(test_dir, '*.test.js')))
fixed = []
for f in files:
    if fix_file(f):
        fixed.append(os.path.basename(f))

print(f'Fixed {len(fixed)} files:')
for name in fixed:
    print(f'  {name}')

# Verify
missing = []
for f in files:
    with open(f) as fh:
        content = fh.read()
    if 'pushInput' in content and 'setThrowOnEmptyInput' not in content:
        missing.append(os.path.basename(f))

if missing:
    print(f'\nWARNING: {len(missing)} files still missing throwOnEmpty:')
    for name in missing:
        print(f'  {name}')
else:
    print('\nAll pushInput files have throwOnEmpty guards.')
