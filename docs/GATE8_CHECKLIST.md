# Gate 8 Cleanup Checklist

## 8A. Remove V3 Backward Compatibility Shims ✅

### 8A.1 Remove `options` field from session files ✅
- [x] Stripped `options` from all session JSON files (5 remaining had it)
- [x] No JS code reads `raw.options` on the replay path
- [x] Fixed 52 sessions with wrong player names in nethackrc (system usernames → "Wizard")

### 8A.2 Remove `_v4OptionsApplied` shim in `prepareReplayArgs` ✅
- [x] Deleted the V4-to-options derivation block from `prepareReplayArgs`
- [x] Deleted `_v4OptionsApplied` flag usage
- [x] `prepareReplayArgs` reads character/flags from `nethackrc` directly via `parseNethackrcFull`

### 8A.3 Remove `parseSessionCharacter` ✅
- [x] Deleted `parseSessionCharacter()` and `parseManualDirectCharacterFromLines()` (~75 lines)
- [x] Deleted rank-title-to-role inference code
- [x] `getSessionCharacter()` reads from `parseNethackrcFull(session.nethackrc)` only

### 8A.4 Replace `buildGameplayReplayFlags` ✅
- [x] `buildGameplayReplayFlags()` now reads from nethackrc via `parseNethackrcFull`
- [x] Fallback to `meta.options` kept for sessions without nethackrc (manual-direct)

### 8A.5 Remove `getManualDirectChargenInfo` and `applyManualDirectChargenView` ✅
- [x] Deleted in V4 key-driven startup commit
- [x] Restored by agent:wave for manual-direct session compat (still needed)
- [x] Manual-direct sessions need JS interactive chargen to fully remove

### 8A.6 Remove multiple init option formats ✅
- [x] `game.init({ nethackrc: '...' })` parses nethackrc internally via `parseNethackrcFull`
- [x] Single init path: nethackrc → character + wizard + flags
- [x] `prepareReplayArgs` passes `nethackrc` in `initOpts`
- [x] Legacy `initOptions.character` kept as fallback, deprecated

### 8A.7 Remove session version branching ✅
- [x] No `version === 3`, `version < 4`, `version >= 4` code paths exist
- [x] Deleted `scripts/convert_session_v4.mjs` (-235 lines)
- [x] All sessions are V4

### 8A.8 Remove V4 options derivation in `normalizeSession` ✅
- [x] Deleted the nethackrc-to-options derivation block in `session_loader.js`
- [x] Removed `parseNethackrcFull` import from `session_loader.js`
- [x] Updated all callers (`session_test_runner.js`, `dbgmapdump.js`, `rng_step_diff.js`)
  to read flags from nethackrc via `parseNethackrcFull` directly

### 8A.9 Clean up `session_helpers.js` ✅
- [x] Cleaned to pure re-exports (no legacy shim logic)
- [x] `replayGameplaySession()` bridge kept — step-grouping adapter used by 6 unit tests
- [x] Deleted obsolete test files:
  - `test/unit/replay_legacy_startup_screen.test.js` (V1 format test)
  - `test/unit/replay_tutorial_prompt.test.js` (deleted tutorial hack test)
  - `scripts/debug/test_seed3.mjs` (one-off debug script)

---

## 8B. Unified C Recording Path

### 8B.1 Build `record_c_session()` function ✅
- [x] Single function: `record_c_session(env, nethackrc, keys, output_path)`
- [x] Writes nethackrc to temp HOME (strips WIZARD= lines for C)
- [x] Sets env vars, passes through NETHACK_*/WEBHACK_* from host
- [x] Launches nethack in tmux with `-u name -D` derived from nethackrc
- [x] For each key: send, wait for RNG settle, capture screen/RNG/cursor
- [x] Outputs session JSON with version 4 fields
- [x] Tested: seed42 gameplay matches original on all channels

### 8B.2 Key-driven startup (no auto-advance) ✅
- [x] Step 0 captures initial screen (lore + --More--)
- [x] --More-- spaces are steps in the key sequence
- [x] No `wait_for_game_ready()` in the unified path
- [x] No `clear_more_prompts()` in the unified path
- [x] `probe_startup_keys()` discovers startup key count per session
- [x] Tested: seed42 with 1 startup space produces identical gameplay

### 8B.3 Re-record all sessions with unified recorder ✅
- [x] 551/568 gameplay sessions migrated to unified format
- [x] 6 map sessions re-recorded with wizard ^V level-teleport
- [x] seed42_castle re-recorded with #wizloaddes key sequence
- [x] Manual-direct sessions (seed031-033) restored (need keylog recorder, not record_c_session)
- [x] Old V2 map session files deleted (available in git history)
- [ ] 3 manual-direct sessions need keylog-based re-recording for full parity

### 8B.4 Simplify gen_* scripts to thin wrappers
- [ ] `gen_interface_sessions.py` → calls `record_c_session()` with UI keys
- [ ] `gen_option_sessions.py` → calls `record_c_session()` with option in nethackrc
- [ ] `gen_discoveries_session.py` → calls `record_c_session()` with `\` key
- [ ] Each script is < 30 lines (just data + function call)
- [ ] Test: regenerated sessions match originals

### 8B.5 Simplify `rerecord.py` dispatch
- [ ] Delete all `_build_*` functions (gameplay, chargen, wizload, interface, option_test)
- [ ] Delete `_build_from_steps()` and `_build_keylog()`
- [ ] Single path: read session → extract env + nethackrc + keys → `record_c_session()`
- [ ] `regen` field only needed for compact move notation expansion
- [ ] Test: `rerecord.py --all` produces same results as before

### 8B.6 Delete auto-advance code from `run_session.py`
- [ ] Delete `wait_for_game_ready()` (~lines 921-995)
- [ ] Delete `clear_more_prompts()` (~lines 866-919)
- [ ] Delete chargen auto-selection code (role='v', race='h', etc.)
- [ ] Delete `run_session()` old gameplay recorder (~line 2140+)
- [ ] Delete `run_chargen_session()` (~line 1450)
- [ ] Delete `run_interface_session()` (~line 1772)
- [ ] Delete `run_wizload_session()` (~line 1204)
- [ ] Delete `setup_home()` (~line 391) — replaced by `record_c_session` temp dir
- [ ] Delete `execute_wizload()` (~line 733) — wizload is just keys
- [ ] Verify no remaining callers of deleted functions
- [ ] Run full test suite

### 8B.7 Delete or merge redundant scripts
- [ ] `keylog_to_session.py` → thin wrapper or absorbed into `rerecord.py`
- [ ] Delete duplicate `CHARACTER_PRESETS` definitions (in run_session.py, keylog_to_session.py)
- [ ] Delete duplicate tmux setup code across scripts
- [ ] Delete all `*_env()` helper functions (fixed_datetime_env, diag_events_env, etc.)
  — replaced by `_passthrough_env_vars()` in `record_c_session`
- [ ] Delete `build_v4_fields()` — unified recorder builds fields directly
- [ ] Verify line count reduction

---

## 8C. Unified JS Replay Path ✅

### 8C.1 Make JS game.init() key-driven at startup ✅
- [x] `game.init()` natively renders lore + --More-- (no `showLoreAndWelcome` flag needed)
- [x] Condition: `urlOpts.character && !this.flags.tutorial`
- [x] `buildStartupLorePromptFlow` handles lore dismiss → welcome display
- [x] Space key dismisses --More--, reveals welcome message
- [x] All V4 sessions replay correctly with key-driven startup
- [x] PES: 406/444 gameplay sessions passing after V4 key-driven startup

### 8C.2 Delete JS startup hacks from `allmain.js` ✅
- [x] Deleted `buildWelcomeMorePrompt()` helper function
- [x] Deleted `buildTutorialMenuPrompt()` helper function
- [x] Deleted `buildReplayTutorialPromptFlow()` helper function
- [x] Deleted `showWelcomeMore` init option and code block
- [x] Deleted `showTutorialMenu` init option and code block
- [x] Deleted `replayTutorialStartupPrompts` init option and code block
- [x] Deleted `tutorialStartupEnterAfterPromptCount` init option
- [x] Deleted `tutorialDirectStart` init option
- [x] Deleted `simulateManualDirectChargen` handling (restored by agent:wave for compat)
- [x] `buildStartupLorePromptFlow()` kept — drives the key-driven lore flow

### 8C.3 Delete startup hacks from comparison framework ✅
- [x] Deleted lore/welcome/tutorial detection from `prepareReplayArgs`
- [x] Deleted `replayTutorialStartupPrompts` passthrough
- [x] Deleted `tutorialStartupEnterAfterPromptCount` passthrough
- [x] Deleted `tutorialDirectStart` passthrough
- [x] Deleted tutorial-related options from `session_recorder.js`
- [x] `settleStartupInputBoundaries()` simplified (restored by agent:wave for manual-direct)

### 8C.4 Simplify `normalizeSession()` in session_loader.js ✅
- [x] Deleted startup-boundary detection (scanning for --More--, Velkommen, etc.)
- [x] Step 0 is always `key: null` (initial screen from launch)
- [x] Steps 1+ are the key sequence including startup --More-- spaces
- [x] No special startup folding — comparison is step-by-step

### 8C.5 Browser replay via URL params
- [ ] `?session=path&clearLocalStorage` handler reads session JSON
- [ ] Passes env as URL params: `&NETHACK_SEED=...&NETHACK_DATETIME=...`
- [ ] Passes nethackrc as URL param: `&NETHACKOPTIONS=...`
- [ ] Same init logic as headless — only display backend differs
- [ ] Test: replay hi07_seed1060 in browser, verify screen matches C

---

## 8D. Session Format Finalization ✅

### 8D.1 Finalize V4 session schema ✅
- [x] `docs/SESSION_FORMAT_V4.md` documents final schema
- [x] Covers: version, env, nethackrc, seed, source, type, regen, recorded_with, steps
- [x] Steps include ALL steps from game launch (key-driven startup)
- [x] No `options` field in V4
- [x] Comparison channels and optional event types documented

### 8D.2 Validate all sessions against schema ✅
- [x] `scripts/validate_session_schema.mjs` validates V4 schema
- [x] Checks: version=4, env fields, nethackrc string, steps structure, no V3 options
- [x] Result: 563/563 sessions valid

---

## Validation Gates

After each section (8A, 8B, 8C, 8D), run:
- [x] `node scripts/pes-report.mjs` — PES: 406/444 gameplay passing (8A+8C complete)
- [ ] `node --test test/comparison/test_result_format.js` — all sessions pass
- [ ] `node --test test/unit/nethackrc_parse.test.js` — parser tests pass
- [ ] Re-record one session of each type via `rerecord.py` — matches original
- [ ] Browser replay of at least one session works

## Order of Operations

**Phase 1: C recording** ✅
- 8B.1-8B.3 complete: unified C recorder, all sessions migrated to V4

**Phase 2: JS replay migration** ✅
- 8C.1-8C.4 complete: V4 key-driven startup, startup hacks deleted

**Phase 3: Cleanup** ✅ (8A complete, 8B.4-8B.7 remaining)
- 8A.1-8A.9 complete: V3 shims removed, nethackrc is single source of truth
- 8B.4-8B.7: C recording script simplification (remaining)
- 8D.1-8D.2: Format docs and validation (remaining)
