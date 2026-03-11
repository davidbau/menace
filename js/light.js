// light.js -- Light source management, vision illumination
// cf. light.c — new_light_source, new_light_core, del_light_source,
//               delete_ls, do_light_sources, show_transient_light,
//               transient_light_cleanup, discard_flashes, find_mid,
//               whereis_mon, save_light_sources, restore_light_sources,
//               light_stats, relink_light_sources, maybe_write_ls,
//               light_sources_sanity_check, write_ls, obj_move_light_source,
//               any_light_source, snuff_light_source, obj_sheds_light,
//               obj_is_burning, obj_split_light_source,
//               obj_merge_light_sources, obj_adjust_light_radius,
//               candle_light_range, arti_light_radius,
//               arti_light_description, wiz_light_sources
//
// light.c manages dynamic light sources during play:
//   new_light_source(): create light source for object or monster.
//   del_light_source(): remove light source when object/monster gone.
//   do_light_sources(): mark temporarily lit locations for vision system.
//   candle_light_range(): calculate candle illumination radius.
//   snuff_light_source(): extinguish light at a location.
//   save/restore_light_sources: persistence (N/A in JS, uses storage.js).

import { COLNO, ROWNO, isok, LS_OBJECT, LS_MONSTER, OBJ_INVENT, OBJ_CONTAINED, OBJ_MINVENT,
         COULD_SEE, TEMP_LIT, MAX_RADIUS } from './const.js';
import {
    CANDELABRUM_OF_INVOCATION, TALLOW_CANDLE, WAX_CANDLE,
    BRASS_LANTERN, OIL_LAMP, MAGIC_LAMP, POT_OIL,
    GOLD_DRAGON_SCALE_MAIL,
} from './objects.js';
import { artifact_light } from './artifact.js';
import { end_burn } from './timeout.js';
import { clear_path, mark_vision_dirty } from './vision.js';

// ---------- Constants ----------
// cf. light.c:41-43
const LSF_SHOW = 0x1;
const LSF_NEEDS_FIXUP = 0x2;

// COULD_SEE, TEMP_LIT, MAX_RADIUS imported from const.js

// ---------- Module State ----------
// Linked list head for all light sources.  In JS we use a simple array.
let light_base = [];

// ---------- Internal helpers ----------

// cf. obj.h:382 — Is_candle
function Is_candle(obj) {
    return obj.otyp === TALLOW_CANDLE || obj.otyp === WAX_CANDLE;
}

// cf. obj.h:397 — ignitable
function ignitable(obj) {
    return obj.otyp === BRASS_LANTERN
        || obj.otyp === OIL_LAMP
        || (obj.otyp === MAGIC_LAMP && (obj.spe || 0) > 0)
        || obj.otyp === CANDELABRUM_OF_INVOCATION
        || obj.otyp === TALLOW_CANDLE
        || obj.otyp === WAX_CANDLE
        || obj.otyp === POT_OIL;
}

// ========================================================================
// cf. light.c:62 — new_light_source(x, y, range, type, id)
// Creates a new light source.
// ========================================================================
export function new_light_source(x, y, range, type, id) {
    return new_light_core(x, y, range, type, id);
}

// cf. light.c:68 [static] — new_light_core
function new_light_core(x, y, range, type, id) {
    if (range > MAX_RADIUS || range < 0
        || (range === 0 && (type !== LS_OBJECT || id != null))) {
        // impossible("new_light_source: illegal range %d", range);
        return null;
    }
    const ls = {
        x, y,
        range,
        type,
        id,       // object or monster reference
        flags: 0,
    };
    light_base.push(ls);
    mark_vision_dirty();
    return ls;
}

// ========================================================================
// cf. light.c:99 — del_light_source(type, id)
// Finds and deletes a light source by type and ID.
// ========================================================================
export function del_light_source(type, id) {
    const idx = light_base.findIndex(ls => {
        if (ls.type !== type) return false;
        return ls.id === id;
    });
    if (idx >= 0) {
        delete_ls(idx);
    } else {
        // impossible("del_light_source: not found type=%d", type);
    }
}

// cf. light.c:141 [static] — delete_ls
function delete_ls(idx) {
    if (idx >= 0 && idx < light_base.length) {
        light_base.splice(idx, 1);
        mark_vision_dirty();
    }
}

// ========================================================================
// cf. light.c:169 — do_light_sources(cs_rows)
// Marks locations temporarily lit via mobile light sources.
// cs_rows is a 2D array [y][x] of visibility flags (Uint8Array per row).
// ========================================================================
export function do_light_sources(cs_rows, map, player) {
    let at_hero_range = 0;

    for (const ls of light_base) {
        ls.flags &= ~LSF_SHOW;

        // Update position from object/monster location
        if (ls.type === LS_OBJECT) {
            if (ls.range === 0) {
                // Camera flash — caller has already set ls.x, ls.y
                ls.flags |= LSF_SHOW;
            } else if (ls.id) {
                // Try to get object location
                const obj = ls.id;
                const loc = get_obj_light_location(obj, map, player);
                if (loc) {
                    ls.x = loc.x;
                    ls.y = loc.y;
                    ls.flags |= LSF_SHOW;
                }
            }
        } else if (ls.type === LS_MONSTER) {
            const mon = ls.id;
            if (mon && mon.mx > 0) {
                ls.x = mon.mx;
                ls.y = mon.my;
                ls.flags |= LSF_SHOW;
            }
        }

        // Optimization: skip duplicate hero-position light sources
        if (player && ls.x === player.x && ls.y === player.y) {
            if (at_hero_range >= ls.range) {
                ls.flags &= ~LSF_SHOW;
            } else {
                at_hero_range = ls.range;
            }
        }

        if (ls.flags & LSF_SHOW) {
            // Walk points in circle and mark TEMP_LIT if visible from center
            const limits = get_circle_limits(ls.range);
            const max_y = Math.min(ls.y + ls.range, ROWNO - 1);
            let y = Math.max(ls.y - ls.range, 0);

            for (; y <= max_y; y++) {
                const row = cs_rows[y];
                if (!row) continue;
                const offset = limits[Math.abs(y - ls.y)] || 0;
                const min_x = Math.max(ls.x - offset, 1);
                const max_x = Math.min(ls.x + offset, COLNO - 1);

                if (player && ls.x === player.x && ls.y === player.y) {
                    // At hero: use COULD_SEE bits already calculated
                    for (let x = min_x; x <= max_x; x++) {
                        if (row[x] & COULD_SEE)
                            row[x] |= TEMP_LIT;
                    }
                } else {
                    for (let x = min_x; x <= max_x; x++) {
                        if ((ls.x === x && ls.y === y)
                            || clear_path(ls.x, ls.y, x, y))
                            row[x] |= TEMP_LIT;
                    }
                }
            }
        }
    }
}

// Helper: get object location for light source tracking
function get_obj_light_location(obj, map, player, depth = 0) {
    if (!obj) return null;
    if (depth > 8) return null;
    if (player && Number.isFinite(player.x) && Number.isFinite(player.y)
        && objectInContainerTree(obj, player.inventory)) {
        return { x: player.x, y: player.y };
    }
    // Object on floor
    if ((obj.where == null || obj.where === 1)
        && typeof obj.ox === 'number' && typeof obj.oy === 'number'
        && obj.ox > 0) {
        return { x: obj.ox, y: obj.oy };
    }
    // Object in hero inventory.
    if (obj.where === OBJ_INVENT) {
        if (player && Number.isFinite(player.x) && Number.isFinite(player.y)) {
            return { x: player.x, y: player.y };
        }
        return null;
    }
    // Object inside another object/container.
    if (obj.where === OBJ_CONTAINED) {
        if (obj.ocontainer) return get_obj_light_location(obj.ocontainer, map, player, depth + 1);
        return null;
    }
    // Object carried by a monster.
    if (obj.where === OBJ_MINVENT) {
        const mon = obj.ocarry;
        if (mon && Number.isFinite(mon.mx) && Number.isFinite(mon.my) && mon.mx > 0) {
            return { x: mon.mx, y: mon.my };
        }
        return null;
    }
    // Fallback for loose objects with map coordinates.
    if (typeof obj.ox === 'number' && typeof obj.oy === 'number' && obj.ox > 0) {
        return { x: obj.ox, y: obj.oy };
    }
    return null;
}

function objectInContainerTree(target, list, depth = 0) {
    if (!target || !Array.isArray(list) || depth > 12) return false;
    for (const obj of list) {
        if (obj === target) return true;
        const cobj = obj?.cobj;
        if (Array.isArray(cobj) && objectInContainerTree(target, cobj, depth + 1)) return true;
    }
    return false;
}

// Circle data for range-limited scans (matches vision.js CIRCLE_DATA/CIRCLE_START)
const CIRCLE_DATA = [
    0,
    1, 1,
    2, 2, 1,
    3, 3, 2, 1,
    4, 4, 4, 3, 2,
    5, 5, 5, 4, 3, 2,
    6, 6, 6, 5, 5, 4, 2,
    7, 7, 7, 6, 6, 5, 4, 2,
    8, 8, 8, 7, 7, 6, 6, 4, 2,
    9, 9, 9, 9, 8, 8, 7, 6, 5, 3,
    10, 10, 10, 10, 9, 9, 8, 7, 6, 5, 3,
    11, 11, 11, 11, 10, 10, 9, 9, 8, 7, 5, 3,
    12, 12, 12, 12, 11, 11, 10, 10, 9, 8, 7, 5, 3,
    13, 13, 13, 13, 12, 12, 12, 11, 10, 10, 9, 7, 6, 3,
    14, 14, 14, 14, 13, 13, 13, 12, 12, 11, 10, 9, 8, 6, 3,
    15, 15, 15, 15, 14, 14, 14, 13, 13, 12, 11, 10, 9, 8, 6, 3,
    16,
];
const CIRCLE_START = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78, 91, 105, 120];

function get_circle_limits(range) {
    if (range < 1 || range > 15) return [0];
    const base = CIRCLE_START[range];
    // Return a subarray view: limits[offset] = CIRCLE_DATA[base + offset]
    return {
        // Access via limits[abs(dy)]
        __proto__: null,
        ...Array.from({ length: range + 1 }, (_, i) => CIRCLE_DATA[base + i]),
    };
}

// ========================================================================
// cf. light.c:257 — show_transient_light(obj, x, y)
// Shows light from a thrown/kicked lit object or camera flash.
// TODO: vision_recalc and monster mtemplit flagging
// ========================================================================
export function show_transient_light(_obj, _x, _y) {
    // TODO: light.c:257 — show_transient_light(): transient object light display
    // Requires vision_recalc() integration and monster mtemplit tracking
}

// ========================================================================
// cf. light.c:330 — transient_light_cleanup()
// Cleans up camera flashes and redraws monsters.
// ========================================================================
export function transient_light_cleanup() {
    discard_flashes();
    // TODO: monster mtemplit cleanup and map_invisible
}

// cf. light.c:360 [static] — discard_flashes()
function discard_flashes() {
    for (let i = light_base.length - 1; i >= 0; i--) {
        if (light_base[i].type === LS_OBJECT && !light_base[i].id) {
            light_base.splice(i, 1);
            mark_vision_dirty();
        }
    }
}

// ========================================================================
// cf. light.c:376 — find_mid(nid, fmflags)
// Finds a monster by its ID number.
// ========================================================================
export function find_mid(nid, fmflags, map, player) {
    const FM_YOU     = 0x01;
    const FM_FMON    = 0x02;
    // const FM_MIGRATE = 0x04;
    // const FM_MYDOGS  = 0x08;

    if ((fmflags & FM_YOU) && nid === 1 && player) {
        return player; // youmonst equivalent
    }
    if ((fmflags & FM_FMON) && map && map.monsters) {
        for (const mtmp of map.monsters) {
            if (!mtmp.dead && mtmp.m_id === nid) return mtmp;
        }
    }
    // TODO: FM_MIGRATE, FM_MYDOGS chains
    return null;
}

// ========================================================================
// cf. light.c:706 — obj_move_light_source(src, dest)
// Changes a light source's object ID from src to dest.
// ========================================================================
export function obj_move_light_source(src, dest) {
    for (const ls of light_base) {
        if (ls.type === LS_OBJECT && ls.id === src) {
            ls.id = dest;
        }
    }
    src.lamplit = false;
    dest.lamplit = true;
}

// ========================================================================
// cf. light.c:719 — any_light_source()
// Returns true if there are any active light sources.
// ========================================================================
export function any_light_source() {
    return light_base.length > 0;
}

// ========================================================================
// cf. light.c:729 — snuff_light_source(x, y)
// Snuffs out burning light sources at a location.
// ========================================================================
export function snuff_light_source(x, y) {
    for (let i = 0; i < light_base.length; i++) {
        const ls = light_base[i];
        if (ls.type === LS_OBJECT && ls.x === x && ls.y === y) {
            const obj = ls.id;
            if (obj && obj_is_burning(obj)) {
                // Sunsword (artifact light) cannot be snuffed by darkness
                if (artifact_light(obj)) continue;
                end_burn(obj, obj.otyp !== MAGIC_LAMP);
                // ls was just removed by end_burn -> del_light_source;
                // only one light source per object, so return
                return;
            }
        }
    }
}

// ========================================================================
// cf. light.c:763 — obj_sheds_light(obj)
// Returns true if object emits any light.
// ========================================================================
// Autotranslated from light.c:762
export function obj_sheds_light(obj) {
  return obj_is_burning(obj);
}

// ========================================================================
// cf. light.c:771 — obj_is_burning(obj)
// Returns true if object is lit and will be snuffed by end_burn().
// ========================================================================
// Autotranslated from light.c:770
export function obj_is_burning(obj) {
  return (obj.lamplit && (ignitable(obj) || artifact_light(obj)));
}

// ========================================================================
// cf. light.c:779 — obj_split_light_source(src, dest)
// Copies light source from src and attaches it to dest (for object splitting).
// ========================================================================
export function obj_split_light_source(src, dest) {
    for (const ls of light_base) {
        if (ls.type === LS_OBJECT && ls.id === src) {
            const new_ls = {
                x: ls.x,
                y: ls.y,
                range: ls.range,
                type: ls.type,
                id: dest,
                flags: ls.flags,
            };
            if (Is_candle(src)) {
                // Split candles may emit less light than original group
                ls.range = candle_light_range(src);
                new_ls.range = candle_light_range(dest);
                mark_vision_dirty();
            }
            light_base.push(new_ls);
            dest.lamplit = true;
            break; // only one light source per object
        }
    }
}

// ========================================================================
// cf. light.c:808 — obj_merge_light_sources(src, dest)
// Merges light sources when objects are combined (candles into candelabrum).
// ========================================================================
export function obj_merge_light_sources(src, dest) {
    // src === dest implies adding candles to candelabrum
    if (src !== dest) {
        end_burn(src, true); // extinguish candles
    }
    for (const ls of light_base) {
        if (ls.type === LS_OBJECT && ls.id === dest) {
            ls.range = candle_light_range(dest);
            mark_vision_dirty();
            break;
        }
    }
}

// ========================================================================
// cf. light.c:826 — obj_adjust_light_radius(obj, new_radius)
// Changes a light source's radius for an object.
// ========================================================================
export function obj_adjust_light_radius(obj, new_radius) {
    for (const ls of light_base) {
        if (ls.type === LS_OBJECT && ls.id === obj) {
            if (new_radius !== ls.range) {
                mark_vision_dirty();
            }
            ls.range = new_radius;
            return;
        }
    }
    // impossible("obj_adjust_light_radius: can't find obj");
}

// ========================================================================
// cf. light.c:843 — candle_light_range(obj)
// Calculates the light range for a candle or candelabrum based on quantity.
// ========================================================================
export function candle_light_range(obj) {
    let radius;

    if (obj.otyp === CANDELABRUM_OF_INVOCATION) {
        // 1..3 candles → range 2; 4..6 → range 3; 7 → range 4
        radius = (obj.spe < 4) ? 2 : (obj.spe < 7) ? 3 : 4;
    } else if (Is_candle(obj)) {
        // Range incremented quadratically
        // 1..3 → range 2; 4..8 → range 3; 9..15 → range 4; etc.
        const n = obj.quan || 1;
        radius = 1;
        while (radius * radius <= n && radius < MAX_RADIUS) {
            radius++;
        }
    } else {
        radius = 3; // lamp's value
    }
    return radius;
}

// ========================================================================
// cf. light.c:881 — arti_light_radius(obj)
// Returns the light radius for a light-emitting artifact.
// ========================================================================
// Autotranslated from light.c:880
export function arti_light_radius(obj, player) {
  let res;
  if (!obj.lamplit || !artifact_light(obj)) return 0;
  res = (obj.blessed ? 3 : !obj.cursed ? 2 : 1);
  if (obj === player.uskin) res = 1;
  else if (obj.otyp === GOLD_DRAGON_SCALE_MAIL) ++res;
  return res;
}

// ========================================================================
// cf. light.c:916 — arti_light_description(obj)
// Returns an adverb describing a lit artifact's light intensity.
// ========================================================================
export function arti_light_description(obj) {
    switch (arti_light_radius(obj)) {
    case 4: return "radiantly";     // blessed gold dragon scale mail
    case 3: return "brilliantly";   // blessed artifact, uncursed gold DSM
    case 2: return "brightly";      // uncursed artifact, cursed gold DSM
    case 1: return "dimly";         // cursed artifact, embedded scales
    default: break;
    }
    return "strangely";
}

// ========================================================================
// cf. light.c:935 — wiz_light_sources()
// Wizard mode: display all active light sources (debug).
// ========================================================================
export function wiz_light_sources() {
    // TODO: wizard mode display
    return light_base.map(ls => ({
        x: ls.x, y: ls.y,
        range: ls.range,
        type: ls.type === LS_OBJECT ? 'obj' : ls.type === LS_MONSTER ? 'mon' : '???',
        flags: ls.flags,
    }));
}

// ========================================================================
// Utility: reset light sources (for level changes / new games)
// ========================================================================
export function reset_light_sources() {
    light_base = [];
}

// ========================================================================
// cf. light.c:606 — light_sources_sanity_check()
// Validates all light source object/monster pointers.
// ========================================================================
export function light_sources_sanity_check() {
    for (const ls of light_base) {
        if (!ls.id && ls.range > 0) {
            // panic("insane light source: no id!");
        }
    }
}

// ========================================================================
// Export the light_base for save/restore and sanity checks
// ========================================================================
export function get_light_base() {
    return light_base;
}
export function set_light_base(base) {
    light_base = base || [];
}
