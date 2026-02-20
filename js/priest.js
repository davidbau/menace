// priest.js -- Priest behavior: temple guards, NPC dialog, shrine management
// cf. priest.c — newepri, free_epri, move_special, temple_occupied,
//                histemple_at, inhistemple, pri_move, priestini,
//                mon_aligntyp, priestname, p_coaligned, has_shrine,
//                findpriest, intemple, forget_temple_entry, priest_talk,
//                mk_roamer, reset_hostility, in_your_sanctuary,
//                ghod_hitsu, angry_priest, clearpriests, restpriest
//
// Priest behavior covers:
//   - Template initialization (priestini) and per-turn movement (pri_move)
//   - Temple entry detection (intemple) and conversation (priest_talk)
//   - Shrine ownership/alignment checks (has_shrine, histemple_at)
//   - Minion roamers: mk_roamer creates aligned clerics/angels; reset_hostility
//   - God's wrath in temple (ghod_hitsu)
//   - Bones file cleanup (clearpriests/restpriest)
//   - move_special (shared with shopkeeper movement): priest/shk boundary logic
//
// JS implementations:
//   move_special() → monmove.js:679 — priest/shopkeeper boundary movement
// All other functions → not implemented in JS.

// cf. priest.c:16 — newepri(mtmp): initialize priest extra data
// Allocates EPRI struct on mtmp for temple/alignment/room tracking.
// TODO: priest.c:16 — newepri(): priest extra data initialization

// cf. priest.c:28 — free_epri(mtmp): free priest extra data
// Frees EPRI struct; clears ispriest flag.
// TODO: priest.c:28 — free_epri(): priest extra data cleanup

// cf. priest.c:41 — move_special(mtmp, in_his_shop, appr, uondoor, avoid, omx, omy, ggx, ggy)
// Moves priests and shopkeepers with special logic for shop/temple boundaries;
//   uses approach value to decide flee or advance; respects door constraints.
// JS equiv: monmove.js:679 — move_special() for priest/shopkeeper boundary movement.
// PARTIAL: priest.c:41 — move_special() ↔ move_special (monmove.js:679)

// cf. priest.c:142 — temple_occupied(array): find occupied temple room
// Returns temple room number if any room in array is occupied by its priest.
// TODO: priest.c:142 — temple_occupied(): occupied temple check

// cf. priest.c:153 — histemple_at(priest, x, y): is location in priest's temple?
// Returns TRUE if (x,y) is inside the priest's temple room.
// TODO: priest.c:153 — histemple_at(): location in priest's temple

// cf. priest.c:161 — inhistemple(priest): is priest in his home temple?
// Checks that priest is in his temple room and shrine is properly aligned.
// TODO: priest.c:161 — inhistemple(): priest at home shrine check

// cf. priest.c:177 — pri_move(priest): priest per-turn movement
// Handles priest patrol around altar; pursues if hostile.
// Uses move_special() for boundary-aware movement.
// TODO: priest.c:177 — pri_move(): priest movement logic

// cf. priest.c:220 — priestini(lvl, sroom, sx, sy, sanctum): initialize temple
// Creates priest monster and sets up temple furnishings (altar, candelabra) during
//   level generation. sanctum=TRUE: place high priest at endgame altar.
// TODO: priest.c:220 — priestini(): temple level-gen initialization

// cf. priest.c:280 — mon_aligntyp(mon): get monster alignment type
// Returns priest/minion/normal alignment type for the monster.
// Used to determine if monster is a priest or aligned minion.
// TODO: priest.c:280 — mon_aligntyp(): monster alignment type

// cf. priest.c:302 — priestname(mon, article, reveal_high_priest, pname): format name
// Generates "the Priest of <deity>" with proper article; optionally reveals
//   "the High Priest" title. Writes to pname buffer.
// TODO: priest.c:302 — priestname(): formatted priest name string

// cf. priest.c:370 — p_coaligned(priest): same alignment as player?
// Returns TRUE if player and priest share the same alignment.
// TODO: priest.c:370 — p_coaligned(): alignment match check

// cf. priest.c:376 — has_shrine(pri): priest's temple has valid shrine?
// Checks that an altar of the proper alignment exists in the temple room.
// Returns FALSE if shrine was desecrated or converted.
// TODO: priest.c:376 — has_shrine(): shrine validity check

// cf. priest.c:392 — findpriest(roomno): find priest in temple room
// Scans fmon for a priest monster assigned to the given temple room number.
// TODO: priest.c:392 — findpriest(): temple priest lookup

// cf. priest.c:410 — intemple(roomno): player enters temple room
// Called when player steps into a temple room; handles initial encounter
//   messages, coalignment checks, and tithe demands.
// TODO: priest.c:410 — intemple(): temple entry encounter

// cf. priest.c:545 — forget_temple_entry(priest): reset temple entry feedback timers
// Resets the priest's feedback timers so entry messages can repeat.
// TODO: priest.c:545 — forget_temple_entry(): entry timer reset

// cf. priest.c:558 — priest_talk(priest): conversation with priest
// Handles donation/blessing interaction; checks alignment, purity;
//   applies tithe for services; outputs priest dialog.
// TODO: priest.c:558 — priest_talk(): priest NPC conversation

// cf. priest.c:688 — mk_roamer(ptr, alignment, x, y, peaceful): create aligned roamer
// Creates an aligned cleric or angel minion at (x,y) with given alignment.
// peaceful=TRUE: created as non-hostile (called after prayer).
// TODO: priest.c:688 — mk_roamer(): aligned minion creation

// cf. priest.c:719 — reset_hostility(roamer): reset minion hostility
// Re-evaluates roamer's hostility based on alignment mismatch with player.
// Called after player's alignment changes.
// TODO: priest.c:719 — reset_hostility(): minion hostility reset

// cf. priest.c:735 — in_your_sanctuary(mon, x, y): is location player's sanctuary?
// Returns TRUE if (x,y) is in a temple where player is welcome (co-aligned).
// TODO: priest.c:735 — in_your_sanctuary(): player sanctuary check

// cf. priest.c:760 — ghod_hitsu(priest): execute god's wrath for temple attack
// Delivers divine punishment when player attacks a coaligned priest in temple:
//   curses items, smites with lightning, calls down monsters.
// TODO: priest.c:760 — ghod_hitsu(): divine punishment in temple

// cf. priest.c:841 — angry_priest(): make temple priest angry; convert to roamer
// Called when player desecrates shrine; priest becomes hostile roaming minion.
// TODO: priest.c:841 — angry_priest(): priest anger on desecration

// cf. priest.c:883 — clearpriests(): remove priests not on their home shrine level
// Called when saving bones files to clean up displaced priests.
// TODO: priest.c:883 — clearpriests(): bones file priest cleanup

// cf. priest.c:897 — restpriest(mtmp, ghostly): restore priest shrine level info
// Reconnects priest's shrine level reference when loading a bones file.
// TODO: priest.c:897 — restpriest(): bones priest restoration
