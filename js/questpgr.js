// questpgr.js -- Quest text pager: Lua-based quest dialog and text formatting
// cf. questpgr.c — quest_info, ldrname, is_quest_artifact, find_quest_artifact,
//                  stinky_nemesis, com_pager, qt_pager, qt_montype,
//                  deliver_splev_message, and static helpers
//
// Three subsystems:
// 1. Quest artifact lookup: is_quest_artifact(), find_quest_artifact(),
//    find_qarti() [static]
// 2. Quest text delivery: com_pager_core() [static Lua-based], com_pager(),
//    qt_pager(), convert_arg() [static], convert_line() [static],
//    qtext_pronoun() [static], deliver_by_pline() [static],
//    deliver_by_window() [static], skip_pager() [static]
// 3. Quest role info: quest_info(), ldrname(), neminame() [static],
//    guardname() [static], homebase() [static], intermed() [static],
//    stinky_nemesis(), qt_montype()
// Plus: deliver_splev_message() for special-level arrival text
//
// com_pager_core() opens "quest.lua" in a temporary Lua sandbox; looks up
//   questtext[section][msgid]; expands %-escapes (convert_line/convert_arg);
//   delivers via pline or NHW_TEXT/NHW_MENU window.
// %-escape codes: %p=player, %c=class, %r=rank, %l=leader, %n=nemesis,
//   %g=guard, %o=artifact, %d=deity, %a=alignment, %Z=dungeon name, etc.
//   Modifiers: %xa/%xA=an prefix, %xC=capitalize, %xp/%xP=pluralize,
//   %xs/%xS=possessive, %xt=strip "the", %xh/%xi/%xj=pronoun.
//
// JS implementations:
//   is_quest_artifact() → objdata.js:54 (PARTIAL — stub returning false; TODO)
//   All other functions → not implemented in JS.
//
// Note: com_pager_core() uses a Lua interpreter (nhl_init) that is N/A
//   for the browser port. Quest text would need a different delivery mechanism.

// cf. questpgr.c:31 — quest_info(typ): return quest role monster/artifact num
// typ=0 → questarti; MS_LEADER → ldrnum; MS_NEMESIS → neminum; MS_GUARDIAN → guardnum.
// TODO: questpgr.c:31 — quest_info(): quest role monster/artifact index lookup

// cf. questpgr.c:49 — ldrname(): formatted quest leader name
// Returns "the <name>" or just "<name>" depending on type_is_pname().
// TODO: questpgr.c:49 — ldrname(): quest leader name string

// cf. questpgr.c:60 [static] — intermed(): role's intermediate target string
// Returns gu.urole.intermed (e.g., "the Mines' End" for Dwarf quest).
// TODO: questpgr.c:60 — intermed(): quest intermediate target description

// cf. questpgr.c:66 — is_quest_artifact(otmp): is object the role's quest artifact?
// Returns otmp->oartifact == gu.urole.questarti.
// JS equiv: objdata.js:54 — stub returning false; TODO when artifacts implemented.
// PARTIAL: questpgr.c:66 — is_quest_artifact() ↔ is_quest_artifact() (objdata.js:54)

// cf. questpgr.c:72 [static] — find_qarti(ochain): find quest artifact in chain
// Recursively searches object chain including containers.
// TODO: questpgr.c:72 — find_qarti(): quest artifact search in object chain

// cf. questpgr.c:88 — find_quest_artifact(whichchains): find artifact across chains
// Bitmask selects which chains to search: OBJ_INVENT, OBJ_FLOOR, OBJ_MINVENT,
//   OBJ_MIGRATING, OBJ_BURIED.
// TODO: questpgr.c:88 — find_quest_artifact(): multi-chain quest artifact search

// cf. questpgr.c:122 [static] — neminame(): formatted nemesis name
// Returns "the <neminum name>" or just the name if type_is_pname().
// TODO: questpgr.c:122 — neminame(): quest nemesis name string

// cf. questpgr.c:133 [static] — guardname(): guardian monster name
// Returns mons[guardnum].pmnames[NEUTRAL].
// TODO: questpgr.c:133 — guardname(): quest guardian name string

// cf. questpgr.c:141 [static] — homebase(): quest leader's home location
// Returns gu.urole.homebase (e.g., "Camelot Castle").
// TODO: questpgr.c:141 — homebase(): quest leader home location string

// cf. questpgr.c:149 — stinky_nemesis(mon): does nemesis death message mention gas?
// Calls com_pager_core() with rawtext=TRUE to get "killed_nemesis" text;
//   returns 1 if text contains (noxious|poisonous|toxic) followed by (gas|fumes).
// Used by m_detach() to decide whether to call nemesis_stinks().
// TODO: questpgr.c:149 — stinky_nemesis(): gas-cloud death text check

// cf. questpgr.c:198 [static] — qtext_pronoun(who, which): name → pronoun
// Converts entity ('d'=deity, 'l'=leader, 'n'=nemesis, 'o'=artifact) to
//   pronoun (h=he/she, i=him/her, j=his/her); uppercase for H/I/J.
// Handles plural artifacts (Eyes of...) as "they/them/their".
// TODO: questpgr.c:198 — qtext_pronoun(): quest text gender pronoun

// cf. questpgr.c:235 [static] — convert_arg(c): expand single %-escape to string
// Maps single char code to string in gc.cvt_buf:
//   p=player name, c=class name, r=rank, l=leader, n=nemesis, o=artifact,
//   g=guard, G=align title, H=homebase, d=deity, D=lawful deity, C/N/L=alignment,
//   a=align str, A=current align, Z=dungeon name, x=see/sense (blind?), %=%.
// TODO: questpgr.c:235 — convert_arg(): quest text %-code expansion

// cf. questpgr.c:327 [static] — convert_line(in_line, out_line): expand all %-escapes
// Scans line character by character; expands %X sequences using convert_arg()
//   and qtext_pronoun(); applies modifiers (a/A=an, C=capitalize, p/P=plural,
//   s/S=possessive, t=strip-the, h/H/i/I/j/J=pronoun).
// TODO: questpgr.c:327 — convert_line(): full quest text line formatting

// cf. questpgr.c:422 [static] — deliver_by_pline(str): output quest text via pline
// Splits str at newlines; calls convert_line() on each; outputs via pline().
// TODO: questpgr.c:422 — deliver_by_pline(): quest text pline delivery

// cf. questpgr.c:438 [static] — deliver_by_window(msg, how): output in text window
// Creates NHW_TEXT or NHW_MENU window; delivers converted lines via putstr();
//   displays and destroys window.
// TODO: questpgr.c:438 — deliver_by_window(): quest text window delivery

// cf. questpgr.c:458 [static] — skip_pager(common): suppress quest messages?
// Returns TRUE if program_state.wizkit_wishing (skip plot feedback).
// TODO: questpgr.c:458 — skip_pager(): quest message suppression check

// cf. questpgr.c:467 [static] — com_pager_core(section, msgid, showerror, rawtext)
// Opens quest.lua in Lua sandbox; looks up questtext[section][msgid];
//   picks random entry if array; converts and delivers via pline or window.
// rawtext!=NULL: stores raw text string instead of delivering.
// Fallback: checks questtext[msg_fallbacks][msgid] for alternate key.
// N/A: browser port has no Lua interpreter (nhl_init). Quest text needs alternative.
// N/A: questpgr.c:467 — com_pager_core() (Lua interpreter not available)

// cf. questpgr.c:623 — com_pager(msgid): deliver "common" section quest message
// Calls com_pager_core("common", msgid, TRUE, NULL).
// TODO: questpgr.c:623 — com_pager(): common quest message delivery

// cf. questpgr.c:629 — qt_pager(msgid): deliver role-specific quest message
// Tries com_pager_core(urole.filecode, msgid, FALSE) first;
//   falls back to com_pager(msgid) on failure.
// TODO: questpgr.c:629 — qt_pager(): role-specific quest message delivery

// cf. questpgr.c:636 — qt_montype(): return random enemy monster for quest level
// 4/5 chance: picks enemy1num or mkclass(enemy1sym);
// 1/5 chance: picks enemy2num or mkclass(enemy2sym).
// Used by mklev to place appropriate enemies on quest levels.
// TODO: questpgr.c:636 — qt_montype(): random quest level enemy type

// cf. questpgr.c:654 — deliver_splev_message(): display special-level arrival text
// Delivers lev_message via deliver_by_pline(); frees lev_message.
// Called on first arrival at a special level that has a custom message.
// TODO: questpgr.c:654 — deliver_splev_message(): special level custom message
