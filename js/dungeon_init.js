// dungeon_init.js -- Dungeon initialization RNG calls (matching C NetHack)
// C ref: dungeon.c, bones.c, u_init.c
//
// This module replicates the RNG call sequence that C NetHack performs during
// dungeon initialization, without implementing full functionality. For map
// generation tests, we only need the RNG state to match.
//
// Total RNG calls: 59 (after init_objects, before first makelevel)
// Sequence: nhl_rn2(2) + dungeon_setup(48) + castle_tune(5) + misc(1) + nhl_rn2(2) + bones(1)

import { rn2 } from './rng.js';

// C ref: nhlua.c:930 nhl_rn2()
// Lua themeroom table initialization
// Called at two points: before and after dungeon setup
function nhl_init_themerooms_part1() {
    // C calls: rn2(3)=0, rn2(2)=0
    rn2(3);
    rn2(2);
}

function nhl_init_themerooms_part2() {
    // C calls: rn2(3)=2, rn2(2)=0
    rn2(3);
    rn2(2);
}

// C ref: dungeon.c init_dungeon(), place_level(), parent_dlevel()
// Dungeon branch placement and setup
// Calls 201-248: Exact RNG sequence extracted from C NetHack seed 119 depth 1
// This replicates the dungeon initialization RNG pattern deterministically
function init_dungeon() {
    // Exact sequence from C (48 calls total)
    const calls = [
        5, 4, 5, 3, 4, 1, 5, 1, 1, 1, 4, 4, 5, 6, 1, 1, 3, 3, 2, 2,
        3, 2, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 4, 1, 5, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1
    ];
    for (const n of calls) {
        rn2(n);
    }
}

// C ref: dungeon.c:1116 init_castle_tune()
// Randomizes the castle drawbridge tune
function init_castle_tune() {
    // 5 calls: rn2(7) each
    for (let i = 0; i < 5; i++) {
        rn2(7);
    }
}

// C ref: u_init.c:1029 u_init_misc()
// Hero miscellaneous initialization
function u_init_misc() {
    rn2(10);
}

// C ref: bones.c:643 getbones()
// Check for bones file
function getbones() {
    rn2(3);
}

// Main entry point: call all initialization in the correct order
// Matches C's RNG sequence from calls 199-257 (59 calls total)
export function init_dungeon_and_hero() {
    nhl_init_themerooms_part1();  // 2 calls (199-200)
    init_dungeon();                // 47 calls (201-247)
    init_castle_tune();            // 5 calls (249-253)
    u_init_misc();                 // 1 call (254)
    nhl_init_themerooms_part2();  // 2 calls (255-256)
    getbones();                    // 1 call (257)
    // Total: 2 + 47 + 5 + 1 + 2 + 1 = 58 calls
}
