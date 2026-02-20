// end.js -- Game over, death handling, scoring, and endgame
// cf. end.c — done_intr, done1, done2, done_hangup, done_in_by, fixup_death,
//             should_query_disclose_option, dump_plines, dump_everything,
//             disclose, savelife, get_valuables, sort_valuables, panic,
//             artifact_score, done_object_cleanup, fuzzer_savelife, done,
//             really_done, container_contents, nh_terminate,
//             delayed_killer, find_delayed_killer, dealloc_killer,
//             save_killers, restore_killers, build_english_list,
//             wordcount, bel_copy1, NH_abort
//
// end.c handles all game-termination logic:
//   done(how): main game-end entry point; checks life-saving amulet.
//   really_done(how): final cleanup, bones, score, tombstone, exit.
//   done_in_by(mtmp, how): construct killer message from monster.
//   disclose(): prompt for end-of-game disclosure (inventory, conduct, etc.).
//   dump_everything(): generate dumplog file.
//   panic(): fatal error handler with stack trace attempt.
//   delayed_killer: deferred death reason management.
//
// JS implementations:
//   renderTombstone → display.js:1135 (PARTIAL — tombstone rendering)
//   renderTopTen → display.js:1186 (PARTIAL — high score display)

// cf. end.c:19 [static] — done_intr(sig_unused): interrupt signal handler
// Increments done_stopprint to halt output on keyboard interrupt.
// TODO: end.c:19 — done_intr(): interrupt signal handler

// cf. end.c:70 — done1(sig_unused): SIGINT handler
// Signal handler for SIGINT; respects ignintr flag; calls done2.
// TODO: end.c:70 — done1(): SIGINT game-end handler

// cf. end.c:92 — done2(void): #quit handler
// Handles #quit command or keyboard interrupt; prompts to confirm.
// TODO: end.c:92 — done2(): quit confirmation

// cf. end.c:172 [static] — done_hangup(sig): hangup handler
// Signal handler for SIGHUP; sets done_hup flag.
// TODO: end.c:172 — done_hangup(): hangup handler

// cf. end.c:188 — done_in_by(mtmp, how): construct killer message
// Builds detailed killer message from monster type, name, and context.
// TODO: end.c:188 — done_in_by(): killer message construction

// cf. end.c:369 [static] — fixup_death(how): fix helpless-death reason
// Removes misleading "while helpless" when that helplessness caused the death.
// TODO: end.c:369 — fixup_death(): death reason cleanup

// cf. end.c:479 [static] — should_query_disclose_option(category, defquery): check disclosure
// Checks if player should be queried about end-of-game disclosure category.
// TODO: end.c:479 — should_query_disclose_option(): disclosure query check

// cf. end.c:521 [static] — dump_plines(void): dump message history
// Writes saved message history to dumplog file.
// TODO: end.c:521 — dump_plines(): dumplog message history

// cf. end.c:544 [static] — dump_everything(how, when): generate dumplog
// Generates complete dumplog with version, timeline, inventory, conduct, overview.
// TODO: end.c:544 — dump_everything(): dumplog generation

// cf. end.c:621 [static] — disclose(how, taken): end-of-game disclosure
// Prompts player to view inventory, attributes, vanquished monsters, conduct.
// TODO: end.c:621 — disclose(): end-of-game disclosure prompts

// cf. end.c:706 [static] — savelife(how): life-saving amulet restoration
// Restores hero to playable state after Amulet of Life Saving triggers.
// TODO: end.c:706 — savelife(): life-saving restoration

// cf. end.c:765 [static] — get_valuables(list): collect valuables for scoring
// Recursively collects amulets and gems from inventory for end-game scoring.
// TODO: end.c:765 — get_valuables(): valuable item collection

// cf. end.c:800 [static] — sort_valuables(list, size): sort valuables
// Sorts collected valuables by quantity descending.
// TODO: end.c:800 — sort_valuables(): valuable sorting

// cf. end.c:396 — panic(str): panic error handler
// Disables bot, saves error state, calls NH_abort; then really_done.
// TODO: end.c:396 — panic(): panic error handler

// cf. end.c:909 [static] — artifact_score(list, counting, endwin): artifact points
// Calculates/displays artifact point values for end-game scoring.
// TODO: end.c:909 — artifact_score(): artifact point calculation

// cf. end.c:852 — done_object_cleanup(void): pre-bones object cleanup
// Cleans up thrown/kicked objects and ball/chain before bones file creation.
// TODO: end.c:852 — done_object_cleanup(): pre-bones cleanup

// cf. end.c:947 [static] — fuzzer_savelife(how): fuzzer life-saving
// Debug fuzzer special: auto-saves and applies healing to avoid infinite death loops.
// TODO: end.c:947 — fuzzer_savelife(): fuzzer death prevention

// cf. end.c:1022 — done(how): main game-end handler
// Checks for life-saving, wizard/discover options, then calls really_done.
// TODO: end.c:1022 — done(): game-end entry point

// cf. end.c:1131 [static] — really_done(how): final game termination
// Creates bones, calculates score, shows tombstone/topten, exits game.
// JS equiv: display.js:1135,1186 — renderTombstone/renderTopTen (PARTIAL)
// PARTIAL: end.c:1131 — really_done() ↔ display.js:1135,1186

// cf. end.c:1596 — container_contents(list, identified, all_containers, reportempty): show container
// Displays contents of containers with identification and Schroedinger's cat.
// TODO: end.c:1596 — container_contents(): container contents display

// cf. end.c:1676 — nh_terminate(status): cleanup and exit
// Releases memory and calls nethack_exit with given status code.
// TODO: end.c:1676 — nh_terminate(): game exit

// cf. end.c:1709 — delayed_killer(id, format, killername): set delayed killer
// Sets a deferred killer record with format and name for later use.
// TODO: end.c:1709 — delayed_killer(): deferred killer record

// cf. end.c:1728 — find_delayed_killer(id): find delayed killer
// Searches delayed killer list for record matching given id.
// TODO: end.c:1728 — find_delayed_killer(): delayed killer lookup

// cf. end.c:1740 — dealloc_killer(kptr): remove delayed killer
// Removes delayed killer from linked list and frees memory.
// TODO: end.c:1740 — dealloc_killer(): delayed killer removal

// cf. end.c:1762 — save_killers(nhfp): serialize delayed killers
// Writes all delayed killer records to save file.
// N/A: end.c:1762 — save_killers() (JS uses storage.js)

// cf. end.c:1782 — restore_killers(nhfp): deserialize delayed killers
// Reads delayed killer records from save file.
// N/A: end.c:1782 — restore_killers() (JS uses storage.js)

// cf. end.c:1825 — build_english_list(in): build English list
// Converts space-separated words to "a, b, or c" format.
// TODO: end.c:1825 — build_english_list(): English list formatting

// cf. end.c:1898 — NH_abort(why): attempt core dump
// Tries to generate stack trace (via gdb or libc) then calls abort().
// TODO: end.c:1898 — NH_abort(): stack trace and abort

// cf. end.c:1794 [static] — wordcount(p): count words in string
// Counts number of space-separated words in string p.
// TODO: end.c:1794 — wordcount(): word count

// cf. end.c:1811 [static] — bel_copy1(inp, out): copy word from input
// Helper for build_english_list: copies next word from input to output.
// TODO: end.c:1811 — bel_copy1(): word copy helper
