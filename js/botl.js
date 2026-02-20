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
// Returns role rank/title string for given level, monster type, and gender.
// TODO: botl.c:334 — rank_of(): character rank title

// cf. botl.c:363 [static] — rank(void): current player rank
// Returns current player rank using current level and role.
// TODO: botl.c:363 — rank(): current rank lookup

// cf. botl.c:369 — title_to_mon(str, rank_indx, title_length): parse rank title
// Parses a rank title string and returns matching role/monster number.
// TODO: botl.c:369 — title_to_mon(): rank title parsing

// cf. botl.c:404 — max_rank_sz(void): max rank title length
// Calculates maximum length of all rank titles for current role.
// TODO: botl.c:404 — max_rank_sz(): rank title max length

// cf. botl.c:421 — botl_score(void): compute display score
// Computes total score from XP, gold, and dungeon depth for SCORE_ON_BOTL.
// TODO: botl.c:421 — botl_score(): status line score computation

// cf. botl.c:443 — describe_level(buf, dflgs): format dungeon level
// Formats current dungeon level description with optional branch name.
// TODO: botl.c:443 — describe_level(): dungeon level description

// cf. botl.c:744 [static] — bot_via_windowport(void): update via windowport
// Updates individual status fields through the windowport field tracking system.
// TODO: botl.c:744 — bot_via_windowport(): windowport status update

// cf. botl.c:1037 [static] — stat_update_time(void): update time field only
// Updates only the time/move counter field in windowport status display.
// TODO: botl.c:1037 — stat_update_time(): time field update

// cf. botl.c:1055 — condopt(idx, addr, negated): condition display toggle
// Handles player choice to enable/disable individual condition display.
// TODO: botl.c:1055 — condopt(): condition display option
