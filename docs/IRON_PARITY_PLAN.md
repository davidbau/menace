# IRON_PARITY_PLAN.md

## Status Update (March 4, 2026)

Operation Iron Parity is currently in **archived-guidance mode** rather than
active execution mode.

Reason for status change:
1. Current branch evidence shows baseline instability (tool/source-path drift,
   compiled-data fixture drift) and broad replay regressions that reduce signal
   quality.
2. Translator throughput work is therefore not the current highest-leverage
   path to gameplay parity closure.

Active execution pivot:
1. Stabilize baseline and restore trustworthy parity/test signal first.
2. Prioritize direct Tier-1 gameplay parity burndown (monster movement, pet AI,
   and first-divergence clusters).
3. Execute cursor-parity closure from `/share/u/davidbau/git/mazesofmenace/mazes/docs/CURSOR_PLAN.md`
   as the near-term concrete plan.
4. Keep translator work gated and limited to support tasks until baseline and
   gameplay parity are stable again.

This document remains authoritative for naming, canonical-state targets, and
translator policy constraints when translator work resumes.

## Campaign Name
Operation Iron Parity

## Mission
Achieve durable C-faithful gameplay parity by combining:

1. canonical runtime-state alignment under `game.*`, and
2. rule-driven mechanical translation for scalable porting.

This campaign treats green tests as guardrails, not the goal. The goal is faithful C behavior and architecture.

## Source Plans

1. State refactor plan: [C_FAITHFUL_STATE_REFACTOR_PLAN.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_FAITHFUL_STATE_REFACTOR_PLAN.md)
2. Translator architecture: [C_TRANSLATOR_ARCHITECTURE_SPEC.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_TRANSLATOR_ARCHITECTURE_SPEC.md)
3. Translator parser strategy: [C_TRANSLATOR_PARSER_IMPLEMENTATION_SPEC.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_TRANSLATOR_PARSER_IMPLEMENTATION_SPEC.md)
4. Translator out-param/format strategy: [C_TRANSLATOR_OUTPARAM_AND_FORMAT_ARCHITECTURE.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_TRANSLATOR_OUTPARAM_AND_FORMAT_ARCHITECTURE.md)
5. Coverage ledger: [CODEMATCH.md](/share/u/davidbau/git/mazesofmenace/game/docs/CODEMATCH.md)
6. Parity debugging workflow: [RNG_ALIGNMENT_GUIDE.md](/share/u/davidbau/git/mazesofmenace/game/docs/RNG_ALIGNMENT_GUIDE.md)
7. Learnings: [LORE.md](/share/u/davidbau/git/mazesofmenace/game/docs/LORE.md)
8. Translator capability gap tracker: [C_TRANSLATOR_99_PERCENT_CAPABILITY_GAPS.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_TRANSLATOR_99_PERCENT_CAPABILITY_GAPS.md)

## Strategic Thesis

1. State refactor is the foundation.
2. Translator is the force multiplier.
3. Translator coverage only scales after canonical state is stable.
4. Every increment must hold or improve replay parity evidence.

## Campaign Outcomes

Primary outcomes:

1. Canonical C-shaped runtime state under `game.*` in parity-critical modules.
2. Measurable reduction in hidden-state divergence classes.
3. Mechanical translation pipeline producing safe, reviewable patches for large portions of C gameplay code.

Secondary outcomes:

1. Faster function-surface closure in CODEMATCH.
2. Lower manual churn for repetitive ports.
3. Better long-term maintainability with explicit translation policies and boundary contracts.

## Scope Baseline (Operational)

From `docs/CODEMATCH.md` function-level rows (snapshot 2026-02-26):

1. Total function rows tracked: `5000`.
2. Missing rows (raw): `3863`.
3. Missing rows excluding files marked `N/A`: `3242`.

Execution implication:

1. The campaign must explicitly scale translation throughput from validated pilots
   to large batches; one-function-at-a-time porting cannot close this backlog.

## Non-Negotiable Constraints

1. No comparator exceptions that hide real mismatches.
2. No synthetic replay behavior that changes semantics.
3. No big-bang refactor without parity gates.
4. No widening of legacy mirror state paths.
5. Headless replay speed remains high; animation timing is boundary-correct but skippable in headless.

## Canonical Naming and Notation Rules (Campaign-Wide)

Purpose:

1. Remove ambiguity during migration.
2. Ensure translator output converges directly to final-state architecture.
3. Keep review and issue triage mechanically checkable.

Authoritative target names:

1. Runtime/global ownership must converge to canonical `game.*` paths.
2. Translator output must target canonical names by default, never ad-hoc aliases.
3. Legacy names are allowed only as explicitly marked transitional bridges.
4. Within canonical paths, prefer C-like symbol names to maximize mechanical translation fidelity.

Canonical path policy:

1. Use this form for all parity-critical state reads/writes: `game.<namespace>.<field>`.
2. Preferred namespaces: `game.u`, `game.flags`, `game.iflags`, `game.gd`, `game.gm`, `game.gn`, `game.lev`, `game.svc.*`.
3. C symbol names remain C-shaped when they are semantic entities (for example `youmonst`, `moves`, `mvitals`), but mounted at canonical ownership paths.
4. Prefer C field/function naming and ordering over JS-style cosmetic rewrites when behavior is equivalent.
5. Do not introduce new top-level mirrors (`context.*`, `map.*`, `state.*`, `globals.*`) as long-term ownership.

Legacy bridge policy:

1. Transitional aliases are permitted only when required to avoid large-batch regressions.
2. Every alias bridge must carry an explicit marker comment: `IRON_PARITY_ALIAS_BRIDGE`.
3. Every alias bridge must reference a milestone retirement target (`M1`, `M2`, ... `M6`) and follow-up issue.
4. Alias bridges are read-through/write-through adapters only; they must not become independent state owners.
5. Any new alias bridge without retirement metadata is a policy violation.

Translator naming and notation policy:

1. Rewrite tables must map C globals/paths directly to canonical `game.*` targets.
2. Rule tables may include compatibility profiles, but default emit profile is canonical-only.
3. Generated identifiers should be deterministic and C-first:
   1. preserve C local/global/member names whenever they are valid JS identifiers,
   2. only rename when required by JS syntax/reserved words or established exported API contracts,
   3. do not camelize/simplify names for style alone.
4. Generated function names stay aligned to C function names unless file-level JS API constraints require wrappers.
5. Temporary translator shims must be marked as `TRANSITIONAL_SHIM` and tracked in campaign issues.

Issue and doc notation rules:

1. Always describe state locations as canonical path pairs: `C:<symbol/path> -> JS:<game.path>`.
2. For divergences, include `file:function`, divergence channel, and first step/index.
3. For migration notes, explicitly tag status:
   1. `canonical` (final target),
   2. `bridge` (temporary alias),
   3. `legacy` (to be removed).
4. `docs/port-status/IRON_PARITY_ALIAS_BRIDGE_LEDGER_*.md` is the running bridge inventory and retirement tracker.

Milestone enforcement:

1. `M1`: canonical namespaces exist; no untracked alias bridges.
2. `M2`: movement/turn modules stop writing through legacy ownership paths.
3. `M3+`: translator output must be canonical-first; compatibility profile usage requires explicit justification.
4. `M6`: Tier-1 legacy bridges removed, except explicitly approved long-tail exceptions.

## Program Structure

Run three coordinated workstreams:

1. Workstream A: State Canonicalization
2. Workstream B: Translator Infrastructure
3. Workstream C: Parity Operations and Governance

## Workstream A: State Canonicalization

Objective:

1. Move parity-critical ownership to canonical namespaces (`game.u`, `game.svc.context`, `game.flags`, `game.iflags`, `game.gd`, `game.gm`, `game.gn`, `game.lev`).

Module priority:

1. Tier 1: `hack.js`, `allmain.js`, `cmd.js`, `monmove.js`, `mon.js`, `uhitm.js`, `mhitu.js`, `mhitm.js`, `trap.js`
2. Tier 2: `dungeon.js`, `mkroom.js`, `makemon.js`, `u_init.js`, `sp_lev.js`, `bones.js`
3. Tier 3: display/animation/input-edge consistency files

Exit conditions for A:

1. Tier 1 modules contain no active legacy mirror ownership.
2. Alias invariants validated in CI/debug.
3. Session pass count stable or improved versus baseline.

## Workstream B: Translator Infrastructure

Objective:

1. Build and deploy project-specific C-to-JS translator with deterministic rule tables and risk controls.

Required assets:

1. `tools/c_translator/rulesets/*` rule tables and schemas
2. coverage policy manifest: `tools/c_translator/rulesets/file_policy.json`
3. policy checker: `scripts/check-translator-file-policy.mjs`
4. annotation-driven mixed-file controls (`Autotranslated from <file>.c:<line>/TRANSLATOR: MANUAL/MANUAL-BEGIN/MANUAL-END`)

Translation policy classes:

1. `manual_only` for runtime/platform/harness glue
2. `generated_data` for generated tables and static data
3. `mixed` with annotation-derived allowlist
4. `auto` for gameplay modules

Exit conditions for B:

1. Schema + rule loader stable.
2. Translator regression tests in place.
3. Pilot files translated with no parity regression.

### Translation Throughput Ramp (Authoritative)

Stage 0: Scrutinized pilots

1. Batch size: `1-12` functions.
2. Scope: hand-audited exemplars (sync, async, boundary, macro-heavy, control-flow variants).
3. Promotion gate:
   1. translator regression tests green,
   2. policy checks green (`translator:check-policy`, `translator:check-annotations`),
   3. no parity regression in targeted session subset.

Stage 1: Dozens

1. Batch size: `12-60` functions per wave.
2. Scope: one subsystem slice with shared rewrite policy.
3. Promotion gate:
   1. stable idempotence/static gates across repeated runs,
   2. unresolved-token diagnostics trend downward,
   3. parity baseline stable/improving on campaign dashboard.

Stage 2: Hundreds

1. Batch size: `60-400` functions per wave.
2. Scope: multi-file subsystem families after canonical state ownership is stable.
3. Promotion gate:
   1. automated triage for blocked/partial emits,
   2. issue workflow keeps follow-ups bounded and linked,
   3. no unreviewed growth in bridge/compatibility debt.

Stage 3: Thousands

1. Batch size: campaign-scale closure waves (`400+` cumulative per wave window).
2. Scope: full backlog burn-down with mixed auto/manual policy.
3. Gate discipline:
   1. all prior stage gates remain active,
   2. high-risk files remain policy-constrained (`manual_only` or strict `mixed`),
   3. release-critical parity suites remain authoritative for accept/reject.

### Common Helper and Out-Param Normalization Lane (High Priority)

Purpose:

1. Remove high-volume translator blockers caused by unresolved C helper idioms and out-param mutation patterns.
2. Convert these blockers into deterministic lowering rules so large-batch autotranslation can scale safely.

Current audited scope (full pipeline snapshot):

1. `298` unsafe functions are blocked by common C helper symbols (`sprintf/strcpy/strlen/...` family).
2. `203` functions contain `Sprintf/Snprintf` calls.
3. `116` functions contain detected direct out-param writes.

Authoritative helper automation tranche (Phase B-H1):

1. `sprintf` / `snprintf` (including `Sprintf` / `Snprintf`)
2. `strcpy` / `strcat` / `strncpy`
3. `strlen`
4. `strchr` / `strrchr`
5. `strcmpi` / `strncmpi`
6. `atoi`
7. `abs`
8. `eos`

Execution rules:

1. Implement as translator lowering/normalization, not comparator exceptions.
2. Keep C order and branch structure; only replace helper semantics with JS-equivalent expression/helpers.
3. Add function-summary metadata for out-param role classification and callsite rewrite (`single`, `single+result`, `multi`).
4. Gate each wave with unit tests, translator regression tests, and session parity baseline check.
5. For printf-family sinks (`Sprintf`, `Snprintf`, `pline`, `raw_printf`), enforce one shared formatter contract and explicit unsupported-specifier diagnostics.

Exit gate for B-H1:

1. Marked-function audit shows reduced `unsafe_unknown_calls_and_identifiers` count in helper-driven categories.
2. `Sprintf/Snprintf`-blocked marked set reduced by at least `50%` from current baseline.
3. No regression in parity baseline (`test:session`) and no unit-test failures.

## Workstream C: Parity Operations and Governance

Objective:

1. Keep campaign evidence-driven with reproducible parity deltas and tight rollback paths.

Operational loop:

1. Capture baseline metrics (all sessions, gameplay subset, failing session taxonomy).
2. Apply scoped batch.
3. Run gates.
4. Record deltas (first divergence step, RNG/events matched prefixes, pass counts).
5. Update docs and issue tracker.

Governance rules:

1. No merge without evidence artifact.
2. Any regression requires explicit disposition:
   1. fix immediately,
   2. rollback,
   3. documented known regression with approved follow-up issue.

## Integrated Phase Plan

Shared milestone IDs in this table are authoritative for all three planning docs.
`C_FAITHFUL_STATE_REFACTOR_PLAN.md` and translator specs must reference these IDs.

| Milestone | Scope lead | Exit gate |
| --- | --- | --- |
| M0 | Baseline + policy/CI guardrails | Baseline reproducible; policy checks green |
| M1 | Canonical state spine | No regression in unit/sessions; alias invariants active |
| M2 | Movement/turn canonicalization | Movement-divergence seeds stable/improving |
| M3 | Translator alpha (safe subset) | Idempotence + static gates green |
| M4 | Combat/monster + translator pilot | Targeted parity stable/improving |
| M5 | Generation/startup + translator expansion | Early-step divergence class improved |
| M6 | Boundary hardening + legacy removal | Campaign metrics stable; docs synchronized |

## Phase 0: Baseline and Tooling Guardrails

Deliver:

1. Baseline parity report.
2. Failing-session divergence taxonomy by `file:function`.
3. CI checks for translator file-policy completeness.

Gate:

1. Current baseline captured and reproducible.

## Phase 1: Canonical State Spine

Deliver:

1. Canonical `game.*` namespaces established.
2. Transitional alias checks active.
3. No new mirrors introduced.

Gate:

1. Unit and session suites non-regressing.

## Phase 2: Movement/Turn Control Canonicalization

Deliver:

1. `hack.js`, `cmd.js`, `allmain.js` movement/run/travel paths on canonical state.
2. Legacy sync glue reduced/removed.

Gate:

1. Movement-centric failing seeds stable or improved.

## Phase 3: Translator Alpha (Safe Subset)

Deliver:

1. Translator end-to-end pipeline operational.
2. Rule tables loaded and validated.
3. Pure/helper function translation proven.

Gate:

1. Idempotence and static checks pass.
2. Stage-0 throughput ramp gate passes (scrutinized pilot set complete).

### Phase 3 Hard-Part Execution Order (Authoritative)

Work packages are intentionally ordered to avoid rework:

1. `T3.1` Parser bootstrap (`clang.cindex` TU load + compile command profile)
2. `T3.2` Source/PP span map + macro provenance extraction
3. `T3.3` NIR core model + deterministic function-level serialization
4. `T3.4` Rule/schema loader + strict validation
5. `T3.5` Rewrite pass engine wiring (state/macros/function/boundary/controlflow)
6. `T3.6` JS backend emitter skeleton (stable formatting + source map sidecar)
7. `T3.7` CLI orchestration (`main.py`) and artifact writing (`meta/diag`)
8. `T3.8` Idempotence/static gates + translator unit suite
9. `T3.9` Safe-subset pilot translation on curated helper functions

Dependency constraints:

1. `T3.3` depends on `T3.1` and `T3.2`.
2. `T3.5` depends on `T3.3` and `T3.4`.
3. `T3.6` depends on `T3.3`.
4. `T3.7` depends on `T3.5` and `T3.6`.
5. `T3.8` depends on `T3.7`.
6. `T3.9` depends on `T3.8`.

Parallelization rule:

1. `T3.4` can run in parallel with `T3.2/T3.3`.
2. `T3.6` can start once `T3.3` is stable, in parallel with late `T3.5`.
3. Final gate still requires all `T3.x` to be green.

## Phase 4: Combat/Monster Core Canonicalization + Translator Pilot

Deliver:

1. Canonicalization of combat and monster turn core paths.
2. Translator pilot for selected `hack.c`, `monmove.c`, `uhitm.c` functions.

Gate:

1. No parity regression on targeted seeds; at least one divergence cluster improves.
2. Stage-1 throughput ramp gate passes (dozens-scale subsystem wave).

## Phase 5: Generation/Startup Canonicalization + Translator Expansion

Deliver:

1. Startup and generation ownership aligned (`u_init`, `dungeon`, `makemon`, `sp_lev`, `bones`).
2. Translator expands to additional `auto` modules.

Gate:

1. Early-step divergence class improved.
2. Stage-2 throughput ramp gate passes (hundreds-scale wave reliability).

## Phase 6: Boundary Hardening and Legacy Path Elimination

Deliver:

1. Mixed-file boundaries fully annotation-managed.
2. Remaining legacy mirrors removed in Tier 1.
3. Documentation finalized and synchronized.

Gate:

1. Stable campaign-level parity metrics and clean policy checks.
2. Stage-3 throughput operation is stable for remaining backlog closure.

## Artifacts and Evidence Required Per Batch

1. Changed files and rationale.
2. Unit test result summary.
3. Session test summary:
   1. overall pass/fail
   2. gameplay subset pass/fail
   3. top failing divergences with `file:function`.
4. Delta note:
   1. improved/unchanged/regressed seeds
   2. reasoned explanation for changes.

## Metrics Dashboard (Minimum)

1. `sessions_passed_total`
2. `gameplay_passed_total`
3. `failing_gameplay_count`
4. median first RNG divergence step (failing gameplay set)
5. median first event divergence index (failing gameplay set)
6. top-10 divergence origins by frequency (`file:function`)

## Risks and Countermeasures

1. Risk: State migration introduces hidden behavior drift.
   1. Countermeasure: small batches + focused parity reruns + rapid rollback.
2. Risk: Translator rules overfit and mis-translate edge cases.
   1. Countermeasure: strict-mode conflicts + risk scoring + manual-required high-risk paths.
3. Risk: Mixed-file boundaries become stale.
   1. Countermeasure: annotation-first policy + CI enforcement.
4. Risk: Development velocity drops due to process overhead.
   1. Countermeasure: keep artifacts lightweight and script-assisted.

## Decision Framework for “Should This Be Auto-Translated?”

Auto-translate if all are true:

1. file policy is `auto` or `mixed` with annotation-allowed region/function,
2. no unresolved parity-critical macros/symbols,
3. boundary semantics resolved by table rules,
4. risk score below configured threshold.

Manual required if any are true:

1. `manual_only` or `generated_data` policy,
2. unresolved boundary/async rule,
3. high-risk control-flow transform not proven for this pattern,
4. translation touches blocked mixed-file region.

## Rollback Strategy

1. Keep changes in small commits aligned to one module cluster.
2. If parity regresses, revert the offending batch cleanly.
3. Preserve diagnostics artifacts so the same bug is not reintroduced.

## Completion Criteria for Operation Iron Parity

1. Canonical state ownership complete for Tier 1 and Tier 2 modules.
2. Translator v1 operational and trusted on safe/high-value subsets.
3. Remaining non-translated zones are explicitly policy-marked and justified.
4. Replay parity trend is stable/improving with reduced hidden-state divergence clusters.
5. All campaign plan docs remain synchronized and current:
   1. [C_FAITHFUL_STATE_REFACTOR_PLAN.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_FAITHFUL_STATE_REFACTOR_PLAN.md)
   2. [C_TRANSLATOR_ARCHITECTURE_SPEC.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_TRANSLATOR_ARCHITECTURE_SPEC.md)
   3. [C_TRANSLATOR_PARSER_IMPLEMENTATION_SPEC.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_TRANSLATOR_PARSER_IMPLEMENTATION_SPEC.md)
   4. [IRON_PARITY_PLAN.md](/share/u/davidbau/git/mazesofmenace/game/docs/IRON_PARITY_PLAN.md)
