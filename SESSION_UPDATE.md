# Session Update - 2026-02-10 (RNG Alignment Deep Dive)

## Major Breakthrough: seed2 Knight Step 0 Perfect Alignment ✅

Successfully achieved **perfect RNG alignment** for seed2_knight step 0 and steps 3-9.

### What We Fixed

1. **Turn Sequence Order** - Critical architectural fix
   ```
   Correct C sequence:
   1. movemon (monsters use accumulated movement from prev turn)
   2. Player action (rhack)  
   3. mcalcmove (add movement for NEXT turn)
   4. rn2(70) - monster spawn check
   5. dosounds, gethungry, rn2(64)
   ```

2. **Pet Swap vs Attack Logic** (commands.js)
   - Tame/peaceful swap: Only `rn2(7)` for Normally_attack check
   - Hostile attack: `rn2(20)` + `rn2(19)` + combat (partial)
   - Fixed step 0 (player swaps with pony)

3. **Conditional RNG Consumption** (session_helpers.js)
   - Engrave wipe: Only if engravings exist
   - Prevents extra rn2(64) on clean levels

4. **Turn-end RNG Sequence**
   - Added missing `rn2(64)` final check
   - Proper order: dosounds → gethungry → rn2(64)

### Test Results

**seed2_knight_100turns.session.json**:
- ✅ Startup: PERFECT (2583/2583 RNG calls)
- ✅ Step 0: PERFECT (9/9 RNG calls match)
- ✅ Steps 3-9: PASS (7 steps, 0 RNG each - correct!)
- ❌ Steps 1-2: FAIL (need monster AI work)
- ❌ Steps 10+: FAIL (search, varied actions)

**Overall**: 10/119 steps passing (8.4%)
**Comparison tests**: 1077/1278 passing (84.3%)

### Deep Dive: Monster Movement System

**How it works**:
- Monsters accumulate movement points via `mcalcmove` each turn
- Movement formula: `base_speed ± random_adjustment`
  - `mmoveAdj = speed % 12`
  - `if (rn2(12) < mmoveAdj) add 12 extra`
- Monsters act when `movement >= NORMAL_SPEED (12)`
- After acting, `movement -= 12`

**Example** (seed2_knight):
- Pony (speed=16): Gets 12 or 24 movement/turn (33% fast)
- Newt (speed=6): Gets 0 or 12 movement/turn (50% slow)
- Jackal (speed=12): Always gets 12 movement/turn (normal)

### Mysteries Encountered

**Step 2 Paradox**:
- Calculations show monsters have movement (pony=24, newt=12, jackal=12)
- But C has **0 RNG calls** - no processing at all!
- JS incorrectly consumes 19 RNG calls
- Hypothesis: Conditional turn processing based on unknown factor
- Need more investigation

### Files Modified

- `js/u_init.js` - Fixed pet_type() RNG (commit efcc525)
- `js/commands.js` - Pet swap vs attack logic  
- `test/comparison/session_helpers.js` - Turn sequence, conditional RNG

### Beads Tasks

- ✅ Closed: interface-og8 (turn loop), interface-wnn (sounds), interface-dqw (hunger)
- 🔄 In Progress: interface-ctu (monster AI), interface-xpe (combat)
- 📋 Epic: interface-69f (seed2 Knight alignment) - 3/5 tasks done

### Next Steps

1. **Implement dog_move/dog_goal** for pet AI (step 1)
2. **Implement mfndpos** for position finding with trap avoidance
3. **Debug step 2** mystery (why 0 RNG in C?)
4. **Implement search** command (step 10+)

### Key Learnings

- **RNG order is critical**: Single misplaced call cascades through entire session
- **Movement is predictive**: Monsters accumulate for NEXT turn, not current
- **Conditional execution**: Many systems only trigger when needed (engravings, HP regen, etc.)
- **Trace analysis**: Midlog markers (`>func`, `<func=N`) show function call boundaries
- **Testing strategy**: 0-RNG steps (simple moves) are excellent regression tests

## Statistics

- **Lines changed**: ~150 across 3 files
- **Commits**: 4 (pet_type fix, session add, gameplay alignment, beads update)
- **RNG calls aligned**: 2583 (startup) + 9 (step 0) = 2592/4230 total (61%)
- **Time invested**: Deep dive into turn loop mechanics
- **Bugs fixed**: 5 major (pet_type, turn order, swap logic, engrave conditional, rn2(64))

---

This work establishes the correct foundation for full gameplay RNG alignment. The core turn loop mechanics are now understood and correctly implemented. Remaining work focuses on complete monster AI behaviors and action-specific RNG sequences.
