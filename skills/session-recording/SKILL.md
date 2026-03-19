---
name: session-recording
description: Use this skill when recording, re-recording, or managing C session captures and golden files for gameplay parity testing.
---

# Session Recording Skill

## When To Use
Use this when recording new C sessions, re-recording stale ones, managing golden
files, or debugging tmux capture artifacts.

## Session File Format (v3)

Session files live in `test/comparison/sessions/` as JSON:

```json
{
  "version": 3,
  "seed": 42,
  "source": "c",
  "type": "gameplay",
  "regen": {"mode": "gameplay", "moves": ":h.", "key_delay_s": 0.05},
  "options": {"name": "Wizard", "role": "Valkyrie", "race": "human",
              "gender": "female", "align": "neutral", "wizard": true,
              "symset": "DECgraphics"},
  "steps": [
    {"key": null, "rng": [...], "screen": "...", "typGrid": "..."},
    {"key": "h", "rng": ["rn2(12)=2 @ mon.c:1145", ...], "screen": "..."}
  ]
}
```

**Per-step fields:**
- `key`: Keystroke sent (null for startup)
- `rng`: Array of RNG calls (`fn(args)=result @ file:line`), midlog markers
  (`>func`/`<func`), and event entries (`^place[...]`, `^die[...]`)
- `screen`: ANSI-compressed terminal screen
- `typGrid`: RLE-encoded terrain grid (on level changes)
- `cursor`: Terminal cursor position `[col, row, visible]`

## Recording Methods

### Re-record an existing session (most common)
```bash
python3 test/comparison/c-harness/rerecord.py <session.json>

# Re-record all sessions
python3 test/comparison/c-harness/rerecord.py --all

# Parallel (up to 8 workers)
python3 test/comparison/c-harness/rerecord.py --all --parallel 8

# Dry run (preview commands)
python3 test/comparison/c-harness/rerecord.py --all --dry-run
```

### Record a new automated session
```bash
python3 test/comparison/c-harness/run_session.py \
  <seed> <output.json> '<move_sequence>' --character valkyrie
```

### Record a new manual (interactive) session
```bash
python3 test/comparison/c-harness/record_manual_session_v3.py \
  --seed 99 --name "Wizard" --role "Valkyrie" --race "human" \
  --gender "female" --align "neutral" --wizard
```

### Autofeed a keylog (non-interactive but with manual-style capture)
```bash
python3 test/comparison/c-harness/record_manual_session_v3.py \
  --autofeed --autofeed-keylog <keylog_file> --seed 99
```

## Move Encoding

- Directions: `h/j/k/l/y/u/b/n` (vi-style)
- Wait: `.`, Search: `s`, Pickup: `,`, Look: `:`
- Stairs: `>` (down), `<` (up)
- Fight: `F<dir>` (e.g., `Fj` = fight south)
- Multi-key: `w<x>` wield, `W<x>` wear, `e<x>` eat, `q<x>` quaff, `z<x><dir>` zap
- Control chars: `\x01`–`\x1a`

## How the C Harness Works

1. **C Binary**: Patched NetHack 3.7.0 with deterministic PRNG
2. **tmux session**: Runs in 80x24 terminal (`tmux new-session -x 80 -y 24`)
3. **Keystroke injection**: `tmux send-keys` with configurable delay
4. **Screen capture**: `tmux capture-pane` reads terminal state
5. **RNG logging**: C patches write calls to `NETHACK_RNGLOG` file
6. **Terrain dumps**: C `#dumpmap` writes typGrid to `NETHACK_DUMPMAP` file

**Key environment variables:**
```bash
NETHACK_SEED=<N>                    # Fixed PRNG seed
NETHACK_RNGLOG=<path>               # RNG call log
NETHACK_DUMPMAP=<path>              # Terrain grid dump
NETHACK_NO_DELAY=1                  # Suppress C tty delays
NETHACK_KEY_DELAY_S=<seconds>       # Per-key send delay (default 0.02)
NETHACK_FINAL_CAPTURE_DELAY_S=<s>   # Extra settle time before final capture
```

## Timing Overrides

Stored in `regen.key_delay_s` (global) or per-step in `steps[].capture.key_delay_s`:
```bash
# Slower global delay
NETHACK_KEY_DELAY_S=0.05 python3 rerecord.py ...

# Per-step overrides (1-based step index)
NETHACK_KEY_DELAYS_S='{"3":0.15, "4":0.15}' python3 rerecord.py ...
```

## Golden Files (Map Grids)

Location: `test/comparison/maps/seed<N>_maps_c_golden.session.json`

**Generate:**
```bash
# All seeds, all depths
python3 test/comparison/c-harness/gen_map_sessions.py --c-golden

# Depth 1 only (faster)
python3 test/comparison/c-harness/gen_map_sessions.py --c-golden-depth1

# Single seed
python3 test/comparison/c-harness/gen_map_sessions.py <seed> [max_depth]
```

**Compare JS vs C grids:**
```bash
node test/comparison/analyze_golden.js [--depth-1-only] [--verbose]
```

## Running Session Tests

```bash
# All tests (unit + gameplay + special)
npm test

# Full 150-session PES report
scripts/run-and-report.sh
scripts/run-and-report.sh --failures    # Failing rows only
scripts/run-and-report.sh --why         # With AI diagnosis labels

# Instant replay of last results (no re-run)
node scripts/pes-report.mjs

# Per-step RNG microscope
node test/comparison/rng_step_diff.js <session> --step <N> --window 8

# Single session verbose
node test/comparison/session_test_runner.js --verbose <session-path>
```

## Common Pitfalls

### Tmux timing artifacts
- **Symptom**: "Never mind." message, screen corruption, or RNG mismatch
- **Cause**: Key send rate too fast or screen captured mid-animation
- **Fix**: Increase `key_delay_s` to 0.05–0.10s, or add per-step delays

### Screen flicker / wrong capture state
- **Symptom**: Session captures transient message that JS doesn't reproduce
- **Cause**: Screen captured before game fully processed the key
- **Fix**: Add `NETHACK_FINAL_CAPTURE_DELAY_S=0.10` for last step

### Re-recording produces different result
- **Cause**: Stale C binary, leftover save/bones files
- **Fix**: `rerecord.py` calls `clear_runtime_state()` automatically; if still
  wrong, rebuild C binary from scratch

### --More-- prompts hang recording
- **Cause**: run_session.py waits for "Dlvl:" status line but More blocks
- **Fix**: Use `--record-more-spaces` flag, or manually press Space in tmux

### Validating a re-recorded session

Re-recording can silently produce a degraded session if startup alignment
drifts or the C binary changed. **Always compare before and after:**

1. **Dungeon levels visited**: Extract the set of `Dlvl:` / `Tutorial:` values
   from bot lines in the old and new session. The new session must visit the
   same set of levels (or more). If levels are lost, the replay diverged.

2. **Key gameplay events**: Check that distinctive messages from the old session
   still appear in the new one:
   - Kill messages: `"You kill the ..."`, `"You destroy the ..."`
   - Combat: `"You hit the ..."`, `"The ... bites!"`
   - Items: `"You find ..."`, `"You pick up ..."`
   - Level changes: `"You descend the staircase."`

3. **Step count**: The new session should have the same number of steps
   (or very close). A large difference indicates misaligned replay.

4. **RNG call count**: Compare total RNG calls. A significant difference
   signals that the game took a different path.

If ANY of these checks fail, do NOT replace the old session. Investigate
the cause — common issues are:
- Binary version mismatch (rebuild with `setup.sh`)
- Startup key alignment (chargen keys consumed differently)
- Leftover save/bones files (should be auto-cleaned, but verify)
- Timing-dependent --More-- prompts (increase `key_delay_s`)

### When to re-record vs. add a comparator mask
- **Rule**: Always try re-recording first. Comparator masks (`comparators.js`)
  should only be added for known JS-vs-C differences that are intentional.
- **Use `comparator_policy.js`** for systematic masking (e.g., "--More--" race).

## Key Files

| File | Purpose |
|------|---------|
| `test/comparison/c-harness/rerecord.py` | Re-record existing sessions |
| `test/comparison/c-harness/run_session.py` | Automated session recording |
| `test/comparison/c-harness/record_manual_session_v3.py` | Interactive recording |
| `test/comparison/c-harness/gen_map_sessions.py` | Golden grid generation |
| `test/comparison/session_test_runner.js` | JS replay + comparison |
| `test/comparison/comparators.js` | Screen/RNG comparison logic |
| `test/comparison/comparator_policy.js` | Systematic comparison masks |
| `test/comparison/rng_step_diff.js` | Per-step RNG debugging |
| `test/comparison/seeds.json` | Seed registry for batch operations |
| `scripts/run-and-report.sh` | Full PES report runner |
| `scripts/pes-report.mjs` | PES report from cached results |
