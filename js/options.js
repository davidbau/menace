// options.js -- Game options parsing, initialization, and menu
// cf. options.c — initoptions, initoptions_init, initoptions_finish,
//                 match_optname, determine_ambiguities, txt2key,
//                 doset_simple, doset_simple_menu, option_help,
//                 next_opt, show_menu_controls, enhance_menu_text,
//                 dotogglepickup, add_autopickup_exception,
//                 remove_autopickup_exception, free_autopickup_exceptions,
//                 check_autopickup_exceptions (see pickup.c),
//                 fruitadd, change_inv_order, warning_opts,
//                 assign_warnings, parsebindings, msgtype_add,
//                 msgtype_free, msgtype_parse_add, hide_unhide_msgtypes,
//                 parse_role_opt, get_option_value, all_options_strbuf,
//                 set_option_mod_status, set_wc_option_mod_status,
//                 set_wc2_option_mod_status, set_playmode,
//                 add_menu_cmd_alias, get_menu_cmd_key, map_menu_cmd,
//                 oc_to_str, perm_invent_toggled (see invent.c),
//                 check_perm_invent_again, nh_getenv,
//                 saveoptvals, restoptvals, freeroleoptvals,
//                 pfxfn_cond_, pfxfn_IBM_, pfxfn_font,
//                 optfn_alignment, optfn_gender, optfn_race, optfn_role,
//                 optfn_hilite_status, optfn_autounlock,
//                 optfn_altkeyhandling, optfn_boolean,
//                 optfn_o_autopickup_exceptions, optfn_o_bind_keys,
//                 optfn_o_autocomplete, optfn_o_menu_colors,
//                 optfn_o_message_types, optfn_o_status_cond,
//                 optfn_o_status_hilites,
//                 [~100 additional static optfn_* / handler_* functions]
//
// options.c handles all game option processing:
//   initoptions(): process options including SYSCF file.
//   initoptions_finish(): process runtime config file and NETHACKOPTIONS.
//   doset_simple(): user-friendly options menu for subset of choices.
//   parsebindings(): parse key:command binding specifications.
//   fruitadd(): add or get fruit type.
//   msgtype_parse_add(): parse and add message type filter.
//   parse_role_opt(): parse role/race/gender/alignment option value.
//
// JS implementations:
//   options_menu.js:103 — getTotalPages(showHelp)
//   options_menu.js:108 — normalizeOptionsPage(page, showHelp)
//   options_menu.js:112 — getVisibleOptions(page, showHelp)
//   options_menu.js:132 — getOptionByKey(page, showHelp, key)
//   options_menu.js:144 — renderOptionsMenu(page, showHelp, flags)
//   options_menu.js:290 — getOptionValue(opt, flags)
//   options_menu.js:349 — toggleOption(page, key, flags)
//   options_menu.js:358 — setOptionValue(page, showHelp, key, rawValue, flags)
//   config.js: stores option values and handles configuration

// cf. options.c:7064 — initoptions(void): process all options
// Processes options including the SYSCF system config file.
// TODO: options.c:7064 — initoptions(): full options initialization

// cf. options.c:7119 — initoptions_init(void): set option defaults
// Sets default values for options where 0/False is insufficient.
// TODO: options.c:7119 — initoptions_init(): option defaults initialization

// cf. options.c:7305 — initoptions_finish(void): process runtime config
// Processes user's runtime configuration file and NETHACKOPTIONS env var.
// TODO: options.c:7305 — initoptions_finish(): runtime config processing

// cf. options.c:6956 — txt2key(txt): convert text to character
// Converts text to a single-byte character; moved from cmd.c.
// TODO: options.c:6956 — txt2key(): text to key character conversion

// cf. options.c:6746 — match_optname(user_string, optn_name, min_length): option name matching
// Checks if a user string matches an option name with minimum length.
// TODO: options.c:6746 — match_optname(): option name matching

// cf. options.c:6688 [static] — determine_ambiguities(void): set minimum option match lengths
// Sets minmatch values for option name uniqueness determination.
// TODO: options.c:6688 — determine_ambiguities(): option ambiguity resolution

// cf. options.c:6724 [static] — length_without_val(user_string, len): option name length
// Calculates option name length excluding value portion.
// TODO: options.c:6724 — length_without_val(): option name length calculation

// cf. options.c:6758 — reset_duplicate_opt_detection(void): reset duplicate detection state
// Resets duplicate option detection state.
// TODO: options.c:6758 — reset_duplicate_opt_detection(): duplicate detection reset

// cf. options.c:6797 [static] — rejectoption(optname): reject invalid option
// Rejects an invalid option name with error message.
// TODO: options.c:6797 — rejectoption(): invalid option rejection

// cf. options.c:6833 — nh_getenv(ev): get environment variable
// Gets an environment variable with error printing.
// N/A: options.c:6833 — nh_getenv() (no environment variables in browser)

// cf. options.c:6846 [static] — nmcpy(dest, src, maxlen): safe string copy
// Safe string copy up to maxlen-1 characters.
// TODO: options.c:6846 — nmcpy(): bounded string copy

// cf. options.c:8722 [static] — doset_simple_menu(void): simple options menu display
// Displays and handles the single-option menu for simple option setting.
// JS equiv: options_menu.js:144 — renderOptionsMenu()
// PARTIAL: options.c:8722 — doset_simple_menu() ↔ options_menu.js:144

// cf. options.c:8780 — doset_simple(void): user-friendly options menu
// User-friendly options menu for subset of choices.
// JS equiv: options_menu.js (various functions)
// PARTIAL: options.c:8780 — doset_simple() ↔ options_menu.js

// cf. options.c:9100 — show_menu_controls(win, dolist): display menu control keys
// Displays keys for menu actions.
// TODO: options.c:9100 — show_menu_controls(): menu control key display

// cf. options.c:9286 — dotogglepickup(void): toggle autopickup
// Toggles autopickup on/off.
// JS equiv: commands.js:3459 — handleTogglePickup()
// PARTIAL: options.c:9286 — dotogglepickup() ↔ commands.js:3459

// cf. options.c:9307 — add_autopickup_exception(mapping): add autopickup exception
// Adds an autopickup exception mapping.
// TODO: options.c:9307 — add_autopickup_exception(): autopickup exception add

// cf. options.c:9356 [static] — remove_autopickup_exception(whichape): remove autopickup exception
// Removes a specific autopickup exception.
// TODO: options.c:9356 — remove_autopickup_exception(): autopickup exception removal

// cf. options.c:9379 — free_autopickup_exceptions(void): free autopickup exceptions
// Frees all autopickup exceptions.
// TODO: options.c:9379 — free_autopickup_exceptions(): autopickup exception cleanup

// cf. options.c:9469 — option_help(void): display option help
// Displays help for all options.
// TODO: options.c:9469 — option_help(): option help display

// cf. options.c:9685 — all_options_strbuf(sbuf): build options string buffer
// Returns strbuf of all options for file writing.
// TODO: options.c:9685 — all_options_strbuf(): full options string

// cf. options.c:9762 — next_opt(datawin, str): print next boolean option
// Prints next boolean option on same or new line.
// TODO: options.c:9762 — next_opt(): option line printing

// cf. options.c:9859 — set_option_mod_status(optnam, status): set option modification status
// Sets option modification status flag.
// TODO: options.c:9859 — set_option_mod_status(): option modification flag

// cf. options.c:9885 — set_wc_option_mod_status(optmask, status): set wc option status
// Sets window configuration option status.
// TODO: options.c:9885 — set_wc_option_mod_status(): wc option status

// cf. options.c:9939 — set_wc2_option_mod_status(optmask, status): set wc2 option status
// Sets secondary window configuration option status.
// TODO: options.c:9939 — set_wc2_option_mod_status(): wc2 option status

// cf. options.c:10138 — set_playmode(void): set wizard mode
// Sets up wizard mode if requested.
// TODO: options.c:10138 — set_playmode(): play mode setup

// cf. options.c:10164 — enhance_menu_text(buf, sz, whichpass, bool_p): enhance menu option text
// Enhances menu text for display of option entries.
// TODO: options.c:10164 — enhance_menu_text(): option menu text enhancement

// cf. options.c:7481 [static] — change_inv_order(op): change inventory order
// Changes inventory order from a new order string.
// TODO: options.c:7481 — change_inv_order(): inventory order change

// cf. options.c:7536 [static] — warning_opts(opts, optype): parse warning options
// Parses warning option value.
// TODO: options.c:7536 — warning_opts(): warning option parsing

// cf. options.c:7556 — assign_warnings(graph_chars): assign warning chars
// Matches warning value from PC configuration files.
// TODO: options.c:7556 — assign_warnings(): warning character assignment

// cf. options.c:7611 — parsebindings(bindings): parse key bindings
// Parses key:command binding specifications.
// TODO: options.c:7611 — parsebindings(): key binding parsing

// cf. options.c:7772 — msgtype_free(void): free message type filters
// Frees the message type filter list.
// TODO: options.c:7772 — msgtype_free(): message type filter cleanup

// cf. options.c:7830 — hide_unhide_msgtypes(hide, hide_mask): toggle message type visibility
// Toggles message type visibility.
// TODO: options.c:7830 — hide_unhide_msgtypes(): message type visibility toggle

// cf. options.c:7859 — msgtype_parse_add(str): parse and add message type filter
// Parses and adds a message type filter from string.
// TODO: options.c:7859 — msgtype_parse_add(): message type filter addition

// cf. options.c:7925 [static] — test_regex_pattern(str, errmsg): validate regex
// Validates a regular expression pattern.
// TODO: options.c:7925 — test_regex_pattern(): regex pattern validation

// cf. options.c:7936 — parse_role_opt(optidx, negated, fullname, op): parse role option
// Parses role/race/gender/alignment option value.
// TODO: options.c:7936 — parse_role_opt(): role/race option parsing

// cf. options.c:8036 [static] — get_cnf_role_opt(optidx): get saved role option
// Fetches saved role option value for config file.
// TODO: options.c:8036 — get_cnf_role_opt(): saved role option fetch

// cf. options.c:8077 — oc_to_str(src, dest): object class to string
// Converts object class string to default symbols.
// TODO: options.c:8077 — oc_to_str(): object class symbol conversion

// cf. options.c:8095 — add_menu_cmd_alias(from_ch, to_ch): add menu command alias
// Adds a mapping to the menu command map list.
// TODO: options.c:8095 — add_menu_cmd_alias(): menu command alias

// cf. options.c:8109 — get_menu_cmd_key(ch): get menu command key mapping
// Gets the menu command key mapping for a character.
// TODO: options.c:8109 — get_menu_cmd_key(): menu key mapping

// cf. options.c:8126 — map_menu_cmd(ch): map character to menu command
// Maps a character to its corresponding menu command.
// TODO: options.c:8126 — map_menu_cmd(): menu command mapping

// cf. options.c:8185 — fruitadd(str, replace_fruit): add or get fruit type
// Adds or gets a fruit type with optional replacement.
// TODO: options.c:8185 — fruitadd(): fruit type management

// cf. options.c:5470 [static] — can_set_perm_invent(void): check if perminv can be toggled
// Tests whether permanent inventory can be toggled on.
// TODO: options.c:5470 — can_set_perm_invent(): permanent inventory toggle eligibility

// cf. options.c:5517 — check_perm_invent_again(void): sync perminv after option toggle
// Handles permanent inventory sync after option toggle.
// TODO: options.c:5517 — check_perm_invent_again(): post-toggle perminv sync

// cf. options.c:790 — saveoptvals(nhfp): save option strings
// Puts roleoptvals into save file for #saveoptions.
// N/A: options.c:790 — saveoptvals() (JS uses storage.js)

// cf. options.c:837 — restoptvals(nhfp): restore option strings
// Gets roleoptvals from save file during restore.
// N/A: options.c:837 — restoptvals() (JS uses storage.js)

// cf. options.c:801 — freeroleoptvals(void): free saved option strings
// Discards all saved option strings.
// TODO: options.c:801 — freeroleoptvals(): saved option string cleanup

// cf. options.c:904 — optfn_alignment(...): handle alignment option
// Handles the alignment option setting.
// TODO: options.c:904 — optfn_alignment(): alignment option handler

// cf. options.c:1795 — optfn_gender(...): handle gender option
// Handles the gender option setting.
// TODO: options.c:1795 — optfn_gender(): gender option handler

// cf. options.c:3518 — optfn_race(...): handle race option
// Handles the race option setting.
// TODO: options.c:3518 — optfn_race(): race option handler

// cf. options.c:3600 — optfn_role(...): handle role option
// Handles the role option setting.
// TODO: options.c:3600 — optfn_role(): role option handler

// cf. options.c:1085 — optfn_autounlock(...): handle autounlock option
// Handles the autounlock method option.
// TODO: options.c:1085 — optfn_autounlock(): autounlock option handler

// cf. options.c:1041 — optfn_altkeyhandling(...): handle alternate key handling option
// Handles alternate key handling option.
// TODO: options.c:1041 — optfn_altkeyhandling(): alternate key option handler

// cf. options.c:5197 [static] — optfn_boolean(...): general boolean option handler
// General boolean option handler for togglable options.
// TODO: options.c:5197 — optfn_boolean(): boolean option handler

// cf. options.c:5002 — pfxfn_cond_(...): condition option prefix handler
// Prefix handler for condition options.
// TODO: options.c:5002 — pfxfn_cond_(): condition prefix handler

// cf. options.c:5042 [static] — pfxfn_font(...): font option prefix handler
// Prefix handler for font-related options.
// TODO: options.c:5042 — pfxfn_font(): font prefix handler

// cf. options.c:5173 — pfxfn_IBM_(...): IBM graphics prefix handler
// Prefix handler for IBM graphics options.
// TODO: options.c:5173 — pfxfn_IBM_(): IBM graphics prefix handler

// cf. options.c:1870 — optfn_hilite_status(...): handle status highlighting option
// Handles the status highlighting option.
// TODO: options.c:1870 — optfn_hilite_status(): status highlight option handler

// cf. options.c:8319 [static] — optfn_o_autopickup_exceptions(...): autopickup exception editor
// Handles autopickup exception editing.
// TODO: options.c:8319 — optfn_o_autopickup_exceptions(): autopickup exception editor

// cf. options.c:8341 [static] — optfn_o_bind_keys(...): key binding editor
// Handles key binding editing.
// TODO: options.c:8341 — optfn_o_bind_keys(): key binding editor

// cf. options.c:8384 [static] — optfn_o_menu_colors(...): menu color editor
// Handles menu color editing.
// TODO: options.c:8384 — optfn_o_menu_colors(): menu color editor

// cf. options.c:8409 — optfn_o_message_types(...): message type filter editor
// Handles message type filtering.
// TODO: options.c:8409 — optfn_o_message_types(): message type editor

// cf. options.c:8434 — optfn_o_status_cond(...): status condition option
// Handles status condition option.
// TODO: options.c:8434 — optfn_o_status_cond(): status condition option handler

// cf. options.c:8466 — optfn_o_status_hilites(...): status highlight editor
// Handles status highlight editing.
// TODO: options.c:8466 — optfn_o_status_hilites(): status highlight editor

// cf. options.c:8496 — get_option_value(optname, cnfvalid): get option string value
// Gets string value of a configuration option.
// JS equiv: options_menu.js:290 — getOptionValue()
// PARTIAL: options.c:8496 — get_option_value() ↔ options_menu.js:290

// NOTE: options.c contains approximately 100 additional static optfn_* handler
// functions (one per option type) and handler_* functions for interactive editing.
// These are all TODO and follow the same pattern as the representative examples above.
