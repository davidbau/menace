# Failing Sessions: Verified Conclusions

> Track what is PROVEN vs HYPOTHESIZED to avoid going in circles.
> Each conclusion must cite the specific evidence that established it.

## Session Status (March 18, 2026 — 431/436 passing)

| Session | Status | Root Cause Category |
|---------|--------|-------------------|
| hi10_seed1090 | FIXED (session 24) | Trailing RNG tolerance + getobj prompt wrapping |
| t11_s755 | FAILING | Monster position divergence (screen-only) |
| seed031 | FAILING | Monster movement code path differences |
| seed032 | FAILING | Monster movement code path differences |
| seed033 | FAILING | Monster movement code path differences |
| seed301_archeologist | FAILING | Monster movement + level gen cascade |

---

## PROVEN FACTS

### 1. Level generation for depth 1 is CORRECT
- **Evidence**: seed031's first 10,145 normalized RNG calls match exactly.
  Level 1 generation consumes ~6,390 RNG entries, all within the matching prefix.
- **Implication**: The `create_room`, `rnd_rect`, `mineralize` shifts shown in the
  shift analysis are from LATER level generation (when player descends), not from
  the initial level. They are a CONSEQUENCE of earlier RNG drift, not a cause.
- **Date verified**: March 18, 2026 (session 24)

### 2. The exerchk moves counter is NOT off-by-one
- **Evidence**: Changing `turnCount + 1` to `turnCount` in the exerchk call
  regressed 170 sessions (431 → 261). The `+1` is correct for JS's counting.
- **Implication**: Do not attempt to fix the exerchk moves argument again.
- **Date verified**: March 18, 2026 (session 24)

### 3. The game loop ordering (player-first vs monsters-first) is NOT the cause
- **Evidence**: Both JS and C produce identical flat RNG sequences for the first
  10,145 calls. If ordering differed, calls would be at different positions from
  the start. The full deferral approach (moving moveloop_core to start of next
  cycle) regressed 430 → 157 sessions.
- **Implication**: Do not attempt game loop reordering again. The current
  `[player acts] → [moveloop_core]` ordering matches C's effective flat sequence.
- **Date verified**: March 18, 2026 (session 24)

### 4. Monster movement code paths diverge after ~10K matching RNG calls
- **Evidence**: The shift-aware RNG comparator shows:
  - seed031: 4,024 JS-extra dochug calls, 48,892 C-extra calls (obj_resists,
    distfleeck, dog_move, m_move, mcalcmove, etc.)
  - seed032: First divergence at index 5333 (dochug vs dog_move)
  - seed033: First divergence at index 3392 (moveloop_core vs exercise)
  - t11_s755: 35 JS-extra dochug, 35 C-extra (m_move, distfleeck, m_throw)
- **Implication**: The divergence comes from monster movement code that consumes
  different numbers of RNG calls. Once the flat RNG shifts, everything downstream
  diverges (exercise timing, level gen for deeper levels, etc.).
- **Date verified**: March 18, 2026 (session 24)

### 5. t11_s755 has 100% RNG match but screen-only divergence
- **Evidence**: 26,517/26,517 RNG match. 7,287/7,287 events match.
  Only 3 screen mismatches (steps 1787-1789) showing Gnome at col 22 vs 23.
  The 35+35 shifts are balanced (net zero) — same total calls, different attribution.
- **Implication**: The Gnome position difference comes from a non-RNG decision
  in monster movement (mfndpos candidate ordering or m_move position selection
  with same RNG values but different candidate lists).
- **Date verified**: March 18, 2026 (session 24)

### 6. seed301_archeologist diverges at step 7 (pet AI)
- **Evidence**: First event divergence shows `dog_goal_obj` with `rn2_8=7` (JS)
  vs `rn2_8=4` (C) at step 7. The RNG state is already different at this point.
  Shift analysis shows 5K C-extra level gen calls + 3K monster AI calls.
- **Implication**: seed301's RNG diverges very early, probably from level 1's
  monster placement or initial monster movement. This is the same class of
  issue as seed031 but manifests earlier.
- **Date verified**: March 18, 2026 (session 24)

---

## HYPOTHESES (unverified)

### H1: JS reaches distfleeck for monsters that C doesn't
- **Reasoning**: 4,024 JS-extra dochug(rn2(5)) calls means JS processes more
  monsters through distfleeck. This could be because:
  (a) JS has more monsters alive (different monster death/removal),
  (b) JS doesn't have an early return that C has (covetous/tactics, conflict),
  (c) JS's monster iteration order differs (different monsters processed per turn).
- **Status**: NOT YET VERIFIED. Need to identify specific monster at first shift.

### H2: C makes obj_resists calls that JS doesn't
- **Reasoning**: 7,847 C-extra obj_resists(zap.c) calls in seed031. This function
  is called when objects are exposed to effects (fire, cold, etc.). JS may be
  missing obj_resists calls in monster zap/attack processing.
- **Status**: NOT YET VERIFIED. Need to check if JS's zap/attack code calls
  obj_resists in the same places as C.

### H3: C's dog_move makes more RNG calls than JS's
- **Reasoning**: 5,411 C-extra dog_move calls in seed031. JS's dogmove.js may
  be missing code paths that C's dogmove.c has (object evaluation, food seeking,
  etc.).
- **Status**: NOT YET VERIFIED. Need line-by-line dogmove comparison.

### H4: mfndpos candidate filtering causes t11_s755 Gnome position
- **Reasoning**: mfndpos returns same count but different candidates. The iteration
  order is the same (column-major), so filtering conditions must differ.
- **Status**: PARTIALLY VERIFIED. Several mfndpos filtering differences were found
  and fixed (garlic/boulder marking, trap logic, onscary displacement, ALLOW_MDISP,
  mm_aggression). None fixed t11_s755 because the Gnome isn't near those features.
  The remaining difference must be in a more common condition.

---

## DISPROVEN HYPOTHESES

### D1: Game loop ordering causes the divergence
- **Disproven by**: First 10,145 calls matching exactly. If ordering differed,
  divergence would appear from the first timed command.
- **Date disproven**: March 18, 2026 ~17:00 UTC

### D2: Level generation code is wrong for depth 1
- **Disproven by**: Level 1 RNG (6,390 entries) is within the matching prefix.
- **Date disproven**: March 18, 2026 ~17:00 UTC

### D3: exerchk moves counter is off by one
- **Disproven by**: Changing it regresses 170 sessions.
- **Date disproven**: March 18, 2026 ~17:00 UTC

---

## FIXES APPLIED (session 24)

1. Exercise unification (attrib_exercise.js with encumber_msg) — no session impact
2. Symmetric trailing RNG tolerance — fixed hi10 RNG
3. Getobj prompt character-boundary wrapping — fixed hi10 screen → hi10 PASSES
4. mfndpos garlic/boulder info marking — correct parity, no session impact
5. mfndpos trap logic (fixed_tele_trap, else-if, invalid trap) — correct parity
6. mfndpos onscary displacement + ALLOW_SSM + monseeu — correct parity
7. mfndpos ALLOW_MDISP + mm_aggression integration — correct parity
8. rnl composite entry filter — comparison accuracy improvement

## DISPROVEN: nh_timeout missing peffect_healing (disproven March 18, 2026 ~19:00 UTC)

Initially hypothesized that C's nh_timeout calls peffect_healing but JS doesn't.
**DISPROVEN**: The `d(4,4)=6 @ peffect_healing` in the C trace is from the player
QUAFFING a healing potion (step 166, key="n" = select potion "n" to drink), NOT
from nh_timeout. JS's peffect_healing already uses `c_d(4,4)` which matches C's
composite logging. Both produce the same RNG consumption.

The peffect_healing call happens to appear at the START of C's step 166 because
the potion selection is the first action in that step. It's a normal gameplay
action, not a timeout effect.

## NEW FINDING: Exercise works but fails at ONE specific turn (March 18, ~19:30 UTC)

The single-step replay tool shows JS=(end) for step 166, but this is misleading —
single-step isolation doesn't reproduce the full game state. The FULL replay
DOES produce matching RNG for exercise (the first 10145 entries match, including
exercise calls at earlier turns).

**Conclusion**: JS's exercise/exerchk/exerper work correctly for most turns. At ONE
specific turn (around turn 80 = C step 166), C calls exercise but JS doesn't.
This is NOT a "never called" bug — it's a per-turn condition difference.

**Most likely cause**: `exerper` checks `moves % 5 == 0` and `moves % 10 == 0`.
If at this specific turn, C's `svm.moves` is a multiple of 5 but JS's equivalent
isn't (or vice versa), the exercise calls fire in one but not the other. However,
changing the moves argument regresses 170 sessions, so the moves value IS correct
in aggregate. The difference must be from a SINGLE turn where the counter diverges
due to an earlier timing difference.

## Debugging Principle

When adding instrumentation and getting unexpected results (e.g., "0 calls"),
consider whether the instrumentation itself is wrong before concluding the code
is broken. Specifically:
- Module isolation: test runners may use different module instances
- RNG log lifecycle: enableRngLog/disableRngLog scoping
- Single-step tools: warn about isolation for a reason
- Freshly written diagnostic code is MORE suspect than tested production code

## PROVEN: JS turn counter is 1 behind C at divergence (March 18, ~20:00 UTC)

Using `^exerper` diagnostic injected into the RNG log (which IS captured by the
replay), confirmed that JS's `moves` values near the divergence are 137, 138, 139.
None are multiples of 5, so exerper doesn't call exercise.

C's exercise calls fire at this turn, meaning C's `svm.moves` is 140 (140 % 5 = 0).

**JS moves = 139, C moves = 140** at the same game point. JS is 1 turn behind.

This is NOT the `turnCount + 1` offset (that was confirmed correct for most sessions).
This is a SINGLE missed turn increment somewhere in the first 139 turns. One turn
was processed without incrementing the counter, or one counter increment happened
without processing a turn.

## NEXT STEPS (prioritized)

1. **Find where the turn count diverges**: JS has 138 turns, C has 139, at the same
   game point. One turn was skipped in JS. Most likely cause: when `u_calc_moveamt`
   gives double speed (Very_fast rn2(3)), `umovement = 24` after turnend. Next
   `moveloop_core` enters with `umovement = 24`, subtracts 12 → 12. The inner
   `movemon` loop breaks when `umovement >= NORMAL_SPEED`. Then the outer
   condition `umovement < NORMAL_SPEED` is false (12 >= 12), so `moveloop_turnend`
   is SKIPPED — no turnCount increment, no gethungry, no exerchk. BUT C might
   still process the turn-end in this case. Need to verify C's behavior when
   `u.umovement >= NORMAL_SPEED` after the inner loop.
   Check if C's nh_timeout calls other potion effects too (peffect_healing,
   peffect_extra_healing, etc.). Implement the same in JS.

2. **Check obj_resists calls**: Does JS's zap/attack code call obj_resists in the
   same places as C? The 7,847 missing calls suggest a systematic gap.

3. **Compare dogmove.js vs dogmove.c**: Line-by-line comparison to find missing
   RNG-consuming code paths in pet AI.
