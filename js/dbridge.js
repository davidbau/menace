// dbridge.js -- Drawbridge mechanics
// cf. dbridge.c — is_waterwall, is_pool, is_lava, is_pool_or_lava, is_ice,
//                 is_moat, db_under_typ, is_drawbridge_wall, is_db_wall,
//                 find_drawbridge, get_wall_for_db, create_drawbridge,
//                 e_at, m_to_e, u_to_e, set_entity, e_nam, E_phrase,
//                 e_survives_at, e_died, automiss, e_missed, e_jumps,
//                 do_entity, nokiller, close_drawbridge, open_drawbridge,
//                 destroy_drawbridge
//
// dbridge.c manages drawbridge creation, opening, closing, and destruction,
//   plus terrain type checks (pool, lava, ice, moat, waterwall):
//   create_drawbridge(): create drawbridge in dungeon.
//   open_drawbridge/close_drawbridge: open or close; handle entities on bridge.
//   destroy_drawbridge(): demolish the drawbridge completely.
//   is_pool/is_lava/is_ice/is_moat: terrain type predicates.
//
// JS implementations: none — all drawbridge logic is runtime gameplay.

// cf. dbridge.c:38 — is_waterwall(x, y): water wall check
// Returns TRUE if location contains a water wall (submerged wall).
// TODO: dbridge.c:38 — is_waterwall(): water wall terrain check

// cf. dbridge.c:45 — is_pool(x, y): pool/moat/water terrain check
// Returns TRUE if location is a pool, moat, or other water terrain.
// TODO: dbridge.c:45 — is_pool(): pool terrain check

// cf. dbridge.c:61 — is_lava(x, y): lava terrain check
// Returns TRUE if location contains lava terrain.
// TODO: dbridge.c:61 — is_lava(): lava terrain check

// cf. dbridge.c:76 — is_pool_or_lava(x, y): pool or lava check
// Returns TRUE if location is either water or lava.
// TODO: dbridge.c:76 — is_pool_or_lava(): water or lava check

// cf. dbridge.c:85 — is_ice(x, y): ice terrain check
// Returns TRUE if location is ice terrain.
// TODO: dbridge.c:85 — is_ice(): ice terrain check

// cf. dbridge.c:99 — is_moat(x, y): moat terrain check
// Returns TRUE if location is specifically moat terrain.
// TODO: dbridge.c:99 — is_moat(): moat terrain check

// cf. dbridge.c:115 — db_under_typ(mask): terrain under drawbridge
// Returns terrain type underneath a drawbridge based on bit mask.
// TODO: dbridge.c:115 — db_under_typ(): drawbridge underterrain type

// cf. dbridge.c:136 — is_drawbridge_wall(x, y): drawbridge portcullis check
// Returns direction if wall at (x,y) is a drawbridge portcullis; 0 otherwise.
// TODO: dbridge.c:136 — is_drawbridge_wall(): portcullis check

// cf. dbridge.c:169 — is_db_wall(x, y): raised drawbridge wall check
// Returns TRUE if location is a raised (closed) drawbridge wall.
// TODO: dbridge.c:169 — is_db_wall(): raised drawbridge check

// cf. dbridge.c:179 — find_drawbridge(x, y): locate drawbridge
// Given a drawbridge or wall location, finds the actual drawbridge coordinates.
// TODO: dbridge.c:179 — find_drawbridge(): drawbridge location

// cf. dbridge.c:210 [static] — get_wall_for_db(x, y): find wall for drawbridge
// Given a drawbridge, finds the corresponding wall location.
// TODO: dbridge.c:210 — get_wall_for_db(): drawbridge wall location

// cf. dbridge.c:234 — create_drawbridge(x, y, dir, flag): create drawbridge
// Creates a drawbridge at (x,y) facing direction dir.
// TODO: dbridge.c:234 — create_drawbridge(): drawbridge creation

// cf. dbridge.c:285 [static] — e_at(x, y): entity at location
// Returns the entity (player or monster) at given location.
// TODO: dbridge.c:285 — e_at(): entity location check

// cf. dbridge.c:303 [static] — m_to_e(mtmp, x, y, etmp): monster to entity
// Converts a monster to an entity struct for drawbridge processing.
// TODO: dbridge.c:303 — m_to_e(): monster-to-entity conversion

// cf. dbridge.c:320 [static] — u_to_e(etmp): player to entity
// Converts the player character to an entity struct.
// TODO: dbridge.c:320 — u_to_e(): player-to-entity conversion

// cf. dbridge.c:329 [static] — set_entity(x, y, etmp): set entity at location
// Sets up an entity struct for the creature at given location.
// TODO: dbridge.c:329 — set_entity(): entity setup

// cf. dbridge.c:350 [static] — e_nam(etmp): entity name
// Returns the name of a drawbridge-processing entity.
// TODO: dbridge.c:350 — e_nam(): entity name

// cf. dbridge.c:360 [static] — E_phrase(etmp, verb): entity phrase
// Generates a capitalized phrase with entity name and verb.
// TODO: dbridge.c:360 — E_phrase(): entity phrase construction

// cf. dbridge.c:379 [static] — e_survives_at(etmp, x, y): entity survival check
// Returns TRUE if entity can survive at the given terrain location.
// TODO: dbridge.c:379 — e_survives_at(): entity survival check

// cf. dbridge.c:401 [static] — e_died(etmp, xkill_flags, how): handle entity death
// Processes death of an entity caught by drawbridge.
// TODO: dbridge.c:401 — e_died(): drawbridge entity death

// cf. dbridge.c:463 [static] — automiss(etmp): entity automatically avoids?
// Returns TRUE if entity automatically avoids drawbridge damage.
// TODO: dbridge.c:463 — automiss(): drawbridge auto-avoid check

// cf. dbridge.c:473 [static] — e_missed(etmp, chunks): drawbridge misses entity?
// Returns TRUE if entity successfully avoids being caught by drawbridge.
// TODO: dbridge.c:473 — e_missed(): drawbridge miss check

// cf. dbridge.c:508 [static] — e_jumps(etmp): entity jumps from drawbridge?
// Returns TRUE if entity successfully jumps to safety from drawbridge.
// TODO: dbridge.c:508 — e_jumps(): drawbridge jump check

// cf. dbridge.c:531 [static] — do_entity(etmp): process entity on drawbridge
// Handles what happens to an entity when drawbridge state changes.
// TODO: dbridge.c:531 — do_entity(): entity-drawbridge interaction

// cf. dbridge.c:740 [static] — nokiller(void): clear killer data
// Clears killer reason and resets entity data after drawbridge processing.
// TODO: dbridge.c:740 — nokiller(): killer data reset

// cf. dbridge.c:752 — close_drawbridge(x, y): close drawbridge
// Raises the drawbridge; handles entities on bridge (crushing, jumping, drowning).
// TODO: dbridge.c:752 — close_drawbridge(): drawbridge closing

// cf. dbridge.c:817 — open_drawbridge(x, y): open drawbridge
// Lowers the drawbridge; handles entities in moat and on bridge.
// TODO: dbridge.c:817 — open_drawbridge(): drawbridge opening

// cf. dbridge.c:865 — destroy_drawbridge(x, y): demolish drawbridge
// Destroys a drawbridge completely, replacing with appropriate terrain.
// TODO: dbridge.c:865 — destroy_drawbridge(): drawbridge demolition
