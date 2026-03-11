# PROJECT PLAN

> *"Never build a dungeon you wouldn't be happy to spend the night in yourself."*
> — Terry Pratchett, quoted in the NetHack 3.6.0 release notes

**Current phase:** Phase 3 (full-coverage closure / CODEMATCH expansion) with
Phase 5 (self-play) running in parallel. Phase 2 parity burndown is complete at
the current checkpoint; active execution on `main` is C-parity-session coverage
expansion while preserving full-green parity on baseline sessions.
Active cleanup campaign: `docs/ASYNC_CLEANUP.md` (currently Phase 3e,
removing legacy `_pendingMore`/queued-`--More--` fallback paths).

**Context:** [README.md](README.md) explains what Royal Jelly is, why NetHack
matters, and the intersection of the 3.7.0 release moment with AI-assisted
software development. This document describes **how** we build it — the strategy,
phases, gates, and working discipline that will transform an audacious goal into
a real, shipped product.

## Strategic Thesis

When NetHack 3.7.0 releases (unknown date, certain to happen), there will be a brief window of intense community attention. We aim to be in the browser within 48 hours, with a faithful, playable JavaScript port ready to ship.

This is only possible because:
1. **Agentic engineering works.** AI agents can produce readable, correct code at scale when guided by someone who understands the problem deeply and enforces strict testing discipline.
2. **Parity-first methodology works.** By treating failing tests as the primary signal and porting C behavior directly (not fitting to traces), we can achieve behavior fidelity without understanding every line of 200,000-line C codebase manually.
3. **Parallel tracks accelerate.** Parity work (Phase 2) and self-play development (Phase 5) run together, neither blocking the other — parity enables agent training, agents generate test traces, both feed into release readiness.

This is not "I accept all diffs and hope for the best." This is **disciplined agentic engineering**: strict test gates, human-directed strategy, evidence-driven work, and frequent commits with clear regression checks.

## Purpose

Create **Royal Jelly,** an HTML/JavaScript port of C NetHack 3.7.0 that is 100% faithful to original gameplay and character-based display, while adding a small set of usability enhancements outside the 24×80 game screen. The codename refers to this project — the vibe-coded JS port — not to the official 3.7.0 release itself, which has no codename.

The codebase should remain readable and maintainable JavaScript — not compiled or transpiled from C, but hand-ported so that every function can be read and understood alongside the original source. The project should be positioned for publication within days of the official NetHack 3.7.0 release.

The intended outcome is a superior but historically accurate NetHack gameplay and community experience in a web browser.

## Success Criteria

1. Gameplay is indistinguishable from official terminal NetHack 3.7.0, from character creation through ascension, including all objects, maps, monsters, and interactions.
2. Core gameplay RNG behavior matches C NetHack with sequence-level fidelity in validated replay scenarios.
3. The 24×80 terminal experience matches C NetHack exactly, including:
   - screen rendering and message behavior,
   - keyboard handling and command flow,
   - menu appearance/behavior across pregame, in-game, and postgame,
   - line-drawing glyph behavior according to selected player options.
4. Testing infrastructure is both high-fidelity and high-utility:
   - validates parity for RNG, screen output, and gameplay semantics,
   - runs quickly enough for frequent iteration,
   - provides strong divergence diagnostics for realistic gameplay traces,
   - includes session-fidelity tooling (precision) and code-coverage tooling (completeness).
5. Codebase quality remains high:
   - readable and maintainable JavaScript architecture,
   - comprehensive documentation for code and workflows,
   - accurate project history and lessons-learned records.
6. Release timing supports publication within days of official NetHack 3.7.0 release.

## Parity Definition of Done (Operational Gate)

Parity is considered achieved when all are true:
1. Every interaction and playable feature of the game is implemented: all commands, items, monsters, spells, dungeon branches, special levels, and game mechanics present in C NetHack 3.7.0 are functional in the JS port. The [C↔JS correspondence ledger](docs/CODEMATCH.md) tracks structural coverage file-by-file and function-by-function.
2. Deterministic replay/session suites pass against C reference traces for maintained session categories.
3. No known systematic RNG drift remains in validated scenarios.
4. Core gameplay regression suites are green (`npm test` plus comparison harness suites).
5. Codebase passes agreed lint/style/test gates.
6. Non-gameplay UI extension interfaces are documented and validated as behavior-neutral.

## Secondary Goals

1. Build a state-of-the-art JavaScript self-play agent that behaves in a humanlike way:
   - explores effectively,
   - handles combat and survival,
   - manages hunger (a matter of life and death, as any Valkyrie who starved on dungeon level 3 can attest),
   - identifies, collects, and uses useful items,
   - progresses through dungeon exploration and advancement.
2. Use the self-play agent for two concrete product purposes:
   - generate C NetHack gameplay traces to support parity testing workflows,
   - provide a post-game demonstration mode shown after the player answers "no" to "play again?" (any key or click returns to normal game launch flow).
3. Provide browser-side companion materials outside the 80×24 play area:
   - quick reference aids (reference cards and running inventory views, for players who can never remember whether `q` quaffs or `Q` quivers),
   - in-browser reading/scrolling access to Guidebook, Spoilers, and game history during play.
4. Produce and validate a new WCST-style Spoilers manual that preserves gameplay accuracy for NetHack 3.7.0 while consolidating high-quality strategy guidance in a voice worthy of the game.

Selfplay train/holdout seed policy and acceptance criteria are defined in `selfplay/SELFPLAY_PLAN.md` and apply to selfplay-only tuning work.

## Non-Goals

> *Like the Oracle, we must know what questions not to answer.*

1. Graphical tile rendering is out of scope. The `@` sign has looked fine since 1987.
2. Multiplayer features are out of scope.
3. Public modding/plugin API design is out of scope.
4. Mobile-specific UI/UX redesign is out of scope.
5. New gameplay or balance changes beyond faithful 3.7.0 parity are out of scope. We port the dungeon; we do not redesign it.
6. Alternate control paradigms (mouse-first, gamepad-first) are out of scope.
7. New game content (new roles, monsters, branches, quests) are out of scope.
8. Account/cloud platform features (profiles, cloud saves, social systems) are out of scope.
9. Large architectural rewrites not required for parity or release readiness are out of scope.

---

## Project History

> *"You recall the long campaign. The dungeon has changed."*

The project started on **February 6, 2026** and has produced over 3,300 commits
across one month of intensive development, with 255+ GitHub issues filed and
200+ resolved. The trajectory below reflects the actual path taken — including
campaigns that were attempted and pivoted away from.

### Phase 0: Rough Playable Draft (Feb 6–7)

The initial commit landed a browser-playable skeleton: ISAAC64 PRNG (bit-identical
to C), wizard mode, basic level-1 dungeon generation, and a 80×24 terminal display.
Within two days the port could generate levels and accept player input.

### Phase 1: Testing Infrastructure (Feb 7–9)

C comparison harness built and operational. Python scripts drive the patched C
binary through recorded move sequences, capturing RNG call logs, screen frames,
and map grids into session JSON files. The JS test suite replays these
step-by-step. By Feb 9, map generation achieved 10/10 perfect C-vs-JS alignment
across all test seeds.

### Phase 2: Testing Burndown (Feb 9 – present, active)

The main body of work: porting C logic into JS to drive session tests green
across RNG, screen, events, typgrid, and cursor channels. This phase has
proceeded through several sub-campaigns:

**Early parity push (Feb 9–22).** Rapid porting of core gameplay systems:
monster AI, pet behavior, combat, vision (Algorithm C raycasting), multi-depth
dungeon, special levels, field-name normalization, object creation, trap
mechanics, and more. Session pass rates climbed from near-zero to a solid
majority. Four architectural refactoring phases completed during this period
(leaf-file architecture, C field-name normalization, file-per-C-source
reorganization, context-wiring elimination).

**Operation Iron Parity (Feb 22 – Mar 4, pivoted).** An ambitious campaign to
close the remaining parity gap through coordinated state canonicalization
(`game.*` namespace migration) and a project-specific C-to-JS mechanical
translator. The campaign established the [CODEMATCH.md](docs/CODEMATCH.md)
correspondence ledger (5,000 functions tracked), completed M0–M2 milestones
(baseline, canonical state spine, movement/turn canonicalization), and built
translator infrastructure through M3 (parser, NIR model, rule engine). However,
baseline instability and broad replay regressions from the translator work
reduced signal quality, and the campaign was assessed as unsuccessful for
near-term parity closure on March 4. It remains valuable as architecture
guidance. See [docs/IRON_PARITY_PLAN.md](docs/IRON_PARITY_PLAN.md).

**Operation More Needed (Mar 4–6, merged to main).** A recovery campaign that
pivoted to direct gameplay parity burndown. Key contributions: explicit
`--More--` handling in sessions (no auto-suppression), async message-flow
refactors so JS pauses exactly when C does, rich `^event` logging for monster
movement and pet AI, cursor-position capture and comparison, session
re-recording with corrected C harness behavior. The campaign brought sessions
to ~124/150 passing and was merged to `main`.

**Direct parity burndown (Mar 4 – Mar 9).** Intensive work on `main` closed the
remaining divergence clusters and reached a full-green gameplay/session
checkpoint. Recent fixes included C-faithful `gethungry`,
`moveloop_turnend` wiring, `wall_info` bitfield unification, `mhitu`
hide-under detection, `mkobj` floor placement, and postmov trap/effect
ordering. After the green checkpoint, execution priority shifted to cleanup and
CODEMATCH coverage expansion.

### Phase 3–4: Full-Coverage Closure and Stabilization (active)

The [CODEMATCH.md](docs/CODEMATCH.md) correspondence ledger is maintained.
Per-file refactoring issues ([#32–#138](https://github.com/davidbau/menace/issues?q=label%3Acodematch))
track structural alignment. Code-coverage tooling and targeted sessions for
uncovered paths are now the primary execution focus in Phase 3.

### Phase 5: Self-Play Agent (parallel track, ongoing)

The self-play agent runs alongside parity work: generating gameplay traces for
testing, and building toward a demonstration-mode capability. See
[selfplay/SELFPLAY_PLAN.md](selfplay/SELFPLAY_PLAN.md).

### Supplement: 1982 Hack Port

A separate parallel effort ports Jay Fenlason's original 1982 *Hack* (~6,200
lines of C) to the browser using the same methodology. This lives in the
`hack/` directory with its own plan, CODEMATCH, and test harness. It is a
supplementary project — a historical companion piece — not part of the main
NetHack parity campaign. See [hack/PLAN.md](hack/PLAN.md).

---

## Current Status (rolling)

> *"You sense the presence of determinism. It feels reassuring."*

**Codebase:** 141 JavaScript modules in `js/` (~164,000 lines) mirroring the C
source structure, plus 131 special level modules in `js/levels/`. Total JS
source: ~180,000 lines.

**Testing:** Treat status as rolling, not static. Use live commands:
- `npm test`
- `./scripts/run-and-report.sh --failures`
- `npm run test:session`

Do not rely on hardcoded pass counts in this document; session totals are
expected to grow during Phase 3 as coverage sessions are promoted.

**Parity:** Goal is to keep all promoted sessions green across maintained
comparison channels (RNG, screen, cursor, events, mapdump) while expanding
coverage through targeted C-grounded session additions.

**Coverage:** The [CODEMATCH.md](docs/CODEMATCH.md) ledger tracks ~5,000 C
functions. Of these, ~1,758 have JS counterparts; ~3,242 remain unported
(excluding N/A platform code). The core gameplay loop, dungeon generation,
combat, monster AI, pet behavior, object system, magic, and display are
substantially ported. Major remaining gaps include: full shop economy (`shk.c`),
player trap effects (`dotrap` path), some artifact invocations, and many
secondary interaction paths.

**Issues:** 27 open GitHub issues, predominantly `parity`-labeled divergence
fixes. 200+ issues closed.

---

## Milestones

Milestones use a hybrid model: phase completion + parity gates + release-timing
gates. Per-commit parity metrics are recorded in
[oracle/results.jsonl](oracle/results.jsonl) and visualized on the
[Oracle dashboard](https://davidbau.github.io/mazesofmenace/oracle/).

1. **Phase 0: Rough playable draft** *(complete, Feb 6–7)*
   - Browser port launches and supports basic level-1 gameplay.
   - Initial implementation attempts C-faithful behavior.
2. **Phase 1: Testing infrastructure foundation** *(complete, Feb 7–9)*
   - Session recording/replay infrastructure exists for gameplay sessions, UI interactions, and map sessions.
   - Fast strict session tests exist and intentionally expose many fidelity failures.
3. **Phase 2: Testing burndown** *(complete, Feb 9 – Mar 9)*
   - Port C logic into JS to drive session tests toward green across semantics, PRNG, typgrid, and screen parity.
   - Sub-campaigns completed: early parity push, Iron Parity (pivoted), More Needed (merged).
   - Direct parity burndown completed to current full-green checkpoint.
4. **Phase 3: Full-coverage closure** *(active)*
   - **Primary metric: parity-session coverage percentage** (lines/branches/functions exercised by C-grounded sessions).
   - Drive coverage using C-parity session tests as the authoritative signal (not unit-test-only coverage).
   - Every session must compare against C ground truth — coverage without parity validation is meaningless.
   - Maximize coverage per session; do not add sessions that don't measurably increase coverage.
   - Organize new parity sessions by theme; preserve full-green parity while adding sessions.
   - Reach and hold session-parity coverage north of 90% while keeping the parity suite green.
   - Maintain the [C-to-JS code correspondence ledger](docs/CODEMATCH.md) for structural tracking.
   - See [docs/COVERAGE.md](docs/COVERAGE.md) for the mandatory pipeline and workflow.
5. **Phase 4: Architectural stabilization** *(planned)*
   - Refactor for robustness, readability, maintainability, performance, and design quality while preserving parity.
6. **Phase 5: Self-play agent** *(parallel track, running across Phases 2–4)*
   - Improve agent depth and breadth of play.
   - Use agent output for trace generation and demonstration-mode requirements.
7. **Phase 6: Surrounding experience** *(planned)*
   - Improve JavaScript/browser packaging and surrounding UX through collaborative iteration with human designers.
   - Deliver help and assistance outside the 80×24 core game area (quick-reference guidance for beginners, contextual "what is this?" support, running inventory views).
   - Provide demonstration autoplay when the user is not actively playing.
   - Provide up-to-date 3.7.0 spoilers in a witty, high-quality style, plus an integrated reading experience including NetHack history, the official Guidebook, and updated spoilers — without disrupting core gameplay.
8. **Official-release trigger** *(external date)*
   - When official NetHack 3.7.0 releases, switch to final release mode immediately.
   - Freeze scope to must-hit parity and release-critical fixes.
   - Treat official release as a mandatory parity re-baseline event:
     - regenerate/refresh reference sessions and test artifacts against official code,
     - audit upstream code diffs and map each change through the C-to-JS correspondence table,
     - use coverage-guided targeted sessions to verify changed paths are exercised and corrected.
9. **Public release**
   - Publish within 1–2 days of official NetHack 3.7.0 release with must-hit criteria satisfied.

---

## Campaign History

> *"The dungeon remembers all who have passed through it."*

Two named parity campaigns have been executed during Phase 2. Both are now
complete or merged; their documents remain as reference.

### Operation Iron Parity (Feb 22 – Mar 4, pivoted)

A structured campaign for closing the parity gap through state canonicalization
and translator-assisted porting. Completed M0–M2 milestones. Translator
infrastructure built through M3 but not deployed at scale. Assessed as
unsuccessful for near-term parity closure due to baseline instability; pivoted
to direct burndown. Remains authoritative for canonical naming policy and
`game.*` state architecture.

Authoritative doc: [docs/IRON_PARITY_PLAN.md](docs/IRON_PARITY_PLAN.md)

### Operation More Needed (Mar 4–6, merged)

A recovery campaign focused on explicit `--More--` handling, async message-flow
parity, event logging, cursor capture, and session re-recording. Brought
gameplay sessions to ~124/150 passing and was merged to `main`.

Authoritative doc: [docs/MORE_NEEDED_CAMPAIGN.md](docs/MORE_NEEDED_CAMPAIGN.md)

---

## Phasing Strategy

1. Treat parity failures as the primary prioritization signal.
2. Port behavior from C source directly rather than fitting to traces with JS-only heuristics.
3. Keep Phase 5 (self-play) in parallel so it accelerates trace generation and demonstration requirements without blocking parity burndown.
4. Keep scope narrow near official-release trigger: prioritize must-hit criteria and release blockers over secondary expansion.
5. Preserve fast, diagnostic-rich test loops throughout all phases.

## Quality Gates Per Change

1. Validate changed behavior with deterministic tests/sessions in the affected area.
2. Include or update deterministic tests/session traces as needed for future regressions.
3. Update `docs/LORE.md` for porting work; update `selfplay/LEARNINGS.md` for selfplay work.
4. Pass harness-neutrality review: no harness logic that hides, rewrites, or bypasses true divergences.
5. Prefer simplifying harness behavior over time by removing gameplay-aware special handling.

## Risks and Mitigations

1. **Latent parity drift in rare paths not yet exercised.**
   Many of NetHack's deepest interactions involve rare events — polymorphed quest leaders, artifact theft while engulfed, riding a steed over a polymorph trap. Paths like these are easy to miss and hard to test.
   - *Mitigation:* Maintain and expand the [C-to-JS code correspondence ledger](docs/CODEMATCH.md) (file/function mapping). Maintain resilient, fast, high-coverage targeted sessions for uncovered or low-confidence logic.

2. **Parity work surfaces probable bugs in official C NetHack.**
   When you port 200,000 lines of C at the level of individual RNG calls, you find things. Some of them are bugs upstream.
   - *Mitigation:* Document findings with precise repro steps, expected/actual behavior, and reasoning. Keep reports concise and developer-actionable. Submit to official NetHack dev team when evidence is strong. A good bug report is a gift; a vague one is a wasted wish.

3. **The DevTeam ships before we're ready.**
   The official release date is unknowable by design. We might get a week's warning. We might get none.
   - *Mitigation:* Continuous tracking of the 3.7 development branch. Release-trigger milestone designed for rapid re-baselining. Keep the project in a "could ship in 48 hours" posture at all times.

4. **AI agent limitations produce subtle correctness failures.**
   Agentic engineering works until it doesn't. AI agents can produce plausible-looking code that passes tests but diverges from C behavior in edge cases the tests don't cover.
   - *Mitigation:* Strict parity testing discipline. Human review of all critical game logic. Working principle: trust the C source, not the AI's intuition.

## Working Principles

> *You read the fortune cookie. It says:*

1. **C NetHack source is the behavior specification.**
   Use traces and tests to detect divergence, but resolve behavior by porting C logic paths. When in doubt, read the C.

2. **Prioritize by first meaningful divergence.**
   Use failing unit/session tests to decide what to fix next. Keep work incremental and re-test frequently. Fix the first wrong thing first.

3. **Reduce harness gameplay awareness over time.**
   Replay/session harnesses should drive inputs and compare outputs, not emulate gameplay rules. Long-term target: no gameplay semantics in harness code.

4. **Keep one source of runtime truth.**
   Core game/runtime code should own command/turn/prompt behavior. Avoid duplicate behavior implementations across game and test layers. Two sources of truth is zero sources of truth.

5. **Keep fidelity checks strict and lossless.**
   Never relax PRNG, typgrid, or screen checks to gain speed. Optimize diagnostics and plumbing, not semantic rigor. A passing test that doesn't check what it claims to check is worse than a failing one.

6. **Make debugging fast and actionable.**
   Preserve first-divergence reporting with enough context to diagnose quickly. Prefer simple, auditable tools and data flow. When the trail goes cold, add instrumentation — but only the instrumentation you need.

7. **Use evidence-driven infrastructure changes.**
   Add new tracing or instrumentation only when divergence evidence shows it is needed. Avoid broad infrastructure expansion without demonstrated payoff. Yak-shaving is the cockatrice of engineering projects: it looks harmless until you're stone dead.

8. **Preserve 24×80 fidelity; place enhancements outside core play.**
   Core terminal gameplay behavior remains historically accurate. Browser UX enhancements must not alter canonical in-screen behavior. The game inside the rectangle is sacred.

9. **Maintain explicit auditability.**
   Keep [C↔JS correspondence documentation](docs/CODEMATCH.md) current. Track coverage and close uncovered paths with targeted sessions. If you can't explain why the JS does what it does by pointing at the C, something is wrong.

10. **Share progress continuously with quality gates.**
    Commit and push meaningful, test-backed improvements frequently. Keep mainline collaboration-friendly for parallel contributors.

11. **Operate agents autonomously with strict regression discipline.**
    Commit frequently and merge from main frequently to reduce integration drift. Use tests as a hard regression gate before pushing. If merges introduce regressions, fix them before push. If clean integration cannot be achieved, abandon that patch line and restart from the newer checkpoint rather than pushing degraded behavior. Time saved by pushing broken code is borrowed at ruinous interest.

12. **Handle upstream transitions as execution mode changes.**
    On official 3.7.0 release, re-baseline quickly and focus only on release-critical parity closure. This is the Astral Plane: scope narrows, intensity increases, every move matters.

13. **Report probable upstream bugs responsibly.**
    Document concise repro steps and reasoning before reporting to the official NetHack dev team.

## Issue Tracking Workflow

1. Declare dependencies explicitly in issues.
   - Use `Blocked by #<issue>` for prerequisites.
   - Use `Blocks #<issue>` for downstream work.
2. Track dependency state in project workflow.
   - Use status values `Ready`, `Blocked`, `In Progress`, `Done`.
3. Use parent/child issue structure for larger outcomes.
   - Parent issue defines the outcome.
   - Child issues define concrete implementation/test/documentation tasks.
   - Parent issue checklist links all child issues.
4. Enforce execution discipline.
   - Default rule: do not start an issue while declared blockers are open.
   - Exception: if a blocker link is stale or incorrect, opportunistic work is allowed; update the dependency links as part of that work.
5. Keep issue tracking clean and current.
   - Perform periodic triage reviews of open issues.
   - Close obsolete or canceled issues explicitly with a short rationale.
   - Update issue descriptions promptly when new evidence changes scope, root cause, or priority.
6. Keep agents issue-driven and autonomous.
   - If no work is pending, pull the next actionable issue.
   - If starting new work not covered by an issue, create one before or at start.
   - Agent identity is directory-based (directory name defines agent name).
   - Track active agent ownership with agent labels in issues.
7. Maintain one unified project backlog.
   - Keep all work in the same issue queue and classify by labels.
   - Use `parity` label for C-vs-JS divergence/parity work.
   - Issues are unowned by default; add `agent:<name>` label only when an agent actively claims work.
8. Populate backlog through evidence-first intake.
   - Add issues from failing tests/sessions, C-to-JS audit gaps, release blockers, selfplay findings, and developer/user bug reports.
   - For `parity` issues, include reproducible evidence (seed/session/command, first mismatch, expected vs actual) before prioritization.

## Immediate Focus

Phase 3 execution is a coverage campaign rooted in C-parity session replay.
The metric is **parity-session coverage percentage** — the fraction of JS
gameplay code exercised by sessions that compare against C ground truth.

1. Use session-parity coverage reports to identify under-covered JS files and
   branches.
2. Create targeted C-recorded sessions that exercise those specific paths.
3. Fix JS parity divergences until new sessions pass against C traces.
4. Promote passing sessions and verify measurable coverage gain.
5. Drive aggregate session-parity coverage above 90% and hold it there.

Key principles:
- **Coverage percentage is the metric, not session count.** Sessions that don't
  add coverage are pure cost.
- **Sessions must compare against C ground truth.** Exercising code without
  validating against C is not parity coverage.
- **Maximum coverage with minimum cost.** Prefer a few high-yield sessions over
  many redundant ones.

Coverage process details and theme taxonomy are maintained in
[docs/COVERAGE.md](docs/COVERAGE.md).
The canonical parity test matrix remains
[docs/PARITY_TEST_MATRIX.md](docs/PARITY_TEST_MATRIX.md).
