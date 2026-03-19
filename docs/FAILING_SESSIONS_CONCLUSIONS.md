# Failing Sessions: Verified Conclusions

> Track what is PROVEN vs HYPOTHESIZED to avoid going in circles.
> Each conclusion must cite the specific evidence that established it.
> Self-assess calibration: am I raising alarms that are warranted?

## Session Status (March 18, 2026 — 432/436 passing)

| Session | Status | Root Cause Category |
|---------|--------|-------------------|
| hi10_seed1090 | FIXED (session 24) | Trailing RNG tolerance + getobj prompt wrapping |
| t11_s755 | FIXED (session 24) | sp_lev.js appear_as/mimic fix + mfndpos parity fixes |
| seed031 | FAILING | Turn counter 1 behind C → exercise timing → cascade |
| seed032 | FAILING | Same class as seed031 |
| seed033 | FAILING | Same class as seed031 |
| seed301_archeologist | FAILING | RNG diverges at step 7, same class |

---

## SELF-ASSESSMENT: Am I miscalibrated?

**Yes, partially.** The "70% of turns missing" alarm was misleading. Here's what happened:

1. Diagnostic showed JS has 298 exerper calls, C has 1114 gethungry calls
2. I concluded JS "skips 70% of turns" — a MASSIVE systematic problem
3. But this comparison is apples-to-oranges:
   - The first 298 JS turns produce ~10,145 matching RNG entries
   - After those 298 turns, the RNG diverges at index 10,145
   - After divergence, JS and C are playing DIFFERENT GAMES (different map, monsters, positions)
   - JS continues processing keys, but the game state differs, so commands that C treats
     as timed (successful moves) are untimed in JS (hitting walls, bumping into things
     at different positions)
   - C's remaining 816 turns are from the POST-DIVERGENCE portion where game states differ

**The real issue is the FIRST divergence** at normalized index 10,145 — NOT a systematic
70% failure rate. The 70% gap is a CONSEQUENCE of the initial divergence cascading.

**Lesson**: When comparing totals across an entire session, remember that post-divergence
data is noise. Only the pre-divergence portion reveals root causes. I spent significant
time investigating the "70% gap" when the actual bug is a single 1-turn counter offset.

---

## PROVEN FACTS

### 1. Level generation for depth 1 is CORRECT
- **Evidence**: seed031's first 10,145 normalized RNG calls match exactly.
  Level 1 generation consumes ~6,390 entries, all within the matching prefix.
- **Date verified**: March 18, 2026 (session 24)

### 2. The exerchk moves counter (`turnCount + 1`) is correct for most sessions
- **Evidence**: Changing it regressed 170 sessions (431 → 261).
- **Date verified**: March 18, 2026 (session 24)

### 3. The game loop ordering matches C's effective flat RNG sequence
- **Evidence**: 10,145 matching entries prove identical ordering. Deferral attempt
  regressed 430 → 157 sessions.
- **Date verified**: March 18, 2026 (session 24)

### 4. JS's turn counter is 1 behind C at the divergence point in seed031
- **Evidence**: `^exerper` diagnostic showed JS moves = 137, 138, 139 near the
  divergence. C's exercise fires with svm.moves = 140 (140 % 5 = 0).
  JS moves = 139, C moves = 140 at the same game point.
- **This is the proximate cause of the seed031 divergence.**
- **Date verified**: March 18, 2026 ~20:00 UTC

### 5. The 1-turn gap is NOT from speed bonuses
- **Evidence**: seed031 has 0 u_calc_moveamt rn2(3) calls — no Very_fast.
  The umovement force removal had no effect on seed031.
- **Date verified**: March 18, 2026 ~20:15 UTC

### 6. seed325 (passing) has exact turn count match (182/182)
- **Evidence**: `^exerper` diagnostic on passing session confirms JS and C
  process identical numbers of turns. The diagnostic methodology works.
- **Date verified**: March 18, 2026 ~20:30 UTC

### 7. t11_s755 is screen-only (100% RNG, 100% events)
- **Evidence**: 26,517/26,517 RNG match. 7,287/7,287 events match.
  Gnome at col 22 vs 23 at step 1787. Non-RNG mfndpos candidate difference.
- **Date verified**: March 18, 2026 (session 24)

### 8. The replay processes all keys correctly
- **Evidence**: `pendingCommand=false, inputQueue=0` at replay end.
  All 1351 keys consumed. `run_command` called 613 times.
  The `drainUntilInput` fix regressed seed328 → the existing replay
  infrastructure is NOT the problem.
- **Date verified**: March 18, 2026 ~21:00 UTC

---

## DISPROVEN HYPOTHESES

### D1: Game loop ordering causes the divergence
- **Disproven by**: 10,145 matching entries prove identical ordering.
- **Date disproven**: March 18, 2026 ~17:00 UTC

### D2: Level generation code is wrong for depth 1
- **Disproven by**: Level 1 RNG is within the matching prefix.
- **Date disproven**: March 18, 2026 ~17:00 UTC

### D3: exerchk moves counter is globally off by one
- **Disproven by**: Changing it regresses 170 sessions.
- **Date disproven**: March 18, 2026 ~17:00 UTC

### D4: nh_timeout missing peffect_healing
- **Disproven by**: The d(4,4) in the trace is from player quaffing, not timeout.
  JS already uses c_d correctly.
- **Date disproven**: March 18, 2026 ~19:00 UTC

### D5: drainUntilInput race condition causes 70% turn gap
- **Disproven by**: Replay finishes with inputQueue=0, pendingCommand=false.
  Fix attempt regressed seed328. The 70% gap is a post-divergence artifact,
  not a systematic replay infrastructure failure.
- **Date disproven**: March 18, 2026 ~21:00 UTC

### D6: 70% of turns systematically skipped
- **Disproven by**: The 298 vs 1114 comparison is misleading. The 298 matching
  turns produce ~10,145 matching RNG entries. After that, game states diverge
  and subsequent commands produce different results. It's a CONSEQUENCE of the
  initial 1-turn gap, not a separate systematic problem.
- **Date disproven**: March 18, 2026 ~21:30 UTC (self-assessment)

---

## REMAINING ROOT CAUSE: The 1-turn gap

The actual bug for seed031/032/033 is:
- JS's turn counter is 1 behind C's at the divergence point
- This causes `exerper` to fire at different turns (`moves % 5`)
- The exercise RNG calls shift the flat sequence
- Everything downstream cascades

**Where does the 1-turn gap come from?**
- NOT from speed bonuses (seed031 has none)
- NOT from the moves counter formula (turnCount+1 matches 431 sessions)
- NOT from the replay infrastructure (all keys processed correctly)
- MUST be from a specific game turn where C increments svm.moves
  but JS doesn't increment turnCount

**Most likely sources (unverified)**:
1. An occupation (multi < 0) where C processes an extra turn that JS doesn't
2. A specific command that takes time in C but not in JS
3. Initial svm.moves value (starts at 1 in C, but JS's turnCount+1 should match)

## FIXES APPLIED (session 24)

1. Exercise unification (attrib_exercise.js with encumber_msg) — correct parity
2. Symmetric trailing RNG tolerance — fixed hi10 RNG
3. Getobj prompt character-boundary wrapping — **fixed hi10 → 431/436**
4. mfndpos garlic/boulder info marking — correct parity
5. mfndpos trap logic (fixed_tele_trap, else-if, invalid trap) — correct parity
6. mfndpos onscary displacement + ALLOW_SSM + monseeu — correct parity
7. mfndpos ALLOW_MDISP + mm_aggression integration — correct parity
8. rnl composite entry filter — comparison accuracy
9. umovement force removal — correct parity (neutral for seed031)

## LATE-BREAKING INSIGHT: Matching RNG values don't mean matching function calls (21:45 UTC)

The flat RNG comparison matches on VALUES (e.g., `rn2(20)=6`), not function names.
In the first 10,145 "matching" entries, there are 228 `rn2(20)=X` entries but only
144 are gethungry in C. The other 84 are from other functions.

**If JS has 138 gethungry calls (turns) while C has 144, the flat comparison can still
match** because the shifted function calls happen to produce the same rn2 values.
This means the 1-turn gap (or multi-turn gap) could have existed from the very
beginning of gameplay, and the 10,145 matching entries are coincidental value
matches between shifted sequences.

**Implication**: The "first 10,145 entries match perfectly" doesn't prove the game
states are identical. It only proves the RNG values are the same. The functions
consuming those values could be completely different.

## CORRECTION: Spawn comparison shows turns 1-146 match exactly (22:15 UTC)

Per-turn spawn check values match EXACTLY for turns 1-146. First divergence
at turn 147 (JS spawn=51, C spawn=40). This DISPROVES the "1-turn gap at
turn 140" hypothesis — JS and C are in sync through turn 146. The exercise
calls at turn 140 fire correctly in both.

**The real divergence is between turn 146 and 147** — one specific turn where
monster movement or turn-end processing consumes different RNG calls.

## ROOT CAUSE FOUND: C has more floor objects than JS in pet's range (~22:30-23:00 UTC)

At turn 146, both JS and C have 10 floor objects (confirmed by JS diagnostic and C
place/remove tracking). **But only 1 is in the pet's range [44..54]×[12..20] in JS.**

C's dog_goal loop produces **7 dogfood → obj_resists calls** for this turn. JS produces
**1**. The 6 extra C calls mean C's `fobj` has objects in the pet's range that JS's
`map.objects` doesn't.

**CORRECTION (23:00 UTC)**: My initial "C has 10 floor objects" count was based on
counting JS `^place/^remove` events in what I THOUGHT was C's trace. But C's trace
doesn't have `^place` events — those are JS-only. So I don't actually know C's floor
object count. C could have MORE than 10 floor objects.

**The 6 extra objects in C's fobj could be from:**
- Objects created by C code paths that JS doesn't implement (e.g., monster death
  processing that creates extra items)
- Objects at positions in C that differ from JS (same objects, different locations)
- C's `fobj` including objects that JS's `map.objects` doesn't track (e.g., stacked
  objects, objects in containers on the floor, etc.)

## MAJOR PROGRESS: Divergence moved from index 10145 to 17893 (23:15 UTC)

The sp_lev.js appear_as/mimic fix (other agent) + mfndpos fixes (this session)
pushed seed031's first divergence from norm index 10145 (step ~152) to **17893
(step 407)**. The matching prefix nearly DOUBLED. The earlier analysis about turn
146 and floor objects was based on STALE data from before these fixes.

New divergence: JS=`rnd(2)=2 @ promptDirectionAndThrowItem` vs
C=`rn2(5)=1 @ distfleeck`. JS is in the throw command while C is in monster
movement. This is a completely different bug from the turn-146 issue.

## COMPREHENSIVE SWEEP COMPLETE (March 19, 2026)

Area Parity Sweep of the ENTIRE monster movement pipeline confirmed:
- **dochug**: all 10 RNG calls match between JS and C
- **distfleeck**: both RNG calls match
- **dog_goal**: all 3 RNG calls match
- **dog_move**: all 8 RNG calls match
- **m_move**: position selection loop matches
- **moveloop_turnend**: all RNG calls match
- **mon_allowflags**: all flags match (after fixes)

**The remaining divergences come from accumulated game state differences
(object positions, monster positions) that develop over 100+ turns.** Each
mfndpos or m_move parity fix can push the divergence later but can't
eliminate it without fixing the INITIAL state difference that seeds the
cascade.

**seed301 correction**: JS DOES have gethungry (43 calls, tagged as
moveloop_turnend:466, not as "gethungry"). The earlier "0 gethungry"
finding was a tag-name search error.

## NEXT STEPS

## PROGRESS: seed032 RNG now passes (March 19 ~01:00 UTC)

seed032's RNG channel now passes (rng:3 instead of rng:4). The remaining seed032
failure is screen-only: at step 18, JS shows `+` (closed door, brown) at row 12 col 8,
while C shows empty space. This is a remembered terrain difference — the door glyph
persists in JS's display memory but not in C's, likely from FOV updates during the
run at step 17 ("L" = run east).

Root cause: running/rush display parity — JS remembers seeing a door during the run
that C doesn't, or C clears the memory differently when the cell leaves FOV.

## NEXT STEPS

1. **Fix seed032 screen divergence at step 18**: Investigate FOV/memory handling
   during running. The door at (8, 11) or nearby position is briefly visible during
   the run path and remembered differently in JS vs C.

2. **Investigate new seed031 divergence at step 407**: The throw command in JS consumes
   different RNG than C's monster movement at the same point. This suggests
   JS's fire/throw command path differs from C's, or the step attribution
   puts different code at the same flat position.

2. **Re-run spawn comparison**: The per-turn spawn values may now match through
   a much later turn before diverging.

3. **t11_s755 is FIXED** (432/436 passing).

## DISPROVEN: rnl() RNG logging asymmetry (23:45 UTC)

Initially thought C's rnl logs `rn2(x)` for the initial roll (2 entries) while JS
only logs the luck gate (1 entry). **DISPROVEN by reading C's patched rnd.c**:
C's rnl also calls `RND(x)` (no log) for the initial roll, same as JS.
Both produce 1 rn2 entry (the luck gate) + 1 composite rnl entry.

The RND→rn2 change regressed 44 sessions because it ADDED an extra log entry
that C doesn't have. The revert was correct.

seed301's divergence at `rn2(19) vs rn2(38)` is NOT from rnl logging — it's from
a 1-call offset caused by something else before the kick_door call. Same class
of accumulated code path difference as seed031.

## CONSISTENT PATTERN across all 4 failures (March 19, 00:00 UTC)

All 4 failing sessions show the SAME divergence mechanism:
- Spawn values match for N turns (seed031: 366, seed032: 103, seed033: varies, seed301: varies)
- At turn N+1, C's pet AI (`dog_goal`) evaluates MORE objects via `dogfood → obj_resists`
  than JS does (typically 3-8 extra rn2(100) calls)
- The extra calls shift C's RNG, causing subsequent spawn values to diverge
- Once spawns diverge, everything cascades

**The extra objects in C's pet range are floor objects that exist in C's `fobj` but
not in JS's `map.objects` at the same positions.** Both sides have similar total
floor object counts (~10-28), but the objects are at different positions.

**Root cause**: Objects accumulate position differences over gameplay turns. Each
monster death drops inventory at the monster's position. If a monster is at a slightly
different position in JS vs C (from earlier mfndpos/m_move differences), its dropped
items end up at different floor positions. Over 100+ turns, these position differences
accumulate, eventually placing different numbers of objects in the pet's search range.

**Fix strategy**: Continue improving monster movement parity (mfndpos, m_move, dochug).
Each improvement pushes the divergence later. Eventually, enough parity improvements
will eliminate the accumulated position differences entirely.
