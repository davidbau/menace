# Plan for a Perfect 616-Point Dungeon Speedrun

## Lessons from Previous Attempts

### Seed 13 (502/616): RNG Fragility
- Every step addition cascades through the PRNG, breaking fights/navigation
- The thief fight requires exact RNG alignment (3-step filler + 8 rounds)
- Lamp battery (350 turns) is a hard constraint
- Wire/rope parser ambiguity blocks the balloon crown section

### Seed 31 (600/616): Much Better, But...
- Following the hints walkthrough structure works well
- Thief kills in 5 rounds with knife (no fillers needed!)
- Guidebook burns longer than newspaper for balloon fuel
- "untie rope from hook" disambiguates at balloon
- "take candles" needed after "ring bell" (exorcism fix)
- **Missing 16 points**:
  - Blue sphere (10pts): rope consumed in mining slide, can't re-tie at dome
  - Goblet (8pts): stuck in dead thief inventory, never dropped
  - Both require restructuring the route order

## Key Insights for a Perfect Run

### 1. The Rope Problem
The rope is used THREE times:
1. Tie at dome railing (climb to torch room) — consumed permanently unless untied
2. Tie to timber (mining slide descent) — consumed
3. Tie at balloon hooks — needed for both ledge stops

**Solution**: The hints walkthrough retrieves the rope from the dome (step 329)
BEFORE mining. But the thief steals it from the dome around step 75.

**Fix**: We need to either:
- (a) Visit the dome to untie/take rope BEFORE the thief steals it (~step 70)
- (b) Arrange the route so the thief never visits the dome at step 75
- (c) Use a completely different route that doesn't need the dome rope for the torch

### 2. The Goblet Problem
The goblet (obj 37, 8pts total) is at the gas room (room 64). The thief steals
it during patrol. After killing the thief, the goblet is in the dead thief's
"inventory" and never drops to the floor.

**Fix**: Visit the gas room and take the goblet BEFORE killing the thief.
The mining section visits the gas room — do mining BEFORE thief kill.

### 3. The Blue Sphere Problem
The blue sphere requires:
- Rope (to re-tie at dome for descent to torch room)
- Mat, screwdriver, key (for the dreary room door puzzle)

**Fix**: Do the blue sphere section AFTER retrieving the rope from the dome
but BEFORE using the rope for mining/balloon.

### 4. Score Composition (616 total)
- Room exploration values: 115 pts (rooms 1, 6, 9, 94, 102, 103, 142)
- Object take values (otval): 231 pts
- Object deposit values (ofval): 260 pts
- Endgame room values: 100 pts (rooms 157, 158, 166, 177, 178, 187)
- Note: endgame triggers at ASCORE >= MXSCOR - 10*DEATHS
- With 0 deaths: need exactly 616 base to trigger endgame

### 5. Section Ordering (Recommended)
Following hints walkthrough but restructured:

1. **Opening** (steps 1-22): Get items from house+attic
2. **Torch First** (23-40): Kill troll, Egyptian room visit, dome/rope/torch
3. **Thief Setup** (41-56): Maze to cyclops, ODYSSEUS, give egg to thief
4. **Wonderland** (57-110): Carousel, riddle, well, robot, machine, bucket
5. **Bank** (111-140): Painting, portrait, bills, curtain of light
6. **Dam** (141-160): Matchbook, brochure, wrench, screwdriver, bolt
7. **Blue Sphere** (161-190): Dome descent, mat/screwdriver puzzle, dreary room
   - MUST happen before thief steals rope (~step 75 equivalent)
   - OR retrieve rope from dome right after Wonderland
8. **Treasure Hunt** (191-220): Trunk, pump, trident via reservoir
9. **Echo Room + River Ride** (221-280): Bar, shovel, boat, emerald, statue, gold, rainbow
10. **Thief Kill** (281-300): Take goblet from gas room during mining approach
11. **Exorcism** (301-340): Grail, bell, candles, book, Hades (+30pts)
12. **Mining** (341-440): Figurine, bracelet, coal→diamond, slide sphere
13. **Royal Puzzle** (441-490): Card
14. **Balloon** (491-560): Guidebook fuel, crown, coin, stamp, both ledges
15. **Final Items** (561-580): Canary winding, bauble, brochure stamp
16. **Endgame** (581-650): Crypt, mirror box, dungeon master questions

## Required Tooling Improvements

### 1. Multi-Object Surveil Tracking
Add tracking for ALL 32 treasure objects to surveil. This lets us detect
immediately when any treasure moves (thief steals it, game event, etc.)

### 2. Score-at-Every-Step Mode
Add ASCORE to surveil output so we can see exact score at every step.
This eliminates guessing about point values.

### 3. Seed Scanner
Build a tool that tests seeds 1-1000 for:
- Troll fight rounds (with the hints walkthrough opening)
- Carousel path to engravings cave (how many visits)
- Thief fight rounds (at various step counts)
- Thief patrol timing (when does thief visit dome/gas room/temple)

### 4. Step-by-Step Verifier
Build a tool that runs each step and checks:
- Is the player alive?
- Is the score increasing as expected?
- Are all needed items in inventory?
- Is the lamp battery sufficient?

### 5. Fortran PRNG Predictor
Since we know the exact PRNG (Park-Miller LCG), we can predict:
- What rooms the carousel will send us to
- When the thief will visit each room
- Combat outcomes for each fight round
This would let us pick the PERFECT seed and timing without trial-and-error.

## Critical Path Dependencies
```
Opening → Torch (needs rope for dome)
       → Thief Setup (needs egg from opening)
       → Wonderland (needs bottle from opening, carousel from troll kill)
         → Bank (needs torch from torch room)
         → Dam (needs wrench, screwdriver)
           → Blue Sphere (needs rope, mat, screwdriver - dome descent)
           → Treasure Hunt (needs reservoir drained from dam)
             → Echo+River (needs shovel, pump, bar)
             → Thief Kill (needs high score, take goblet)
               → Exorcism (needs bell, book, candles, matchbook)
               → Mining (needs garlic, rope for slide, screwdriver for machine)
                 → Royal Puzzle (needs torch for dark rooms)
                 → Balloon (needs guidebook, brick, wire, rope, matchbook)
                   → Final Items (canary, bauble, brochure stamp)
                   → Endgame (needs 616 score to trigger)
```

## Seed Selection Criteria
The ideal seed should have:
- Troll dies in 1-3 rounds with knife
- Carousel reaches engravings cave in ≤3 visits
- Thief at treasure room when player arrives (~step 280)
- Thief doesn't steal rope from dome before ~step 165
- Favorable combat RNG for thief fight
- No grue deaths from lamp timing
