# Monster 3 Breakthrough - Complete Analysis

## Executive Summary
After exhaustive RNG trace analysis, I've identified a **third entity** that exists alongside the pet and hostile monster. This entity:
- Uses tame monster AI (dog_move/dog_goal)
- **NEVER receives mcalcmove allocation**
- Appears starting at turn 6
- Is the source of the `obj_resists` call at turn 22 that JS is missing

## Complete Monster Timeline

### Turns 0-1: Initialization
- **2 monsters created at startup** (confirmed by 2 newmonhp calls)
  - Monster 1: Pet (d(1,8)=1 HP, has peace_minded calls)
  - Monster 2: Hostile (rnd(4)=3 HP, NO peace_minded calls - different alignment)
- Turn 1: 2 mcalcmove, 0 distfleeck (monsters not yet moving)

### Turns 2-5: Two Monsters
- **4 distfleeck per turn** (2 monsters × 2 = 4)
- **2 mcalcmove per turn** (both get movement)
- Pattern: Pet (dog_move) + Hostile (m_move)

### Turn 6: Third Monster Appears!
- **6 distfleeck** (3 monsters × 2 = 6)
- **2 mcalcmove** (only pet + hostile get movement, Monster 3 gets NONE!)
- RNG sequence:
  ```
  rn2(5) distfleeck
  rn2(12) dog_move     # Monster 1 (pet)
  rn2(12) dog_move
  rn2(5) distfleeck
  rn2(5) distfleeck
  rn2(16) m_move       # Monster 2 (hostile)
  rn2(5) distfleeck
  rn2(5) distfleeck    # Monster 3 appears!
  rn2(12) dog_move     # Monster 3 uses DOG_MOVE (tame AI!)
  rn2(5) distfleeck
  rn2(12) mcalcmove    # Monster 1 gets movement
  rn2(12) mcalcmove    # Monster 2 gets movement
                       # Monster 3 gets NO mcalcmove!
  ```

### Turns 7-10: Three Monsters Continue
- Mostly **6 distfleeck** (turn 9 has 5, partial processing)
- Still **2 mcalcmove** (Monster 3 never gets allocation)
- Monster 3 uses dog_move when it has enough movement to process

### Turn 11-12: Three Monsters, Combat
- **4 distfleeck** (Monster 3 runs out of movement, only 2 process)
- **2 mcalcmove** (pet + hostile)
- Hostile monster attacks player (mattacku calls)

### Turn 13: Hostile Killed
- Combat: hitum → xkilled → corpse created
- **4 distfleeck** (pet + Monster 3, hostile is dead)
- **1 mcalcmove** (only pet, hostile is dead)
- Monster 3 calls dog_goal/obj_resists

### Turns 14-21: Variable Processing
- distfleeck alternates between 2 and 4
- Always **1 mcalcmove** (only pet)
- Monster 3 processes when it has residual movement
- **Turns 18-21: NO dog_goal/dog_move calls** (Monster 3 has no movement)

### Turn 22: The Failing Turn
- **4 distfleeck** (pet + Monster 3)
- **1 mcalcmove** (only pet)
- **Monster 3 calls obj_resists** - THIS IS THE MISSING RNG CALL IN JS!
- C sequence:
  ```
  rn2(5) distfleeck
  rn2(100)=15 obj_resists  # Monster 3's call! (JS is missing this)
  rn2(4) dog_goal
  rn2(12) dog_move
  rn2(12) dog_move
  rn2(5) distfleeck
  rn2(5) distfleeck
  rn2(4) dog_goal
  rn2(12) dog_move
  rn2(12) dog_move
  rn2(5) distfleeck
  ```

## Key Questions

### Q1: How is Monster 3 created?
- **NOT via makemon** - only 2 newmonhp calls in startup
- **NOT a statue** - all rn2(20) statue checks failed
- **NOT created during gameplay** - no makemon calls in turns 0-6

**Possibilities:**
1. **Monster without HP** - Created via special code path that doesn't call newmonhp
2. **Loaded from bones/special level** - Pre-existing entity
3. **Steed/companion** - Special monster type (Valkyrie doesn't have steed though)
4. **Quest ally** - Created during level setup for Valkyrie

### Q2: Why does it use dog_move but never get mcalcmove?
- **dog_move is only called for tame monsters** (mtmp->mtame check at monmove.c:1771)
- So Monster 3 IS tame, but it's a special type that doesn't get regular movement allocation
- Possible types:
  - **Stationary NPC** - Only moves when player is nearby
  - **Quest-related entity** - Different movement rules
  - **Familiar/guardian** - Tame but not a standard pet

### Q3: Why does it only appear at turn 6?
- Likely has **0 initial movement points**
- Accumulates residual movement from some other source
- Only starts processing when movement > NORMAL_SPEED threshold

### Q4: What is Monster 3's monster type?
The rnd(4)=3 HP suggests a **level 0 monster**. Checking the first monster's rndmonst_adj sequence:
```
rn2(3)=1, rn2(4)=0, rn2(5)=2, rn2(7)=4, rn2(8)=1,
rn2(11)=7, rn2(15)=5, rn2(16)=4, rn2(21)=12
```
This reservoir sampling selects a specific level 0-1 monster type. Need to decode this to identify the exact monster.

## Critical Insight: Two Different Entities

The data suggests Monster 2 and Monster 3 might actually be:
- **Monster 2 (rnd(4)=3)**: Created at startup, becomes tame somehow, is Monster 3
- **Actual hostile**: Created separately, is the one killed at turn 13

This would explain why:
- Only 2 newmonhp calls but 3 entities
- Monster 3 uses dog_move (is tame)
- Monster 3 appears at turn 6 (gains movement gradually)

## Next Steps

1. **Decode rndmonst_adj sequence** - Identify exact monster type for rnd(4)=3 creation
2. **Check if Valkyrie role spawns quest allies** at depth 1
3. **Search for taming mechanics** - How does rnd(4)=3 monster become tame?
4. **Examine mcalcmove logic** - Why doesn't Monster 3 get movement allocation?
5. **Implement in JS** - Once identified, spawn Monster 3 correctly

## Conclusion

The "missing obj_resists call" at turn 22 is from a **third tame entity** that exists from early in the game but never receives standard movement allocation. It uses dog_move/dog_goal AI intermittently based on residual movement points.

JS is missing this entity entirely, which is why the RNG diverges at turn 22 when it calls obj_resists.
