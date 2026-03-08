# SYNCLOCK Campaign Plan

## Campaign Name
`SYNCLOCK` (Single-thread Yield Contract Lockdown)

## Goal
Enforce C-faithful single-threaded execution ordering in the JS port by making all gameplay suspension points explicit, typed, and centrally owned by the command loop.

## Problem Statement
The current async architecture allows valid input waits and message waits, but it also permits arbitrary `await` sites in gameplay code. That can introduce unintended reordering relative to C when promises settle across boundary layers (`run_command`, `display.putstr_message`, prompts, animation delays).

We already have strong building blocks:
- input wait-epoch contract in `js/input.js` / `js/headless.js`
- boundary owner stack in `js/allmain.js`
- boundary plans in `docs/INPUT_BOUNDARY_STACK_PLAN.md` and
  `docs/REPLAY_INPUT_BOUNDARY_ARCHITECTURE.md`

This campaign hardens those into a strict execution contract.

## Contract (Target State)
Within one gameplay command, only these suspension classes are allowed:
1. `input` (keypress/prompt wait)
2. `more` (`--More--` acknowledgement wait)
3. `anim` (interactive-only animation pause; deterministic no-op in parity/headless runs)

Any other suspension in gameplay execution is illegal in strict mode.

## Scope
In scope:
- `js/allmain.js` command loop ownership
- `js/input.js`, `js/headless.js` wait contract use
- `js/display.js`, `js/headless.js` message boundary ownership
- gameplay callsites that currently await boundary-capable APIs (`js/hack.js` and peers)
- test/diagnostic enforcement

Out of scope:
- comparator masking or replay compensation
- changing C-vs-JS intended semantics

## Phases

### Phase S0: Instrumentation + No-Behavior-Change Guard
Deliverables:
- Add `js/exec_guard.js`:
  - begin/end command token
  - typed suspension admission (`input|more|anim`)
  - strict-mode env handling
- Add `js/suspend.js` wrappers:
  - `awaitInput`, `awaitMore`, `awaitAnim`
- Wire top-level command begin/end in `run_command` (`js/allmain.js`) with diagnostics only.

Validation gate:
- No parity regressions on:
  - `seed031_manual_direct`
  - `seed032_manual_direct`
  - `seed033_manual_direct`

### Phase S1: Boundary Ownership Centralization
Deliverables:
- Make command loop (`run_command`) the sole owner of `more` dismissal.
- Ensure `display/headless putstr_message` only marks boundary state and queues; no deep hidden ownership drift.
- Preserve existing fallback compatibility paths behind diagnostics.

Validation gate:
- Non-regressive first-divergence index/channel for 031/032/033.
- `./scripts/run-and-report.sh --failures` non-regressive.

### Phase S2: Typed Suspension Migration
Deliverables:
- Replace direct boundary awaits at high-risk gameplay sites with typed wrappers.
- Prioritize files with dense boundary traffic (`js/hack.js`, prompt handlers, window/message adapters).

Validation gate:
- Same as S1, plus targeted unit checks for boundary state.

### Phase S3: Enforcement
Deliverables:
- Add lint/check rule to reject raw awaits in gameplay modules except approved wrappers.
- Enable strict runtime mode in parity CI lane.

Validation gate:
- No pass-count drop in session suite.
- Strict mode emits zero illegal suspension violations on baseline parity runs.

### Phase S4: Architecture Documentation and Team Guidance
Deliverables:
- Add SYNCLOCK architecture notes to `docs/DESIGN.md`.
- Add a durable decision record to `docs/DECISIONS.md`.
- Add a dedicated programming guide: `docs/SYNCLOCK_PROGRAMMING_GUIDE.md`.
- Link issue/campaign status to these docs for handoff clarity.

Validation gate:
- Docs accurately match current implementation (`allmain/input/display/headless/suspend`).
- Examples in guide use current APIs (`withInputBoundary`, `awaitInput`, `awaitMore`, `awaitAnim`, `awaitDisplayMorePrompt`).

## Risks and Mitigations
1. Risk: behavior change from boundary ownership refactor.
   - Mitigation: phase-gated, seed031/032/033 first-divergence checks each step.
2. Risk: prompt deadlock or key loss.
   - Mitigation: keep owner-stack prompt handling canonical; add diagnostics for ignored key paths.
3. Risk: animation timing side-effects.
   - Mitigation: typed `anim` class with deterministic headless behavior unchanged.

## Success Criteria
1. All gameplay suspensions are typed and auditable.
2. No hidden/untyped suspension sites in strict mode.
3. Parity debugging becomes easier because ordering errors fail loudly at the boundary where they occur.

## WIP Disposition Policy
When starting SYNCLOCK work, keep unvalidated parity experiments out of `main`:
1. Preserve local experiments as a named stash or external patch snapshot.
2. Land only validated, non-regressive increments.
3. Record stash/patch identifier in issue updates so work is recoverable.

## Status (2026-03-08)
Landed S0 increments on `main`:
1. `de90d1ff`
   - added `js/exec_guard.js`
   - added `js/suspend.js`
   - wired `run_command` begin/end guard and boundary-owned typed waits
   - added `test/unit/synclock_exec_guard.test.js`
2. `b013b590`
   - routed direct `await nhgetch()` waits in `js/allmain.js` through `awaitInput(...)`
3. `08277834`
   - classified frame-yield `setTimeout(0)` waits in `js/allmain.js` as `awaitAnim(...)`

Validation snapshot after these increments:
- `seed031_manual_direct`: pass
- `seed032_manual_direct`: pass
- `seed033_manual_direct`: known fail window unchanged (non-regressive)

S0 hygiene audit baseline (`node scripts/synclock_audit.mjs`):
- `raw_await_nhgetch`: 94 (outside `allmain.js` core loop)
- `raw_settimeout0_await`: 0
- `display_moreprompt_nhgetch`: 10
- `allmain.js core-loop guardrail status`: `CLEAN`

Interpretation:
- The command loop (`allmain.js`) is now typed-wait clean.
- Remaining raw waits are concentrated in gameplay/UI modules and are the
  migration set for S1/S2 (do not convert by masking or replay compensation).

Latest snapshot (post-S1/S2 migration + enforcement hardening):
- `raw_await_nhgetch`: 0
- `raw_settimeout0_await`: 0
- `display_moreprompt_nhgetch`: 0
- `direct_moreprompt_calls`: 0 (outside centralized helper)
- `allmain.js core-loop guardrail status`: `CLEAN`
- `run_command` reports owner-missing diagnostics for no-owner pending
  `--More--`; strict mode (`WEBHACK_STRICT_MORE_OWNER=1`) ignores the key,
  while default mode keeps compatibility auto-sync.
- Replay/session tooling now carries per-session SYNCLOCK boundary counters
  (`boundary.more.owner-missing`, `boundary.more.fallback-no-owner`) so
  owner violations are visible in session result summaries.
