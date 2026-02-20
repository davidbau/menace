// cmd.js -- Command dispatch, key bindings, directional input
// cf. cmd.c — json_write_escaped, harness_dump_checkpoint, doprev_message,
//             timed_occupation, reset_occupations, set_occupation,
//             cmdq_add_ec, cmdq_add_key, cmdq_add_dir, cmdq_add_userinput,
//             cmdq_add_int, cmdq_shift, cmdq_reverse, cmdq_copy, cmdq_pop,
//             cmdq_peek, cmdq_clear, extcmd_initiator, can_do_extcmd,
//             doextcmd, doextlist, extcmd_via_menu, domonability,
//             enter_explore_mode, makemap_prepost, wiz_dumpmap, wiz_dumpobj,
//             wiz_dumpsnap, levltyp_to_name, doterrain,
//             u_have_seen_whole_selection, u_have_seen_bounds_selection,
//             u_can_see_whole_selection, dolookaround_floodfill_findroom,
//             lookaround_known_room, dolookaround, set_move_cmd,
//             do_move_{N,S,E,W,NE,NW,SE,SW}, do_rush_{N,S,E,W,NE,NW,SE,SW},
//             do_run_{N,S,E,W,NE,NW,SE,SW}, do_reqmenu, do_rush, do_run,
//             do_fight, do_repeat, extcmds_getentry, count_bind_keys,
//             get_changed_key_binds, handler_rebind_keys_add, handler_rebind_keys,
//             handler_change_autocompletions, extcmds_match, key2extcmddesc,
//             bind_mousebtn, bind_key, bind_key_fn, commands_init, dokeylist,
//             ext_func_tab_from_func, cmd_from_dir, cmd_from_func,
//             cmd_from_ecname, ecname_from_fn, bind_specialkey, spkey_name,
//             key2txt, parseautocomplete, all_options_autocomplete,
//             count_autocompletions, lock_mouse_buttons, reset_commands,
//             update_rest_on_space, accept_menu_prefix, randomkey,
//             random_response, rnd_extcmd_idx, reset_cmd_vars, rhack,
//             xytod, dtoxy, movecmd, dxdy_moveok, redraw_cmd,
//             get_adjacent_loc, getdir, dosuspend_core, dosh_core, dummyfunction
//
// cmd.c is the command dispatch and input processing module:
//   rhack(key): main command loop — reads/processes keystrokes.
//   set_occupation/reset_occupations: multi-turn action management.
//   cmdq_*: command queue for replaying/scripted sequences.
//   doextcmd/doextlist/extcmd_via_menu: extended command (#-prefix) handling.
//   commands_init/bind_key: keyboard binding initialization.
//   getdir/movecmd/xytod/dtoxy: directional input processing.
//   do_move_*/do_rush_*/do_run_*: movement command callbacks (24 functions).
//   dolookaround: #look command for room description.
//
// JS implementations:
//   rhack → commands.js:261 (PARTIAL — main command dispatch)
//   dosearch0 → commands.js:3818 (PARTIAL)
//   drinkfountain → commands.js:3184 (PARTIAL)
//   getdir → input.js (browser input handling)
//   harness_dump_checkpoint → harness.js (test harness only)

// cf. cmd.c:155 [static] — json_write_escaped(fp, s): JSON string escape
// Writes JSON-escaped form of s to file (used by harness_dump_checkpoint).
// N/A: cmd.c:155 — json_write_escaped() (file I/O only)

// cf. cmd.c:175 — harness_dump_checkpoint(phase): dump game state snapshot
// Writes JSON snapshot of map/monster/player state to NETHACK_DUMPSNAP file.
// N/A: cmd.c:175 — harness_dump_checkpoint() (JS oracle/ handles this)

// cf. cmd.c:342 [static] — doprev_message(void): show previous message
// Displays the previous message via nh_doprev_message().
// TODO: cmd.c:342 — doprev_message(): previous message display

// cf. cmd.c:350 [static] — timed_occupation(void): countdown timed occupation
// Decrements multi counter for timed occupations.
// TODO: cmd.c:350 — timed_occupation(): occupation countdown

// cf. cmd.c:377 — reset_occupations(void): reset occupation state
// Resets remarm, pick, and trapset occupations when player moves.
// TODO: cmd.c:377 — reset_occupations(): occupation state reset

// cf. cmd.c:388 — set_occupation(fn, txt, xtime): set occupation
// Sets the current occupation function with optional timeout.
// TODO: cmd.c:388 — set_occupation(): occupation setup

// cf. cmd.c:438 — cmdq_add_ec(q, fn): add extended command to queue
// Adds an extended command function pointer to the command queue.
// TODO: cmd.c:438 — cmdq_add_ec(): extended command queue addition

// cf. cmd.c:458 — cmdq_add_key(q, key): add key to queue
// Adds a keyboard key to the command queue.
// TODO: cmd.c:458 — cmdq_add_key(): key queue addition

// cf. cmd.c:478 — cmdq_add_dir(q, dx, dy, dz): add direction to queue
// Adds a directional input to the command queue.
// TODO: cmd.c:478 — cmdq_add_dir(): direction queue addition

// cf. cmd.c:500 — cmdq_add_userinput(q): add user input placeholder to queue
// Adds placeholder for user input in command queue.
// TODO: cmd.c:500 — cmdq_add_userinput(): user input queue addition

// cf. cmd.c:519 — cmdq_add_int(q, val): add integer to queue
// Adds integer value to command queue.
// TODO: cmd.c:519 — cmdq_add_int(): integer queue addition

// cf. cmd.c:539 — cmdq_shift(q): shift queue entry to front
// Moves last command queue entry to front.
// TODO: cmd.c:539 — cmdq_shift(): queue reordering

// cf. cmd.c:557 — cmdq_reverse(head): reverse command queue
// Reverses order of command queue.
// TODO: cmd.c:557 — cmdq_reverse(): queue reversal

// cf. cmd.c:571 — cmdq_copy(q): copy command queue
// Copies entire command queue.
// TODO: cmd.c:571 — cmdq_copy(): queue copying

// cf. cmd.c:594 — cmdq_pop(void): pop from command queue
// Removes and returns next command from queue.
// TODO: cmd.c:594 — cmdq_pop(): queue dequeue

// cf. cmd.c:608 — cmdq_peek(q): peek at command queue
// Peeks at queue without removing entry.
// TODO: cmd.c:608 — cmdq_peek(): queue peek

// cf. cmd.c:615 — cmdq_clear(q): clear command queue
// Removes all entries from command queue.
// TODO: cmd.c:615 — cmdq_clear(): queue clearing

// cf. cmd.c:641 — extcmd_initiator(void): extended command keystroke
// Returns the keystroke that initiates extended commands (#).
// TODO: cmd.c:641 — extcmd_initiator(): extended command key

// cf. cmd.c:647 [static] — can_do_extcmd(extcmd): extended command allowed?
// Checks if extended command is executable given current game state.
// TODO: cmd.c:647 — can_do_extcmd(): extended command feasibility

// cf. cmd.c:677 — doextcmd(void): execute extended command
// Prompts for extended command name and executes it.
// TODO: cmd.c:677 — doextcmd(): extended command execution

// cf. cmd.c:746 — doextlist(void): list extended commands
// Displays list of all available extended commands and their bindings.
// TODO: cmd.c:746 — doextlist(): extended command listing

// cf. cmd.c:936 — extcmd_via_menu(void): menu-based extended command
// Shows menu of extended commands for selection.
// TODO: cmd.c:936 — extcmd_via_menu(): menu command selection

// cf. cmd.c:1074 — domonability(void): invoke monster ability
// Invokes player's current monster form's special ability.
// TODO: cmd.c:1074 — domonability(): monster ability invocation

// cf. cmd.c:1136 — enter_explore_mode(void): enter explore mode
// Switches game to explore (no-death) mode.
// TODO: cmd.c:1136 — enter_explore_mode(): explore mode activation

// cf. cmd.c:1170 — makemap_prepost(pre, wiztower): wizard map generation
// Wizard command for map generation pre/post processing.
// TODO: cmd.c:1170 — makemap_prepost(): wizard map generation

// cf. cmd.c:1258 [static] — wiz_dumpmap(void): dump raw map
// Wizard command to dump raw map typ grid to file.
// TODO: cmd.c:1258 — wiz_dumpmap(): map dump

// cf. cmd.c:1292 [static] — wiz_dumpobj(void): dump floor objects
// Wizard command to dump floor objects in iteration order.
// TODO: cmd.c:1292 — wiz_dumpobj(): floor object dump

// cf. cmd.c:1322 [static] — wiz_dumpsnap(void): dump JSON checkpoint
// Appends JSON level checkpoint snapshot for testing.
// TODO: cmd.c:1322 — wiz_dumpsnap(): checkpoint snapshot

// cf. cmd.c:1356 — levltyp_to_name(typ): terrain type name
// Converts terrain type code integer to string name.
// TODO: cmd.c:1356 — levltyp_to_name(): terrain type name

// cf. cmd.c:1365 [static] — doterrain(void): wizard terrain command
// Wizard command to view or modify terrain types at locations.
// TODO: cmd.c:1365 — doterrain(): wizard terrain command

// cf. cmd.c:1462–1543 [static] — selection visibility helpers
// Check if player has seen or can see selection regions.
// TODO: cmd.c:1462 — u_have_seen_whole_selection(): whole selection seen
// TODO: cmd.c:1480 — u_have_seen_bounds_selection(): bounds seen
// TODO: cmd.c:1513 — u_can_see_whole_selection(): whole selection visible
// TODO: cmd.c:1530 — dolookaround_floodfill_findroom(): room flood-fill
// TODO: cmd.c:1543 — lookaround_known_room(): known room description

// cf. cmd.c:1577 — dolookaround(void): look around command
// Describes all visible objects and terrain types in vicinity.
// TODO: cmd.c:1577 — dolookaround(): look around

// cf. cmd.c:1639 — set_move_cmd(dir, run): set directional move
// Sets up directional movement with walk/run/rush mode.
// TODO: cmd.c:1639 — set_move_cmd(): movement command setup

// cf. cmd.c:1656–1823 — do_move/do_rush/do_run_* (24 functions): movement callbacks
// Eight directions × three modes (move/rush/run): do_move_west, etc.
// TODO: cmd.c:1656 — do_move_{N,S,E,W,NE,NW,SE,SW}(): 8 move callbacks
// TODO: cmd.c:1713 — do_rush_{N,S,E,W,NE,NW,SE,SW}(): 8 rush callbacks
// TODO: cmd.c:1770 — do_run_{N,S,E,W,NE,NW,SE,SW}(): 8 run callbacks

// cf. cmd.c:1827 — do_reqmenu(void): #reqmenu prefix command
// Prefix command to request menu-based variant of next command.
// TODO: cmd.c:1827 — do_reqmenu(): menu prefix command

// cf. cmd.c:1842 — do_rush(void): rush prefix command
// Enables rush movement mode for next directional command.
// TODO: cmd.c:1842 — do_rush(): rush prefix

// cf. cmd.c:1858 — do_run(void): run prefix command
// Enables run movement mode for next directional command.
// TODO: cmd.c:1858 — do_run(): run prefix

// cf. cmd.c:1874 — do_fight(void): fight prefix command
// Forces attack even when no monster is visible.
// TODO: cmd.c:1874 — do_fight(): fight prefix

// cf. cmd.c:1890 — do_repeat(void): repeat previous command
// Repeats the previous command.
// TODO: cmd.c:1890 — do_repeat(): command repeat

// cf. cmd.c:2351 — extcmds_getentry(i): get extended command entry
// Returns the i-th entry from the extended commands table.
// TODO: cmd.c:2351 — extcmds_getentry(): extended command entry

// cf. cmd.c:2360 — count_bind_keys(void): count non-default bindings
// Returns number of extended commands with non-default key bindings.
// TODO: cmd.c:2360 — count_bind_keys(): binding count

// cf. cmd.c:2374 — get_changed_key_binds(sbuf): get changed bindings
// Appends changed key bindings to config buffer.
// TODO: cmd.c:2374 — get_changed_key_binds(): binding export

// cf. cmd.c:2405 [static] — handler_rebind_keys_add(keyfirst): add key binding
// Interactive menu to add key bindings to commands.
// TODO: cmd.c:2405 — handler_rebind_keys_add(): binding addition UI

// cf. cmd.c:2507 — handler_rebind_keys(void): key rebinding menu
// Displays menu for managing key rebindings.
// TODO: cmd.c:2507 — handler_rebind_keys(): key rebinding UI

// cf. cmd.c:2548 — handler_change_autocompletions(void): autocomplete menu
// Menu for toggling command autocompletion settings.
// TODO: cmd.c:2548 — handler_change_autocompletions(): autocomplete UI

// cf. cmd.c:2622 — extcmds_match(findstr, ecmflags, matchlist): match commands
// Finds extended commands matching search string.
// TODO: cmd.c:2622 — extcmds_match(): command matching

// cf. cmd.c:2660 — key2extcmddesc(key): key description
// Returns description of extended command bound to key.
// TODO: cmd.c:2660 — key2extcmddesc(): key command description

// cf. cmd.c:2720 — bind_mousebtn(btn, command): bind mouse button
// Binds mouse button to extended command.
// TODO: cmd.c:2720 — bind_mousebtn(): mouse button binding

// cf. cmd.c:2758 — bind_key(key, command): bind key to command
// Binds keyboard key to extended command by name.
// TODO: cmd.c:2758 — bind_key(): key binding

// cf. cmd.c:2790 [static] — bind_key_fn(key, fn): bind key by function
// Binds a key by function pointer.
// TODO: cmd.c:2790 — bind_key_fn(): function-pointer key binding

// cf. cmd.c:2808 [static] — commands_init(void): initialize command bindings
// Sets up all default keyboard command bindings at startup.
// TODO: cmd.c:2808 — commands_init(): command initialization

// cf. cmd.c:2917 — dokeylist(void): display key list
// Shows all available commands and their key bindings.
// TODO: cmd.c:2917 — dokeylist(): key list display

// cf. cmd.c:3066 — ext_func_tab_from_func(fn): get extended command entry
// Returns extended command table entry for given function pointer.
// TODO: cmd.c:3066 — ext_func_tab_from_func(): command entry from function

// cf. cmd.c:3079 — cmd_from_dir(dir, mode): key for direction command
// Returns key bound to direction+mode (walk/run/rush) command.
// TODO: cmd.c:3079 — cmd_from_dir(): direction command key

// cf. cmd.c:3086 — cmd_from_func(fn): key for command function
// Returns key bound to given extended command function.
// TODO: cmd.c:3086 — cmd_from_func(): function command key

// cf. cmd.c:3119 — cmd_from_ecname(ecname): key for named command
// Returns key or name for extended command by name string.
// TODO: cmd.c:3119 — cmd_from_ecname(): named command key

// cf. cmd.c:3140 — ecname_from_fn(fn): command name from function
// Returns extended command name for given function pointer.
// TODO: cmd.c:3140 — ecname_from_fn(): command name lookup

// cf. cmd.c:3242 — bind_specialkey(key, command): bind special key
// Binds special keys (ESC, direction keys) to commands.
// TODO: cmd.c:3242 — bind_specialkey(): special key binding

// cf. cmd.c:3256 [static] — spkey_name(nhkf): special key name
// Returns name string for a special key function code.
// TODO: cmd.c:3256 — spkey_name(): special key name

// cf. cmd.c:3272 — key2txt(c, txt): key to readable text
// Converts single byte to human-readable text representation.
// TODO: cmd.c:3272 — key2txt(): key text conversion

// cf. cmd.c:3292 — parseautocomplete(autocomplete, condition): parse autocomplete
// Parses and sets autocomplete flags for commands from config.
// TODO: cmd.c:3292 — parseautocomplete(): autocomplete parsing

// cf. cmd.c:3344 — all_options_autocomplete(sbuf): export autocomplete changes
// Writes all changed autocomplete settings to config buffer.
// TODO: cmd.c:3344 — all_options_autocomplete(): autocomplete export

// cf. cmd.c:3360 — count_autocompletions(void): count autocomplete changes
// Returns count of non-default autocomplete settings.
// TODO: cmd.c:3360 — count_autocompletions(): autocomplete count

// cf. cmd.c:3374 — lock_mouse_buttons(savebtns): save/restore mouse bindings
// Saves or restores mouse button bindings (for temporary locking).
// TODO: cmd.c:3374 — lock_mouse_buttons(): mouse binding lock

// cf. cmd.c:3392 — reset_commands(initial): initialize command bindings
// Initializes all command bindings at startup or after config changes.
// TODO: cmd.c:3392 — reset_commands(): command binding initialization

// cf. cmd.c:3534 — update_rest_on_space(void): update space key binding
// Updates space key binding based on rest_on_space option.
// TODO: cmd.c:3534 — update_rest_on_space(): space key binding

// cf. cmd.c:3560 [static] — accept_menu_prefix(ec): accepts menu prefix?
// Returns TRUE if command accepts the menu prefix modifier.
// TODO: cmd.c:3560 — accept_menu_prefix(): menu prefix check

// cf. cmd.c:3568 — randomkey(void): random keyboard key
// Returns a random keyboard key character.
// TODO: cmd.c:3568 — randomkey(): random key

// cf. cmd.c:3632 — random_response(buf, sz): random response character
// Generates random response character for fuzzing.
// TODO: cmd.c:3632 — random_response(): random response

// cf. cmd.c:3652 — rnd_extcmd_idx(void): random extended command index
// Returns random index into extended commands table.
// TODO: cmd.c:3652 — rnd_extcmd_idx(): random command index

// cf. cmd.c:3658 [static] — reset_cmd_vars(reset_cmdq): reset command state
// Resets command-related variables; optionally clears queue.
// TODO: cmd.c:3658 — reset_cmd_vars(): command state reset

// cf. cmd.c:3678 — rhack(key): main command processing loop
// Reads and dispatches user commands; core game command loop.
// JS equiv: commands.js:261 — rhack() (PARTIAL — main command dispatch)
// PARTIAL: cmd.c:3678 — rhack() ↔ commands.js:261

// cf. cmd.c:3895 — xytod(x, y): x,y offset to direction code
// Converts (dx,dy) offset to direction code.
// TODO: cmd.c:3895 — xytod(): offset to direction code

// cf. cmd.c:3906 — dtoxy(cc, dd): direction code to x,y
// Converts direction code to (x,y) offset pair.
// TODO: cmd.c:3906 — dtoxy(): direction to offset

// cf. cmd.c:3917 — movecmd(sym, mode): is sym a movement command?
// Returns TRUE and sets u.dx/dy/dz if sym is a movement keystroke.
// TODO: cmd.c:3917 — movecmd(): movement command check

// cf. cmd.c:3949 — dxdy_moveok(void): diagonal move allowed?
// Returns FALSE if grid bug form prevents diagonal movement.
// TODO: cmd.c:3949 — dxdy_moveok(): diagonal movement check

// cf. cmd.c:3958 — redraw_cmd(c): screen redraw command?
// Returns TRUE if character c is bound to screen redraw.
// TODO: cmd.c:3958 — redraw_cmd(): redraw command check

// cf. cmd.c:3977 — get_adjacent_loc(prompt, emsg, x, y, cc): get adjacent location
// Prompts for direction; validates result is adjacent to (x,y).
// TODO: cmd.c:3977 — get_adjacent_loc(): adjacent location prompt

// cf. cmd.c:4004 — getdir(s): prompt for direction
// Prompts for directional input; sets u.dx/dy/dz from keystroke.
// TODO: cmd.c:4004 — getdir(): directional input prompt

// cf. cmd.c:5706 [static] — dosuspend_core(void): suspend game
// Handles ^Z suspend command (suspends process, shows message if unavailable).
// N/A: cmd.c:5706 — dosuspend_core() (no process suspension in browser)

// cf. cmd.c:5726 [static] — dosh_core(void): shell escape
// Handles ! shell escape command.
// N/A: cmd.c:5726 — dosh_core() (no shell access in browser)

// cf. cmd.c:5743 [static] — dummyfunction(void): dummy command
// Returns ECMD_CANCEL; used as placeholder for disabled commands.
// TODO: cmd.c:5743 — dummyfunction(): disabled command placeholder
