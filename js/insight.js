// insight.js -- Player attributes, enlightenment, conduct, and status display
// cf. insight.c — enlght_out, enlght_halfdmg, walking_on_water,
//                 trap_predicament, fmt_elapsed_time,
//                 background_enlightenment, basics_enlightenment,
//                 characteristics_enlightenment, one_characteristic,
//                 status_enlightenment, weapon_insight, doattributes,
//                 doconduct, show_conduct, record_achievement,
//                 remove_achievement, count_achievements, sokoban_in_play,
//                 do_gamelog, show_gamelog, set_vanq_order, dovanquished,
//                 list_vanquished, num_genocides, num_extinct, num_gone,
//                 list_genocided, dogenocided, doborn, align_str,
//                 size_str, piousness, mstatusline, ustatusline
//
// insight.c handles player self-knowledge and status reporting:
//   doattributes(): ^X command — show detailed attribute enlightenment.
//   doconduct(): #conduct — show which conducts have been maintained.
//   dovanquished(): #vanquished — list monsters killed.
//   dogenocided(): #genocided — list genocided species.
//   mstatusline(): stethoscope/probe feedback for monsters.
//   ustatusline(): stethoscope/probe feedback for the hero.
//   show_conduct(): also used for end-of-game disclosure.
//
// JS implementations:
//   (none yet — enlightenment/conduct display not yet ported)

// cf. insight.c:117 [static] — enlght_out(buf): output enlightenment text
// Outputs a line of enlightenment text to the enlightenment window.
// TODO: insight.c:117 — enlght_out(): enlightenment output

// cf. insight.c:200 [static] — enlght_halfdmg(category, final): report half damage
// Reports half physical or half spell damage in enlightenment.
// TODO: insight.c:200 — enlght_halfdmg(): half damage enlightenment

// cf. insight.c:223 [static] — walking_on_water(void): check water walking active
// Checks if the hero is actively using water walking on water or lava.
// TODO: insight.c:223 — walking_on_water(): active water walking check

// cf. insight.c:232 — trap_predicament(outbuf, final, wizxtra): describe trap situation
// Describes u.utraptype for status_enlightenment() and self_lookat().
// TODO: insight.c:232 — trap_predicament(): trap situation description

// cf. insight.c:313 [static] — fmt_elapsed_time(outbuf, final): format elapsed game time
// Formats elapsed game time for enlightenment display.
// TODO: insight.c:313 — fmt_elapsed_time(): elapsed time formatting

// cf. insight.c:445 [static] — background_enlightenment(unused_mode, final): role/race/align display
// Displays role, race, alignment and related info to the enlightenment window.
// TODO: insight.c:445 — background_enlightenment(): role/race enlightenment

// cf. insight.c:705 [static] — basics_enlightenment(mode, final): basic attributes display
// Shows selected basic attributes and capabilities in enlightenment.
// TODO: insight.c:705 — basics_enlightenment(): basic attribute enlightenment

// cf. insight.c:804 [static] — characteristics_enlightenment(mode, final): expanded stats display
// Displays expanded version of bottom-line strength, dexterity, etc.
// TODO: insight.c:804 — characteristics_enlightenment(): expanded stat enlightenment

// cf. insight.c:823 [static] — one_characteristic(mode, final, attrindx): single attribute
// Displays one attribute value for characteristics_enlightenment().
// TODO: insight.c:823 — one_characteristic(): single attribute display

// cf. insight.c:917 [static] — status_enlightenment(mode, final): status/capabilities display
// Shows selected obvious capabilities and assorted troubles.
// TODO: insight.c:917 — status_enlightenment(): capabilities and troubles display

// cf. insight.c:1247 [static] — weapon_insight(final): weapon status insight
// Provides insights about current weapon status.
// TODO: insight.c:1247 — weapon_insight(): weapon status enlightenment

// cf. insight.c:2014 — doattributes(void): ^X attribute display command
// Handles the ^X command for displaying detailed player attributes.
// TODO: insight.c:2014 — doattributes(): attribute display command

// cf. insight.c:2086 — doconduct(void): #conduct command handler
// Handles the #conduct command; shares enlightenment's tense handling.
// TODO: insight.c:2086 — doconduct(): conduct display command

// cf. insight.c:2094 — show_conduct(final): display conduct list
// Displays conducts; used for doconduct(), disclose(), and dump_everything().
// TODO: insight.c:2094 — show_conduct(): conduct list display

// cf. insight.c:2417 — record_achievement(achidx): record a game achievement
// Records an achievement; adds at end of list unless already present.
// TODO: insight.c:2417 — record_achievement(): achievement recording

// cf. insight.c:2486 — remove_achievement(achidx): discard a recorded achievement
// Discards a recorded achievement; returns True if removed.
// TODO: insight.c:2486 — remove_achievement(): achievement removal

// cf. insight.c:2504 — count_achievements(void): count current achievements
// Used to decide whether there are any achievements to display.
// TODO: insight.c:2504 — count_achievements(): achievement count

// cf. insight.c:2527 — sokoban_in_play(void): check if sokoban entered
// Returns True if the sokoban branch has been entered.
// TODO: insight.c:2527 — sokoban_in_play(): sokoban entry check

// cf. insight.c:2542 — do_gamelog(void): #chronicle command handler
// Handles the #chronicle command.
// TODO: insight.c:2542 — do_gamelog(): gamelog display command

// cf. insight.c:2571 — show_gamelog(final): display chronicle details
// Shows chronicle details (game timeline and events).
// TODO: insight.c:2571 — show_gamelog(): chronicle display

// cf. insight.c:2728 — set_vanq_order(for_vanq): set vanquished display order
// Returns -1 if cancelled via ESC; otherwise sets the order for vanquished display.
// TODO: insight.c:2728 — set_vanq_order(): vanquished sort order

// cf. insight.c:2779 — dovanquished(void): #vanquished command handler
// Handles the #vanquished command.
// TODO: insight.c:2779 — dovanquished(): vanquished monsters command

// cf. insight.c:2794 — list_vanquished(defquery, ask): list vanquished monsters
// Used for #vanquished and end-of-game disclosure and dumplog.
// TODO: insight.c:2794 — list_vanquished(): vanquished monster list

// cf. insight.c:2973 — num_genocides(void): count genocided species
// Returns the number of monster species which have been genocided.
// TODO: insight.c:2973 — num_genocides(): genocided species count

// cf. insight.c:2990 [static] — num_extinct(void): count extinct species
// Returns count of the number of extinct species.
// TODO: insight.c:2990 — num_extinct(): extinct species count

// cf. insight.c:3005 [static] — num_gone(mvflags, mindx): collect genocides and extinctions
// Collects both genocides and extinctions, skipping uniques.
// TODO: insight.c:3005 — num_gone(): total gone species count

// cf. insight.c:3027 — list_genocided(defquery, ask): list genocided species
// Lists genocided species or for the #genocided command.
// TODO: insight.c:3027 — list_genocided(): genocided species list

// cf. insight.c:3155 — dogenocided(void): #genocided command handler
// Handles the M-g #genocided extended command.
// TODO: insight.c:3155 — dogenocided(): genocided species command

// cf. insight.c:3165 — doborn(void): #wizborn command handler
// Handles the #wizborn extended wizard command.
// TODO: insight.c:3165 — doborn(): wizard born species command

// cf. insight.c:3207 — align_str(alignment): alignment string
// Returns string representation of alignment.
// TODO: insight.c:3207 — align_str(): alignment name string

// cf. insight.c:3223 [static] — size_str(msize): monster size string
// Returns string representation of monster size.
// TODO: insight.c:3223 — size_str(): size name string

// cf. insight.c:3255 — piousness(showneg, suffix): piety status string
// Used for self-probing to determine piety status.
// TODO: insight.c:3255 — piousness(): piety status description

// cf. insight.c:3295 — mstatusline(mtmp): monster probe/stethoscope status
// Provides one-line feedback from stethoscope or probing applied to a monster.
// TODO: insight.c:3295 — mstatusline(): monster status feedback

// cf. insight.c:3422 — ustatusline(void): hero probe/stethoscope status
// Provides one-line feedback from stethoscope or probing applied to the hero.
// TODO: insight.c:3422 — ustatusline(): hero self-probe status feedback
