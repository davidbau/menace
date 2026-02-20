// stairs.js -- Stairway linked-list management and hero placement
// cf. stairs.c — stairway_add/free/at/find_*, u_on_upstairs/dnstairs/sstairs,
//                On_stairs/On_ladder/On_stairs_up/On_stairs_dn,
//                known_branch_stairs, stairs_description
//
// C data model: gs.stairs is a singly-linked list of stairway structs:
//   { sx, sy, up, isladder, u_traversed, tolev {dnum,dlevel}, next }
// This list holds ALL stairways on the level including branch portals.
// JS data model: map.upstair / map.dnstair are simple {x, y, isladder}
//   objects set at level generation time (sp_lev.js:3771). No linked list.
//   Branch portal tracking (dnum, u_traversed) not implemented in JS.
//
// JS implementations:
//   u_on_upstairs() / u_on_dnstairs() → getArrivalPosition(map, _, dir)
//     in level_transition.js:134 (partial — uses map.upstair/dnstair coords;
//     lacks special/branch stair fallback and u_on_rndspot fallback).
//   stairway_add() → implicit: sp_lev.js:3771 sets map.upstair/dnstair.
//   All stairway_find_* and On_stairs_* → not implemented.
//   stairs_description(), known_branch_stairs() → not implemented.

// cf. stairs.c:7 — stairway_add(x, y, up, isladder, dest): add stairway to level list
// Allocates a stairway node, assigns destination d_level, prepends to gs.stairs.
// JS equivalent: sp_lev.js:3771 sets map.upstair={x,y} or map.dnstair={x,y}
//   with isladder flag when l_create_stairway() processes a stair object.
//   No linked list; only one up and one down stair tracked per level.
// TODO: stairs.c:7 — stairway_add(): full linked-list stairway registration

// cf. stairs.c:26 — stairway_free_all(): free all stairway nodes on level change
// Walks gs.stairs linked list, frees each node, sets gs.stairs=NULL.
// N/A: JS uses garbage collection; map.upstair/dnstair are plain objects.
// N/A: stairs.c:26 — stairway_free_all()

// cf. stairs.c:39 — stairway_at(x, y): find stairway at grid position
// Walks gs.stairs list; returns node where sx==x && sy==y, or NULL.
// JS equivalent: none — closest is checking map.upstair.x===x etc. inline.
// Referenced in dogmove.js:999 (C ref comment only; JS uses map tile type check instead).
// TODO: stairs.c:39 — stairway_at(): stairway lookup by position

// cf. stairs.c:49 — stairway_find(fromdlev): find stairway whose tolev matches
// Returns stairway whose tolev.dnum==fromdlev->dnum && tolev.dlevel==fromdlev->dlevel.
// Used by goto_level() to place hero at corresponding stairs when returning from a branch.
// TODO: stairs.c:49 — stairway_find(): stairway lookup by destination level

// cf. stairs.c:63 — stairway_find_from(fromdlev, isladder): find stairway by dest + type
// Like stairway_find() but also matches isladder flag.
// TODO: stairs.c:63 — stairway_find_from(): stairway lookup by destination and ladder type

// cf. stairs.c:78 — stairway_find_dir(up): find first stairway going up or down
// Returns first node in gs.stairs with matching up flag.
// TODO: stairs.c:78 — stairway_find_dir(): stairway lookup by direction

// cf. stairs.c:88 — stairway_find_type_dir(isladder, up): find stairway by type+direction
// Matches both isladder and up flags.
// TODO: stairs.c:88 — stairway_find_type_dir(): stairway lookup by type and direction

// cf. stairs.c:98 — stairway_find_special_dir(up): find branch stairway
// Returns first node where tolev.dnum != u.uz.dnum AND up != specified up.
// Used by u_on_sstairs() to place hero on inter-branch stairs.
// TODO: stairs.c:98 — stairway_find_special_dir(): branch stairway lookup

// cf. stairs.c:112 — u_on_sstairs(upflag): place hero on special (branch) staircase
// Calls stairway_find_special_dir(upflag); if found, u_on_newpos(sx, sy);
//   else u_on_rndspot(upflag).
// TODO: stairs.c:112 — u_on_sstairs(): hero placement on branch stairs

// cf. stairs.c:124 — u_on_upstairs(): place hero on up stairway (or special equivalent)
// Calls stairway_find_dir(TRUE) for up stair; if not found, u_on_sstairs(0).
// JS equivalent: getArrivalPosition(map, _, 'down') in level_transition.js:134.
//   JS uses map.upstair.{x,y} directly; lacks special-stair fallback.
// PARTIAL: stairs.c:124 — u_on_upstairs() ↔ getArrivalPosition(…,'down') (level_transition.js:134)

// cf. stairs.c:136 — u_on_dnstairs(): place hero on down stairway (or special equivalent)
// Calls stairway_find_dir(FALSE) for down stair; if not found, u_on_sstairs(1).
// JS equivalent: getArrivalPosition(map, _, 'up') in level_transition.js:134.
//   JS uses map.dnstair.{x,y} directly; lacks special-stair fallback.
// PARTIAL: stairs.c:136 — u_on_dnstairs() ↔ getArrivalPosition(…,'up') (level_transition.js:134)

// cf. stairs.c:147 — On_stairs(x, y): is there any stairway at this position?
// Returns stairway_at(x, y) != NULL.
// Referenced in dogmove.js:999 (C ref comment); JS checks tile type directly instead.
// TODO: stairs.c:147 — On_stairs(): any stairway at position predicate

// cf. stairs.c:153 — On_ladder(x, y): is there a ladder (not stairs) at this position?
// Returns stairway_at(x,y) && stway->isladder.
// TODO: stairs.c:153 — On_ladder(): ladder-at-position predicate

// cf. stairs.c:161 — On_stairs_up(x, y): is there an up stairway at this position?
// Returns stairway_at(x,y) && stway->up.
// TODO: stairs.c:161 — On_stairs_up(): up-stair-at-position predicate

// cf. stairs.c:169 — On_stairs_dn(x, y): is there a down stairway at this position?
// Returns stairway_at(x,y) && !stway->up.
// TODO: stairs.c:169 — On_stairs_dn(): down-stair-at-position predicate

// cf. stairs.c:179 — known_branch_stairs(sway): has hero traversed this branch stair?
// Returns TRUE if sway && sway->tolev.dnum != u.uz.dnum && sway->u_traversed.
// Used by stairs_description() to choose verbose vs terse description.
// TODO: stairs.c:179 — known_branch_stairs(): branch-stair traversal check

// cf. stairs.c:186 — stairs_description(sway, outbuf, stcase): describe a stairway
// Builds text like "stairs up", "stairs up to level 5", "branch stairs up to Gehennom",
//   or special-cases for level-1 up stairs (exit vs end-game depending on Amulet).
// stcase=TRUE: "staircase" singular; FALSE: "stairs" (caller handles singular/plural).
// Known branch: "branch <type> <dir> to <dungeons[dnum].dname>".
// Traversed ordinary: appends " to level <depth>".
// TODO: stairs.c:186 — stairs_description(): stairway text description
