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

## Actual Startup Paths in Practice (506 sessions)

| Mode | Count | % | Description |
|---|---|---|---|
| gameplay | 434 | 86% | Standard wizard-mode gameplay with pre-selected character |
| chargen | 54 | 11% | Character generation menu interaction recording |
| option_test | 6 | 1% | Testing a specific game option (verbose, time, etc.) |
| interface | 5 | 1% | UI/menu capture (options screen, discoveries, etc.) |
| wizload | 4 | 1% | Special level loading (castle, medusa, etc.) |
| manual-direct-live | 3 | 1% | Full keylog replay including interactive chargen |

96% are wizard mode. 86% are standard gameplay. The actual variety is low.

### Per-Path Conversion Plan

**gameplay (434 sessions):**
- `.nethackrc`: `OPTIONS=name:Wizard,role:Wizard,...` + `OPTIONS=!autopickup,DECgraphics,...` + `WIZARD=Wizard`
- `env`: `NETHACK_SEED=1060`, `NETHACK_FIXED_DATETIME=20000110090000`
- Keystroke recording starts at first gameplay key (step 0 screen is the initial map)
- This is the simplest and most common path. Already works with Gate 2 converter.

**chargen (54 sessions):**
- `.nethackrc`: `OPTIONS=name:Wizard` only (role/race/gender/align left unset so chargen runs)
- `env`: `NETHACK_SEED=42`, `NETHACK_FIXED_DATETIME=20000110090000`
- `regen.selections`: preserved for re-recording (e.g., "ahmn" = role a, race h, gender m, align n)
- The chargen selection keys are consumed by the interactive chargen prompts.
- Keystroke recording includes the chargen menu interactions.

**option_test (6 sessions):**
- `.nethackrc`: Standard character + the specific option being tested (e.g., `OPTIONS=verbose` or `OPTIONS=!verbose`)
- `env`: seed + datetime
- `regen.option`/`regen.value`: preserved for re-recording

**interface (5 sessions):**
- `.nethackrc`: Standard character
- `env`: seed + datetime
- `regen.keys`: UI interaction keys (e.g., "O><q" for options screen)
- `regen.subtype`: what type of interface is being captured

**wizload (4 sessions):**
- `.nethackrc`: Standard character
- `env`: seed + datetime
- `regen.level`: level name to warp to (e.g., "castle")
- The C harness uses `NETHACK_WIZLOAD_LEVEL` env or equivalent

**manual-direct-live (3 sessions):**
- `.nethackrc`: May be partial or empty (chargen happens interactively)
- `env`: seed + datetime
- Keystroke sequence includes ALL keys from the very beginning (chargen + gameplay)
- `regen.keylog_source`: path to original keylog file

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

**Verification of re-recorded sessions:** When re-recording existing sessions
through the simplified recorder, verify that the new recording achieves the
same gameplay as the original — not just matching RNG, but similar:
- Events (combat, item interactions, traps triggered)
- Screens (same messages, same map layouts)
- Dungeon levels visited (same depth progression)
- Interesting encounters (monsters fought, items used)

This ensures the `.nethackrc` + `env` startup produces a game state equivalent
to the original V3 `options` startup. A session that was designed to test
artifact invocation should still reach the point where artifacts are invoked.

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

### Gate 8: Cleanup — Unified Recording and Replay

**This is the most important gate.** The entire goal is to reduce complexity.
Every shim added during Gates 2-7 must be removed, and the recording
infrastructure must be consolidated into a single path per runtime.

#### 8A. Remove V3 Backward Compatibility Shims

1. **V3 `options` field from session files** — V4 sessions should only have
   `env` + `nethackrc` + `regen` + `steps`. No more `options.role`, `options.wizard`, etc.

2. **`_v4OptionsApplied` shim in prepareReplayArgs** — V4 is the only format.
   No on-the-fly conversion needed.

3. **`parseSessionCharacter` complexity** — Character info comes from `nethackrc`.
   No more parsing status lines to infer role from rank titles.

4. **`buildGameplayReplayFlags` in session_recorder.js** — Flags come from
   `nethackrc` via `parseNethackrcFull`. One code path.

5. **Multiple init option formats** — `initOptions.character` with roleIndex/
   numeric constants should be replaced by a `.nethackrc` string that gets
   parsed at init time. One parsing path for C, headless, and browser.

6. **Session version branching** — No `if (session.version === 3)` checks.
   All sessions are V4.

#### 8B. Unified C Recording Path

**Problem:** There are currently 6+ scripts that each launch C NetHack
differently (`run_session.py` with 4 modes, `gen_interface_sessions.py`,
`gen_option_sessions.py`, `gen_discoveries_session.py`, `keylog_to_session.py`).
Each has its own code for writing `.nethackrc`, setting env vars, starting
tmux, and capturing screens.  This duplication is the source of bugs
(e.g., missing `name:Wizard` in some generators, inconsistent capture-pane
flags, inconsistent --More-- handling).

**Target:** One function that records a C session.  Everything else is just
data (env, nethackrc, keys).

```python
def record_c_session(env, nethackrc, keys, output_path):
    """The single C recording path.

    1. Write nethackrc to a temp HOME dir
    2. Set env vars (NETHACK_SEED, NETHACK_FIXED_DATETIME, etc.)
    3. Launch nethack in tmux
    4. For each key in keys:
       a. Send the key
       b. Wait for RNG to settle (level-gen detection)
       c. Capture screen, RNG delta, cursor
       d. Record step
    5. Write session JSON
    """
```

**Key design principle: no special startup modes.**

- The `.nethackrc` determines what the game does at startup.  If it has
  `role:Valkyrie,race:human,...` then chargen is skipped by the game itself.
  If it omits those fields, chargen runs and the key sequence must include
  the selection keys.

- Startup `--More--` prompts (LANGSTROTH messages) are NOT auto-cleared.
  They are part of the session: the key sequence includes the space keys
  to dismiss them, and the screens before/after each `--More--` are
  captured as steps like any other.

- `#wizloaddes castle` is NOT a special post-startup action.  It's just
  keys in the sequence: `#`, `w`, `i`, `z`, `l`, `o`, `a`, `d`, `d`,
  `e`, `s`, `\n`, `c`, `a`, `s`, `t`, `l`, `e`, `\n`.

- Interactive chargen, tutorial prompts, name prompts — all just keys.

**What gets deleted:**

| Current | Replaced by |
|---------|-------------|
| `run_session.py` gameplay mode | `record_c_session(env, nethackrc, keys)` |
| `run_session.py` --chargen mode | same function, nethackrc omits role/race |
| `run_session.py` --interface mode | same function |
| `run_session.py` --wizload mode | same function, keys include #wizloaddes |
| `gen_interface_sessions.py` | thin wrapper calling `record_c_session` |
| `gen_option_sessions.py` | thin wrapper calling `record_c_session` |
| `gen_discoveries_session.py` | thin wrapper calling `record_c_session` |
| `keylog_to_session.py` | same function, keys from keylog file |
| `wait_for_game_ready()` | deleted — no auto-advance through chargen |
| `clear_more_prompts()` | deleted — --More-- keys are in the sequence |
| `_build_gameplay/_build_chargen/etc.` in rerecord.py | one path |

**rerecord.py simplification:** Currently dispatches to 5+ builder
functions.  After cleanup, re-recording any session is: read `env` +
`nethackrc` + `keys` from the session file, call `record_c_session`.
The `regen` field is only needed to reconstruct keys for sessions
that store a compact move notation rather than the full key list.

#### 8C. Unified JS Replay Path

Two JS paths (headless and browser) should share the same core:

1. Parse `nethackrc` → flags + character options
2. Apply `env` (seed, datetime)
3. Initialize the game
4. Feed keys one at a time, capture state after each

The headless test runner and the browser `?session=` handler should
both call the same initialization code.  The only difference is the
display backend (HeadlessDisplay vs Display).

**Browser plumbing note:** The browser path uses `?session=path` with
`&clearLocalStorage` to ensure a clean slate.  Because localStorage is
wiped, startup configuration (seed, datetime, nethackrc options) must
be passed via URL parameters rather than localStorage — e.g.,
`&NETHACKOPTIONS=...&NETHACK_SEED=...&NETHACK_DATETIME=...`.  The
browser init code reads these URL params and applies them the same way
the headless path applies `env` + `nethackrc`.  The mechanism differs
(URL params vs function args) but the logic is identical.

#### 8D. Session Key Sequences Must Be Complete

**All sessions must store the complete key sequence from game launch.**
This means:

- Startup `--More--` dismissals (space keys) are recorded as steps
- Chargen selections are recorded as steps (if chargen is interactive)
- Tutorial prompt responses are recorded as steps
- `#wizloaddes` typing is recorded as steps

The `keys` in a session should be sufficient to fully replay the session
from a cold nethack launch with only the `env` + `nethackrc` configuration.
No hidden auto-advance or auto-clear logic.

**Migration:** Existing sessions that rely on auto-advance (most gameplay
sessions) need their key sequences extended to include the startup
`--More--` spaces and any chargen-skip confirmations.  This can be done
by re-recording with the unified recorder, which captures everything.

#### Measurables

- **Line count:** Total lines in `run_session.py` + `gen_*.py` +
  `keylog_to_session.py` + `rerecord.py` should decrease significantly.
  The gen_* scripts become < 30 lines each (just data + a call to
  `record_c_session`).

- **Code paths:** One C recording function.  One JS replay core.
  No `if mode == 'gameplay'` / `elif mode == 'chargen'` branching.

- **Session format:** `parseSessionCharacter` (50+ lines of status-line
  role inference) deleted.  `buildGameplayReplayFlags` replaced by
  `parseNethackrcFull`.  No V3 code paths.

- **Correctness:** All sessions re-record identically (modulo the known
  platform differences: tmux encoding, C source line numbers, step
  boundary timing at level transitions).

**Test:** All currently passing sessions still pass.  No V3-specific
code paths remain.  Re-recording any session type uses the same function.
