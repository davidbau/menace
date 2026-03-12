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
//   All functions ported from C insight.c.

import { A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC,
         A_STR, A_DEX, A_CON, A_INT, A_WIS, A_CHA,
         ACH_BELL, ACH_HELL, ACH_CNDL, ACH_BOOK, ACH_INVK, ACH_AMUL, ACH_ENDG,
         ACH_ASTR, ACH_UWIN, ACH_MINE_PRIZE, ACH_SOKO_PRIZE, ACH_MEDU,
         ACH_BLND, ACH_NUDE, ACH_MINE, ACH_TOWN, ACH_SHOP, ACH_TMPL, ACH_ORCL,
         ACH_NOVL, ACH_SOKO, ACH_BGRM, ACH_RNK1, ACH_RNK2, ACH_RNK3, ACH_RNK4,
         ACH_RNK5, ACH_RNK6, ACH_RNK7, ACH_RNK8, ACH_TUNE, N_ACH } from './const.js';
import { mons, MZ_TINY, MZ_SMALL, MZ_MEDIUM, MZ_LARGE, MZ_HUGE, MZ_GIGANTIC, PM_LONG_WORM, PM_HIGH_CLERIC, G_UNIQ, M2_PNAME, NUMMONS, G_GENOD, G_EXTINCT, G_GONE } from './monsters.js';
import { x_monnam } from './mondata.js';
import { find_mac } from './worn.js';
import { pline, getGameLog } from './pline.js';
import { showPager } from './pager.js';
import { is_pool_or_lava } from './dbridge.js';
import { makeplural, an } from './objnam.js';
import { rank_of } from './botl.js';
import { TT_NONE, TT_BEARTRAP, TT_PIT, TT_WEB, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL, SICK, LOW_PM, STRAT_WAITMASK, SICK_VOMITABLE, SICK_NONVOMITABLE, MFAST, MSLOW, HALF_PHDAM, HALF_SPDAM } from './const.js';
// Window system imports available for future use (e.g., menu-based display)
// import { create_nhwindow, destroy_nhwindow, putstr, start_menu, add_menu,
//          end_menu, select_menu, display_nhwindow,
//          NHW_MENU, NHW_TEXT, MENU_BEHAVE_STANDARD, PICK_NONE, PICK_ONE,
//          ATR_NONE } from './windows.js';

// Enlightenment final-state constants
const ENL_GAMEINPROGRESS = 0;
const ENL_GAMEOVERALIVE = 1;
const ENL_GAMEOVERDEAD = 2;

// Enlightenment mode flags
const BASICENLIGHTENMENT = 1;
const MAGICENLIGHTENMENT = 2;

// Trap types imported from trap.js (canonical C values)

// HALF_PHDAM, HALF_SPDAM imported from const.js (property indices 56, 55)


// Vanquished sort modes
const VANQ_MLVL_MNDX  = 0;
const VANQ_MSTR_MNDX  = 1;
const VANQ_ALPHA_SEP   = 2;
const VANQ_ALPHA_MIX   = 3;
const VANQ_MCLS_HTOL   = 4;
const VANQ_MCLS_LTOH   = 5;
const VANQ_COUNT_H_L   = 6;
const VANQ_COUNT_L_H   = 7;

// Attribute names (indexed by A_STR=0, A_INT=1, A_WIS=2, A_DEX=3, A_CON=4, A_CHA=5)
const attrname = ['strength', 'intelligence', 'wisdom',
                  'dexterity', 'constitution', 'charisma'];

// ============================================================================
// align_str
// cf. insight.c:3207
// Returns string representation of alignment value.
// ============================================================================

// cf. insight.c:3207 — align_str(alignment): alignment string
export function align_str(alignment) {
    switch (alignment) {
    case A_CHAOTIC: return "chaotic";
    case A_NEUTRAL: return "neutral";
    case A_LAWFUL:  return "lawful";
    case A_NONE:    return "unaligned";
    }
    return "unknown";
}

// ============================================================================
// size_str
// cf. insight.c:3223
// Returns string representation of monster size.
// ============================================================================

// cf. insight.c:3223 [static] — size_str(msize): monster size string
function size_str(msize) {
    switch (msize) {
    case MZ_TINY:     return "tiny";
    case MZ_SMALL:    return "small";
    case MZ_MEDIUM:   return "medium";
    case MZ_LARGE:    return "large";
    case MZ_HUGE:     return "huge";
    case MZ_GIGANTIC: return "gigantic";
    default:          return `unknown size (${msize})`;
    }
}

// ============================================================================
// piousness
// cf. insight.c:3255
// Used for self-probing to determine piety status.
// ============================================================================

// cf. insight.c:3255 — piousness(showneg, suffix): piety status string
export function piousness(showneg, suffix, player) {
    const record = player.alignmentRecord || 0;
    let pio;

    // note: piousness 20 matches MIN_QUEST_ALIGN
    if (record >= 20)       pio = "piously";
    else if (record > 13)   pio = "devoutly";
    else if (record > 8)    pio = "fervently";
    else if (record > 3)    pio = "stridently";
    else if (record === 3)  pio = "";
    else if (record > 0)    pio = "haltingly";
    else if (record === 0)  pio = "nominally";
    else if (!showneg)      pio = "insufficiently";
    else if (record >= -3)  pio = "strayed";
    else if (record >= -8)  pio = "sinned";
    else                    pio = "transgressed";

    let buf = pio;
    if (suffix && (!showneg || record >= 0)) {
        if (record !== 3) buf += ' ';
        buf += suffix;
    }
    return buf;
}

// ============================================================================
// mstatusline
// cf. insight.c:3295
// Stethoscope or probing applied to monster — one-line feedback.
// ============================================================================

// cf. insight.c:3295 — mstatusline(mtmp): monster probe/stethoscope status
export async function mstatusline(mtmp, game) {
    const player = game ? (game.u || game.player) : null;
    const mptr = mtmp.data || mons[mtmp.mndx] || {};
    const alignment = mptr.maligntyp != null ? Math.sign(mptr.maligntyp) : A_NONE;

    let info = '';

    if (mtmp.mtame) {
        info += ', tame';
        if (game && game.wizard) {
            info += ` (${mtmp.mtame}`;
            if (!mtmp.isminion && mtmp.edog) {
                info += `; hungry ${mtmp.edog.hungrytime || 0}; apport ${mtmp.edog.apport || 0}`;
            }
            info += ')';
        }
    } else if (mtmp.mpeaceful) {
        info += ', peaceful';
    }

    // Long worm segment count
    if (mtmp.mndx === PM_LONG_WORM) {
        const nsegs = mtmp.wormno ? (mtmp.nsegs || 0) : 0;
        if (!nsegs) {
            info += ', single segment';
        } else {
            const total = nsegs + 1; // include head
            info += `, ${total} segments`;
        }
    }

    if (mtmp.cham != null && mtmp.cham >= 0 && mtmp.data !== mons[mtmp.cham])
        info += ', shapechanger';
    if (mtmp.meating)
        info += ', eating';
    if (mtmp.mcan)
        info += ', cancelled';
    if (mtmp.mconf)
        info += ', confused';
    if (mtmp.mblinded || mtmp.mcansee === 0 || mtmp.mcansee === false)
        info += ', blind';
    if (mtmp.mstun)
        info += ', stunned';
    if (mtmp.msleeping)
        info += ', asleep';
    else if (mtmp.mfrozen || mtmp.mcanmove === false || mtmp.mcanmove === 0)
        info += ", can't move";
    else if ((mtmp.mstrategy & STRAT_WAITMASK) !== 0)
        info += ', meditating';
    if (mtmp.mflee)
        info += ', scared';
    if (mtmp.mtrapped)
        info += ', trapped';
    if (mtmp.mspeed)
        info += (mtmp.mspeed === MFAST) ? ', fast'
              : (mtmp.mspeed === MSLOW) ? ', slow'
              : ', [? speed]';
    if (mtmp.minvis)
        info += ', invisible';
    if (player && mtmp === player.ustuck) {
        if (player.uswallow)
            info += ', engulfing you';
        else
            info += ', holding you';
    }
    if (player && mtmp === player.usteed) {
        info += ', carrying you';
    }
    if (mtmp.mleashed)
        info += ', leashed';

    const monnm = x_monnam(mtmp);
    const mac = find_mac(mtmp);

    await pline("Status of %s (%s, %s):  Level %s  HP %s(%s)  AC %s%s.",
          monnm, align_str(alignment), size_str(mptr.msize || MZ_MEDIUM),
          String(mtmp.m_lev || 0),
          String(mtmp.mhp || 0), String(mtmp.mhpmax || 0),
          String(mac), info);
}

// ============================================================================
// ustatusline
// cf. insight.c:3422
// Stethoscope or probing applied to hero — one-line feedback.
// ============================================================================

// cf. insight.c:3422 — ustatusline(void): hero probe/stethoscope status
export async function ustatusline(game) {
    const player = (game.u || game.player);
    let info = '';

    // C: Sick
    const sickProp = player.uprops && player.uprops[SICK];
    if (sickProp && (sickProp.intrinsic || sickProp.extrinsic)) {
        info += ', dying from';
        if (player.usick_type & SICK_VOMITABLE)
            info += ' food poisoning';
        if (player.usick_type & SICK_NONVOMITABLE) {
            if (player.usick_type & SICK_VOMITABLE) info += ' and';
            info += ' illness';
        }
    }

    // C: Stoned, Slimed, Strangled, Vomiting
    // These check uprops for the corresponding property indices
    // Simplified: check by property name if available
    if (hasIntrinsic(player, 'Stoned'))
        info += ', solidifying';
    if (hasIntrinsic(player, 'Slimed'))
        info += ', becoming slimy';
    if (hasIntrinsic(player, 'Strangled'))
        info += ', being strangled';
    if (hasIntrinsic(player, 'Vomiting'))
        info += ', nauseated';

    // C: Confusion, Blind, Stunned
    if (hasPlayerProp(player, 'CONFUSION'))
        info += ', confused';
    if (hasPlayerProp(player, 'BLINDED'))
        info += ', blind';
    if (hasPlayerProp(player, 'STUNNED'))
        info += ', stunned';

    // Fast
    if (hasPlayerProp(player, 'FAST'))
        info += ', fast';

    if (player.utrap)
        info += ', trapped';
    if (player.uundetected)
        info += ', concealed';
    if (player.minvis || hasPlayerProp(player, 'INVIS'))
        info += ', invisible';

    if (player.ustuck) {
        if (player.uswallow)
            info += ', engulfed by ';
        else
            info += ', held by ';
        info += x_monnam(player.ustuck);
    }

    const alignSuffix = align_str(player.alignment);
    const pious = piousness(false, alignSuffix, player);

    await pline("Status of %s (%s):  Level %s  HP %s(%s)  AC %s%s.",
          player.name, pious,
          String(player.ulevel || 1),
          String(player.uhp || 0), String(player.uhpmax || 0),
          String(player.ac || 10), info);
}

// Helper: check if player has a property set (by index or name)
function hasPlayerProp(player, propName) {
    if (!player.uprops) return false;
    // Try numeric property indices from const.js
    // CONFUSION=18, BLINDED=21, STUNNED=22, FAST=12, INVIS=6
    const propMap = {
        'CONFUSION': 18,
        'BLINDED': 21,
        'STUNNED': 22,
        'FAST': 12,
        'INVIS': 6,
    };
    const idx = propMap[propName];
    if (idx == null) return false;
    const prop = player.uprops[idx];
    if (!prop) return false;
    return !!(prop.intrinsic || prop.extrinsic);
}

// Helper: check intrinsic by string name (for less common properties)
function hasIntrinsic(player, name) {
    // These are timeout-based effects stored in uprops
    // Stoned=17, Slimed=20, Strangled=23, Vomiting=24
    const propMap = {
        'Stoned': 17,
        'Slimed': 20,
        'Strangled': 23,
        'Vomiting': 24,
    };
    const idx = propMap[name];
    if (idx == null) return false;
    const prop = player.uprops ? player.uprops[idx] : null;
    if (!prop) return false;
    return !!(prop.intrinsic || prop.extrinsic);
}

// ============================================================================
// Enlightenment output helpers
// ============================================================================

// Module-level state for enlightenment text accumulation.
// C uses ge.en_win and ge.en_via_menu; we accumulate lines in an array
// and display them via showPager at the end.
let _enl_lines = [];

// cf. insight.c:117 [static] — enlght_out(buf): output enlightenment text
export function enlght_out(buf) {
    _enl_lines.push(buf);
}

// cf. insight.c:126 [static] — enlght_line(start, middle, end, ps): build enl line
export function enlght_line(start, middle, end, ps) {
    let buf = `  ${start}${middle}${end}${ps}.`;
    // Apply contractions (cf. C's contra[] array)
    const contractions = [
        [' are not ', " aren't "],
        [' were not ', " weren't "],
        [' have not ', " haven't "],
        [' had not ', " hadn't "],
        [' can not ', " can't "],
        [' could not ', " couldn't "],
    ];
    if (buf.includes(' not ')) {
        for (const [twowords, contrctn] of contractions) {
            buf = buf.split(twowords).join(contrctn);
        }
    }
    enlght_out(buf);
}

// Macros from C as helper functions
// In C: enl_msg(prefix, present, past, suffix, ps)
//   enlght_line(prefix, final ? past : present, suffix, ps)
function enl_msg(final, prefix, present, past, suffix, ps) {
    enlght_line(prefix, final ? past : present, suffix, ps);
}
function you_are(final, attr, ps) {
    enl_msg(final, 'You ', 'are ', 'were ', attr, ps);
}
function you_have(final, attr, ps) {
    enl_msg(final, 'You ', 'have ', 'had ', attr, ps);
}
function you_can(final, attr, ps) {
    enl_msg(final, 'You ', 'can ', 'could ', attr, ps);
}
function you_have_been(final, goodthing) {
    enl_msg(final, 'You ', 'have been ', 'were ', goodthing, '');
}
function you_have_never(final, badthing) {
    enl_msg(final, 'You ', 'have never ', 'never ', badthing, '');
}
function you_have_X(final, something) {
    enl_msg(final, 'You ', 'have ', '', something, '');
}

// ============================================================================
// enlght_combatinc
// cf. insight.c:158 [static]
// Format increased chance to hit or damage or defense (Protection).
// ============================================================================

function enlght_combatinc(inctyp, incamt, final) {
    let absamt = Math.abs(incamt);
    // Protection amounts are typically larger; reduce by a third
    if (inctyp === 'defense')
        absamt = Math.floor((absamt * 2) / 3);

    let modif;
    if (absamt <= 3)      modif = 'small';
    else if (absamt <= 6) modif = 'moderate';
    else if (absamt <= 12) modif = 'large';
    else                   modif = 'huge';

    modif = !incamt ? 'no' : (/^[aeiou]/i.test(modif) ? `an ${modif}` : `a ${modif}`);
    const bonus = (incamt >= 0) ? 'bonus' : 'penalty';
    // "bonus <foo>" (to hit) vs "<bar> bonus" (damage, defense)
    const invrt = (inctyp !== 'to hit');

    let outbuf = `${modif} ${invrt ? inctyp : bonus} ${invrt ? bonus : inctyp}`;
    if (final)
        outbuf += ` (${incamt > 0 ? '+' : ''}${incamt})`;
    return outbuf;
}

// ============================================================================
// enlght_halfdmg
// cf. insight.c:200 [static]
// Report half physical or half spell damage.
// ============================================================================

// cf. insight.c:200 [static] — enlght_halfdmg(category, final): report half damage
function enlght_halfdmg(category, final) {
    let category_name;
    switch (category) {
    case HALF_PHDAM: category_name = 'physical'; break;
    case HALF_SPDAM: category_name = 'spell'; break;
    default:         category_name = 'unknown'; break;
    }
    const adjective = final ? 'half' : 'reduced';
    const buf = ` ${adjective} ${category_name} damage`;
    enl_msg(final, 'You ', 'take', 'took', buf, '');
}

// ============================================================================
// walking_on_water
// cf. insight.c:223 [static]
// Check if hero is actively using water walking on water (or lava).
// ============================================================================

// cf. insight.c:223 [static] — walking_on_water(void): active water walking check
export function walking_on_water(player, map) {
    if (player.uinwater || player.levitating || player.flying)
        return false;
    if (!player.waterWalking)
        return false;
    if (!map) return false;
    try {
        return is_pool_or_lava(player.x, player.y, map);
    } catch (e) {
        return false;
    }
}

// ============================================================================
// trap_predicament
// cf. insight.c:232
// Describe hero's trap situation. Returns description string.
// ============================================================================

// cf. insight.c:232 — trap_predicament(final, wizxtra, player): trap description
export function trap_predicament(final, wizxtra, player) {
    let outbuf = '';
    const utraptype = player.utraptype || 0;

    switch (utraptype) {
    case TT_BURIEDBALL:
        outbuf = 'tethered to something buried';
        break;
    case TT_LAVA:
        outbuf = `sinking into ${final ? 'lava' : 'lava'}`;
        break;
    case TT_INFLOOR:
        outbuf = 'stuck in the floor';
        break;
    default: // TT_BEARTRAP, TT_PIT, or TT_WEB
        outbuf = 'trapped';
        // In C this looks up the trap at hero's location; simplified here
        if (utraptype === TT_BEARTRAP)
            outbuf += ' in a bear trap';
        else if (utraptype === TT_PIT)
            outbuf += ' in a pit';
        else if (utraptype === TT_WEB)
            outbuf += ' in a web';
        break;
    }

    if (wizxtra) {
        outbuf += ` {${player.utrap || 0}}`;
    }
    return outbuf;
}

// ============================================================================
// fmt_elapsed_time
// cf. insight.c:313 [static]
// Format elapsed playing time as a human-readable string.
// ============================================================================

// cf. insight.c:313 [static] — fmt_elapsed_time(final): elapsed time string
function fmt_elapsed_time(final, game) {
    // In JS, game.realtime holds elapsed seconds (or 0 if not tracked)
    let etim = (game && game.realtime) || 0;

    if (!final && game && game.startTime) {
        etim += Math.floor((Date.now() - game.startTime) / 1000);
    }

    const eseconds = etim % 60; etim = Math.floor(etim / 60);
    const eminutes = etim % 60; etim = Math.floor(etim / 60);
    const ehours = etim % 24;
    const edays = Math.floor(etim / 24);
    let fieldcnt = (edays ? 1 : 0) + (ehours ? 1 : 0) + (eminutes ? 1 : 0) + (eseconds ? 1 : 0);

    if (!fieldcnt) return ' none';
    let outbuf = '';

    function plur(n) { return n === 1 ? '' : 's'; }

    if (edays) {
        outbuf += ` ${edays} day${plur(edays)}`;
        if (fieldcnt > 1) outbuf += (fieldcnt === 2) ? ' and' : ',';
        --fieldcnt;
    }
    if (ehours) {
        outbuf += ` ${ehours} hour${plur(ehours)}`;
        if (fieldcnt > 1) outbuf += (fieldcnt === 2) ? ' and' : ',';
        --fieldcnt;
    }
    if (eminutes) {
        outbuf += ` ${eminutes} minute${plur(eminutes)}`;
        if (fieldcnt > 1) outbuf += ' and';
    }
    if (eseconds) {
        outbuf += ` ${eseconds} second${plur(eseconds)}`;
    }
    return outbuf;
}

// ============================================================================
// background_enlightenment
// cf. insight.c:445 [static]
// Display role, race, alignment and such.
// ============================================================================

// cf. insight.c:445 [static] — background_enlightenment(mode, final, game)
function background_enlightenment(mode, final, game) {
    const player = (game.u || game.player);

    enlght_out('');
    enlght_out(' Background:');

    // Report role and level — cf. insight.c:487
    const roleName = player.roleName || player.role || 'Adventurer';
    const raceName = player.raceName || player.race || 'human';
    const level = player.ulevel || 1;
    const female = game.flags?.female || false;
    const rankTitle = rank_of(level, player.roleMnum, female);
    const genderStr = female ? 'female' : 'male';

    // C format: "an Evoker, a level 1 male human Wizard"
    you_are(final, `${an(rankTitle)}, a level ${level} ${genderStr} ${raceName} ${roleName}`, '');

    // Alignment
    const alignType = player.alignment != null ? player.alignment : A_NEUTRAL;
    const alignName = align_str(alignType);
    const godName = player.godName || 'your deity';
    enlght_out(` You ${!final ? 'are' : 'were'} ${alignName}, on a mission for ${godName}.`);

    // Handedness
    const handed = player.rightHanded !== false ? 'right' : 'left';
    you_are(final, `${handed}-handed`, '');

    // Dungeon level
    const dlevel = player.dungeonLevel || player.depth || 1;
    you_are(final, `on dungeon level ${dlevel}`, '');

    // Turns
    const moves = game.turnCount || game.moves || player.turns || 0;
    if (moves <= 1) {
        you_have(final, 'just started your adventure', '');
    } else {
        enlght_line('You ', 'entered ', `the dungeon ${moves} turn${moves === 1 ? '' : 's'} ago`, '');
    }

    // Experience
    if (player.exp != null || player.uexp != null) {
        const exp = player.exp || player.uexp || 0;
        you_have(final, `${exp} experience point${exp === 1 ? '' : 's'}`, '');
    }
}

// ============================================================================
// basics_enlightenment
// cf. insight.c:705 [static]
// Hit points, energy, armor class, gold.
// ============================================================================

// cf. insight.c:705 [static] — basics_enlightenment(mode, final, game)
function basics_enlightenment(mode, final, game) {
    const player = (game.u || game.player);

    enlght_out('');
    enlght_out(' Basics:');

    // Hit points
    let hp = player.uhp || 0;
    const hpmax = player.uhpmax || 0;
    if (hp < 0) hp = 0;

    if (hp === hpmax && hpmax > 1)
        you_have(final, `all ${hpmax} hit points`, '');
    else
        you_have(final, `${hp} out of ${hpmax} hit point${hpmax === 1 ? '' : 's'}`, '');

    // Energy
    const pw = player.en || player.energy || 0;
    const pwmax = player.enmax || player.energymax || 0;
    if (pwmax === 0 || (pw === pwmax && pwmax === 2))
        you_have(final, `${!pwmax ? 'no' : 'both'} energy points (spell power)`, '');
    else if (pw === pwmax && pwmax > 2)
        you_have(final, `all ${pwmax} energy points (spell power)`, '');
    else
        you_have(final, `${pw} out of ${pwmax} energy points (spell power)`, '');

    // Armor class
    const ac = player.ac != null ? player.ac : 10;
    enl_msg(final, 'Your armor class ', 'is ', 'was ', String(ac), '');

    // Gold
    const gold = player.gold || player.au || 0;
    if (!gold) {
        enlght_out(` Your wallet ${!final ? 'is' : 'was'} empty.`);
    } else {
        enlght_out(` Your wallet contain${!final ? 's' : 'ed'} ${gold} gold piece${gold === 1 ? '' : 's'}.`);
    }

    // Autopickup
    const autopickup = player.autopickup != null ? player.autopickup : (game.flags && game.flags.pickup);
    if (autopickup) {
        enl_msg(final, 'Autopickup ', 'is ', 'was ', 'on', '');
    } else {
        enl_msg(final, 'Autopickup ', 'is ', 'was ', 'off', '');
    }
}

// ============================================================================
// characteristics_enlightenment
// cf. insight.c:804 [static]
// Expanded stats display: strength, dexterity, etc.
// ============================================================================

// cf. insight.c:804 [static] — characteristics_enlightenment(mode, final, game)
export function characteristics_enlightenment(mode, final, game) {
    enlght_out('');
    enlght_out(` ${!final ? '' : 'Final '}Characteristics:`);

    one_characteristic(mode, final, A_STR, game);
    one_characteristic(mode, final, A_DEX, game);
    one_characteristic(mode, final, A_CON, game);
    one_characteristic(mode, final, A_INT, game);
    one_characteristic(mode, final, A_WIS, game);
    one_characteristic(mode, final, A_CHA, game);
}

// ============================================================================
// attrval
// cf. insight.c:286 [static]
// Format a characteristic value, handling Strength's 18/xx notation.
// ============================================================================
export function attrval(attrindx, attrvalue) {
    if (attrindx !== A_STR || attrvalue <= 18)
        return String(attrvalue);
    else if (attrvalue > 118) // STR18(100) = 118
        return String(attrvalue - 100);
    else
        return `18/${String(attrvalue - 18).padStart(2, '0')}`;
}

// ============================================================================
// one_characteristic
// cf. insight.c:823 [static]
// Display a single attribute value.
// ============================================================================

// cf. insight.c:823 [static] — one_characteristic(mode, final, attrindx, game)
function one_characteristic(mode, final, attrindx, game) {
    const player = (game.u || game.player);
    const attrs = player.attributes || player.attrs || [];
    const acurrent = attrs[attrindx] || 0;
    const name = attrname[attrindx] || 'unknown';
    const valubuf = attrval(attrindx, acurrent);

    // In C, also shows base/peak/limit when they differ from current;
    // we show current only since JS doesn't track those separately yet
    const subjbuf = `Your ${name} `;
    enl_msg(final, subjbuf, 'is ', 'was ', valubuf, '');
}

// ============================================================================
// status_enlightenment
// cf. insight.c:917 [static]
// Status, capabilities, and troubles display.
// ============================================================================

// cf. insight.c:917 [static] — status_enlightenment(mode, final, game)
function status_enlightenment(mode, final, game) {
    const player = (game.u || game.player);
    const map = (game.lev || game.map);

    enlght_out('');
    enlght_out(final ? ' Final Status:' : ' Status:');

    // Polymorph
    if (player.upolyd || player.polymorphed) {
        you_are(final, 'transformed', '');
    }

    // Levitation
    if (player.levitating) {
        you_are(final, 'levitating', '');
    } else if (player.flying) {
        you_are(final, 'flying', '');
    }

    // Underwater
    if (player.underwater) {
        you_are(final, 'underwater', '');
    } else if (player.uinwater) {
        you_are(final, player.swimming ? 'swimming' : 'in water', '');
    } else if (walking_on_water(player, map)) {
        you_are(final, 'walking on water', '');
    }

    // Internal troubles
    if (hasIntrinsic(player, 'Stoned')) {
        if (final)
            enlght_out(' You turned into stone.');
        else
            you_are(final, 'turning to stone', '');
    }
    if (hasIntrinsic(player, 'Slimed')) {
        if (final)
            enlght_out(' You turned into slime.');
        else
            you_are(final, 'turning into slime', '');
    }
    if (hasIntrinsic(player, 'Strangled')) {
        you_are(final, 'being strangled', '');
    }
    if (hasIntrinsic(player, 'Vomiting')) {
        you_are(final, 'nauseated', '');
    }
    if (hasPlayerProp(player, 'STUNNED') || player.stunned) {
        you_are(final, 'stunned', '');
    }
    if (hasPlayerProp(player, 'CONFUSION') || player.confused) {
        you_are(final, 'confused', '');
    }
    if (player.hallucinating) {
        you_are(final, 'hallucinating', '');
    }
    if (hasPlayerProp(player, 'BLINDED') || player.blind) {
        you_are(final, 'blind', '');
    }
    if (player.deaf) {
        you_are(final, 'deaf', '');
    }

    // External troubles
    if (player.punished) {
        you_are(final, 'chained to an iron ball', '');
    }
    if (player.utrap) {
        const predicament = trap_predicament(final, game.wizard, player);
        you_are(final, predicament, '');
    }
    if (player.ustuck) {
        if (player.uswallow)
            you_are(final, `swallowed by ${x_monnam(player.ustuck)}`, '');
        else
            you_are(final, `held by ${x_monnam(player.ustuck)}`, '');
    }

    // Hunger
    const hungerState = player.hungerState || player.uhs;
    if (hungerState != null) {
        const hu_stat = ['', 'Hungry', 'Weak', 'Fainting', 'Fainted', 'Starved'];
        let hstr = (hu_stat[hungerState] || '').toLowerCase();
        if (!hstr) hstr = 'not hungry';
        if (hstr === 'weak') hstr += ' from severe hunger';
        else if (hstr.startsWith('faint')) hstr += ' due to starvation';
        you_are(final, hstr, '');
    }

    // Encumbrance
    const encumbrance = player.encumbrance || 0;
    if (encumbrance > 0) {
        const enc_names = ['unencumbered', 'burdened', 'stressed', 'strained', 'overtaxed', 'overloaded'];
        const enc_adj   = ['', 'slightly', 'moderately', 'very', 'extremely', 'not possible'];
        const ename = enc_names[encumbrance] || 'encumbered';
        const adj = enc_adj[encumbrance] || '';
        let buf = ename;
        if (adj) buf += `; movement ${!final ? 'is' : 'was'} ${adj} slowed`;
        you_are(final, buf, '');
    } else {
        you_are(final, 'unencumbered', '');
    }

    // Weapon insight
    weapon_insight(final, game);
}

// ============================================================================
// weapon_insight
// cf. insight.c:1247 [static]
// Report current weapon status.
// ============================================================================

// cf. insight.c:1247 [static] — weapon_insight(final, game)
export function weapon_insight(final, game) {
    const player = (game.u || game.player);
    const uwep = player.weapon;

    if (!uwep) {
        // empty-handed
        if (player.gloves)
            you_are(final, 'empty handed (with gloves)', '');
        else
            you_are(final, 'empty handed', '');
    } else if (player.twoweap) {
        you_are(final, 'wielding two weapons at once', '');
    } else {
        const weapName = uwep.oname || 'a weapon';
        you_are(final, `wielding ${weapName}`, '');
    }
}

// ============================================================================
// doattributes
// cf. insight.c:2014
// ^X attribute display command.
// ============================================================================

// cf. insight.c:266 [static] — cause_known()
// Minimal JS parity surface: query whether a cause id/text has been marked known.
export function cause_known(cause, gameOrPlayer) {
    const player = (gameOrPlayer && (gameOrPlayer.u || gameOrPlayer.player))
        ? (gameOrPlayer.u || gameOrPlayer.player)
        : gameOrPlayer;
    if (!player || cause == null) return false;
    const known = player.knownCauses || player.known_causes;
    if (Array.isArray(known)) return known.includes(cause);
    if (known && typeof known === 'object') return !!known[cause];
    return false;
}

// cf. insight.c:1464 [static] — attributes_enlightenment()
// Wrapper used by callers that want the canonical attributes-view pipeline.
export async function attributes_enlightenment(mode, final, game) {
    await enlightenment(mode, final, game);
    return 0;
}

// cf. insight.c:2014 — doattributes(game): ^X attribute display command
// Autotranslated from insight.c:2013
export async function doattributes(game) {
  let mode = BASICENLIGHTENMENT;
  if (game?.wizard || game?.discover) {
    mode |= MAGICENLIGHTENMENT;
  }
  await enlightenment(mode, ENL_GAMEINPROGRESS, game);
  return ECMD_OK;
}

// ============================================================================
// enlightenment
// cf. insight.c:360
// Main enlightenment display function.
// ============================================================================

export async function enlightenment(mode, final, game) {
    const player = (game.u || game.player);
    _enl_lines = [];

    const pname = (player.name || 'Hero');
    const roleName = player.roleName || player.role || 'Adventurer';
    enlght_out(` ${pname} the ${roleName}'s attributes:`);

    // Background and characteristics; ^X or end-of-game disclosure
    if (mode & BASICENLIGHTENMENT) {
        background_enlightenment(mode, final, game);
        basics_enlightenment(mode, final, game);
        characteristics_enlightenment(mode, final, game);
    }

    // Status — shown for both basic and magic enlightenment
    status_enlightenment(mode, final, game);

    // Miscellaneous section
    enlght_out('');
    enlght_out(' Miscellaneous:');

    if ((mode & BASICENLIGHTENMENT) !== 0 && (game.wizard || game.discover || final)) {
        if (game.wizard || game.discover) {
            you_are(final, `running in ${game.wizard ? 'debug' : 'explore'} mode`, '');
        }
    }

    const timeStr = fmt_elapsed_time(final, game);
    enl_msg(final, 'Total elapsed playing time ', 'is', 'was', timeStr, '');

    // Display the accumulated text
    const text = _enl_lines.join('\n');
    _enl_lines = [];

    if (game.display) {
        await showPager(game.display, text, 'Enlightenment');
    }
}

// C ref: zap.c do_enlightenment_effect() uses MAGICENLIGHTENMENT in-game.
// Exported for zap.js to preserve C ordering without duplicating insight internals.
export async function run_magic_enlightenment_effect(game) {
    await enlightenment(MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS, game);
}

// ============================================================================
// doconduct
// cf. insight.c:2086
// #conduct command handler.
// ============================================================================

// cf. insight.c:2086 — doconduct(game): #conduct command handler
// Autotranslated from insight.c:2085
export async function doconduct() {
  await show_conduct(ENL_GAMEINPROGRESS);
  return ECMD_OK;
}

// ============================================================================
// show_conduct
// cf. insight.c:2094
// Display conduct list.
// ============================================================================

// cf. insight.c:2094 — show_conduct(final, game): display conduct list
export async function show_conduct(final, game) {
    const player = (game.u || game.player);
    const conduct = player.uconduct || {};
    _enl_lines = [];

    enlght_out('Voluntary challenges:');

    // Roleplay options
    const rp = player.uroleplay || {};
    if (rp.blind)
        you_have_been(final, 'blind from birth');
    if (rp.deaf)
        you_have_been(final, 'deaf from birth');
    if (rp.nudist)
        you_have_been(final, 'faithfully nudist');

    // Food conduct
    if (!conduct.food)
        enl_msg(final, 'You ', 'have gone', 'went', ' without food', '');
    else if (!conduct.unvegan)
        you_have_X(final, 'followed a strict vegan diet');
    else if (!conduct.unvegetarian)
        you_have_been(final, 'vegetarian');

    // Atheist
    if (!conduct.gnostic)
        you_have_been(final, 'an atheist');

    // Weapon hits
    if (!conduct.weaphit) {
        you_have_never(final, 'hit with a wielded weapon');
    } else if (game.wizard) {
        you_have_X(final, `hit with a wielded weapon ${conduct.weaphit} time${conduct.weaphit === 1 ? '' : 's'}`);
    }

    // Pacifist
    if (!conduct.killer)
        you_have_been(final, 'a pacifist');

    // Illiterate
    if (!conduct.literate) {
        you_have_been(final, 'illiterate');
    } else if (game.wizard) {
        you_have_X(final, `read items or engraved ${conduct.literate} time${conduct.literate === 1 ? '' : 's'}`);
    }

    // Pets
    if (!conduct.pets)
        you_have_never(final, 'had a pet');

    // Genocide
    const ngenocided = num_genocides(game);
    if (ngenocided === 0) {
        you_have_never(final, 'genocided any monsters');
    } else {
        you_have_X(final, `genocided ${ngenocided} type${ngenocided === 1 ? '' : 's'} of monster${ngenocided === 1 ? '' : 's'}`);
    }

    // Polypiles
    if (!conduct.polypiles) {
        you_have_never(final, 'polymorphed an object');
    } else if (game.wizard) {
        you_have_X(final, `polymorphed ${conduct.polypiles} item${conduct.polypiles === 1 ? '' : 's'}`);
    }

    // Polyself
    if (!conduct.polyselfs) {
        you_have_never(final, 'changed form');
    } else if (game.wizard) {
        you_have_X(final, `changed form ${conduct.polyselfs} time${conduct.polyselfs === 1 ? '' : 's'}`);
    }

    // Wishes
    if (!conduct.wishes) {
        you_have_X(final, 'used no wishes');
    } else {
        let buf = `used ${conduct.wishes} wish${conduct.wishes > 1 ? 'es' : ''}`;
        if (conduct.wisharti) {
            if (conduct.wisharti === conduct.wishes) {
                const prefix = conduct.wisharti > 2 ? 'all '
                    : conduct.wisharti === 2 ? 'both ' : '';
                buf += ` (${prefix}for ${conduct.wisharti === 1 ? 'an artifact' : 'artifacts'})`;
            } else {
                buf += ` (${conduct.wisharti} for ${conduct.wisharti === 1 ? 'an artifact' : 'artifacts'})`;
            }
        }
        you_have_X(final, buf);
        if (!conduct.wisharti) {
            enl_msg(final, 'You ', 'have not wished', 'did not wish', ' for any artifacts', '');
        }
    }

    // Sokoban rules
    if (sokoban_in_play(game)) {
        let presentverb = 'have violated', pastverb = 'violated';
        let sokobuf = ' the special Sokoban rules ';
        const cheat = conduct.sokocheat || 0;
        switch (cheat) {
        case 0:
            presentverb = 'have not violated';
            pastverb = 'did not violate';
            sokobuf = ' any of the special Sokoban rules';
            break;
        case 1: sokobuf += 'once'; break;
        case 2: sokobuf += 'twice'; break;
        case 3: sokobuf += 'thrice'; break;
        default: sokobuf += `${cheat} times`; break;
        }
        enl_msg(final, 'You ', presentverb, pastverb, sokobuf, '');
    }

    // Display the accumulated text
    const text = _enl_lines.join('\n');
    _enl_lines = [];

    if (game.display) {
        await showPager(game.display, text, 'Conduct');
    }
}

// cf. insight.c:2253 [static] — show_achievements()
export async function show_achievements(final, game) {
    const player = (game.u || game.player);
    const entries = Array.isArray(player.uachieved) ? player.uachieved : [];
    const lines = [];
    lines.push(`${final ? 'Major' : 'Recorded'} achievements:`);
    if (!entries.length) {
        lines.push(' none');
    } else {
        for (const raw of entries) {
            const ach = Math.abs(Number(raw) || 0);
            let label = `achievement #${ach}`;
            if (ach === ACH_BELL) label = 'obtained the Bell of Opening';
            else if (ach === ACH_CNDL) label = 'obtained the Candelabrum of Invocation';
            else if (ach === ACH_BOOK) label = 'obtained the Book of the Dead';
            else if (ach === ACH_AMUL) label = 'obtained the Amulet of Yendor';
            else if (ach === ACH_ENDG) label = 'entered the endgame';
            else if (ach === ACH_ASTR) label = 'reached the Astral Plane';
            else if (ach === ACH_UWIN) label = 'completed the game objective';
            else if (ach === ACH_SOKO_PRIZE) label = 'claimed the Sokoban prize';
            else if (ach === ACH_MINE_PRIZE) label = 'claimed the Gnomish Mines prize';
            lines.push(` - ${label}`);
        }
    }
    if (game.display) {
        await showPager(game.display, lines.join('\n'), 'Achievements');
    }
    return lines;
}

// ============================================================================
// record_achievement
// cf. insight.c:2417
// Record a game achievement (add at end of list unless already present).
// ============================================================================

// cf. insight.c:2417 — record_achievement(achidx, player): record a game achievement
export function record_achievement(achidx, player) {
    if (!player.uachieved) player.uachieved = [];

    const absidx = Math.abs(achidx);
    // valid achievements range from 1 to N_ACH-1; ranks can be negative
    if ((achidx < 1 && (absidx < ACH_RNK1 || absidx > ACH_RNK8))
        || achidx >= N_ACH) {
        return; // out of range
    }

    // Check if already recorded
    for (let i = 0; i < player.uachieved.length; i++) {
        if (Math.abs(player.uachieved[i]) === absidx)
            return; // already present, don't duplicate
    }

    player.uachieved.push(achidx);
}

// ============================================================================
// remove_achievement
// cf. insight.c:2486
// Discard a recorded achievement. Returns true if removed, false otherwise.
// ============================================================================

// cf. insight.c:2486 — remove_achievement(achidx, player): discard achievement
export function remove_achievement(achidx, player) {
    if (!player.uachieved) return false;

    const absidx = Math.abs(achidx);
    for (let i = 0; i < player.uachieved.length; i++) {
        if (Math.abs(player.uachieved[i]) === absidx) {
            player.uachieved.splice(i, 1);
            return true;
        }
    }
    return false;
}

// ============================================================================
// count_achievements
// cf. insight.c:2504
// Count current achievements.
// ============================================================================

// cf. insight.c:2504 — count_achievements(player): count current achievements
// Autotranslated from insight.c:2503
export function count_achievements(player) {
  let i, acnt = 0;
  for (i = 0; player.uachieved[i]; ++i) {
    ++acnt;
  }
  return acnt;
}

// ============================================================================
// sokoban_in_play
// cf. insight.c:2527
// Return true if sokoban branch has been entered.
// ============================================================================

// cf. insight.c:2527 — sokoban_in_play(game): check if sokoban entered
// Autotranslated from insight.c:2526
export function sokoban_in_play(player) {
  let achidx;
  for (achidx = 0; player.uachieved[achidx]; ++achidx) {
    if (player.uachieved[achidx] === ACH_SOKO) return true;
  }
  return false;
}

// ============================================================================
// do_gamelog
// cf. insight.c:2542
// #chronicle command handler.
// ============================================================================

// cf. insight.c:2542 — do_gamelog(game): #chronicle command handler
// Autotranslated from insight.c:2541
export async function do_gamelog() {
  if (getGameLog().length) { await show_gamelog(ENL_GAMEINPROGRESS); }
  else { await pline("No chronicled events."); }
  return ECMD_OK;
}

// ============================================================================
// show_gamelog
// cf. insight.c:2571
// Display chronicle details.
// ============================================================================

// cf. insight.c:2571 — show_gamelog(final, game): display chronicle
export async function show_gamelog(final, game) {
    const player = (game.u || game.player);
    const gamelog = player.gamelog || game.gamelog || [];

    const lines = [];
    lines.push(`${final ? 'Major' : 'Logged'} events:`);

    let eventcnt = 0;
    for (const entry of gamelog) {
        // In C, entries have .flags, .turn, .text
        // In JS, entries might be strings or objects
        const text = typeof entry === 'string' ? entry : (entry.text || String(entry));
        const turn = (typeof entry === 'object' && entry.turn != null) ? entry.turn : '';

        // For final display, only show major events (simplified: show all)
        if (!eventcnt++) {
            lines.push(' Turn');
        }
        if (turn) {
            lines.push(`${String(turn).padStart(5)}: ${text}`);
        } else {
            lines.push(`      ${text}`);
        }
    }

    if (!eventcnt) {
        lines.push(' none');
    }

    if (game.display) {
        await showPager(game.display, lines.join('\n'), 'Chronicle');
    }
}

// ============================================================================
// set_vanq_order
// cf. insight.c:2728
// Let player choose sort order for vanquished display. Returns sort mode.
// ============================================================================

// cf. insight.c:2728 — set_vanq_order(for_vanq, game): set vanquished sort order
export function set_vanq_order(for_vanq, game) {
    // In C, this presents a menu; in JS we default to traditional sort
    // and store the preference on game.flags
    if (!game.flags) game.flags = {};
    // Default to traditional sort by monster level
    if (game.flags.vanq_sortmode == null)
        game.flags.vanq_sortmode = VANQ_MLVL_MNDX;
    return game.flags.vanq_sortmode;
}

// ============================================================================
// dovanquished
// cf. insight.c:2779
// #vanquished command handler.
// ============================================================================

// cf. insight.c:2779 — dovanquished(game): #vanquished command handler
export async function dovanquished(game) {
    await list_vanquished('y', false, game);
    return 0; // ECMD_OK
}

// ============================================================================
// list_vanquished
// cf. insight.c:2794
// List vanquished monsters.
// ============================================================================

// Helper: check if a monster index represents a unique creature
function UniqCritterIndx(mndx) {
    if (mndx < 0 || mndx >= NUMMONS) return false;
    return (mons[mndx].geno & G_UNIQ) !== 0 && mndx !== PM_HIGH_CLERIC;
}

// cf. insight.c:2794 — list_vanquished(defquery, ask, game): list vanquished
export async function list_vanquished(defquery, ask, game) {
    // mvitals tracks .died counts per monster index
    const mvitals = game.mvitals || ((game.u || game.player) && (game.u || game.player).mvitals) || [];
    const sortmode = (game.flags && game.flags.vanq_sortmode) || VANQ_MLVL_MNDX;

    // Collect monster indices with kills
    const mindx = [];
    let total_killed = 0;

    for (let i = LOW_PM; i < NUMMONS; i++) {
        const nkilled = (mvitals[i] && mvitals[i].died) || 0;
        if (nkilled === 0) continue;
        mindx.push(i);
        total_killed += nkilled;
    }

    if (mindx.length === 0) {
        await pline("No creatures have been vanquished.");
        return;
    }

    // Sort according to sortmode
    mindx.sort((a, b) => vanqsort_cmp(a, b, sortmode, mvitals));

    const lines = [];
    lines.push('Vanquished creatures:');
    lines.push('');

    for (const i of mindx) {
        const nkilled = (mvitals[i] && mvitals[i].died) || 0;
        const mname = (mons[i] && mons[i].mname) || `monster #${i}`;

        let buf;
        if (UniqCritterIndx(i)) {
            const prefix = (mons[i].mflags2 && (mons[i].mflags2 & M2_PNAME)) ? '' : 'the ';
            buf = `${prefix}${mname}`;
            if (nkilled > 1) {
                switch (nkilled) {
                case 2: buf += ' (twice)'; break;
                case 3: buf += ' (thrice)'; break;
                default: buf += ` (${nkilled} times)`; break;
                }
            }
        } else {
            if (nkilled === 1) {
                const article = /^[aeiou]/i.test(mname) ? 'an' : 'a';
                buf = `  ${article} ${mname}`;
            } else {
                buf = `${String(nkilled).padStart(3)} ${makeplural(mname)}`;
            }
        }
        lines.push(buf);
    }

    if (mindx.length > 1) {
        lines.push('');
        lines.push(`${total_killed} creatures vanquished.`);
    }

    if (game.display) {
        await showPager(game.display, lines.join('\n'), 'Vanquished');
    }
}

// Comparator for vanquished monster sorting
function vanqsort_cmp(indx1, indx2, sortmode, mvitals) {
    let res;
    switch (sortmode) {
    default:
    case VANQ_MLVL_MNDX:
        res = (mons[indx2].mlevel || 0) - (mons[indx1].mlevel || 0);
        break;
    case VANQ_MSTR_MNDX:
        res = (mons[indx2].difficulty || 0) - (mons[indx1].difficulty || 0);
        break;
    case VANQ_ALPHA_SEP: {
        const uniq1 = UniqCritterIndx(indx1) ? 1 : 0;
        const uniq2 = UniqCritterIndx(indx2) ? 1 : 0;
        if (uniq1 !== uniq2) {
            res = uniq2 - uniq1;
            break;
        }
        // fall through to alphabetical
    }
    // falls through
    case VANQ_ALPHA_MIX: {
        const name1 = (mons[indx1] && mons[indx1].mname) || '';
        const name2 = (mons[indx2] && mons[indx2].mname) || '';
        res = name1.toLowerCase().localeCompare(name2.toLowerCase());
        break;
    }
    case VANQ_MCLS_HTOL:
    case VANQ_MCLS_LTOH: {
        const mcls1 = mons[indx1].mlet || 0;
        const mcls2 = mons[indx2].mlet || 0;
        res = mcls1 - mcls2;
        if (res === 0) {
            const mlev1 = mons[indx1].mlevel || 0;
            const mlev2 = mons[indx2].mlevel || 0;
            res = mlev1 - mlev2;
            if (sortmode === VANQ_MCLS_HTOL) res = -res;
        }
        break;
    }
    case VANQ_COUNT_H_L:
    case VANQ_COUNT_L_H: {
        const died1 = (mvitals[indx1] && mvitals[indx1].died) || 0;
        const died2 = (mvitals[indx2] && mvitals[indx2].died) || 0;
        res = died2 - died1;
        if (sortmode === VANQ_COUNT_L_H) res = -res;
        break;
    }
    }
    // Tiebreaker: internal index
    if (res === 0) res = indx1 - indx2;
    return res;
}

// makeplural imported from objnam.js

// ============================================================================
// num_genocides
// cf. insight.c:2973
// Count genocided species.
// ============================================================================

// cf. insight.c:2973 — num_genocides(game): count genocided species
export function num_genocides(game) {
    const mvitals = game.mvitals || ((game.u || game.player) && (game.u || game.player).mvitals) || [];
    let n = 0;

    for (let i = LOW_PM; i < NUMMONS; i++) {
        if (mvitals[i] && (mvitals[i].mvflags & G_GENOD)) {
            n++;
        }
    }
    return n;
}

// ============================================================================
// num_extinct
// cf. insight.c:2990 [static]
// Count extinct species.
// ============================================================================

// cf. insight.c:2990 [static] — num_extinct(game): count extinct species
// Autotranslated from insight.c:2989
export function num_extinct(game) {
  let i, n = 0;
  for (i = LOW_PM; i < NUMMONS; ++i) {
    if (UniqCritterIndx(i)) {
      continue;
    }
    if ((game.mvitals[i].mvflags & G_GONE) === G_EXTINCT) ++n;
  }
  return n;
}

// ============================================================================
// num_gone
// cf. insight.c:3005 [static]
// Collect both genocides and extinctions, skipping uniques.
// Returns { count, mindx } where mindx is array of monster indices.
// ============================================================================

// cf. insight.c:3005 [static] — num_gone(mvflags_mask, game): collect gone species
function num_gone(mvflags_mask, game) {
    const mvitals = game.mvitals || ((game.u || game.player) && (game.u || game.player).mvitals) || [];
    const mindx = [];

    for (let i = LOW_PM; i < NUMMONS; i++) {
        if (UniqCritterIndx(i)) continue;
        if (mvitals[i] && (mvitals[i].mvflags & mvflags_mask) !== 0)
            mindx.push(i);
    }
    return { count: mindx.length, mindx };
}

// ============================================================================
// list_genocided
// cf. insight.c:3027
// List genocided (and optionally extinct) species.
// ============================================================================

// cf. insight.c:3027 — list_genocided(defquery, ask, game): list genocided species
export async function list_genocided(defquery, ask, game) {
    const wizard = game.wizard || false;
    const discover = game.discover || false;
    const gameover = game.gameover || false;
    const both = gameover || wizard || discover;

    const ngenocided = num_genocides(game);
    const nextinct = both ? num_extinct(game) : 0;
    const mvflags_mask = G_GENOD | (both ? G_EXTINCT : 0);
    const { count: ngone, mindx } = num_gone(mvflags_mask, game);

    if (ngone === 0) {
        await pline("No creatures have been genocided.");
        return;
    }

    const mvitals = game.mvitals || ((game.u || game.player) && (game.u || game.player).mvitals) || [];
    const sortmode = (game.flags && game.flags.vanq_sortmode) || VANQ_MLVL_MNDX;

    // Sort using the vanquished comparator
    mindx.sort((a, b) => vanqsort_cmp(a, b,
        (sortmode === VANQ_COUNT_H_L || sortmode === VANQ_COUNT_L_H) ? VANQ_ALPHA_MIX : sortmode,
        mvitals));

    const lines = [];
    let header = ngenocided ? 'Genocided' : 'Extinct';
    if (nextinct && ngenocided) header += ' or extinct';
    lines.push(`${header} species:`);
    lines.push('');

    for (const mndx of mindx) {
        const mname = (mons[mndx] && mons[mndx].mname) || `monster #${mndx}`;
        let buf = ` ${makeplural(mname)}`;
        if (mvitals[mndx] && (mvitals[mndx].mvflags & G_GONE) === G_EXTINCT)
            buf += ' (extinct)';
        lines.push(buf);
    }

    lines.push('');
    if (ngenocided > 0) {
        lines.push(`${ngenocided} species genocided.`);
    }
    if (nextinct > 0) {
        lines.push(`${nextinct} species extinct.`);
    }

    if (game.display) {
        await showPager(game.display, lines.join('\n'), 'Genocided');
    }
}

// ============================================================================
// dogenocided
// cf. insight.c:3155
// #genocided command handler.
// ============================================================================

// cf. insight.c:3155 — dogenocided(game): #genocided command handler
export async function dogenocided(game) {
    await list_genocided('y', false, game);
    return 0; // ECMD_OK
}

// ============================================================================
// doborn
// cf. insight.c:3165
// #wizborn command handler (wizard mode only).
// ============================================================================

// cf. insight.c:3165 — doborn(game): wizard born species command
export async function doborn(game) {
    const mvitals = game.mvitals || ((game.u || game.player) && (game.u || game.player).mvitals) || [];

    const lines = [];
    lines.push('died born');
    let nborn = 0, ndied = 0;

    for (let i = LOW_PM; i < NUMMONS; i++) {
        const mv = mvitals[i];
        if (!mv) continue;
        const born = mv.born || 0;
        const died = mv.died || 0;
        const mvflags = mv.mvflags || 0;

        if (born || died || (mvflags & G_GONE) !== 0) {
            const flag = (mvflags & G_GONE) === G_EXTINCT ? 'E'
                       : (mvflags & G_GONE) === G_GENOD ? 'G'
                       : (mvflags & G_GONE) !== 0 ? 'X'
                       : ' ';
            const mname = (mons[i] && mons[i].mname) || `monster #${i}`;
            lines.push(`${String(died).padStart(4)} ${String(born).padStart(4)} ${flag} ${mname}`);
            nborn += born;
            ndied += died;
        }
    }

    lines.push('');
    lines.push(`${String(ndied).padStart(4)} ${String(nborn).padStart(4)}   (totals)`);

    if (game.display) {
        await showPager(game.display, lines.join('\n'), 'Monsters Born');
    }
    return 0; // ECMD_OK
}

// cf. insight.c:2516 — achieve_rank
export function achieve_rank(rank) {
    // rank is 1..8; returns signed achievement index (negative for female)
    let achidx = (rank - 1) + ACH_RNK1;
    if (globalThis.gs?.player?.flags?.female) achidx = -achidx;
    return achidx;
}

// cf. insight.c:2027 — youhiding
// Reports hiding/mimicking status for enlightenment or topline
export function youhiding(via_enlightenment, msgflag) {
    // Stub: full mimic/hiding logic requires U_AP_TYPE and
    // apparence infrastructure not yet ported.
    // When fully implemented, this will report:
    // - "hiding" if hero is hidden
    // - "mimicking <object>" if hero is using mimic appearance
}

// Autotranslated from insight.c:1444
export function item_resistance_message(adtyp, prot_message, final) {
  let protection = u_adtyp_resistance_obj(adtyp);
  if (protection) {
    let somewhat = protection < 99;
    enl_msg("Your items ", somewhat ? "are somewhat" : "are", somewhat ? "were somewhat" : "were", prot_message, item_what(adtyp));
  }
}
