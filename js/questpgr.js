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

import { Has_contents } from './objnam.js';
import { pline } from './pline.js';
import { is_quest_artifact } from './objdata.js';
import { rn2 } from './rng.js';
import { align_gname } from './pray.js';
import { game as _gstate } from './gstate.js';
import { NON_PM } from './const.js';
import { mkclass } from './makemon.js';
import { level_difficulty } from './dungeon.js';
import {
  G_GENOD,
  PM_ARCHEOLOGIST, PM_BARBARIAN, PM_CAVE_DWELLER, PM_HEALER, PM_KNIGHT,
  PM_MONK, PM_CLERIC, PM_RANGER, PM_ROGUE, PM_SAMURAI, PM_TOURIST,
  PM_VALKYRIE, PM_WIZARD,
  PM_HUMAN_MUMMY, PM_OGRE, PM_TROLL, PM_BUGBEAR, PM_HILL_GIANT,
  PM_GIANT_RAT, PM_SNAKE, PM_QUASIT, PM_OCHRE_JELLY, PM_EARTH_ELEMENTAL,
  PM_XORN, PM_HUMAN_ZOMBIE, PM_WRAITH, PM_FOREST_CENTAUR, PM_SCORPION,
  PM_LEPRECHAUN, PM_GUARDIAN_NAGA, PM_WOLF, PM_STALKER, PM_GIANT_SPIDER,
  PM_FIRE_ANT, PM_FIRE_GIANT, PM_VAMPIRE_BAT,
  S_SNAKE, S_MUMMY, S_OGRE, S_TROLL, S_HUMANOID, S_GIANT, S_RODENT,
  S_YETI, S_IMP, S_JELLY, S_ELEMENTAL, S_XORN, S_ZOMBIE, S_WRAITH,
  S_CENTAUR, S_SPIDER, S_NYMPH, S_NAGA, S_DOG, S_ANT, S_BAT,
} from './monsters.js';

// Minimal common-section pager data needed for faithful runtime message
// selection in currently exercised gameplay paths. Source: dat/quest.lua.
const COMMON_QUEST_TEXT = Object.freeze({
  angel_cuss: Object.freeze([
    "\"Repent, and thou shalt be saved!\"",
    "\"Thou shalt pay for thine insolence!\"",
    "\"Very soon, my child, thou shalt meet thy maker.\"",
    "\"The great %D has sent me to make you pay for your sins!\"",
    "\"The wrath of %D is now upon you!\"",
    "\"Thy life belongs to %D now!\"",
    "\"Dost thou wish to receive thy final blessing?\"",
    "\"Thou art but a godless void.\"",
    "\"Thou art not worthy to seek the Amulet.\"",
    "\"No one expects the Spanish Inquisition!\"",
    "\"Judgment hath been passed upon thee, %p.\"",
    "\"Thy reckoning is at hand, %p.\"",
    "\"Thou shalt be brought before %D for thy crimes!\"",
    "\"With %D as my witness, I shall strike thee down.\"",
  ]),
  demon_cuss: Object.freeze([
    "\"I first mistook thee for a statue, when I regarded thy head of stone.\"",
    "\"Come here often?\"",
    "\"Doth pain excite thee?  Wouldst thou prefer the whip?\"",
    "\"Thinkest thou it shall tickle as I rip out thy lungs?\"",
    "\"Eat slime and die!\"",
    "\"Go ahead, fetch thy mama!  I shall wait.\"",
    "\"Go play leapfrog with a herd of unicorns!\"",
    "\"Hast thou been drinking, or art thou always so clumsy?\"",
    "\"This time I shall let thee off with a spanking, but let it not happen again.\"",
    "\"I've met smarter (and prettier) acid blobs.\"",
    "\"Look!  Thy bootlace is undone!\"",
    "\"Mercy!  Dost thou wish me to die of laughter?\"",
    "\"Run away!  Live to flee another day!\"",
    "\"Thou hadst best fight better than thou canst dress!\"",
    "\"Twixt thy cousin and thee, Medusa is the prettier.\"",
    "\"Methinks thou wert unnaturally stirred by yon corpse back there, eh, varlet?\"",
    "\"Up thy nose with a rubber hose!\"",
    "\"Verily, thy corpse could not smell worse!\"",
    "\"Wait!  I shall polymorph into a grid bug to give thee a fighting chance!\"",
    "\"Why search for the Amulet?  Thou wouldst but lose it, cretin.\"",
    "\"Thou ought to be a comedian, thy skills are so laughable!\"",
    "\"Thy gaze is so vacant, I thought thee a floating eye!\"",
    "\"Thy head is unfit for a mind flayer to munch upon!\"",
    "\"Only thy reflection could love thee!\"",
    "\"Hast thou considered masking thine odour?\"",
    "\"Hold! Thy face is a most exquisite torture!\"",
    "\"I should fart in thy direction, but it might improve thy smell!\"",
  ]),
});

const QUEST_ENEMY_DATA = Object.freeze({
  [PM_ARCHEOLOGIST]: Object.freeze({
    enemy1num: NON_PM, enemy2num: PM_HUMAN_MUMMY, enemy1sym: S_SNAKE, enemy2sym: S_MUMMY,
  }),
  [PM_BARBARIAN]: Object.freeze({
    enemy1num: PM_OGRE, enemy2num: PM_TROLL, enemy1sym: S_OGRE, enemy2sym: S_TROLL,
  }),
  [PM_CAVE_DWELLER]: Object.freeze({
    enemy1num: PM_BUGBEAR, enemy2num: PM_HILL_GIANT, enemy1sym: S_HUMANOID, enemy2sym: S_GIANT,
  }),
  [PM_HEALER]: Object.freeze({
    enemy1num: PM_GIANT_RAT, enemy2num: PM_SNAKE, enemy1sym: S_RODENT, enemy2sym: S_YETI,
  }),
  [PM_KNIGHT]: Object.freeze({
    enemy1num: PM_QUASIT, enemy2num: PM_OCHRE_JELLY, enemy1sym: S_IMP, enemy2sym: S_JELLY,
  }),
  [PM_MONK]: Object.freeze({
    enemy1num: PM_EARTH_ELEMENTAL, enemy2num: PM_XORN, enemy1sym: S_ELEMENTAL, enemy2sym: S_XORN,
  }),
  [PM_CLERIC]: Object.freeze({
    enemy1num: PM_HUMAN_ZOMBIE, enemy2num: PM_WRAITH, enemy1sym: S_ZOMBIE, enemy2sym: S_WRAITH,
  }),
  [PM_RANGER]: Object.freeze({
    enemy1num: PM_FOREST_CENTAUR, enemy2num: PM_SCORPION, enemy1sym: S_CENTAUR, enemy2sym: S_SPIDER,
  }),
  [PM_ROGUE]: Object.freeze({
    enemy1num: PM_LEPRECHAUN, enemy2num: PM_GUARDIAN_NAGA, enemy1sym: S_NYMPH, enemy2sym: S_NAGA,
  }),
  [PM_SAMURAI]: Object.freeze({
    enemy1num: PM_WOLF, enemy2num: PM_STALKER, enemy1sym: S_DOG, enemy2sym: S_ELEMENTAL,
  }),
  [PM_TOURIST]: Object.freeze({
    enemy1num: PM_GIANT_SPIDER, enemy2num: PM_FOREST_CENTAUR, enemy1sym: S_SPIDER, enemy2sym: S_CENTAUR,
  }),
  [PM_VALKYRIE]: Object.freeze({
    enemy1num: PM_FIRE_ANT, enemy2num: PM_FIRE_GIANT, enemy1sym: S_ANT, enemy2sym: S_GIANT,
  }),
  [PM_WIZARD]: Object.freeze({
    enemy1num: PM_VAMPIRE_BAT, enemy2num: PM_XORN, enemy1sym: S_BAT, enemy2sym: S_WRAITH,
  }),
});

function getQuestEnemyData() {
  const roleMnum = Number.isInteger(_gstate?.u?.roleMnum) ? _gstate.u.roleMnum : NON_PM;
  return QUEST_ENEMY_DATA[roleMnum] || null;
}

function get_common_pager_message(msgid) {
  const entry = COMMON_QUEST_TEXT[msgid];
  if (!entry) return null;
  // C ref: questpgr.c com_pager_core() -> nhl_init() loads nhlib.lua,
  // whose top-level shuffle(align) consumes rn2(3), rn2(2) per call.
  rn2(3);
  rn2(2);
  if (Array.isArray(entry)) {
    if (entry.length === 0) return null;
    return convert_common_pager_line(entry[rn2(entry.length)]);
  }
  return typeof entry === 'string' ? convert_common_pager_line(entry) : null;
}

function convert_common_pager_line(line) {
  if (typeof line !== 'string' || line.length === 0) return line;
  const player = _gstate?.u;
  const playerName = String(player?.name || 'player');
  const originalAlign = player?.originalAlignment ?? player?.alignment ?? 0;
  const lawfulDeity = align_gname(1, player) || 'Marduk';
  const ownDeity = align_gname(originalAlign, player) || lawfulDeity;
  return line
    .replace(/%p/g, playerName)
    .replace(/%D/g, lawfulDeity)
    .replace(/%d/g, ownDeity);
}

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
export function qt_montype() {
  const questEnemy = getQuestEnemyData();
  if (!questEnemy) return NON_PM;

  const primary = rn2(5) !== 0;
  const qpm = primary ? questEnemy.enemy1num : questEnemy.enemy2num;
  const qsym = primary ? questEnemy.enemy1sym : questEnemy.enemy2sym;
  if (qpm !== NON_PM && rn2(5) !== 0 && !(_gstate?.mvitals?.[qpm]?.mvflags & G_GENOD)) {
    return qpm;
  }
  return mkclass(qsym, 0, level_difficulty());
}

// cf. questpgr.c:654 — deliver_splev_message(): display special-level arrival text
// Delivers lev_message via deliver_by_pline(); frees lev_message.
// Called on first arrival at a special level that has a custom message.
// TODO: questpgr.c:654 — deliver_splev_message(): special level custom message

// Autotranslated from questpgr.c:72
export function find_qarti(ochain) {
  let otmp, qarti;
  for (otmp = ochain; otmp; otmp = otmp.nobj) {
    if (is_quest_artifact(otmp)) return otmp;
    if (Has_contents(otmp) && (qarti = find_qarti(otmp.cobj)) != null) return qarti;
  }
  return  0;
}

// Autotranslated from questpgr.c:422
export async function deliver_by_pline(str) {
  // TODO: convert_line() %-escape expansion not yet implemented
  const lines = str.split('\n');
  for (const line of lines) {
    if (line) await pline("%s", line);
  }
}

// Autotranslated from questpgr.c:623
export async function com_pager(msgid) {
  const message = get_common_pager_message(msgid);
  if (typeof message === 'string' && message.length > 0) {
    await deliver_by_pline(message);
    return;
  }
  await com_pager_core("common", msgid, true,  0);
}
