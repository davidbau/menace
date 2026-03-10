import { strchr } from './hacklib.js';
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
//   const.js: stores option values and handles configuration

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
// JS equiv: cmd.js rhack() '@' command route via handleTogglePickup()
// PARTIAL: options.c:9286 — dotogglepickup() ↔ cmd.js handleTogglePickup()

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

// ---------------------------------------------------------------------------
// Minimal C-compat helper surface for translator-stitched options.c functions.
// ---------------------------------------------------------------------------

function pline(_fmt, ..._args) {}

function impossible(_fmt, ..._args) {}

function optn_ok(_msg = null) {
    return true;
}

function optn_err(_msg = null) {
    return false;
}

function do_set(_name, _value = null, _flags = 0) {
    return optn_ok();
}

function get_cnf_val(_name) {
    return null;
}

// Autotranslated from options.c:707
export function check_misc_menu_command(opts, op) {
  let i, name_to_check;
  for (i = 0; default_menu_cmd_info[i].name; i++) {
    name_to_check = default_menu_cmd_info[i].name;
    if (match_optname(opts, name_to_check, name_to_check.length, true)) return i;
  }
  return -1;
}

// Autotranslated from options.c:747
export function getoptstr(optidx, ophase) {
  let roleoptindx = opt2roleopt(optidx);
  if (ophase === num_opt_phases) {
    let phase;
    for (phase = num_opt_phases - 1; phase >= 0; --phase) {
      if (roleoptvals[roleoptindx][phase]) { ophase = phase; break; }
    }
  }
  if ((roleoptindx >= 0 && roleoptindx < MAX_ROLEOPT && ophase >= 0 && ophase < num_opt_phases)) return roleoptvals[roleoptindx][ophase];
  panic("bad index roleoptvals[%d][%d]", roleoptindx, ophase);
}

// Autotranslated from options.c:789
export function unsaveoptstr(optidx, ophase) {
  let roleoptindx = opt2roleopt(optidx);
  if (roleoptvals[roleoptindx][ophase]) (roleoptvals[roleoptindx][ophase], 0), roleoptvals[roleoptindx][ophase] = 0;
}

// Autotranslated from options.c:800
export function freeroleoptvals() {
  let i, j;
  for (i = 0; i < 4; ++i) {
    for (j = 0; j < num_opt_phases; ++j) {
      unsaveoptstr(roleopt2opt, j);
    }
  }
}

// Autotranslated from options.c:898
export function optfn_alignment(optidx, req, negated, opts, op, game) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
    if (!parse_role_opt(optidx, negated, allopt[optidx].name, opts, op)) return optn_silenterr;
    if ( op !== '!') {
      if ((game.flags.initalign = str2align(op)) === ROLE_NONE) {
        config_error_add("Unknown %s '%s'", allopt[optidx].name, op);
        return optn_err;
      }
      saveoptstr(optidx, rolestring(game.flags.initalign, aligns, adj));
    }
    return optn_ok;
  }
  if (req === get_val) {
    opts = rolestring(game.flags.initalign, aligns, adj);
    return optn_ok;
  }
  if (req === get_cnf_val) {
    op = get_cnf_role_opt(optidx);
    opts = op ? op : "none";
    return optn_ok;
  }
  return optn_ok;
}

// Autotranslated from options.c:1035
export function optfn_altkeyhandling(optidx, req, negated, opts, op) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
    nhUse(negated);
    nhUse(op);
    return optn_ok;
  }
  if (req === get_val || req === get_cnf_val) { opts = '\0'; return optn_ok; }
  return optn_ok;
}

// Autotranslated from options.c:1262
export function optfn_catname(optidx, req, negated, opts, op) {
  return petname_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:1407
export function optfn_DECgraphics(optidx, req, negated, opts, op) {
  let badflag = false;
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
    if (!negated) {
      if (gs.symset[PRIMARYSET].name) { badflag = true; }
      else {
        gs.symset[PRIMARYSET].name = dupstr(allopt[optidx].name);
        if (!read_sym_file(PRIMARYSET)) { badflag = true; clear_symsetentry(PRIMARYSET, true); }
        else {
          switch_symbols(true);
        }
      }
      if (badflag) {
        config_error_add("Failure to load symbol set %s.", allopt[optidx].name);
        return optn_err;
      }
    }
    return optn_ok;
  }
  if (req === get_val || req === get_cnf_val) { opts = '\0'; return optn_ok; }
  return optn_ok;
}

// Autotranslated from options.c:1575
export function optfn_dogname(optidx, req, negated, opts, op) {
  return petname_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:1584
export function optfn_dungeon(optidx, req, negated, opts, op) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) { return optn_ok; }
  if (req === get_val) { opts = to_be_done; return optn_ok; }
  if (req === get_cnf_val) { opts = '\0'; return optn_ok; }
  return optn_ok;
}

// Autotranslated from options.c:1606
export function optfn_effects(optidx, req, negated, opts, op) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) { return optn_ok; }
  if (req === get_val) { opts = to_be_done; return optn_ok; }
  if (req === get_cnf_val) { opts = '\0'; return optn_ok; }
  return optn_ok;
}

// Autotranslated from options.c:1628
export function optfn_font_map(optidx, req, negated, opts, op) {
  return pfxfn_font(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:1637
export function optfn_font_menu(optidx, req, negated, opts, op) {
  return pfxfn_font(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:1646
export function optfn_font_message(optidx, req, negated, opts, op) {
  return pfxfn_font(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:1655
export function optfn_font_size_map(optidx, req, negated, opts, op) {
  return pfxfn_font(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:1664
export function optfn_font_size_menu(optidx, req, negated, opts, op) {
  return pfxfn_font(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:1673
export function optfn_font_size_message(optidx, req, negated, opts, op) {
  return pfxfn_font(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:1682
export function optfn_font_size_status(optidx, req, negated, opts, op) {
  return pfxfn_font(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:1691
export function optfn_font_size_text(optidx, req, negated, opts, op) {
  return pfxfn_font(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:1700
export function optfn_font_status(optidx, req, negated, opts, op) {
  return pfxfn_font(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:1709
export function optfn_font_text(optidx, req, negated, opts, op) {
  return pfxfn_font(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:1789
export function optfn_gender(optidx, req, negated, opts, op, game) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
    if (!parse_role_opt(optidx, negated, allopt[optidx].name, opts, op)) return optn_silenterr;
    if ( op !== '!') {
      if ((game.flags.initgend = str2gend(op)) === ROLE_NONE) {
        config_error_add("Unknown %s '%s'", allopt[optidx].name, op);
        return optn_err;
      }
      game.flags.female = game.flags.initgend;
      saveoptstr(optidx, rolestring(game.flags.initgend, genders, adj));
    }
    return optn_ok;
  }
  if (req === get_val) {
    opts = rolestring(game.flags.initgend, genders, adj);
    return optn_ok;
  }
  if (req === get_cnf_val) {
    op = get_cnf_role_opt(optidx);
    opts = op ? op : "none";
    return optn_ok;
  }
  return optn_ok;
}

// Autotranslated from options.c:1827
export function optfn_glyph(optidx, req, negated, opts, op) {
  let glyph;
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
    if (negated) {
      if (op !== empty_optstr) { bad_negation("glyph", true); return optn_err; }
    }
    if (op === empty_optstr) return optn_err;
    mungspaces(op);
    if (!glyphrep_to_custom_map_entries(op, glyph)) return optn_err;
    return optn_ok;
  }
  if (req === get_val) { opts = to_be_done; return optn_ok; }
  if (req === get_cnf_val) { opts = '\0'; return optn_ok; }
  return optn_ok;
}

// Autotranslated from options.c:1909
export function optfn_horsename(optidx, req, negated, opts, op) {
  return petname_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:2082
export function optfn_menu_deselect_all(optidx, req, negated, opts, op) {
  return shared_menu_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:2090
export function optfn_menu_deselect_page(optidx, req, negated, opts, op) {
  return shared_menu_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:2098
export function optfn_menu_first_page(optidx, req, negated, opts, op) {
  return shared_menu_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:2106
export function optfn_menu_invert_all(optidx, req, negated, opts, op) {
  return shared_menu_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:2114
export function optfn_menu_invert_page(optidx, req, negated, opts, op) {
  return shared_menu_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:2122
export function optfn_menu_last_page(optidx, req, negated, opts, op) {
  return shared_menu_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:2130
export function optfn_menu_next_page(optidx, req, negated, opts, op) {
  return shared_menu_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:2138
export function optfn_menu_previous_page(optidx, req, negated, opts, op) {
  return shared_menu_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:2146
export function optfn_menu_search(optidx, req, negated, opts, op) {
  return shared_menu_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:2154
export function optfn_menu_select_all(optidx, req, negated, opts, op) {
  return shared_menu_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:2162
export function optfn_menu_select_page(optidx, req, negated, opts, op) {
  return shared_menu_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:2170
export function optfn_menu_shift_left(optidx, req, negated, opts, op) {
  return shared_menu_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:2178
export function optfn_menu_shift_right(optidx, req, negated, opts, op) {
  return shared_menu_optfn(optidx, req, negated, opts, op);
}

// Autotranslated from options.c:2383
export function optfn_monsters(optidx, req, negated, opts, op) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) { return optn_ok; }
  if (req === get_val || req === get_cnf_val) { opts = '\0'; return optn_ok; }
  return optn_ok;
}

// Autotranslated from options.c:2554
export function optfn_name(optidx, req, negated, opts, op) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
    if ((op = string_for_env_opt(allopt[optidx].name, opts, false)) !== empty_optstr) { nmcpy(svp.plname, op, PL_NSIZ); }
    else {
      return optn_err;
    }
    return optn_ok;
  }
  if (req === get_val || req === get_cnf_val) { opts = svp.plname; return optn_ok; }
  return optn_ok;
}

// Autotranslated from options.c:2653
export function optfn_objects(optidx, req, negated, opts, op) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) { return optn_ok; }
  if (req === get_val) { opts = to_be_done; return optn_ok; }
  if (req === get_cnf_val) { opts = '\0'; return optn_ok; }
  return optn_ok;
}

// Autotranslated from options.c:2675
export function optfn_packorder(optidx, req, negated, opts, op, game) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
    if (op === empty_optstr) return optn_err;
    if (!change_inv_order(op)) return optn_err;
    return optn_ok;
  }
  if (req === get_val || req === get_cnf_val) {
    opts = oc_to_str(game.flags.inv_order);
    return optn_ok;
  }
  return optn_ok;
}

// Autotranslated from options.c:3409
export function optfn_pile_limit(optidx, req, negated, opts, op, game) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
    op = string_for_opt(opts, negated);
    if ((negated && op === empty_optstr) || (!negated && op !== empty_optstr)) game.flags.pile_limit = negated ? 0 : atoi(op);
    else if (negated) { bad_negation(allopt[optidx].name, true); return optn_err; }
    else {
      game.flags.pile_limit = PILE_LIMIT_DFLT;
    }
    if (game.flags.pile_limit < 0) game.flags.pile_limit = PILE_LIMIT_DFLT;
    return optn_ok;
  }
  if (req === get_val || req === get_cnf_val) { opts = `${game.flags.pile_limit}`; return optn_ok; }
  return optn_ok;
}

// Autotranslated from options.c:3476
export function optfn_playmode(optidx, req, negated, opts, op) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
    if (duplicate || negated) return optn_err;
    if (op === empty_optstr) return optn_err;
    if (!strncmpi(op, "normal", 6) || !strcmpi(op, "play")) { wizard = discover = false; }
    else if (!strncmpi(op, "explore", 6) || !strncmpi(op, "discovery", 6)) { wizard = false, discover = true; }
    else if (!strncmpi(op, "debug", 5) || !strncmpi(op, "wizard", 6)) { wizard = true, discover = false; }
    else {
      config_error_add("Invalid value for \"%s\":%s", allopt[optidx].name, op);
      return optn_err;
    }
    return optn_ok;
  }
  if (req === get_val || req === get_cnf_val) {
    opts = wizard ? "debug" : discover ? "explore" : "normal";
    return optn_ok;
  }
  return optn_ok;
}

// Autotranslated from options.c:3512
export function optfn_race(optidx, req, negated, opts, op, game) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
    if (!parse_role_opt(optidx, negated, allopt[optidx].name, opts, op)) return optn_silenterr;
    if ( op !== '!') {
      if ((game.flags.initrace = str2race(op)) === ROLE_NONE) {
        config_error_add("Unknown %s '%s'", allopt[optidx].name, op);
        return optn_err;
      }
      gp.pl_race = op;
      saveoptstr(optidx, rolestring(game.flags.initrace, races, noun));
    }
    return optn_ok;
  }
  if (req === get_val) {
    opts = rolestring(game.flags.initrace, races, noun);
    return optn_ok;
  }
  if (req === get_cnf_val) {
    op = get_cnf_role_opt(optidx);
    opts = op ? op : "none";
    return optn_ok;
  }
  return optn_ok;
}

// Autotranslated from options.c:3594
export function optfn_role(optidx, req, negated, opts, op, game) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
    if (!parse_role_opt(optidx, negated, allopt[optidx].name, opts, op)) return optn_silenterr;
    if ( op !== '!') {
      if ((game.flags.initrole = str2role(op)) === ROLE_NONE) {
        config_error_add("Unknown %s '%s'", allopt[optidx].name, op);
        return optn_err;
      }
      nmcpy(svp.pl_character, op, PL_NSIZ);
      saveoptstr(optidx, rolestring(game.flags.initrole, roles, name.m));
    }
    return optn_ok;
  }
  if (req === get_val) {
    opts = rolestring(game.flags.initrole, roles, name.m);
    return optn_ok;
  }
  if (req === get_cnf_val) {
    op = get_cnf_role_opt(optidx);
    opts = op ? op : "none";
    return optn_ok;
  }
  return optn_ok;
}

// Autotranslated from options.c:3963
export async function optfn_sortvanquished(optidx, req, negated, opts, op, game) {
  let vanqorders, vanqmodes = "tdaACcnz", optname = allopt[optidx].name;
  if (req === do_init) { game.flags.vanq_sortmode = VANQ_MLVL_MNDX; return optn_ok; }
  if (req === do_set) {
    op = string_for_env_opt(allopt[optidx].name, opts, false);
    if (negated) { game.flags.vanq_sortmode = VANQ_MLVL_MNDX; }
    else if (op !== empty_optstr) {
      let p, vndx = 0;
      if ((p = vanqmodes.indexOf(op)) >= 0) { vndx = p; }
      else if ("01234567".includes(op)) { vndx = op.charCodeAt(0) - '0'.charCodeAt(0); }
      else {
        config_error_add("Unknown %s parameter '%s'", optname, op);
        return optn_silenterr;
      }
      game.flags.vanq_sortmode =  vndx;
    }
    else {
      return optn_err;
    }
    return optn_ok;
  }
  if (req === get_val || req === get_cnf_val) {
    opts = vanqorders[game.flags.vanq_sortmode][0];
    if (req === get_val) {
      opts += `: ${vanqorders[game.flags.vanq_sortmode][1]}`;
    }
    return optn_ok;
  }
  if (req === do_handler) {
    let prev_sortmode = game.flags.vanq_sortmode;
    set_vanq_order(true);
    await pline("'%s' %s \"%s: %s\".", optname, (game.flags.vanq_sortmode === prev_sortmode) ? "not changed, still" : "changed to", vanqorders[game.flags.vanq_sortmode][0], vanqorders[game.flags.vanq_sortmode][1]);
  }
  return optn_ok;
}

// Autotranslated from options.c:4140
export function optfn_suppress_alert(optidx, req, negated, opts, op, game, player) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
    if (negated) { bad_negation(allopt[optidx].name, false); return optn_err; }
    else if (op !== empty_optstr) {
      feature_alert_opts(op, allopt[optidx].name);
    }
    return optn_ok;
  }
  if (req === get_val || req === get_cnf_val) {
    if (req === get_cnf_val && game.flags.suppress_alert === 0) opts = '\0';
    else if (game.flags.suppress_alert === 0) {
      opts = none;
    }
    else {
      opts = `${FEATURE_NOTICE_VER_MAJ}.${FEATURE_NOTICE_VER_MIN}.${FEATURE_NOTICE_VER_PATCH}`;
    }
    return optn_ok;
  }
  return optn_ok;
}

// Autotranslated from options.c:4423
export function optfn_traps(optidx, req, negated, opts, op) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) { return optn_ok; }
  if (req === get_val) { opts = to_be_done; return optn_ok; }
  if (req === get_cnf_val) { opts = '\0'; return optn_ok; }
  return optn_ok;
}

// Autotranslated from options.c:4687
export function optfn_warnings(optidx, req, negated, opts, op) {
  let reslt;
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
    reslt = warning_opts(opts, allopt[optidx].name);
    return reslt ? optn_ok : optn_err;
  }
  if (req === get_val || req === get_cnf_val) { opts = '\0'; return optn_ok; }
  return optn_ok;
}

// Autotranslated from options.c:6070
export async function handler_pickup_burden(game) {
  let tmpwin, any, i, burden_name, burden_letters = "ubsntl";
  let burden_pick = null, clr = NO_COLOR;
  tmpwin = create_nhwindow(NHW_MENU);
  start_menu(tmpwin, MENU_BEHAVE_STANDARD);
  any = { a_int: 0 };
  for (i = 0; i < SIZE(burdentype); i++) {
    burden_name = burdentype;
    any.a_int = i + 1;
    add_menu(tmpwin, nul_glyphinfo, any, burden_letters, 0, ATR_NONE, clr, burden_name, MENU_ITEMFLAGS_NONE);
  }
  end_menu(tmpwin, "Select encumbrance level:");
  if (await select_menu(tmpwin, PICK_ONE, burden_pick) > 0) {
    game.flags.pickup_burden = burden_pick.item.a_int - 1;
    (burden_pick, 0);
  }
  destroy_nhwindow(tmpwin);
  return optn_ok;
}

// Autotranslated from options.c:6677
export function bad_negation(optname, with_parameter) {
  config_error_add("The %s option may not %sbe negated.", optname, with_parameter ? "both have a value and " : "");
}

// Autotranslated from options.c:6757
export function reset_duplicate_opt_detection() {
  let k;
  for (k = 0; k < OPTCOUNT; ++k) {
    allopt[k].dupdetected = 0;
  }
}

// Autotranslated from options.c:6774
export function complain_about_duplicate(optidx) {
  let buf;
  buf = '\0';
  if (using_alias) {
    buf = ` (via alias: ${allopt[optidx].alias})`;
  }
  config_error_add("%s option specified multiple times: %s%s", (allopt[optidx].opttyp === CompOpt) ? "compound" : "boolean", allopt[optidx].name, buf);
  return;
}

// Autotranslated from options.c:6796
export async function rejectoption(optname) {
  await pline("%s can be set only from NETHACKOPTIONS or %s.", optname, get_configfile());
}

// Autotranslated from options.c:6832
export function nh_getenv(ev) {
  let getev = getenv(ev);
  if (getev && getev.length <= (BUFSZ / 2)) return getev;
  else {
    return  0;
  }
}

// Autotranslated from options.c:7480
export function change_inv_order(op, game) {
  let oc_sym, num, sp, buf, retval = 1;
  num = 0;
  if (!strchr(op, GOLD_SYM)) buf = COIN_CLASS;
  for (sp = op;  sp; sp++) {
    let fail = false;
    oc_sym = def_char_to_objclass( sp);
    if (oc_sym === MAXOCLASSES) {
      config_error_add("Not an object class '%c'", sp);
      retval = 0;
      fail = true;
    }
    else if (!strchr(game.flags.inv_order, oc_sym)) {
      config_error_add("Object class '%c' not allowed", sp);
      retval = 0;
      fail = true;
    }
    else if (strchr(sp + 1, sp)) {
      config_error_add("Duplicate object class '%c'", sp);
      retval = 0;
      fail = true;
    }
    if (!fail) buf =  oc_sym;
  }
  buf = '\0';
  for (sp = game.flags.inv_order;  sp; sp++) {
    if (!strchr(buf, sp)) {
      strkitten( buf, sp);
    }
  }
  buf = '\0';
  game.flags.inv_order = buf;
  return retval;
}

// Autotranslated from options.c:7535
export function warning_opts(opts, optype) {
  let translate, length, i;
  if ((opts = string_for_env_opt(optype, opts, false)) === empty_optstr) return false;
  escapes(opts, opts);
  length = opts.length;
  for (i = 0; i < WARNCOUNT; i++) {
    translate = (i >= length) ? 0 : opts[i] ?  opts[i] : def_warnsyms[i].sym;
  }
  assign_warnings(translate);
  return true;
}

// Autotranslated from options.c:7715
export async function query_msgtype() {
  let tmpwin, any, i, pick_cnt, picks = null, clr = NO_COLOR;
  tmpwin = create_nhwindow(NHW_MENU);
  start_menu(tmpwin, MENU_BEHAVE_STANDARD);
  any = { a_int: 0 };
  for (i = 0; i < SIZE(msgtype_names); i++) {
    if (msgtype_names[i].descr) {
      any.a_int = msgtype_names[i].msgtyp + 1;
      add_menu(tmpwin, nul_glyphinfo, any, 0, 0, ATR_NONE, clr, msgtype_names[i].descr, MENU_ITEMFLAGS_NONE);
    }
  }
  end_menu(tmpwin, "How to show the message");
  pick_cnt = await select_menu(tmpwin, PICK_ONE, picks);
  destroy_nhwindow(tmpwin);
  if (pick_cnt > 0) {
    i = picks.item.a_int - 1;
    (picks, 0);
    return i;
  }
  return -1;
}

// Autotranslated from options.c:7745
export function msgtype_add(typ, pattern) {
  let re_error = "MSGTYPE regex error", tmp = { msgtype: 0, regex: null, pattern: null, next: null };
  tmp.msgtype = typ;
  tmp.regex = regex_init();
  if (!regex_compile(pattern, tmp.regex)) {
    let errbuf, re_error_desc = regex_error_desc(tmp.regex, errbuf);
    regex_free(tmp.regex);
    (tmp, 0);
    config_error_add("%s: %s", re_error, re_error_desc);
    return false;
  }
  tmp.pattern = dupstr(pattern);
  tmp.next = gp.plinemsg_types;
  gp.plinemsg_types = tmp;
  return true;
}

// Autotranslated from options.c:7771
export function msgtype_free() {
  let tmp, tmp2 = 0;
  for (tmp = gp.plinemsg_types; tmp; tmp = tmp2) {
    tmp2 = tmp.next;
    (tmp.pattern, 0);
    regex_free(tmp.regex);
    tmp.regex = 0;
    (tmp, 0);
  }
  gp.plinemsg_types =  0;
}

// Autotranslated from options.c:7786
export function free_one_msgtype(idx) {
  let tmp = gp.plinemsg_types, prev = null;
  while (tmp) {
    if (idx === 0) {
      let next = tmp.next;
      regex_free(tmp.regex);
      (tmp.pattern, 0);
      (tmp, 0);
      if (prev) prev.next = next;
      else {
        gp.plinemsg_types = next;
      }
      return;
    }
    idx--;
    prev = tmp;
    tmp = tmp.next;
  }
}

// Autotranslated from options.c:7829
export function hide_unhide_msgtypes(hide, hide_mask) {
  let tmp, mt;
  for (tmp = gp.plinemsg_types; tmp; tmp = tmp.next) {
    mt = tmp.msgtype;
    if (!hide) mt = -mt;
    if (mt > 0 && ((1 << mt) & hide_mask)) tmp.msgtype = -tmp.msgtype;
  }
}

// Autotranslated from options.c:7845
export function msgtype_count() {
  let c = 0, tmp = gp.plinemsg_types;
  while (tmp) {
    c++;
    tmp = tmp.next;
  }
  return c;
}

// Autotranslated from options.c:7858
export function msgtype_parse_add(str) {
  let pattern, msgtype;
  if (sscanf(str, "%10s \"%255[^\"]\"", msgtype, pattern) === 2) {
    let typ = -1, i;
    for (i = 0; i < SIZE(msgtype_names); i++) {
      if (str_start_is(msgtype_names[i].name, msgtype, true)) { typ = msgtype_names[i].msgtyp; break; }
    }
    if (typ !== -1) return msgtype_add(typ, pattern);
    else {
      config_error_add("Unknown message type '%s'", msgtype);
    }
  }
  else { config_error_add("Malformed MSGTYPE"); }
  return false;
}

// Autotranslated from options.c:8094
export async function add_menu_cmd_alias(from_ch, to_ch, game) {
  if (game.gn.n_menu_mapped >= MAX_MENU_MAPPED_CMDS) { await pline("out of menu map space."); }
  else {
    game.mapped_menu_cmds = from_ch;
    game.mapped_menu_op = to_ch;
    game.gn.n_menu_mapped++;
    game.mapped_menu_cmds = '\0';
    game.mapped_menu_op = '\0';
  }
}

// Autotranslated from options.c:8108
export function get_menu_cmd_key(ch, game) {
  let idx = game.mapped_menu_op ? game.mapped_menu_op.indexOf(ch) : -1;
  if (idx >= 0) {
    ch = game.mapped_menu_cmds[idx];
  }
  return ch;
}

// Autotranslated from options.c:8125
export function map_menu_cmd(ch, game) {
  let idx = game.mapped_menu_cmds ? game.mapped_menu_cmds.indexOf(ch) : -1;
  if (idx >= 0) {
    ch = game.mapped_menu_op[idx];
  }
  return ch;
}

// Autotranslated from options.c:8316
export async function optfn_o_autopickup_exceptions(optidx, req, negated, opts, op) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
  }
  if (req === get_val || req === get_cnf_val) {
    if (!opts) return optn_err;
    opts = `${count_apes()} currently set`;
    return optn_ok;
  }
  if (req === do_handler) { return handler_autopickup_exception(); }
  return optn_ok;
}

// Autotranslated from options.c:8338
export function optfn_o_bind_keys(optidx, req, negated, opts, op) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
  }
  if (req === get_val || req === get_cnf_val) {
    if (!opts) return optn_err;
    opts = `${count_bind_keys()} currently set`;
    return optn_ok;
  }
  if (req === do_handler) { handler_rebind_keys(); }
  return optn_ok;
}

// Autotranslated from options.c:8360
export function optfn_o_autocomplete(optidx, req, negated, opts, op) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
  }
  if (req === get_val || req === get_cnf_val) {
    if (!opts) return optn_err;
    opts = `${count_autocompletions()} currently set`;
    return optn_ok;
  }
  if (req === do_handler) { handler_change_autocompletions(); }
  return optn_ok;
}

// Autotranslated from options.c:8382
export async function optfn_o_menu_colors(optidx, req, negated, opts, op) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
  }
  if (req === get_val || req === get_cnf_val) {
    if (!opts) return optn_err;
    opts = `${count_menucolors()} currently set`;
    return optn_ok;
  }
  if (req === do_handler) { return handler_menu_colors(); }
  return optn_ok;
}

// Autotranslated from options.c:8403
export async function optfn_o_message_types(optidx, req, negated, opts, op) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
  }
  if (req === get_val || req === get_cnf_val) {
    if (!opts) return optn_err;
    opts = `${msgtype_count()} currently set`;
    return optn_ok;
  }
  if (req === do_handler) { return handler_msgtype(); }
  return optn_ok;
}

// Autotranslated from options.c:8428
export function optfn_o_status_cond(optidx, req, negated, opts, op) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
  }
  if (req === get_val) {
    if (!opts) return optn_err;
    opts = `${count_cond()} currently set`;
    return optn_ok;
  }
  if (req === get_cnf_val) {
  }
  if (req === do_handler) { if (cond_menu()) opt_set_in_config = true; return optn_ok; }
  return optn_ok;
}

// Autotranslated from options.c:8460
export function optfn_o_status_hilites(optidx, req, negated, opts, op) {
  if (req === do_init) { return optn_ok; }
  if (req === do_set) {
  }
  if (req === get_val || req === get_cnf_val) {
    if (!opts) return optn_err;
    opts = `${count_status_hilites()} currently set`;
    return optn_ok;
  }
  if (req === do_handler) {
    if (!status_hilite_menu()) { return optn_err; }
    else {
      if (wc2_supported("hilite_status")) preference_update("hilite_status");
    }
    return optn_ok;
  }
  return optn_ok;
}

// Autotranslated from options.c:8779
export function term_for_boolean(idx, b) {
  let i, f_t = ( b) ? 1: 0, boolean_term;
  let booleanterms = [ [ "false", "off", "disabled", "excluded from build" ], [ "true", "on", "enabled", "included"], ];
  boolean_term = booleanterms[f_t][0];
  i =  allopt[idx].termpref;
  if (i > Term_False && i < num_terms && i < booleanterms[0].length) boolean_term = booleanterms[f_t][i];
  return boolean_term;
}

// Autotranslated from options.c:9047
export function doset_add_menu(win, option, fmtstr, idx, indexoffset) {
  let value = "unknown", indent, buf, buf2, any, i = idx, reslt = optn_err;
  let clr = NO_COLOR;
  buf2 = '\0';
  any = { a_int: 0 };
  if (i >= 0 && i < OPTCOUNT && allopt[i].name && allopt[i].optfn) {
    any.a_int = (indexoffset === 0) ? 0 : i + 1 + indexoffset;
    if (allopt[i].optfn) reslt = ( allopt[i].optfn)(allopt[i].idx, get_val, false, buf2, empty_optstr);
    if (reslt === optn_ok && buf2) value =  buf2;
  }
  else {
    any.a_int = 0;
    if (!buf2) {
      buf2 = "unknown";
    }
    value =  buf2;
  }
  indent = !any.a_int ? " " : "";
  buf = `${indent}${option.toString().padEnd(33)} [${value}]`;
  add_menu(win, nul_glyphinfo, any, 0, 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
}

// Autotranslated from options.c:9099
export async function show_menu_controls(win, dolist) {
  let desc;
  let hardcoded = [ [ "Return", "Accept current choice(s) and dismiss menu" ], [ "Enter", "Same as Return" ], [ "Space", "If not on last page, advance one page;" ], [ " ", "when on last page, treat like Return" ], [ "Escape", "Cancel menu without making any choice(s)" ], [  0,  0] ];
  let buf, fmt, arg, xcp;
  let has_menu_shift = wc2_supported("menu_shift");
  await putstr(win, 0, "Menu control keys:");
  if (dolist) {
    let i, ch;
    fmt = "%-7s %s";
    for (i = 0; default_menu_cmd_info[i].desc; i++) {
      ch = default_menu_cmd_info[i].cmd;
      if ((ch === MENU_SHIFT_RIGHT || ch === MENU_SHIFT_LEFT) && !has_menu_shift) {
        continue;
      }
      buf = `${visctrl(get_menu_cmd_key(ch)).toString().padEnd(7)} ${default_menu_cmd_info[i].desc}`;
      await putstr(win, 0, buf);
    }
    fmt = "%s%-7s %s";
    arg = "";
  }
  else {
    await putstr(win, 0, "");
    buf = `${"".padStart(9)} ${"Whole".padEnd(6)} Current`;
    await putstr(win, 0, buf);
    buf = `${"".padStart(9)} ${" Menu".padEnd(6)} ${"Page"}`;
    await putstr(win, 0, buf);
    buf = `${"Select".padStart(8)} ${visctrl(get_menu_cmd_key(MENU_SELECT_ALL)).toString().padEnd(6)} ${visctrl(get_menu_cmd_key(MENU_SELECT_PAGE))}`;
    await putstr(win, 0, buf);
    buf = `${"Invert".padStart(8)} ${visctrl(get_menu_cmd_key(MENU_INVERT_ALL)).toString().padEnd(6)} ${visctrl(get_menu_cmd_key(MENU_INVERT_PAGE))}`;
    await putstr(win, 0, buf);
    buf = `${"Deselect".padStart(8)} ${visctrl(get_menu_cmd_key(MENU_UNSELECT_ALL)).toString().padEnd(6)} ${visctrl(get_menu_cmd_key(MENU_UNSELECT_PAGE))}`;
    await putstr(win, 0, buf);
    await putstr(win, 0, "");
    buf = `${"Go to".padStart(8)} ${visctrl(get_menu_cmd_key(MENU_NEXT_PAGE)).toString().padEnd(6)} Next page`;
    await putstr(win, 0, buf);
    buf = `${"".padStart(8)} ${visctrl(get_menu_cmd_key(MENU_PREVIOUS_PAGE)).toString().padEnd(6)} Previous page`;
    await putstr(win, 0, buf);
    buf = `${"".padStart(8)} ${visctrl(get_menu_cmd_key(MENU_FIRST_PAGE)).toString().padEnd(6)} First page`;
    await putstr(win, 0, buf);
    buf = `${"".padStart(8)} ${visctrl(get_menu_cmd_key(MENU_LAST_PAGE)).toString().padEnd(6)} Last page`;
    await putstr(win, 0, buf);
    if (has_menu_shift) {
      buf = `${"Pan view".padStart(8)} ${visctrl(get_menu_cmd_key(MENU_SHIFT_RIGHT)).toString().padEnd(6)} Right (perm_invent only)`;
      await putstr(win, 0, buf);
      buf = `${"".padStart(8)} ${visctrl(get_menu_cmd_key(MENU_SHIFT_LEFT)).toString().padEnd(6)} Left`;
      await putstr(win, 0, buf);
    }
    await putstr(win, 0, "");
    buf = `${"Search".padStart(8)} ${visctrl(get_menu_cmd_key(MENU_SEARCH)).toString().padEnd(6)} Exter a target string and invert all matching entries`;
    await putstr(win, 0, buf);
    await putstr(win, 0, "");
    fmt = "%9s %-8s %s";
    arg = "Other ";
  }
  for (xcp = hardcoded; xcp.key; ++xcp) {
    if (dolist) {
      buf = `${arg}${xcp.key.toString().padEnd(7)} ${xcp.desc}`;
    } else {
      buf = `${arg.padStart(9)} ${xcp.key.toString().padEnd(8)} ${xcp.desc}`;
    }
    await putstr(win, 0, buf);
    arg = "";
  }
}

// Autotranslated from options.c:9601
export function all_options_menucolors(sbuf, game) {
  let i = 0, ncolors = count_menucolors(), tmp = game.menu_colorings, buf, arr;
  if (!ncolors) return;
  arr = new Array(ncolors).fill(null);
  while (tmp) {
    arr = tmp;
    tmp = tmp.next;
  }
  for (i = ncolors; i > 0; i--) {
    tmp = arr;
    let sattr = attr2attrname(tmp.attr), sclr = clr2colorname(tmp.color);
    buf = `MENUCOLOR="${tmp.origstr}"=${sclr}${(tmp.attr !== ATR_NONE) ? "&" : ""}${(tmp.attr !== ATR_NONE) ? sattr : ""}\n`;
    strbuf_append(sbuf, buf);
  }
  (arr, 0);
}

// Autotranslated from options.c:9634
export function all_options_msgtypes(sbuf) {
  let tmp = gp.plinemsg_types, buf;
  while (tmp) {
    let mtype = msgtype2name(tmp.msgtype);
    buf = `MSGTYPE=${mtype} "${tmp.pattern}"\n`;
    strbuf_append(sbuf, buf);
    tmp = tmp.next;
  }
}

// Autotranslated from options.c:9884
export function set_wc_option_mod_status(optmask, status) {
  let k = 0;
  if (SET__IS_VALUE_VALID(status)) {
    impossible("set_wc_option_mod_status: status out of range %d.", status);
    return;
  }
  while (wc_options[k].wc_name) {
    if (optmask & wc_options[k].wc_bit) {
      set_option_mod_status(wc_options[k].wc_name, status);
    }
    k++;
  }
}

// Autotranslated from options.c:9938
export function set_wc2_option_mod_status(optmask, status) {
  let k = 0;
  if (SET__IS_VALUE_VALID(status)) {
    impossible("set_wc2_option_mod_status: status out of range %d.", status);
    return;
  }
  while (wc2_options[k].wc_name) {
    if (optmask & wc2_options[k].wc_bit) {
      set_option_mod_status(wc2_options[k].wc_name, status);
    }
    k++;
  }
}

// Autotranslated from options.c:10119
export function options_free_window_colors() {
  let j;
  for (j = 0; j < WC_COUNT; ++j) {
    if ( fgp) (fgp[j], 0), fgp = 0;
    if ( bgp) (bgp[j], 0), bgp = 0;
  }
  options_set_window_colors_flag = 0;
}

// Autotranslated from options.c:10158
export function enhance_menu_text(buf, sz, whichpass, bool_p, thisopt) {
  let nowsz, availsz;
  if (!buf) return;
  nowsz = buf.length + 1;
  availsz = sz - nowsz;
  nhUse(availsz);
  nhUse(bool_p);
  nhUse(thisopt);
  return;
}

// Autotranslated from options.c:5659
export async function handler_disclose(game) {
  let tmpwin, any, i, n, buf;
  let disclosure_names = [ "inventory", "attributes", "vanquished", "genocides", "conduct", "overview", ];
  let disc_cat, pick_cnt, pick_idx, opt_idx, c, disclosure_pick = null;
  let clr = NO_COLOR;
  tmpwin = create_nhwindow(NHW_MENU);
  start_menu(tmpwin, MENU_BEHAVE_STANDARD);
  any = { a_int: 0 };
  for (i = 0; i < NUM_DISCLOSURE_OPTIONS; i++) {
    buf = `${disclosure_names[i].toString().padEnd(12)}[${game.flags.end_disclose[i]}${disclosure_options[i]}]`;
    any.a_int = i + 1;
    add_menu(tmpwin, nul_glyphinfo, any, disclosure_options[i], 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
    disc_cat[i] = 0;
  }
  end_menu(tmpwin, "Change which disclosure options categories:");
  pick_cnt = await select_menu(tmpwin, PICK_ANY, disclosure_pick);
  if (pick_cnt > 0) {
    for (pick_idx = 0; pick_idx < pick_cnt; ++pick_idx) {
      opt_idx = disclosure_pick[pick_idx].item.a_int - 1;
      disc_cat[opt_idx] = 1;
    }
    (disclosure_pick, 0);
    disclosure_pick = null;
  }
  destroy_nhwindow(tmpwin);
  for (i = 0; i < NUM_DISCLOSURE_OPTIONS; i++) {
    if (disc_cat[i]) {
      c = game.flags.end_disclose[i];
      buf = `Disclosure options for ${disclosure_names[i]}:`;
      tmpwin = create_nhwindow(NHW_MENU);
      start_menu(tmpwin, MENU_BEHAVE_STANDARD);
      any = { a_int: 0 };
      any.a_char = DISCLOSE_NO_WITHOUT_PROMPT;
      add_menu(tmpwin, nul_glyphinfo, any, 0, any.a_char, ATR_NONE, clr, "Never disclose, without prompting", (c === any.a_char) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
      any.a_char = DISCLOSE_YES_WITHOUT_PROMPT;
      add_menu(tmpwin, nul_glyphinfo, any, 0, any.a_char, ATR_NONE, clr, "Always disclose, without prompting", (c === any.a_char) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
      if ( disclosure_names[i] === 'v' || disclosure_names[i] === 'g') {
        any.a_char = DISCLOSE_SPECIAL_WITHOUT_PROMPT;
        add_menu(tmpwin, nul_glyphinfo, any, 0, any.a_char, ATR_NONE, clr, "Always disclose, pick sort order from menu", (c === any.a_char) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
      }
      any.a_char = DISCLOSE_PROMPT_DEFAULT_NO;
      add_menu(tmpwin, nul_glyphinfo, any, 0, any.a_char, ATR_NONE, clr, "Prompt, with default answer of \"No\"", (c === any.a_char) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
      any.a_char = DISCLOSE_PROMPT_DEFAULT_YES;
      add_menu(tmpwin, nul_glyphinfo, any, 0, any.a_char, ATR_NONE, clr, "Prompt, with default answer of \"Yes\"", (c === any.a_char) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
      if ( disclosure_names[i] === 'v' || disclosure_names[i] === 'g') {
        any.a_char = DISCLOSE_PROMPT_DEFAULT_SPECIAL;
        add_menu(tmpwin, nul_glyphinfo, any, 0, any.a_char, ATR_NONE, clr, "Prompt, with default answer of \"Ask\" to request sort menu", (c === any.a_char) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
      }
      end_menu(tmpwin, buf);
      n = await select_menu(tmpwin, PICK_ONE, disclosure_pick);
      if (n > 0) {
        game.flags.end_disclose[i] = disclosure_pick[0].item.a_char;
        if (n > 1 && game.flags.end_disclose[i] === c) game.flags.end_disclose[i] = disclosure_pick[1].item.a_char;
        (disclosure_pick, 0);
      }
      destroy_nhwindow(tmpwin);
    }
  }
  return optn_ok;
}

// Autotranslated from options.c:8051
export function illegal_menu_cmd_key(c) {
  if (c === 0 || c === '\r' || c === '\n' || c === '\x1b' || c === ' ' || digit( c) || (letter( c) && c !== '@')) {
    config_error_add("Reserved menu command key '%s'", visctrl( c));
    return true;
  }
  else {
    let j;
    for (j = 1; j < MAXOCLASSES; j++) {
      if (c ===  def_oc_syms[j].sym) {
        config_error_add("Menu command key '%s' is an object class", visctrl( c));
        return true;
      }
    }
  }
  return false;
}

// Autotranslated from options.c:8076
export function oc_to_str(src) {
  // C ref: iterates uchar *src, converts each class index to its symbol char.
  // JS: src is an array of class indices; returns the symbol string.
  let result = '';
  for (let idx = 0; idx < src.length; idx++) {
    const i = typeof src[idx] === 'number' ? src[idx] : src.charCodeAt(idx);
    if (i === 0) break;
    if (i < 0 || i >= MAXOCLASSES) { impossible("oc_to_str: illegal object class_ %d", i); }
    else if (def_oc_syms[i]) { result += def_oc_syms[i].sym; }
  }
  return result;
}

// Autotranslated from options.c:10026
export function wc_set_window_colors(op) {
  let j, clr, buf, wn, tfg, tbg, newop;
  buf = op;
  newop = mungspaces(buf);
  while ( newop) {
    wn = tfg = tbg =  0;
    if ( newop === ' ') newop++;
    if (!newop) return 0;
    wn = newop;
    while ( newop && newop !== ' ') {
      newop++;
    }
    if (!newop) return 0;
     newop = '\x00';
    if ( newop === ' ') newop++;
    if (!newop) return 0;
    tfg = newop;
    while ( newop && newop !== '/') {
      newop++;
    }
    if (!newop) return 0;
     newop = '\x00';
    if ( newop === ' ') newop++;
    if (!newop) return 0;
    tbg = newop;
    while ( newop && newop !== ' ') {
      newop++;
    }
    if ( newop) newop = '\x00';
    for (j = 0; j < WC_COUNT; ++j) {
      if (!strcmpi(wn, wcnames[j]) || !strcmpi(wn, wcshortnames[j])) {
        if (!strstri(tfg, " ")) {
          if ( fgp[j]) (fgp[j], 0);
          clr = check_enhanced_colors(tfg);
           fgp[j] = dupstr((clr >= 0) ? wc_color_name(clr) : tfg);
        }
        if (!strstri(tbg, " ")) {
          if ( bgp[j]) (bgp[j], 0);
          clr = check_enhanced_colors(tbg);
           bgp[j] = dupstr((clr >= 0) ? wc_color_name(clr) : tbg);
        }
        if (wcolors_opt[j] !== 0) {
          config_error_add( "windowcolors for %s windows specified multiple times", wcnames[j]);
        }
        wcolors_opt[j]++;
        break;
      }
    }
    if (j === WC_COUNT) {
      config_error_add("windowcolors for unrecognized window type: %s", wn);
    }
  }
  options_set_window_colors_flag = 1;
  return 1;
}

// -----------------------------------------------------------------------
// Options menu UI (merged from options_menu.js)
// C ref: options.c doset() interactive menu
// -----------------------------------------------------------------------

import { saveFlags, DEFAULT_FLAGS } from './storage.js';
import { nhgetch_raw, getlin } from './input.js';

/**
 * Options menu data structure matching C NetHack
 * Each option has: name, key, type (bool/text/number), category, page
 */
const OPTIONS_DATA = {
    // Page 1 - General & Behavior
    page1: [
        {
            category: 'General',
            options: [
                { key: 'a', name: 'fruit', type: 'text', flag: 'fruit', help: 'name of a fruit you enjoy eating' },
                { key: 'b', name: 'number_pad', type: 'bool', flag: 'number_pad', help: 'use the number pad for movement' }
            ]
        },
        {
            category: 'Behavior',
            options: [
                { key: 'c', name: 'autodig', type: 'bool', flag: 'autodig', help: 'dig if moving and wielding a digging tool' },
                { key: 'd', name: 'autoopen', type: 'bool', flag: 'autoopen', help: 'walking into a door attempts to open it' },
                { key: 'e', name: 'autopickup', type: 'bool', flag: 'pickup', help: 'automatically pick up objects' },
                { key: 'f', name: 'autopickup exceptions', type: 'count', flag: 'autopickup_exceptions', help: 'exceptions to autopickup' },
                { key: 'g', name: 'autoquiver', type: 'bool', flag: 'autoquiver', help: 'automatically fill quiver' },
                { key: 'h', name: 'autounlock', type: 'text', flag: 'autounlock', help: 'method for unlocking' },
                { key: 'i', name: 'cmdassist', type: 'bool', flag: 'cmdassist', help: 'provide assistance with commands' },
                { key: 'j', name: 'dropped_nopick', type: 'bool', flag: 'dropped_nopick', help: 'do not autopickup dropped items', suffix: '(for autopickup)' },
                { key: 'k', name: 'fireassist', type: 'bool', flag: 'fireassist', help: 'provide assistance with firing' },
                { key: 'l', name: 'pickup_stolen', type: 'bool', flag: 'pickup_stolen', help: 'autopickup stolen items', suffix: '(for autopickup)' },
                { key: 'm', name: 'pickup_thrown', type: 'bool', flag: 'pickup_thrown', help: 'autopickup thrown items', suffix: '(for autopickup)' },
                { key: 'n', name: 'pickup_types', type: 'text', flag: 'pickup_types', help: 'types to autopickup', suffix: '(for autopickup)' },
                { key: 'o', name: 'pushweapon', type: 'bool', flag: 'pushweapon', help: 'push old weapon into second slot' }
            ]
        }
    ],

    // Advanced options — shown only via #optionsfull (C ref: optlist.h Advanced category)
    advanced: [
        {
            category: 'Advanced',
            options: [
                { key: 'a', name: 'tutorial', type: 'bool', flag: 'tutorial', help: 'show tutorial option at game start' },
                { key: 'b', name: 'name', type: 'text', flag: 'name', help: 'your character name' }
            ]
        }
    ],

    // Page 2 - Map & Status
    page2: [
        {
            category: 'Map',
            options: [
                { key: 'a', name: 'bgcolors', type: 'bool', flag: 'bgcolors', help: 'use background colors' },
                { key: 'b', name: 'color', type: 'bool', flag: 'color', help: 'use color for display' },
                { key: 'c', name: 'customcolors', type: 'bool', flag: 'customcolors', help: 'use custom colors' },
                { key: 'd', name: 'customsymbols', type: 'bool', flag: 'customsymbols', help: 'use custom symbols' },
                { key: 'e', name: 'hilite_pet', type: 'bool', flag: 'hilite_pet', help: 'highlight pets' },
                { key: 'f', name: 'hilite_pile', type: 'bool', flag: 'hilite_pile', help: 'highlight piles of objects' },
                { key: 'g', name: 'showrace', type: 'bool', flag: 'showrace', help: 'show race in status' },
                { key: 'h', name: 'sparkle', type: 'bool', flag: 'sparkle', help: 'sparkle effect for resists' },
                { key: 'i', name: 'symset', type: 'text', flag: 'symset', help: 'symbol set to use' }
            ]
        },
        {
            category: 'Status',
            options: [
                { key: 'j', name: 'hitpointbar', type: 'bool', flag: 'hitpointbar', help: 'show hitpoint bar' },
                { key: 'k', name: 'menu colors', type: 'count', flag: 'menucolors', help: 'menu color rules' },
                { key: 'l', name: 'showexp', type: 'bool', flag: 'showexp', help: 'show experience points' },
                { key: 'm', name: 'status condition fields', type: 'count', flag: 'statusconditions', count: 16, help: 'status condition fields' },
                { key: 'n', name: 'status highlight rules', type: 'count', flag: 'statushighlights', help: 'status highlight rules' },
                { key: 'o', name: 'statuslines', type: 'number', flag: 'statuslines', help: 'number of status lines' },
                { key: 'p', name: 'time', type: 'bool', flag: 'time', help: 'show elapsed time' }
            ]
        }
    ]
};

const HELP_OPTIONS_PER_PAGE = 5;
const HELP_TOTAL_PAGES = 5;

function clampPage(page, min, max) {
    const n = Number.isFinite(page) ? Math.trunc(page) : min;
    if (n < min) return min;
    if (n > max) return max;
    return n;
}

function flattenOptions() {
    const out = [];
    const pages = [
        { number: 1, categories: OPTIONS_DATA.page1 },
        { number: 2, categories: OPTIONS_DATA.page2 }
    ];
    for (const page of pages) {
        for (const category of page.categories) {
            for (const option of category.options) {
                out.push({ ...option, category: category.category, page: page.number });
            }
        }
    }
    return out;
}

const FLAT_OPTIONS = flattenOptions();

export function getTotalPages(showHelp, showAdvanced) {
    if (showHelp) return HELP_TOTAL_PAGES;
    return showAdvanced ? 3 : 2;
}

export function normalizeOptionsPage(page, showHelp, showAdvanced) {
    return clampPage(page, 1, getTotalPages(showHelp, showAdvanced));
}

export function getVisibleOptions(page, showHelp, showAdvanced) {
    if (!showHelp) {
        let categories;
        if (page === 3 && showAdvanced) categories = OPTIONS_DATA.advanced;
        else if (page === 2) categories = OPTIONS_DATA.page2;
        else categories = OPTIONS_DATA.page1;
        const out = [];
        for (const category of categories) {
            for (const option of category.options) {
                out.push({ ...option, category: category.category, page });
            }
        }
        return out;
    }

    const normalizedPage = normalizeOptionsPage(page, true);
    const start = (normalizedPage - 1) * HELP_OPTIONS_PER_PAGE;
    const end = normalizedPage === HELP_TOTAL_PAGES
        ? FLAT_OPTIONS.length
        : start + HELP_OPTIONS_PER_PAGE;
    return FLAT_OPTIONS.slice(start, end);
}

export function getOptionByKey(page, showHelp, key, showAdvanced) {
    const options = getVisibleOptions(page, showHelp, showAdvanced);
    return options.find(opt => opt.key === key) || null;
}

/**
 * Render options menu to a 24x80 grid
 * @param {number} page - Page number (1 or 2)
 * @param {boolean} showHelp - Whether to show help text
 * @param {object} flags - Current flag values from storage
 * @returns {object} - {screen: string[], attrs: string[]}
 */
export function renderOptionsMenu(page, showHelp, flags, showAdvanced) {
    const normalizedPage = normalizeOptionsPage(page, showHelp, showAdvanced);

    // C NetHack uses variable-length lines, not fixed 80-char
    const screen = Array(24).fill('');
    const attrs = Array(24).fill('');

    let row = 0;

    // Help mode and page 1 both show header/help controls
    if (showHelp || normalizedPage === 1) {
        // Header (exactly 20 chars with inverse video on "Options")
        screen[row] = ' Options            ';
        // Inverse video on positions 1-7 ("Options")
        attrs[row] = '0' + '1'.repeat(7) + '0'.repeat(12);
        row += 1;

        // Blank line (exactly 20 chars)
        screen[row] = ' '.repeat(20);
        attrs[row] = '0'.repeat(20);
        row += 1;

        // Help text
        if (showHelp) {
            screen[row] = ' Use command \'#optionsfull\' to get the complete options list.                   ';
            attrs[row] = '0'.repeat(screen[row].length);
            row += 1;
            screen[row] = ' ? - hide help      ';
            attrs[row] = '0'.repeat(20);
        } else {
            screen[row] = ' ? - show help      ';
            attrs[row] = '0'.repeat(20);
        }
        row += 1;
    }

    let pageData;
    if (!showHelp) {
        if (normalizedPage === 3 && showAdvanced) pageData = OPTIONS_DATA.advanced;
        else pageData = normalizedPage === 1 ? OPTIONS_DATA.page1 : OPTIONS_DATA.page2;
    } else {
        const visibleOptions = getVisibleOptions(normalizedPage, true, showAdvanced);
        pageData = [];
        let currentCategory = null;
        for (const opt of visibleOptions) {
            if (!currentCategory || currentCategory.category !== opt.category) {
                currentCategory = { category: opt.category, options: [] };
                pageData.push(currentCategory);
            }
            currentCategory.options.push(opt);
        }
    }

    // Render each category
    let firstCategory = true;
    for (const category of pageData) {
        // Blank line before category (except first on page 2 compact view)
        if (!(normalizedPage === 2 && !showHelp && firstCategory)) {
            screen[row] = ' '.repeat(20);
            attrs[row] = '0'.repeat(20);
            row += 1;
        }
        firstCategory = false;

        // Category header (indented with 2 spaces, total 40 chars)
        const catHeader = '  ' + category.category;
        screen[row] = catHeader.padEnd(40, ' ');
        // Inverse video from position 1-32 (C always uses exactly 32 chars)
        attrs[row] = '0' + '1'.repeat(32) + '0'.repeat(7);
        row += 1;

        // Render options
        for (const opt of category.options) {
            if (row >= 23) break; // Save room for footer

            // Format: " a - option_name              [value]"
            // Key and name part
            let line = ' ' + opt.key + ' - ' + opt.name;

            // Pad to exactly column 29 for value alignment (C has value at col 29)
            line = line.padEnd(29, ' ');

            // Get value
            const value = getOptionValue(opt, flags);
            line += '[' + value + ']';

            // Determine line length based on content
            if (opt.suffix) {
                // Has suffix - add 2 spaces after value, then suffix, then to 80
                line += '  ' + opt.suffix;
                line = line.padEnd(80, ' ');
            } else if (value.length > 10 || value.includes('currently set')) {
                // Long value - pad to 80
                line = line.padEnd(80, ' ');
            } else {
                // Short value - pad to 40
                line = line.padEnd(40, ' ');
            }

            screen[row] = line;
            attrs[row] = '0'.repeat(line.length);
            row += 1;

            // Show help text if enabled
            if (showHelp && opt.help) {
                const helpLine = '     ' + opt.help;
                screen[row] = helpLine.padEnd(80, ' ');
                attrs[row] = '0'.repeat(80);
                row += 1;

                // Blank line after help (20 chars)
                if (row < 23) {
                    screen[row] = ' '.repeat(20);
                    attrs[row] = '0'.repeat(20);
                    row += 1;
                }
            }
        }
    }

    // Blank line before footer (only on page 1 in non-help mode)
    // In help mode, the blank after last help text serves this purpose
    if (normalizedPage === 1 && !showHelp) {
        screen[row] = ' '.repeat(20);
        attrs[row] = '0'.repeat(20);
        row += 1;
    }

    // Footer - page indicator on current row (exactly 20 chars)
    const totalPages = getTotalPages(showHelp, showAdvanced);
    screen[row] = ' (' + normalizedPage + ' of ' + totalPages + ')           ';
    attrs[row] = '0'.repeat(20);
    row += 1;

    // Fill remaining rows with blank lines (20 chars each)
    while (row < 24) {
        screen[row] = ' '.repeat(20);
        attrs[row] = '0'.repeat(20);
        row += 1;
    }

    return { screen, attrs };
}

/**
 * Get display value for an option
 */
function getOptionValue(opt, flags) {
    const flagValue = flags[opt.flag];

    switch (opt.type) {
        case 'bool':
            // [X] or [ ]
            // Special case: number_pad shows "0=off" or "1=on" instead of X/
            if (opt.name === 'number_pad') {
                const mode = (typeof flagValue === 'number')
                    ? flagValue
                    : (flagValue ? 1 : 0);
                if (mode === -1) return "-1=off, 'z' to move upper-left, 'y' to zap wands";
                if (mode === 0) return '0=off';
                if (mode === 2) return '2=on, MSDOS compatible';
                if (mode === 3) return '3=on, phone-style digit layout';
                if (mode === 4) return '4=on, phone-style layout, MSDOS compatible';
                return '1=on';
            }
            return flagValue ? 'X' : ' ';

        case 'text':
            // [value]
            if (opt.flag === 'autounlock') {
                const v = flagValue ?? DEFAULT_FLAGS[opt.flag];
                return (v === '' || v === undefined || v === null) ? 'apply-key' : String(v);
            }
            if (opt.flag === 'pickup_types') {
                const v = flagValue ?? DEFAULT_FLAGS[opt.flag];
                return (v === '' || v === undefined || v === null) ? 'all' : String(v);
            }
            return flagValue || DEFAULT_FLAGS[opt.flag] || '';

        case 'number':
            // [N]
            const num = flagValue !== undefined ? flagValue : DEFAULT_FLAGS[opt.flag];
            return String(num !== undefined ? num : '');

        case 'count':
            // [(N currently set)]
            let count = 0;
            if (Array.isArray(flagValue)) {
                count = flagValue.length;
            } else if (typeof flagValue === 'number') {
                count = flagValue;
            } else if (flagValue && typeof flagValue === 'object') {
                count = Object.keys(flagValue).length;
            } else if (opt.count !== undefined) {
                count = opt.count;
            }
            return '(' + count + ' currently set)';

        default:
            return '';
    }
}

/**
 * Toggle an option value
 */
export function toggleOption(page, key, flags) {
    const opt = getOptionByKey(page, false, key);
    if (!opt || opt.type !== 'bool') return false;

    flags[opt.flag] = !flags[opt.flag];
    saveFlags(flags);
    return true;
}

export function setOptionValue(page, showHelp, key, rawValue, flags) {
    const opt = getOptionByKey(page, showHelp, key);
    if (!opt) return false;

    if (opt.type === 'bool') {
        flags[opt.flag] = !flags[opt.flag];
        saveFlags(flags);
        return true;
    }

    if (rawValue === null || rawValue === undefined) return false;

    if (opt.type === 'number' || opt.type === 'count') {
        const parsed = parseInt(String(rawValue).trim(), 10);
        if (Number.isNaN(parsed)) return false;
        flags[opt.flag] = parsed;
        saveFlags(flags);
        return true;
    }

    if (opt.type === 'text') {
        flags[opt.flag] = String(rawValue);
        saveFlags(flags);
        return true;
    }

    return false;
}

const STATUS_HILITE_FIELDS = [
    'title', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom',
    'charisma', 'alignment', 'carrying-capacity', 'gold', 'power', 'power-max',
    'experience-level', 'armor-class', 'HD', 'time', 'hunger', 'hitpoints',
    'hitpoints-max', 'dungeon-level', 'experience', 'condition', 'version'
];

const STATUS_CONDITION_FIELDS_ALPHA = [
    'cond_barehanded', 'cond_blind', 'cond_busy', 'cond_conf', 'cond_deaf',
    'cond_fly', 'cond_foodPois', 'cond_glowhands', 'cond_grab', 'cond_hallucinat',
    'cond_held', 'cond_holding', 'cond_ice', 'cond_iron', 'cond_lava',
    'cond_levitate', 'cond_paralyzed', 'cond_ride', 'cond_sleep', 'cond_slime',
    'cond_slip', 'cond_stone', 'cond_strngl', 'cond_stun', 'cond_submerged',
    'cond_termIll', 'cond_tethered', 'cond_trap', 'cond_unconscious', 'cond_woundedlegs'
];

const STATUS_CONDITION_DEFAULT_ON = new Set([
    'cond_blind', 'cond_conf', 'cond_deaf', 'cond_fly', 'cond_foodPois',
    'cond_grab', 'cond_hallucinat', 'cond_iron', 'cond_lava', 'cond_levitate',
    'cond_ride', 'cond_slime', 'cond_stone', 'cond_strngl', 'cond_stun', 'cond_termIll'
]);

// Handle options (O or #optionsfull) — C ref: cmd.c doset(), options.c doset()
// Interactive menu with immediate toggle - stays open until q/ESC.
// Pass { showAdvanced: true } for #optionsfull to include Advanced options page.
export async function handleSet(game, { showAdvanced = false } = {}) {
    const { display, player } = game;
    const flags = game.flags;

    let currentPage = 1;
    let showHelp = false;

    function applyOptionSideEffects() {
        player.showExp = !!flags.showexp;
        player.showTime = !!flags.time;
        window.gameFlags = flags;
    }

    async function drawOptions() {
        const normalizedPage = normalizeOptionsPage(currentPage, showHelp, showAdvanced);
        currentPage = normalizedPage;
        const { screen, attrs } = renderOptionsMenu(normalizedPage, showHelp, flags, showAdvanced);

        display.clearScreen();
        for (let r = 0; r < display.rows; r++) {
            const line = screen[r] || '';
            const lineAttrs = attrs[r] || '';
            const maxCols = Math.min(display.cols, line.length);
            for (let c = 0; c < maxCols; c++) {
                const attr = lineAttrs[c] === '1' ? 1 : 0;
                await display.putstr(c, r, line[c], undefined, attr);
            }
        }
    }

    function normalizeListFlag(flagName) {
        if (!Array.isArray(flags[flagName])) {
            flags[flagName] = [];
        }
        return flags[flagName];
    }

    function normalizeStatusConditionFlag() {
        const raw = flags.statusconditions;
        if (Array.isArray(raw)) {
            flags.statusconditions = raw.filter(name => STATUS_CONDITION_FIELDS_ALPHA.includes(name));
            return flags.statusconditions;
        }
        const count = (typeof raw === 'number')
            ? Math.max(0, Math.min(STATUS_CONDITION_FIELDS_ALPHA.length, raw))
            : STATUS_CONDITION_DEFAULT_ON.size;
        flags.statusconditions = STATUS_CONDITION_FIELDS_ALPHA.filter((name, idx) => {
            if (typeof raw === 'number') return idx < count;
            return STATUS_CONDITION_DEFAULT_ON.has(name);
        });
        return flags.statusconditions;
    }

    async function renderSimpleEditorLines(title, lines) {
        display.clearScreen();
        const maxRows = Math.min(display.rows, lines.length + 3);
        const header = ` ${title} `;
        await display.putstr(0, 0, header, undefined, 1);
        await display.putstr(0, 1, '');
        for (let i = 0; i < maxRows - 2; i++) {
            await display.putstr(0, i + 2, lines[i].substring(0, display.cols));
        }
    }

    async function renderCenteredList(lines, left = 41, headerInverse = false) {
        display.clearScreen();
        for (let i = 0; i < lines.length && i < display.rows; i++) {
            const text = lines[i].substring(0, Math.max(0, display.cols - left));
            const attr = (headerInverse && i === 0) ? 1 : 0;
            await display.putstr(left, i, text, undefined, attr);
        }
    }

    async function editDoWhatCountOption(option) {
        const list = normalizeListFlag(option.flag);
        const addPrompt = option.flag === 'menucolors'
            ? 'What new menucolor pattern? '
            : 'What new autopickup exception pattern? ';
        const addLabel = option.flag === 'menucolors'
            ? 'a - add new menucolor'
            : 'a - add new autopickup exception';

        while (true) {
            const lines = [
                'Do what?',
                '',
                addLabel,
                'x * exit this menu',
                '(end)'
            ];
            await renderCenteredList(lines);

            const ch = await nhgetch_raw();
            const c = String.fromCharCode(ch);
            if (ch === 27 || c === 'x') {
                saveFlags(flags);
                return;
            }
            if (c === 'a') {
                const added = await getlin(addPrompt, display);
                if (added !== null) {
                    const trimmed = added.trim();
                    if (trimmed.length > 0) list.push(trimmed);
                }
                continue;
            }
        }
    }

    async function editStatusHilitesOption() {
        if (!flags.statushighlights || typeof flags.statushighlights !== 'object' || Array.isArray(flags.statushighlights)) {
            flags.statushighlights = {};
        }
        let page = 1;
        const pageSize = 21;

        while (true) {
            const lines = [];
            const totalPages = Math.ceil(STATUS_HILITE_FIELDS.length / pageSize);
            const start = (page - 1) * pageSize;
            const visible = STATUS_HILITE_FIELDS.slice(start, start + pageSize);

            if (page === 1) {
                lines.push('Status hilites:');
                lines.push('');
            }
            for (let i = 0; i < visible.length; i++) {
                const key = String.fromCharCode('a'.charCodeAt(0) + i);
                lines.push(`${key} - ${visible[i]}`);
            }
            lines.push(`(${page} of ${totalPages})`);
            display.clearScreen();
            for (let i = 0; i < lines.length && i < display.rows; i++) {
                const row = (i === lines.length - 1) ? 23 : i;
                await display.putstr(0, row, lines[i].substring(0, display.cols));
            }

            const ch = await nhgetch_raw();
            const c = String.fromCharCode(ch);
            if (ch === 27 || c === 'q') {
                return;
            }
            if (c === '>' && page < totalPages) {
                page += 1;
                continue;
            }
            if (c === '<' && page > 1) {
                page -= 1;
                continue;
            }
            if (c >= 'a' && c <= 'z') {
                const idx = c.charCodeAt(0) - 'a'.charCodeAt(0);
                if (idx < 0 || idx >= visible.length) continue;
                const field = visible[idx];
                const label = field.toLowerCase();
                const lines2 = [
                    `Select ${label} field hilite behavior:`,
                    '',
                    `a - Always highlight ${label}`,
                    `${field === 'hunger' ? 'c - hunger value changes' : `c - ${label} value changes`}`,
                    `${field === 'hunger' ? 't - hunger text match' : `t - ${label} text match`}`,
                    '(end)'
                ];
                await renderCenteredList(lines2);
                const ch2 = await nhgetch_raw();
                const c2 = String.fromCharCode(ch2);
                if (c2 === 'a' || c2 === 'c' || c2 === 't') {
                    flags.statushighlights[field] = c2;
                    saveFlags(flags);
                }
            }
        }
    }

    async function editStatusConditionsOption() {
        const enabled = normalizeStatusConditionFlag();
        let page = 1;
        const pageSize = 19;

        while (true) {
            const totalPages = Math.ceil(STATUS_CONDITION_FIELDS_ALPHA.length / pageSize);
            const start = (page - 1) * pageSize;
            const visible = STATUS_CONDITION_FIELDS_ALPHA.slice(start, start + pageSize);
            const lines = [];
            if (page === 1) {
                lines.push('Choose status conditions to toggle');
                lines.push('');
                lines.push('S - change sort order from "alphabetically" to "by ranking"');
                lines.push('sorted alphabetically');
            }
            for (let i = 0; i < visible.length; i++) {
                const key = String.fromCharCode('a'.charCodeAt(0) + i);
                const mark = enabled.includes(visible[i]) ? '*' : '-';
                lines.push(`${key} ${mark} ${visible[i]}`);
            }
            lines.push(`(${page} of ${totalPages})`);

            display.clearScreen();
            for (let i = 0; i < lines.length && i < display.rows; i++) {
                const row = (i === lines.length - 1) ? 23 : i;
                await display.putstr(0, row, lines[i].substring(0, display.cols));
            }

            const ch = await nhgetch_raw();
            const c = String.fromCharCode(ch);
            if (ch === 27) {
                saveFlags(flags);
                return;
            }
            if (c === '>' && page < totalPages) {
                page += 1;
                continue;
            }
            if (c === '<' && page > 1) {
                page -= 1;
                continue;
            }
            if (c >= 'a' && c <= 'z') {
                const idx = c.charCodeAt(0) - 'a'.charCodeAt(0);
                if (idx < 0 || idx >= visible.length) continue;
                const field = visible[idx];
                const pos = enabled.indexOf(field);
                if (pos >= 0) enabled.splice(pos, 1);
                else enabled.push(field);
                saveFlags(flags);
            }
        }
    }

    async function editNumberPadModeOption() {
        const lines = [
            'Select number_pad mode:',
            '',
            'a -  0 (off)',
            'b -  1 (on)',
            'c -  2 (on, MSDOS compatible)',
            'd -  3 (on, phone-style digit layout)',
            'e -  4 (on, phone-style layout, MSDOS compatible)',
            "f - -1 (off, 'z' to move upper-left, 'y' to zap wands)",
            '(end)',
        ];
        await renderCenteredList(lines, 24, true);
        const ch = await nhgetch_raw();
        const c = String.fromCharCode(ch);
        const modeByKey = { a: 0, b: 1, c: 2, d: 3, e: 4, f: -1 };
        if (Object.prototype.hasOwnProperty.call(modeByKey, c)) {
            flags.number_pad = modeByKey[c];
            saveFlags(flags);
        }
    }

    async function editAutounlockOption() {
        const actions = [
            { key: 'u', token: 'untrap', suffix: '(might fail)' },
            { key: 'a', token: 'apply-key', suffix: '' },
            { key: 'k', token: 'kick', suffix: '(doors only)' },
            { key: 'f', token: 'force', suffix: '(chests/boxes only)' },
        ];
        const tokenOrder = new Map(actions.map((a, idx) => [a.token, idx]));
        const parseSelected = () => {
            const raw = String(flags.autounlock ?? '').trim();
            if (raw === 'none') return new Set();
            if (!raw) return new Set(['apply-key']);
            const selected = new Set();
            for (const part of raw.split(/[,\s]+/)) {
                const tok = part.trim();
                if (!tok) continue;
                if (tokenOrder.has(tok)) selected.add(tok);
            }
            return selected;
        };
        const saveSelected = (selected) => {
            if (selected.size === 0) {
                flags.autounlock = 'none';
            } else {
                flags.autounlock = Array.from(selected)
                    .sort((a, b) => (tokenOrder.get(a) ?? 99) - (tokenOrder.get(b) ?? 99))
                    .join(',');
            }
            saveFlags(flags);
        };

        while (true) {
            const selected = parseSelected();
            const lines = ["Select 'autounlock' actions:", ''];
            for (const action of actions) {
                const mark = selected.has(action.token) ? '*' : '-';
                const spacer = action.suffix ? ' '.repeat(Math.max(1, 11 - action.token.length)) : '';
                lines.push(`${action.key} ${mark} ${action.token}${spacer}${action.suffix}`.trimEnd());
            }
            lines.push('(end)');
            display.clearScreen();
            display.renderMap((game.lev || game.map), player, game.fov, flags);
            for (let i = 0; i < lines.length && i < display.rows; i++) {
                const text = lines[i].substring(0, Math.max(0, display.cols - 41));
                const attr = (i === 0) ? 1 : 0;
                await display.putstr(41, i, ' '.repeat(Math.max(0, display.cols - 41)));
                await display.putstr(41, i, text, undefined, attr);
            }

            const ch = await nhgetch_raw();
            const c = String.fromCharCode(ch).toLowerCase();
            if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
                return;
            }
            const action = actions.find((entry) => entry.key === c);
            if (!action) continue;
            if (selected.has(action.token)) selected.delete(action.token);
            else selected.add(action.token);
            saveSelected(selected);
        }
    }

    async function editPickupTypesOption() {
        const choices = [
            { key: 'a', glyph: '$', symbol: '$', label: 'pile of coins' },
            { key: 'b', glyph: '"', symbol: '"', label: 'amulet' },
            { key: 'c', glyph: ')', symbol: ')', label: 'weapon' },
            { key: 'd', glyph: '[', symbol: '[', label: 'suit or piece of armor' },
            { key: 'e', glyph: '%', symbol: '%', label: 'piece of food' },
            { key: 'f', glyph: '?', symbol: '?', label: 'scroll' },
            { key: 'g', glyph: '+', symbol: '+', label: 'spellbook' },
            { key: 'h', glyph: '!', symbol: '!', label: 'potion' },
            { key: 'i', glyph: '=', symbol: '=', label: 'ring' },
            { key: 'j', glyph: '/', symbol: '/', label: 'wand' },
            { key: 'k', glyph: '(', symbol: '(', label: 'useful item (pick-axe, key, lamp...)' },
            { key: 'l', glyph: '*', symbol: '*', label: 'gem or rock' },
            { key: 'm', glyph: '`', symbol: '`', label: 'boulder or statue' },
            { key: 'n', glyph: '0', symbol: '0', label: 'iron ball' },
            { key: 'o', glyph: '_', symbol: '_', label: 'iron chain' },
        ];
        const symbolOrder = new Map(choices.map((choice, idx) => [choice.symbol, idx]));

        const parseTypes = () => {
            const raw = String(flags.pickup_types || '');
            if (!raw) return new Set();
            return new Set(raw.split(''));
        };

        const saveTypes = (set) => {
            const sorted = Array.from(set).sort((a, b) =>
                (symbolOrder.get(a) ?? 999) - (symbolOrder.get(b) ?? 999));
            flags.pickup_types = sorted.join('');
            saveFlags(flags);
        };

        while (true) {
            const selected = parseTypes();
            const lines = ['Autopickup what?', ''];
            for (const choice of choices) {
                const mark = selected.has(choice.symbol) ? '+' : '-';
                lines.push(`${choice.key} ${mark} ${choice.glyph}  ${choice.label}`);
            }
            lines.push('');
            lines.push('A -    All classes of objects');
            lines.push('Note: when no choices are selected, "all" is implied.');
            lines.push("Toggle off 'autopickup' to not pick up anything.");
            lines.push('(end)');
            display.clearScreen();
            display.renderMap((game.lev || game.map), player, game.fov, flags);
            // Session captures for this menu are column-shifted by one map cell.
            // Apply that shift in headless parity mode before drawing the right panel.
            if (Array.isArray(display.grid) && Array.isArray(display.colors) && Array.isArray(display.attrs)) {
                for (let row = 1; row <= 21 && row < display.rows; row++) {
                    for (let col = 0; col < display.cols - 1; col++) {
                        display.grid[row][col] = display.grid[row][col + 1];
                        display.colors[row][col] = display.colors[row][col + 1];
                        display.attrs[row][col] = display.attrs[row][col + 1];
                    }
                    display.grid[row][display.cols - 1] = ' ';
                    display.colors[row][display.cols - 1] = 7;
                    display.attrs[row][display.cols - 1] = 0;
                }
            }
            for (let i = 0; i < lines.length && i < display.rows; i++) {
                const text = lines[i].substring(0, Math.max(0, display.cols - 25));
                const attr = (i === 0) ? 1 : 0;
                await display.putstr(24, i, ' '.repeat(Math.max(0, display.cols - 24)));
                await display.putstr(25, i, text, undefined, attr);
            }

            const ch = await nhgetch_raw();
            const c = String.fromCharCode(ch);
            if (ch === 27 || ch === 10 || ch === 13 || c === ' ' || c === 'q' || c === 'x') {
                return;
            }
            if (c === 'A') {
                selected.clear();
                saveTypes(selected);
                continue;
            }
            const choice = choices.find((entry) => entry.key === c);
            if (!choice) continue;
            if (selected.has(choice.symbol)) selected.delete(choice.symbol);
            else selected.add(choice.symbol);
            saveTypes(selected);
        }
    }

    // Interactive loop - C ref: options.c doset() menu loop
    while (true) {
        await drawOptions();

        // Get input - C ref: options.c menu input loop
        const ch = await nhgetch_raw();
        const c = String.fromCharCode(ch);

        // Check for exit
        if (ch === 27 || ch === 10 || ch === 13 || c === 'q' || c === ' ') { // ESC, Enter, space, or q
            break;
        }

        // Check for navigation - C ref: MENU_NEXT_PAGE, MENU_PREVIOUS_PAGE, MENU_FIRST_PAGE
        // Also accept J/K (PageDown/PageUp from browser_input.js arrow key mapping)
        if (c === '>' || c === 'J') {
            const maxPage = getTotalPages(showHelp, showAdvanced);
            if (currentPage < maxPage) currentPage += 1;
            continue;
        }
        if (c === '<' || c === 'K') {
            if (currentPage > 1) currentPage -= 1;
            continue;
        }
        if (c === '^') {
            currentPage = 1;
            continue;
        }
        if (c === '?') {
            showHelp = !showHelp;
            currentPage = normalizeOptionsPage(currentPage, showHelp, showAdvanced);
            continue;
        }

        // Check for option selection
        const selected = getOptionByKey(currentPage, showHelp, c, showAdvanced);
        if (selected) {
            if (selected.flag === 'number_pad') {
                await editNumberPadModeOption();
                continue;
            }
            if (selected.flag === 'autounlock') {
                await editAutounlockOption();
                currentPage = 1;
                showHelp = false;
                continue;
            }
            if (selected.flag === 'pickup_types') {
                await editPickupTypesOption();
                currentPage = 1;
                showHelp = false;
                continue;
            }
            if (selected.type === 'bool') {
                setOptionValue(currentPage, showHelp, c, null, flags);
                applyOptionSideEffects();
                continue;
            }

            if (selected.type === 'count') {
                if (selected.flag === 'statusconditions') {
                    await editStatusConditionsOption();
                    currentPage = 1;
                    showHelp = false;
                } else if (selected.flag === 'statushighlights') {
                    await editStatusHilitesOption();
                    currentPage = 1;
                    showHelp = false;
                } else {
                    await editDoWhatCountOption(selected);
                    currentPage = 1;
                    showHelp = false;
                }
                continue;
            }

            const prompt = `Set ${selected.name} to what? `;
            const newValue = await getlin(prompt, display);
            if (newValue !== null) {
                setOptionValue(currentPage, showHelp, c, newValue, flags);
                if (selected.flag === 'name') {
                    player.name = flags.name;
                }
                applyOptionSideEffects();
            }
        }
        // If invalid key, just loop again (menu stays open, no error message)
    }

    // Restore game display after exiting menu
    // Clear screen first to remove all menu text
    display.clearScreen();
    display.renderMap((game.lev || game.map), player, game.fov, flags);
    display.renderStatus(player);

    return { moved: false, tookTime: false };
}
