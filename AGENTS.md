# Agent Instructions

> *"The strength of a dwarf lies less in brute force than in stubborn refusal to leave a bug unfixed."*
> -- The Oracle of Delphi (paraphrased)

## Purpose
This file defines how coding agents should work in this repository.

This project uses GitHub Issues for work tracking. `PROJECT_PLAN.md` is the authoritative source for goals, scope, and milestone priorities.

## Current Mission: Coverage Campaign (Phase 3)

The primary objective is **growing parity-session coverage toward 90%+**.

The metric is **coverage percentage**, not session count. Sessions that don't
add new coverage are pure cost. Sessions that exercise code without comparing
to C ground truth are worthless. The ideal is maximum C-grounded coverage with
minimum session count and runtime.

Every agent's work must connect to this pipeline:
1. Identify low-coverage code using `npm run coverage:session-parity:report`.
2. Create one high-yield C-recorded session at a time, iterating for maximum
   coverage-per-turn (see `docs/COVERAGE.md`).
3. When that session reaches diminishing returns (typically around 800 steps),
   place it in `test/comparison/sessions/pending/`.
4. Repeat with a new high-yield session concept.
5. In parallel, fix JS parity divergences on pending sessions, promote passing
   sessions, and verify coverage gain.
6. Never regress existing parity — fix code, don't mask sessions.

Required routine (normalize this behavior):
1. Record aggressive, high-variance sessions designed to expose parity bugs,
   not just to add one narrow branch.
2. Use mixed interactions in one trace when possible (for example potion
   effects + status interactions + prayer/luck + spell reads + inventory/use
   side effects) to maximize bug discovery per turn.
3. Treat every newly exposed divergence as a core gameplay blocker to fix.
4. Stay on that session until parity bugs are resolved (or clearly blocked and
   tracked), then repeat with a new aggressive session concept.

Read `docs/COVERAGE.md` for the full mandatory workflow, commands, and
session lifecycle rules. **Code fixes without corresponding coverage
evidence don't count.**

## Source of Truth and Priorities
1. NetHack C 3.7.0 behavior is the gameplay source of truth.
2. `PROJECT_PLAN.md` is the execution roadmap and phase gate definition.
3. `docs/COVERAGE.md` is the authoritative execution guide for the current Phase 3 coverage campaign.
4. Test harness outputs are evidence for divergences, not a place to hide or special-case them.
5. For gameplay parity sign-off, session replay results are authoritative over unit tests.

## Current-Phase Resources
Read these first for active work:
1. `PROJECT_PLAN.md`
2. `docs/COVERAGE.md`
3. `docs/CODEMATCH.md`
4. `docs/PARITY_TEST_MATRIX.md`
5. `docs/ASYNC_CLEANUP.md`
6. `docs/REPAINT_PARITY.md`

Historical/reference docs:
1. `docs/IRON_PARITY_PLAN.md` (campaign history and architecture lessons)

## Work Types and Primary Metrics
1. Porting Work
   Primary metric: reduce first divergence and increase matched PRNG log prefix against C.
   Debug focus: PRNG call context and first-mismatch localization.
2. Selfplay Agent Work
   Primary metric: held-out improvement after training-set tuning.
   Competence focus: survival, exploration breadth, depth progression, and interaction quality (combat, inventory, item use, magic/abilities).
3. Test Infrastructure Work
   Primary metric: developer insight speed.
   Requirements: tests run fast enough to avoid blocking developers and failures provide actionable debug detail.
   Scope may include deterministic replay tooling, diagnostics, and code coverage.
   Constraint: infrastructure reveals bugs; it must not solve or mask them.

## Regression/Progress Standard (Current Phase)
1. A change is a **regression** if it moves first divergence earlier on any parity channel (`PRNG`, `events`, or `screen`) for a session that was previously better.
2. A change is **progress** if it moves first divergence later (or fully green) on one or more parity channels without causing larger regressions elsewhere.
3. Treat boundary-only capture artifacts as neutral unless they clearly shift true gameplay parity.
4. Use per-session first-divergence step movement as the decision signal for go/no-go commits.

## Non-Negotiable Engineering Rules
1. Fix behavior in core JS game code, not by patching comparator/harness logic.
2. Keep harness simple, deterministic, and high-signal for debugging.
3. Never normalize away real mismatches (RNG/state/screen/typgrid) just to pass tests.
4. Keep changes incremental and test-backed.
5. Preserve deterministic controls (seed, datetime, terminal geometry, options/symbol mode).
6. Keep tests fast to expose hangs early:
   - unit tests: 1000ms timeout per test
   - single-session parity runs: 10000ms timeout per session
   - full suite must complete in minutes, not hours — treat creeping slowdown
     as a regression
   - fail fast on hangs; never sit for minutes producing no output
   - a 30-minute deadlock is worse than a test failure — it wastes time with
     zero signal
7. Avoid cruft in parity fixes:
   - no broad refactors unrelated to the active divergence
   - no compatibility shims unless required for immediate correctness
   - remove temporary debug scaffolding before commit unless explicitly retained for observability

## No-Fake-Implementation Rule (Strict)
1. Do not present scaffolds, placeholders, or heuristics as completed parity or translation work.
2. If a prerequisite from plan is missing (for example clang frontend), stop and fix the prerequisite before implementing downstream features.
3. Never claim "translated" when output is stubbed or manually hardcoded per function name.
4. If using fallback behavior temporarily, label it explicitly as fallback and do not count it toward milestone completion.

Examples of forbidden fakes:
1. Regex-only parsing presented as completion for a clang/libclang parser milestone.
2. Emitter logic like `if function_name == "X": emit hardcoded string`.
3. Output marked as translated while body still throws `UNIMPLEMENTED_TRANSLATED_FUNCTION`.
4. Adding comparator/harness exceptions to hide gameplay divergence instead of fixing game logic.

## Development Cycle
1. Identify a failing parity behavior from sessions/tests.
2. Confirm expected behavior from C source.
3. Implement faithful JS core fix that matches C logic.
4. Run relevant tests/sessions (and held-out eval where applicable).
5. Record learnings in `docs/LORE.md` for porting work and `selfplay/LEARNINGS.md` for agent work.
6. Commit only validated improvements.

## Long-Run Regeneration Discipline
When running rebuilds/regenerations that can take several minutes:
1. Do a short preflight first (single seed/single fixture) to confirm setup and output shape.
2. Start the full run only after preflight output looks correct.
3. Monitor partial output during the run (periodic status polls, milestone checks, first-output sanity).
4. Treat stalls or suspicious output as actionable: stop early, fix setup, restart, do not wait for full completion.
5. Keep logs/checkpoints so partial progress can be inspected and reported while work is still running.
6. Report partial status to the user when asked, including what is done, in progress, and next.

## Session and Coverage Expectations
1. Use the canonical key-centered deterministic session format.
2. During translation coverage work, maintain a C-to-JS mapping ledger.
3. For low-coverage parity-critical areas, add targeted deterministic sessions.
4. Keep parity suites green while expanding coverage.
5. Coverage credit is based on C-recorded parity sessions only (see
   `docs/COVERAGE.md`); ordinary unit-test coverage does not count toward parity
   coverage progress.
6. **Every session must compare against C ground truth.** Coverage that isn't
   C-grounded is not parity coverage. Sessions that merely execute code without
   validating against C traces are useless.
7. Follow the session lifecycle in `docs/COVERAGE.md`:
   - record new sessions in `test/comparison/sessions/pending/`,
   - debug/fix parity until green,
   - promote passing sessions into `test/comparison/sessions/coverage/<theme>/`.
8. Coverage sessions under `sessions/coverage/` are part of the default parity
   suite; do not regress them.
9. **Do not add sessions that don't increase coverage.** Every session costs
   CI time; it must pay for itself in new lines/branches covered.
10. While parity coverage is below target, keep active issue work on both:
    - fixing failing pending sessions,
    - recording/promoting new targeted coverage sessions.
11. Track progress by **coverage percentage delta**, not session count.
12. Session filename length policy: for new/renamed session files, keep
   `<filename>.session.json` at 56 characters or fewer (to keep tooling output
   and CLI workflows readable). Use compact intent tokens instead of long prose.
13. Active capture tactic: follow the `Coverage-Per-Turn Agent Challenge` in
   `docs/COVERAGE.md`:
   - build one high-yield session at a time,
   - iterate it toward ~800 steps while maximizing coverage-per-turn,
   - place it in `sessions/pending`,
   - then start a fresh concept/session and repeat.
14. Pending bring-up workflow: run `session_test_runner` first to get the
   authoritative first divergence, then use `rng_step_diff`/mapdump tools only
   for focused drilldown.

## Agent Work Rules (Selfplay)
These rules apply to coding work focused on selfplay agent quality.

1. Use a 13-seed training set with one seed per NetHack character class.
2. Optimize agent behavior against that 13-class training set.
3. Before committing, run a held-out evaluation on a different 13-seed set (also one per class).
4. Only commit when held-out results show improvement over baseline.
5. Track not only survival but competence in exploration breadth, dungeon progression, and interaction quality.
6. Keep agent policy/tuning changes separate from parity harness behavior.

## Harness Boundary
Allowed harness changes:
1. Determinism controls
2. Better observability/logging
3. Faster execution that does not change semantics

Not allowed:
1. Comparator exceptions that hide true behavior differences
2. Replay behavior that injects synthetic decisions not in session keys
3. Any workaround that makes failing gameplay look passing

## Issue Dependencies and Hygiene
Use explicit dependency links in every scoped issue:
- `Blocked by #<issue>`
- `Blocks #<issue>`

Operational rules:
- Apply `blocked` label when prerequisites are open.
- Apply `has-dependents` label when an issue gates others.
- Keep workflow status in sync (`Ready`, `Blocked`, `In Progress`, `Done`).
- Default: do not start `In Progress` while declared blockers are open.
- Exception: if a blocker advisory is stale/incorrect, proceed opportunistically and fix links/labels in the same cycle.

Issue hygiene:
- Run periodic triage (`gh issue list --state open`).
- Close obsolete/superseded issues with a clear reason.
- Update issue body/labels/status comments promptly when new evidence changes scope or priority.
- Use `parity` label for C-vs-JS divergence/parity issues in the unified backlog.
- For Iron Parity campaign issues, also add `campaign:iron-parity` and one scope label (`state`, `translator`, `animation`, `parity-test`, `docs`, or `infra`).
- If a `gh` command fails due sandbox/network restrictions, request command escalation and rerun it immediately.

Iron Parity issue structure:
- Maintain one campaign tracker epic: `IRON_PARITY: Campaign Tracker (M0-M6)`.
- Maintain one issue per milestone (`M0` through `M6`) and link implementation issues under the relevant milestone.
- Each implementation issue should include explicit divergence evidence and expected C behavior when parity-related.

## Agent Ownership and Intake
1. Agent name is the current working directory basename; use it as identity for issue ownership.
2. Directory/topic affinity is suggestive only; any agent may take any issue.
3. If no pending task exists, pull another actionable open issue.
4. If starting work not tracked yet, create/update a GitHub issue immediately.
5. Issues are unowned by default; do not assign ownership labels until work is actively claimed.
6. Track ownership with `agent:<name>` label only while actively working.
7. Use at most one `agent:*` label in normal flow; temporary overlap is allowed only during explicit handoff.
8. When starting work: `gh issue edit <number> --add-label "agent:<name>"`
9. If intentionally abandoning: `gh issue edit <number> --remove-label "agent:<name>"`
10. If you complete work on an issue assigned to another agent, proceed and resolve it; leave a detailed closing/update comment so the original assignee has full context.

## Practical Commands
- Install/run basics: see `docs/DEVELOPMENT.md`.
- Issue workflow quick reference:

```bash
gh issue list --state open
gh issue view <number>
gh issue edit <number> --add-label "agent:<name>"
gh issue edit <number> --remove-label "agent:<name>"
gh issue close <number> --comment "Done"
gh issue comment <number> --body "Status..."
```

- RNG divergence triage quick reference:

```bash
# Reproduce one session with JS caller-tagged RNG entries
node test/comparison/session_test_runner.js --verbose <session-path>

# Inspect first mismatch window for one step
node test/comparison/rng_step_diff.js <session-path> --step <N> --window 8
```

`RNG_LOG_PARENT=0` can be used to shorten tags if needed.
Set `RNG_LOG_TAGS=0` to disable caller tags when you need lower-overhead runs.

## Skill Usage
1. Agents that support skills should use repo skills from `skills/<skill-name>/SKILL.md` when relevant.
2. Current repo skills:
   - `skills/parity-rng-triage/SKILL.md`
   - `skills/topline-async-boundary/SKILL.md`
3. `AGENTS.md` remains the source of truth for non-negotiable policy.
4. If skill loading is unavailable in a client, follow the workflow and guardrails from the referenced `SKILL.md` manually.
5. Skill guardrails are mandatory when applicable, including:
   - no comparator masking/exceptions to hide divergences
   - no `js/replay_core.js` compensating behavior (no synthetic queueing/injection/auto-dismiss/timing compensation)

## Priority Docs (Read Order)
1. Always start with:
   - `PROJECT_PLAN.md`
   - `docs/COVERAGE.md` (Phase 3 execution guide)
   - `docs/CODEMATCH.md`
   - `docs/PARITY_TEST_MATRIX.md`
   - `docs/DEVELOPMENT.md`
   - `docs/LORE.md`
   - `docs/ASYNC_CLEANUP.md`
2. For porting/parity divergence work:
   - `docs/C_FAITHFUL_STATE_REFACTOR_PLAN.md`
   - `docs/C_TRANSLATOR_ARCHITECTURE_SPEC.md`
   - `docs/C_TRANSLATOR_PARSER_IMPLEMENTATION_SPEC.md`
   - `docs/SESSION_FORMAT_V3.md`
   - `docs/RNG_ALIGNMENT_GUIDE.md`
   - `docs/C_PARITY_WORKLIST.md`
3. For special-level parity work:
   - `docs/SPECIAL_LEVELS_PARITY_2026-02-14.md`
   - `docs/special-levels/SPECIAL_LEVELS_TESTING.md`
4. For selfplay agent work:
   - `selfplay/LEARNINGS.md`
   - `docs/SELFPLAY_C_LEARNINGS_2026-02-14.md`
   - `docs/agent/EXPLORATION_ANALYSIS.md`
5. For known issue deep-dives:
   - `docs/bugs/pet-ai-rng-divergence.md`
   - `docs/NONWIZARD_PARITY_NOTES_2026-02-17.md`
6. Historical campaign references (non-primary for current phase):
   - `docs/IRON_PARITY_PLAN.md`
   - `docs/MORE_NEEDED_CAMPAIGN.md`

## Completion Discipline
When a task is complete:
1. File issues for any remaining follow-up work.
2. Run relevant quality gates.
3. Update issue status.
4. Pull/rebase and push (do not leave validated work stranded locally):
   ```bash
   git pull --rebase
   git push
   git status
   ```
5. Verify changes are committed and pushed.
6. Report what changed, what was validated, and remaining risks.

Critical rules:
- Work is NOT complete until `git push` succeeds.
- NEVER stop before pushing — that leaves work stranded locally.
- NEVER say "ready to push when you are" — YOU must push.
- If push fails, resolve and retry until it succeeds.
- When multiple developers are active, push meaningful validated increments rather than batching too long locally.

## Documentation Hygiene
1. If docs are inaccurate or stale, fix or remove them immediately.
2. Keep `docs/` aligned to actual code behavior and active workflows.
