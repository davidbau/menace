// allmain.js -- Main game loop: early_init, moveloop, newgame, welcome
// cf. allmain.c — early_init, moveloop_preamble, u_calc_moveamt, moveloop_core,
//                 maybe_do_tutorial, moveloop, regen_pw, regen_hp,
//                 stop_occupation, init_sound_disp_gamewindows, newgame,
//                 welcome, do_positionbar, interrupt_multi, argcheck,
//                 debug_fields, timet_to_seconds, timet_delta,
//                 dump_enums, dump_glyphids, harness_dump_checkpoint,
//                 json_write_escaped
//
// allmain.c is the main game orchestration module:
//   early_init(): startup before anything else (crash handlers, globals).
//   moveloop(): outer loop calling moveloop_core() repeatedly.
//   moveloop_core(): one full game turn — monster moves, hero regeneration,
//     occupation, autopickup, timeout processing.
//   newgame(): full new-game setup (role selection, dungeon gen, startup).
//   welcome(): display character description at game start or restore.
//
// JS implementations: game loop is split across nethack.js and menace.js.
//   newgame/moveloop → nethack.js (gameLoop, character init)
//   init_sound_disp_gamewindows → display.js, nethack.js startup
//   argcheck/debug_fields → N/A (no command-line args in browser)
//   dump_enums/dump_glyphids → N/A (build-time tools only)
//   harness_dump_checkpoint → js/harness.js (test harness)
//   timet_to_seconds/timet_delta → N/A (JS uses Date)

// cf. allmain.c:155 [static] — json_write_escaped(fp, s): JSON-escape a string
// Writes JSON-escaped form of s to file fp.
// N/A: allmain.c:155 — json_write_escaped() (no file I/O in JS)

// cf. allmain.c:175 — harness_dump_checkpoint(phase): dump game state snapshot
// Writes JSON snapshot of map/monster/player state to NETHACK_DUMPSNAP file.
// N/A: allmain.c:175 — harness_dump_checkpoint() (file I/O; JS harness uses oracle/)

// cf. allmain.c:36 — early_init(argc, argv): pre-game initialization
// Sets up crash handlers, initializes game globals before display init.
// TODO: allmain.c:36 — early_init(): pre-game initialization

// cf. allmain.c:50 [static] — moveloop_preamble(resuming): pre-loop setup
// Handles moon phase checks, Friday the 13th messages, autopickup init.
// TODO: allmain.c:50 — moveloop_preamble(): pre-loop setup

// cf. allmain.c:116 [static] — u_calc_moveamt(wtcap): hero movement amount
// Calculates move speed based on speed intrinsic and encumbrance.
// TODO: allmain.c:116 — u_calc_moveamt(): movement speed calculation

// cf. allmain.c:169 — moveloop_core(void): one game turn
// Main game loop body: monster moves, hero regen, occupation, autopickup,
//   timeout events, display update.
// TODO: allmain.c:169 — moveloop_core(): game turn processing

// cf. allmain.c:566 [static] — maybe_do_tutorial(void): tutorial prompt
// Offers to enter tutorial level if available on first play.
// TODO: allmain.c:566 — maybe_do_tutorial(): tutorial entry prompt

// cf. allmain.c:586 — moveloop(resuming): main game loop
// Calls moveloop_preamble() then loops moveloop_core() until game end.
// TODO: allmain.c:586 — moveloop(): main game loop

// cf. allmain.c:599 [static] — regen_pw(wtcap): power point regeneration
// Regenerates magic energy each turn based on level and encumbrance.
// TODO: allmain.c:599 — regen_pw(): power regeneration

// cf. allmain.c:621 [static] — regen_hp(wtcap): hit point regeneration
// Regenerates HP each turn for normal and polymorphed forms.
// TODO: allmain.c:621 — regen_hp(): hit point regeneration

// cf. allmain.c:680 — stop_occupation(void): halt multi-turn action
// Stops current occupation (searching, resting, etc.) and clears pending commands.
// TODO: allmain.c:680 — stop_occupation(): occupation halt

// cf. allmain.c:697 — init_sound_disp_gamewindows(void): init display/sound
// Creates game windows (message, status, map, inventory), inits sound.
// TODO: allmain.c:697 — init_sound_disp_gamewindows(): display initialization

// cf. allmain.c:764 — newgame(void): new game initialization
// Full setup: role/race selection, attribute rolling, dungeon generation,
//   starting inventory, welcome message.
// TODO: allmain.c:764 — newgame(): new game setup

// cf. allmain.c:851 — welcome(new_game): display welcome message
// Shows character description ("You are a..." or "Welcome back...").
// TODO: allmain.c:851 — welcome(): welcome message display

// cf. allmain.c:907 [static] — do_positionbar(void): update position bar
// Shows stair locations in POSITIONBAR display mode.
// TODO: allmain.c:907 — do_positionbar(): position bar update

// cf. allmain.c:950 [static] — interrupt_multi(msg): interrupt multi-turn action
// Interrupts run/travel/occupation with message if active.
// TODO: allmain.c:950 — interrupt_multi(): multi-turn interrupt

// cf. allmain.c:1001 — argcheck(argc, argv, e_arg): process early CLI args
// Handles --version, --debug, --dumpenums command-line arguments.
// N/A: allmain.c:1001 — argcheck() (no command-line args in browser)

// cf. allmain.c:1124 [static] — debug_fields(opts): parse debug options
// Parses comma-separated debug field options for testing.
// N/A: allmain.c:1124 — debug_fields() (no CLI args in browser)

// cf. allmain.c:1173 — timet_to_seconds(ttim): time_t to seconds
// Converts time_t to seconds since epoch.
// N/A: allmain.c:1173 — timet_to_seconds() (JS uses Date.now())

// cf. allmain.c:1182 — timet_delta(etim, stim): time difference
// Returns difference in seconds between two time_t values.
// N/A: allmain.c:1182 — timet_delta() (JS uses Date arithmetic)

// cf. allmain.c:1259 [static] — dump_enums(void): dump enumeration constants
// Outputs monster/object/artifact enum definitions for tooling.
// N/A: allmain.c:1259 — dump_enums() (build-time tool)

// cf. allmain.c:1356 — dump_glyphids(void): dump glyph identifier constants
// Outputs all glyph ID constants used in the display system.
// N/A: allmain.c:1356 — dump_glyphids() (build-time tool)
