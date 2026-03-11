// worm.js -- Long worm segment mechanics
// cf. worm.c -- worm tail growth, movement, cutting, and segment bookkeeping
//
// Data model: Each long worm head has a `wormno` (1..MAX_NUM_WORMS-1).
// Three module-level arrays indexed by wormno:
//   wtails[wormno] -- linked list start (points to tail segment)
//   wheads[wormno] -- linked list end (dummy segment co-located with head)
//   wgrowtime[wormno] -- move count when worm next grows
// Segments are wseg objects: { nseg, wx, wy }.
// The dummy head segment is NOT displayed; only wtails..wheads-1 are shown.

import { rn2, rnd, rn1, d } from './rng.js';
import { pline, impossible, You } from './pline.js';
import { newsym } from './display.js';
import { isok, xdir, ydir, N_DIRS, NORMAL_SPEED, COLNO, ROWNO } from './const.js';
import { mcalcmove } from './mon.js';
import { mon_nam, Monnam } from './do_name.js';
import { s_suffix, distmin, distu, plur } from './hacklib.js';
import { PM_LONG_WORM, mons } from './monsters.js';
import { goodpos } from './teleport.js';
import { cansee } from './vision.js';

// C serialization stubs (JS uses storage.js, not binary save files)
function release_data() { return false; }
function update_file() { return false; }
function Sfo_int() {}
function Sfo_coordxy() {}
function Sfo_long() {}

const MAX_NUM_WORMS = 32;
const MHPMAX = 500;

// Module-level worm state arrays (indexed by wormno 0..MAX_NUM_WORMS-1)
const wheads = new Array(MAX_NUM_WORMS).fill(null);
const wtails = new Array(MAX_NUM_WORMS).fill(null);
const wgrowtime = new Array(MAX_NUM_WORMS).fill(0);

// Segment position map: "x,y" -> worm monst, for place_worm_seg/remove_monster
// This mirrors C's level.monsters[x][y] for worm segments only.
const segmentMap = new Map();

function newseg() {
    return { nseg: null, wx: 0, wy: 0 };
}

// --- Segment position tracking ---
// C ref: rm.h place_worm_seg(m, x, y) = level.monsters[x][y] = m
function place_worm_seg_on_map(worm, x, y) {
    segmentMap.set(x + ',' + y, worm);
}

// C ref: rm.h remove_monster(x, y) = level.monsters[x][y] = NULL
// For worm segments only (not the head monster itself)
function remove_monster_seg(x, y) {
    segmentMap.delete(x + ',' + y);
}

// m_at for worm segments: checks segment map then regular map monsters
function m_at(map, x, y) {
    // First check segment map (worm tail segments)
    var segMon = segmentMap.get(x + ',' + y);
    if (segMon && segMon.mhp > 0) return segMon;
    // Then check regular map monsters
    if (map) return map.monsterAt(x, y);
    return null;
}

// C-faithful m_at-style lookup for callers outside worm.js.
export function monsterAtWithSegments(map, x, y) {
    return m_at(map, x, y);
}

// ========================================================================
// cf. worm.c:96 -- get_wormno(): find an unused worm tail slot
// ========================================================================
// Autotranslated from worm.c:95
export function get_wormno() {
  let new_wormno = 1;
  while (new_wormno < MAX_NUM_WORMS) {
    if (!wheads[new_wormno]) return new_wormno;
    new_wormno++;
  }
  return 0;
}

// ========================================================================
// cf. worm.c:120 -- initworm(worm, wseg_count)
// ========================================================================
// Autotranslated from worm.c:119
export function initworm(worm, wseg_count) {
  let seg, new_tail = create_worm_tail(wseg_count), wnum = worm.wormno;
  if (new_tail) {
    wtails[wnum] = new_tail;
    for (seg = new_tail; seg.nseg; seg = seg.nseg) {
      continue;
    }
    wheads[wnum] = seg;
  }
  else { wtails[wnum] = wheads[wnum] = seg = newseg(); seg.nseg =  0; }
  seg.wx = worm.mx;
  seg.wy = worm.my;
  wgrowtime[wnum] = 0;
}

// ========================================================================
// cf. worm.c:146 [static] -- toss_wsegs(curr, display_update, map)
// ========================================================================
export function toss_wsegs(curr, display_update, map) {
    while (curr) {
        var nxtseg = curr.nseg;

        // remove from map; need to check curr.wx for genocided while migrating
        if (curr.wx) {
            remove_monster_seg(curr.wx, curr.wy);

            if (display_update)
                newsym(curr.wx, curr.wy);
        }

        // In JS, garbage collection handles deallocation
        curr.nseg = null;
        curr = nxtseg;
    }
}

// ========================================================================
// cf. worm.c:175 [static] -- shrink_worm(wnum, map)
// ========================================================================
export function shrink_worm(wnum, map) {
    if (wtails[wnum] === wheads[wnum])
        return; // no tail

    var seg = wtails[wnum];
    wtails[wnum] = seg.nseg;
    seg.nseg = null;
    toss_wsegs(seg, true, map);
}

// ========================================================================
// cf. worm.c:196 -- worm_move(worm, map, game)
// ========================================================================
export function worm_move(worm, map, game) {
    var wnum = worm.wormno;
    var moves = game ? (game.turnCount + 1) : 0; // C's svm.moves

    // Place a segment at the old worm head position
    var seg = wheads[wnum];
    place_worm_seg_on_map(worm, seg.wx, seg.wy);
    newsym(seg.wx, seg.wy);

    // Create a new dummy segment head at current worm position
    var new_seg = newseg();
    new_seg.wx = worm.mx;
    new_seg.wy = worm.my;
    new_seg.nseg = null;
    seg.nseg = new_seg;
    wheads[wnum] = new_seg;

    if (wgrowtime[wnum] <= moves) {
        var whplimit, whpcap, prev_mhp;
        var wsegs = count_wsegs(worm);

        // Set up for the next time to grow
        if (!wgrowtime[wnum]) {
            // New worm; usually grow a tail segment on its next turn
            wgrowtime[wnum] = moves + rnd(5);
        } else {
            var mmove = mcalcmove(worm, false);
            var incr = rn1(10, 2); // 2..12
            incr = Math.floor((incr * NORMAL_SPEED) / Math.max(mmove, 1));
            wgrowtime[wnum] = moves + incr;
        }

        // Increase HP based on number of segments
        whplimit = !worm.m_lev ? 4 : (8 * worm.m_lev);
        // wsegs includes the hidden segment co-located with the head
        if (wsegs > 33) {
            whplimit += 2 * (wsegs - 33);
            wsegs = 33;
        }
        if (wsegs > 22) {
            whplimit += 4 * (wsegs - 22);
            wsegs = 22;
        }
        if (wsegs > 11) {
            whplimit += 6 * (wsegs - 11);
            wsegs = 11;
        }
        whplimit += 8 * wsegs;
        if (whplimit > MHPMAX)
            whplimit = MHPMAX;

        prev_mhp = worm.mhp;
        worm.mhp += d(2, 2);
        whpcap = Math.max(whplimit, worm.mhpmax);
        if (worm.mhp < whpcap) {
            if (worm.mhp > whplimit)
                worm.mhp = Math.max(prev_mhp, whplimit);
            if (worm.mhp > worm.mhpmax)
                worm.mhpmax = worm.mhp;
        } else {
            if (worm.mhp > worm.mhpmax)
                worm.mhp = worm.mhpmax;
        }
    } else {
        // Worm doesn't grow, so last segment goes away
        shrink_worm(wnum, map);
    }
}

// ========================================================================
// cf. worm.c:288 -- worm_nomove(worm, map)
// ========================================================================
export function worm_nomove(worm, map) {
    shrink_worm(worm.wormno, map);

    if (worm.mhp > count_wsegs(worm)) {
        worm.mhp -= d(2, 2);
        if (worm.mhp < 1)
            worm.mhp = 1;
    }
}

// ========================================================================
// cf. worm.c:308 -- wormgone(worm, map)
// ========================================================================
export function wormgone(worm, map) {
    var wnum = worm.wormno;

    if (!wnum)
        impossible("wormgone: wormno is 0");

    worm.wormno = 0;

    // This removes the real monster from its position too (hidden tail segment)
    toss_wsegs(wtails[wnum], true, map);

    wheads[wnum] = wtails[wnum] = null;
    wgrowtime[wnum] = 0;

    // Clear polymorph-proof flag
    if (worm.data === mons[PM_LONG_WORM]
        && worm.mcorpsenm != null && worm.mcorpsenm >= 0) {
        worm.mcorpsenm = -1; // NON_PM
    }
}

// ========================================================================
// cf. worm.c:344 -- wormhitu(worm, map, player, display, game, mattacku)
// ========================================================================
export function wormhitu(worm, map, player, display, game, mattacku) {
    var wnum = worm.wormno;

    for (var seg = wtails[wnum]; seg !== wheads[wnum]; seg = seg.nseg) {
        if (distu(player, seg.wx, seg.wy) < 3) {
            if (mattacku && mattacku(worm, player, display, game))
                return 1; // passive ability killed the worm
        }
    }
    return 0;
}

// ========================================================================
// cf. worm.c:373 -- cutworm(worm, x, y, cuttier, map, player, game)
// ========================================================================
export async function cutworm(worm, x, y, cuttier, map, player, game) {
    var wnum = worm.wormno;

    if (!wnum) return;

    if (x === worm.mx && y === worm.my) return; // hit on head

    // Cutting goes best with a cuttier weapon
    var cut_chance = rnd(20);
    if (cuttier) cut_chance += 10;

    if (cut_chance < 17) return;

    // Find the segment that was attacked
    var curr = wtails[wnum];
    while (curr.wx !== x || curr.wy !== y) {
        curr = curr.nseg;
        if (!curr) {
            impossible("cutworm: no segment at (%d,%d)", x, y);
            return;
        }
    }

    // If this is the tail segment, worm just loses it
    if (curr === wtails[wnum]) {
        shrink_worm(wnum, map);
        return;
    }

    // Split the worm
    var new_tail = wtails[wnum];
    wtails[wnum] = curr.nseg;
    curr.nseg = null;

    // Old worm must be at least level 3 to produce a new worm
    var new_worm = null;
    var new_wnum = (worm.m_lev >= 3 && !rn2(3)) ? get_wormno() : 0;
    if (new_wnum) {
        remove_monster_seg(x, y);
        // clone_mon() creates a duplicate monster at (x, y)
        if (game && typeof game.clone_mon === 'function') {
            new_worm = game.clone_mon(worm, x, y);
        }
    }

    // Sometimes the tail end dies
    if (!new_worm) {
        place_worm_seg_on_map(worm, x, y);
        var context = (game && game.svc && game.svc.context) || game?.context || {};
        if (context.mon_moving) {
            // canspotmon check simplified
            await pline("Part of %s tail has been cut off.", s_suffix(mon_nam(worm)));
        } else {
            await You("cut part of the tail off of %s.", mon_nam(worm));
        }
        toss_wsegs(new_tail, true, map);
        if (worm.mhp > 1)
            worm.mhp = Math.floor(worm.mhp / 2);
        return;
    }

    new_worm.wormno = new_wnum;
    new_worm.mcloned = 0;

    // Devalue monster level of both halves
    worm.m_lev = Math.max(worm.m_lev - 2, 3);
    new_worm.m_lev = worm.m_lev;

    // Calculate lower-level mhp
    new_worm.mhpmax = new_worm.mhp = d(new_worm.m_lev, 8);
    worm.mhpmax = d(worm.m_lev, 8);
    if (worm.mhpmax < worm.mhp)
        worm.mhp = worm.mhpmax;

    wtails[new_wnum] = new_tail;
    wheads[new_wnum] = curr;
    wgrowtime[new_wnum] = 0;

    // Place the new monster at all segment locations
    place_wsegs(new_worm, worm, map);

    var ctx = (game && game.svc && game.svc.context) || game?.context || {};
    if (ctx.mon_moving)
        await pline("%s is cut in half.", Monnam(worm));
    else
        await You("cut %s in half.", mon_nam(worm));
}

// ========================================================================
// cf. worm.c:487 -- see_wsegs(worm, map)
// ========================================================================
// Autotranslated from worm.c:486
export function see_wsegs(worm) {
  let curr = wtails[worm.wormno];
  while (curr !== wheads[worm.wormno]) {
    newsym(curr.wx, curr.wy);
    curr = curr.nseg;
  }
}

// ========================================================================
// cf. worm.c:503 -- detect_wsegs(worm, use_detection_glyph, map)
// ========================================================================
export function detect_wsegs(worm, use_detection_glyph, map) {
    var curr = wtails[worm.wormno];

    while (curr !== wheads[worm.wormno]) {
        // In a full implementation, this would use show_glyph with
        // detected_monnum_to_glyph/petnum_to_glyph/monnum_to_glyph.
        // For now, just make segments visible via newsym.
        newsym(curr.wx, curr.wy);
        curr = curr.nseg;
    }
}

// ========================================================================
// cf. worm.c:615 -- place_wsegs(worm, oldworm, map)
// ========================================================================
export function place_wsegs(worm, oldworm, map) {
    var curr = wtails[worm.wormno];

    while (curr !== wheads[worm.wormno]) {
        var x = curr.wx;
        var y = curr.wy;
        var mtmp = m_at(map, x, y);

        if (oldworm && mtmp === oldworm)
            remove_monster_seg(x, y);
        else if (mtmp)
            impossible("placing worm seg <%d,%d> over another mon", x, y);
        else if (oldworm)
            impossible("replacing worm seg <%d,%d> on empty spot", x, y);

        place_worm_seg_on_map(worm, x, y);
        curr = curr.nseg;
    }
    // Head segment is co-located with worm itself so not placed on the map
    curr.wx = worm.mx;
    curr.wy = worm.my;
}

// ========================================================================
// cf. worm.c:639 -- sanity_check_worm(worm, map) (debug only)
// ========================================================================
export function sanity_check_worm(worm, map) {
    if (!worm) {
        impossible("worm_sanity: null monster!");
        return;
    }
    if (!worm.wormno) {
        impossible("worm_sanity: not a worm!");
        return;
    }

    var wnum = worm.wormno;
    if (!wtails[wnum] || !wheads[wnum]) {
        impossible("wormno %d is set without proper tail", wnum);
        return;
    }
    // If worm is migrating, can't check segments against map
    if (!worm.mx) return;

    var curr = wtails[wnum];
    while (curr !== wheads[wnum]) {
        var x = curr.wx;
        var y = curr.wy;
        if (!isok(x, y))
            impossible("worm seg not isok <%d,%d>", x, y);
        else if (m_at(map, x, y) !== worm)
            impossible("mon at seg location is not worm");

        curr = curr.nseg;
    }
}

// ========================================================================
// cf. worm.c:714 -- remove_worm(worm, map)
// ========================================================================
export function remove_worm(worm, map) {
    var curr = wtails[worm.wormno];

    while (curr) {
        if (curr.wx) {
            remove_monster_seg(curr.wx, curr.wy);
            newsym(curr.wx, curr.wy);
            curr.wx = 0;
        }
        curr = curr.nseg;
    }
}

// ========================================================================
// cf. worm.c:738 -- place_worm_tail_randomly(worm, x, y, map, player)
// ========================================================================
export function place_worm_tail_randomly(worm, x, y, map, player) {
    var wnum = worm.wormno;
    var curr = wtails[wnum];
    var ox = x;
    var oy = y;

    if (wnum && (!wtails[wnum] || !wheads[wnum])) {
        impossible("place_worm_tail_randomly: wormno is set without a tail!");
        return;
    }
    if (wtails[wnum] === wheads[wnum]) {
        // Single segment, co-located with worm
        if (curr.wx && (curr.wx !== worm.mx || curr.wy !== worm.my)) {
            impossible(
                "place_worm_tail_randomly: tail segment at <%d,%d>, worm at <%d,%d>",
                curr.wx, curr.wy, worm.mx, worm.my);
            if (m_at(map, curr.wx, curr.wy) === worm)
                remove_monster_seg(curr.wx, curr.wy);
        }
        curr.wx = worm.mx;
        curr.wy = worm.my;
        return;
    }
    // Remove head segment from map in case we call toss_wsegs
    wheads[wnum].wx = wheads[wnum].wy = 0;

    var new_tail;
    wheads[wnum] = new_tail = curr;
    curr = curr.nseg;
    new_tail.nseg = null;
    new_tail.wx = x;
    new_tail.wy = y;

    while (curr) {
        // C ref: rnd_nextto_goodpos(&nx, &ny, worm)
        var result = _rnd_nextto_goodpos(map, worm, ox, oy, player);
        if (result) {
            var nx = result.x;
            var ny = result.y;
            place_worm_seg_on_map(worm, nx, ny);
            curr.wx = ox = nx;
            curr.wy = oy = ny;
            wtails[wnum] = curr;
            curr = curr.nseg;
            wtails[wnum].nseg = new_tail;
            new_tail = wtails[wnum];
            newsym(nx, ny);
        } else {
            // Truncate -- no place for rest of it
            toss_wsegs(curr, false, map);
            curr = null;
        }
    }
}

// ========================================================================
// cf. trap.c rnd_nextto_goodpos() -- pick random adjacent goodpos
// Returns { x, y } or null if no valid position found.
// ========================================================================
function _rnd_nextto_goodpos(map, mtmp, x, y, player) {
    var dirs = [];
    var i, j, k;
    for (i = 0; i < N_DIRS; i++) dirs[i] = i;

    // Fisher-Yates shuffle matching C's rn2() consumption order
    for (i = N_DIRS; i > 0; i--) {
        j = rn2(i);
        k = dirs[j];
        dirs[j] = dirs[i - 1];
        dirs[i - 1] = k;
    }

    for (i = 0; i < N_DIRS; i++) {
        var nx = x + xdir[dirs[i]];
        var ny = y + ydir[dirs[i]];
        if (goodpos(nx, ny, mtmp, 0, map, player)) {
            return { x: nx, y: ny };
        }
    }
    return null;
}

// cf. worm.c:803 [#if 0] — random_dir(x, y, &nx, &ny)
// Kept as utility for CODEMATCH surface completeness; returns {x,y}.
export function random_dir(x, y) {
    let nx = x + (x > 1
        ? (x < COLNO - 1 ? (rn2(3) - 1) : -rn2(2))
        : rn2(2));
    let ny;
    if (nx !== x) {
        ny = y + (y > 0
            ? (y < ROWNO - 1 ? (rn2(3) - 1) : -rn2(2))
            : rn2(2));
    } else {
        ny = y + (y > 0
            ? (y < ROWNO - 1 ? (rn2(2) ? 1 : -1) : -1)
            : 1);
    }
    return { x: nx, y: ny };
}

// ========================================================================
// cf. worm.c:827 -- size_wseg(worm): segment memory accounting
// ========================================================================
// Autotranslated from worm.c:826
export function size_wseg(worm) {
  return  (count_wsegs(worm) * 8); // sizeof(wseg) placeholder for memory accounting
}

// ========================================================================
// cf. worm.c:836 -- count_wsegs(mtmp): count worm body segments
// ========================================================================
// Autotranslated from worm.c:835
export function count_wsegs(mtmp) {
  let i = 0, curr;
  if (mtmp.wormno) {
    for (curr = wtails[mtmp.wormno].nseg; curr; curr = curr.nseg) {
      i++;
    }
  }
  return i;
}

// ========================================================================
// cf. worm.c:852 [static] -- create_worm_tail(num_segs)
// ========================================================================
// Autotranslated from worm.c:851
export function create_worm_tail(num_segs) {
  let i = 0, new_tail, curr;
  if (!num_segs) return  0;
  new_tail = curr = newseg();
  curr.nseg =  0;
  curr.wx = 0;
  curr.wy = 0;
  while (i < num_segs) {
    curr.nseg = newseg();
    curr = curr.nseg;
    curr.nseg =  0;
    curr.wx = 0;
    curr.wy = 0;
    i++;
  }
  return new_tail;
}

// ========================================================================
// cf. worm.c:883 -- worm_known(worm, map, player, fov)
// ========================================================================
// Autotranslated from worm.c:882
export function worm_known(worm, map, player, fov) {
  if (!worm || !worm.wormno) return false;
  let curr = wtails[worm.wormno];
  while (curr) {
    if (cansee(map, player, fov, curr.wx, curr.wy)) return true;
    curr = curr.nseg;
  }
  return false;
}

// ========================================================================
// cf. worm.c:898 -- worm_cross(x1, y1, x2, y2, map)
// ========================================================================
export function worm_cross(x1, y1, x2, y2, map) {
    if (distmin(x1, y1, x2, y2) !== 1) {
        impossible("worm_cross checking for non-adjacent location?");
        return false;
    }
    // Only relevant for diagonal moves
    if (x1 === x2 || y1 === y2)
        return false;

    // Is the same monster at <x1,y2> and at <x2,y1>?
    var worm = m_at(map, x1, y2);
    if (!worm || m_at(map, x2, y1) !== worm)
        return false;

    // Same monster at both adjacent spots -- must be a worm;
    // figure out if the two spots are occupied by consecutive segments
    if (!worm.wormno) return false;
    for (var curr = wtails[worm.wormno]; curr; curr = curr.nseg) {
        var wnxt = curr.nseg;
        if (!wnxt) break;

        if (curr.wx === x1 && curr.wy === y2)
            return (wnxt.wx === x2 && wnxt.wy === y1);
        if (curr.wx === x2 && curr.wy === y1)
            return (wnxt.wx === x1 && wnxt.wy === y2);
    }
    return false;
}

// ========================================================================
// cf. worm.c:946 -- wseg_at(worm, x, y, map)
// ========================================================================
export function wseg_at(worm, x, y, map) {
    var res = 0;

    if (worm && worm.wormno && m_at(map, x, y) === worm) {
        var i = 0;
        var n;
        var curr;
        for (curr = wtails[worm.wormno]; curr; curr = curr.nseg) {
            if (curr.wx === x && curr.wy === y)
                break;
            i++;
        }
        for (n = i; curr; curr = curr.nseg)
            n++;
        res = n - i;
    }
    return res;
}

// ========================================================================
// cf. worm.c:968 -- flip_worm_segs_vertical(worm, miny, maxy)
// ========================================================================
// Autotranslated from worm.c:967
export function flip_worm_segs_vertical(worm, miny, maxy) {
  let curr = wtails[worm.wormno];
  while (curr) {
    curr.wy = (maxy - curr.wy + miny);
    curr = curr.nseg;
  }
}

// ========================================================================
// cf. worm.c:979 -- flip_worm_segs_horizontal(worm, minx, maxx)
// ========================================================================
// Autotranslated from worm.c:978
export function flip_worm_segs_horizontal(worm, minx, maxx) {
  let curr = wtails[worm.wormno];
  while (curr) {
    curr.wx = (maxx - curr.wx + minx);
    curr = curr.nseg;
  }
}

// ========================================================================
// cf. worm.c:990 -- redraw_worm(worm, map)
// ========================================================================
// Autotranslated from worm.c:989
export function redraw_worm(worm) {
  let curr = wtails[worm.wormno];
  while (curr) {
    newsym(curr.wx, curr.wy);
    curr = curr.nseg;
  }
}

// ========================================================================
// Reset worm state (for new game)
// ========================================================================
export function reset_worm_state() {
    for (var i = 0; i < MAX_NUM_WORMS; i++) {
        wheads[i] = null;
        wtails[i] = null;
        wgrowtime[i] = 0;
    }
    segmentMap.clear();
}

// ========================================================================
// Serialization helpers for save/restore (JS equivalent of save_worm/rest_worm)
// ========================================================================
export function save_worm_state() {
    var state = { segs: [], growtime: [] };
    for (var i = 1; i < MAX_NUM_WORMS; i++) {
        var segments = [];
        for (var curr = wtails[i]; curr; curr = curr.nseg)
            segments.push({ wx: curr.wx, wy: curr.wy });
        state.segs.push(segments);
    }
    for (var j = 0; j < MAX_NUM_WORMS; j++)
        state.growtime.push(wgrowtime[j]);
    return state;
}

export function restore_worm_state(state) {
    if (!state) return;
    for (var i = 1; i < MAX_NUM_WORMS; i++) {
        var segments = state.segs[i - 1];
        if (!segments || segments.length === 0) {
            wtails[i] = wheads[i] = null;
            continue;
        }
        var curr = null;
        for (var j = 0; j < segments.length; j++) {
            var temp = newseg();
            temp.nseg = null;
            temp.wx = segments[j].wx;
            temp.wy = segments[j].wy;
            if (curr)
                curr.nseg = temp;
            else
                wtails[i] = temp;
            curr = temp;
        }
        wheads[i] = curr;
    }
    for (var k = 0; k < MAX_NUM_WORMS; k++)
        wgrowtime[k] = state.growtime[k] || 0;
}

// Autotranslated from worm.c:527
export function save_worm(nhfp) {
  let i, count, curr, temp;
  if (update_file(nhfp)) {
    for (i = 1; i < MAX_NUM_WORMS; i++) {
      for (count = 0, curr = wtails; curr; curr = curr.nseg) {
        count++;
      }
      Sfo_int(nhfp, count, "worm-segment_count");
      if (count) {
        for (curr = wtails; curr; curr = curr.nseg) {
          Sfo_coordxy(nhfp, (curr.wx), "worm-wx");
          Sfo_coordxy(nhfp, (curr.wy), "worm-wy");
        }
      }
    }
    for (i = 0; i < MAX_NUM_WORMS; ++i) {
      Sfo_long(nhfp, wgrowtime, "worm-wgrowtime");
    }
  }
  if (release_data(nhfp)) {
    for (i = 1; i < MAX_NUM_WORMS; i++) {
      if (!(curr = wtails[i])) {
        continue;
      }
      while (curr) {
        temp = curr.nseg;
        curr = temp;
      }
      wheads[i] = wtails[i] = 0;
      wgrowtime[i] = 0;
    }
  }
}

// Autotranslated from worm.c:576
export function rest_worm(nhfp) {
  let i, j, count = 0, curr, temp;
  for (i = 1; i < MAX_NUM_WORMS; i++) {
    Sfi_int(nhfp, count, "worm-segment_count");
    for (curr =  0, j = 0; j < count; j++) {
      temp = newseg();
      temp.nseg =  0;
      Sfi_coordxy(nhfp, (temp.wx), "worm-wx");
      Sfi_coordxy(nhfp, (temp.wy), "worm-wy");
      if (curr) curr.nseg = temp;
      else {
        wtails = temp;
      }
      curr = temp;
    }
    wheads = curr;
  }
  for (i = 0; i < MAX_NUM_WORMS; ++i) {
    Sfi_long(nhfp, wgrowtime, "worm-wgrowtime");
  }
}

// Autotranslated from worm.c:681
export function wormno_sanity_check() {
  let seg, wh = 0, wt = 0;
  for (seg = wheads; seg; seg = seg.nseg) {
    ++wh;
  }
  for (seg = wtails; seg; seg = seg.nseg) {
    ++wt;
  }
  if (wh || wt) {
    impossible( "phantom worm tail #0 [head=%s, %d segment%s; tail=%s, %d segment%s]", String(wheads[0]), wh, plur(wh), String(wtails[0]), wt, plur(wt));
  }
}
