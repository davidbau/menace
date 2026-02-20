// detect.js -- Detection spells, scrolls, and searching
// cf. detect.c — unconstrain_map, reconstrain_map, map_redisplay, browse_map,
//                map_monst, trapped_chest_at, trapped_door_at, o_in, o_material,
//                observe_recursively, check_map_spot, clear_stale_map,
//                gold_detect, food_detect, object_detect, monster_detect,
//                sense_trap, detect_obj_traps, display_trap_map, trap_detect,
//                furniture_detect, level_distance, use_crystal_ball,
//                show_map_spot, do_mapping, do_vicinity_map, cvt_sdoor_to_door,
//                foundone, findone, openone, findit, openit, detecting,
//                find_trap, mfind0, dosearch0, dosearch, warnreveal,
//                skip_premap_detect, premap_detect,
//                reveal_terrain_getglyph, dump_map, reveal_terrain
//
// detect.c handles all detection-related gameplay:
//   gold_detect/food_detect/object_detect/monster_detect: scroll/spell effects.
//   trap_detect(): scroll of trap detection.
//   do_mapping(): scroll of magic mapping.
//   do_vicinity_map(): clairvoyance spell.
//   use_crystal_ball(): crystal ball detection.
//   dosearch0/dosearch: explicit searching for hidden items.
//   findit/openit: find/open nearby secret doors and traps.
//   reveal_terrain(): wizard-mode full reveal.
//
// JS implementations:
//   dosearch0 → commands.js:3818 (PARTIAL — RNG parity)

// cf. detect.c:70 [static] — unconstrain_map(void): remove map constraints
// Temporarily removes underwater/buried/engulfed constraints for detection display.
// TODO: detect.c:70 — unconstrain_map(): constraint removal

// cf. detect.c:85 [static] — reconstrain_map(void): restore map constraints
// Restores underwater/buried/engulfed constraints after detection display.
// TODO: detect.c:85 — reconstrain_map(): constraint restoration

// cf. detect.c:94 [static] — map_redisplay(void): redraw map after detection
// Redraws map and restores player constraints.
// TODO: detect.c:94 — map_redisplay(): post-detection map redraw

// cf. detect.c:106 [static] — browse_map(ter_typ, ter_explain): interactive map browse
// Opens interactive map browser with autodescribe for detection spells.
// TODO: detect.c:106 — browse_map(): interactive detection map

// cf. detect.c:122 [static] — map_monst(mtmp, showtail): show monster on detection map
// Displays a monster on the detection map (with hallucination handling).
// TODO: detect.c:122 — map_monst(): monster detection display

// cf. detect.c:139 — trapped_chest_at(ttyp, x, y): trapped chest at location?
// Returns TRUE if a trapped chest of given type is at (x,y).
// TODO: detect.c:139 — trapped_chest_at(): trapped chest check

// cf. detect.c:182 — trapped_door_at(ttyp, x, y): trapped door at location?
// Returns TRUE if a trapped door of given type is at (x,y).
// TODO: detect.c:182 — trapped_door_at(): trapped door check

// cf. detect.c:201 — o_in(obj, oclass): item of class in object?
// Recursively searches object (including containers) for item of class oclass.
// TODO: detect.c:201 — o_in(): recursive class search

// cf. detect.c:229 — o_material(obj, material): item of material in object?
// Recursively searches object for item made of given material.
// TODO: detect.c:229 — o_material(): recursive material search

// cf. detect.c:249 [static] — observe_recursively(obj): mark objects as observed
// Recursively marks all objects in containers as observed during detection.
// TODO: detect.c:249 — observe_recursively(): recursive observation marking

// cf. detect.c:262 [static] — check_map_spot(x, y, oclass, material): stale map check
// Checks if map location has outdated object display.
// TODO: detect.c:262 — check_map_spot(): stale map spot check

// cf. detect.c:318 [static] — clear_stale_map(oclass, material): clear stale display
// Removes stale object displays from map during detection scanning.
// TODO: detect.c:318 — clear_stale_map(): stale display cleanup

// cf. detect.c:335 — gold_detect(sobj): detect gold
// Detects gold and displays its locations; scroll of gold detection.
// TODO: detect.c:335 — gold_detect(): gold detection

// cf. detect.c:479 — food_detect(sobj): detect food/potions
// Detects food or potions and displays locations.
// TODO: detect.c:479 — food_detect(): food/potion detection

// cf. detect.c:603 — object_detect(detector, class): detect objects of class
// Detects objects of given class and displays locations on map.
// TODO: detect.c:603 — object_detect(): object detection by class

// cf. detect.c:798 — monster_detect(otmp, mclass): detect monsters
// Detects monsters of given class and displays on map.
// TODO: detect.c:798 — monster_detect(): monster detection

// cf. detect.c:865 [static] — sense_trap(trap, x, y, src_cursed): display trap
// Displays a trap on detection map with hallucination handling.
// TODO: detect.c:865 — sense_trap(): trap display on detection map

// cf. detect.c:907 [static] — detect_obj_traps(objlist, show_them, how, ft): object trap detection
// Checks object lists for trapped chests and updates found_things.
// TODO: detect.c:907 — detect_obj_traps(): object trap scanning

// cf. detect.c:956 [static] — display_trap_map(cursed_src): display detected traps
// Shows all detected traps on map.
// TODO: detect.c:956 — display_trap_map(): trap map display

// cf. detect.c:1011 — trap_detect(sobj): scroll of trap detection
// Detects traps on level and displays them; cursed reverses.
// TODO: detect.c:1011 — trap_detect(): trap detection

// cf. detect.c:1091 [static] — furniture_detect(void): detect furniture/mimics
// Detects and displays furniture and mimics disguised as furniture.
// TODO: detect.c:1091 — furniture_detect(): furniture detection

// cf. detect.c:1142 — level_distance(where): level distance description
// Returns text describing relative distance to given dungeon level.
// TODO: detect.c:1142 — level_distance(): dungeon level distance

// cf. detect.c:1206 — use_crystal_ball(optr): crystal ball usage
// Handles crystal ball usage for detection with charge consumption.
// TODO: detect.c:1206 — use_crystal_ball(): crystal ball detection

// cf. detect.c:1372 — show_map_spot(x, y, cnf): show map background
// Reveals background terrain and traps at given map location.
// TODO: detect.c:1372 — show_map_spot(): map spot revelation

// cf. detect.c:1422 — do_mapping(void): magic mapping
// Reveals entire level layout; scroll of magic mapping.
// TODO: detect.c:1422 — do_mapping(): magic mapping

// cf. detect.c:1448 — do_vicinity_map(sobj): clairvoyance detection
// Performs clairvoyance detection in area around player.
// TODO: detect.c:1448 — do_vicinity_map(): clairvoyance

// cf. detect.c:1589 — cvt_sdoor_to_door(lev): convert secret door
// Converts a secret door into a normal door when discovered.
// TODO: detect.c:1589 — cvt_sdoor_to_door(): secret door conversion

// cf. detect.c:1610 [static] — foundone(zx, zy, glyph): update map with found item
// Updates map display to show newly found item.
// TODO: detect.c:1610 — foundone(): found item display

// cf. detect.c:1639 [static] — findone(zx, zy, whatfound): find items at location
// Finds all detectable items at location for findit().
// TODO: detect.c:1639 — findone(): location item finding

// cf. detect.c:1729 [static] — openone(zx, zy, num): open items at location
// Opens doors, chests, and traps found by detection at location.
// TODO: detect.c:1729 — openone(): location item opening

// cf. detect.c:1792 — findit(void): find nearby hidden items
// Reveals nearby secret doors, corridors, traps, and hidden monsters.
// TODO: detect.c:1792 — findit(): nearby hidden item revelation

// cf. detect.c:1902 — openit(void): open nearby locked items
// Opens all nearby locked containers, secret doors, and traps.
// TODO: detect.c:1902 — openit(): nearby item opening

// cf. detect.c:1929 — detecting(func): is func a detection callback?
// Returns TRUE if func is one of the detection callback functions.
// TODO: detect.c:1929 — detecting(): detection callback check

// cf. detect.c:1935 — find_trap(trap): mark trap as seen
// Marks trap as discovered and displays message.
// TODO: detect.c:1935 — find_trap(): trap discovery

// cf. detect.c:1965 [static] — mfind0(mtmp, via_warning): reveal hidden monster
// Reveals a hidden or disguised monster.
// TODO: detect.c:1965 — mfind0(): hidden monster revelation

// cf. detect.c:2016 — dosearch0(aflag): search for hidden items
// Searches for secret doors, traps, and hidden monsters at adjacent locations.
// JS equiv: commands.js:3818 — dosearch0() (PARTIAL — RNG parity)
// PARTIAL: detect.c:2016 — dosearch0() ↔ commands.js:3818

// cf. detect.c:2097 — dosearch(void): #search command
// Executes explicit search command; calls dosearch0.
// TODO: detect.c:2097 — dosearch(): search command

// cf. detect.c:2107 — warnreveal(void): reveal warning-detected monsters
// Reveals hidden monsters detected by danger sense warning.
// TODO: detect.c:2107 — warnreveal(): warning monster revelation

// cf. detect.c:2124 [static] — skip_premap_detect(x, y): skip in premap?
// Returns TRUE if location should be skipped in premap detection.
// TODO: detect.c:2124 — skip_premap_detect(): premap skip check

// cf. detect.c:2134 — premap_detect(void): pre-map sokoban levels
// Pre-maps sokoban levels by revealing terrain and traps.
// TODO: detect.c:2134 — premap_detect(): sokoban pre-mapping

// cf. detect.c:2167 [static] — reveal_terrain_getglyph(x, y, swallowed, default_glyph, which_subset): terrain glyph
// Gets filtered glyph for terrain reveal (can exclude monsters/objects/traps).
// TODO: detect.c:2167 — reveal_terrain_getglyph(): filtered terrain glyph

// cf. detect.c:2294 — dump_map(void): dump map to dumplog
// Writes current map view to the dumplog file.
// TODO: detect.c:2294 — dump_map(): map dumplog output

// cf. detect.c:2356 — reveal_terrain(which_subset): reveal map terrain
// Reveals map terrain; can filter to show only terrain, objects, or monsters.
// TODO: detect.c:2356 — reveal_terrain(): terrain revelation
