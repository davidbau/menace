# Theme: shops-economy

Status: active; hi15 shop payment route promoted

Reconnaissance workflow:
1. Find a seed/depth with a live shopkeeper from C-grounded checkpoints.
2. Inspect the target checkpoint before recording the real session:

```bash
node test/comparison/shop_checkpoint_debug.js <session> <checkpoint-id> --radius=12
```

3. Use the decoded room/object/monster layout to route the session onto real
   merchandise, trigger debt, payment, damage, and shopkeeper interaction
   branches intentionally.
4. Prefer extending an existing high-yield probe over recording blind new
   sessions when the checkpoint already exposes nearby uncovered branches.

Target codepaths:
- `js/shk.js`
- `js/shknam.js`
- `js/vault.js`
- nearby spillover into inventory/pickup/payment callchains

Session plan:
1. Levelport or otherwise reach a known shop seed/depth with confirmed live
   shopkeeper and floor merchandise.
2. Step onto actual unpaid merchandise and trigger debt.
3. Exercise payment, partial payment, shopkeeper query, and bill-state paths.
4. Add at least one destructive or boundary interaction if parity remains
   stable and it increases branch yield.

Issue links:
- Planning/recording: `#373`
- Parity bring-up: `#373`
- Coverage verification: `#373`

Completion criteria:
1. Sessions recorded and committed.
2. New sessions parity-green.
3. Baseline parity remains green.
4. Coverage delta captured in docs/metrics snapshot and diff.
