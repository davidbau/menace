# Session Startup Configurations

## Overview

Sessions have different startup flows depending on how they were recorded.
The C-side capture tool (`capture_step_snapshot.py`) must handle each
configuration correctly to replay the session and capture game state at
specific steps.

## Configuration Table

| Config | Count | Name | Wizard | Mode | First Keys | GP Start | C Startup |
|--------|-------|------|--------|------|------------|----------|-----------|
| Config | Count | Name | Wizard | Mode | First Keys | Recording Script | C Startup |
|--------|-------|------|--------|------|------------|-----------------|-----------|
| **A** | 33 | `Wizard` | true | gameplay | `null,l,l,...` | gen_coverage_*.py | .nethackrc preset; wait_for_game_ready dismisses lore; ALL step 1+ keys are gameplay |
| **B** | 13 | `Agent` | false | gameplay | `null, ,l,...` | create_selfplay_*.py | .nethackrc preset; step 1+ are gameplay |
| **C** | 11 | `Recorder` | true | gameplay | `null, ,^W,...` | create_wizard_*.py | .nethackrc preset; step 1+ are gameplay |
| **D** | 3 | null | false | manual-direct-live | `null,P,a,u,l,\n` | record_manual_session_v3.py --interactive | NO .nethackrc preset; ALL keys from step 1 include chargen |
| **E** | 51 | `Wizard` | true | chargen | `null,n,w,...` | gen_chargen_sessions.py | chargen-only, not gameplay |
| **F** | 6 | `Wizard` | true | option_test | `null` | run_session.py --option-test | option test only |
| **G** | 3+2 | `Wizard`/null | varies | interface | varies | gen_interface_sessions.py | interface mode |
| **H** | 1+ | `brak`/`flora` | true | gameplay | varies | create_wizard_manual_*.py | .nethackrc preset (custom name); step 1+ are gameplay |
| **I** | 1 | `Wizard` | true | wizload | `null,#,...` | run_session.py --wizload | .nethackrc preset; step 1+ are gameplay |

## Key Configurations for C-Side Capture

### Config A/B/C/H/I: Preset Chargen (most sessions, ~60 total)
- `.nethackrc` has: `OPTIONS=name:Wizard`, `OPTIONS=role:Wizard`, etc.
- Session step 0 is startup (key=null, includes all startup RNG)
- Session steps 1+ are **ALL gameplay keys** (NO startup/lore keys in session)
- The recording script called `wait_for_game_ready()` + `clear_more_prompts()`
  BEFORE recording began — lore dismissal keys were NOT recorded
- `extract_keys` returns all keys from step 1 (= ALL gameplay keys)
- `step_index = session_step - 1` (direct mapping, no offset needed)

**Recording flow** (gen_coverage_*.py):
1. `setup_home()` writes .nethackrc with name/role/race/gender/align
2. Launch C binary in tmux with NETHACK_SEED + NETHACK_RNGLOG
3. `wait_for_game_ready()` sends Space for --More--, 'n' for tutorial
4. `clear_more_prompts()` handles any remaining prompts
5. Capture startup snapshot → step 0 (key=null)
6. Send gameplay keys → steps 1+

**C-side capture:** `wait_for_game_ready()` + `clear_more_prompts()` + send
`extract_keys` (= ALL session keys from step 1). Step index = session step - 1.

### Config D: Interactive Chargen (seed031/032/033)
- `.nethackrc` has NO chargen presets
- Session step 0 is startup (key=null)
- Steps 1-10: chargen keys (P,a,u,l,Enter,n,p,h,m,l = name "Paul" + selections)
- Step 11: dungeon gen trigger (key='y' for "Shall I pick?", 2424 RNG calls)
- Steps 12-17: lore --More-- dismissals
- Step 18: first actual gameplay command (key='h', turn=1)
- `extract_keys` returns ALL keys including chargen
- DO NOT use `wait_for_game_ready` (would double-consume startup keys)

**C launch:** No chargen preset. Binary starts and prompts for name/role/etc.
Session keys handle chargen naturally. Keys are sent starting from step 1.

**IMPORTANT:** The C binary version must EXACTLY match the recording binary.
Sessions without `recorded_with` metadata (config D) may not be reproducible
with the current binary if patches have changed.

### Config B: Agent (selfplay sessions)
- Name is "Agent", wizard mode is OFF
- First key is Space (probably --More-- dismissal)
- Otherwise same as Config A

### Config C: Recorder sessions
- Name is "Recorder", wizard mode ON
- First key is Space, then ^W (wizard toggle?), then numbers
- Otherwise same as Config A

## How capture_step_snapshot.py Handles Each Config

```python
# Detect chargen mode from session options
opts = session.get("options") or {}
has_preset_chargen = isinstance(opts.get("name"), str) and opts["name"]

if has_preset_chargen:
    # Config A/B/C/I: preset chargen
    setup_home(char)  # writes name/role/etc to .nethackrc
    keys = extract_gameplay_keys(session)  # skips startup/lore steps
    wait_for_game_ready(...)  # dismisses lore/tutorial
    # step_index is 0-based into gameplay keys
else:
    # Config D: interactive chargen
    setup_home(char, chargen_in_keys=True)  # no chargen in .nethackrc
    keys = extract_keys(session)  # ALL keys including chargen
    # DO NOT wait_for_game_ready
    # step_index is 0-based into all session keys (after step 0)
```

## Discarded Keys

| Config | Discarded from keys array | Why |
|--------|---------------------------|-----|
| A/B/C/I | Step 0 (null key) + all turn=0 steps + turn=1 steps with startup RNG patterns | Handled by wait_for_game_ready |
| D | Step 0 only (null key) | All other keys including chargen are sent |

## Verification

To verify C-side alignment, compare:
1. `checkpoint.u_ux` / `u_uy` with session cursor position
2. `checkpoint.rngCallCount` with cumulative session RNG count
3. Phase key code with expected session step key code

If these don't match, the startup flow wasn't reproduced correctly.
