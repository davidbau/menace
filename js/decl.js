// decl.js -- Global variable declarations and data structure initialization
// cf. decl.c — nhcb_name, nhcb_counts, c_color_names, c_obj_colors,
//              disclosure_options, fqn_prefix_names, xdir, ydir, zdir,
//              dirs_ord, shield_static, vowels, ynchars, ynqchars,
//              ARGV0, urole_init_data, urace_init_data,
//              instance_globals_* initialization structures (a-z),
//              saved instance globals structures,
//              init_program_state, cg (const_globals),
//              initializeGameDataStructures, reinitializeGameDataFromSavedInstances
//
// decl.c primarily contains global variable declarations and initialization
//   data structures that define the game's global state. Key items:
//   xdir/ydir/zdir: direction offset tables (N/S/E/W and diagonals).
//   c_obj_colors: object color name strings.
//   disclosure_options: characters for end-of-game disclosure menu.
//   initializeGameDataStructures(): initialize all globals from static data.
//   reinitializeGameDataFromSavedInstances(): restore from saved instances.
//   cg: constant globals structure (shared read-only data).
//
// JS implementations: global state is spread across multiple JS modules.
//   xdir/ydir → commands.js (direction deltas)
//   c_obj_colors → symbols.js or display.js
//   initializeGameDataStructures → nethack.js startup
//   All per-instance globals → player.js, dungeon.js, etc.

// cf. decl.c:8 — nhcb_name[NUM_NHCB]: callback name strings
// Array of callback event name strings for the windowport callback system.
// TODO: decl.c:8 — nhcb_name[]: callback name array

// cf. decl.c:15 — nhcb_counts[NUM_NHCB]: callback counts
// Array counting invocations of each windowport callback type.
// TODO: decl.c:15 — nhcb_counts[]: callback count array

// cf. decl.c:16 — c_color_names: color name structure
// Structure mapping color names to their symbolic constants.
// TODO: decl.c:16 — c_color_names: color name mapping

// cf. decl.c:20 — c_obj_colors[]: object color strings
// Array of color name strings for object descriptions.
// TODO: decl.c:20 — c_obj_colors[]: object color names

// cf. decl.c:54 — disclosure_options[]: disclosure menu characters
// String of characters for end-of-game disclosure option menu.
// TODO: decl.c:54 — disclosure_options[]: disclosure option chars

// cf. decl.c:67 — fqn_prefix_names[PREFIX_COUNT]: path prefix names
// Array of fully-qualified name prefix strings (for file paths).
// TODO: decl.c:67 — fqn_prefix_names[]: path prefix names

// cf. decl.c:77 — xdir[], ydir[], zdir[]: direction offsets
// Per-direction dx/dy/dz offset arrays (N/S/E/W/NE/NW/SE/SW/Up/Down).
// TODO: decl.c:77 — xdir[]/ydir[]/zdir[]: direction delta arrays

// cf. decl.c:81 — dirs_ord[N_DIRS]: ordered direction codes
// Direction code ordering array.
// TODO: decl.c:81 — dirs_ord[]: direction code ordering

// cf. decl.c:97 — shield_static[SHIELD_COUNT]: shield type info
// Static shield animation data.
// TODO: decl.c:97 — shield_static[]: shield type data

// cf. decl.c:111–118 — vowels[], ynchars[], ynqchars[], etc.: character sets
// Character class strings for prompt handling (yes/no/quit options).
// TODO: decl.c:111 — vowels[]/ynchars[]/ynqchars[]: prompt character sets

// cf. decl.c:121 — ARGV0: program name
// Pointer to program name (argv[0]).
// N/A: decl.c:121 — ARGV0 (no argv in browser)

// cf. decl.c:124 — urole_init_data: role initialization data
// Static initialization template for the hero's role structure.
// TODO: decl.c:124 — urole_init_data: role init data

// cf. decl.c:149 — urace_init_data: race initialization data
// Static initialization template for the hero's race structure.
// TODO: decl.c:149 — urace_init_data: race init data

// cf. decl.c:172–854 — instance_globals_* initialization structures
// Per-character instance global initialization data (a-z subsystem globals).
// These are the large static initializers for every game subsystem.
// TODO: decl.c:172 — instance globals init structures (a-z)

// cf. decl.c:862–988 — saved instance globals structures
// Saved instance global initialization data for cross-session state.
// TODO: decl.c:862 — saved instance globals init structures

// cf. decl.c:994 — init_program_state: program state initialization
// Static initialization for the program_state structure.
// TODO: decl.c:994 — init_program_state: program state init

// cf. decl.c:1047 — cg: constant globals structure
// Read-only global data shared across all game subsystems.
// TODO: decl.c:1047 — cg: constant globals

// cf. decl.c:1065 — initializeGameDataStructures(void): initialize all globals
// Sets up all global data structures from static initializers at game start.
// TODO: decl.c:1065 — initializeGameDataStructures(): global initialization

// cf. decl.c:1184 — reinitializeGameDataFromSavedInstances(void): restore from saved
// Reinitializes game data from saved instance globals (after restore).
// N/A: decl.c:1184 — reinitializeGameDataFromSavedInstances() (JS uses storage.js)
