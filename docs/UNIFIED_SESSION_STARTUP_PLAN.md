# Unified Session Startup Plan

## Goal

Replace the ad-hoc session startup options (`options.role`, `options.wizard`,
`character.roleIndex`, `regen.selections`, etc.) with two universal fields:

1. **`env`** — a dictionary of environment variables (NETHACK_SEED, NETHACK_FIXED_DATETIME, etc.)
2. **`nethackrc`** — the contents of a `.nethackrc` file as a string

These two fields fully determine game startup in C, headless JS, and browser JS
using the same code path.

## Current State

Sessions currently use a mix of:
- `options.role/race/gender/align/name` — character selection strings
- `options.wizard` — boolean
- `options.symset/autopickup/pickup_types/verbose/time/color` — game flags
- `options.datetime` — fixed datetime string
- `options.tutorial` — null/true/false
- `regen.mode` — startup mode (gameplay, chargen, interface, etc.)
- `regen.selections` — chargen menu choices
- `regen.tutorial` — tutorial choice
- `character` objects with numeric constants (roleIndex, RACE_HUMAN, etc.)

Each replay path (C harness, headless JS, browser JS) interprets these differently.

## Target State

```json
{
  "version": 4,
  "env": {
    "NETHACK_SEED": "1060",
    "NETHACK_FIXED_DATETIME": "20000110090000"
  },
  "nethackrc": "OPTIONS=name:Wizard,role:Wizard,race:human,gender:male,align:neutral\nOPTIONS=!autopickup,symset:DECgraphics,!verbose\nOPTIONS=!tutorial\nWIZARD=Wizard\n",
  "recorded_with": {"menace": "abc123", "nethack_c": "def456"},
  "steps": [...]
}
```

### How each replay path uses these fields:

**C replay:** `run_session.py` writes `nethackrc` to `~/.nethackrc`,
sets `env` as environment variables, runs the binary.

**Headless JS:** Parse `nethackrc` into flags + character options using
the same parser that loads `.nethackrc` from the virtual filesystem.
Set `env.NETHACK_SEED` as the RNG seed, `env.NETHACK_FIXED_DATETIME`
via `setFixedDatetime()`.

**Browser JS:** Same as headless. The `?session=` URL handler writes
`nethackrc` to the virtual `.nethackrc`, applies `env`, and starts the game.

### .nethackrc format

Standard NetHack OPTIONS format:
```
OPTIONS=name:Wizard,role:Wizard,race:human,gender:male,align:neutral
OPTIONS=!autopickup,symset:DECgraphics
OPTIONS=!tutorial
WIZARD=Wizard
```

This maps to:
- `name:Wizard` → player name
- `role:Wizard` → role selection (skips chargen role menu)
- `race:human` → race selection
- `gender:male` → gender selection
- `align:neutral` → alignment selection
- `!autopickup` → autopickup off
- `symset:DECgraphics` → DECgraphics symbol set
- `!tutorial` → skip tutorial prompt
- `WIZARD=Wizard` → enable wizard mode for user "Wizard"

### env dictionary

| Key | Purpose | Example |
|-----|---------|---------|
| NETHACK_SEED | RNG seed | "1060" |
| NETHACK_FIXED_DATETIME | Fixed time | "20000110090000" |
| NETHACK_EVENT_TEST_MOVE | Enable test_move events | "1" |
| NETHACK_EVENT_RUNSTEP | Enable runstep events | "1" |

Other env vars (NETHACK_RNGLOG, NETHACK_DUMPMAP, etc.) are harness-specific
and not stored in the session — they're set by the recorder at recording time.

## Translation from Current Format

Every current session can be mechanically translated:

| Current Field | .nethackrc Equivalent |
|---|---|
| `options.name: "Wizard"` | `OPTIONS=name:Wizard` |
| `options.role: "Valkyrie"` | `OPTIONS=role:Valkyrie` |
| `options.race: "human"` | `OPTIONS=race:human` |
| `options.gender: "female"` | `OPTIONS=gender:female` |
| `options.align: "neutral"` | `OPTIONS=align:neutral` |
| `options.wizard: true` | `WIZARD=<name>` |
| `options.autopickup: false` | `OPTIONS=!autopickup` |
| `options.symset: "DECgraphics"` | `OPTIONS=symset:DECgraphics` |
| `options.verbose: false` | `OPTIONS=!verbose` |
| `options.time: true` | `OPTIONS=time` |
| `options.color: false` | `OPTIONS=!color` |
| `options.tutorial: false` | `OPTIONS=!tutorial` |
| `options.rest_on_space: true` | `OPTIONS=rest_on_space` |
| `options.pickup_types: ""` | `OPTIONS=pickup_types:` |
| `options.datetime` | `env.NETHACK_FIXED_DATETIME` |
| `seed` | `env.NETHACK_SEED` |

## Execution Plan

### Gate 1: .nethackrc Parser (shared utility)

Write a `parseNethackrc(text)` function that converts `.nethackrc` text into
the options/flags/character structure the game needs. This already partially
exists in `storage.js:parseFlagsFromNethackrc()` but needs to handle character
selection fields (role, race, gender, align, name) and WIZARD directive.

**Test:** Unit tests that parse sample .nethackrc strings and verify the
resulting options match what the current `options` fields would produce.

**Measurable:** All 13 role presets produce correct character objects when
parsed from .nethackrc format.

### Gate 2: Session Format V4 Converter

Write a `convertV3toV4(session)` function that reads a V3 session and produces
a V4 session with `env` + `nethackrc` fields, preserving all `steps` data.
The V3 `options` and `seed` fields become derived from `env` and `nethackrc`.

**Test:** Convert all 568 sessions. Verify that `parseNethackrc(v4.nethackrc)`
produces the same character/flags as the V3 `options` fields.

**Measurable:** 568/568 sessions convert without data loss.

### Gate 3: Backward-Compatible Loading

Update session loading code to handle both V3 and V4. When a V4 session is
loaded, use `env` + `nethackrc` to derive the same `initOptions` that V3
produced. When a V3 session is loaded, convert on-the-fly.

**Test:** All 568 sessions pass parity tests regardless of whether they're
loaded as V3 or V4.

**Measurable:** 562/568 pass (same as current baseline — no regressions).

### Gate 4: C Harness Integration

Update `run_session.py` to accept V4 format: write `nethackrc` to `~/.nethackrc`,
set `env` vars, run the binary. Update `rerecord.py` to produce V4 output.

**Test:** Re-record a few representative sessions using V4 format. Verify
they produce identical RNG/screen output as V3 recordings.

**Measurable:** 5 re-recorded sessions match their V3 originals.

### Gate 5: Browser Integration

Update `?session=` handler to use V4 format: write `nethackrc` to virtual
`.nethackrc` in the filesystem, apply `env` vars, start the game.

**Test:** Replay a session in the visible browser. Verify screen matches
C reference at key steps.

**Measurable:** hi07_seed1060 session replays correctly in browser with
V4 format (same as current V3 replay).

### Gate 6: Batch Conversion

Convert all 568 session files to V4 format. Remove V3-specific loading code.
Update docs.

**Test:** Full session test suite passes.

**Measurable:** 562/568 pass (same baseline).

### Gate 7: Simplified Recorder

Update session recording to produce V4 directly. The recorder writes `env`
and `nethackrc` instead of the current `options` dictionary.

**Test:** Record a new session. Load and replay it. Verify parity.

## Risks and Mitigations

1. **Risk:** `.nethackrc` parsing differences between C and JS.
   **Mitigation:** Test that the same `.nethackrc` produces the same game
   state in both. The parser is already partially shared.

2. **Risk:** Some sessions use startup modes (chargen, interface, wizload)
   that don't map cleanly to `.nethackrc`.
   **Mitigation:** These modes still need keystroke sequences. The `.nethackrc`
   handles character/options setup; the mode-specific behavior is in the
   keystroke sequence itself.

3. **Risk:** Breaking 568 sessions during conversion.
   **Mitigation:** Gate 3 ensures backward compatibility. V3 sessions continue
   to work. V4 is opt-in until Gate 6.

## Non-Goals (for this PR)

- Changing the step/keystroke format
- Changing the RNG logging format
- Changing the screen capture format
- Restructuring the test runner
