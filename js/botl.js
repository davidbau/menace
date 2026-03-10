import { strchr } from './hacklib.js';
import { roles } from './role.js';
import { depth, dunlev, In_quest, In_endgame } from './dungeon.js';
// botl.js -- Bottom status line: HP, AC, experience, conditions
// cf. botl.c — get_strength_str, check_gold_symbol, do_statusline1, do_statusline2,
//              bot, timebot, xlev_to_rank, rank_to_xlev, rank_of, rank,
//              title_to_mon, max_rank_sz, botl_score, describe_level,
//              bot_via_windowport, stat_update_time, condopt
//
// botl.c renders the two-line status display:
//   do_statusline1(): name, rank/role, attributes, alignment.
//   do_statusline2(): dungeon level, HP, power, AC, XP, hunger, conditions.
//   bot(): calls windowport to update both status lines.
//   rank_of(): returns character rank/title for current level and role.
//   describe_level(): formats dungeon level name for status display.
//   bot_via_windowport(): updates individual status fields via windowport.
//
// JS implementations:
//   bot()/do_statusline1/2 → display.js:711 renderStatus() (PARTIAL —
//     renders HP/AC/level but may diverge from C field details)

// cf. botl.c:23 — get_strength_str(void): format strength as string
// Formats STR attribute with special 18/xx notation for exceptional strength.
// TODO: botl.c:23 — get_strength_str(): strength string formatting

// cf. botl.c:42 — check_gold_symbol(void): determine gold symbol display
// Decides if gold glyph should be shown or hidden in status.
// TODO: botl.c:42 — check_gold_symbol(): gold display check

// cf. botl.c:50 — do_statusline1(void): build first status line
// Formats: name, rank/monster, attributes (STR/DEX/CON/INT/WIS/CHA), alignment.
// TODO: botl.c:50 — do_statusline1(): first status line construction

// cf. botl.c:103 — do_statusline2(void): build second status line
// Formats: dungeon level, HP/Pw/AC/XP, hunger state, condition flags.
// TODO: botl.c:103 — do_statusline2(): second status line construction

// cf. botl.c:255 — bot(void): update status display
// Calls windowport to update both status lines via bot_via_windowport or legacy.
// JS equiv: display.js:711 — renderStatus() (PARTIAL)
// PARTIAL: botl.c:255 — bot() ↔ display.js:711

// cf. botl.c:277 — timebot(void): update time/move counter only
// Updates just the move counter field in the status display.
// TODO: botl.c:277 — timebot(): move counter update

// cf. botl.c:300 — xlev_to_rank(xlev): experience level to rank index
// Converts experience level (1-30) to rank index (0-8) for title lookup.
// TODO: botl.c:300 — xlev_to_rank(): level to rank conversion

// cf. botl.c:317 — rank_to_xlev(rank): rank index to experience level
// Converts rank index (0-8) back to experience level (1-30).
// TODO: botl.c:317 — rank_to_xlev(): rank to level conversion

// cf. botl.c:334 — rank_of(lev, monnum, female): character rank string
export function rank_of(lev, monnum, female) {
    // Find the role by mnum
    let role = roles.find(r => r.mnum === monnum);
    if (!role) role = roles[0]; // fallback to first role
    // Find the rank
    for (let i = xlev_to_rank(lev); i >= 0; i--) {
        if (female && role.ranks[i] && role.ranks[i].f)
            return role.ranks[i].f;
        if (role.ranks[i] && role.ranks[i].m)
            return role.ranks[i].m;
    }
    // Try the role name instead
    if (female && role.namef)
        return role.namef;
    if (role.name)
        return role.name;
    return "Player";
}

// cf. botl.c:404 — max_rank_sz(): max rank title length for current role
export function max_rank_sz(player) {
    const role = roles.find(r => r.mnum === player?.roleMnum) || roles[0];
    let maxr = 0;
    for (let i = 0; i < 9; i++) {
        if (role.ranks[i]?.m && role.ranks[i].m.length > maxr)
            maxr = role.ranks[i].m.length;
        if (role.ranks[i]?.f && role.ranks[i].f.length > maxr)
            maxr = role.ranks[i].f.length;
    }
    return maxr;
}

// cf. botl.c:421 — botl_score(void): compute display score
// Computes total score from XP, gold, and dungeon depth for SCORE_ON_BOTL.
// TODO: botl.c:421 — botl_score(): status line score computation

// cf. botl.c:443 — describe_level(uz, dflgs): format dungeon level
export function describe_level(uz, dflgs) {
    const addspace = (dflgs & 1) !== 0;
    let addbranch = (dflgs & 2) !== 0;
    let buf;
    if (In_quest(uz)) {
        buf = `Home ${dunlev(uz)}`;
    } else if (In_endgame(uz)) {
        buf = `End Game`;
        addbranch = false;
    } else {
        if (!addbranch)
            buf = `Dlvl:${depth(uz)}`;
        else
            buf = `level ${depth(uz)}`;
    }
    if (addspace) buf += ' ';
    return buf;
}

// cf. botl.c:744 [static] — bot_via_windowport(void): update via windowport
// Updates individual status fields through the windowport field tracking system.
// TODO: botl.c:744 — bot_via_windowport(): windowport status update

// cf. botl.c:1037 [static] — stat_update_time(void): update time field only
// Updates only the time/move counter field in windowport status display.
// TODO: botl.c:1037 — stat_update_time(): time field update

// cf. botl.c:1055 — condopt(idx, addr, negated): condition display toggle
// Handles player choice to enable/disable individual condition display.
// TODO: botl.c:1055 — condopt(): condition display option

// Autotranslated from botl.c:23
export function get_strength_str(player) {
  let buf, st = acurr(player,A_STR);
  if (st > 18) {
    if (st > STR18(100)) {
      buf = `${st - 100}`.padStart(2);
    }
    else if (st < STR18(100)) {
      buf = `18/${String(st - 18).padStart(2, '0')}`;
    }
    else {
      buf = "18/**";
    }
  }
  else {
    buf = `${st}`;
  }
  return buf;
}

// Autotranslated from botl.c:300
export function xlev_to_rank(xlev) {
  return (xlev <= 2) ? 0 : (xlev <= 30) ? Math.floor((xlev + 2) / 4) : 8;
}

// Autotranslated from botl.c:317
export function rank_to_xlev(rank) {
  return (rank < 1) ? 1 : (rank < 2) ? 3 : (rank < 8) ? ((rank * 4) - 2) : 30;
}

// cf. botl.c:363 — rank(): current player rank title
export function rank(game, player) {
  return rank_of(player.ulevel, player.roleMnum, game.flags?.female);
}

// cf. botl.c:369 — title_to_mon(str): parse rank title, return role mnum
// Returns {mnum, rank_indx, title_length} or null if not found.
export function title_to_mon(str) {
  for (let i = 0; i < roles.length; i++) {
    for (let j = 0; j < 9; j++) {
      const r = roles[i].ranks[j];
      if (!r) continue;
      if (r.m && str.toLowerCase().startsWith(r.m.toLowerCase())) {
        return { mnum: roles[i].mnum, rank_indx: j, title_length: r.m.length };
      }
      if (r.f && str.toLowerCase().startsWith(r.f.toLowerCase())) {
        return { mnum: roles[i].mnum, rank_indx: j, title_length: r.f.length };
      }
    }
  }
  return null;
}

// Autotranslated from botl.c:1106
export function parse_cond_option(negated, opts) {
  let i, sl, compareto, uniqpart, prefix = "cond_";
  if (!opts || opts.length <= prefix.length - 1) return 2;
  uniqpart = opts + (prefix.length - 1);
  for (i = 0; i < CONDITION_COUNT; ++i) {
    compareto = condtests[i].useroption;
    sl = Strlen(compareto);
    if (match_optname(uniqpart, compareto, (sl >= 4) ? 4 : sl, false)) { condopt(i, condtests[i].choice, negated); return 0; }
  }
  return 1;
}

// Autotranslated from botl.c:1469
export function status_finish(game) {
  let i;
  if (windowprocs.win_status_finish) ( windowprocs.win_status_finish)();
  for (i = 0; i < MAXBLSTATS; ++i) {
    if (game.gb.blstats[0][i].val) (game.gb.blstats[0][i].val, 0), game.gb.blstats[0][i].val =  null;
    if (game.gb.blstats[1][i].val) (game.gb.blstats[1][i].val, 0), game.gb.blstats[1][i].val =  null;
    game.gb.blstats[0][i].hilite_rule = game.gb.blstats[1][i].hilite_rule = 0;
    if (game.gb.blstats[0][i].thresholds) {
      let temp, next;
      for (temp = game.gb.blstats[0][i].thresholds; temp; temp = next) {
        next = temp.next;
        (temp, 0);
      }
      game.gb.blstats[0][i].thresholds = game.gb.blstats[1][i].thresholds =  null;
    }
  }
}

// Autotranslated from botl.c:1719
export function percentage(bl, maxbl) {
  let result = 0, anytype, ival, mval, lval, uval, ulval, fld, use_rawval;
  if (!bl || !maxbl) {
    impossible("percentage: bad istat pointer %s, %s", fmt_ptr( bl), fmt_ptr( maxbl));
    return 0;
  }
  fld = bl.fld;
  use_rawval = (fld === BL_HP || fld === BL_ENE);
  ival = 0, lval = 0, uval = 0, ulval = 0;
  anytype = bl.anytype;
  if (maxbl.a.a_void) {
    switch (anytype) {
      case ANY_INT:
        ival = use_rawval ? bl.rawval.a_int : bl.a.a_int;
      mval = use_rawval ? maxbl.rawval.a_int : maxbl.a.a_int;
      result = ((100 * ival) / mval);
      break;
      case ANY_LONG:
        lval = bl.a.a_long;
      result =  ((100 * lval) / maxbl.a.a_long);
      break;
      case ANY_UINT:
        uval = bl.a.a_uint;
      result =  ((100 * uval) / maxbl.a.a_uint);
      break;
      case ANY_ULONG:
        ulval = bl.a.a_ulong;
      result =  ((100 * ulval) / maxbl.a.a_ulong);
      break;
      case ANY_IPTR:
        ival = bl.a.a_iptr;
      result = ((100 * ival) / ( maxbl.a.a_iptr));
      break;
      case ANY_LPTR:
        lval = bl.a.a_lptr;
      result =  ((100 * lval) / ( maxbl.a.a_lptr));
      break;
      case ANY_UPTR:
        uval = bl.a.a_uptr;
      result =  ((100 * uval) / ( maxbl.a.a_uptr));
      break;
      case ANY_ULPTR:
        ulval = bl.a.a_ulptr;
      result =  ((100 * ulval) / ( maxbl.a.a_ulptr));
      break;
    }
  }
  if (result === 0 && (ival !== 0 || lval !== 0 || uval !== 0 || ulval !== 0)) result = 1;
  return result;
}

// Autotranslated from botl.c:1794
export function exp_percentage(player) {
  let res = 0;
  if (player.ulevel < 30) {
    let exp_val, nxt_exp_val, curlvlstart;
    curlvlstart = newuexp(player.ulevel - 1);
    exp_val = player.uexp - curlvlstart;
    nxt_exp_val = newuexp(player.ulevel) - curlvlstart;
    if (exp_val === nxt_exp_val - 1) { res = 100; }
    else {
      let curval, maxval;
      curval.anytype = maxval.anytype = ANY_LONG;
      curval.a = maxval.a = { a_int: 0 };
      curval.a.a_long = exp_val;
      maxval.a.a_long = nxt_exp_val;
      curval.fld = maxval.fld = BL_EXP;
      res = percentage( curval, maxval);
    }
  }
  return res;
}

// Autotranslated from botl.c:1902
export function bl_idx_to_fldname(idx) {
  if (idx >= 0 && idx < MAXBLSTATS) return initblstats[idx].fldname;
  return  0;
}

// Autotranslated from botl.c:1999
export function hilite_reset_needed(bl_p, augmented_time, game) {
  if (game.multi) return false;
  if (!Is_Temp_Hilite(bl_p.hilite_rule)) return false;
  if (bl_p.time === 0 || bl_p.time >= augmented_time) return false;
  return true;
}

// Autotranslated from botl.c:2318
export function split_clridx(idx, coloridx, attrib) {
  if (coloridx) coloridx = idx & 0x00FF;
  if (attrib) attrib = (idx >> 8) & 0x00FF;
}

// Autotranslated from botl.c:2415
export function has_ltgt_percentnumber(str) {
  let s = str;
  while ( s) {
    if (!strchr("<>=-+0123456789%", s)) return false;
    s++;
  }
  return true;
}

// Autotranslated from botl.c:2472
export function is_fld_arrayvalues(str, arr, arrmin, arrmax, retidx) {
  let i;
  for (i = arrmin; i < arrmax; i++) {
    if (!(String(str).toLowerCase().localeCompare(String(arr[i]).toLowerCase()))) { retidx = i; return true; }
  }
  return false;
}

// Autotranslated from botl.c:2489
export async function query_arrayvalue(querystr, arr, arrmin, arrmax) {
  let i, res, ret = arrmin - 1, tmpwin, any, picks = null;
  let adj = (arrmin > 0) ? 1 : arrmax, clr = NO_COLOR;
  tmpwin = create_nhwindow(NHW_MENU);
  start_menu(tmpwin, MENU_BEHAVE_STANDARD);
  for (i = arrmin; i < arrmax; i++) {
    if (!arr) {
      continue;
    }
    any = { a_int: 0 };
    any.a_int = i + adj;
    add_menu(tmpwin, nul_glyphinfo, any, 0, 0, ATR_NONE, clr, arr, MENU_ITEMFLAGS_NONE);
  }
  end_menu(tmpwin, querystr);
  res = await select_menu(tmpwin, PICK_ONE, picks);
  destroy_nhwindow(tmpwin);
  if (res > 0) { ret = picks.item.a_int - adj; (picks, 0); }
  return ret;
}

// Autotranslated from botl.c:2526
export function status_hilite_add_threshold(fld, hilite, game) {
  let new_hilite, old_hilite;
  if (!hilite) return;
  new_hilite = { ...hilite };
  new_hilite.set = true;
  new_hilite.fld = fld;
  new_hilite.next =  0;
  if (!game.gb.blstats[0][fld].thresholds) { game.gb.blstats[0][fld].thresholds = new_hilite; }
  else {
    for (old_hilite = game.gb.blstats[0][fld].thresholds; old_hilite.next; old_hilite = old_hilite.next) {
      continue;
    }
    old_hilite.next = new_hilite;
  }
  game.gb.blstats[1][fld].thresholds = game.gb.blstats[0][fld].thresholds;
}

// Autotranslated from botl.c:2851
export async function query_conditions() {
  let i, res, ret = 0, tmpwin, any, picks = null, clr = NO_COLOR;
  tmpwin = create_nhwindow(NHW_MENU);
  start_menu(tmpwin, MENU_BEHAVE_STANDARD);
  for (i = 0; i < SIZE(conditions); i++) {
    any = { a_int: 0 };
    any.a_ulong = conditions[i].mask;
    add_menu(tmpwin, nul_glyphinfo, any, 0, 0, ATR_NONE, clr, conditions[i].text, MENU_ITEMFLAGS_NONE);
  }
  end_menu(tmpwin, "Choose status conditions");
  res = await select_menu(tmpwin, PICK_ANY, picks);
  destroy_nhwindow(tmpwin);
  if (res > 0) {
    for (i = 0; i < res; i++) {
      ret |= picks[i].item.a_ulong;
    }
    (picks, 0);
  }
  return ret;
}

// Autotranslated from botl.c:2883
export function conditionbitmask2str(ul) {
  let buf, i, first = true, alias =  0;
  buf = '\0';
  if (!ul) return buf;
  for (i = 1; i < SIZE(condition_aliases); i++) {
    if (condition_aliases[i].bitmask === ul) alias = condition_aliases[i].id;
  }
  for (i = 0; i < SIZE(conditions); i++) {
    if ((conditions[i].mask & ul) !== 0) {
      buf += `${first ? "" : "+"}${conditions[i].text[0]}`;
      first = false;
    }
  }
  if (!first && alias) {
    buf = alias;
  }
  return buf;
}

// Autotranslated from botl.c:2951
export function str2conditionbitmask(str) {
  let conditions_bitmask = 0, subfields, i, sf;
  sf = splitsubfields(str, subfields, SIZE(conditions));
  if (sf < 1) return 0;
  for (i = 0; i < sf; ++i) {
    let bm = match_str2conditionbitmask(subfields[i]);
    if (!bm) {
      config_error_add("Unknown condition '%s'", subfields[i]);
      return 0;
    }
    conditions_bitmask |= bm;
  }
  return conditions_bitmask;
}

// Autotranslated from botl.c:3093
export function clear_status_hilites(game) {
  let i;
  for (i = 0; i < MAXBLSTATS; ++i) {
    let temp, next;
    for (temp = game.gb.blstats[0][i].thresholds; temp; temp = next) {
      next = temp.next;
      (temp, 0);
    }
    game.gb.blstats[0][i].thresholds = game.gb.blstats[1][i].thresholds = 0;
    game.gb.blstats[0][i].hilite_rule = game.gb.blstats[1][i].hilite_rule = 0;
  }
}

// Autotranslated from botl.c:3111
export function hlattr2attrname(attrib, buf, bufsz) {
  if (attrib && buf) {
    let attbuf, first = 0, k;
    attbuf = '\0';
    if (attrib === HL_NONE) { buf = "normal"; return buf; }
    if (attrib & HL_BOLD) {
      Strcat(attbuf, first++ ? "+bold" : "bold");
    }
    if (attrib & HL_DIM) {
      Strcat(attbuf, first++ ? "+dim" : "dim");
    }
    if (attrib & HL_ITALIC) {
      Strcat(attbuf, first++ ? "+italic" : "italic");
    }
    if (attrib & HL_ULINE) {
      Strcat(attbuf, first++ ? "+underline" : "underline");
    }
    if (attrib & HL_BLINK) {
      Strcat(attbuf, first++ ? "+blink" : "blink");
    }
    if (attrib & HL_INVERSE) {
      Strcat(attbuf, first++ ? "+inverse" : "inverse");
    }
    k = attbuf.length;
    if (k < (bufsz - 1)) {
      buf = attbuf;
    }
    return buf;
  }
  return  0;
}

// Autotranslated from botl.c:3190
export function status_hilite_linestr_done() {
  let nxt, tmp = status_hilite_str;
  while (tmp) {
    nxt = tmp.next;
    (tmp, 0);
    tmp = nxt;
  }
  status_hilite_str =  0;
  status_hilite_str_id = 0;
}

// Autotranslated from botl.c:3204
export function status_hilite_linestr_countfield(fld) {
  let tmp, countall = (fld === BL_FLUSH), count = 0;
  for (tmp = status_hilite_str; tmp; tmp = tmp.next) {
    if (countall || tmp.fld === fld) count++;
  }
  return count;
}

// Autotranslated from botl.c:3219
export function count_status_hilites() {
  let count;
  status_hilite_linestr_gather();
  count = status_hilite_linestr_countfield(BL_FLUSH);
  status_hilite_linestr_done();
  return count;
}

// Autotranslated from botl.c:3312
export function status_hilite_linestr_gather(game) {
  let i, hl;
  status_hilite_linestr_done();
  for (i = 0; i < MAXBLSTATS; i++) {
    hl = game.gb.blstats[0][i].thresholds;
    while (hl) {
      status_hilite_linestr_add(i, hl, 0, status_hilite2str(hl));
      hl = hl.next;
    }
  }
  status_hilite_linestr_gather_conditions();
}

// Autotranslated from botl.c:3414
export async function status_hilite_menu_choose_field(game) {
  let tmpwin, i, res, fld = BL_FLUSH, any, picks = null, clr = NO_COLOR;
  tmpwin = create_nhwindow(NHW_MENU);
  start_menu(tmpwin, MENU_BEHAVE_STANDARD);
  for (i = 0; i < MAXBLSTATS; i++) {
    if (initblstats[i].fld === BL_SCORE && !game.gb.blstats[0][BL_SCORE].thresholds) {
      continue;
    }
    any = { a_int: 0 };
    any.a_int = (i + 1);
    add_menu(tmpwin, nul_glyphinfo, any, 0, 0, ATR_NONE, clr, initblstats[i].fldname, MENU_ITEMFLAGS_NONE);
  }
  end_menu(tmpwin, "Select a hilite field:");
  res = await select_menu(tmpwin, PICK_ONE, picks);
  destroy_nhwindow(tmpwin);
  if (res > 0) { fld = picks.item.a_int - 1; (picks, 0); }
  return fld;
}

// Autotranslated from botl.c:3449
export async function status_hilite_menu_choose_behavior(fld) {
  let tmpwin, res = 0, beh = BL_TH_NONE-1, any, picks = null, buf, at;
  let onlybeh = BL_TH_NONE, nopts = 0, clr = NO_COLOR;
  if (fld < 0 || fld >= MAXBLSTATS) return BL_TH_NONE;
  at = initblstats[fld].anytype;
  tmpwin = create_nhwindow(NHW_MENU);
  start_menu(tmpwin, MENU_BEHAVE_STANDARD);
  if (fld !== BL_CONDITION) {
    any = { a_int: 0 };
    any.a_int = onlybeh = BL_TH_ALWAYS_HILITE;
    buf = `Always highlight ${initblstats[fld].fldname}`;
    add_menu(tmpwin, nul_glyphinfo, any, 'a', 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
    nopts++;
  }
  if (fld === BL_CONDITION) {
    any = { a_int: 0 };
    any.a_int = onlybeh = BL_TH_CONDITION;
    add_menu(tmpwin, nul_glyphinfo, any, 'b', 0, ATR_NONE, clr, "Bitmask of conditions", MENU_ITEMFLAGS_NONE);
    nopts++;
  }
  if (fld !== BL_CONDITION && fld !== BL_VERS) {
    any = { a_int: 0 };
    any.a_int = onlybeh = BL_TH_UPDOWN;
    buf = `${initblstats[fld].fldname} value changes`;
    add_menu(tmpwin, nul_glyphinfo, any, 'c', 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
    nopts++;
  }
  if (fld !== BL_CAP && fld !== BL_HUNGER && (at === ANY_INT || at === ANY_LONG)) {
    any = { a_int: 0 };
    any.a_int = onlybeh = BL_TH_VAL_ABSOLUTE;
    add_menu(tmpwin, nul_glyphinfo, any, 'n', 0, ATR_NONE, clr, "Number threshold", MENU_ITEMFLAGS_NONE);
    nopts++;
  }
  if (initblstats[fld].idxmax >= 0) {
    any = { a_int: 0 };
    any.a_int = onlybeh = BL_TH_VAL_PERCENTAGE;
    add_menu(tmpwin, nul_glyphinfo, any, 'p', 0, ATR_NONE, clr, "Percentage threshold", MENU_ITEMFLAGS_NONE);
    nopts++;
  }
  if (fld === BL_HP) {
    any = { a_int: 0 };
    any.a_int = onlybeh = BL_TH_CRITICALHP;
    buf = `Highlight critically low ${initblstats[fld].fldname}`;
    add_menu(tmpwin, nul_glyphinfo, any, 'C', 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
    nopts++;
  }
  if (initblstats[fld].anytype === ANY_STR || fld === BL_CAP || fld === BL_HUNGER) {
    any = { a_int: 0 };
    any.a_int = onlybeh = BL_TH_TEXTMATCH;
    buf = `${initblstats[fld].fldname} text match`;
    add_menu(tmpwin, nul_glyphinfo, any, 't', 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
    nopts++;
  }
  buf = `Select ${initblstats[fld].fldname} field hilite behavior:`;
  end_menu(tmpwin, buf);
  if (nopts > 1) {
    res = await select_menu(tmpwin, PICK_ONE, picks);
    if (res === 0) beh = BL_TH_NONE;
    else if (res === -1) beh = (BL_TH_NONE - 1);
  }
  else if (onlybeh !== BL_TH_NONE) { beh = onlybeh; }
  destroy_nhwindow(tmpwin);
  if (res > 0) { beh = picks.item.a_int; (picks, 0); }
  return beh;
}

// Autotranslated from botl.c:3553
export async function status_hilite_menu_choose_updownboth(fld, str, ltok, gtok) {
  let res, ret = NO_LTEQGT, tmpwin, buf, any, picks = null, clr = NO_COLOR;
  tmpwin = create_nhwindow(NHW_MENU);
  start_menu(tmpwin, MENU_BEHAVE_STANDARD);
  if (ltok) {
    if (str) {
      buf = `${(fld === BL_AC) ? "Better (lower)" : "Less"} than ${str}`;
    }
    else {
      buf = "Value goes down";
    }
    any = { a_int: 0 };
    any.a_int = 10 + LT_VALUE;
    add_menu(tmpwin, nul_glyphinfo, any, 0, 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
    if (str) {
      buf = `${str} or ${(fld === BL_AC) ? "better (lower)" : "less"}`;
      any = { a_int: 0 };
      any.a_int = 10 + LE_VALUE;
      add_menu(tmpwin, nul_glyphinfo, any, 0, 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
    }
  }
  if (str) {
    buf = `Exactly ${str}`;
  }
  else {
    buf = "Value changes";
  }
  any = { a_int: 0 };
  any.a_int = 10 + EQ_VALUE;
  add_menu(tmpwin, nul_glyphinfo, any, 0, 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
  if (gtok) {
    if (str) {
      buf = `${str} or ${(fld === BL_AC) ? "worse (higher)" : "more"}`;
      any = { a_int: 0 };
      any.a_int = 10 + GE_VALUE;
      add_menu(tmpwin, nul_glyphinfo, any, 0, 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
    }
    if (str) {
      buf = `${(fld === BL_AC) ? "Worse (higher)" : "More"} than ${str}`;
    }
    else {
      buf = "Value goes up";
    }
    any = { a_int: 0 };
    any.a_int = 10 + GT_VALUE;
    add_menu(tmpwin, nul_glyphinfo, any, 0, 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
  }
  buf = `Select field ${initblstats[fld].fldname} value:`;
  end_menu(tmpwin, buf);
  res = await select_menu(tmpwin, PICK_ONE, picks);
  destroy_nhwindow(tmpwin);
  if (res > 0) { ret = picks.item.a_int - 10; (picks, 0); }
  return ret;
}

// Autotranslated from botl.c:1085
export function cond_cmp(a, b) {
  // JS sort comparator: a/b are array elements (condition indices), not C pointers.
  const indx1 = Number(a);
  const indx2 = Number(b);
  const c1 = conditions[indx1].ranking;
  const c2 = conditions[indx2].ranking;
  if (c1 !== c2) return c1 - c2;
  return String(condtests[indx1].useroption || '')
    .toLowerCase()
    .localeCompare(String(condtests[indx2].useroption || '').toLowerCase());
}

// Autotranslated from botl.c:1098
export function menualpha_cmp(a, b) {
  const indx1 = Number(a);
  const indx2 = Number(b);
  return String(condtests[indx1].useroption || '')
    .toLowerCase()
    .localeCompare(String(condtests[indx2].useroption || '').toLowerCase());
}

// Autotranslated from botl.c:1963
export function fldname_to_bl_indx(name) {
  let i, nmatches = 0, fld = 0;
  if (name && name) {
    for (i = 0; i < SIZE(initblstats); i++) {
      if (fuzzymatch(initblstats[i].fldname, name, " -_", true)) { fld = initblstats[i].fld; nmatches++; }
    }
    if (!nmatches) {
      for (i = 0; fieldids_alias[i].fieldname; i++) {
        if (fuzzymatch(fieldids_alias[i].fieldname, name, " -_", true)) { fld = fieldids_alias[i].fldid; nmatches++; }
      }
    }
    if (!nmatches) {
      let len = name.length;
      for (i = 0; i < SIZE(initblstats); i++) {
        if (!strncmpi(name, initblstats[i].fldname, len)) { fld = initblstats[i].fld; nmatches++; }
      }
    }
  }
  return (nmatches === 1) ? fld : BL_FLUSH;
}

// Autotranslated from botl.c:2394
export function is_ltgt_percentnumber(str) {
  let s = str;
  if ( s === '<' || s === '>') s++;
  if ( s === '=') s++;
  if ( s === '-' || s === '+') s++;
  if (!digit( s)) return false;
  while (digit( s)) {
    s++;
  }
  if ( s === '%') s++;
  return ( s === '\x00');
}

// Autotranslated from botl.c:4193
export async function status_hilites_viewall() {
  let datawin, hlstr = status_hilite_str, buf;
  datawin = create_nhwindow(NHW_TEXT);
  while (hlstr) {
    buf = `OPTIONS=hilite_status: ${hlstr.str}`;
    await putstr(datawin, 0, buf);
    hlstr = hlstr.next;
  }
  await display_nhwindow(datawin, false);
  destroy_nhwindow(datawin);
}

// Autotranslated from botl.c:4214
export function all_options_statushilites(sbuf) {
  let hlstr, buf;
  status_hilite_linestr_done();
  status_hilite_linestr_gather();
  hlstr = status_hilite_str;
  while (hlstr) {
    buf = `OPTIONS=hilite_status: ${hlstr.str}\n`;
    strbuf_append(sbuf, buf);
    hlstr = hlstr.next;
  }
  status_hilite_linestr_done();
}

// Autotranslated from botl.c:2913
export function match_str2conditionbitmask(str) {
  let i, nmatches = 0, mask = 0;
  if (str && str) {
    for (i = 0; i < SIZE(conditions); i++) {
      if (fuzzymatch(conditions[i].text[0], str, " -_", true)) { mask |= conditions[i].mask; nmatches++; }
    }
    if (!nmatches) {
      for (i = 0; i < SIZE(condition_aliases); i++) {
        if (fuzzymatch(condition_aliases[i].id, str, " -_", true)) { mask |= condition_aliases[i].bitmask; nmatches++; }
      }
    }
    if (!nmatches) {
      let len = str.length;
      for (i = 0; i < SIZE(condition_aliases); i++) {
        if (!strncmpi(str, condition_aliases[i].id, len)) { mask |= condition_aliases[i].bitmask; nmatches++; }
      }
    }
  }
  return mask;
}
