// music.js -- Musical instruments and their effects
// cf. music.c — awaken_scare, awaken_monsters, put_monsters_to_sleep,
//               charm_snakes, calm_nymphs, awaken_soldiers,
//               charm_monsters, do_pit, do_earthquake, generic_lvl_desc,
//               do_improvisation, improvised_notes, do_play_instrument,
//               obj_to_instr
//
// music.c handles instrument playing and its effects on the dungeon:
//   do_play_instrument(): main instrument play handler.
//   do_improvisation(): generate and play improvised notes.
//   awaken_monsters(): wake monsters when noise is made.
//   charm_monsters(): attempt to tame monsters with music.
//   awaken_soldiers(): wake all soldiers when bugle is played.
//   do_earthquake(): create multiple pits from instrument use.

import { rn2, rnd, rn1, d, rnl } from './rng.js';
import { exercise } from './attrib_exercise.js';
import { incr_itimeout } from './potion.js';
import { acurr as ACURR } from './attrib.js';
import { pline, pline_The, You, Your, You_hear, You_feel, You_cant,
         Norep, impossible } from './pline.js';
import { Monnam, mon_nam, a_monnam, x_monnam, Amonnam } from './do_name.js';
import { SUPPRESS_SADDLE } from './const.js';
import { Role_if } from './role.js';
import { Tobjnam, yname, Yname2, xname, thesimpleoname, an, the } from './objnam.js';
import { unique_corpstat, is_mindless, canseemon, is_mercenary,
         is_flyer, is_clinger, is_humanoid, slithy, nolimbs,
         ceiling_hider, can_blow, DEADMONSTER, mdistu, M_AP_TYPE } from './mondata.js';
import { mons, PM_GUARD, S_SNAKE, S_NYMPH, PM_ARCHEOLOGIST } from './monsters.js';
import { onscary, wakeup, seemimic, xkilled } from './mon.js';
import { monflee } from './monmove.js';
import { resist } from './zap.js';
import { sleep_monst, slept_monst } from './mhitm.js';
import { newsym } from './display.js';
import { dist2, highc, mungspaces, plur, ROLL_FROM } from './hacklib.js';
import { consume_obj_charge, sobj_at } from './invent.js';
import { selftouch, mselftouch, t_at, m_at } from './trap.js';
import { losehp, in_rooms, u_at } from './hack.js';
import { maketrap, In_sokoban, In_V_tower } from './dungeon.js';
import { set_levltyp } from './mkmaze.js';
import { fillholetyp, liquid_flow } from './dig.js';
import { unblock_point, recalc_block_point, cansee } from './vision.js';
import { flooreffects } from './do.js';
import { find_drawbridge, is_drawbridge_wall, open_drawbridge,
         close_drawbridge } from './dbridge.js';
import { cvt_sdoor_to_door } from './detect.js';
import { desecrate_altar, altarmask_at } from './pray.js';
import { add_damage } from './shk.js';
import { align_str } from './insight.js';
import { objectData, TOOL_CLASS, BOULDER,
         WOODEN_FLUTE, MAGIC_FLUTE, TOOLED_HORN, FROST_HORN, FIRE_HORN,
         WOODEN_HARP, MAGIC_HARP, BUGLE, LEATHER_DRUM, DRUM_OF_EARTHQUAKE,
         BELL, BELL_OF_OPENING } from './objects.js';
import { isok, COLNO, ROWNO, PIT, is_pit,
         A_STR, A_DEX, A_CON, A_WIS,
         FOUNTAIN, SINK, ALTAR, GRAVE, THRONE, SCORR, CORR, ROOM,
         SDOOR, DOOR, D_NODOOR,
         AM_MASK, AM_SANCTUM, Amask2align,
         DRAWBRIDGE_DOWN, DRAWBRIDGE_UP, SHOPBASE,
         IS_DRAWBRIDGE, XKILL_NOMSG, TT_NONE, TT_PIT, TT_BURIEDBALL,
         DEAF } from './const.js';
import { getlin, ynFunction } from './input.js';

// ============================================================================
// Local helpers (mirrors of C macros used locally in multiple files)
// ============================================================================

const STRAT_WAITMASK = 0x30000000; // STRAT_CLOSE | STRAT_WAITFORU


function has_mgivenname(mon) {
    if (mon?.mgivenname) return true;
    const species = mon?.data?.mname || mon?.type?.mname || null;
    return !!(mon?.name && species && mon.name !== species);
}

// C: M_AP_TYPE(mtmp) — appearance type constants
const M_AP_NOTHING = 0;
const M_AP_MONSTER = 3; // C: M_AP_MONSTER=3 (2 is M_AP_OBJECT)

// M_AP_TYPE imported from mondata.js


// Maybe_Half_Phys — if player has half physical damage, halve it
function Maybe_Half_Phys(n, player) {
    // Simplified: half physical damage not fully tracked in JS yet
    return n;
}


// Autotranslated from music.c:44 — awaken_scare(mtmp, scary)
// Wake up monster, possibly scare it.
export async function awaken_scare(mtmp, scary) {
    mtmp.msleeping = 0;
    mtmp.mcanmove = 1;
    mtmp.mfrozen = 0;
    /* may scare some monsters -- waiting monsters excluded */
    if (!unique_corpstat(mtmp.data || mtmp.type)
        && ((mtmp.mstrategy || 0) & STRAT_WAITMASK) !== 0) {
        mtmp.mstrategy = (mtmp.mstrategy || 0) & ~STRAT_WAITMASK;
    } else if (scary
               && !is_mindless(mtmp.data || mtmp.type)
               && !resist(mtmp, TOOL_CLASS, 0)
               && onscary(null, 0, 0, mtmp)) {
        await monflee(mtmp, 0, false, true);
    }
}

// Autotranslated from music.c:66 — awaken_monsters(distance)
// Wake every monster in range.
export async function awaken_monsters(distance, map, player) {
    for (const mtmp of (map.monsters || [])) {
        if (DEADMONSTER(mtmp)) continue;
        const distm = mdistu(mtmp, player);
        if (distm < distance)
            await awaken_scare(mtmp, (distm < Math.floor(distance / 3)));
    }
}

// Autotranslated from music.c:84 — put_monsters_to_sleep(distance)
// Make monsters fall asleep. Note that they may resist the spell.
export function put_monsters_to_sleep(distance, map, player) {
    for (const mtmp of (map.monsters || [])) {
        if (DEADMONSTER(mtmp)) continue;
        if (mdistu(mtmp, player) < distance
            && sleep_monst(mtmp, d(10, 10), TOOL_CLASS)) {
            mtmp.msleeping = 1; /* 10d10 turns + wake_nearby to rouse */
            slept_monst(mtmp);
        }
    }
}

// Autotranslated from music.c:104 — charm_snakes(distance)
// Charm snakes in range. Note that the snakes are NOT tamed.
export async function charm_snakes(distance, map, player, fov) {
    for (const mtmp of (map.monsters || [])) {
        if (DEADMONSTER(mtmp)) continue;
        const ptr = mtmp.data || mtmp.type;
        if (ptr && ptr.mlet === S_SNAKE && mtmp.mcanmove
            && mdistu(mtmp, player) < distance) {
            const was_peaceful = mtmp.mpeaceful;
            mtmp.mpeaceful = 1;
            mtmp.mavenge = 0;
            mtmp.mstrategy = (mtmp.mstrategy || 0) & ~STRAT_WAITMASK;
            const could_see_mon = canseemon(mtmp, player, fov);
            mtmp.mundetected = 0;
            newsym(mtmp.mx, mtmp.my);
            if (canseemon(mtmp, player, fov)) {
                if (!could_see_mon)
                    await You(`notice ${a_monnam(mtmp)}, swaying with the music.`);
                else
                    await pline(`${Monnam(mtmp)} freezes, then sways with the music${was_peaceful ? '' : ', and now seems quieter'}.`);
            }
        }
    }
}

// Autotranslated from music.c:138 — calm_nymphs(distance)
// Calm nymphs in range.
export async function calm_nymphs(distance, map, player, fov) {
    for (const mtmp of (map.monsters || [])) {
        if (DEADMONSTER(mtmp)) continue;
        const ptr = mtmp.data || mtmp.type;
        if (ptr && ptr.mlet === S_NYMPH && mtmp.mcanmove
            && mdistu(mtmp, player) < distance) {
            mtmp.msleeping = 0;
            mtmp.mpeaceful = 1;
            mtmp.mavenge = 0;
            mtmp.mstrategy = (mtmp.mstrategy || 0) & ~STRAT_WAITMASK;
            if (canseemon(mtmp, player, fov))
                await pline(`${Monnam(mtmp)} listens cheerfully to the music, then seems quieter.`);
        }
    }
}

// Autotranslated from music.c:161 — awaken_soldiers(bugler)
// Awake soldiers anywhere the level (and any nearby monster).
export async function awaken_soldiers(bugler, map, player, fov) {
    const isHero = (bugler === player || bugler === 'player');
    /* distance of affected non-soldier monsters to bugler */
    const distance = (isHero
        ? (player.ulevel || 1)
        : ((bugler.data || bugler.type || {}).mlevel || 0)) * 30;

    for (const mtmp of (map.monsters || [])) {
        if (DEADMONSTER(mtmp)) continue;
        const ptr = mtmp.data || mtmp.type;
        if (is_mercenary(ptr) && ptr !== mons[PM_GUARD]) {
            if (!mtmp.mtame)
                mtmp.mpeaceful = 0;
            mtmp.msleeping = 0;
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
            mtmp.mstrategy = (mtmp.mstrategy || 0) & ~STRAT_WAITMASK;
            if (canseemon(mtmp, player, fov))
                await pline(`${Monnam(mtmp)} is now ready for battle!`);
            else if (!player.Deaf)
                await Norep('You hear the rattle of battle gear being readied.');
        } else {
            const distm = isHero
                ? mdistu(mtmp, player)
                : dist2(bugler.mx, bugler.my, mtmp.mx, mtmp.my);
            if (distm < distance)
                await awaken_scare(mtmp, (distm < Math.floor(distance / 3)));
        }
    }
}

// Autotranslated from music.c:195 — charm_monsters(distance)
// Charm monsters in range. Note that they may resist the spell.
export function charm_monsters(distance, map, player) {
    if (player.uswallow)
        distance = 0; /* only ustuck affected */

    const monstersCopy = [...(map.monsters || [])];
    for (const mtmp of monstersCopy) {
        if (DEADMONSTER(mtmp)) continue;
        if (mdistu(mtmp, player) <= distance) {
            /* a shopkeeper can't be tamed but tamedog() pacifies an angry one */
            if (!resist(mtmp, TOOL_CLASS, 0) || mtmp.isshk) {
                /* tamedog(mtmp, null, true) — simplified until tamedog is ported */
                if (!mtmp.isshk) {
                    mtmp.mtame = 10;
                    mtmp.mpeaceful = 1;
                } else {
                    mtmp.mpeaceful = 1;
                }
                mtmp.mavenge = 0;
            }
        }
    }
}

// ============================================================================
// cf. music.c:220 — do_pit(x, y, tu_pit)
// Try to make a pit.
// ============================================================================

async function do_pit(x, y, tu_pit, map, player, fov) {
    const chasm = maketrap(map, x, y, PIT);
    if (!chasm) return; // no pit if portal at that location
    chasm.tseen = 1;

    let mtmp = m_at(x, y, map);
    const otmp = sobj_at(BOULDER, x, y, map);
    if (otmp) {
        if (cansee(map, player, fov, x, y))
            await pline(`KADOOM!  The boulder falls into a chasm${u_at(player, x, y) ? ' below you' : ''}!`);
        if (mtmp)
            mtmp.mtrapped = 0;
        // obj_extract_self(otmp) — remove from floor
        if (map.removeObject) map.removeObject(otmp);
        await flooreffects(otmp, x, y, '', player, map);
        return;
    }

    // Let liquid flow into the newly created chasm.
    const filltype = fillholetyp(x, y, false, map);
    const loc = map.at(x, y);
    if (filltype !== ROOM && loc) {
        set_levltyp(map, x, y, filltype);
        liquid_flow(x, y, filltype, chasm, null, map);
        // liquid_flow() deletes trap, might kill mtmp
        if (!t_at(x, y, map))
            return;
    }

    // We have to check whether monsters or hero falls into a new pit
    if (mtmp) {
        const ptr = mtmp.data || mtmp.type;
        if (!is_flyer(ptr) && !is_clinger(ptr)) {
            const m_already_trapped = mtmp.mtrapped;
            mtmp.mtrapped = 1;
            if (!m_already_trapped) { // suppress messages
                if (cansee(map, player, fov, x, y)) {
                    await pline(`${Monnam(mtmp)} falls into a chasm!`);
                } else if (is_humanoid(ptr)) {
                    await You_hear('a scream!');
                }
            }
            // Falling is okay for falling down within a pit from jostling too
            mselftouch(mtmp, 'Falling, ', true);
            if (!DEADMONSTER(mtmp)) {
                mtmp.mhp -= rnd(m_already_trapped ? 4 : 6);
                if (DEADMONSTER(mtmp)) {
                    if (!cansee(map, player, fov, x, y)) {
                        await pline('It is destroyed!');
                    } else {
                        await You(`destroy ${
                            mtmp.mtame
                            ? x_monnam(mtmp, 2/*ARTICLE_THE*/, 'poor',
                                       has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0,
                                       false)
                            : mon_nam(mtmp)}!`);
                    }
                    xkilled(mtmp, XKILL_NOMSG, map, player);
                }
            }
        }
    } else if (u_at(player, x, y)) {
        if (player.utrap && player.utraptype === TT_BURIEDBALL) {
            await Your('chain breaks!');
            // reset_utrap(TRUE)
            player.utrap = 0;
            player.utraptype = TT_NONE;
        }
        if (player.levitating || player.flying || is_clinger(player.data || player.monsterType || {})) {
            if (!tu_pit) { // no pit here previously
                await pline('A chasm opens up under you!');
                await You("don't fall in!");
            }
        } else if (!tu_pit || !player.utrap || player.utraptype !== TT_PIT) {
            // no pit here previously, or you were not in it even if there was
            await You('fall into a chasm!');
            // set_utrap(rn1(6, 2), TT_PIT)
            player.utrap = rn1(6, 2);
            player.utraptype = TT_PIT;
            await losehp(Maybe_Half_Phys(rnd(6), player),
                   'fell into a chasm', 2/*NO_KILLER_PREFIX*/, player);
            selftouch('Falling, you', player);
        } else if (player.utrap && player.utraptype === TT_PIT) {
            const keepfooting =
                (!(player.fumbling && rn2(5))
                 && (!(rnl(Role_if(player, PM_ARCHEOLOGIST) ? 3 : 9))
                     || ((ACURR(player, A_DEX) > 7) && rn2(5))));
            await You('are jostled around violently!');
            // set_utrap(rn1(6, 2), TT_PIT)
            player.utrap = rn1(6, 2);
            player.utraptype = TT_PIT;
            await losehp(Maybe_Half_Phys(rnd(keepfooting ? 2 : 4), player),
                   'hurt in a chasm', 2/*NO_KILLER_PREFIX*/, player);
            if (keepfooting)
                await exercise(player, A_DEX, true);
            else {
                const udata = player.data || player.monsterType || {};
                selftouch((player.Upolyd && (slithy(udata) || nolimbs(udata)))
                    ? 'Shaken, you'
                    : 'Falling down, you', player);
            }
        }
    } else {
        newsym(x, y);
    }
}

// ============================================================================
// cf. music.c:343 — do_earthquake(force)
// Generate earthquake of desired force. Create random chasms (pits).
// ============================================================================

async function do_earthquake(force, map, player, fov) {
    const into_a_chasm = ' into a chasm';
    const trap_at_u = t_at(player.x, player.y, map);
    let tu_pit = 0;

    if (trap_at_u)
        tu_pit = is_pit(trap_at_u.ttyp) ? 1 : 0;
    if (force > 13) force = 13; // sanity precaution
    let start_x = player.x - (force * 2);
    let start_y = player.y - (force * 2);
    let end_x = player.x + (force * 2);
    let end_y = player.y + (force * 2);
    start_x = Math.max(start_x, 1);
    start_y = Math.max(start_y, 0);
    end_x = Math.min(end_x, COLNO - 1);
    end_y = Math.min(end_y, ROWNO - 1);

    for (let x = start_x; x <= end_x; x++) {
        for (let y = start_y; y <= end_y; y++) {
            const mtmp = m_at(x, y, map);
            if (mtmp) {
                wakeup(mtmp, true, map, player); // peaceful monster will become hostile
                if (mtmp.mundetected) {
                    mtmp.mundetected = 0;
                    newsym(x, y);
                    const ptr = mtmp.data || mtmp.type;
                    if (ceiling_hider(ptr)) {
                        if (cansee(map, player, fov, x, y)) {
                            await pline(`${Amonnam(mtmp)} is shaken loose from the ceiling!`);
                        } else if (!is_flyer(ptr)) {
                            await You_hear('a thump.');
                        }
                    }
                }
                if (M_AP_TYPE(mtmp) !== M_AP_NOTHING
                    && M_AP_TYPE(mtmp) !== M_AP_MONSTER)
                    seemimic(mtmp, map);
            }
            if (rn2(14 - force))
                continue;

            const loc = map.at(x, y);
            if (!loc) continue;

            switch (loc.typ) {
            case FOUNTAIN: // make the fountain disappear
                if (cansee(map, player, fov, x, y))
                    await pline_The(`fountain falls${into_a_chasm}.`);
                await do_pit(x, y, tu_pit, map, player, fov);
                break;
            case SINK:
                if (cansee(map, player, fov, x, y))
                    await pline_The(`kitchen sink falls${into_a_chasm}.`);
                await do_pit(x, y, tu_pit, map, player, fov);
                break;
            case ALTAR: {
                const amsk = altarmask_at(x, y, map);
                // always preserve the high altars
                if ((amsk & AM_SANCTUM) !== 0)
                    break;
                const algn = Amask2align(amsk & AM_MASK);
                if (cansee(map, player, fov, x, y))
                    await pline_The(`${align_str(algn)} altar falls${into_a_chasm}.`);
                await desecrate_altar(false, algn, player, map);
                await do_pit(x, y, tu_pit, map, player, fov);
                break;
            }
            case GRAVE:
                if (cansee(map, player, fov, x, y))
                    await pline_The(`headstone topples${into_a_chasm}.`);
                await do_pit(x, y, tu_pit, map, player, fov);
                break;
            case THRONE:
                if (cansee(map, player, fov, x, y))
                    await pline_The(`throne falls${into_a_chasm}.`);
                await do_pit(x, y, tu_pit, map, player, fov);
                break;
            case SCORR:
                loc.typ = CORR;
                unblock_point(x, y);
                if (cansee(map, player, fov, x, y))
                    await pline('A secret corridor is revealed.');
                // FALLTHROUGH
                await do_pit(x, y, tu_pit, map, player, fov);
                break;
            case CORR:
            case ROOM:
                await do_pit(x, y, tu_pit, map, player, fov);
                break;
            case SDOOR:
                cvt_sdoor_to_door(loc); // .typ = DOOR
                if (cansee(map, player, fov, x, y))
                    await pline('A secret door is revealed.');
                // FALLTHROUGH
                // falls through to DOOR case
            case DOOR: // make the door collapse
                // if already doorless, treat like room or corridor
                /* Use ?? not || since D_NODOOR=0 is falsy */
                if ((loc.flags ?? 0) === D_NODOOR) {
                    await do_pit(x, y, tu_pit, map, player, fov);
                    break;
                }
                // wasn't doorless, now it will be
                loc.flags = D_NODOOR;
                recalc_block_point(x, y);
                newsym(x, y); // before pline
                if (cansee(map, player, fov, x, y))
                    await pline_The('door collapses.');
                if (in_rooms(x, y, SHOPBASE, map).length > 0)
                    add_damage(x, y, 0, map);
                break;
            }
        }
    }
}

// Autotranslated from music.c:477 — generic_lvl_desc()
// Returns a generic description of the current level type for messages.
export function generic_lvl_desc(map) {
    /* Is_astralevel, Is_sanctum, In_endgame not yet ported */
    if (In_sokoban && map && In_sokoban(map.uz || map))
        return 'puzzle';
    if (In_V_tower && map && In_V_tower(map.uz || map))
        return 'tower';
    return 'dungeon';
}

// Autotranslated from music.c:494 — beats table

const beats = [
    'stepper', 'one drop', 'slow two', 'triple stroke roll',
    'double shuffle', 'half-time shuffle', 'second line', 'train',
];

// Autotranslated from music.c:732 — improvised_notes(same_as_last_time)
// Creates a random note sequence or returns the previous sequence if unchanged.

// Module-level state for the jingle context (C: svc.context.jingle[6])
let _jingle = '';
export function improvised_notes(player) {
    const notes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    let same_as_last_time = false;

    /* You can change your tune, usually */
    const unchanging = player.Unchanging || false;
    if (!(unchanging && _jingle.length > 0)) {
        const notecount = rnd(5); /* rnd(SIZE(jingle) - 1) where jingle is char[6], so 1-5 */
        let result = '';
        for (let i = 0; i < notecount; ++i) {
            result += ROLL_FROM(notes);
        }
        _jingle = result;
        same_as_last_time = false;
    } else {
        same_as_last_time = true;
    }
    return { notes: _jingle, same_as_last_time };
}

// ============================================================================
// cf. music.c:502 — do_improvisation(instr)
// The player is trying to extract something from his/her instrument.
// ============================================================================

async function do_improvisation(instr, player, map, display, fov) {
    const do_spec_base = !(player.Stunned || player.Confusion);
    let do_spec = do_spec_base;

    // itmp = copy of instr, possibly downgraded to mundane
    let itmp_otyp = instr.otyp;
    let mundane = false;

    // if won't yield special effect, make sound of mundane counterpart
    if (!do_spec || (instr.spe || 0) <= 0) {
        while (objectData[itmp_otyp] && objectData[itmp_otyp].magic) {
            itmp_otyp -= 1;
            mundane = true;
        }
    }

    const PLAY_NORMAL   = 0x00;
    const PLAY_STUNNED  = 0x01;
    const PLAY_CONFUSED = 0x02;
    const PLAY_HALLU    = 0x04;

    let mode = PLAY_NORMAL;
    if (player.Stunned) mode |= PLAY_STUNNED;
    if (player.Confusion) mode |= PLAY_CONFUSED;
    if (player.Hallucination) mode |= PLAY_HALLU;

    if (!rn2(2)) {
        // for multiple impairments, don't always give the generic message
        if (mode === (PLAY_STUNNED | PLAY_CONFUSED))
            mode = !rn2(2) ? PLAY_STUNNED : PLAY_CONFUSED;
        if (mode & PLAY_HALLU)
            mode = PLAY_HALLU;
    }

    switch (mode) {
    case PLAY_NORMAL:
        await You(`start playing ${yname(instr)}.`);
        break;
    case PLAY_STUNNED:
        if (!player.Deaf)
            await You('radiate an obnoxious droning sound.');
        else
            await You_feel('a monotonous vibration.');
        break;
    case PLAY_CONFUSED:
        if (!player.Deaf)
            await You('generate a raucous noise.');
        else
            await You_feel('a jarring vibration.');
        break;
    case PLAY_HALLU:
        await You('disseminate a kaleidoscopic display of floating butterflies.');
        break;
    case PLAY_STUNNED | PLAY_CONFUSED:
    case PLAY_STUNNED | PLAY_HALLU:
    case PLAY_CONFUSED | PLAY_HALLU:
    case PLAY_STUNNED | PLAY_CONFUSED | PLAY_HALLU:
    default:
        await pline('What you perform is quite far from music...');
        break;
    }

    const { notes: improvisation, same_as_last_time: same_old_song } = improvised_notes(player);

    const ulevel = player.ulevel || 1;

    switch (itmp_otyp) { // note: itmp_otyp might differ from instr.otyp
    case MAGIC_FLUTE: // Make monster fall asleep
        consume_obj_charge(instr, true, player);
        await You(`${!player.Deaf ? '' : 'seem to '}produce ${player.Hallucination ? 'piped' : 'soft'}${same_old_song ? ', familiar' : ''} music.`);
        // Hero_playnotes — sound library, no-op in JS
        put_monsters_to_sleep(ulevel * 5, map, player);
        await exercise(player, A_DEX, true);
        break;
    case WOODEN_FLUTE: // May charm snakes
        /* C: do_spec &= (...) — must not short-circuit, rn2() always consumed */
        do_spec = do_spec & (rn2(ACURR(player, A_DEX)) + ulevel > 25);
        if (!player.Deaf)
            await pline(`${Tobjnam(instr, do_spec ? 'trill' : 'toot')}${same_old_song ? ' a familiar tune' : ''}.`);
        else
            await You_feel(`${yname(instr)} ${do_spec ? 'trill' : 'toot'}.`);
        // Hero_playnotes — sound library, no-op in JS
        if (do_spec)
            await charm_snakes(ulevel * 3, map, player, fov);
        await exercise(player, A_DEX, true);
        break;
    case FIRE_HORN:  // Idem wand of fire
    case FROST_HORN: // Idem wand of cold
        consume_obj_charge(instr, true, player);
        // Fire/frost horn zapping requires getdir, zapyourself, ubuzz — not yet ported
        // Simplified: just consume the charge and message
        await pline(`${Tobjnam(instr, 'vibrate')}.`);
        // TODO: music.c:611-638 — fire/frost horn direction, zapyourself, ubuzz
        break;
    case TOOLED_HORN: // Awaken or scare monsters
        if (!player.Deaf)
            await You(`produce a frightful, grave${same_old_song ? ', yet familiar,' : ''} sound.`);
        else
            await You('blow into the horn.');
        // Hero_playnotes — sound library, no-op in JS
        await awaken_monsters(ulevel * 30, map, player);
        await exercise(player, A_WIS, false);
        break;
    case BUGLE: // Awaken & attract soldiers
        if (!player.Deaf)
            await You(`extract a loud${same_old_song ? ', familiar' : ''} noise from ${yname(instr)}.`);
        else
            await You('blow into the bugle.');
        // Hero_playnotes — sound library, no-op in JS
        await awaken_soldiers('player', map, player, fov);
        await exercise(player, A_WIS, false);
        break;
    case MAGIC_HARP: // Charm monsters
        consume_obj_charge(instr, true, player);
        if (!player.Deaf)
            await pline(`${Tobjnam(instr, 'produce')} very attractive${same_old_song ? ' and familiar' : ''} music.`);
        else
            await You_feel('very soothing vibrations.');
        // Hero_playnotes — sound library, no-op in JS
        charm_monsters(Math.floor((ulevel - 1) / 3) + 1, map, player);
        await exercise(player, A_DEX, true);
        break;
    case WOODEN_HARP: // May calm Nymph
        /* C: do_spec &= (...) — must not short-circuit, rn2() always consumed */
        do_spec = do_spec & (rn2(ACURR(player, A_DEX)) + ulevel > 25);
        if (!player.Deaf) {
            const msg = (do_spec && same_old_song)
                ? 'produces a familiar, lilting melody'
                : do_spec ? 'produces a lilting melody'
                : same_old_song ? 'twangs a familiar tune'
                : 'twangs';
            await pline(`${Yname2(instr)} ${msg}.`);
        } else
            await You_feel('soothing vibrations.');
        // Hero_playnotes — sound library, no-op in JS
        if (do_spec)
            await calm_nymphs(ulevel * 3, map, player, fov);
        await exercise(player, A_DEX, true);
        break;
    case DRUM_OF_EARTHQUAKE: // create several pits
        consume_obj_charge(instr, true, player);
        await You('produce a heavy, thunderous rolling!');
        // Hero_playnotes — sound library, no-op in JS
        await pline_The(`entire ${generic_lvl_desc(map)} is shaking around you!`);
        await do_earthquake(Math.floor((ulevel - 1) / 3) + 1, map, player, fov);
        // shake up monsters in a much larger radius...
        await awaken_monsters(ROWNO * COLNO, map, player);
        // makeknown(DRUM_OF_EARTHQUAKE) — discovery not fully tracked
        break;
    case LEATHER_DRUM: // Awaken monsters
        if (!mundane) {
            if (!player.Deaf) {
                await You(`beat a ${same_old_song ? 'familiar ' : ''}deafening row!`);
                // Hero_playnotes — sound library, no-op in JS
                // incr_itimeout(&HDeaf, rn1(20, 30)) — deafness timeout
                incr_itimeout(player, DEAF, rn1(20, 30));
            } else {
                await You('pound on the drum.');
            }
            await exercise(player, A_WIS, false);
        } else {
            await You(`${rn2(2) ? 'butcher' : rn2(2) ? 'manage' : 'pull off'} ${an(ROLL_FROM(beats))}.`);
            // Hero_playnotes — sound library, no-op in JS
        }
        await awaken_monsters(ulevel * (mundane ? 5 : 40), map, player);
        break;
    default:
        impossible(`What a weird instrument (${instr.otyp})!`);
        return 0;
    }
    return 2; // That takes time
}

// ============================================================================
// cf. music.c:758 — do_play_instrument(instr)
// Main function for playing instruments.
// ============================================================================

export async function do_play_instrument(instr, player, map, display, fov) {
    if (player.Underwater) {
        await You_cant('play music underwater!');
        return 0; // ECMD_OK
    }
    const ptr = player.data || player.monsterType || {};
    if ((instr.otyp === WOODEN_FLUTE || instr.otyp === MAGIC_FLUTE
         || instr.otyp === TOOLED_HORN || instr.otyp === FROST_HORN
         || instr.otyp === FIRE_HORN || instr.otyp === BUGLE)
        && !can_blow(ptr)) {
        await You(`are incapable of playing ${thesimpleoname(instr)}.`);
        return 0; // ECMD_OK
    }

    let c = 'y';
    if (instr.otyp !== LEATHER_DRUM && instr.otyp !== DRUM_OF_EARTHQUAKE
        && !(player.Stunned || player.Confusion || player.Hallucination)) {
        // ynq("Improvise?")
        const ans = await ynFunction('Improvise?', 'ynq', 'y'.charCodeAt(0), display);
        c = String.fromCharCode(ans);
        if (c === 'q') {
            await pline('Never mind.');
            return 0; // ECMD_OK
        }
    }

    if (c !== 'n') {
        return await do_improvisation(instr, player, map, display, fov) ? 1 : 0;
    }

    // Playing a specific tune
    let buf = '';
    if ((player.uevent && (player.uevent.uheard_tune || 0)) === 2) {
        const ans2 = await ynFunction('Play the passtune?', 'ynq', 'y'.charCodeAt(0), display);
        c = String.fromCharCode(ans2);
    }
    if (c === 'q') {
        await pline('Never mind.');
        return 0; // ECMD_OK
    } else if (c === 'y') {
        buf = player.tune || '';
    } else {
        buf = await getlin('What tune are you playing? [5 notes, A-G]', display);
        buf = mungspaces(buf);
        if (buf.startsWith('\x1b') || buf === '')  {
            await pline('Never mind.');
            return 0; // ECMD_OK
        }
        // convert to uppercase and change any "H" to "B"
        buf = buf.split('').map(ch => {
            let c2 = highc(ch);
            if (c2 === 'H') c2 = 'B';
            return c2;
        }).join('');
    }

    await You(!player.Deaf
        ? `extract a strange sound from ${the(xname(instr))}!`
        : `can feel ${the(xname(instr))} emitting vibrations.`);
    // Hero_playnotes — sound library, no-op in JS

    // Check if there was the Stronghold drawbridge near
    // and if the tune conforms to what we're waiting for.
    // Is_stronghold check — simplified, check if player has a tune set
    if (player.tune && player.tune.length > 0) {
        await exercise(player, A_WIS, true); // just for trying
        if (buf === player.tune) {
            // Search for the drawbridge
            for (let y = player.y - 1; y <= player.y + 1; y++) {
                for (let x = player.x - 1; x <= player.x + 1; x++) {
                    if (!isok(x, y)) continue;
                    const result = find_drawbridge(x, y, map);
                    if (result) {
                        // tune now fully known
                        if (player.uevent) player.uevent.uheard_tune = 2;
                        // record_achievement(ACH_TUNE) — stub
                        const dloc = map.at(result.x || x, result.y || y);
                        if (dloc && dloc.typ === DRAWBRIDGE_DOWN)
                            close_drawbridge(result.x || x, result.y || y, map, player);
                        else
                            open_drawbridge(result.x || x, result.y || y, map, player);
                        return 1; // ECMD_TIME
                    }
                }
            }
        } else if (!player.Deaf) {
            if (player.uevent && (player.uevent.uheard_tune || 0) < 1)
                player.uevent.uheard_tune = 1;
            // Mastermind-style hints
            let ok = false;
            for (let y = player.y - 1; y <= player.y + 1 && !ok; y++) {
                for (let x = player.x - 1; x <= player.x + 1 && !ok; x++) {
                    if (!isok(x, y)) continue;
                    const lc = map.at(x, y);
                    if (lc && (IS_DRAWBRIDGE(lc.typ)
                        || is_drawbridge_wall(x, y, map) >= 0))
                        ok = true;
                }
            }
            if (ok) { // There is a drawbridge near
                let tumblers = 0, gears = 0;
                const matched = [false, false, false, false, false];
                const tune = player.tune;

                for (let x = 0; x < buf.length; x++) {
                    if (x < 5) {
                        if (buf[x] === tune[x]) {
                            gears++;
                            matched[x] = true;
                        } else {
                            for (let y = 0; y < 5; y++) {
                                if (!matched[y] && buf[x] === tune[y]
                                    && buf[y] !== tune[y]) {
                                    tumblers++;
                                    matched[y] = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (tumblers) {
                    if (gears)
                        await You_hear(`${tumblers} tumbler${plur(tumblers)} click and ${gears} gear${plur(gears)} turn.`);
                    else
                        await You_hear(`${tumblers} tumbler${plur(tumblers)} click.`);
                } else if (gears) {
                    await You_hear(`${gears} gear${plur(gears)} turn.`);
                    if (gears === 5) {
                        if (player.uevent) player.uevent.uheard_tune = 2;
                        // record_achievement(ACH_TUNE) — stub
                    }
                }
            }
        }
    }
    return 1; // ECMD_TIME
}

// ============================================================================
// cf. music.c:902 — obj_to_instr(obj)
// Maps NetHack instrument object types to sound library instrument enums.
// Sound library not integrated in JS — returns a descriptive string.
// ============================================================================

export function obj_to_instr(obj) {
    if (!obj) return 'no_instrument';
    switch (obj.otyp) {
    case WOODEN_FLUTE:      return 'flute';
    case MAGIC_FLUTE:       return 'pan_flute';
    case TOOLED_HORN:       return 'english_horn';
    case FROST_HORN:        return 'french_horn';
    case FIRE_HORN:         return 'baritone_sax';
    case BUGLE:             return 'trumpet';
    case WOODEN_HARP:       return 'orchestral_harp';
    case MAGIC_HARP:        return 'cello';
    case BELL:
    case BELL_OF_OPENING:   return 'tinkle_bell';
    case DRUM_OF_EARTHQUAKE: return 'taiko_drum';
    case LEATHER_DRUM:      return 'melodic_tom';
    default:                return 'no_instrument';
    }
}
