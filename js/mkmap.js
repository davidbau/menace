// mkmap.js -- Cellular automaton dungeon level map generation
// cf. mkmap.c — init_map, init_fill, get_map, pass_one, pass_two, pass_three,
//               flood_fill_rm, join_map_cleanup, join_map, finish_map,
//               remove_rooms, remove_room, litstate_rnd, mkmap
//
// mkmap.c generates dungeon levels using a cellular automaton algorithm:
//   mkmap(): main entry — orchestrate complete level generation.
//   init_fill(): randomly fill ~40% of map with foreground terrain.
//   pass_one/two/three(): cellular automaton smoothing passes.
//   flood_fill_rm(): mark connected regions with room numbers.
//   join_map(): connect disconnected regions with corridors.
//   finish_map(): apply final transforms (walls, lighting, lava/ice).
//
// JS implementations:
//   sp_lev.js:399 — mkmapInitMap(): initialize map cells to NO_ROOM
//   sp_lev.js:410 — mkmapInitFill(): randomly fill map with foreground terrain
//   sp_lev.js:423 — mkmapGet(): get cell type with boundary checking
//   sp_lev.js:430 — mkmapPassOne(): first cellular automaton pass
//   sp_lev.js:447 — mkmapPassTwo(): second cellular automaton pass
//   sp_lev.js:469 — mkmapPassThree(): third cellular automaton smoothing pass
//   sp_lev.js:491 — mkmapFloodRegions(): connected region identification
//   sp_lev.js:655 — mkmapJoin(): connect separate regions with corridors
//   sp_lev.js:712 — mkmapFinish(): apply final transforms and wallification

// cf. mkmap.c:23 [static] — init_map(bg_typ): initialize level map
// Initializes the level map by setting all cells to NO_ROOM status and background type.
// JS equiv: sp_lev.js:399 — mkmapInitMap()
// PARTIAL: mkmap.c:23 — init_map() ↔ sp_lev.js:399

// cf. mkmap.c:36 [static] — init_fill(bg_typ, fg_typ): random terrain fill
// Randomly fills about 40% of the map with foreground type terrain.
// JS equiv: sp_lev.js:410 — mkmapInitFill()
// PARTIAL: mkmap.c:36 — init_fill() ↔ sp_lev.js:410

// cf. mkmap.c:54 [static] — get_map(col, row, bg_typ): get cell type
// Returns cell type at coordinates, defaulting to background if out of bounds.
// JS equiv: sp_lev.js:423 — mkmapGet()
// PARTIAL: mkmap.c:54 — get_map() ↔ sp_lev.js:423

// cf. mkmap.c:67 [static] — pass_one(bg_typ, fg_typ): first CA pass
// First cellular automaton pass applying terrain death rules
// (cells with 0–2 neighbors become background).
// JS equiv: sp_lev.js:430 — mkmapPassOne()
// PARTIAL: mkmap.c:67 — pass_one() ↔ sp_lev.js:430

// cf. mkmap.c:100 [static] — pass_two(bg_typ, fg_typ): second CA pass
// Second cellular automaton pass converting cells with exactly 5 neighbors
// to background type.
// JS equiv: sp_lev.js:447 — mkmapPassTwo()
// PARTIAL: mkmap.c:100 — pass_two() ↔ sp_lev.js:447

// cf. mkmap.c:123 [static] — pass_three(bg_typ, fg_typ): third CA pass
// Third cellular automaton pass (smoothing) converting cells with fewer than
// 3 neighbors to background.
// JS equiv: sp_lev.js:469 — mkmapPassThree()
// PARTIAL: mkmap.c:123 — pass_three() ↔ sp_lev.js:469

// cf. mkmap.c:152 — flood_fill_rm(sx, sy, rmno, lit, anyroom): flood-fill region
// Flood-fills a region to mark all connected cells with the same room number and lighting.
// JS equiv: sp_lev.js:491 — mkmapFloodRegions()
// PARTIAL: mkmap.c:152 — flood_fill_rm() ↔ sp_lev.js:491

// cf. mkmap.c:245 [static] — join_map_cleanup(void): clear temporary room assignments
// Clears temporary room assignments after map joining completes.
// TODO: mkmap.c:245 — join_map_cleanup(): post-join room cleanup

// cf. mkmap.c:257 [static] — join_map(bg_typ, fg_typ): connect disconnected regions
// Joins disconnected foreground regions by flood-filling and digging corridors.
// JS equiv: sp_lev.js:655 — mkmapJoin()
// PARTIAL: mkmap.c:257 — join_map() ↔ sp_lev.js:655

// cf. mkmap.c:330 [static] — finish_map(fg_typ, bg_typ, lit, walled, icedpools): final transforms
// Applies final transformations: wallification, lighting, and lava/ice pool marking.
// JS equiv: sp_lev.js:712 — mkmapFinish()
// PARTIAL: mkmap.c:330 — finish_map() ↔ sp_lev.js:712

// cf. mkmap.c:378 — remove_rooms(lx, ly, hx, hy): remove rooms in rectangle
// Removes or truncates rooms overlapping with a specified rectangular region.
// TODO: mkmap.c:378 — remove_rooms(): rectangular room removal

// cf. mkmap.c:411 [static] — remove_room(roomno): remove single room
// Removes a single room from the rooms array by swapping with the last room.
// TODO: mkmap.c:411 — remove_room(): single room removal

// cf. mkmap.c:442 — litstate_rnd(litstate): random lighting state
// Returns random lighting state based on dungeon depth if input is negative,
// otherwise returns the input boolean.
// TODO: mkmap.c:442 — litstate_rnd(): depth-based lighting determination

// cf. mkmap.c:450 — mkmap(init_lev): main map generation
// Main function that orchestrates complete dungeon level generation
// using cellular automaton and corridor generation.
// TODO: mkmap.c:450 — mkmap(): complete level generation orchestration
