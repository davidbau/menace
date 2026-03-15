# Coverage Design: C-Parity Sessions

## Goal

Grow JS code coverage using deterministic C-parity session replays until
session-parity coverage exceeds 90%. This is the **primary execution focus** of
Phase 3.

### What counts

The metric is **parity-session coverage percentage** — the fraction of JS
gameplay code exercised by sessions that replay deterministic C-recorded traces
and compare every output channel (RNG, events, screen) against C ground truth.

- Credit is awarded only for code executed by C-recorded parity sessions.
- Ordinary unit-test coverage does not count toward parity coverage goals.
- **Code fixes without corresponding test coverage don't count.** If you fix a
  bug, you must either verify it's exercised by existing sessions or create a
  new session that exercises the fix. Nice-looking code that isn't tested is
  unverified code.
- **Sessions that merely exercise code without comparing to C ground truth are
  useless.** Every session must replay a C-recorded trace and validate against
  it. Coverage that isn't C-grounded is not parity coverage.

### What does NOT count

- Adding sessions that don't increase coverage is pure cost — they consume CI
  time without improving the metric. Prefer a few high-yield sessions over many
  redundant ones.
- Sessions that duplicate coverage already provided by existing sessions should
  be avoided. Check the coverage report before adding new sessions.
- Inflating session count without coverage gain is explicitly anti-goal.

### The ideal

Maximum parity-session coverage with minimum session count and runtime. Every
session should justify its existence by exercising code that no other session
covers, while validating against C ground truth on all channels.

### Phase 3 objective

- Reach and hold session-parity coverage north of 90%.
- Keep parity green on all promoted sessions (baseline + coverage).
- Each new session batch must demonstrably increase coverage in targeted files.
- Measure progress by coverage percentage delta, not session count delta.

### Latest baseline snapshot

This doc intentionally avoids hardcoding a rapidly stale pass-count baseline.
Use the committed snapshot as the source of truth:

```bash
node -e "const fs=require('fs');const p='docs/metrics/session_parity_coverage_latest.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));console.log({generatedAt:j.generatedAt,commit:j.commit,overall:j.overall});"
```

And use the current parity suite report for up-to-date pass/fail counts:

```bash
scripts/run-and-report.sh --failures
```

Session inventory and runtime-cost snapshot (count + step volume):

```bash
npm run -s session:stats
```

## The Coverage Pipeline (Mandatory Workflow)

Every agent working on this project must follow this pipeline. It connects
code inspection, bug fixing, session creation, and coverage measurement into
a single continuous loop.

### Session-First Strategy (Current Execution Policy)

While coverage is below target, session generation should follow this pattern:

1. Build **one** high-yield session idea at a time.
2. Expand/refine that same session to maximize **coverage-per-turn**:
   - add varied interactions and branch-triggering actions,
   - remove dead turns and redundant loops,
   - prefer broad callchain exercise over narrow single-branch traces.
3. Continue until diminishing returns, with a soft cap of about **800 steps**.
4. Put the session in `test/comparison/sessions/pending/`.
5. Start a new session idea and repeat.

Important:
- The metric is still coverage percentage, not number of sessions.
- Pending sessions are expected to fail initially; they are inputs to parity-fix work.
- A separate parity-fix stream should continuously convert pending sessions to green and promote them.
- Session design should be intentionally aggressive: combine varied gameplay
  effects in one trace (status potions, prayer/luck states, spellbooks,
  equipment interactions, movement/combat side effects) to expose hidden parity
  bugs that narrow traces miss.
- After recording an aggressive session, stay on parity bugfixing for that
  session until the exposed blockers are resolved (or explicitly tracked as
  blocked), then start the next aggressive concept.

### Step 1: Identify untested code

Run coverage reports to find low-coverage files and uncovered branches.
Scan those files for bugs, autotranslation artifacts, or missing functionality.

```bash
npm run coverage:session-parity:report
```

The report ranks gameplay files by coverage and highlights which files will
yield the largest coverage gains. Focus on files where a single targeted
session can cover many uncovered branches.

### Step 2: Create pending sessions targeting the gap

Record deterministic C sessions that exercise the untested scenarios. Place
them in `test/comparison/sessions/pending/`. Sessions should be **targeted** —
designed to hit specific branches, commands, or effects in the low-coverage
files identified in Step 1.

Reconnaissance-first rule:
- Before recording a branch-dense session, inspect the target C state so you
  know what is actually present on the level: rooms, room numbers, floor
  objects, special monsters, shopkeepers, and other branch-relevant context.
- Use checkpoint/mapdump inspection to design the route deliberately, even when
  the resulting path depends on information a real player would not know.
- This is required for high-value sessions through shops, quests, special
  levels, and other expensive branch-dense areas. Blind probing wastes turns
  and usually misses the exact codepaths we need.
- Existing sessions may be replayed and then extended in new directions once
  reconnaissance identifies uncovered high-yield branches worth exercising.

Useful reconnaissance tooling:

```bash
# Inspect one checkpoint from a C-recorded session or raw mapdump.
node test/comparison/shop_checkpoint_debug.js <session-or-mapdump> <checkpoint-id> --radius=12
```

That tool merges compact `O/Q` and `M/N` sections so you can see:
- shopkeepers and other monsters with ids/coords/state,
- floor objects with resolved names and object flags,
- local room-number geometry around the area of interest.

When the checkpoint is a structured `wizload` probe, it also reports special-room
metadata and hero-to-room paths, which is the preferred way to route coverage
sessions through branch-dense areas like shops, temples, vaults, and other
special rooms.

Generation guidance for Step 2:
- Work one session at a time and optimize it for coverage-per-turn.
- Keep iterating and extending until additional turns add little new coverage
  (typical stopping point: around 800 steps).
- Then move to a new session concept rather than over-extending low-yield tails.

```bash
# Record a C session (see test/comparison/c-harness/ for tooling)
# Or use the coverplay engine once available
```

Before recording, check which branches are already covered. Don't create
sessions that duplicate existing coverage — every session must pay for itself
in new lines/branches covered.

### Step 3: Run pending sessions and fix divergences

Run the pending session against JS. It will likely fail initially. Fix the
JS code until the session passes. **This is where bug fixes happen** — driven by
concrete test evidence, not just code inspection.

```bash
# Run one pending session
node test/comparison/session_test_runner.js \
  --sessions=test/comparison/sessions/pending/<name>.session.json \
  --parallel=1 --verbose

# Debug first divergence
node test/comparison/rng_step_diff.js \
  test/comparison/sessions/pending/<name>.session.json --step <N> --window 8
```

Blocker handling policy (required):
- Do not trim, weaken, or sidestep a session scenario just to avoid a failing
  branch or prompt mismatch.
- Treat first divergences exposed by pending sessions as parity blockers to
  fix in core JS gameplay code.
- Only trim/refactor a pending session for hygiene (length/noise) after the
  blocker is fixed, or while keeping the blocker explicitly tracked in an open
  issue with reproduction steps.

### Step 4: Promote passing sessions

Move green pending sessions to the appropriate coverage theme directory:
```bash
mv test/comparison/sessions/pending/<name>.session.json \
   test/comparison/sessions/coverage/<theme>/
```
Once promoted, the session is part of the default parity suite and must stay
green.

### Step 5: Verify coverage gain

Run the coverage refresh and **confirm the intended coverage improvement**:
```bash
npm run coverage:session-parity:refresh
```
Inspect `coverage/session-parity-diff.txt` to verify the gain in the
targeted files. If a promoted session doesn't measurably improve coverage,
consider whether it's worth the runtime cost — remove it if it adds no value.

### Step 6: Prevent regressions

Run the full session suite regularly. Fix regressions immediately — do not
remove or mask sessions to preserve a green suite.
```bash
npm run test:session   # all sessions including promoted coverage sessions
```

### Repeat

Continue the loop: identify gaps → create sessions → fix code → promote →
verify coverage gain. This is the steady-state workflow for all agents.

## Scope

Coverage input:
- `test/comparison/session_test_runner.js` session replay suite
- default filters: `--type=gameplay --type=chargen`
- default parity suite set includes:
  - baseline roots: `test/comparison/sessions/*.session.json`
  - accepted coverage sessions: `test/comparison/sessions/coverage/**/*.session.json`
- map sessions in `test/comparison/maps/*.session.json` are loaded by the
  runner but filtered out by default mode (unless `--all-types` or explicit
  type override is used)
- proposed sessions in `test/comparison/sessions/pending/*.session.json` are
  intentionally excluded from the default suite until they are parity-green
- optional: all session types (`--all-types`) or explicit `--type=...`

Coverage exclusions by design:
- `test:unit`
- other standalone script/test harnesses not executed through session replay

Authoritative discipline:
- use C-grounded session traces to exercise codepaths,
- do not inflate coverage using non-parity-only synthetic tests,
- fix JS behavior for divergences exposed by new sessions instead of masking.

## Session Lifecycle (Required)

Session development pipeline:
1. Record/iterate one deterministic C session for high coverage-per-turn.
2. When the session reaches diminishing returns (soft cap around 800 steps),
   place it into `test/comparison/sessions/pending/`.
3. Start the next high-yield session concept; keep generation moving.
4. Run pending sessions with the full session runner first (authoritative first
   divergence), then use step-diff tools for focused drilldown; fix JS parity
   until each passes.
5. Move passing session to the correct themed folder under
   `test/comparison/sessions/coverage/<theme>/`.
6. Once moved, it is part of the default parity suite and must stay green.
7. Refresh coverage snapshot/diff to verify the intended gain.

Promotion rule:
- Any `pending` session that is parity-green should be moved into
  `sessions/coverage/` in the same change (or immediately after).

Demotion rule:
- If a coverage session regresses, fix gameplay code; do not remove/mask the
  session to preserve a green suite.

Efficiency rule:
- Before promoting a session, verify it adds measurable coverage (new
  lines/branches in the diff report). Sessions that add no new coverage
  should not be promoted — they waste CI time.
- Periodically review the session suite for redundancy. If two sessions cover
  the same code, keep the shorter/faster one and remove the other.

## Runner

Script:
- [run-session-parity-coverage.sh](/share/u/davidbau/git/mazesofmenace/mazes/scripts/run-session-parity-coverage.sh)

NPM command:
- `npm run coverage:session-parity`
- `npm run coverage:session-parity:report`
- `npm run coverage:session-parity:snapshot`
- `npm run coverage:session-parity:diff -- --base <snapshot.json>`
- `npm run coverage:session-parity:refresh`

Behavior:
1. Runs `c8` against `node test/comparison/session_test_runner.js`.
2. Forces `--no-parallel` so coverage is collected in a single process path.
3. Applies `--type=gameplay --type=chargen` by default (unless overridden).
4. Clears `/coverage/` first to avoid stale artifacts from prior runs.
5. Writes HTML/text coverage report to `/coverage/`.
6. Applies the NetHack HTML theme used by existing hack/rogue coverage reports.

## Output

Primary artifact:
- `/coverage/index.html`
- `/coverage/coverage-summary.json`
- published site path: `https://mazesofmenace.net/coverage/`

Directory:
- `/coverage/` (repo root)

This is intentionally separate from:
- `hack/coverage/`
- `rogue/coverage/`

## Actionable Report

To list the lowest-covered gameplay-relevant JS files from session-parity
coverage:

```bash
npm run coverage:session-parity:report
```

Useful options:
```bash
node scripts/session-parity-coverage-report.mjs --top 40 --min-lines 100
node scripts/session-parity-coverage-report.mjs --include-levels --include-generated
node scripts/session-parity-coverage-report.mjs --json
```

## Snapshot + Diff Workflow

Create a diff-friendly snapshot in `docs/metrics`:

```bash
npm run coverage:session-parity:snapshot
```

Default output:
- `/docs/metrics/session_parity_coverage_latest.json`

Compare a previous snapshot against the latest:

```bash
npm run coverage:session-parity:diff -- --base docs/metrics/session_parity_coverage_prev.json
```

Useful options:
```bash
node scripts/session-parity-coverage-diff.mjs --base old.json --head new.json --top 30
node scripts/session-parity-coverage-diff.mjs --base old.json --json
node scripts/session-parity-coverage-diff.mjs --base old.json --show-zero
```

One-shot refresh (coverage + snapshot + report + diff-vs-previous):

```bash
npm run coverage:session-parity:refresh
```

## Metrics and Gates

Primary metric:
- **Session-parity coverage percentage** (lines, branches, functions) — this is
  the single number that matters. All other metrics are supporting detail.

Supporting metrics:
- per-file low-coverage ranking (gameplay-relevant files)
- parity pass/fail status for all promoted sessions
- coverage delta per batch of new sessions (must be positive to justify addition)

Required gates for each themed batch:
1. all existing promoted sessions remain green (no regressions)
2. new themed sessions are parity-green against C ground truth
3. coverage snapshot shows measurable improvement in targeted files
4. no comparator/harness masking used to hide gameplay mismatches
5. session runtime cost is justified by coverage gained

Campaign target:
- session-parity line coverage `>= 90%` with all parity suites green

## Targeted Session Checklist (Priority Order)

Use this checklist to create new deterministic parity sessions that raise
coverage where C-grounded exercise is currently sparse. **Priority is determined
by coverage report data**, not by this list order — always check current coverage
before choosing a target.

1. Furniture + throne/fountain/sink interactions
   - Primary files: `js/sit.js`, `js/fountain.js`, `js/kick.js`
   - Session goal: trigger multiple `#sit` outcomes, fountain/sink interactions, and furniture kicks.
   - Stop condition: coverage of targeted files increases by at least 20 percentage points.

2. Locking + container + pickup flow
   - Primary files: `js/lock.js`, `js/pickup.js`, `js/do_wear.js`
   - Session goal: unlock/lock doors and boxes with multiple tools; mix pickup/drop/unpaid-like flows.
   - Stop condition: `js/lock.js` coverage exceeds 50%.

3. Mount/steed behavior (wizard-assisted)
   - Primary files: `js/steed.js`
   - Session goal: mount, dismount, move mounted, and hit at least one forced dismount scenario.
   - Stop condition: `js/steed.js` coverage exceeds 40%.

4. Maze/mines topology and digging
   - Primary files: `js/mkmaze.js`, `js/mkmap.js`, `js/extralev.js`, `js/dig.js`
   - Session goal: traverse maze/mines branch transitions and perform multiple dig actions.
   - Stop condition: `js/dig.js` coverage exceeds 40%.

5. Shopkeeper economy stress
   - Primary files: `js/shk.js`, `js/pickup.js`, `js/steal.js`
   - Session goal: buy/sell/unpaid interactions, drop/take in shop, payment prompts.
   - Stop condition: `js/shk.js` coverage exceeds 40%.

6. Spellbook/read/zap item effects
   - Primary files: `js/spell.js`, `js/read.js`, `js/potion.js`, `js/zap.js`
   - Session goal: read multiple scroll/spellbook types; cast/zap with directional and prompt paths.
   - Stop condition: `js/zap.js` coverage exceeds 40%.

7. Prayer + altar + conduct-sensitive behavior
   - Primary files: `js/pray.js`, `js/attrib.js`, `js/end.js`
   - Session goal: include timing-sensitive prayer outcomes and altar interaction paths.
   - Stop condition: `js/pray.js` coverage exceeds 40%.

8. Monster AI + combat complexity
   - Primary files: `js/monmove.js`, `js/mhitu.js`, `js/mhitm.js`, `js/muse.js`
   - Session goal: sustained combat with pets/hostiles/traps/ranged actions in one run.
   - Stop condition: measurable branch coverage increase across targeted files.

9. Quest/special-level traversal by role
   - Primary files: `js/chargen.js`, `js/extralev.js`, `js/special_levels.js`
   - Session goal: role-specific branch entry and level transitions with quest/special hooks.
   - Stop condition: quest/special level code coverage exceeds 30%.

10. Inventory/name/write long-form flow
    - Primary files: `js/invent.js`, `js/do_name.js`, `js/write.js`, `js/objnam.js`
    - Session goal: name objects/monsters, write/engrave flows, complex inventory menu operations.
    - Stop condition: measurable coverage increase in targeted files.

## Theme Organization and Session Layout

Organize new sessions under a theme-based tree so progression is explicit and
auditable:

```text
test/comparison/sessions/
  coverage/
    furniture-thrones-fountains/
    locks-containers-pickup/
    steed-mounted-combat/
    maze-mines-digging/
    shops-economy/
    spells-reads-zaps/
    prayer-altars/
    monster-ai-combat/
    quest-special-levels/
    inventory-naming-writing/
```

Rules:
- each theme directory should include a short README describing target codepaths
  and completion criteria (expressed as coverage percentage targets)
- sessions should remain deterministic (seed, fixed datetime, canonical options)
- avoid blending many unrelated themes into one long session unless necessary
- **prefer a few high-yield sessions per theme over many low-signal sessions** —
  the goal is maximum coverage with minimum runtime
- remove redundant alias sessions when a canonical equivalent exists (same seed
  and key stream); keep one canonical file path
- keep a small set of oldest tiny smoke sessions unconsolidated for fast sanity
  checks and historical continuity
- run `npm run session:redundancy` before session commits to prevent accidental
  duplicate growth (exact duplicates or non-allowlisted key-stream duplicates)
- for consolidation decisions, measure drop-one coverage impact with:
  `npm run session:marginal -- <sessionA> <sessionB> ...`

Recommended naming:
- `themeNN_seedXXX_<role>_<intent>.session.json`
- example: `theme04_seed512_valkyrie_digging-branch-transition.session.json`
- keep session filename length `<= 56` characters (including `.session.json`);
  prefer compact IDs if needed (for example `t04_s512_v_dig1_gp.session.json`)
- root index for theme coordination:
  - `test/comparison/sessions/coverage/README.md`
- filename limit (new/renamed sessions): keep full filename
  (`<name>.session.json`) <= 56 chars; use abbreviated intent tags
  (example: `t04_s512_valk_dig-branch.session.json`).

## Coverage Campaign Plan (Theme-Driven)

1. Run parity-only coverage and produce the actionable low-coverage report.
2. Pick the top 1-2 under-covered files with highest coverage-per-session potential.
3. Record minimal C sessions that exercise uncovered branches in those files.
4. Run parity suite for baseline + new sessions; fix JS parity divergences.
5. Refresh coverage snapshot and verify the delta justifies the new sessions.
6. Repeat until 90%+ coverage is reached and stable.

Execution cadence (required while under 90% coverage):
- Keep at least one active issue focused on fixing failing `pending` sessions.
- Keep at least one active issue focused on recording targeted new sessions.
- Run coverage metrics after every merged batch — track the percentage, not the
  session count.
- Do not spend long stretches on diagnostics alone:
  - if a debugging sub-campaign is not converting into either
    1. a promoted green pending session, or
    2. a newly recorded high-yield pending session,
    within a small batch of validated commits, pivot back to the coverage
    pipeline immediately
- Treat observability work as infrastructure in service of coverage, not as an
  end state. Its success criterion is faster session promotion and coverage gain.
- After each meaningful parity-fix batch, explicitly choose one:
  - promote the pending session that the fixes unblocked, or
  - record the next highest-yield targeted C session from the coverage report

## Coverage-Per-Turn Agent Challenge

To maximize progress speed, each agent should run this loop continuously:

1. Build **one** high-yield deterministic C session designed to cover as many
   currently uncovered branches as possible.
2. Iterate the same session (extend and diversify it) until:
   - it reaches roughly **800 steps**, and
   - there are no obvious additional high-yield actions left to add.
3. Save it to `test/comparison/sessions/pending/` (do not auto-promote).
4. Start a new session concept (new seed + different coverage ideas) and repeat.

Rules for this challenge:
- Optimize for **coverage gained per turn**, not raw turn count.
- Mix interactions intentionally (inventory, combat, map transitions, commands,
  environmental interactions) instead of long single-purpose loops.
- Keep deterministic controls fixed (seed/datetime/options).
- Keep filenames short and policy-compliant (`<= 56` chars including
  `.session.json`).
- Validate parity after capture and then fix/promote through the normal pending
  workflow.

## Issue-Driven Labor Split

Use GitHub issues as the work partitioning mechanism for the coverage campaign.

Issue types:
1. Theme planning issues
   - Goal: identify low-coverage files/branches for one theme and propose
     concrete session scenarios to hit them.
   - Deliverable: a short scenario list with target files/functions, current
     coverage numbers, and target coverage numbers.
2. Session recording issues
   - Goal: record deterministic C sessions for a theme and add them under the
     theme directory.
   - Deliverable: new session files + coverage delta showing improvement.
3. Parity bring-up issues
   - Goal: make newly added sessions parity-green in JS without masking.
   - Deliverable: JS fixes, evidence of first-divergence movement, and green
     replay results.
4. Coverage verification issues
   - Goal: run coverage refresh, publish snapshot/diff, and verify gains.
   - Deliverable: updated metrics artifact and a summary of delta by file.

Suggested labels:
- `coverage`
- `parity`
- `sessions`
- `codematch` (when tied to structural mapping closure)
- `agent:<name>` while actively worked

Suggested dependency chain:
1. Theme planning issue
2. Session recording issue (Blocked by planning)
3. Parity bring-up issue (Blocked by recording)
4. Coverage verification issue (Blocked by parity bring-up)

Tracking checklist per theme issue:
1. Target low-coverage files/functions listed with current coverage %
2. Session scenarios designed to maximize coverage gain per session
3. Sessions recorded and committed
4. New sessions parity-green
5. Baseline sessions still green
6. Coverage snapshot/diff shows measurable improvement
7. Follow-up gaps spun into new issues

### Session Authoring Rules

- Keep sessions deterministic and replay-stable (seed + fixed datetime + canonical options).
- Prefer C-faithful behavior exercise over synthetic harness tricks.
- Every session must compare against C ground truth — coverage without parity
  validation is meaningless.
- Validate new sessions with `npm run test:session` before using them for coverage deltas.
- Validate pending sessions directly before promotion:
  - `node test/comparison/session_test_runner.js --sessions=<path-to-pending-session> --parallel=1 --verbose`
- After adding sessions, run:
  - `npm run coverage:session-parity:refresh`
  - inspect `coverage/session-parity-diff.txt`

### Pending Session Debugging Commands

Run all pending sessions:
```bash
PENDING="$(find test/comparison/sessions/pending -maxdepth 1 -name '*.session.json' -print | paste -sd, -)"
[ -n "$PENDING" ] && node test/comparison/session_test_runner.js --sessions="$PENDING" --parallel=1 --verbose
```

Run one pending session (authoritative first divergence):
```bash
node test/comparison/session_test_runner.js --sessions=test/comparison/sessions/pending/<name>.session.json --parallel=1 --verbose
```

Then first-RNG mismatch drilldown:
```bash
node test/comparison/rng_step_diff.js test/comparison/sessions/pending/<name>.session.json --step <N> --window 8
```

Mapdump state drilldown:
```bash
node test/comparison/dbgmapdump.js test/comparison/sessions/pending/<name>.session.json --first-divergence --window 1 --c-side
```

### Coverage Session Creation Tooling

Current tools:
- manual C record + keylog conversion (`test/comparison/c-harness/`)
- scripted replay diagnostics (`dbgmapdump`, `rng_step_diff`, `comparison-window`)

Planned tooling direction:
- add a "coverplay" scripted scenario driver to generate targeted C sessions for
  specific low-coverage branches (wizard-assisted when appropriate), with
  explicit success criteria per scenario.

## Command Examples

Default parity coverage (`gameplay` + `chargen`):
```bash
npm run coverage:session-parity
```

All parity session types:
```bash
bash scripts/run-session-parity-coverage.sh --text --all-types
```

Single session:
```bash
bash scripts/run-session-parity-coverage.sh --text --sessions=seed033_manual_direct.session.json
```

Measure marginal value of candidate sessions (drop-one analysis):
```bash
npm run session:marginal -- test/comparison/sessions/t03_s962_w_droppk3_gp.session.json test/comparison/sessions/t03_s981_w_droppk2_gp.session.json
```

## Runtime Efficiency (Non-Negotiable)

Test runtime is a critical resource. Slow tests waste agent time and block
progress. Fast feedback loops are what make the coverage campaign viable.

Rules:
- **Individual sessions must complete in seconds, not minutes.**
  Policy target is 10 seconds per session; current runner default is 20 seconds
  unless `--session-timeout-ms=10000` is passed. Sessions approaching either
  limit should be investigated for hangs/livelocks, not given more time.
- **The full suite must complete in minutes, not hours.** Monitor total suite
  runtime and treat creeping slowdown as a regression to fix.
- **Fail fast, never deadlock.** Test frameworks must detect hangs and abort
  quickly with actionable diagnostics. A 30-minute hang that produces no
  output is worse than a test failure — it's wasted time with zero signal.
- **New sessions must justify their runtime cost.** A session that takes 5
  seconds and adds 0.1% coverage may not be worth it if a different session
  can add 2% coverage in the same time.
- **Track and report runtime.** When adding sessions, note their runtime.
  When coverage gain per second of test time starts declining, optimize the
  session suite instead of adding more sessions.

## Notes and Limits

- Coverage percentages are "executed by C-grounded parity sessions," not a
  claim of full behavioral correctness.
- This report is best used alongside parity outcomes (`PRNG/events/screens`) as
  a guidance tool for where C-grounded scenarios are still sparse.
- The goal is maximum coverage with minimum cost. A session suite that takes
  10 minutes and covers 90% is better than one that takes 60 minutes and
  covers 91%.
