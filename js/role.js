// role.js -- Role/race/gender/alignment selection and validation
// cf. role.c — roles[] data table, validrole, randrole, randrole_filtered,
//              str2role, validrace, randrace, str2race, validgend, randgend,
//              str2gend, validalign, randalign, str2align, ok_role, pick_role,
//              ok_race, pick_race, ok_gend, pick_gend, ok_align, pick_align,
//              rigid_role_checks, setrolefilter, gotrolefilter,
//              rolefilterstring, clearrolefilter, role_gendercount,
//              race_alignmentcount, root_plselection_prompt,
//              build_plselection_prompt, plnamesuffix, role_selection_prolog,
//              role_menu_extra, role_init, Hello, Goodbye, character_race,
//              genl_player_selection, genl_player_setup, reset_role_filtering,
//              setup_rolemenu, setup_racemenu, setup_gendmenu, setup_algnmenu,
//              maybe_skip_seps, plsel_startmenu, promptsep
//
// role.c contains:
//   1. roles[] array (lines 30–710): large const struct array defining all 13
//      player roles (Archeologist, Barbarian, Caveman, Healer, Knight, Monk,
//      Priest, Ranger, Rogue, Samurai, Tourist, Valkyrie, Wizard) with their
//      starting stats, quests, gods, titles, and allowed race/gender/alignment.
//   2. Validation functions: validrole/race/gend/align check a specific index;
//      ok_role/race/gend/align check compatibility across all four attributes.
//   3. Random selection: randrole/randrace/randgend/randalign pick randomly with
//      constraints; pick_role/race/gend/align use pickhow (PICK_RANDOM/PICK_RIGID).
//   4. String parsing: str2role/race/gend/align parse user-supplied strings
//      (including '-' for random and name prefixes).
//   5. Filter system: setrolefilter/clearrolefilter/gotrolefilter manage
//      persistent exclusion filters for role selection.
//   6. UI: genl_player_selection/genl_player_setup present the selection menu;
//      setup_rolemenu/racemenu/gendmenu/algnmenu populate submenus.
//   7. role_init(): finalizes role choice; sets up quest leader/nemesis/gods.
//
// JS implementations:
//   roles[] data → player.js (roles array with JS-native role data)
//   ok_role/ok_race/ok_gend/ok_align → nethack.js:482 (filter checks in char creation)
//   plnamesuffix() → nethack.js:360 (name suffix parsing in askname flow)
//   role_init() → nethack.js:1126 + u_init.js:891 (partial — Priest god assignment + skill remapping)
//   Hello() → player.js:325 (returns role.greeting from roles array)
//   Goodbye() → nethack.js:1914 (inlined farewell message)
//   genl_player_selection → nethack.js (character creation flow, partial)
// All other functions → not implemented in JS.

// cf. role.c:30 [data] — roles[]: player role definition table
// 13 roles × ~50 fields each: starting stats, quest NPC types, god names,
//   rank titles, allowed races/genders/alignments, starting skills.
// JS equiv: player.js — JS roles array with adapted structure.
// PARTIAL: role.c:30 — roles[] ↔ player.js roles array

// cf. role.c — validrole(rolenum): is rolenum a valid role index?
// Returns TRUE for 0 ≤ rolenum < SIZE(roles)-1.
// TODO: role.c — validrole(): role index bounds check

// cf. role.c — randrole(for_display): random role index
// for_display=TRUE: use display RNG (rnd_seed); else normal rn2().
// TODO: role.c — randrole(): random role selection

// cf. role.c — randrole_filtered(): random role passing all filters
// Excludes roles blocked by setrolefilter() constraints.
// TODO: role.c — randrole_filtered(): filtered random role

// cf. role.c — str2role(str): parse string to role index
// Matches name, filecode (e.g., "Bar"), or '*' for random.
// Returns role index or ROLE_NONE / ROLE_RANDOM.
// TODO: role.c — str2role(): string to role index

// cf. role.c — validrace(rolenum, racenum): is race valid for role?
// Returns TRUE if races[racenum].allow & roles[rolenum].allow & mask.
// TODO: role.c — validrace(): race-role compatibility check

// cf. role.c — randrace(rolenum): random race valid for role
// Picks randomly from valid races for the given role.
// TODO: role.c — randrace(): random race selection

// cf. role.c — str2race(str): parse string to race index
// Matches noun, adjective, filecode ('H', 'E', 'O', 'G'), or '*'.
// TODO: role.c — str2race(): string to race index

// cf. role.c — validgend(rolenum, racenum, gendnum): is gender valid?
// Returns TRUE if the role or race allows the given gender.
// TODO: role.c — validgend(): gender validity check

// cf. role.c — randgend(rolenum, racenum): random gender for role/race
// TODO: role.c — randgend(): random gender selection

// cf. role.c — str2gend(str): parse string to gender index
// Matches "male"/"female" or filecode 'M'/'F', or '*'.
// TODO: role.c — str2gend(): string to gender index

// cf. role.c — validalign(rolenum, racenum, alignnum): is alignment valid?
// Returns TRUE if role and race both allow the given alignment.
// TODO: role.c — validalign(): alignment validity check

// cf. role.c — randalign(rolenum, racenum): random alignment for role/race
// TODO: role.c — randalign(): random alignment selection

// cf. role.c — str2align(str): parse string to alignment index
// Matches "lawful"/"neutral"/"chaotic" prefixes or filecode 'L'/'N'/'C', or '*'.
// TODO: role.c — str2align(): string to alignment index

// cf. role.c — ok_role(rolenum, racenum, gendnum, alignnum): role compatible?
// Full cross-check: rolenum is valid AND compatible with race/gender/align.
// JS equiv: nethack.js:482 — partial filter check during char creation.
// PARTIAL: role.c — ok_role() ↔ nethack.js:482

// cf. role.c — pick_role(racenum, gendnum, alignnum, pickhow): pick a role
// pickhow: PICK_RANDOM selects randomly; PICK_RIGID requires all constraints.
// TODO: role.c — pick_role(): constrained role selection

// cf. role.c — ok_race(rolenum, racenum, gendnum, alignnum): race compatible?
// JS equiv: nethack.js:482 — partial filter check.
// PARTIAL: role.c — ok_race() ↔ nethack.js:482

// cf. role.c — pick_race(rolenum, gendnum, alignnum, pickhow): pick a race
// TODO: role.c — pick_race(): constrained race selection

// cf. role.c — ok_gend(rolenum, racenum, gendnum, alignnum): gender compatible?
// JS equiv: nethack.js:482 — partial filter check.
// PARTIAL: role.c — ok_gend() ↔ nethack.js:482

// cf. role.c — pick_gend(rolenum, racenum, alignnum, pickhow): pick a gender
// TODO: role.c — pick_gend(): constrained gender selection

// cf. role.c — ok_align(rolenum, racenum, gendnum, alignnum): alignment compatible?
// JS equiv: nethack.js:482 — partial filter check.
// PARTIAL: role.c — ok_align() ↔ nethack.js:482

// cf. role.c — pick_align(rolenum, racenum, gendnum, pickhow): pick an alignment
// TODO: role.c — pick_align(): constrained alignment selection

// cf. role.c — rigid_role_checks(): auto-select forced role attributes
// If a role forces alignment (e.g., Monk must be neutral), sets it automatically.
// Called after plnamesuffix to resolve conflicts.
// TODO: role.c — rigid_role_checks(): forced-attribute resolution

// cf. role.c — setrolefilter(bufp): add role/race/gender/alignment exclusion filter
// Parses filter string and adds to persistent filter constraints.
// TODO: role.c — setrolefilter(): add exclusion filter

// cf. role.c — gotrolefilter(): are any filters active?
// Returns TRUE if any exclusion filters are currently set.
// TODO: role.c — gotrolefilter(): filter existence check

// cf. role.c — rolefilterstring(outbuf, which): build filter string for saving
// Encodes current filters as a string for options file storage.
// TODO: role.c — rolefilterstring(): serialize filter state

// cf. role.c — clearrolefilter(which): clear filter category
// Clears role, race, gender, alignment, or all filters.
// TODO: role.c — clearrolefilter(): clear filter

// cf. role.c [static] — promptsep(buf, num_post_attribs): grammatical separator
// Adds ", " or " and " when building attribute prompts (internal helper).
// TODO: role.c — promptsep(): prompt separator helper

// cf. role.c — role_gendercount(rolenum): count valid genders for role
// Returns 1 if role forces a gender, 2 otherwise.
// TODO: role.c — role_gendercount(): gender option count

// cf. role.c — race_alignmentcount(racenum): count valid alignments for race
// Returns number of alignments allowed by the race.
// TODO: role.c — race_alignmentcount(): alignment option count

// cf. role.c — root_plselection_prompt(buf, buflen, rolenum, racenum, gendnum, alignnum)
// Builds core description of chosen attributes for selection prompt.
// TODO: role.c — root_plselection_prompt(): core prompt string

// cf. role.c — build_plselection_prompt(buf, buflen, rolenum, racenum, gendnum, alignnum)
// Builds complete "Shall I pick a character for you?" prompt.
// TODO: role.c — build_plselection_prompt(): complete selection prompt

// cf. role.c — plnamesuffix(): parse player name suffix tokens
// Parses role/race/gender/alignment suffixes from player name (e.g., name-Bar-M-C).
// JS equiv: nethack.js:360 — partial name suffix parsing in askname flow.
// PARTIAL: role.c — plnamesuffix() ↔ nethack.js:360

// cf. role.c — role_selection_prolog(which, where): display current selections
// Shows current name/role/race/gender/alignment settings in the selection window.
// TODO: role.c — role_selection_prolog(): selection status display

// cf. role.c — role_menu_extra(which, where, preselect): add special menu entries
// Adds "pick first", "constraints", "random", "quit" entries to role menu.
// TODO: role.c — role_menu_extra(): special menu entries

// cf. role.c — role_init(): initialize and validate final role choice
// Sets up quest leader/nemesis/guardian, pantheon, skill slots, and attribute
//   adjustments for the chosen role.
// JS equiv: nethack.js:1126 (Priest god assignment) + u_init.js:891 (skill remapping).
// PARTIAL: role.c — role_init() ↔ nethack.js:1126 + u_init.js:891

// cf. role.c — Hello(mtmp): role-specific greeting string
// Returns "Hello" or role-specific variant (e.g., "Hail" for Knight).
// JS equiv: player.js:325 — returns role.greeting from roles array.
// PARTIAL: role.c — Hello() ↔ player.js:325

// cf. role.c — Goodbye(): role-specific farewell string
// Returns "Goodbye" or role-specific variant.
// JS equiv: nethack.js:1914 — inlined farewell message.
// PARTIAL: role.c — Goodbye() ↔ nethack.js:1914

// cf. role.c — character_race(pmindex): race struct for player monster type
// Returns pointer to races[] entry for given monster type, or NULL.
// Used to check if a monster type is a playable race.
// TODO: role.c — character_race(): player monster to race mapping

// cf. role.c — genl_player_selection(): entry point for player selection UI
// Calls genl_player_setup() for TTY/curses interface.
// JS equiv: nethack.js character creation flow (partial).
// PARTIAL: role.c — genl_player_selection() ↔ nethack.js char creation

// cf. role.c — genl_player_setup(screenheight): main selection menu interface
// Handles role/race/gender/alignment menus with confirmation; supports filtering.
// JS equiv: nethack.js character creation flow (partial).
// PARTIAL: role.c — genl_player_setup() ↔ nethack.js char creation

// cf. role.c — reset_role_filtering(): interactive filter reset menu
// Presents menu to set or clear role/race/gender/alignment exclusion filters.
// TODO: role.c — reset_role_filtering(): filter reset UI

// cf. role.c [static] — maybe_skip_seps(rows, aspect): skip separators for menu fit
// Calculates how many separator lines to skip to fit role menu on given screen height.
// TODO: role.c — maybe_skip_seps(): separator skip calculation

// cf. role.c [static] — plsel_startmenu(ttyrows, aspect): create selection menu window
// Initializes role selection menu with current choices as header lines.
// TODO: role.c — plsel_startmenu(): selection menu initialization

// cf. role.c — setup_rolemenu(win, filtering, race, gend, algn): populate role menu
// Adds available role choices to selection menu, filtered by constraints.
// TODO: role.c — setup_rolemenu(): role choice menu population

// cf. role.c — setup_racemenu(win, filtering, role, gend, algn): populate race menu
// TODO: role.c — setup_racemenu(): race choice menu population

// cf. role.c — setup_gendmenu(win, filtering, role, race, algn): populate gender menu
// TODO: role.c — setup_gendmenu(): gender choice menu population

// cf. role.c — setup_algnmenu(win, filtering, role, race, gend): populate alignment menu
// TODO: role.c — setup_algnmenu(): alignment choice menu population
