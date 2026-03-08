import { isok, COLNO, ROWNO, SDOOR, SCORR, DOOR, CORR, STONE,
         D_CLOSED, D_LOCKED, D_TRAPPED, D_NODOOR, D_BROKEN, D_ISOPEN,
         IS_DOOR, A_WIS, A_INT, TRAPPED_CHEST, TRAPPED_DOOR,
         BEAR_TRAP, STATUE_TRAP, SQKY_BOARD, SLP_GAS_TRAP,
         BOLT_LIM } from './const.js';
import { rn2, rnd, rnl } from './rng.js';
import { exercise } from './attrib_exercise.js';
import { objectData, FOOD_CLASS, POTION_CLASS, COIN_CLASS, ROCK_CLASS,
         SCROLL_CLASS, SPBOOK_CLASS,
         GOLD_PIECE, CHEST, LARGE_BOX, BOULDER, GOLD } from './objects.js';
import { PM_GOLD_GOLEM, PM_LONG_WORM, S_EEL, S_WORM_TAIL } from './monsters.js';
import { is_hider, hides_under } from './mondata.js';
import { pline, You, Your, You_feel, You_see, pline_The,
         Norep, There, set_msg_xy } from './pline.js';
import {
    map_invisible, newsym, flush_screen,
    canSpotMonsterForMap, senseMonsterForMap,
} from './display.js';
import { helpless as monHelpless } from './mon.js';
import { findgold } from './steal.js';
import { observeObject } from './o_init.js';
import { unblock_point, recalc_block_point, do_clear_area } from './vision.js';
import { body_part } from './polyself.js';
import { Is_box, Has_contents } from './objnam.js';
import { tmp_at, nh_delay_output } from './animation.js';
import { DISP_FLASH, DISP_CHANGE, DISP_END } from './const.js';
import { defsyms, trap_to_defsym } from './symbols.js';

// detect.js -- Detection spells, scrolls, and searching
// cf. detect.c -- Full port of all detection routines.

// ========================================================================
// Constants
// ========================================================================
const ALL_CLASSES = 18 + 1; // MAXOCLASSES + 1
const FOOT = 12;
const TOE = 18;
const NOSE = 19;
const WM_MASK = 0x07;
const OTRAP_NONE = 0;
const OTRAP_HERE = 1;
const OTRAP_THERE = 2;

// ========================================================================
// Local helpers
// ========================================================================
// Is_box imported from objnam.js
// Has_contents imported from objnam.js
function SchroedingersBox(obj) {
    return !!(obj && obj.spe === 1 && obj.otrapped);
}
function DEADMONSTER(mon) {
    return !!(mon && (mon.dead || (mon.mhp != null && mon.mhp <= 0)));
}
function helpless(mon) {
    return !!mon && monHelpless(mon);
}
function u_at(player, x, y) {
    return player.x === x && player.y === y;
}
function distu(player, x, y) {
    const dx = player.x - x, dy = player.y - y;
    return dx * dx + dy * dy;
}
function closed_door(map, x, y) {
    const loc = map.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.flags || 0) & (D_CLOSED | D_LOCKED));
}
function sobj_at(otyp, x, y, map) {
    const objs = map.objectsAt ? map.objectsAt(x, y) : [];
    for (const obj of objs) if (obj.otyp === otyp) return obj;
    return null;
}
function nomul(game, turns) {
    if (game && typeof game.multi === 'number') game.multi = turns;
}
function money_cnt(inventory) {
    if (!inventory) return 0;
    let total = 0;
    for (const obj of inventory)
        if (obj.otyp === GOLD_PIECE) total += (obj.quan || 1);
    return total;
}
function hidden_gold() { return 0; }
function get_obj_location(otmp) {
    if (otmp.ox != null && otmp.oy != null) return { x: otmp.ox, y: otmp.oy };
    return null;
}
function M_AP_TYPE(mtmp) {
    return (mtmp && mtmp.m_ap_type) ? mtmp.m_ap_type : 0;
}
function Is_rogue_level() { return false; }
function random_object(rn2func) { return rn2func(400) || 1; }
function random_monster(rn2func) { return rn2func(400); }
function warning_of() { return false; }
function seemimic_local(mtmp) {
    if (mtmp && mtmp.m_ap_type) mtmp.m_ap_type = 0;
}
function addArticle(noun) {
    if (!noun) return 'a trap';
    const first = String(noun).trim().charAt(0).toLowerCase();
    const article = 'aeiou'.includes(first) ? 'an' : 'a';
    return `${article} ${noun}`;
}
function trapDiscoveryName(ttyp) {
    const defsymIdx = trap_to_defsym(ttyp);
    const desc = defsyms[defsymIdx]?.desc;
    if (desc) return desc;
    switch (ttyp) {
    case SQKY_BOARD: return 'squeaky board';
    case SLP_GAS_TRAP: return 'sleeping gas trap';
    default: return 'trap';
    }
}

// ========================================================================
// Display stubs
// ========================================================================
function cls() {}
function browse_map() {}
function map_redisplay_stub() {}
export function map_monst() {}
function map_object() {}
function map_trap() {}
function display_self() {}
function map_background() {}
function show_glyph(x, y, glyph) {
    if (!isok(x, y)) return;
    tmp_at(DISP_CHANGE, glyph);
    tmp_at(x, y);
}
async function flash_glyph_at(x, y, glyph, repeatCount = 1) {
    if (!isok(x, y)) return;
    const rpt = Math.max(1, Number.isFinite(repeatCount) ? Math.floor(repeatCount) : 1) * 2;
    tmp_at(DISP_FLASH, glyph);
    for (let i = 0; i < rpt; i++) {
        tmp_at(x, y);
        await nh_delay_output();
    }
    tmp_at(DISP_END, 0);
}
function feel_location() {}
function feel_newsym() {}
function docrt() {}
// flush_screen imported from display.js
async function strange_feeling(sobj, msg, player, display) {
    if (display && msg) await display.putstr_message(msg);
}

// ========================================================================
// cf. detect.c:70 -- unconstrain_map / reconstrain_map
// ========================================================================
function unconstrain_map(player) {
    const res = !!(player.uinwater || player.uburied || player.uswallow);
    player._save_uinwater = player.uinwater;
    player._save_uburied = player.uburied;
    player._save_uswallow = player.uswallow;
    player.uinwater = 0; player.uburied = 0; player.uswallow = 0;
    return res;
}
function reconstrain_map(player) {
    player.uinwater = player._save_uinwater || 0;
    player.uburied = player._save_uburied || 0;
    player.uswallow = player._save_uswallow || 0;
    player._save_uinwater = 0; player._save_uburied = 0; player._save_uswallow = 0;
}

// ========================================================================
// cf. detect.c:201 -- o_in(obj, oclass)
// ========================================================================
// Autotranslated from detect.c:201
export function o_in(obj, oclass) {
  let otmp, temp;
  if (obj.oclass === oclass) return obj;
  if (Has_contents(obj) && !SchroedingersBox(obj)) {
    for (otmp = obj.cobj; otmp; otmp = otmp.nobj) {
      if (otmp.oclass === oclass) return otmp;
      else if (Has_contents(otmp) && (temp = o_in(otmp, oclass)) != null) return temp;
    }
  }
  return  null;
}

// ========================================================================
// cf. detect.c:229 -- o_material(obj, material)
// ========================================================================
// Autotranslated from detect.c:229
export function o_material(obj, material) {
  let otmp, temp;
  if (objects[obj.otyp].oc_material === material) return obj;
  if (Has_contents(obj)) {
    for (otmp = obj.cobj; otmp; otmp = otmp.nobj) {
      if (objects[otmp.otyp].oc_material === material) return otmp;
      else if (Has_contents(otmp) && (temp = o_material(otmp, material)) != null) return temp;
    }
  }
  return  null;
}

// ========================================================================
// cf. detect.c:249 -- observe_recursively
// ========================================================================
export function observe_recursively(obj) {
    if (!obj) return;
    observeObject(obj);
    if (Has_contents(obj)) for (const otmp of obj.cobj) observe_recursively(otmp);
}

// ========================================================================
// cf. detect.c:262/318 -- check_map_spot / clear_stale_map
// ========================================================================
function check_map_spot() { return false; }
export function clear_stale_map(oclass, material, map) {
    let change = false;
    for (let zx = 1; zx < COLNO; zx++)
        for (let zy = 0; zy < ROWNO; zy++)
            if (check_map_spot(zx, zy, oclass, material, map)) change = true;
    return change;
}

// ========================================================================
// cf. detect.c:139 -- trapped_chest_at
// ========================================================================
export function trapped_chest_at(ttyp, x, y, map, player) {
    if (ttyp !== TRAPPED_CHEST || (player.hallucinating && rn2(20))) return false;
    if (sobj_at(CHEST, x, y, map) || sobj_at(LARGE_BOX, x, y, map)) return true;
    if (u_at(player, x, y)) {
        for (const otmp of (player.inventory || []))
            if (Is_box(otmp) && otmp.otrapped) return true;
        if (player.usteed)
            for (const otmp of (player.usteed.minvent || []))
                if (Is_box(otmp) && otmp.otrapped) return true;
    }
    const mtmp = map.monsterAt ? map.monsterAt(x, y) : null;
    if (mtmp) for (const otmp of (mtmp.minvent || []))
        if (Is_box(otmp) && otmp.otrapped) return true;
    return false;
}

// ========================================================================
// cf. detect.c:182 -- trapped_door_at
// ========================================================================
export function trapped_door_at(ttyp, x, y, map, player) {
    if (ttyp !== TRAPPED_DOOR || (player.hallucinating && rn2(20))) return false;
    const lev = map.at(x, y);
    if (!lev || !IS_DOOR(lev.typ)) return false;
    const mask = lev.flags || 0;
    if ((mask & (D_NODOOR | D_BROKEN | D_ISOPEN)) !== 0
        && trapped_chest_at(ttyp, x, y, map, player)) return false;
    return true;
}

// ========================================================================
// cf. detect.c:335 -- gold_detect
// ========================================================================
export async function gold_detect(sobj, player, map, display, game) {
    let known = false;
    const stale = clear_stale_map(COIN_CLASS, sobj.blessed ? GOLD : 0, map);
    known = stale;
    let steedgold = false;
    for (const mtmp of (map.monsters || [])) {
        if (DEADMONSTER(mtmp) || (mtmp.isgd && !mtmp.mx)) continue;
        const mndx = (mtmp.data || mtmp.type || {}).mndx || mtmp.mndx;
        if (findgold(mtmp.minvent || []) || mndx === PM_GOLD_GOLEM) {
            if (mtmp === player.usteed) { steedgold = true; }
            else { known = true; return await _gold_detect_outgoldmap(sobj, player, map, display); }
        } else {
            for (const obj of (mtmp.minvent || [])) {
                if ((sobj.blessed && o_material(obj, GOLD)) || o_in(obj, COIN_CLASS)) {
                    if (mtmp === player.usteed) { steedgold = true; }
                    else { known = true; return await _gold_detect_outgoldmap(sobj, player, map, display); }
                }
            }
        }
    }
    for (const obj of (map.objects || [])) {
        if (sobj.blessed && o_material(obj, GOLD)) {
            known = true;
            if (obj.ox !== player.x || obj.oy !== player.y)
                return await _gold_detect_outgoldmap(sobj, player, map, display);
        } else if (o_in(obj, COIN_CLASS)) {
            known = true;
            if (obj.ox !== player.x || obj.oy !== player.y)
                return await _gold_detect_outgoldmap(sobj, player, map, display);
        }
    }
    if (!known) {
        let buf;
        if (money_cnt(player.inventory) || hidden_gold(true))
            buf = 'You feel worried about your future financial situation.';
        else if (steedgold) buf = "You feel interested in your steed's financial situation.";
        else buf = 'You feel materially poor.';
        await strange_feeling(sobj, buf, player, display);
        return 1;
    }
    if (stale) docrt();
    await You("notice some gold between your %s.", body_part(FOOT, player));
    return 0;
}
async function _gold_detect_outgoldmap(sobj, player, map, display) {
    cls(); unconstrain_map(player);
    let ugold = false;
    for (const obj of (map.objects || [])) {
        let temp = null;
        if (sobj.blessed && (temp = o_material(obj, GOLD)) !== null) {
            if (temp !== obj) { temp.ox = obj.ox; temp.oy = obj.oy; }
            map_object(temp, 1);
        } else if ((temp = o_in(obj, COIN_CLASS)) !== null) {
            if (temp !== obj) { temp.ox = obj.ox; temp.oy = obj.oy; }
            map_object(temp, 1);
        }
        if (temp && u_at(player, temp.ox, temp.oy)) ugold = true;
    }
    for (const mtmp of (map.monsters || [])) {
        if (DEADMONSTER(mtmp) || (mtmp.isgd && !mtmp.mx)) continue;
        let temp = null;
        const mndx = (mtmp.data || mtmp.type || {}).mndx || mtmp.mndx;
        if (findgold(mtmp.minvent || []) || mndx === PM_GOLD_GOLEM) {
            const gq = rnd(10);
            temp = { otyp: GOLD_PIECE, quan: gq, ox: mtmp.mx, oy: mtmp.my };
            map_object(temp, 1);
        } else {
            for (const obj of (mtmp.minvent || [])) {
                if (sobj.blessed && (temp = o_material(obj, GOLD)) !== null) {
                    temp.ox = mtmp.mx; temp.oy = mtmp.my; map_object(temp, 1); break;
                } else if ((temp = o_in(obj, COIN_CLASS)) !== null) {
                    temp.ox = mtmp.mx; temp.oy = mtmp.my; map_object(temp, 1); break;
                }
            }
        }
        if (temp && u_at(player, temp.ox, temp.oy)) ugold = true;
    }
    if (!ugold) newsym(player.x, player.y);
    await You_feel("very greedy, and sense gold!");
    await exercise(player, A_WIS, true);
    browse_map(); map_redisplay_stub(); reconstrain_map(player);
    return 0;
}

// ========================================================================
// cf. detect.c:479 -- food_detect
// ========================================================================
export async function food_detect(sobj, player, map, display, game) {
    let ct = 0, ctu = 0;
    const confused = !!(player.confused || (sobj && sobj.cursed));
    const oclass = confused ? POTION_CLASS : FOOD_CLASS;
    const what = confused ? 'something' : 'food';
    const stale = clear_stale_map(oclass, 0, map);
    if (player.usteed) { player.usteed.mx = player.x; player.usteed.my = player.y; }
    for (const obj of (map.objects || []))
        if (o_in(obj, oclass)) { if (u_at(player, obj.ox, obj.oy)) ctu++; else ct++; }
    for (const mtmp of (map.monsters || [])) {
        if (ct && ctu) break;
        if (DEADMONSTER(mtmp) || (mtmp.isgd && !mtmp.mx)) continue;
        for (const obj of (mtmp.minvent || []))
            if (o_in(obj, oclass)) {
                if (u_at(player, mtmp.mx, mtmp.my)) ctu++; else ct++; break;
            }
    }
    if (!ct && !ctu) {
        if (stale) {
            docrt();
            await You("sense a lack of %s nearby.", what);
            if (sobj && sobj.blessed) {
                if (!player.uedibility) await Your("%s starts to tingle.", body_part(NOSE, player));
                player.uedibility = 1;
            }
        } else if (sobj) {
            let buf = `Your ${body_part(NOSE, player)} twitches`;
            if (sobj.blessed && !player.uedibility) {
                buf += ' then starts to tingle.';
                await strange_feeling(sobj, buf, player, display);
                player.uedibility = 1;
            } else {
                buf += '.';
                await strange_feeling(sobj, buf, player, display);
            }
        }
        return !stale ? 1 : 0;
    } else if (!ct) {
        await You("%s %s nearby.", sobj ? 'smell' : 'sense', what);
        if (sobj && sobj.blessed) {
            if (!player.uedibility) await Your("%s starts to tingle.", body_part(NOSE, player));
            player.uedibility = 1;
        }
    } else {
        cls(); unconstrain_map(player);
        for (const obj of (map.objects || [])) {
            const temp = o_in(obj, oclass);
            if (temp) { if (temp !== obj) { temp.ox = obj.ox; temp.oy = obj.oy; } map_object(temp, 1); }
        }
        for (const mtmp of (map.monsters || [])) {
            if (DEADMONSTER(mtmp) || (mtmp.isgd && !mtmp.mx)) continue;
            for (const obj of (mtmp.minvent || []))  {
                const temp = o_in(obj, oclass);
                if (temp) { temp.ox = mtmp.mx; temp.oy = mtmp.my; map_object(temp, 1); break; }
            }
        }
        if (!ctu) newsym(player.x, player.y);
        if (sobj) {
            if (sobj.blessed) {
                await Your("%s %s to tingle and you smell %s.", body_part(NOSE, player),
                     player.uedibility ? 'continues' : 'starts', what);
                player.uedibility = 1;
            } else await Your("%s tingles and you smell %s.", body_part(NOSE, player), what);
        } else await You("sense %s.", what);
        await exercise(player, A_WIS, true);
        browse_map(); map_redisplay_stub(); reconstrain_map(player);
    }
    return 0;
}

// ========================================================================
// cf. detect.c:603 -- object_detect
// ========================================================================
export async function object_detect(detector, oclass, player, map, display, game) {
    if (oclass < 0 || oclass >= 18) oclass = 0;
    const is_cursed = detector && detector.cursed;
    const do_dknown = detector && objectData[detector.otyp]
        && (objectData[detector.otyp].oc_class === POTION_CLASS
            || objectData[detector.otyp].oc_class === SPBOOK_CLASS)
        && detector.blessed;
    let ct = 0, ctu = 0;
    const boulder = 0;
    const stuff = (player.hallucinating || (player.confused && oclass === SCROLL_CLASS))
        ? 'something' : 'objects';
    if (do_dknown) for (const obj of (player.inventory || [])) observe_recursively(obj);
    for (const obj of (map.objects || [])) {
        if ((!oclass && !boulder) || o_in(obj, oclass)) {
            if (u_at(player, obj.ox, obj.oy)) ctu++; else ct++;
        }
        if (do_dknown) observe_recursively(obj);
    }
    if (player.usteed) { player.usteed.mx = player.x; player.usteed.my = player.y; }
    for (const mtmp of (map.monsters || [])) {
        if (DEADMONSTER(mtmp) || (mtmp.isgd && !mtmp.mx)) continue;
        for (const obj of (mtmp.minvent || [])) {
            if ((!oclass && !boulder) || o_in(obj, oclass)) ct++;
            if (do_dknown) observe_recursively(obj);
        }
        if ((is_cursed && M_AP_TYPE(mtmp)
             && (!oclass || oclass === (objectData[mtmp.mappearance] || {}).oc_class))
            || (findgold(mtmp.minvent || []) && (!oclass || oclass === COIN_CLASS))) {
            ct++; break;
        }
    }
    if (!clear_stale_map(!oclass ? ALL_CLASSES : oclass, 0, map) && !ct) {
        if (!ctu) {
            if (detector) await strange_feeling(detector, 'You feel a lack of something.', player, display);
            return 1;
        }
        await You("sense %s nearby.", stuff); return 0;
    }
    cls(); unconstrain_map(player);
    for (const obj of (map.objects || [])) {
        let otmp = null;
        if ((!oclass && !boulder) || (otmp = o_in(obj, oclass))) {
            if (oclass || boulder) {
                otmp = otmp || obj;
                if (otmp !== obj) { otmp.ox = obj.ox; otmp.oy = obj.oy; }
                map_object(otmp, 1);
            } else map_object(obj, 1);
        }
    }
    for (const mtmp of (map.monsters || [])) {
        if (DEADMONSTER(mtmp) || (mtmp.isgd && !mtmp.mx)) continue;
        for (const obj of (mtmp.minvent || [])) {
            let otmp = null;
            if ((!oclass && !boulder) || (otmp = o_in(obj, oclass))) {
                if (!oclass && !boulder) otmp = obj; else otmp = otmp || obj;
                otmp.ox = mtmp.mx; otmp.oy = mtmp.my; map_object(otmp, 1); break;
            }
        }
        if (is_cursed && M_AP_TYPE(mtmp)
            && (!oclass || oclass === (objectData[mtmp.mappearance] || {}).oc_class)) {
            // mimic
        } else if (findgold(mtmp.minvent || []) && (!oclass || oclass === COIN_CLASS)) {
            const gq = rnd(10);
            map_object({ otyp: GOLD_PIECE, quan: gq, ox: mtmp.mx, oy: mtmp.my }, 1);
        }
    }
    newsym(player.x, player.y);
    await You("detect the %s of %s.", ct ? 'presence' : 'absence', stuff);
    browse_map(); map_redisplay_stub(); reconstrain_map(player);
    return 0;
}

// ========================================================================
// cf. detect.c:798 -- monster_detect
// ========================================================================
export async function monster_detect(otmp, mclass, player, map, display, game) {
    let mcnt = 0;
    for (const mtmp of (map.monsters || [])) {
        if (DEADMONSTER(mtmp) || (mtmp.isgd && !mtmp.mx)) continue;
        ++mcnt; break;
    }
    if (!mcnt) {
        if (otmp) {
            await strange_feeling(otmp, player.hallucinating
                ? 'You get the heebie jeebies.' : 'You feel threatened.', player, display);
        }
        return 1;
    } else {
        let woken = false;
        const swallowed = player.uswallow;
        cls(); unconstrain_map(player);
        for (const mtmp of (map.monsters || [])) {
            if (DEADMONSTER(mtmp) || (mtmp.isgd && !mtmp.mx)) continue;
            const mdat = mtmp.data || mtmp.type || {};
            if (!mclass || mdat.mlet === mclass
                || (mdat.mndx === PM_LONG_WORM && mclass === S_WORM_TAIL))
                map_monst(mtmp, true);
            if (otmp && otmp.cursed && helpless(mtmp)) {
                mtmp.msleeping = 0;
                mtmp.sleeping = false;
                mtmp.mfrozen = 0;
                mtmp.mcanmove = 1;
                woken = true;
            }
        }
        if (!swallowed) display_self();
        await You("sense the presence of monsters.");
        if (woken) await pline("Monsters sense the presence of you.");
        browse_map(); map_redisplay_stub(); reconstrain_map(player);
    }
    return 0;
}

// ========================================================================
// cf. detect.c:865 -- sense_trap
// ========================================================================
export function sense_trap(trap, x, y, src_cursed, player, map, display) {
    if (player.hallucinating || src_cursed) {
        const fakeOtyp = !player.hallucinating ? GOLD_PIECE : random_object(rn2);
        const fakeQuan = (fakeOtyp === GOLD_PIECE) ? rnd(10)
                         : ((objectData[fakeOtyp] && objectData[fakeOtyp].merge) ? rnd(2) : 1);
        random_monster(rn2); // consume rn2 for corpsenm
    } else if (trap) {
        map_trap(trap, 1); trap.tseen = 1;
    } else {
        map_trap({ tx: x, ty: y, ttyp: BEAR_TRAP }, 1);
    }
}

// ========================================================================
// cf. detect.c:907 -- detect_obj_traps
// ========================================================================
function detect_obj_traps(objlist, show_them, how, ft, player, map, display) {
    let result = OTRAP_NONE;
    for (const otmp of (objlist || [])) {
        let x = 0, y = 0;
        if ((Is_box(otmp) && otmp.otrapped) || Has_contents(otmp)) {
            const loc = get_obj_location(otmp);
            if (!loc || !isok(loc.x, loc.y)) continue;
            x = loc.x; y = loc.y;
            if (ft && (x !== ft.ft_cc_x || y !== ft.ft_cc_y)) continue;
        }
        if (Is_box(otmp) && otmp.otrapped) {
            otmp.tknown = 1;
            result |= u_at(player, x, y) ? OTRAP_HERE : OTRAP_THERE;
            if (show_them) {
                const dt = { tx: x, ty: y, ttyp: TRAPPED_CHEST, tseen: 0 };
                sense_trap(dt, x, y, how, player, map, display);
            }
            if (ft) ft.num_traps++;
        }
        if (Has_contents(otmp))
            result |= detect_obj_traps(otmp.cobj, show_them, how, ft, player, map, display);
    }
    return result;
}

// ========================================================================
// cf. detect.c:956 -- display_trap_map
// ========================================================================
async function display_trap_map(cursed_src, player, map, display) {
    cls(); unconstrain_map(player);
    detect_obj_traps(map.objects || [], true, cursed_src, null, player, map, display);
    for (const mon of (map.monsters || [])) {
        if (DEADMONSTER(mon) || (mon.isgd && !mon.mx)) continue;
        detect_obj_traps(mon.minvent || [], true, cursed_src, null, player, map, display);
    }
    detect_obj_traps(player.inventory || [], true, cursed_src, null, player, map, display);
    for (const ttmp of (map.traps || []))
        sense_trap(ttmp, 0, 0, cursed_src, player, map, display);
    const doorindex = map.doorindex || 0;
    const doors = map.doors || [];
    for (let door = 0; door < doorindex; door++) {
        const cc = doors[door]; if (!cc) continue;
        const lev = map.at(cc.x, cc.y); if (!lev || lev.typ === SDOOR) continue;
        if ((lev.flags || 0) & D_TRAPPED) {
            sense_trap({ tx: cc.x, ty: cc.y, ttyp: TRAPPED_DOOR, tseen: 0 },
                       cc.x, cc.y, cursed_src, player, map, display);
        }
    }
    newsym(player.x, player.y);
    await You_feel("%s.", cursed_src ? 'very greedy' : 'entrapped');
    browse_map(); map_redisplay_stub(); reconstrain_map(player);
}

// ========================================================================
// cf. detect.c:1011 -- trap_detect
// ========================================================================
export async function trap_detect(sobj, player, map, display, game) {
    const cursed_src = sobj && sobj.cursed ? 1 : 0;
    let found = false;
    if (player.usteed) { player.usteed.mx = player.x; player.usteed.my = player.y; }
    for (const ttmp of (map.traps || [])) {
        if (ttmp.tx !== player.x || ttmp.ty !== player.y) {
            await display_trap_map(cursed_src, player, map, display); return 0;
        }
        found = true;
    }
    let tr = detect_obj_traps(map.objects || [], false, 0, null, player, map, display);
    if (tr !== OTRAP_NONE) {
        if (tr & OTRAP_THERE) { await display_trap_map(cursed_src, player, map, display); return 0; }
        found = true;
    }
    for (const mon of (map.monsters || [])) {
        if (DEADMONSTER(mon) || (mon.isgd && !mon.mx)) continue;
        tr = detect_obj_traps(mon.minvent || [], false, 0, null, player, map, display);
        if (tr !== OTRAP_NONE) {
            if (tr & OTRAP_THERE) { await display_trap_map(cursed_src, player, map, display); return 0; }
            found = true;
        }
    }
    if (detect_obj_traps(player.inventory || [], false, 0, null, player, map, display) !== OTRAP_NONE)
        found = true;
    const doorindex = map.doorindex || 0, doors = map.doors || [];
    for (let door = 0; door < doorindex; door++) {
        const cc = doors[door]; if (!cc) continue;
        const lev = map.at(cc.x, cc.y); if (!lev || lev.typ === SDOOR) continue;
        if ((lev.flags || 0) & D_TRAPPED) {
            if (cc.x !== player.x || cc.y !== player.y) {
                await display_trap_map(cursed_src, player, map, display); return 0;
            }
            found = true;
        }
    }
    if (!found) {
        await strange_feeling(sobj, `Your ${body_part(TOE, player)}s stop itching.`, player, display);
        return 1;
    }
    await Your("%ss itch.", body_part(TOE, player));
    return 0;
}

// ========================================================================
// cf. detect.c:1091 -- furniture_detect (stub)
// ========================================================================
export async function furniture_detect() {
    await There("seems to be nothing of interest on this level."); return 0;
}

// ========================================================================
// cf. detect.c:1142 -- level_distance
// ========================================================================
export function level_distance(where, player) {
    const playerDepth = player.dlevel || player.depth || 0;
    const targetDepth = (where && where.dlevel != null) ? where.dlevel : 0;
    const ll = playerDepth - targetDepth;
    const indun = player.dnum === (where ? where.dnum : -1);
    if (ll < 0) {
        if (ll < (-8 - rn2(3))) return indun ? 'far below' : 'far away';
        else if (ll < -1) return indun ? 'below you' : 'away below you';
        else return indun ? 'just below' : 'in the distance';
    } else if (ll > 0) {
        if (ll > (8 + rn2(3))) return indun ? 'far above' : 'far away';
        else if (ll > 1) return indun ? 'above you' : 'away above you';
        else return indun ? 'just above' : 'in the distance';
    }
    return indun ? 'near you' : 'in the distance';
}

// ========================================================================
// cf. detect.c:1206 -- use_crystal_ball
// ========================================================================
export async function use_crystal_ball(obj, player, map, display, game) {
    if (!obj) return;
    if (player.blind) { await pline("Too bad you can't see the crystal ball."); return; }
    const charged = (obj.spe || 0) > 0;
    const oops = obj.blessed ? 16 : 20;
    const acurrInt = player.acurr_int || player.attributes?.[A_INT] || 10;
    if (charged && (obj.cursed || rnd(oops) > acurrInt)) {
        const impair = rnd(100 - 3 * acurrInt);
        switch (rnd(obj.blessed ? 4 : 5)) {
        case 1: await pline("The crystal ball is too much to comprehend!"); break;
        case 2: await pline("The crystal ball confuses you!"); break;
        case 3: await pline("The crystal ball damages your vision!"); break;
        case 4: await pline("The crystal ball zaps your mind!"); break;
        case 5: await pline("The crystal ball explodes!"); break;
        }
        if (obj && obj.spe > 0) obj.spe--;
        return;
    }
    if (player.hallucinating) {
        nomul(game, -rnd(charged ? 4 : 2));
        if (!charged) { await pline("All you see is funky colored haze."); }
        else {
            switch (rnd(6)) {
            case 1: await You("grok some groovy globs of incandescent lava."); break;
            case 2: await pline("Whoa!  Psychedelic colors, dude!"); break;
            case 3: await pline_The("crystal pulses with sinister light!"); break;
            case 4: await You_see("goldfish swimming above fluorescent rocks."); break;
            case 5: await You_see("tiny snowflakes spinning around a miniature farmhouse."); break;
            default: await pline("Oh wow... like a kaleidoscope!"); break;
            }
            if (obj.spe > 0) obj.spe--;
        }
        return;
    }
    await You("peer into the crystal ball...");
    nomul(game, -rnd(charged ? 10 : 2));
    if (!charged) { await pline_The("vision is unclear."); return; }
    if (obj.spe > 0) obj.spe--;
    if (!rn2(100)) await You_see("the Wizard of Yendor gazing out at you.");
    else await pline_The("vision is unclear.");
}

// ========================================================================
// cf. detect.c:1372 -- show_map_spot
// ========================================================================
export function show_map_spot(x, y, cnf, map) {
    if (cnf && rn2(7)) return;
    const lev = map.at(x, y); if (!lev) return;
    lev.seenv = 0xFF;
    if (lev.typ === SCORR) { lev.typ = CORR; unblock_point(x, y); }
    map_background(map, x, y, 0);
    newsym(x, y);
}

// ========================================================================
// cf. detect.c:1422 -- do_mapping
// ========================================================================
export async function do_mapping(player, map, display) {
    unconstrain_map(player);
    const cnf = !!player.confused;
    for (let zx = 1; zx < COLNO; zx++)
        for (let zy = 0; zy < ROWNO; zy++)
            show_map_spot(zx, zy, cnf, map);
    reconstrain_map(player);
    flush_screen(1); // C ref: detect.c:2389 — show mapped terrain before messages
    await exercise(player, A_WIS, true);
}

// ========================================================================
// cf. detect.c:1448 -- do_vicinity_map
// ========================================================================
export async function do_vicinity_map(sobj, player, map, display) {
    const cnf = !!player.confused;
    const lo_y = ((player.y - 5 < 0) ? 0 : player.y - 5);
    const hi_y = ((player.y + 6 >= ROWNO) ? ROWNO - 1 : player.y + 6);
    const lo_x = ((player.x - 9 < 1) ? 1 : player.x - 9);
    const hi_x = ((player.x + 10 >= COLNO) ? COLNO - 1 : player.x + 10);
    unconstrain_map(player);
    for (let zx = lo_x; zx <= hi_x; zx++)
        for (let zy = lo_y; zy <= hi_y; zy++)
            show_map_spot(zx, zy, cnf, map);
    await You("sense your surroundings.");
    reconstrain_map(player);
}

// ========================================================================
// cf. detect.c:1589 -- cvt_sdoor_to_door
// ========================================================================
// Autotranslated from detect.c:1589
export function cvt_sdoor_to_door(lev, map) {
  let newmask = (lev.flags || 0) & ~WM_MASK;
  if (Is_rogue_level(map.uz)) { newmask = D_NODOOR; }
  else {
    if (!(newmask & D_LOCKED)) {
      newmask |= D_CLOSED;
    }
  }
  lev.typ = DOOR;
  lev.flags = newmask;
  lev.arboreal_sdoor = 0;
}

// ========================================================================
// cf. detect.c:1610 -- foundone
// ========================================================================
function foundone(zx, zy, glyph, map) {
    const lev = map.at(zx, zy);
    if (lev) lev.seenv = 0xFF;
    newsym(zx, zy);
}

// ========================================================================
// cf. detect.c:1639 -- findone
// ========================================================================
function findone_fn(zx, zy, found_p, player, map, display) {
    const lev = map.at(zx, zy); if (!lev) return;
    const ttmp = map.trapAt ? map.trapAt(zx, zy) : null;
    const mtmpRaw = map.monsterAt ? map.monsterAt(zx, zy) : null;
    const mtmp = (mtmpRaw && !DEADMONSTER(mtmpRaw) && !(mtmpRaw.isgd && !mtmpRaw.mx))
        ? mtmpRaw : null;
    found_p.ft_cc_x = zx; found_p.ft_cc_y = zy;
    if (lev.typ === SDOOR) {
        cvt_sdoor_to_door(lev); recalc_block_point(zx, zy);
        map_background(map, zx, zy, 0); foundone(zx, zy, 0, map);
        found_p.num_sdoors++;
    } else if (lev.typ === SCORR) {
        lev.typ = CORR; unblock_point(zx, zy);
        map_background(map, zx, zy, 0); foundone(zx, zy, 0, map);
        found_p.num_scorrs++;
    }
    if (ttmp && !ttmp.tseen && ttmp.ttyp !== STATUE_TRAP) {
        ttmp.tseen = 1;
        sense_trap(ttmp, zx, zy, 0, player, map, display);
        foundone(zx, zy, 0, map); found_p.num_traps++;
    }
    if (closed_door(map, zx, zy) && ((lev.flags || 0) & D_TRAPPED) !== 0) {
        sense_trap({ tx: zx, ty: zy, ttyp: TRAPPED_DOOR, tseen: 1 },
                   zx, zy, 0, player, map, display);
        foundone(zx, zy, 0, map); found_p.num_traps++;
    }
    detect_obj_traps(map.objects || [], true, 0, found_p, player, map, display);
    if (mtmp) detect_obj_traps(mtmp.minvent || [], true, 0, found_p, player, map, display);
    if (u_at(player, zx, zy))
        detect_obj_traps(player.inventory || [], true, 0, found_p, player, map, display);
    if (mtmp && (!canSpotMonsterForMap(mtmp, map, player) || mtmp.mundetected || M_AP_TYPE(mtmp))) {
        if (M_AP_TYPE(mtmp)) { seemimic_local(mtmp); found_p.num_mons++; }
        else if (mtmp.mundetected) {
            const mdat = mtmp.data || mtmp.type || {};
            if (is_hider(mdat) || hides_under(mdat) || mdat.mlet === S_EEL) {
                mtmp.mundetected = 0; newsym(zx, zy); found_p.num_mons++;
            }
        }
        if (!canSpotMonsterForMap(mtmp, map, player)) {
            map_invisible(map, zx, zy, player); found_p.num_invis++;
        }
    }
}

// ========================================================================
// cf. detect.c:1729 -- openone
// ========================================================================
async function openone(zx, zy, numRef, player, map, display) {
    const lev = map.at(zx, zy); if (!lev) return;
    const floorObjs = map.objectsAt ? map.objectsAt(zx, zy) : [];
    for (const otmp of floorObjs)
        if (Is_box(otmp) && otmp.olocked) { otmp.olocked = 0; numRef.value++; }
    if (lev.typ === SDOOR || (lev.typ === DOOR && ((lev.flags || 0) & (D_CLOSED | D_LOCKED)))) {
        if (lev.typ === SDOOR) cvt_sdoor_to_door(lev);
        if ((lev.flags || 0) & D_TRAPPED) {
            if (distu(player, zx, zy) < 3) await pline("KABOOM!  You triggered a door trap!");
            else await Norep("You %s an explosion!", "hear");
            lev.flags = D_NODOOR;
        } else lev.flags = D_ISOPEN;
        unblock_point(zx, zy); newsym(zx, zy); numRef.value++;
    } else if (lev.typ === SCORR) {
        lev.typ = CORR; unblock_point(zx, zy); newsym(zx, zy); numRef.value++;
    } else {
        const ttmp = map.trapAt ? map.trapAt(zx, zy) : null;
        if (ttmp && !ttmp.tseen && ttmp.ttyp !== STATUE_TRAP) {
            ttmp.tseen = 1; newsym(zx, zy); numRef.value++;
        }
    }
}

// ========================================================================
// cf. detect.c:1792 -- findit
// ========================================================================
export async function findit(player, map, display, game) {
    if (player.uswallow) return 0;
    const found = {
        num_sdoors: 0, num_scorrs: 0, num_traps: 0, num_mons: 0,
        num_invis: 0, num_cleared_invis: 0, num_kept_invis: 0,
        ft_cc_x: 0, ft_cc_y: 0,
    };
    const fov = game && game.fov ? game.fov : null;
    await do_clear_area(fov, map, player.x, player.y, BOLT_LIM,
        (zx, zy, arg) => findone_fn(zx, zy, arg, player, map, display), found);
    flush_screen(1); // C ref: detect.c:1892 — show revealed items before messages
    let num = 0;
    const k = (found.num_sdoors ? 1 : 0) + (found.num_scorrs ? 1 : 0)
            + (found.num_traps ? 1 : 0) + (found.num_mons ? 1 : 0);
    let buf = '';
    if (found.num_sdoors) {
        buf += found.num_sdoors > 1 ? `${found.num_sdoors} secret doors` : 'a secret door';
        num += found.num_sdoors;
    }
    if (found.num_scorrs) {
        if (buf) buf += (k === 2) ? ' and ' : ', ';
        buf += found.num_scorrs > 1 ? `${found.num_scorrs} secret corridors` : 'a secret corridor';
        num += found.num_scorrs;
    }
    if (found.num_traps) {
        if (buf) buf += (k === 3 && !found.num_mons) ? ', and ' : (k === 2) ? ' and ' : ', ';
        buf += found.num_traps > 1 ? `${found.num_traps} traps` : 'a trap';
        num += found.num_traps;
    }
    if (found.num_mons) {
        if (buf) buf += (k > 2) ? ', and ' : ' and ';
        buf += found.num_mons > 1 ? `${found.num_mons} hidden monsters` : 'a hidden monster';
        num += found.num_mons;
    }
    if (buf) await You("reveal %s!", buf);
    if (found.num_invis) {
        let ibuf;
        if (found.num_invis > 1)
            ibuf = `${found.num_invis}${found.num_kept_invis ? ' other' : ''} unseen monsters`;
        else ibuf = `${found.num_kept_invis ? 'another' : 'an'} unseen monster`;
        await You("detect %s!", ibuf); num += found.num_invis;
    }
    if (found.num_cleared_invis) {
        if (!num) await You_feel("%sless paranoid.", found.num_kept_invis ? 'somewhat ' : '');
        num += found.num_cleared_invis;
    }
    if (!num) await You("don't find anything.");
    return num;
}

// ========================================================================
// cf. detect.c:1902 -- openit
// ========================================================================
export async function openit(player, map, display, game) {
    const numRef = { value: 0 };
    if (player.uswallow) { await pline("Something opens!"); return -1; }
    const fov = game && game.fov ? game.fov : null;
    await do_clear_area(fov, map, player.x, player.y, BOLT_LIM,
        async (zx, zy, arg) => await openone(zx, zy, arg, player, map, display), numRef);
    return numRef.value;
}

// ========================================================================
// cf. detect.c:1929 -- detecting
// ========================================================================
export function detecting(func) {
    return func === findone_fn || func === openone;
}

// ========================================================================
// cf. detect.c:1935 -- find_trap
// ========================================================================
export async function find_trap(trap, player, map, display) {
    if (!trap) return;
    trap.tseen = 1;
    await exercise(player, A_WIS, true);
    feel_newsym(trap.tx, trap.ty);
    await You("find %s.", addArticle(trapDiscoveryName(trap.ttyp)));
}

// ========================================================================
// cf. detect.c:1965 -- mfind0
// ========================================================================
export async function mfind0(mtmp, via_warning, player, map, display) {
    if (!mtmp) return 0;
    const x = mtmp.mx, y = mtmp.my;
    let found_something = false;
    if (via_warning && !warning_of(mtmp, player)) return -1;
    if (M_AP_TYPE(mtmp)) {
        seemimic_local(mtmp); found_something = true;
    } else {
        found_something = !canSpotMonsterForMap(mtmp, map, player);
        const mdat = mtmp.data || mtmp.type || {};
        if (mtmp.mundetected && (is_hider(mdat) || hides_under(mdat) || mdat.mlet === S_EEL)) {
            if (via_warning && found_something) {
                set_msg_xy(x, y);
                await Your("danger sense causes you to take a second %s.",
                     player.blind ? 'to check nearby' : 'look close by');
            }
            mtmp.mundetected = 0; found_something = true;
        }
        newsym(x, y);
    }
    if (found_something) {
        if (!canSpotMonsterForMap(mtmp, map, player)) {
            const loc = map.at(x, y);
            if (loc && loc.mem_invis) return -1;
        }
        await exercise(player, A_WIS, true);
        if (!canSpotMonsterForMap(mtmp, map, player)) {
            map_invisible(map, x, y, player); set_msg_xy(x, y);
            await You_feel("an unseen monster!");
        } else if (!senseMonsterForMap(mtmp, map, player)) {
            set_msg_xy(x, y); await You("find a monster.");
        }
        return 1;
    }
    return 0;
}

// ========================================================================
// cf. detect.c:2016 -- dosearch0
// ========================================================================
export async function dosearch0(player, map, display, game = null) {
    if (player.uswallow) return 1;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = player.x + dx;
            const ny = player.y + dy;
            if (!isok(nx, ny)) continue;
            const loc = map.at(nx, ny);
            if (!loc) continue;

            if (loc.typ === SDOOR) {
                if (rnl(7) === 0) {
                    loc.typ = DOOR;
                    loc.flags = D_CLOSED;
                    await exercise(player, A_WIS, true);
                    if (game && Number.isInteger(game.multi) && game.multi > 0) {
                        game.multi = 0;
                    }
                    await display.putstr_message('You find a hidden door.');
                }
            } else if (loc.typ === SCORR) {
                if (rnl(7) === 0) {
                    loc.typ = CORR;
                    await exercise(player, A_WIS, true);
                    if (game && Number.isInteger(game.multi) && game.multi > 0) {
                        game.multi = 0;
                    }
                    await display.putstr_message('You find a hidden passage.');
                }
            } else {
                // C ref: detect.c:2080 -- trap detection with rnl(8)
                const trap = map.trapAt?.(nx, ny);
                if (trap && !trap.tseen && !rnl(8)) {
                    await find_trap(trap, player, map, display);
                    if (game && Number.isInteger(game.multi) && game.multi > 0) {
                        game.multi = 0;
                    }
                }
            }
        }
    }
}

// ========================================================================
// cf. detect.c:2097 -- dosearch
// ========================================================================
export async function dosearch(player, map, display, game) {
    return await dosearch0(player, map, display, game);
}

// ========================================================================
// cf. detect.c:2107 -- warnreveal
// ========================================================================
export async function warnreveal(player, map, display) {
    for (let x = player.x - 1; x <= player.x + 1; x++)
        for (let y = player.y - 1; y <= player.y + 1; y++) {
            if (!isok(x, y) || u_at(player, x, y)) continue;
            const mtmp = map.monsterAt ? map.monsterAt(x, y) : null;
            if (mtmp && warning_of(mtmp, player) && mtmp.mundetected)
                await mfind0(mtmp, true, player, map, display);
        }
}

// ========================================================================
// cf. detect.c:2124/2134 -- skip_premap_detect / premap_detect
// ========================================================================
export function skip_premap_detect(x, y, map) {
    const lev = map.at(x, y);
    if (!lev) return true;
    if (lev.typ === STONE && ((lev.wall_info || lev.flags || 0) !== 0)) return true;
    return false;
}
export function premap_detect(map) {
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            if (skip_premap_detect(x, y, map)) continue;
            const lev = map.at(x, y); if (!lev) continue;
            lev.seenv = 0xFF; lev.waslit = true;
            if (lev.typ === SDOOR) { lev.wall_info = 0; if (lev.flags != null) lev.flags = 0; }
            map_background(map, x, y, 1);
            const b = sobj_at(BOULDER, x, y, map);
            if (b) map_object(b, 1);
        }
    for (const ttmp of (map.traps || [])) { ttmp.tseen = 1; map_trap(ttmp, 1); }
}

// ========================================================================
// cf. detect.c:2294 -- dump_map
// ========================================================================
export function dump_map() { /* dumplog not applicable in JS */ }

// ========================================================================
// cf. detect.c:2356 -- reveal_terrain
// ========================================================================
export async function reveal_terrain(which_subset, player, map, display) {
    const full = !!(which_subset & 0x80);
    if ((player.hallucinating || player.stunned || player.confused) && !full) {
        await You("are too disoriented for this."); return;
    }
    unconstrain_map(player);
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            show_map_spot(x, y, false, map);
    flush_screen(1);
    await pline("Showing terrain only...");
    browse_map(); map_redisplay_stub(); reconstrain_map(player);
}

// Autotranslated from detect.c:94
export function map_redisplay(player) {
  reconstrain_map();
  docrt();
  if (Underwater) under_water(2);
  if (player.uburied) under_ground(2);
}
