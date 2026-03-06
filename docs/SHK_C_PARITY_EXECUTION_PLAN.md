# `shk.c` Full Parity Execution Plan

Goal: port `nethack-c/patched/src/shk.c` behavior to `js/shk.js` with branch-by-branch fidelity, no comparator masking, and no gameplay regressions.

## Scope and Success Criteria

1. Every gameplay-relevant `shk.c` function is present and wired in JS.
2. For each function, all major control-flow branches match C structure and side effects.
3. No `UNIMPLEMENTED_TRANSLATED_FUNCTION`, "Stub:", or placeholder behavior remains in executed shop flows.
4. Session parity remains at least baseline while changes land incrementally.
5. `shk`-touching regressions are blocked before merge.

## Baseline Snapshot (2026-03-06)

1. Session parity: `26/34` (8 known failures, primarily `dochug` cluster; no current `shk`-specific regression signal in top failures).
2. Name coverage audit: all `shk.c` functions represented in `js/shk.js` except `sasc_bug` (`#ifdef __SASC` only).
3. Functional fidelity is incomplete: many flows in `shk.js` are simplified/approximate relative to C.

## Workstreams

### Phase A: Structural Inventory and Guardrails

1. Maintain a machine-generated gap report from `shk.c` -> `shk.js`:
   - missing functions
   - placeholder bodies
   - "Stub:" markers
2. Keep this report updated as code changes land.
3. Require that each touched function references the C source section in comments.

### Phase B: Movement and Damage Repair (high leverage, low UI risk)

Functions:
1. `shk_move`
2. `after_shk_move`
3. `find_damage`
4. `discard_damage_struct`
5. `discard_damage_owned_by`
6. `shk_fixes_damage`
7. `fix_shop_damage`

Acceptance:
1. Branch ordering and return codes match C (`1/0/-1/-2` semantics).
2. Damage-list ownership and pruning logic match shop-room ownership rules.
3. No regression in `monmove` unit tests.

### Phase C: Billing Core and Object Lookup

Functions:
1. `sortbill_cmp`
2. `find_oid`
3. `bp_to_obj`
4. `add_to_billobjs`
5. `update_bill`
6. `splitbill`
7. `subfrombill`, `addtobill`, `add_one_tobill`

Acceptance:
1. `ibill` ordering and tie-break behavior match C.
2. All list lookups follow C list precedence.
3. No broken bill references after object splits/merges.

### Phase D: Ownership / Naming / Messaging

Functions:
1. `append_honorific`
2. `shk_your`, `Shk_Your`
3. `shk_owns`
4. `mon_owns`
5. `shk_embellish`
6. `price_quote`, `shk_chat`

Acceptance:
1. Ownership prefix behavior matches C conditions.
2. Name-format paths behave correctly for unique/PNAME corpses and carried/floor/minvent objects.

### Phase E: Transactions and Payment Flow

Functions:
1. `dopay`
2. `sellobj_state`, `sellobj`
3. `check_credit`, `pay`, `paybill`
4. `check_unpaid`, `check_unpaid_usage`, `cost_per_charge`
5. `shopper_financial_report`

Acceptance:
1. C branch behavior for debt/credit/no-shopkeeper/itemized payment is preserved.
2. No synthetic behavior is added outside C logic.

### Phase F: Destructive/Edge Shop Interactions

Functions:
1. `shopdig`
2. `pay_for_damage`
3. `block_door`, `block_entry`
4. `shkcatch`
5. `remote_burglary`
6. `globby_bill_fixup`

Acceptance:
1. Damage/debt side effects align with C for shop-owned terrain/object cases.
2. Door blocking and pursuit behavior matches C conditions.

## Execution Order

1. Phase A (audit infra and checklist)
2. Phase B
3. Phase C
4. Phase D
5. Phase E
6. Phase F

## Validation Gates Per Commit

1. Unit tests:
   - `test/unit/monmove.test.js`
   - `test/unit/shopkeeper_door_blocking.test.js`
   - `test/unit/command_shop_entry_messages.test.js`
   - `test/unit/shknam.test.js`
2. Browser safety gate:
   - `npm run -s audit:browser-safety`
3. Session gate:
   - `scripts/run-and-report.sh`
4. Divergence inspection for any new drift touching shop paths:
   - `node test/comparison/rng_step_diff.js <session> --step <N> --window 8`

## Non-Negotiables

1. No comparator masking for shop divergences.
2. No replay compensation/injection to hide shop behavior differences.
3. Fix JS core logic; do not "paper over" with harness exceptions.

