# Gate 8 Cleanup Checklist

## 8A. Remove V3 Backward Compatibility Shims

### 8A.1 Remove `options` field from session files
- [ ] Write script to strip `options` from all 506 session JSON files
- [ ] Verify no JS code reads `session.options` directly (only from nethackrc)
- [ ] Run full test suite — all previously passing sessions still pass
- [ ] Verify `pes-report.mjs` still works

### 8A.2 Remove `_v4OptionsApplied` shim in `prepareReplayArgs`
- [ ] Delete the V4-to-options derivation block (replay_compare.js ~lines 357-376)
- [ ] Make `prepareReplayArgs` read character/flags from `nethackrc` directly
- [ ] Run full test suite

### 8A.3 Remove `parseSessionCharacter` complexity
- [ ] Delete `parseSessionCharacter()` (replay_compare.js ~lines 596-670)
- [ ] Character info comes from `parseNethackrcFull(session.nethackrc)` only
- [ ] Delete rank-title-to-role inference code
- [ ] Run full test suite

### 8A.4 Replace `buildGameplayReplayFlags`
- [ ] Identify all callers of `buildGameplayReplayFlags` in session_recorder.js
- [ ] Replace with `parseNethackrcFull` — one parsing path
- [ ] Run full test suite

### 8A.5 Remove multiple init option formats
- [ ] Remove `initOptions.character` with roleIndex/numeric constants
- [ ] Game init takes a `.nethackrc` string, parses it at init time
- [ ] One code path for C, headless, and browser init
- [ ] Run full test suite

### 8A.6 Remove session version branching
- [ ] Search for `version === 3`, `version < 4`, `version >= 4` in all JS
- [ ] Delete all V3-specific code paths
- [ ] All sessions are V4 — no fallback conversion
- [ ] Run full test suite

---

## 8B. Unified C Recording Path

### 8B.1 Design `record_c_session()` function
- [ ] Single function: `record_c_session(env, nethackrc, keys, output_path)`
- [ ] Writes nethackrc to temp HOME
- [ ] Sets env vars
- [ ] Launches nethack in tmux (no `-D`, no `-u`; everything via nethackrc)
- [ ] For each key: send, wait for RNG settle, capture screen/RNG/cursor
- [ ] Outputs session JSON with version 4 fields
- [ ] Unit test: record seed42 gameplay, verify matches existing session

### 8B.2 Convert startup to be key-driven (no auto-advance)
- [ ] Record the startup --More-- screens and space keys as steps
- [ ] No `wait_for_game_ready()` — chargen is either skipped by nethackrc
      or driven by keys in the sequence
- [ ] No `clear_more_prompts()` — --More-- dismissals are keys in the sequence
- [ ] Test: re-record seed42 with full startup keys, compare to original

### 8B.3 Extend session key sequences to include startup
- [ ] For each of the 6 session types, determine what startup keys are needed:
  - gameplay (with full chargen in nethackrc): just --More-- spaces
  - chargen: role/race/gender/align selection keys
  - interface: --More-- spaces + UI keys
  - option_test: --More-- spaces + gameplay keys
  - wizload: --More-- spaces + #wizloaddes keys
  - manual-direct-live: already has all keys from keylog
- [ ] Write a migration tool to prepend startup keys to existing sessions
- [ ] OR: re-record all sessions with unified recorder (captures everything)
- [ ] Test: re-recorded sessions match originals on all channels

### 8B.4 Simplify gen_* scripts to thin wrappers
- [ ] `gen_interface_sessions.py` → calls `record_c_session()` with UI keys
- [ ] `gen_option_sessions.py` → calls `record_c_session()` with option in nethackrc
- [ ] `gen_discoveries_session.py` → calls `record_c_session()` with `\` key
- [ ] Each script is < 30 lines (just data + function call)
- [ ] Test: regenerated sessions match originals

### 8B.5 Simplify `rerecord.py` dispatch
- [ ] Remove all `_build_*` functions (gameplay, chargen, wizload, interface, option_test)
- [ ] Single path: read session → extract env + nethackrc + keys → `record_c_session()`
- [ ] `regen` field only needed for compact move notation expansion
- [ ] Test: `rerecord.py --all` produces same results as before

### 8B.6 Delete auto-advance code
- [ ] Delete `wait_for_game_ready()` from run_session.py
- [ ] Delete `clear_more_prompts()` from run_session.py
- [ ] Delete all `_wait_for_text()` usage in gen_interface_sessions.py
- [ ] Delete chargen auto-selection code (role='v', race='h', etc.)
- [ ] Verify no remaining callers
- [ ] Run full test suite

### 8B.7 Delete or merge redundant scripts
- [ ] `keylog_to_session.py` → thin wrapper calling `record_c_session()`
      with keys extracted from keylog JSONL
- [ ] Evaluate whether `keylog_to_session.py` can be fully absorbed into
      `rerecord.py` or `record_c_session()`
- [ ] Delete duplicate CHARACTER_PRESETS definitions (in multiple files)
- [ ] Delete duplicate tmux setup code
- [ ] Verify line count reduction: run_session.py + gen_*.py + keylog_to_session.py
      + rerecord.py total should decrease significantly

---

## 8C. Unified JS Replay Path

### 8C.1 Simplify session loading
- [ ] `normalizeSession()` no longer needs V3 detection
- [ ] Remove startup extraction heuristics (steps[0] key===null detection)
- [ ] Session steps include ALL steps from game launch (including startup)
- [ ] Test: all sessions load correctly

### 8C.2 Simplify `prepareReplayArgs`
- [ ] Single path: parse nethackrc → init game → feed keys
- [ ] Delete `getManualDirectChargenInfo()` — chargen is just keys
- [ ] Delete `applyManualDirectChargenView()` — no special folding
- [ ] Delete `getChargenKeys()` — no separate chargen detection
- [ ] Test: all sessions replay correctly

### 8C.3 Browser replay via URL params
- [ ] `?session=path&clearLocalStorage` handler reads session JSON
- [ ] Passes env as URL params: `&NETHACK_SEED=...&NETHACK_DATETIME=...`
- [ ] Passes nethackrc as URL param: `&NETHACKOPTIONS=...`
- [ ] Same init logic as headless — only display backend differs
- [ ] Test: replay hi07_seed1060 in browser, verify screen matches C

### 8C.4 Delete legacy session_helpers.js facade
- [ ] Inline or delete `replayGameplaySession()` bridge function
- [ ] Remove V3 re-export shims
- [ ] Test: test_result_format.js still works

---

## 8D. Session Format Finalization

### 8D.1 Finalize V4 session schema
- [ ] Document final schema: `version`, `env`, `nethackrc`, `seed`, `source`,
      `type`, `regen`, `recorded_with`, `steps[]`
- [ ] `steps[]` includes ALL steps from game launch:
  - step 0: initial screen (key: null) — first thing on screen
  - steps 1-N: every keystroke including --More-- spaces, chargen,
    #wizloaddes typing, gameplay moves
- [ ] No `options` field
- [ ] Update `docs/SESSION_FORMAT_V3.md` → `SESSION_FORMAT_V4.md`

### 8D.2 Validate all sessions against schema
- [ ] Write a schema validator (or JSON Schema)
- [ ] Run on all 506 sessions
- [ ] Verify: every session has env, nethackrc, steps with complete key sequence

---

## Validation Gates

After each section (8A, 8B, 8C, 8D), run:
- [ ] `node --test test/comparison/test_result_format.js` — all sessions pass
- [ ] `node --test test/unit/nethackrc_parse.test.js` — parser tests pass
- [ ] `node scripts/pes-report.mjs` — PES report matches baseline
- [ ] Re-record one session of each type via `rerecord.py` — matches original
- [ ] Browser replay of at least one session works

## Order of Operations

Recommended execution order:
1. **8B.1-8B.2**: Build unified `record_c_session()` with key-driven startup
2. **8B.3**: Extend key sequences (or re-record all sessions)
3. **8B.4-8B.7**: Simplify/delete gen_* scripts, rerecord.py, auto-advance
4. **8A.1-8A.6**: Strip V3 shims from JS
5. **8C.1-8C.4**: Simplify JS replay path
6. **8D.1-8D.2**: Finalize format docs and validation
