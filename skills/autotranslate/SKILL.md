---
name: autotranslate
description: Use this skill when autotranslating C functions to JS using the c_translator pipeline, including running the translator, fixing up output, and expanding macro_rewrites.json.
---

# Autotranslation Skill

## When To Use
Use this when translating C functions from `nethack-c/upstream/src/*.c` into JS
equivalents in `js/*.js`, using the autotranslator toolchain.

## Quick Reference

### Single function translation
```bash
conda run -n base python tools/c_translator/main.py \
  --src nethack-c/upstream/src/music.c \
  --func awaken_monsters \
  --emit emit-helper \
  --out /tmp/music_awaken_monsters.json
```

### Batch translation (all functions in a file)
```bash
conda run -n base python tools/c_translator/batch_emit.py \
  --src nethack-c/upstream/src/music.c \
  --out-dir /tmp/music_batch/ \
  --summary-out /tmp/music_batch_summary.json
```

### Capability scan (which functions can translate?)
```bash
conda run -n base python tools/c_translator/capability_matrix.py \
  --src nethack-c/upstream/src/music.c \
  --out /tmp/music_capability.json
```
Use this first to identify which functions are translatable vs blocked.

### Reading output
The `--emit emit-helper` output is a JSON file with key `"js"` containing the
translated JS code. Extract it with:
```bash
python3 -c "import json; print(json.load(open('/tmp/output.json'))['js'])"
```

## Emit Modes

| Mode | Use |
|------|-----|
| `emit-helper` | **Primary.** Produces JS function code. |
| `capability-summary` | Shows what blocks each function (missing macros, etc.) |
| `async-summary` | Shows which functions need async/await |
| `parse-summary` | Raw parse tree info |
| `scaffold` | Generates a full JS module scaffold |
| `patch` | Generates a patch to apply to existing JS |

## Rulesets (tools/c_translator/rulesets/)

### macro_rewrites.json
Maps C macros to JS equivalents. Most impactful for fixing translator output.

```json
{"c": "mdistu($1)", "js": "mdistu($1, player)", "requires_params": ["player"]}
```

- `$1`, `$2` etc. are positional arguments
- `requires_params` causes the translator to add those params to the function signature
- 0-arg macros work too: `{"c": "Upolyd", "js": "(player.umonnum !== player.umonster)", ...}`

### state_paths.json
Maps C global state references (like `u.ux`, `u.uhp`, `fmon`) to JS equivalents
(`player.x`, `player.hpmax`, etc.). Same format as macro_rewrites.

### boundary_calls.json
Declares which functions are async boundaries (need await). The translator uses
this to infer async/await propagation.

### function_map.json
Maps C function names to their JS module locations.

### identifier_aliases.json
Maps C identifiers to JS equivalents (e.g. `mindless` -> `is_mindless`).

## Common Fixup Patterns

The autotranslator handles most syntax correctly but has known systematic gaps.
After translating, always apply these manual fixes:

### 1. C linked-list iteration (MOST COMMON)
```c
// C: for (mtmp = fmon; mtmp; mtmp = mtmp->nmon) { ... }
```
```js
// Fix: for (const mtmp of (map.monsters || [])) { ... }
```
The translator emits the C-style linked-list loop literally. Always convert to
JS array iteration. Use `map.monsters` for monster lists, `map.objects` for
object lists, etc.

### 2. Missing async/await
Check if the function calls any async function (pline, You, monflee, awaken_scare,
etc.). If so, the function itself must be `async` and calls must be `await`ed.
The translator's `async-summary` mode can help but doesn't catch everything.

### 3. C integer division
```c
distance / 3    // C: truncates to int
```
```js
Math.floor(distance / 3)  // JS: must explicitly truncate
```

### 4. printf format strings -> template literals
```c
pline("%s freezes.", Monnam(mtmp));
```
```js
await pline(`${Monnam(mtmp)} freezes.`);
```
The translator has a template literal pass but it doesn't always trigger.

### 5. C `&=` on booleans — DO NOT convert to `&&`
```c
do_spec &= (rn2(ACURR(A_DEX)) + u.ulevel > 25);  // always evaluates rn2()
```
The translator correctly emits `&=` as-is. **Do NOT "improve" this to `&&`.**
JS `&&` short-circuits: if `do_spec` is false, the RHS is never evaluated,
meaning `rn2()` is never called — a silent RNG divergence. Keep `&=` or use
explicit `&` (bitwise AND):
```js
do_spec = do_spec & (rn2(ACURR(player, A_DEX)) + ulevel > 25);
```

### 6. `||` with falsy constants (D_NODOOR=0, etc.)
```js
// BUG: D_NODOOR is 0 (falsy), so || skips it
if ((loc.doormask || loc.flags || 0) === D_NODOOR)  // WRONG
// FIX: use ?? (nullish coalescing) to preserve 0
if ((loc.doormask ?? loc.flags ?? 0) === D_NODOOR)   // RIGHT
```
When the comparison target is 0 or another falsy value, `||` chains silently
skip it. Use `??` which only falls through on null/undefined.

### 7. C pass-by-reference
```c
void func(int *xp, int *yp) { *xp = 5; }
```
```js
// Return an object instead: return { x: 5, y: ... }
```

### 8. monsdat(mtmp) -> mtmp.data || mtmp.type
The translator emits `monsdat(mtmp)` for `mtmp->data`. Fix to `mtmp.data || mtmp.type`.

### 9. Missing function parameters
C functions access globals (player, map, fov, display) directly. JS needs them
as explicit parameters. The translator adds params declared in `requires_params`
from macro/state rewrites, but callers must also be updated to pass them.

### 10. NOTELL parameter on resist()
C: `resist(mtmp, TOOL_CLASS, 0, NOTELL)` — JS `resist()` only takes 2 args.
Drop extra args.

### 11. Missing `the()` wrapper on object names
C: `the(xname(instr))` — the translator may drop the `the()` call. Verify
against C source that object name messages include the appropriate article.

## Workflow: Translating a New Batch

1. **Scan capabilities**: Run `capability_matrix.py` to see which functions translate.
2. **Check macro_rewrites.json**: Add any missing macros the functions use.
3. **Translate**: Run `main.py --emit emit-helper` for each function.
4. **Compare**: Diff autotranslated output vs existing manual JS implementation.
5. **Fix up**: Apply the manual fixes above (linked lists, async, Math.floor, etc.).
6. **Mark**: Add `// Autotranslated from <file>:<line>` as the first line of each function.
7. **Test**: Run `npm test` to verify baseline is maintained.
8. **Iterate on rewrites**: If you applied the same fix 3+ times, add it to macro_rewrites.json.

## Tips

- **Start from existing JS when it exists.** The manual implementations are often
  already correct. Use the autotranslated output as a reference to check for
  C-logic divergences, not as the sole source of truth.
- **Check function signatures carefully.** The C source has one global namespace;
  JS needs explicit map/player/fov/display parameters threaded through.
- **Beware `mtmp.sleeping = false`** — this is a JS-only field. C only uses
  `mtmp->msleeping` (integer). Remove `.sleeping` assignments unless the JS
  codebase specifically uses them.
- **The `(mtmp.mstrategy || 0) & MASK` pattern** is needed because JS undefined
  gives NaN for bitwise ops, while C initializes to 0.
- **Test after each batch**, not each function. The functions are often
  interdependent and a single `npm test` validates the whole batch.
- **Use `--emit capability-summary`** when a function fails to translate. It tells
  you exactly which macros/identifiers are blocking and what to add to the rulesets.
