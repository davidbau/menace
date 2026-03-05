# C_TRANSLATOR_ARCHITECTURE_SPEC.md

Campaign umbrella: [IRON_PARITY_PLAN.md](/share/u/davidbau/git/mazesofmenace/game/docs/IRON_PARITY_PLAN.md)

## Document Role

This document is the translator program contract:

1. scope and goals,
2. ruleset architecture,
3. file policy model,
4. CI/validation gates,
5. rollout and governance.

Parser/frontend internals live in:

1. [C_TRANSLATOR_PARSER_IMPLEMENTATION_SPEC.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_TRANSLATOR_PARSER_IMPLEMENTATION_SPEC.md)
2. [C_TRANSLATOR_NIR_SPEC.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_TRANSLATOR_NIR_SPEC.md)
3. [C_TRANSLATOR_OUTPARAM_AND_FORMAT_ARCHITECTURE.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_TRANSLATOR_OUTPARAM_AND_FORMAT_ARCHITECTURE.md)

## Purpose
Define a concrete, project-specific C-to-JS translation architecture for NetHack gameplay porting in this repository.

This translator is not generic. It is intentionally tuned to:

1. NetHack C source style and idioms.
2. This repository's canonical runtime model (`game.*` namespaces).
3. Known boundary semantics (display, input, animation delay, async turn flow).
4. Parity-driven validation (RNG/event/session replay).

## Goals

1. Mechanically translate large portions of C function bodies into reviewable JS.
2. Preserve C ordering for reads/writes/calls as much as possible.
3. Apply curated semantic rules for macros, globals, and boundary calls.
4. Minimize manual edits to high-confidence, repetitive translation tasks.
5. Produce deterministic, idempotent output and explicit TODOs for unsupported constructs.

## Non-Goals

1. Fully automatic parity without human review.
2. Generic C compiler or full C AST semantic analysis for all C dialects.
3. Replacing replay-based verification.

## Preconditions

The translator assumes the state refactor direction in [STRUCTURES.md](/share/u/davidbau/git/mazesofmenace/game/docs/STRUCTURES.md):

1. Canonical runtime state under `game.*`.
2. Reduced legacy mirror fields.
3. Clear async boundaries for display/input/timing.

## Implementation Stack Decision

Authoritative implementation choice:

1. Translator orchestrator language: **Python**.
2. C parsing/preprocessing frontend: **Clang/libclang** (Python bindings via `clang.cindex`).
3. Preprocessed view source: `clang -E` invocation for PP diagnostics/cross-check.
4. Rule engine + NIR + transforms: Python modules under `tools/c_translator/`.
5. Output integration and validation: existing Node test/parity tooling in repo.

Explicit non-choice:

1. Do **not** build a handwritten C parser.
2. Do **not** use a generic lightweight parser as primary frontend for macro-heavy parity-critical translation.

Rationale:

1. Clang provides production-grade C parsing and preprocessing records.
2. Macro provenance and conditional compilation handling are required for correctness.
3. Python aligns with existing converter tooling already used in this repository.

## System Architecture

## Pipeline overview

1. Parse C input (`nethack-c/src/*.c`) into AST + token stream.
2. Build normalized intermediate representation (NIR).
3. Run rule-driven rewrite passes in strict order.
4. Emit JS AST + formatted JS.
5. Attach translation metadata and diagnostics.
6. Run post-emit validators and parity smoke checks.

## Components

1. `frontend`:
   1. C parser integration.
   2. Macro expansion map loading.
2. `nir`:
   1. Lossless-enough function-level IR preserving source order and side-effect boundaries.
3. `rule_engine`:
   1. Applies declarative rules from tables with deterministic precedence.
4. `backend`:
   1. JS emitter (ES module target).
5. `verifier`:
   1. Static checks, lint gates, parity smoke runner integration.

## Proposed repository layout

1. `tools/c_translator/`
   1. `main.py` entrypoint.
   2. `frontend/`
   3. `nir/`
   4. `rules/`
   5. `passes/`
   6. `backend/`
   7. `verify/`
2. `tools/c_translator/rulesets/`
   1. `manifest.yml`
   2. `state_paths.yml`
   3. `macro_semantics.yml`
   4. `function_map.yml`
   5. `boundary_calls.yml`
   6. `controlflow_patterns.yml`
   7. `type_hints.yml`
   8. `file_overrides/*.yml`
   9. `file_policy.json`
3. `tools/c_translator/schemas/`
   1. JSON Schema or equivalent for each rule file.

## Rule Table Set (Concrete Design)

## 1) `manifest.yml`
Declares ruleset identity, versioning, and load order.

Fields:

1. `ruleset_name`
2. `version`
3. `target_commit_range`
4. `load_order`
5. `strict_mode`
6. `default_language_target` (`es2022`)
7. `default_output_style` (lint/formatter profile)

Example:

```yaml
ruleset_name: nethack-c-to-js
version: 1
target_commit_range: ">=955d057c"
strict_mode: true
load_order:
  - state_paths
  - macro_semantics
  - function_map
  - boundary_calls
  - controlflow_patterns
  - type_hints
  - file_overrides
```

## 2) `state_paths.yml`
Maps C globals/struct access paths to canonical JS runtime paths.

Fields per rule:

1. `id`
2. `match`:
   1. `c_path` (supports dotted/member/pointer forms)
   2. `context` (optional file/function constraints)
3. `replace`:
   1. `js_path`
   2. `access_mode` (`read`, `write`, `readwrite`)
4. `alias_requirement` (`must_alias`, `direct`, `legacy_allowed`)
5. `notes`

Example:

```yaml
- id: svc_context_run
  match:
    c_path: "svc.context.run"
  replace:
    js_path: "game.svc.context.run"
    access_mode: readwrite
  alias_requirement: must_alias
```

## 3) `macro_semantics.yml`
Defines macro and predicate semantics to rewrite safely.

Rule categories:

1. `pure_predicate`
2. `flag_test`
3. `inline_expression`
4. `special_form` (requires custom transform hook)
5. `unsupported`

Fields:

1. `macro`
2. `arity`
3. `category`
4. `expansion` (templated JS expression)
5. `side_effect_level` (`none`, `may_call`, `unknown`)
6. `requires_context`
7. `fallback`

Example:

```yaml
- macro: "IS_DOOR"
  arity: 1
  category: pure_predicate
  expansion: "IS_DOOR({0})"
  side_effect_level: none
```

Example with explicit unsupported marker:

```yaml
- macro: "FALLTHROUGH"
  arity: 0
  category: special_form
  expansion: "__FALLTHROUGH__"
  side_effect_level: none
  requires_context: switch_case
```

## 4) `function_map.yml`
Maps C function calls to JS call targets and invocation modes.

Fields:

1. `c_name`
2. `js_target`
3. `call_mode`:
   1. `sync`
   2. `await_if_async_context`
   3. `always_await`
   4. `defer`
4. `arg_map` (ordered transform spec)
5. `injected_args` (for `game`, `map`, `display` where required)
6. `return_contract`
7. `parity_critical` (boolean)

Example:

```yaml
- c_name: "findtravelpath"
  js_target: "findtravelpath"
  call_mode: sync
  arg_map:
    - "{0}"
    - "game"
  parity_critical: true
```

Comparator translation note:

1. C `qsort(base, n, size, cmp)` callsites that sort JS arrays must translate to `base.sort(cmp)`.
2. Comparator functions such as `cond_cmp`/`menualpha_cmp` are emitted with JS `Array.sort` semantics: comparator args are elements, not C pointers.

## 5) `boundary_calls.yml`
Declares known async/display/input boundaries and exact handling.

Purpose:

1. Prevent accidental async drift.
2. Guarantee translator inserts `await` only where specified.
3. Preserve headless fast-mode semantics.

Fields:

1. `boundary`
2. `c_call`
3. `js_call`
4. `mode`:
   1. `sync_boundary`
   2. `awaited_boundary`
   3. `nowait_boundary`
   4. `headless_skip`
5. `conditions`
6. `ordering_constraints` (before/after specific call classes)

Example:

```yaml
- boundary: delay_output
  c_call: "nh_delay_output"
  js_call: "nh_delay_output"
  mode: awaited_boundary
  conditions:
    interactive_only: true
    headless_behavior: "skip_real_delay_keep_boundary"
```

## 6) `controlflow_patterns.yml`
Pattern-based rewrites for known C constructs that need structured JS output.

Patterns:

1. `goto_label_block`
2. `do_while_retry`
3. `switch_fallthrough`
4. `early_return_guard`
5. `multi_assign_with_side_effects`

Fields:

1. `pattern_id`
2. `match`
3. `transform`
4. `safety_checks`
5. `emit_comment_on_apply`

Example:

```yaml
- pattern_id: switch_fallthrough
  match: "switch_case_with_FALLTHROUGH_macro"
  transform: "emit_js_fallthrough_comment"
  safety_checks:
    - "no_intervening_side_effect_reorder"
```

## 7) `type_hints.yml`
Optional hints to improve emitted readability and avoid accidental coercion drift.

Fields:

1. `c_symbol`
2. `hint_kind` (`boolean`, `coord`, `enum`, `bitmask`, `ptr_optional`)
3. `js_emit_policy`
4. `narrowing_rules`

## 8) `file_overrides/*.yml`
Per-file or per-function override packs for highly specific semantics.

Examples:

1. `hack.c.yml`
2. `monmove.c.yml`
3. `uhitm.c.yml`
4. `display.c.yml`

Override capabilities:

1. Replace rule precedence for a scope.
2. Inject custom transform hooks.
3. Mark constructs as `manual_required`.
4. Add post-emit patch templates.

## 9) `file_policy.json` (mandatory coverage manifest)
Defines translation policy for every JS file under `js/`.

Policy enum:

1. `manual_only` — translator must never modify file.
2. `mixed` — translator may modify only annotation-approved functions/regions.
3. `auto` — translator may target file using standard rules.
4. `generated_data` — translator must never modify; regenerated from source data/tools.

Required fields:

1. `path`
2. `policy`
3. `reason`
4. for `mixed`:
   1. `allow_source` (`annotations` or `manifest`)
   2. optional `allow_functions` (only when `allow_source=manifest`)
   3. optional `deny_functions`

Hard rule:

1. CI fails if any `js/*.js` file lacks exactly one policy entry.
2. For `mixed`, CI fails if `allow_source` is missing.

## Rule Resolution and Precedence

Deterministic precedence (highest first):

1. `file_overrides`
2. `boundary_calls`
3. `function_map`
4. `state_paths`
5. `macro_semantics`
6. `controlflow_patterns`
7. defaults

Conflict behavior:

1. In `strict_mode`, unresolved conflicts fail translation.
2. No silent fallback for parity-critical symbols.
3. Conflict report must include source spans and candidate rules.

## Intermediate Representation (NIR) Requirements

NIR must preserve:

1. Statement order.
2. Condition short-circuit structure.
3. Call boundaries and potential side effects.
4. Source span mapping (file, line, column).
5. Symbol table with original names.

NIR node minimum fields:

1. `kind`
2. `span`
3. `children`
4. `effects` (`pure`, `read`, `write`, `call`, `unknown`)
5. `symbol_refs`
6. `annotations`

## Translation Pass Plan

Pass 0: Parse and symbol index

1. Parse C file.
2. Extract function bodies and local symbol metadata.

Pass 1: Canonical path rewrite

1. Apply `state_paths`.
2. Annotate unresolved global references.

Pass 2: Macro expansion rewrite

1. Apply `macro_semantics`.
2. Mark unsupported macros with hard diagnostics or TODO stubs per policy.

Pass 3: Function call rewrite

1. Apply `function_map`.
2. Insert injected context args.

Pass 4: Boundary and async shaping

1. Apply `boundary_calls`.
2. Determine function async signature upgrades.

Pass 5: Control-flow normalization

1. Apply `controlflow_patterns`.
2. Convert gotos/retries to structured JS patterns or explicit manual-required markers.

Pass 6: Emitter prep

1. Normalize variable declarations.
2. Insert minimal comments where transformation is non-obvious.

Pass 7: JS emit

1. Emit module code.
2. Emit metadata sidecar.

Pass 8: Post-emit validation

1. Static checks.
2. Idempotence check.
3. Optional targeted test run.

## Output Artifacts

For each translated function/file:

1. JS output file or patch snippet.
2. Metadata sidecar (`.translate.meta.json`):
   1. source hash
   2. ruleset version
   3. applied rules list
   4. unresolved items
   5. risk score
3. Diagnostics report (`.translate.diag.jsonl`).

## Translation Coverage Policy (Complete)

This section defines **complete coverage semantics** so no files are "implicitly forgotten."

Completeness mechanism:

1. Inventory source: `find js -maxdepth 1 -name '*.js'`.
2. Every file must be present in `file_policy.json`.
3. CI check fails for:
   1. missing file policy entries
   2. extra stale entries
   3. invalid policy transitions (for example `manual_only -> auto` without review tag).

## Initial policy baseline

### A) `manual_only` (JS runtime/infrastructure glue; no direct C gameplay analogue)

1. `js/nethack.js`
2. `js/browser_input.js`
3. `js/headless.js`
4. `js/storage.js`
5. `js/replay_core.js`
6. `js/options_menu.js`
7. `js/keylog.js`
8. `js/input.js`
9. `js/const.js`
10. `js/iactions.js`
11. `js/discovery.js`
12. `js/floor_objects.js`
13. `js/display_rng.js`
14. `js/xoshiro256.js`

### B) `generated_data` (auto-generated or data-table-heavy files)

1. `js/objects.js`
2. `js/monsters.js`
3. `js/artifacts.js`
4. `js/rumor_data.js`
5. `js/engrave_data.js`
6. `js/epitaph_data.js`
7. `js/animation_examples.js`

### C) `mixed` (core semantics partly translatable, boundary regions manual)

1. `js/allmain.js`
2. `js/cmd.js`
3. `js/display.js`
4. `js/getpos.js`
5. `js/animation.js`
6. `js/delay.js`
7. `js/chargen.js`

`mixed` handling requirements:

1. Prefer `allow_source: annotations` and derive allowlist from in-code markers.
2. Optional denylist for manual boundary functions.
3. Translator must reject edits outside annotation-approved spans/functions.

### D) `auto` (default for remaining C-mapped gameplay modules)

Any `js/*.js` not in A/B/C is `auto` by default **only if explicitly listed in `file_policy.json`**.  
Practically, this includes gameplay files mapped in `docs/CODEMATCH.md` (examples: `hack.js`, `mon.js`, `monmove.js`, `uhitm.js`, `mhitu.js`, `mhitm.js`, `trap.js`, `zap.js`, `dungeon.js`, `makemon.js`, `u_init.js`, `mkroom.js`, etc.).

## Mixed-file boundary maintenance

For each `mixed` file:

1. Maintain in-code markers as source of truth:
   1. `// Autotranslated from <file>.c:<line>` on function declarations to allow translation.
   2. `// TRANSLATOR: MANUAL` on functions or blocks to deny translation.
2. Maintain optional region guards:
   1. `TRANSLATOR: MANUAL-BEGIN <id>`
   2. `TRANSLATOR: MANUAL-END <id>`
3. Require translator to emit a "blocked edits" report when proposed edits overlap manual regions.
4. Optional fallback for non-annotated legacy files: `allow_source: manifest` with `allow_functions`.

## Annotation enforcement (required)

Mixed-file policy is enforced by CI tooling, not documentation alone.

Required checks:

1. `translator:file-policy-check`:
   1. verifies full `js/*.js` coverage in `file_policy.json`,
   2. enforces `allow_source` on every `mixed` entry,
   3. enforces `allow_functions` when `allow_source=manifest`.
2. `translator:check-annotations`:
   1. for `allow_source=annotations`, verifies presence of `Autotranslated from <file>.c:<line>` or approved-region markers,
   2. verifies `TRANSLATOR: MANUAL-BEGIN/END` markers are balanced and non-overlapping,
   3. fails if proposed edits touch unapproved regions.
3. Apply-mode translator run must emit `blocked-edits.json`; CI fails when non-empty.

Gate requirement:

1. Translator Alpha cannot merge until both checks are green in CI.

## File policy drift control

Add CI job `translator:file-policy-check`:

1. Regenerate JS file inventory.
2. Compare against `file_policy.json`.
3. Fail on mismatch.
4. Print categorized diff:
   1. unclassified files
   2. removed files with stale policy
   3. policy-changed files requiring reviewer approval.

## Governance for policy changes

Policy changes require:

1. reason update in `file_policy.json`.
2. translator regression test updates for affected files.
3. targeted parity smoke run on impacted sessions.

## Risk Scoring and Manual Review Routing

Per-function risk score based on:

1. Unsupported macro count.
2. Goto/controlflow complexity.
3. Number of boundary calls.
4. Number of unresolved symbols.
5. Parity-critical tag in `function_map`.

Routing policy:

1. Low risk: auto-apply patch candidate.
2. Medium risk: apply to branch with required reviewer acknowledgment.
3. High risk: emit scaffold + TODO markers, no auto-apply.

## Boundary Semantics Catalog (Required Initial Entries)

Minimum required initial catalog:

1. Display and animation:
   1. `tmp_at`
   2. `nh_delay_output`
   3. `nh_delay_output_nowait`
   4. `newsym`, `vision_recalc`, display refresh helpers
2. Input and prompt:
   1. yes/no prompt functions
   2. `getpos` flows
3. Turn and occupation boundaries:
   1. `stop_occupation`
   2. `nomul`, `unmul`
4. Movement/combat parity boundaries:
   1. `do_attack` and caller sequencing constraints.

## Macro Semantics Catalog (Required Initial Entries)

Minimum required initial macro groups:

1. Terrain predicates (`IS_*`, `ACCESSIBLE`, etc.).
2. Hero condition flags (`Blind`, `Confusion`, `Stunned`, etc.).
3. Bitmask helpers and tests.
4. Fallthrough and compiler-annotation macros.
5. Pointer/null convenience macros.

Each entry must declare:

1. Purity expectation.
2. Read dependencies.
3. Whether expansion depends on canonical `game` paths.

## State Mapping Catalog (Required Initial Entries)

Minimum initial path mappings:

1. `u.* -> game.u.*`
2. `flags.* -> game.flags.*`
3. `iflags.* -> game.iflags.*`
4. `svc.context.* -> game.svc.context.*`
5. `gd.* -> game.gd.*`
6. `gm.* -> game.gm.*`
7. `gn.* -> game.gn.*`
8. level map/trap/object/monster roots to `game.lev.*`

## Validation and Quality Gates

## Static gates

1. No writes to deprecated mirror fields in translated output.
2. No unresolved parity-critical symbols.
3. No unknown boundary calls in strict mode.

## Dynamic gates

1. Unit tests (`npm run -s test:unit`).
2. Session smoke list (translator-targeted seeds/functions).
3. Full gameplay parity sweep before broad merge.

## Idempotence gate

1. Translating already-translated output should produce no semantic diff (or known formatting-only diff).

## Tool CLI Specification

Example CLI:

```bash
python tools/c_translator/main.py \
  --src nethack-c/src/hack.c \
  --func domove_core \
  --rules tools/c_translator/rulesets \
  --emit patch \
  --out /tmp/hack_domove_core.patch \
  --strict
```

Required options:

1. `--src`
2. `--rules`
3. one of `--func`, `--file`
4. `--emit` (`js|patch|scaffold`)

Optional options:

1. `--strict/--no-strict`
2. `--dry-run`
3. `--risk-threshold`
4. `--report`
5. `--apply`

## Rule Authoring Conventions

1. One semantic concept per rule id.
2. Stable ids (no reuse with changed meaning).
3. Include rationale and source references for parity-critical rules.
4. Every rule change requires:
   1. schema validation pass
   2. targeted translator regression test
   3. changelog entry in ruleset metadata.

## Translator Regression Test Plan

Add tests under `test/unit/translator/`:

1. Rule loader schema tests.
2. Macro expansion snapshot tests.
3. Function mapping injection tests.
4. Boundary async insertion tests.
5. Control-flow pattern conversion tests.
6. Idempotence tests for representative translated functions.

## Rollout Strategy

Milestone alignment:

1. Translator rollout aligns to [IRON_PARITY_PLAN.md](/share/u/davidbau/git/mazesofmenace/game/docs/IRON_PARITY_PLAN.md) milestones `M3` to `M6`.
2. Any phase/gate change here must preserve umbrella milestone IDs and exits.

Phase A: Infrastructure

1. Implement parser + NIR + rule loader + emitter skeleton.
2. Land schemas and empty rule tables.

Phase B: Safe subset

1. Translate pure helper functions only.
2. Verify zero regressions.

Phase C: Core movement pilot

1. Pilot `hack.c` selected functions with high reviewer scrutiny.
2. Use file overrides heavily.

Phase D: Combat and monmove

1. Expand to `uhitm.c`, `monmove.c`, `mon.c` targeted subsets.

Phase E: Broadening

1. Add more C files as state model stabilizes.

## M3 Execution Backlog (Parser/Emitter Explicit)

This backlog is the concrete translation-infrastructure schedule for M3.

1. `A1` Frontend bootstrap:
   1. load TU with compile profile,
   2. capture AST spans,
   3. emit minimal parse report.
2. `A2` Macro provenance layer:
   1. Source/PP token crosswalk,
   2. macro invocation/expansion records.
3. `A3` NIR builder:
   1. function-level node graph,
   2. deterministic JSON snapshot output.
4. `A4` Rule/schema validation:
   1. schema definitions for all ruleset files,
   2. strict loader diagnostics.
5. `A5` Pass engine wiring:
   1. state-path pass,
   2. macro pass,
   3. function-map pass,
   4. boundary/controlflow pass.
6. `A6` Backend emitter:
   1. JS AST printer (or structured emitter),
   2. stable formatting guarantees,
   3. metadata/diagnostic sidecars.
7. `A7` CLI integration:
   1. `main.py` entry with `--src/--func/--emit`,
   2. patch/scaffold output modes.
8. `A8` Verification gates:
   1. static unresolved-symbol checks,
   2. policy-boundary checks,
   3. idempotence check.
9. `A9` Safe-subset pilot:
   1. helper-function translation,
   2. non-regressing parity smoke.

Required order:

1. `A1 -> A2 -> A3`
2. `A4` in parallel with `A2/A3`
3. `A5` after `A3` and `A4`
4. `A6` after `A3`
5. `A7` after `A5` and `A6`
6. `A8` after `A7`
7. `A9` after `A8`

## Failure Modes and Mitigations

1. Macro mis-modeling causes silent semantic drift.
   1. Mitigation: strict unresolved policy and parity-critical macro tests.
2. Async boundary insertion drifts order.
   1. Mitigation: boundary table required for any async-aware symbol.
3. State path mapping stale after refactors.
   1. Mitigation: ruleset version pinning to commit range and CI guard.
4. Over-aggressive auto-apply breaks behavior.
   1. Mitigation: risk scoring + manual-required mode for high-risk functions.

## Change Management

When canonical state model changes:

1. Update `state_paths.yml`.
2. Bump ruleset version.
3. Re-run translator regression suite.
4. Re-baseline smoke parity seeds.

## Documentation Links

1. State architecture: [STRUCTURES.md](/share/u/davidbau/git/mazesofmenace/game/docs/STRUCTURES.md)
2. Port coverage: [CODEMATCH.md](/share/u/davidbau/git/mazesofmenace/game/docs/CODEMATCH.md)
3. Parity debugging: [RNG_ALIGNMENT_GUIDE.md](/share/u/davidbau/git/mazesofmenace/game/docs/RNG_ALIGNMENT_GUIDE.md)
4. Learnings: [LORE.md](/share/u/davidbau/git/mazesofmenace/game/docs/LORE.md)
5. Parser strategy: [C_TRANSLATOR_PARSER_IMPLEMENTATION_SPEC.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_TRANSLATOR_PARSER_IMPLEMENTATION_SPEC.md)

## Definition of Done for Translator v1

Translator v1 is complete when:

1. Rule schemas and loader are stable.
2. Deterministic translation pipeline exists with diagnostics.
3. Safe subset translation is production-usable.
4. At least one parity-critical file (`hack.c` subset) is translated using rules + overrides with no parity regression.
5. CI gates enforce schema validity and translator regression tests.
