# Gate 8 Cleanup Checklist

## 8A. Remove V3 Backward Compatibility Shims

### 8A.1 Remove `options` field from session files
- [ ] Write script to strip `options` from all 506 session JSON files
- [ ] Verify no JS code reads `session.options` directly (only from nethackrc)
- [ ] Run full test suite — all previously passing sessions still pass
- [ ] Verify `pes-report.mjs` still works

### 8A.2 Remove `_v4OptionsApplied` shim in `prepareReplayArgs`
- [ ] Delete the V4-to-options derivation block (`replay_compare.js` ~lines 357-377)
- [ ] Delete `_v4OptionsApplied` flag usage
- [ ] `prepareReplayArgs` reads character/flags from `nethackrc` directly via `parseNethackrcFull`
- [ ] Run full test suite

### 8A.3 Remove `parseSessionCharacter`
- [ ] Delete `parseSessionCharacter()` (`replay_compare.js` ~lines 596-670)
- [ ] Delete rank-title-to-role inference code
- [ ] Character info comes from `parseNethackrcFull(session.nethackrc)` only
- [ ] Run full test suite

### 8A.4 Replace `buildGameplayReplayFlags`
- [ ] Delete `buildGameplayReplayFlags()` (`session_recorder.js` lines 35-50)
- [ ] Replace all callers with `parseNethackrcFull` — one parsing path
- [ ] Run full test suite

### 8A.5 Remove `getManualDirectChargenInfo` and `applyManualDirectChargenView`
- [ ] Delete `getManualDirectChargenInfo()` (`replay_compare.js` ~lines 242-275)
- [ ] Delete `applyManualDirectChargenView()` (`replay_compare.js` ~lines 319-344)
- [ ] Delete `getChargenKeys()` — no separate chargen detection
- [ ] Manual-direct sessions record chargen as normal key-driven steps
- [ ] Run full test suite

### 8A.6 Remove multiple init option formats
- [ ] Remove `initOptions.character` with roleIndex/numeric constants
- [ ] Game init takes a `.nethackrc` string, parses it at init time
- [ ] One code path for C, headless, and browser init
- [ ] Run full test suite

### 8A.7 Remove session version branching
- [ ] Search for `version === 3`, `version < 4`, `version >= 4` in all JS
- [ ] Delete all V3-specific code paths
- [ ] Delete `convertV3toV4()` and `scripts/convert_session_v4.mjs`
- [ ] All sessions are V4 — no fallback conversion
- [ ] Run full test suite

### 8A.8 Remove V4 options derivation in `normalizeSession`
- [ ] Delete the V4-to-options derivation block in `session_loader.js`
  (the block that calls `parseNethackrcFull` to populate `options` when absent)
- [ ] `normalizeSession` no longer needs to derive options — they come from nethackrc
- [ ] Run full test suite

### 8A.9 Delete legacy `session_helpers.js` facade
- [ ] Delete `replayGameplaySession()` bridge function (`session_helpers.js` lines 58-88)
- [ ] Delete V3 re-export shims (`session_helpers.js` lines 1-19)
- [ ] Inline any needed functionality into callers
- [ ] Run full test suite

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

### 8B.3 Re-record all sessions with unified recorder
- [ ] Add `!tutorial` to nethackrc for all sessions that had auto-advance
- [ ] Re-record all gameplay sessions (prepend startup keys)
- [ ] Re-record all interface sessions
- [ ] Re-record all option_test sessions
- [ ] Re-record all wizload sessions
- [ ] Fix chargen sessions: nethackrc should omit role/race/gender/align
- [ ] Re-record chargen sessions with chargen keys in sequence
- [ ] Re-record manual-direct-live sessions (already have complete keys)
- [ ] Validate: all re-recorded sessions match originals on PRNG/screen/cursor/events

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

## 8C. Unified JS Replay Path

### 8C.1 Make JS game.init() key-driven at startup

**Current state (partial):**
- `showLoreAndWelcome` detection in `prepareReplayArgs` works for both
  old and unified formats (detects lore in step 0 screen)
- `buildStartupLorePromptFlow` re-renders map after lore dismissal (fixed)
- `normalizeSession` correctly folds startup --More-- steps into startup
- C session data matches original on all channels after migration
- **Blocker:** JS replay with `showLoreAndWelcome=true` produces slightly
  different screen output than without it. The welcome message display
  and --More-- prompt handling during the pendingPrompt flow doesn't
  perfectly match the non-lore path. Need to debug the JS replay screen
  differences when lore flow is active.

- [ ] Fix JS replay screen output when `showLoreAndWelcome` is active
  to match the non-lore path for post-startup gameplay steps
- [ ] `game.init()` renders lore text + --More-- and WAITS (sets pendingPrompt)
- [ ] Space key dismisses --More--, reveals welcome + --More--
- [ ] Second space dismisses welcome, reveals game map
- [ ] Tutorial prompt (if enabled) is a pendingPrompt, dismissed by key
- [ ] No special init options needed — the key sequence drives everything
- [ ] Test: JS replay of unified-format session produces matching screens

### 8C.2 Delete JS startup hacks from `allmain.js`
- [ ] Delete `showLoreAndWelcome` init option and code block (~line 2099-2138)
- [ ] Delete `showWelcomeMore` init option and code block (~line 2140-2163)
- [ ] Delete `showTutorialMenu` init option and code block (~line 2165-2193)
- [ ] Delete `replayTutorialStartupPrompts` init option and code block (~line 2194-2207)
- [ ] Delete `tutorialStartupEnterAfterPromptCount` init option (~line 2199-2201)
- [ ] Delete `tutorialDirectStart` init option (~line 2208-2210)
- [ ] Delete `buildStartupLorePromptFlow()` helper function
- [ ] Delete `buildWelcomeMorePrompt()` helper function
- [ ] Delete `buildTutorialMenuPrompt()` helper function
- [ ] Delete `buildReplayTutorialPromptFlow()` helper function
- [ ] Run full test suite

### 8C.3 Delete startup hacks from comparison framework
- [ ] Delete lore detection in `prepareReplayArgs` (`replay_compare.js` ~lines 418-428)
- [ ] Delete welcome --More-- detection (`replay_compare.js` ~lines 430-434)
- [ ] Delete tutorial menu detection (`replay_compare.js` ~lines 441-466)
- [ ] Delete `replayTutorialStartupPrompts` passthrough (`replay_compare.js` ~lines 404-405)
- [ ] Delete `tutorialStartupEnterAfterPromptCount` passthrough (~lines 406-407)
- [ ] Delete `tutorialDirectStart` passthrough (~line 408)
- [ ] Delete `replayTutorialStartupPrompts` reading in `session_recorder.js` (~lines 99-114)
- [ ] Run full test suite

### 8C.4 Simplify `normalizeSession()` in session_loader.js
- [ ] Delete startup-boundary detection (scanning for --More--, Velkommen, etc.)
- [ ] Step 0 is always `key: null` (initial screen from launch)
- [ ] Steps 1+ are the key sequence including startup --More-- spaces
- [ ] No special startup folding — comparison is step-by-step
- [ ] Delete `applyManualDirectChargenView()` usage in test runner
- [ ] Run full test suite

### 8C.5 Browser replay via URL params
- [ ] `?session=path&clearLocalStorage` handler reads session JSON
- [ ] Passes env as URL params: `&NETHACK_SEED=...&NETHACK_DATETIME=...`
- [ ] Passes nethackrc as URL param: `&NETHACKOPTIONS=...`
- [ ] Same init logic as headless — only display backend differs
- [ ] Test: replay hi07_seed1060 in browser, verify screen matches C

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
- [ ] `node scripts/pes-report.mjs` — PES report matches baseline (433/442 or better)
- [ ] Re-record one session of each type via `rerecord.py` — matches original
- [ ] Browser replay of at least one session works

## Order of Operations

Recommended execution order (dependencies flow downward):

**Phase 1: C recording (source of truth)**
1. **8B.3**: Re-record ALL sessions with unified C recorder (startup as
   steps). Store as the new session files. The C infrastructure is ready
   (`record_c_session`, `probe_startup_keys`, `migrate_to_unified.py`).
   Old sessions available in git history as reference.

**Phase 2: JS replay migration**
2. **8C.1**: Update JS game.init() to be key-driven at startup. The new
   sessions provide the reference screens to test against.
3. **8C.2-8C.4**: Delete JS startup hacks, simplify comparison framework.
   Old sessions in git history serve as regression reference.

**Phase 3: Cleanup**
4. **8A.1-8A.9**: Strip V3 shims from JS (options field, version branching, etc.)
5. **8B.4-8B.7**: Simplify/delete C recording scripts, auto-advance code
6. **8D.1-8D.2**: Finalize format docs and validation

Key insight: the C side is the fixture. JS is just for comparison and
can be updated later. We do NOT need JS to work with both formats
simultaneously — we switch the session files, then update JS to match.
