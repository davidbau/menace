// priest.js -- Priest behavior: temple guards, NPC dialog, shrine management
// cf. priest.c — newepri, free_epri, move_special, temple_occupied,
//                histemple_at, inhistemple, pri_move, priestini,
//                mon_aligntyp, priestname, p_coaligned, has_shrine,
//                findpriest, intemple, forget_temple_entry, priest_talk,
//                mk_roamer, reset_hostility, in_your_sanctuary,
//                ghod_hitsu, angry_priest, clearpriests, restpriest

import { A_NONE, A_LAWFUL, A_CHAOTIC, A_NEUTRAL,
         AM_MASK, AM_SHRINE, ROOMOFFSET, TEMPLE,
         Amask2align, A_WIS, ALL_TRAPS,
         isok } from './const.js';
import { IS_ALTAR, IS_DOOR, PROTECTION, FROMOUTSIDE } from './const.js';
import { rn2, rn1, c_d } from './rng.js';
import { pline, verbalize, You, Your, You_feel,
         livelog_printf } from './pline.js';
import { mons, PM_ALIGNED_CLERIC, PM_HIGH_CLERIC, PM_ANGEL,
         PM_GHOST, MS_LEADER } from './monsters.js';
import { mon_nam, Monnam, mon_pmname, rndmonnam } from './do_name.js';
import { is_minion, is_rider, canseemon, mon_learns_traps, resist_conflict, m_canseeu } from './mondata.js';
import { newsym } from './display.js';
import { In_endgame, Is_astralevel, Is_sanctum } from './dungeon.js';
import { m_next2u } from './muse.js';
import { move_special as move_special_monmove } from './monmove.js';
import { priestini as priestini_mkroom } from './mkroom.js';
import { newemin, bribe } from './minion.js';
import { makemon, set_malign } from './makemon.js';
import { monnear, wakeup, setmangry, mongone, helpless as monHelpless } from './mon.js';
import { exercise } from './attrib_exercise.js';
import { s_suffix, sgn } from './hacklib.js';
import { body_part } from './polyself.js';
import { a_gname_at, halu_gname } from './pray.js';
import { adjalign } from './attrib.js';
import { record_achievement } from './insight.js';
import { rloc } from './teleport.js';
import { RLOC_NOMSG, SPINE, EPRI, EMIN, MM_EMIN, MM_ADJACENTOK, MM_NOMSG, NO_MM_FLAGS, ARTICLE_NONE, ARTICLE_THE, ARTICLE_A, ARTICLE_YOUR } from './const.js';
import { buzz } from './zap.js';
import { money_cnt, nomul, in_rooms } from './hack.js';
import { game as _gstate } from './gstate.js';

// cf. priest.c:9-10 — alignment thresholds
const ALGN_SINNED = -4;
const ALGN_DEVOUT = 14;

// ARTICLE_* imported from const.js

// BZ constants for buzz() (cf. zap.h)
// AD_ELEC = 5 in C; BZ_OFS_AD(AD_ELEC) = AD_ELEC-1 = 4;
// BZ_M_SPELL(x) = x + 20
const BZ_M_SPELL_ELEC = 24;

// MM flags imported from const.js
// ============================================================================
// newepri — cf. priest.c:16
// Allocates EPRI struct on mtmp for temple/alignment/room tracking.
// ============================================================================
export function newepri(mtmp) {
    if (!mtmp.epri) {
        mtmp.epri = {
            shroom: 0,
            shralign: A_NONE,
            shrpos: { x: 0, y: 0 },
            shrlevel: null,
            intone_time: 0,
            enter_time: 0,
            peaceful_time: 0,
            hostile_time: 0,
        };
    }
}

// ============================================================================
// free_epri — cf. priest.c:28
// Frees EPRI struct; clears ispriest flag.
// ============================================================================
export function free_epri(mtmp) {
    if (mtmp.epri) {
        mtmp.epri = null;
    }
    mtmp.ispriest = false;
}

// C ref: priest.c:42 — move_special(): canonical in monmove.js; re-exported
export { move_special_monmove as move_special };

// C ref: priest.c:220 — priestini(): canonical in mkroom.js; re-exported
export { priestini_mkroom as priestini };

// ============================================================================
// temple_occupied — cf. priest.c:142
// Returns temple room char if any room in rooms_str is occupied by its priest.
// rooms_str is a string of room characters (like player.urooms).
// ============================================================================
export function temple_occupied(rooms_str, map) {
    if (!rooms_str || !map || !map.rooms) return 0;
    for (let i = 0; i < rooms_str.length; i++) {
        const ch = rooms_str.charCodeAt(i);
        const idx = ch - ROOMOFFSET;
        if (idx >= 0 && idx < map.rooms.length) {
            if (map.rooms[idx] && map.rooms[idx].rtype === TEMPLE) {
                return ch;
            }
        }
    }
    return 0;
}

// ============================================================================
// histemple_at — cf. priest.c:153 (static in C)
// Returns true if (x,y) is inside the priest's temple room.
// ============================================================================
export function histemple_at(priest, x, y, map) {
    if (!priest || !priest.ispriest || !priest.epri) return false;
    const roomsAtXY = in_rooms(x, y, TEMPLE, map);
    if (!roomsAtXY) return false;
    // Check if priest's shroom matches any temple room at (x,y)
    for (let i = 0; i < roomsAtXY.length; i++) {
        const room = (typeof roomsAtXY === 'string') ? roomsAtXY.charCodeAt(i) : roomsAtXY[i];
        if (room === priest.epri.shroom) return true;
    }
    return false;
    // C also checks on_level(&(EPRI(priest)->shrlevel), &u.uz) — in JS,
    // priests are always on the current level when we're processing them.
}

// ============================================================================
// inhistemple — cf. priest.c:161
// Checks that priest is in his temple room and shrine is properly aligned.
// ============================================================================
export function inhistemple(priest, map) {
  if (!priest || !priest.ispriest) return false;
  if (!histemple_at(priest, priest.mx, priest.my, map)) return false;
  return has_shrine(priest, map);
}

// ============================================================================
// has_shrine — cf. priest.c:376 (static in C)
// Checks that an altar of the proper alignment exists in the temple room.
// ============================================================================
export function has_shrine(pri, map) {
    if (!pri || !pri.ispriest || !pri.epri) return false;
    const epri_p = pri.epri;
    const loc = map.at(epri_p.shrpos.x, epri_p.shrpos.y);
    if (!loc) return false;
    if (!IS_ALTAR(loc.typ) || !(loc.flags & AM_SHRINE)) return false;
    return epri_p.shralign === Amask2align(loc.flags & ~AM_SHRINE);
}

// ============================================================================
// findpriest — cf. priest.c:392
// Scans monsters for a priest assigned to the given temple room number.
// ============================================================================
export function findpriest(roomno, map) {
    if (!map || !map.monsters) return null;
    for (const mtmp of map.monsters) {
        if (mtmp.dead) continue;
        if (mtmp.ispriest && mtmp.epri
            && mtmp.epri.shroom === roomno
            && histemple_at(mtmp, mtmp.mx, mtmp.my, map)) {
            return mtmp;
        }
    }
    return null;
}

// ============================================================================
// p_coaligned — cf. priest.c:370
// Returns true if player and priest share the same alignment.
// ============================================================================
// Autotranslated from priest.c:369
export function p_coaligned(priest, player) {
  // C ref: u.ualign.type; JS stores alignment as player.alignment (numeric).
  const playerAlign = player.alignment ?? 0;
  return (playerAlign === mon_aligntyp(priest));
}

// ============================================================================
// mon_aligntyp — cf. priest.c:280
// Returns priest/minion/normal alignment type for the monster.
// ============================================================================
export function mon_aligntyp(mon) {
    let algn;
    if (mon.ispriest && mon.epri) {
        algn = mon.epri.shralign;
    } else if (mon.isminion && mon.emin) {
        algn = mon.emin.min_align;
    } else {
        algn = (mon.type || mon.data || {}).maligntyp || 0;
    }
    if (algn === A_NONE) return A_NONE;
    return algn > 0 ? A_LAWFUL : algn < 0 ? A_CHAOTIC : A_NEUTRAL;
}

// ============================================================================
// priestname — cf. priest.c:302
// Generates "the Priest of <deity>" with proper article.
// ============================================================================
export function priestname(mon, article, reveal_high_priest, player) {
    const do_hallu = player && player.hallucinating;
    const aligned_priest = (mon.mndx === PM_ALIGNED_CLERIC)
        || ((mon.data || mon.type) === mons[PM_ALIGNED_CLERIC]);
    const high_priest = (mon.mndx === PM_HIGH_CLERIC)
        || ((mon.data || mon.type) === mons[PM_HIGH_CLERIC]);
    let what = do_hallu ? rndmonnam() : mon_pmname(mon);

    if (!mon.ispriest && !mon.isminion) {
        return what; // caller must be confused
    }

    // For high priest(ess), set what appropriately
    if (mon.ispriest || aligned_priest || high_priest) {
        what = do_hallu ? "poohbah" : mon.female ? "priestess" : "priest";
    }

    let pname = '';
    if (article !== ARTICLE_NONE) {
        if (article === ARTICLE_YOUR || (article === ARTICLE_A && high_priest)) {
            article = ARTICLE_THE;
        }
        if (article === ARTICLE_THE) {
            pname = "the ";
        } else if (what === "Angel") {
            pname = "an ";
        } else {
            // just_an equivalent
            pname = (/^[aeiouAEIOU]/.test(what)) ? "an " : "a ";
        }
    }

    if (mon.minvis) {
        if (pname === "a ") pname = "an ";
        pname += "invisible ";
    }
    if (mon.isminion && mon.emin && mon.emin.renegade) {
        if (pname === "an " && !mon.minvis) pname = "a ";
        pname += "renegade ";
    }

    if (mon.ispriest || aligned_priest) {
        if (high_priest) {
            pname += do_hallu ? "grand " : "high ";
        }
    } else {
        if (mon.mtame && what.toLowerCase() === "angel") {
            pname += "guardian ";
        }
    }

    pname += what;

    // "of <deity>"
    if (do_hallu || !high_priest || reveal_high_priest
        || !Is_astralevel(player?.uz)
        || m_next2u(mon, player) || false /* program_state.gameover */) {
        pname += " of ";
        pname += halu_gname(mon_aligntyp(mon), player);
    }
    return pname;
}

// Is_astralevel, Is_sanctum, In_endgame imported from dungeon.js

// set_malign imported from makemon.js

// helpless: use monHelpless from mon.js
// resist_conflict imported from mondata.js
function mapseen_temple(/*priest*/) { /* stub */ }
// in_rooms imported from hack.js

// linedup: check if (ax,ay) and (bx,by) are on a line (horiz/vert/diag)
function linedup(ax, ay, bx, by /*, boteflag*/) {
    const tbx = ax - bx;
    const tby = ay - by;
    if (tbx === 0 || tby === 0 || Math.abs(tbx) === Math.abs(tby)) {
        return true;
    }
    return false;
}

// ============================================================================
// pri_move — cf. priest.c:177
// Priest per-turn movement. Returns 1: moved, 0: didn't, -1: let m_move do it
// ============================================================================
export async function pri_move(priest, map, player, display, fov) {
    const omx = priest.mx;
    const omy = priest.my;

    if (!histemple_at(priest, omx, omy, map)) return -1;

    const temple = priest.epri.shroom;

    let ggx = priest.epri.shrpos.x;
    let ggy = priest.epri.shrpos.y;

    // C: rn1(3, -1) = rn2(3) + (-1) = rn2(3) - 1
    ggx += rn1(3, -1);
    ggy += rn1(3, -1);

    let avoid = true;

    if (!priest.mpeaceful
        || (player.conflict && !resist_conflict(priest, player))) {
        if (monnear(priest, player.x, player.y)) {
            if (player.displaced) {
                await Your("displaced image doesn't fool %s!", mon_nam(priest));
            }
            // C: mattacku(priest) — not yet ported; stub
            // (void) mattacku(priest);
            return 0;
        } else if ((player.urooms || '').indexOf(String.fromCharCode(temple)) >= 0) {
            // chase player if inside temple & can see him
            if (priest.mcansee !== false && m_canseeu(priest)) {
                ggx = player.x;
                ggy = player.y;
            }
            avoid = false;
        }
    } else if (player.Invis) {
        avoid = false;
    }

    return move_special_monmove(priest, map, player, false, true, false, avoid, ggx, ggy);
}

// ============================================================================
// intemple — cf. priest.c:410
// Called from check_special_room() when the player enters the temple room.
// ============================================================================
export async function intemple(roomno, map, player, display, fov) {
    // don't do anything if hero is already in the room
    if (temple_occupied(player.urooms0 || '', map)) return;

    const priest = findpriest(roomno, map);
    if (priest) {
        // tended temple
        record_achievement(/* ACH_TMPL */ null, player);

        const epri_p = priest.epri;
        const shrined = has_shrine(priest, map);
        const sanctum = (priest.mndx === PM_HIGH_CLERIC || (priest.data || priest.type) === mons[PM_HIGH_CLERIC])
            && (Is_sanctum(map) || In_endgame(map));
        const can_speak = !monHelpless(priest);
        const moves = player.turns || 0;

        if (can_speak && !player.deaf && moves >= (epri_p.intone_time || 0)) {
            const save_priest = priest.ispriest;
            // don't reveal altar owner upon entry in endgame
            if (sanctum && !player.hallucinating) {
                priest.ispriest = false;
            }
            // C ref: priest.c:434 — Monnam() → x_monnam → priestname for priests.
            // JS Monnam doesn't integrate priestname, so call it directly.
            // Capitalize first letter to match Monnam behavior.
            let seer;
            if (canseemon(priest, player, fov)) {
                const pn = priestname(priest, ARTICLE_THE, false, player);
                seer = pn.charAt(0).toUpperCase() + pn.slice(1);
            } else {
                seer = "A nearby voice";
            }
            await pline("%s intones:", seer);
            priest.ispriest = save_priest;
            epri_p.intone_time = moves + c_d(10, 500);
            // make sure entry message not suppressed
            epri_p.enter_time = 0;
        }

        let msg1 = null, msg2 = null;
        if (sanctum && Is_sanctum(map)) {
            if (priest.mpeaceful) {
                msg1 = "Infidel, you have entered Moloch's Sanctum!";
                msg2 = "Be gone!";
                priest.mpeaceful = false;
                set_malign(priest, player);
            } else {
                msg1 = "You desecrate this place by your presence!";
            }
        } else if (moves >= (epri_p.enter_time || 0)) {
            msg1 = `Pilgrim, you enter a ${!shrined ? "desecrated" : "sacred"} place!`;
        }

        if (msg1 && can_speak && !player.deaf) {
            // C: SetVoice(priest, 0, 80, 0) — cosmetic, skip
            await verbalize(msg1);
            if (msg2) await verbalize(msg2);
            epri_p.enter_time = moves + c_d(10, 100);
        }

        if (!sanctum) {
            let feedback_msg, feedback_arg;
            let this_time_key, other_time_key;
            if (!shrined || !p_coaligned(priest, player)
                || (player.alignmentRecord || 0) <= ALGN_SINNED) {
                feedback_msg = "have a%s forbidding feeling...";
                feedback_arg = (!shrined || !p_coaligned(priest, player)) ? "" : " strange";
                this_time_key = 'hostile_time';
                other_time_key = 'peaceful_time';
            } else {
                feedback_msg = "experience %s sense of peace.";
                feedback_arg = ((player.alignmentRecord || 0) >= ALGN_DEVOUT) ? "a" : "an unusual";
                this_time_key = 'peaceful_time';
                other_time_key = 'hostile_time';
            }
            const this_time = epri_p[this_time_key] || 0;
            const other_time = epri_p[other_time_key] || 0;
            if (moves >= this_time || other_time >= this_time) {
                await You(feedback_msg, feedback_arg);
                epri_p[this_time_key] = moves + c_d(10, 20);
                if (epri_p[this_time_key] <= epri_p[other_time_key]) {
                    epri_p[other_time_key] = epri_p[this_time_key] - 1;
                }
            }
        }
        mapseen_temple(priest);
    } else {
        // untended temple
        switch (rn2(4)) {
        case 0:
            await You("have an eerie feeling...");
            break;
        case 1:
            await You_feel("like you are being watched.");
            break;
        case 2:
            await pline("A shiver runs down your %s.", body_part(SPINE));
            break;
        default:
            break; // no message
        }
        if (!rn2(5)) {
            const depth = map.depth || 1;
            const mtmp = makemon(mons[PM_GHOST], player.x, player.y, MM_NOMSG, depth, map);
            if (mtmp) {
                // C: ngen = mvitals[PM_GHOST].born — we approximate
                const ngen = (map.mvitals && map.mvitals[PM_GHOST])
                    ? (map.mvitals[PM_GHOST].born || 0) : 0;
                const canspot = canseemon(mtmp, player, fov);
                if (canspot) {
                    await pline("A%s ghost appears next to you%c",
                          ngen < 5 ? "n enormous" : "",
                          ngen < 10 ? '!' : '.');
                } else {
                    await You("sense a presence close by!");
                }
                mtmp.mpeaceful = false;
                set_malign(mtmp, player);
                if (player.verbose !== false) {
                    await You("are frightened to death, and unable to move.");
                }
                nomul(-3, _gstate);
                // C: multi_reason = "being terrified of a ghost"
                // C: nomovemsg = "You regain your composure."
            }
        }
    }
}

// ============================================================================
// forget_temple_entry — cf. priest.c:545
// Reset the move counters used to limit temple entry feedback.
// ============================================================================
export function forget_temple_entry(priest) {
    if (!priest || !priest.ispriest || !priest.epri) {
        // impossible("attempting to manipulate shrine data for non-priest?");
        return;
    }
    const epri_p = priest.epri;
    epri_p.intone_time = 0;
    epri_p.enter_time = 0;
    epri_p.peaceful_time = 0;
    epri_p.hostile_time = 0;
}

// ============================================================================
// priest_talk — cf. priest.c:558
// Handles donation/blessing interaction with a priest.
// ============================================================================
export async function priest_talk(priest, map, player, display) {
    const coaligned = p_coaligned(priest, player);
    const strayed = (player.alignmentRecord || 0) < 0;

    // KMH, conduct
    if (!player.uconduct) player.uconduct = {};
    if (!player.uconduct.gnostic) player.uconduct.gnostic = 0;
    if (!player.uconduct.gnostic++) {
        livelog_printf("rejected atheism by consulting with %s", mon_nam(priest));
    }

    if (priest.mflee || (!priest.ispriest && coaligned && strayed)) {
        await pline("%s doesn't want anything to do with you!", Monnam(priest));
        priest.mpeaceful = false;
        return;
    }

    // priests don't chat unless peaceful and in their own temple
    if (!inhistemple(priest, map) || !priest.mpeaceful || monHelpless(priest)) {
        const cranky_msg = [
            "Thou wouldst have words, eh?  I'll give thee a word or two!",
            "Talk?  Here is what I have to say!",
            "Pilgrim, I would speak no longer with thee.",
        ];

        if (monHelpless(priest)) {
            await pline("%s breaks out of %s reverie!", Monnam(priest),
                  priest.female ? "her" : "his");
            priest.mfrozen = 0;
            priest.msleeping = false;
            priest.sleeping = false;
            priest.mcanmove = true;
        }
        priest.mpeaceful = false;
        await verbalize(cranky_msg[rn2(3)]);
        return;
    }

    // desecrated temple
    if (priest.mpeaceful
        && in_rooms(priest.mx, priest.my, TEMPLE, map)
        && !has_shrine(priest, map)) {
        await verbalize("Begone!  Thou desecratest this holy place with thy presence.");
        priest.mpeaceful = false;
        return;
    }

    const playerMoney = money_cnt(player.inventory || player.invent);
    if (!playerMoney) {
        if (coaligned && !strayed) {
            const pmoney = money_cnt(priest.minvent || priest.inventory);
            if (pmoney > 0) {
                const bits = player.hallucinating ? "zorkmids"
                    : (pmoney === 1) ? "bit" : "bits";
                await pline("%s gives you %s%s for an ale.", Monnam(priest),
                      (pmoney === 1) ? "one " : "two ", bits);
                // C: money2u(priest, pmoney > 1 ? 2 : 1) — simplified
            } else {
                await pline("%s preaches the virtues of poverty.", Monnam(priest));
            }
            await exercise(player, A_WIS, true);
        } else {
            await pline("%s is not interested.", Monnam(priest));
        }
        return;
    } else {
        await pline("%s asks you for a contribution for the temple.",
              Monnam(priest));
        const offer = bribe(priest, map, player, display);
        if (offer === 0) {
            await verbalize("Thou shalt regret thine action!");
            if (coaligned) adjalign(player, -1);
        } else if (offer < ((player.ulevel || 1) * 200)) {
            if (playerMoney > (offer * 2)) {
                await verbalize("Cheapskate.");
            } else {
                await verbalize("I thank thee for thy contribution.");
                await exercise(player, A_WIS, true);
            }
        } else if (offer < ((player.ulevel || 1) * 400)) {
            await verbalize("Thou art indeed a pious individual.");
            if (playerMoney < (offer * 2)) {
                if (coaligned && (player.alignmentRecord || 0) <= ALGN_SINNED) {
                    adjalign(player, 1);
                }
                await verbalize("I bestow upon thee a blessing.");
                // C: incr_itimeout(&HClairvoyant, rn1(500, 500))
                // Simplified: player.clairvoyant timeout
                if (!player.clairvoyantTimeout) player.clairvoyantTimeout = 0;
                player.clairvoyantTimeout += rn1(500, 500);
            }
        } else if (offer < ((player.ulevel || 1) * 600)
                   && (!player.hasProp(PROTECTION)
                       || ((player.ublessed || 0) < 20
                           && ((player.ublessed || 0) < 9 || !rn2(player.ublessed || 1))))) {
            await verbalize("Thou hast been rewarded for thy devotion.");
            if (!player.hasProp(PROTECTION)) {
                player.ensureUProp(PROTECTION).intrinsic |= FROMOUTSIDE;
                if (!player.ublessed) player.ublessed = rn1(3, 2);
            } else {
                player.ublessed = (player.ublessed || 0) + 1;
            }
        } else {
            await verbalize("Thy selfless generosity is deeply appreciated.");
            if (playerMoney < (offer * 2) && coaligned) {
                const moves = player.turns || 0;
                if (strayed && (moves - (player.ucleansed || 0)) > 5000) {
                    player.alignmentRecord = 0;
                    player.ucleansed = moves;
                } else {
                    adjalign(player, 2);
                }
            }
        }
    }
}

// ============================================================================
// mk_roamer — cf. priest.c:688
// Creates an aligned cleric or angel minion at (x,y) with given alignment.
// ============================================================================
export async function mk_roamer(ptr, alignment, x, y, peaceful, depth, map, player) {
    const coaligned = ((player ? player.alignment : 0) || 0) === alignment;

    if (map && map.monsterAt && map.monsterAt(x, y)) {
        const existing = map.monsterAt(x, y);
        if (existing) await rloc(existing, RLOC_NOMSG, map, player);
    }

    const roamer = makemon(ptr, x, y, MM_ADJACENTOK | MM_EMIN | MM_NOMSG, depth, map);
    if (!roamer) return null;

    newemin(roamer);
    roamer.emin.min_align = alignment;
    roamer.emin.renegade = coaligned && !peaceful;
    roamer.ispriest = false;
    roamer.isminion = true;
    if (mon_learns_traps) mon_learns_traps(roamer, ALL_TRAPS);
    roamer.mpeaceful = peaceful;
    roamer.msleeping = false;
    roamer.sleeping = false;
    set_malign(roamer, player);

    return roamer;
}

// ============================================================================
// reset_hostility — cf. priest.c:719
// Re-evaluates roamer's hostility based on alignment mismatch with player.
// ============================================================================
export function reset_hostility(roamer, map, player) {
    if (!roamer.isminion) return;
    if (!roamer.emin) return;
    const mndx = roamer.mndx !== undefined ? roamer.mndx
        : (roamer.type ? mons.indexOf(roamer.type) : -1);
    if (mndx !== PM_ALIGNED_CLERIC && mndx !== PM_ANGEL) return;

    if (roamer.emin.min_align !== (player.alignment || 0)) {
        roamer.mpeaceful = false;
        roamer.mtame = 0;
        set_malign(roamer, player);
    }
    newsym(roamer.mx, roamer.my);
}

// ============================================================================
// in_your_sanctuary — cf. priest.c:735
// Returns true if (x,y) is in a temple where player is welcome (co-aligned).
// ============================================================================
export function in_your_sanctuary(mon, x, y, map, player) {
    if (mon) {
        const ptr = mon.type || mon.data || {};
        if (is_minion(ptr) || is_rider(ptr)) return false;
        x = mon.mx;
        y = mon.my;
    }
    if ((player.alignmentRecord || 0) <= ALGN_SINNED) return false;

    const roomno = temple_occupied(player.urooms || '', map);
    if (!roomno) return false;
    const roomsAtXY = in_rooms(x, y, TEMPLE, map);
    if (!roomsAtXY) return false;
    let found = false;
    for (let i = 0; i < roomsAtXY.length; i++) {
        const room = (typeof roomsAtXY === 'string') ? roomsAtXY.charCodeAt(i) : roomsAtXY[i];
        if (room === roomno) { found = true; break; }
    }
    if (!found) return false;

    const priest = findpriest(roomno, map);
    if (!priest) return false;
    return has_shrine(priest, map) && p_coaligned(priest, player) && priest.mpeaceful;
}

// ============================================================================
// ghod_hitsu — cf. priest.c:760
// Delivers divine punishment when player attacks a coaligned priest in temple.
// ============================================================================
export async function ghod_hitsu(priest, map, player) {
    const roomno = temple_occupied(player.urooms || '', map);
    if (!roomno || !has_shrine(priest, map)) return;

    const ax = priest.epri.shrpos.x;
    const ay = priest.epri.shrpos.y;
    let x = ax, y = ay;
    const troom = map.rooms[roomno - ROOMOFFSET];
    if (!troom) return;

    if ((player.x === x && player.y === y) || !linedup(player.x, player.y, x, y)) {
        const loc = map.at(player.x, player.y);
        if (loc && IS_DOOR(loc.typ)) {
            if (player.x === troom.lx - 1) {
                x = troom.hx;
                y = player.y;
            } else if (player.x === troom.hx + 1) {
                x = troom.lx;
                y = player.y;
            } else if (player.y === troom.ly - 1) {
                x = player.x;
                y = troom.hy;
            } else if (player.y === troom.hy + 1) {
                x = player.x;
                y = troom.ly;
            }
        } else {
            switch (rn2(4)) {
            case 0:
                x = player.x;
                y = troom.ly;
                break;
            case 1:
                x = player.x;
                y = troom.hy;
                break;
            case 2:
                x = troom.lx;
                y = player.y;
                break;
            default:
                x = troom.hx;
                y = player.y;
                break;
            }
        }
        if (!linedup(player.x, player.y, x, y)) return;
    }

    // Compute tbx, tby for buzz direction
    const tbx = player.x - x;
    const tby = player.y - y;

    switch (rn2(3)) {
    case 0:
        await pline("%s roars in anger:  \"Thou shalt suffer!\"",
              a_gname_at(ax, ay, player, map));
        break;
    case 1:
        await pline("%s voice booms:  \"How darest thou harm my servant!\"",
              s_suffix(a_gname_at(ax, ay, player, map)));
        break;
    default:
        await pline("%s roars:  \"Thou dost profane my shrine!\"",
              a_gname_at(ax, ay, player, map));
        break;
    }

    // bolt of lightning cast by unspecified monster
    await buzz(BZ_M_SPELL_ELEC, 6, x, y, sgn(tbx), sgn(tby), map, player);
    await exercise(player, A_WIS, false);
}

// ============================================================================
// angry_priest — cf. priest.c:841
// Called when player desecrates shrine; priest becomes hostile roaming minion.
// ============================================================================
export function angry_priest(map, player) {
    const roomno = temple_occupied(player.urooms || '', map);
    const priest = roomno ? findpriest(roomno, map) : null;
    if (priest) {
        const eprip = priest.epri;
        wakeup(priest, false, map, player);
        setmangry(priest, false, map, player);

        // Check if altar has been destroyed or converted
        const loc = map.at(eprip.shrpos.x, eprip.shrpos.y);
        if (!loc || !IS_ALTAR(loc.typ)
            || (Amask2align(loc.flags & AM_MASK) !== eprip.shralign)) {
            // Convert priest to roaming minion
            newemin(priest);
            const oldAlign = eprip.shralign;
            priest.ispriest = false;
            priest.isminion = true;
            priest.emin.min_align = oldAlign;
            priest.emin.renegade = false;
            free_epri(priest);
        }
    }
}

// ============================================================================
// clearpriests — cf. priest.c:883
// Remove priests not on their home shrine level (bones file cleanup).
// ============================================================================
export function clearpriests(map) {
    if (!map || !map.monsters) return;
    for (const mtmp of [...map.monsters]) {
        if (mtmp.dead) continue;
        if (mtmp.ispriest && mtmp.epri && mtmp.epri.shrlevel) {
            // C: !on_level(&(EPRI(mtmp)->shrlevel), &u.uz)
            // In JS, if shrlevel doesn't match current map depth, remove
            if (mtmp.epri.shrlevel !== (map.depth || 0)) {
                mongone(mtmp, map, null);
            }
        }
    }
}

// ============================================================================
// restpriest — cf. priest.c:897
// Reconnects priest's shrine level reference when loading a bones file.
// ============================================================================
export function restpriest(mtmp, ghostly, map) {
    if ((map.depth || 0) !== 0) {
        if (ghostly && mtmp.epri) {
            mtmp.epri.shrlevel = map.depth || 0;
        }
    }
}
