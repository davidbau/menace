// region.js -- Region effects: gas clouds, force fields, enter/leave callbacks
// cf. region.c — create_region, add_region, remove_region, run_regions,
//                in_out_region, m_in_out_region, update_player_regions,
//                create_gas_cloud, inside_gas_cloud, expire_gas_cloud,
//                region_danger, region_safety, save_regions, rest_regions
//
// C data model: regions[] array of NhRegion structs, each with:
//   bounding box (bx/by/ex/ey), array of NhRect rectangles, monster list,
//   TTL (time-to-live), damage, visible flag, enter/leave/expire/inside
//   callbacks, associated messages.
// NetHack uses regions primarily for gas cloud effects from wands/spells/traps;
//   force fields and msg regions are compile-disabled (#if 0).
//
// JS data model: map.regions[] holds active NhRegion objects at runtime.
//   map.gasClouds[] is still used by sp_lev.js for level-gen cloud records.
//
// JS region object shape:
//   { bounding_box: {lx,ly,hx,hy}, rects: [{lx,ly,hx,hy},...], ttl: number,
//     attach_2_u: bool, attach_2_m: number, enter_msg: string|null,
//     leave_msg: string|null, expire_f: number, enter_f: number,
//     can_enter_f: number, leave_f: number, can_leave_f: number,
//     inside_f: number, player_flags: number, monsters: number[],
//     visible: bool, glyph: number, arg: number }

import { rn1, rn2, rnd, d } from './rng.js';
import { pline, You, You_feel, pline_The, You_see } from './pline.js';
import { isok, ACCESSIBLE, COLNO, ROWNO, M_POISONGAS_OK, POISON_RES } from './const.js';
import { newsym } from './display.js';
import { cansee, block_point, unblock_point, mark_vision_dirty } from './vision.js';
import { nonliving, haseyes, is_silent, resists_poison, canseemon } from './mondata.js';
import { Monnam } from './do_name.js';
import { body_part } from './polyself.js';
import { makeplural } from './objnam.js';
import { m_poisongas_ok, wake_nearto, killed, monkilled, setmangry } from './mon.js';
import { find_mid } from './light.js';
import { is_pool, is_lava } from './dbridge.js';
import { safe_teleds } from './teleport.js';
import { losehp } from './hack.js';
import { dist2 } from './hacklib.js';
import { valid_cloud_pos } from './read.js';
import { S_poisoncloud, S_cloud } from './symbols.js';
import { AD_DRST, M1_BREATHLESS } from './monsters.js';
import { PM_FOG_CLOUD } from './monsters.js';
import { PM_LONG_WORM } from './monsters.js';
import { EYE, LUNG } from './const.js';
import { envFlag } from './runtime_env.js';

const NO_CALLBACK = -1;

// Callback indices (matching C's callbacks[] array)
const INSIDE_GAS_CLOUD = 0;
const EXPIRE_GAS_CLOUD = 1;

// player_flags bits (cf. region.h)
const REG_HERO_INSIDE = 0x01;
const REG_NOT_HEROS   = 0x02;

function hero_inside(r) { return !!(r.player_flags & REG_HERO_INSIDE); }
function heros_fault(r) { return !(r.player_flags & REG_NOT_HEROS); }
function set_hero_inside(r) { r.player_flags |= REG_HERO_INSIDE; }
function clear_hero_inside(r) { r.player_flags &= ~REG_HERO_INSIDE; }
function set_heros_fault(r) { r.player_flags &= ~REG_NOT_HEROS; }
export function clear_heros_fault(r) { r.player_flags |= REG_NOT_HEROS; }

// FM_FMON flag for find_mid
const FM_FMON = 0x02;

function gasCloudTraceEnabled() {
    return envFlag('WEBHACK_GASCLOUD_TRACE');
}

function gasCloudCallerTag() {
    const stack = new Error().stack || '';
    const lines = stack.split('\n');
    for (let i = 2; i < lines.length; i++) {
        const line = String(lines[i] || '').trim();
        if (!line.includes('/region.js')) return line.replace(/^at\s+/, '');
    }
    return 'unknown';
}

function traceGasCloud(msg) {
    if (!gasCloudTraceEnabled()) return;
    console.log(`[GASCLOUD_TRACE] ${msg}`);
}

// ========================================================================
// Helper: get the regions array from the map, initializing if needed
// ========================================================================
function get_regions(map) {
    if (!map.regions) map.regions = [];
    return map.regions;
}

// ========================================================================
// Callback dispatch — maps callback index to function
// ========================================================================
async function dispatch_callback(f_indx, reg, arg, map, player, game) {
    switch (f_indx) {
        case INSIDE_GAS_CLOUD: return await inside_gas_cloud(reg, arg, map, player, game);
        case EXPIRE_GAS_CLOUD: return await expire_gas_cloud(reg, arg, map, player, game);
        default: return true;
    }
}

// ========================================================================
// cf. region.c:53 — inside_rect(rect, x, y): is (x,y) in rectangle?
// ========================================================================
export function inside_rect(r, x, y) {
    return x >= r.lx && x <= r.hx && y >= r.ly && y <= r.hy;
}

// ========================================================================
// cf. region.c:62 — inside_region(reg, x, y): is (x,y) in region?
// ========================================================================
// Autotranslated from region.c:62
export function inside_region(reg, x, y) {
  let i;
  if (reg ===  0 || !inside_rect( (reg.bounding_box), x, y)) return false;
  for (i = 0; i < reg.rects.length; i++) {
    if (inside_rect( (reg.rects[i]), x, y)) return true;
  }
  return false;
}

// ========================================================================
// cf. region.c:78 — create_region(rects, nrect): allocate new region
// ========================================================================
export function create_region(rects, nrect) {
    const reg = {
        bounding_box: { lx: 0, ly: 0, hx: 0, hy: 0 },
        rects: [],
        ttl: -1,
        attach_2_u: false,
        attach_2_m: 0,
        enter_msg: null,
        leave_msg: null,
        expire_f: NO_CALLBACK,
        enter_f: NO_CALLBACK,
        can_enter_f: NO_CALLBACK,
        leave_f: NO_CALLBACK,
        can_leave_f: NO_CALLBACK,
        inside_f: NO_CALLBACK,
        player_flags: REG_NOT_HEROS, // clear_hero_inside + clear_heros_fault
        monsters: [],
        visible: false,
        glyph: 0,
        arg: 0,
    };

    if (nrect > 0 && rects && rects.length > 0) {
        reg.bounding_box = { ...rects[0] };
    } else {
        reg.bounding_box = { lx: COLNO, ly: ROWNO, hx: 0, hy: 0 };
    }

    for (let i = 0; i < nrect && i < rects.length; i++) {
        const r = rects[i];
        if (r.lx < reg.bounding_box.lx) reg.bounding_box.lx = r.lx;
        if (r.ly < reg.bounding_box.ly) reg.bounding_box.ly = r.ly;
        if (r.hx > reg.bounding_box.hx) reg.bounding_box.hx = r.hx;
        if (r.hy > reg.bounding_box.hy) reg.bounding_box.hy = r.hy;
        reg.rects.push({ ...r });
    }

    return reg;
}

// ========================================================================
// cf. region.c:132 — add_rect_to_reg(reg, rect): add rectangle to region
// ========================================================================
export function add_rect_to_reg(reg, rect) {
    reg.rects.push({ ...rect });
    if (reg.bounding_box.lx > rect.lx) reg.bounding_box.lx = rect.lx;
    if (reg.bounding_box.ly > rect.ly) reg.bounding_box.ly = rect.ly;
    if (reg.bounding_box.hx < rect.hx) reg.bounding_box.hx = rect.hx;
    if (reg.bounding_box.hy < rect.hy) reg.bounding_box.hy = rect.hy;
}

// ========================================================================
// cf. region.c:160 — add_mon_to_reg(reg, mon): add monster to region
// ========================================================================
export function add_mon_to_reg(reg, mon) {
    if (mon_in_region(reg, mon)) {
        // Long worms may have multiple segments in a region; silently ignore
        return;
    }
    reg.monsters.push(mon.m_id);
}

// ========================================================================
// cf. region.c:191 — remove_mon_from_reg(reg, mon): remove monster from region
// ========================================================================
export function remove_mon_from_reg(reg, mon) {
  if (!reg || !reg.monsters) return;
  const idx = reg.monsters.indexOf(mon.m_id);
  if (idx >= 0) {
    reg.monsters.splice(idx, 1);
  }
}

// ========================================================================
// cf. region.c:209 — mon_in_region(reg, mon): is monster in region?
// ========================================================================
export function mon_in_region(reg, mon) {
    for (let i = 0; i < reg.monsters.length; i++)
        if (reg.monsters[i] === mon.m_id)
            return true;
    return false;
}

// ========================================================================
// cf. region.c:226 — clone_region(reg): deep clone region structure
// ========================================================================
export function clone_region(reg) {
    if (!reg) return null;
    return {
        ...reg,
        bounding_box: reg.bounding_box ? { ...reg.bounding_box } : { lx: 0, ly: 0, hx: 0, hy: 0 },
        rects: Array.isArray(reg.rects) ? reg.rects.map(r => ({ ...r })) : [],
        monsters: Array.isArray(reg.monsters) ? [...reg.monsters] : [],
    };
}

// ========================================================================
// cf. region.c:283 — add_region(reg): activate a new region
// ========================================================================
export function add_region(reg, map, player) {
    const regions = get_regions(map);
    regions.push(reg);

    // Check for monsters inside the region
    for (let i = reg.bounding_box.lx; i <= reg.bounding_box.hx; i++) {
        for (let j = reg.bounding_box.ly; j <= reg.bounding_box.hy; j++) {
            if (!isok(i, j)) continue;
            let is_inside = false;
            if (inside_region(reg, i, j)) {
                is_inside = true;
                const mtmp = map.monsterAt(i, j);
                if (mtmp) {
                    add_mon_to_reg(reg, mtmp);
                }
            }
            if (reg.visible) {
                if (is_inside) block_point(i, j);
                // newsym for visible regions — cansee check omitted for simplicity
                // as we don't always have fov available here
                newsym(i, j);
            }
        }
    }

    // Check for player
    if (player && inside_region(reg, player.x, player.y))
        set_hero_inside(reg);
    else
        clear_hero_inside(reg);
}

// ========================================================================
// cf. region.c:343 — remove_region(reg): deactivate and free a region
// ========================================================================
export function remove_region(reg, map, player) {
    const regions = get_regions(map);
    const idx = regions.indexOf(reg);
    if (idx < 0) return;

    // Remove from array (swap with last)
    regions[idx] = regions[regions.length - 1];
    regions.pop();

    // Update screen if visible
    reg.ttl = -2; // for visible_region_at
    if (reg.visible) {
        // Pass 1: unblock points
        for (let x = reg.bounding_box.lx; x <= reg.bounding_box.hx; x++) {
            for (let y = reg.bounding_box.ly; y <= reg.bounding_box.hy; y++) {
                if (isok(x, y) && inside_region(reg, x, y)) {
                    // Unblock if the terrain doesn't itself block
                    unblock_point(x, y);
                }
            }
        }
        // Pass 2: update display
        for (let x = reg.bounding_box.lx; x <= reg.bounding_box.hx; x++) {
            for (let y = reg.bounding_box.ly; y <= reg.bounding_box.hy; y++) {
                if (isok(x, y) && inside_region(reg, x, y)) {
                    newsym(x, y);
                }
            }
        }
    }
}

// ========================================================================
// cf. region.c:621 — replace_mon_regions(mon): refresh per-region membership
// ========================================================================
export function replace_mon_regions(mon, map) {
    remove_mon_from_regions(mon, map);
    const regions = get_regions(map);
    for (let i = 0; i < regions.length; i++) {
        if (inside_region(regions[i], mon.mx, mon.my))
            add_mon_to_reg(regions[i], mon);
    }
}

// ========================================================================
// cf. region.c:637 — remove_mon_from_regions(mon): unlink monster from all regions
// ========================================================================
export function remove_mon_from_regions(mon, map) {
    const regions = get_regions(map);
    for (let i = 0; i < regions.length; i++) {
        remove_mon_from_reg(regions[i], mon);
    }
}

// ========================================================================
// cf. region.c:393 — clear_regions(): free all active regions
// ========================================================================
export function clear_regions(map) {
    if (map) map.regions = [];
}

// ========================================================================
// cf. region.c:413 — run_regions(): per-turn region processing
// ========================================================================
export async function run_regions(map, player, game) {
    const regions = get_regions(map);
    let gas_cloud_diss_within = false;
    let gas_cloud_diss_seen = 0;

    // End of life? Do it backward because the array will be modified
    for (let i = regions.length - 1; i >= 0; i--) {
        if (regions[i].ttl === 0) {
            const f_indx = regions[i].expire_f;
            if (f_indx === NO_CALLBACK
                || await dispatch_callback(f_indx, regions[i], null, map, player, game)) {
                remove_region(regions[i], map, player);
            }
        }
    }

    // Process remaining regions
    for (let i = 0; i < regions.length; i++) {
        // Make the region age
        if (regions[i].ttl > 0)
            regions[i].ttl--;

        // Check if player is inside region
        const f_indx = regions[i].inside_f;
        if (f_indx !== NO_CALLBACK && hero_inside(regions[i]))
            await dispatch_callback(f_indx, regions[i], null, map, player, game);

        // Check if any monster is inside region
        if (f_indx !== NO_CALLBACK) {
            for (let j = 0; j < regions[i].monsters.length; j++) {
                const mtmp = find_mid(regions[i].monsters[j], FM_FMON, map, player);
                if (!mtmp || mtmp.dead
                    || await dispatch_callback(f_indx, regions[i], mtmp, map, player, game)) {
                    // The monster died, remove it from list
                    const k = regions[i].monsters.length - 1;
                    regions[i].monsters[j] = regions[i].monsters[k];
                    regions[i].monsters.pop();
                    --j; // current slot has been reused; recheck it
                }
            }
        }
    }

    // Gas cloud dissipation messages are handled within expire_gas_cloud
    // via the game context (simplified from C's global variables)
}

// ========================================================================
// cf. region.c:479 — in_out_region(x, y): player entered/left a region
// ========================================================================
export async function in_out_region(x, y, map, player, game) {
    const regions = get_regions(map);

    // First check if hero can do the move
    for (let i = 0; i < regions.length; i++) {
        if (regions[i].attach_2_u) continue;
        let f_indx = 0;
        if (inside_region(regions[i], x, y)
            ? (!hero_inside(regions[i])
               && (f_indx = regions[i].can_enter_f) !== NO_CALLBACK)
            : (hero_inside(regions[i])
               && (f_indx = regions[i].can_leave_f) !== NO_CALLBACK)) {
            if (!await dispatch_callback(f_indx, regions[i], null, map, player, game))
                return false;
        }
    }

    // Callbacks for the regions hero does leave
    for (let i = 0; i < regions.length; i++) {
        if (regions[i].attach_2_u) continue;
        if (hero_inside(regions[i]) && !inside_region(regions[i], x, y)) {
            clear_hero_inside(regions[i]);
            if (regions[i].leave_msg)
                await pline(regions[i].leave_msg);
            const f_indx = regions[i].leave_f;
            if (f_indx !== NO_CALLBACK)
                await dispatch_callback(f_indx, regions[i], null, map, player, game);
        }
    }

    // Callbacks for the regions hero does enter
    for (let i = 0; i < regions.length; i++) {
        if (regions[i].attach_2_u) continue;
        if (!hero_inside(regions[i]) && inside_region(regions[i], x, y)) {
            set_hero_inside(regions[i]);
            if (regions[i].enter_msg)
                await pline(regions[i].enter_msg);
            const f_indx = regions[i].enter_f;
            if (f_indx !== NO_CALLBACK)
                await dispatch_callback(f_indx, regions[i], null, map, player, game);
        }
    }

    return true;
}

// ========================================================================
// cf. region.c:533 — m_in_out_region(mon, x, y): monster entered/left a region
// ========================================================================
export async function m_in_out_region(mon, x, y, map, player, game) {
    const regions = get_regions(map);

    // First check if mon can do the move
    for (let i = 0; i < regions.length; i++) {
        if (regions[i].attach_2_m === mon.m_id) continue;
        let f_indx = 0;
        if (inside_region(regions[i], x, y)
            ? (!mon_in_region(regions[i], mon)
               && (f_indx = regions[i].can_enter_f) !== NO_CALLBACK)
            : (mon_in_region(regions[i], mon)
               && (f_indx = regions[i].can_leave_f) !== NO_CALLBACK)) {
            if (!await dispatch_callback(f_indx, regions[i], mon, map, player, game))
                return false;
        }
    }

    // Callbacks for the regions mon does leave
    for (let i = 0; i < regions.length; i++) {
        if (regions[i].attach_2_m === mon.m_id) continue;
        if (mon_in_region(regions[i], mon)
            && !inside_region(regions[i], x, y)) {
            remove_mon_from_reg(regions[i], mon);
            const f_indx = regions[i].leave_f;
            if (f_indx !== NO_CALLBACK)
                await dispatch_callback(f_indx, regions[i], mon, map, player, game);
        }
    }

    // Callbacks for the regions mon does enter
    for (let i = 0; i < regions.length; i++) {
        if (regions[i].attach_2_m === mon.m_id) continue;
        if (!mon_in_region(regions[i], mon)
            && inside_region(regions[i], x, y)) {
            add_mon_to_reg(regions[i], mon);
            const f_indx = regions[i].enter_f;
            if (f_indx !== NO_CALLBACK)
                await dispatch_callback(f_indx, regions[i], mon, map, player, game);
        }
    }

    return true;
}

// ========================================================================
// cf. region.c:582 — update_player_regions(): resync player in regions
// ========================================================================
export function update_player_regions(map, player) {
    const regions = get_regions(map);
    for (let i = 0; i < regions.length; i++) {
        if (!regions[i].attach_2_u
            && inside_region(regions[i], player.x, player.y))
            set_hero_inside(regions[i]);
        else
            clear_hero_inside(regions[i]);
    }
}

// ========================================================================
// cf. region.c:598 — update_monster_region(mon): resync monster in regions
// ========================================================================
export function update_monster_region(mon, map) {
    const regions = get_regions(map);
    for (let i = 0; i < regions.length; i++) {
        if (inside_region(regions[i], mon.mx, mon.my)) {
            if (!mon_in_region(regions[i], mon))
                add_mon_to_reg(regions[i], mon);
        } else {
            if (mon_in_region(regions[i], mon))
                remove_mon_from_reg(regions[i], mon);
        }
    }
}

// ========================================================================
// cf. region.c:651 — reg_damg(reg): damage-per-turn for region
// ========================================================================
// Autotranslated from region.c:650
export function reg_damg(reg) {
  let damg = (!reg.visible || reg.ttl === -2) ? 0 : reg.arg.a_int;
  return damg;
}

// ========================================================================
// cf. region.c:660 — any_visible_region(): are there any visible regions?
// ========================================================================
export function any_visible_region(map) {
    const regions = get_regions(map);
    for (let i = 0; i < regions.length; i++) {
        if (!regions[i].visible || regions[i].ttl === -2) continue;
        return true;
    }
    return false;
}

// ========================================================================
// cf. region.c:674 — visible_region_summary(win): wizard-mode region display
// ========================================================================
export function visible_region_summary(map) {
    // Wizard-mode display; simplified for JS (returns array of strings)
    const regions = get_regions(map);
    const lines = [];
    for (let i = 0; i < regions.length; i++) {
        const reg = regions[i];
        if (!reg.visible || reg.ttl === -2) continue;
        const damg = reg.arg;
        const typbuf = damg ? `poison gas (${damg})` : 'vapor';
        const ttlStr = String(reg.ttl + 1).padStart(5);
        lines.push(`${ttlStr}  ${typbuf.padEnd(16)}  @[${reg.bounding_box.lx},${reg.bounding_box.ly}..${reg.bounding_box.hx},${reg.bounding_box.hy}]`);
    }
    return lines;
}

// ========================================================================
// cf. region.c:718 — visible_region_at(x, y): find visible region at position
// ========================================================================
export function visible_region_at(x, y, map) {
    const regions = get_regions(map);
    for (let i = 0; i < regions.length; i++) {
        if (!regions[i].visible || regions[i].ttl === -2) continue;
        if (inside_region(regions[i], x, y))
            return regions[i];
    }
    return null;
}

// ========================================================================
// cf. region.c:732 — show_region(reg, x, y): render region cell
// ========================================================================
export function show_region(reg, x, y, map) {
    // In JS, newsym handles glyph display; gas cloud visibility is managed
    // via the vision system's getMapCloudVisibility and block_point.
    // This is a simplified version.
    newsym(x, y);
}

// ========================================================================
// cf. region.c:899 — region_stats(): wizard memory stats
// ========================================================================
export function region_stats(map) {
    const regions = get_regions(map);
    return { count: regions.length };
}

// ========================================================================
// cf. region.c:740 — save_regions(nhfp): save active regions
// JS runtime equivalent: serialize to plain data for storage layer.
// ========================================================================
export function save_regions(map) {
    const regions = get_regions(map);
    return regions.map(clone_region);
}

// ========================================================================
// cf. region.c:798 — rest_regions(nhfp): restore active regions
// JS runtime equivalent: restore from serialized region data.
// ========================================================================
export function rest_regions(saved, map, player) {
    const restored = Array.isArray(saved) ? saved.map(clone_region).filter(Boolean) : [];
    map.regions = restored;
    for (const reg of restored) {
        reset_region_mids(reg, map, player);
    }
}

// ========================================================================
// cf. region.c:928 — reset_region_mids(reg): bones-file monster ID reconciliation
// N/A for JS (no bones files), but implemented minimally.
// ========================================================================
function reset_region_mids(reg, map, player) {
    let i = 0;
    while (i < reg.monsters.length) {
        const mtmp = find_mid(reg.monsters[i], FM_FMON, map, player);
        if (!mtmp) {
            // Shrink list; order doesn't matter
            reg.monsters[i] = reg.monsters[reg.monsters.length - 1];
            reg.monsters.pop();
        } else {
            i++;
        }
    }
}

// ========================================================================
// cf. region.c:1046 — expire_gas_cloud(reg): gas cloud expiration callback
// ========================================================================
export async function expire_gas_cloud(reg, _arg, map, player, _game) {
    const damage = reg.arg;

    // If it was a thick cloud, it dissipates a little first
    if (damage >= 5) {
        reg.arg = Math.floor(damage / 2);
        reg.ttl = 2;
        return false; // still there
    }

    // The cloud no longer blocks vision — unblock all points
    for (let x = reg.bounding_box.lx; x <= reg.bounding_box.hx; x++) {
        for (let y = reg.bounding_box.ly; y <= reg.bounding_box.hy; y++) {
            if (inside_region(reg, x, y)) {
                unblock_point(x, y);
            }
        }
    }
    // Pass 2: update display
    if (player && !player.blind) {
        for (let x = reg.bounding_box.lx; x <= reg.bounding_box.hx; x++) {
            for (let y = reg.bounding_box.ly; y <= reg.bounding_box.hy; y++) {
                if (inside_region(reg, x, y)) {
                    if (player.x === x && player.y === y) {
                        // gas_cloud_diss_within
                        await pline_The("gas cloud around you dissipates.");
                    } else if (map && cansee(map, player, null, x, y)) {
                        // gas_cloud_diss_seen — simplified
                    }
                }
            }
        }
    }

    return true; // OK, it's gone
}

// ========================================================================
// cf. region.c:1091 — inside_gas_cloud(reg, mtmp): gas cloud per-turn damage
// Returns true if mtmp is killed, false otherwise.
// mtmp === null means the hero.
// ========================================================================
export async function inside_gas_cloud(reg, mtmp, map, player, game) {
    const umon = mtmp || player;
    const dam = reg.arg;

    // Fog clouds maintain gas clouds
    if (reg.ttl < 20 && umon && umon.type && umon.type.id === PM_FOG_CLOUD)
        reg.ttl += 5;

    if (dam < 1) return false;

    if (!mtmp) {
        // Hero
        if (m_poisongas_ok(player) === M_POISONGAS_OK)
            return false;
        if (!player.blind) {
            await You("%s sting.", makeplural(body_part(EYE, player)));
            // make_blinded(1, false) — simplified
            player.blindedTimeout = Math.max(player.blindedTimeout || 0, 1);
        }
        if (!player.hasProp(POISON_RES)) {
            await pline("%s is burning your %s!", "Something",
                  makeplural(body_part(LUNG, player)));
            await You("cough and spit blood!");
            if (map) wake_nearto(player.x, player.y, 2, map);
            let dmg = rnd(dam) + 5;
            // Maybe_Half_Phys — check half physical damage
            if (player.halfPhysDamage) dmg = Math.floor((dmg + 1) / 2);
            // Half_gas_damage (worn towel)
            if (player.halfGasDamage) dmg = Math.floor((dmg + 1) / 2);
            if (game) await losehp(dmg, "gas cloud", 0, player, game.display, game);
            return false;
        } else {
            await You("cough!");
            if (map) wake_nearto(player.x, player.y, 2, map);
            return false;
        }
    } else {
        // A monster is inside the cloud
        if (m_poisongas_ok(mtmp) !== M_POISONGAS_OK) {
            if (!is_silent(mtmp.data || mtmp.type || {})) {
                if ((map && cansee(map, player, null, mtmp.mx, mtmp.my))
                    || dist2(player.x, player.y, mtmp.mx, mtmp.my) < 8)
                    await pline("%s coughs!", Monnam(mtmp));
                if (map) wake_nearto(mtmp.mx, mtmp.my, 2, map);
            }
            if (heros_fault(reg))
                setmangry(mtmp, true, map, player);
            if (haseyes(mtmp.data || mtmp.type || {}) && mtmp.mcansee) {
                mtmp.mblinded = 1;
                mtmp.mcansee = false;
            }
            if (resists_poison(mtmp))
                return false;
            mtmp.mhp -= rnd(dam) + 5;
            if (mtmp.mhp <= 0 || mtmp.dead) {
                if (heros_fault(reg))
                    await killed(mtmp, map, player);
                else
                    monkilled(mtmp, "gas cloud", AD_DRST, map, player);
                if (mtmp.mhp <= 0 || mtmp.dead) {
                    return true; // not lifesaved
                }
            }
        }
    }
    return false;
}

// ========================================================================
// cf. region.c:1168 — is_hero_inside_gas_cloud(): player in any gas cloud?
// ========================================================================
function is_hero_inside_gas_cloud(map) {
    const regions = get_regions(map);
    for (let i = 0; i < regions.length; i++) {
        if (hero_inside(regions[i])
            && regions[i].inside_f === INSIDE_GAS_CLOUD)
            return true;
    }
    return false;
}

// ========================================================================
// cf. region.c:1182 — make_gas_cloud(cloud, damage, inside_cloud):
//   gas cloud common initialization
// ========================================================================
async function make_gas_cloud(cloud, damage, inside_cloud, map, player, game) {
    if (!game?.in_mklev && !game?.mon_moving)
        set_heros_fault(cloud);
    cloud.inside_f = INSIDE_GAS_CLOUD;
    cloud.expire_f = EXPIRE_GAS_CLOUD;
    cloud.arg = damage;
    cloud.visible = true;
    // glyph not directly used in JS rendering, but stored for parity
    cloud.glyph = damage ? S_poisoncloud : S_cloud;
    add_region(cloud, map, player);

    if (!game?.in_mklev && !inside_cloud && is_hero_inside_gas_cloud(map)) {
        await You("are enveloped in a cloud of %s!",
            damage ? "noxious gas" : "steam");
    }
}

// valid_cloud_pos imported from read.js

// ========================================================================
// cf. region.c:1213 — create_gas_cloud(x, y, cloudsize, damage): BFS gas cloud
// ========================================================================
const MAX_CLOUD_SIZE = 150;

export async function create_gas_cloud(x, y, cloudsize, damage, map, player, game) {
    traceGasCloud(
        `enter step=${Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex + 1 : '?'} `
        + `xy=${x},${y} size=${cloudsize} dmg=${damage} mon_moving=${game?.mon_moving ? 1 : 0} `
        + `in_mklev=${game?.in_mklev ? 1 : 0} caller=${gasCloudCallerTag()}`
    );
    const xcoords = [x];
    const ycoords = [y];
    let newidx = 1;
    const inside_cloud = is_hero_inside_gas_cloud(map);

    // Single-point harmless cloud on hero — suppress message
    let suppress = false;
    if (!game?.mon_moving && player && player.x === x && player.y === y
        && cloudsize === 1
        && (!damage || (damage && m_poisongas_ok(player) === M_POISONGAS_OK)))
        suppress = true;

    if (cloudsize > MAX_CLOUD_SIZE) cloudsize = MAX_CLOUD_SIZE;

    for (let curridx = 0; curridx < newidx; curridx++) {
        if (newidx >= cloudsize) break;
        const xx = xcoords[curridx];
        const yy = ycoords[curridx];

        // Fisher-Yates shuffle of 4 cardinal directions
        const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
        for (let i = 4; i > 0; --i) {
            const swapidx = rn2(i);
            const tmp = dirs[swapidx];
            dirs[swapidx] = dirs[i - 1];
            dirs[i - 1] = tmp;
        }

        let nvalid = 0;
        for (let i = 0; i < 4; ++i) {
            const dx = dirs[i].x, dy = dirs[i].y;
            let isunpicked = true;

            if (valid_cloud_pos(xx + dx, yy + dy, map)) {
                nvalid++;
                for (let j = 0; j < newidx; ++j) {
                    if (xcoords[j] === xx + dx && ycoords[j] === yy + dy) {
                        isunpicked = false;
                        break;
                    }
                }
                if (nvalid === 4 && !rn2(2))
                    continue;

                if (isunpicked) {
                    xcoords[newidx] = xx + dx;
                    ycoords[newidx] = yy + dy;
                    newidx++;
                }
            }
            if (newidx >= cloudsize) break;
        }
    }

    const cloud = create_region(null, 0);
    for (let i = 0; i < newidx; ++i) {
        add_rect_to_reg(cloud, { lx: xcoords[i], ly: ycoords[i],
                                  hx: xcoords[i], hy: ycoords[i] });
    }
    cloud.ttl = rn1(3, 4);
    // If cloud was constrained, give it more time
    cloud.ttl = Math.floor((cloud.ttl * cloudsize) / newidx);
    traceGasCloud(
        `built step=${Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex + 1 : '?'} `
        + `xy=${x},${y} req=${cloudsize} actual=${newidx} ttl=${cloud.ttl} dmg=${damage}`
    );

    await make_gas_cloud(cloud, damage, suppress || inside_cloud, map, player, game);
    traceGasCloud(
        `done step=${Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex + 1 : '?'} `
        + `xy=${x},${y} actual=${newidx} ttl=${cloud.ttl} dmg=${damage}`
    );
    return cloud;
}

// ========================================================================
// cf. region.c:1313 — create_gas_cloud_selection(sel, damage): selection-based
// ========================================================================
export async function create_gas_cloud_selection(sel, damage, map, player, game) {
    const inside_cloud = is_hero_inside_gas_cloud(map);
    const cloud = create_region(null, 0);

    // sel should have a bounds or coords
    if (sel && sel.coords) {
        for (const c of sel.coords) {
            add_rect_to_reg(cloud, { lx: c.x, ly: c.y, hx: c.x, hy: c.y });
        }
    }

    await make_gas_cloud(cloud, damage, inside_cloud, map, player, game);
    return cloud;
}

// ========================================================================
// cf. region.c:1341 — region_danger(): is player in a dangerous region?
// ========================================================================
export function region_danger(map, player) {
    if (!map || !player) return false;
    const regions = get_regions(map);
    let n = 0;

    for (let i = 0; i < regions.length; i++) {
        if (!hero_inside(regions[i])) continue;
        const f_indx = regions[i].inside_f;
        if (f_indx === INSIDE_GAS_CLOUD) {
            const mdat = player.type || {};
            if (nonliving(mdat) || (mdat.mflags1 && (mdat.mflags1 & M1_BREATHLESS)))
                continue;
            if (player.hasProp(POISON_RES)) continue;
            ++n;
        }
    }
    return n > 0;
}

// ========================================================================
// cf. region.c:1368 — region_safety(): mitigate region dangers after prayer
// ========================================================================
export async function region_safety(map, player, game) {
    if (!map || !player) return;
    const regions = get_regions(map);
    let r = null;
    let n = 0;

    for (let i = 0; i < regions.length; i++) {
        if (!hero_inside(regions[i])) continue;
        const f_indx = regions[i].inside_f;
        if (f_indx === INSIDE_GAS_CLOUD) {
            if (!n++ && regions[i].ttl >= 0)
                r = regions[i];
        }
    }

    if (n > 1 || (n === 1 && !r)) {
        // Multiple overlapping cloud regions or non-expiring one
        if (game) await safe_teleds(0, game);
        if (region_danger(map, player)) {
            // Grant temporary breathlessness
            // set_itimeout(&HMagical_breathing, d(4,4)+4)
            const dur = d(4, 4) + 4;
            if (player.uprops) {
                // Simplified: set breathless timeout
                player.breathlessTimeout = dur;
            }
            await You_feel("able to breathe.");
        }
    } else if (r) {
        remove_region(r, map, player);
        await pline_The("gas cloud enveloping you dissipates.");
    } else {
        await pline_The("gas cloud has dissipated.");
    }

    // Maybe cure blindness too
    if ((player.blindedTimeout || 0) === 1) {
        player.blindedTimeout = 0;
        player.blind = false;
        mark_vision_dirty();
    }
}

// cf. region.c:262 — free_region: JS GC handles memory; just null fields
export function free_region(reg) {
  if (reg) {
    reg.rects = null;
    reg.monsters = null;
    reg.enter_msg = null;
    reg.leave_msg = null;
  }
}
