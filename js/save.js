// save.js -- Game state serialization and save-file management
// cf. save.c — dosave, dosave0, savegamestate, savelev, savelev_core,
//              savelevl, saveobj, saveobjchn, savemon, savemonchn,
//              savetrapchn, savecemetery, savedamage, save_stairs,
//              save_bubbles, save_bc, savefruitchn, savelevchn,
//              store_plname_in_file, save_msghistory, save_gamelog,
//              free_dungeons, freedynamicdata, tricked_fileremoved,
//              savestateinlock
//
// save.c serializes the entire game state to a save file using NHFILE I/O.
// It operates in three modes (WRITING, COUNTING, FREEING) controlled by
// the Sfo_* family of macros. The save format is versioned binary.
//
// Key components saved:
//   - Version and player identity (store_plname_in_file)
//   - Global game state: flags, context, player stats, inventory (savegamestate)
//   - Per-level data: terrain, monsters, objects, traps, engravings (savelev_core)
//   - Dungeon structure: stairways, bubbles, cemetery, damage (save_stairs etc.)
//   - Auxiliary chains: fruit names, special levels, message history, gamelog
//
// N/A: JS port uses storage.js (localStorage/IndexedDB) with a different
//   format — no direct equivalents to these file-based save functions.
//   Memory management (freedynamicdata, free_dungeons) is handled by GC.

// cf. save.c:42 — dosave(): player-facing #save command
// Prompts player to confirm; calls dosave0(); handles quit-to-save logic.
// N/A: save.c:42 — dosave() (JS uses storage.js)

// cf. save.c:74 — dosave0(): core save orchestrator
// Writes version, player name, current level, game state, all other levels.
// Uses tricked_fileremoved() to detect file tampering.
// Returns 1 on success, 0 on failure.
// N/A: save.c:74 — dosave0() (JS uses storage.js)

// cf. save.c:237 — save_gamelog(nhfp): serialize gamelog to file
// Writes game event history entries; optionally frees memory in FREEING mode.
// N/A: save.c:237 — save_gamelog() (no save file system)

// cf. save.c:265 — savegamestate(nhfp): serialize global game state
// Saves player stats, flags, context, inventory, monsters, artifacts, spells,
//   discoveries, dungeon structure, coin count, and timing data.
// N/A: save.c:265 — savegamestate() (no save file system)

// cf. save.c:329 — tricked_fileremoved(nhfp, name): detect save file tampering
// Checks if save file was removed unexpectedly; calls done(TRICKED) if so.
// N/A: save.c:329 — tricked_fileremoved() (no save file system)

// cf. save.c:343 — savestateinlock(): periodic checkpoint save
// Saves current game state to a lock file for recovery after crashes.
// Called periodically during gameplay (ifdef INSURANCE).
// N/A: save.c:343 — savestateinlock() (no save file system)

// cf. save.c:421 — savelev(nhfp, lev): save a dungeon level
// Wrapper for savelev_core() that manages uz_save state for the level.
// N/A: save.c:421 — savelev() (no save file system)

// cf. save.c:444 — savelev_core(nhfp, lev): core level serialization
// Saves bones data, map grid, monsters, objects, traps, engravings, damage,
//   regions, and air bubbles for one dungeon level.
// N/A: save.c:444 — savelev_core() (no save file system)

// cf. save.c:560 — savelevl(nhfp): save 2D map grid
// Writes COLNO × ROWNO levl[][] terrain cells to file.
// N/A: save.c:560 — savelevl() (no save file system)

// cf. save.c:574 — save_bubbles(nhfp, lev): save air bubbles and clouds
// Saves bubbles on the Plane of Water / clouds on the Plane of Air.
// N/A: save.c:574 — save_bubbles() (no save file system)

// cf. save.c:600 — savecemetery(nhfp, cemetery): save cemetery/bones info
// Saves ghost monster data (bones files) linked to the level.
// N/A: save.c:600 — savecemetery() (no save file system)

// cf. save.c:623 — savedamage(nhfp): save pending shop damage list
// Saves list of shop wall/floor damage pending repair.
// N/A: save.c:623 — savedamage() (no save file system)

// cf. save.c:648 — save_stairs(nhfp): save stairway positions and metadata
// Writes stair positions, up/down flags, and dungeon destination levels.
// N/A: save.c:648 — save_stairs() (no save file system)

// cf. save.c:679 — save_bc(nhfp): save ball and chain state
// Saves ball & chain if in unusual location (not on floor or in inventory).
// N/A: save.c:679 — save_bc() (no save file system)

// cf. save.c:709 — saveobj(nhfp, obj): save a single object
// Writes object struct + extensions (name string, oextra data, contained monster,
//   mail command). Uses Sfo_* macros with WRITING/COUNTING/FREEING modes.
// N/A: save.c:709 — saveobj() (no save file system)

// cf. save.c:745 — saveobjchn(nhfp, chain): save an object chain (linked list)
// Recursively saves all objects in chain including container contents.
// Frees objects in FREEING mode; writes null-terminator at end.
// N/A: save.c:745 — saveobjchn() (no save file system)

// cf. save.c:809 — savemon(nhfp, mon): save a single monster
// Writes monster struct + extensions (name, guard/priest/shopkeeper/pet data).
// N/A: save.c:809 — savemon() (no save file system)

// cf. save.c:862 — savemonchn(nhfp, chain): save a monster chain (linked list)
// Recursively saves all monsters and their inventories; frees in FREEING mode.
// N/A: save.c:862 — savemonchn() (no save file system)

// cf. save.c:898 — savetrapchn(nhfp, chain): save trap chain
// Writes all trap structs in the linked list.
// N/A: save.c:898 — savetrapchn() (no save file system)

// cf. save.c:929 — savefruitchn(nhfp): save fruit name chain
// Writes fruit name/ID pairs (used in bones-file identification).
// N/A: save.c:929 — savefruitchn() (no save file system)

// cf. save.c:952 — savelevchn(nhfp): save special level chain
// Writes s_level structs describing special levels (Sokoban, Mines, etc.).
// N/A: save.c:952 — savelevchn() (no save file system)

// cf. save.c:977 — store_plname_in_file(nhfp): write player name with suffix
// Writes player name + role/race/gender/alignment suffix for menu-based restore.
// N/A: save.c:977 — store_plname_in_file() (no save file system)

// cf. save.c:1008 — save_msghistory(nhfp): save message history
// Writes recent message history from window port to save file.
// N/A: save.c:1008 — save_msghistory() (no save file system)

// cf. save.c:1038 — free_dungeons(): free dungeon data structures
// Frees all dungeon branch and level data (ifdef FREE_ALL_MEMORY).
// N/A: save.c:1038 — free_dungeons() (JS uses GC)

// cf. save.c:1055 — freedynamicdata(): free all dynamically allocated memory
// Comprehensive cleanup of: menu colors, inventory buffers, timers, option
//   strings, dungeon structures, artifact list, etc.
// Called before exit to ensure clean memory state.
// N/A: save.c:1055 — freedynamicdata() (JS uses GC)
