// music.js -- Musical instruments and their effects
// cf. music.c — awaken_scare, awaken_monsters, put_monsters_to_sleep,
//               charm_snakes, calm_nymphs, awaken_soldiers,
//               charm_monsters, do_pit, do_earthquake, generic_lvl_desc,
//               do_improvisation, improvised_notes, do_play_instrument,
//               obj_to_instr
//
// music.c handles instrument playing and its effects on the dungeon:
//   do_play_instrument(): main instrument play handler.
//   do_improvisation(): generate and play improvised notes.
//   awaken_monsters(): wake monsters when noise is made.
//   charm_monsters(): attempt to tame monsters with music.
//   awaken_soldiers(): wake all soldiers when bugle is played.
//   do_earthquake(): create multiple pits from instrument use.
//
// JS implementations:
//   (none yet — instrument mechanics not yet ported)

// cf. music.c:44 [static] — awaken_scare(mtmp, scary): wake and optionally scare monster
// Wakes a monster and optionally scares it based on proximity and resistance.
// TODO: music.c:44 — awaken_scare(): monster wake and scare

// cf. music.c:66 [static] — awaken_monsters(distance): wake monsters within distance
// Wakes all monsters within distance, with closer ones more likely to be scared.
// TODO: music.c:66 — awaken_monsters(): area monster awakening

// cf. music.c:84 [static] — put_monsters_to_sleep(distance): put monsters to sleep
// Puts monsters to sleep within distance range with resistance checks.
// TODO: music.c:84 — put_monsters_to_sleep(): area monster sleep

// cf. music.c:104 [static] — charm_snakes(distance): charm snakes
// Makes snakes within distance peaceful and removes their hidden status.
// TODO: music.c:104 — charm_snakes(): snake charming

// cf. music.c:138 [static] — calm_nymphs(distance): calm nymphs
// Makes nymphs within distance peaceful and calm.
// TODO: music.c:138 — calm_nymphs(): nymph calming

// cf. music.c:161 — awaken_soldiers(bugler): wake soldiers with bugle
// Wakes all soldiers on the level and nearby monsters when a bugle is played.
// TODO: music.c:161 — awaken_soldiers(): soldier awakening via bugle

// cf. music.c:195 [static] — charm_monsters(distance): charm monsters with music
// Attempts to tame monsters within distance, even pacifying shopkeepers.
// TODO: music.c:195 — charm_monsters(): monster charming with music

// cf. music.c:220 [static] — do_pit(x, y, tu_pit): create pit at location
// Creates a pit at a location, handling monsters and items falling through.
// TODO: music.c:220 — do_pit(): earthquake pit creation

// cf. music.c:343 [static] — do_earthquake(force): create multiple pits
// Creates multiple pits in the area around the hero based on force parameter.
// TODO: music.c:343 — do_earthquake(): earthquake effect

// cf. music.c:477 [static] — generic_lvl_desc(void): generic level description
// Returns a generic description of the current level type for messages.
// TODO: music.c:477 — generic_lvl_desc(): level type description

// cf. music.c:502 [static] — do_improvisation(instr): improvise instrument
// Generates improvised notes and plays the appropriate instrument effect.
// TODO: music.c:502 — do_improvisation(): instrument improvisation

// cf. music.c:732 [static] — improvised_notes(same_as_last_time): generate random notes
// Creates a random note sequence or returns the previous sequence if unchanged.
// TODO: music.c:732 — improvised_notes(): random note sequence generation

// cf. music.c:758 — do_play_instrument(instr): main instrument play handler
// Main function for playing instruments, handling tuning or improvisation.
// TODO: music.c:758 — do_play_instrument(): instrument play main handler

// cf. music.c:902 — obj_to_instr(obj): map object to instrument type
// Maps NetHack instrument object types to sound library instrument enumerations.
// TODO: music.c:902 — obj_to_instr(): instrument type mapping
