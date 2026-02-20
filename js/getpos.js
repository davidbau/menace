// getpos.js -- Position selection UI: cursor, targeting, look command
// cf. getpos.c — getpos_sethilite, getpos_toggle_hilite_state, mapxy_valid,
//                getpos_getvalids_selection, getpos_help_keyxhelp, getpos_help,
//                cmp_coord_distu, gloc_filter_classify_glyph,
//                gloc_filter_floodfill_matcharea, gloc_filter_floodfill,
//                gloc_filter_init, gloc_filter_done,
//                known_vibrating_square_at, gather_locs_interesting,
//                gather_locs, dxdy_to_dist_descr, coord_desc,
//                auto_describe, getpos_menu, truncate_to_map,
//                getpos_refresh, getpos
//
// getpos.c handles the cursor-positioning UI used by look, teleport targeting,
//   monster detection, and similar commands:
//   getpos(ccp, force, goal): main function for cursor movement/selection.
//   gather_locs(): collects interesting targets sorted by distance.
//   auto_describe(): describes map feature at cursor location.
//   gloc_filter_*: flood-fill area filtering for location selection.
//   getpos_menu(): menu-based target selection.
//
// JS implementations: none — cursor/targeting UI is handled by display.js/input.js.

// cf. getpos.c:41 — getpos_sethilite(gp_hilitef, gp_getvalidf): set highlight functions
// Sets the highlighting callback and validity check for cursor positioning.
// TODO: getpos.c:41 — getpos_sethilite(): highlight function setup

// cf. getpos.c:72 [static] — getpos_toggle_hilite_state(void): cycle highlight
// Cycles through available highlight display states for valid positions.
// TODO: getpos.c:72 — getpos_toggle_hilite_state(): highlight state cycle

// cf. getpos.c:94 — mapxy_valid(x, y): map coordinate validity
// Returns TRUE if coordinate passes current positioning filter.
// TODO: getpos.c:94 — mapxy_valid(): coordinate filter check

// cf. getpos.c:102 [static] — getpos_getvalids_selection(sel, validf): mark valid positions
// Marks all valid positions in selection based on validation function.
// TODO: getpos.c:102 — getpos_getvalids_selection(): valid position marking

// cf. getpos.c:137 [static] — getpos_help_keyxhelp(tmpwin, k1, k2, gloc): key help
// Displays help text for keyboard shortcuts for specific location types.
// TODO: getpos.c:137 — getpos_help_keyxhelp(): key help display

// cf. getpos.c:167 [static] — getpos_help(force, goal): cursor help display
// Shows comprehensive help menu for cursor positioning and target selection.
// TODO: getpos.c:167 — getpos_help(): cursor positioning help

// cf. getpos.c:312 [static] — cmp_coord_distu(a, b): coordinate distance sort
// Sorts coordinates by Chebyshev distance from player position.
// TODO: getpos.c:312 — cmp_coord_distu(): distance-based sort comparator

// cf. getpos.c:341 [static] — gloc_filter_classify_glyph(glyph): glyph classification
// Classifies map glyphs into terrain categories for location filtering.
// TODO: getpos.c:341 — gloc_filter_classify_glyph(): glyph category

// cf. getpos.c:364 [static] — gloc_filter_floodfill_matcharea(x, y): area match check
// Checks if location matches the area type for flood-fill region detection.
// TODO: getpos.c:364 — gloc_filter_floodfill_matcharea(): area match check

// cf. getpos.c:382 [static] — gloc_filter_floodfill(x, y): flood-fill area
// Flood-fills map to find contiguous area of similar terrain type.
// TODO: getpos.c:382 — gloc_filter_floodfill(): terrain area flood-fill

// cf. getpos.c:391 [static] — gloc_filter_init(void): init area filtering
// Initializes area filtering system for cursor positioning.
// TODO: getpos.c:391 — gloc_filter_init(): area filter initialization

// cf. getpos.c:412 [static] — gloc_filter_done(void): cleanup area filtering
// Frees resources used by area filtering.
// TODO: getpos.c:412 — gloc_filter_done(): area filter cleanup

// cf. getpos.c:422 [static] — known_vibrating_square_at(x, y): vibrating square check
// Returns TRUE if a known vibrating square trap is at the location.
// TODO: getpos.c:422 — known_vibrating_square_at(): vibrating square detection

// cf. getpos.c:438 — gather_locs_interesting(x, y, gloc): interesting location?
// Checks if map location contains a target interesting for cursor positioning.
// TODO: getpos.c:438 — gather_locs_interesting(): interesting location test

// cf. getpos.c:513 [static] — gather_locs(arr_p, cnt_p, gloc): gather target locations
// Collects all interesting locations matching filter and sorts by distance.
// TODO: getpos.c:513 — gather_locs(): target location collection

// cf. getpos.c:557 — dxdy_to_dist_descr(dx, dy, fulldir): direction description
// Converts relative coordinates to descriptive direction string.
// TODO: getpos.c:557 — dxdy_to_dist_descr(): direction description

// cf. getpos.c:595 — coord_desc(x, y, outbuf, cmode): coordinate description
// Formats coordinate description based on selected output mode.
// TODO: getpos.c:595 — coord_desc(): coordinate formatting

// cf. getpos.c:640 — auto_describe(cx, cy): auto-describe map feature at cursor
// Describes the map feature, object, or monster at cursor position.
// TODO: getpos.c:640 — auto_describe(): cursor position description

// cf. getpos.c:665 — getpos_menu(ccp, gloc): menu-based target selection
// Displays a menu of interesting targets gathered by gather_locs().
// TODO: getpos.c:665 — getpos_menu(): target selection menu

// cf. getpos.c:729 [static] — truncate_to_map(cx, cy, dx, dy): clamp to map bounds
// Adjusts movement vector to keep cursor within map boundaries.
// TODO: getpos.c:729 — truncate_to_map(): cursor boundary clamping

// cf. getpos.c:753 [static] — getpos_refresh(void): refresh screen display
// Refreshes screen and re-applies highlighting after redraw command.
// TODO: getpos.c:753 — getpos_refresh(): cursor display refresh

// cf. getpos.c:771 — getpos(ccp, force, goal): main cursor positioning
// Main cursor-movement UI loop; handles keyboard/mouse input for target selection.
// TODO: getpos.c:771 — getpos(): cursor positioning UI
