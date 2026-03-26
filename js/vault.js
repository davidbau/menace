// vault.js -- Vault guard (Croesus) mechanics and vault corridors
// cf. vault.c — gold guard placement, corridor management, guard behavior
//
// Data model: Each vault guard has an `egd` (extra-guard-data) struct attached
// via mon.egd. Key fields:
//   fakecorr[FCSIZ]  — array of temporary corridor segments {fx,fy,ftyp,flags}
//   fcbeg, fcend     — range of active fakecorr entries
//   vroom            — room index of the vault being guarded
//   gdlevel          — dlevel where the vault is
//   warncnt          — how many times guard has warned hero
//   gddone           — flag: guard is done (gold retrieved or hero left)
//   ogx, ogy         — guard's original position (for parking)
//   gdx, gdy         — guard's destination coordinates
//   witness          — guard saw hero eat/destroy gold
//   dropgoldcnt      — times guard asked hero to drop gold

import { rn2 } from './rng.js';
import {
    COLNO, ROWNO, ROOMOFFSET, VAULT, isok,
    CORR, DOOR, STONE, HWALL, VWALL, ROOM, SCORR,
    TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    IS_WALL, IS_STWALL, IS_POOL, IS_ROOM, ACCESSIBLE, IS_OBSTRUCTED,
    D_NODOOR,
    VAULT_GUARD_TIME, GD_EATGOLD, GD_DESTROYGOLD,
    RLOC_NOMSG, RLOC_MSG, RLOC_ERR, ARTICLE_A,
    MM_EGD, MM_NOMSG,
} from './const.js';
import { PM_GUARD } from './monsters.js';
import { COIN_CLASS, ROCK, BOULDER, TIN_WHISTLE } from './objects.js';
import { pline, pline_The, You, You_hear, verbalize } from './pline.js';
import { newsym, map_invisible, canspotmon, monVisibleForMap } from './display.js';
import { place_monster } from './steed.js';
import { mongone, mpickgold, setmangry } from './mon.js';
import { relobj } from './steal.js';
import { rloc } from './teleport.js';
import { Monnam, noit_Monnam, noit_mon_nam, Some_Monnam, x_monnam,
         Mgender, pmname, mon_nam } from './do_name.js';
import { m_carrying } from './mthrowu.js';
import { upstart, distu } from './hacklib.js';
import { money_cnt } from './hack.js';
import { currency, sobj_at, g_at } from './invent.js';
import { placeFloorObject } from './invent.js';
import { deltrap } from './dungeon.js';
import { del_engr_at } from './engrave.js';
import { is_fainted } from './eat.js';
import { game as _gstate } from './gstate.js';
import { in_rooms } from './hack.js';
import { add_to_minv } from './mkobj.js';
import { makemon } from './makemon.js';
import { cansee, couldsee, block_point, unblock_point, recalc_block_point } from './vision.js';
import { t_at } from './trap.js';
import { m_canseeu } from './mondata.js';
import { Has_contents } from './objnam.js';
import { getlin } from './input.js';

// ---------- Constants ----------
const FCSIZ = ROWNO + COLNO;

// RLOC_*, ARTICLE_* imported from const.js

// ---------- Local helpers ----------

// g_at imported from invent.js
// del_engr_at imported from engrave.js
// is_fainted imported from eat.js
// in_rooms imported from hack.js

// C ref: um_dist(x, y, n) — is hero within n steps of (x,y)?
function um_dist(x, y, n, player) {
    return (Math.abs(player.x - x) <= n && Math.abs(player.y - y) <= n);
}

// C ref: mon_visible(mon) — is monster actually visible (not invis/hiding)?
function mon_visible(grd, player) {
    return monVisibleForMap(grd, player);
}

// ========================================================================
// cf. vault.c:172 — newegd(mtmp)
// Allocates and initializes extra guard data for a monster.
// ========================================================================
export function newegd(mtmp) {
    if (!mtmp.egd) {
        mtmp.egd = {
            fcbeg: 0,
            fcend: 0,
            vroom: 0,
            gdlevel: null,   // { dnum, dlevel } matching u.uz format
            warncnt: 0,
            gddone: 0,
            ogx: 0,
            ogy: 0,
            gdx: 0,
            gdy: 0,
            witness: 0,
            dropgoldcnt: 0,
            fakecorr: new Array(FCSIZ).fill(null).map(() => ({
                fx: 0, fy: 0, ftyp: 0, flags: 0,
            })),
            parentmid: mtmp.m_id || 0,
        };
    }
}

// ========================================================================
// cf. vault.c:180 — free_egd(mtmp)
// Frees extra guard data attached to a monster.
// ========================================================================
export function free_egd(mtmp) {
    if (mtmp.egd) {
        mtmp.egd = null;
    }
    mtmp.isgd = 0;
}

// ========================================================================
// cf. vault.c:234 [static] — in_fcorridor(grd, x, y)
// Returns true if (x,y) is inside guard's fake corridor.
// ========================================================================
export function in_fcorridor(grd, x, y) {
    const egrd = grd.egd;
    if (!egrd) return false;
    for (let fci = egrd.fcbeg; fci < egrd.fcend; fci++) {
        if (x === egrd.fakecorr[fci].fx && y === egrd.fakecorr[fci].fy)
            return true;
    }
    return false;
}

// ========================================================================
// cf. vault.c:103 [static] — blackout(x, y)
// Sets stone locations around (x,y) to unlit.
// ========================================================================
export function blackout(map, x, y) {
    for (let i = x - 1; i <= x + 1; ++i) {
        for (let j = y - 1; j <= y + 1; ++j) {
            if (!isok(i, j)) continue;
            const loc = map.at(i, j);
            if (!loc) continue;
            if (loc.typ === STONE) {
                loc.lit = false;
                loc.waslit = false;
            }
            // C: unset_seenv(lev, x, y, i, j) — not yet ported
        }
    }
}

// ========================================================================
// cf. vault.c:66 [static] — clear_fcorr(grd, forceshow)
// Restores fake corridor cells back to original terrain type.
// Returns true if corridor fully cleared, false if blocked.
// ========================================================================
export async function clear_fcorr(grd, forceshow, map, player, fov) {
    const egrd = grd.egd;
    if (!egrd) return true;

    // Check level match
    if (egrd.gdlevel && player && player.uz) {
        if (egrd.gdlevel.dnum !== player.uz.dnum
            || egrd.gdlevel.dlevel !== player.uz.dlevel)
            return true;
    }

    let sawcorridor = false;
    const semi_dead = !!(grd.dead || grd.mhp <= 0);

    while (egrd.fcbeg < egrd.fcend) {
        const fcbeg = egrd.fcbeg;
        const fcx = egrd.fakecorr[fcbeg].fx;
        const fcy = egrd.fakecorr[fcbeg].fy;

        if ((semi_dead || !in_fcorridor(grd, player.x, player.y))
            && egrd.gddone) {
            forceshow = true;
        }
        if ((player.x === fcx && player.y === fcy && !semi_dead)
            || (!forceshow && couldsee(map, player, fcx, fcy))) {
            // C: also checks Punished && !carried(uball) — simplified
            return false;
        }

        const mtmp = map.monsterAt ? map.monsterAt(fcx, fcy) : null;
        if (mtmp) {
            if (mtmp.isgd) {
                return false;
            } else {
                if (mtmp.tame || mtmp.mtame) {
                    // yelp(mtmp) — simplified
                }
                if (!await rloc(mtmp, RLOC_MSG, map, player)) {
                    // m_into_limbo: just move off-map
                    const _omx = mtmp.mx, _omy = mtmp.my;
                    mtmp.mx = 0;
                    mtmp.my = 0;
                    newsym(_omx, _omy);
                }
            }
        }

        const loc = map.at(fcx, fcy);
        if (loc) {
            if (loc.typ === CORR && cansee(map, player, fov, fcx, fcy))
                sawcorridor = true;
            loc.typ = egrd.fakecorr[fcbeg].ftyp;
            loc.flags = egrd.fakecorr[fcbeg].flags;
            if (IS_STWALL(loc.typ)) {
                // Destroy any trap here
                const trap = t_at(fcx, fcy, map);
                if (trap) deltrap(map, trap);
                // Undo light
                if (loc.typ === STONE) blackout(map, fcx, fcy);
            }
            del_engr_at(fcx, fcy, map);
            // C: map_location(fcx, fcy, 1) — bypass vision
            newsym(fcx, fcy);
            recalc_block_point(fcx, fcy);
        }
        egrd.fcbeg++;
    }
    if (sawcorridor) {
        await pline_The("corridor disappears.");
    }
    // C: check IS_OBSTRUCTED at hero position
    if (map && player) {
        const heroLoc = map.at(player.x, player.y);
        if (heroLoc && IS_OBSTRUCTED(heroLoc.typ)) {
            const hp = player.Upolyd ? player.mh : player.uhp;
            if (hp > 0) {
                await You("are encased in rock.");
            }
        }
    }
    return true;
}

// ========================================================================
// cf. vault.c:117 [static] — restfakecorr(grd)
// Attempts to clear the fake corridor; if successful, removes the guard.
// ========================================================================
export async function restfakecorr(grd, map, player, fov) {
    if (await clear_fcorr(grd, false, map, player, fov)) {
        grd.isgd = 0;
        mongone(grd, map, player);
    }
}

// ========================================================================
// cf. vault.c:153 [static] — parkguard(grd)
// Moves guard to <0,0> (off-map parking).
// ========================================================================
export function parkguard(grd, map) {
    // Either guard is dead or will now be treated as if so;
    // monster traversal loops should skip it
    if (grd.mx) {
        if (map && map.removeMonster) {
            // Only remove from spatial index, not from monster list
        }
        newsym(grd.mx, grd.my);
    }
    if (!(map && map.monsterAt && map.monsterAt(0, 0) === grd)) {
        place_monster(grd, 0, 0, map);
    }
    if (grd.egd) {
        grd.egd.ogx = grd.mx;
        grd.egd.ogy = grd.my;
    }
}

// ========================================================================
// cf. vault.c:188 — grddead(grd)
// Called when a vault guard dies. Cleans up fake corridors.
// ========================================================================
// Autotranslated from vault.c:174
export async function grddead(grd) {
  let dispose = await clear_fcorr(grd, true);
  if (!dispose) {
    relobj(grd, 0, false);
    grd.mhp = 0;
    parkguard(grd);
    dispose = await clear_fcorr(grd, true);
  }
  if (dispose) grd.isgd = 0;
  return dispose;
}

// ========================================================================
// cf. vault.c:221 — findgd()
// Finds the first active vault guard on the current level.
// ========================================================================
export function findgd(map, player) {
    if (!map || !map.monsters) return null;
    for (const mtmp of map.monsters) {
        if (mtmp.isgd && mtmp.egd) {
            const egrd = mtmp.egd;
            if (egrd.gdlevel && player && player.uz
                && egrd.gdlevel.dnum === player.uz.dnum
                && egrd.gdlevel.dlevel === player.uz.dlevel) {
                if (!mtmp.mx && !egrd.gddone) {
                    mtmp.mhp = mtmp.mhpmax;
                }
                return mtmp;
            }
        }
    }
    // C: also checks migrating_mons — not yet ported
    return null;
}

// ========================================================================
// cf. vault.c:237 — vault_summon_gd()
// Summons a vault guard if hero is in a vault and there isn't one already.
// ========================================================================
// Autotranslated from vault.c:236
export function vault_summon_gd(player) {
  if (vault_occupied(player.urooms) && !findgd()) player.uinvault = (VAULT_GUARD_TIME - 1);
}

// ========================================================================
// cf. vault.c:244 — vault_occupied(array, map)
// Checks if any room in the given room-string is a VAULT.
// Returns the room character if so, '\0' otherwise.
// ========================================================================
export function vault_occupied(array, map) {
    // C returns '\0' for "not in vault" which is falsy in C but truthy in JS.
    // Return null instead for proper JS falsy semantics.
    if (!array || !map || !map.rooms) return null;
    for (let i = 0; i < array.length; i++) {
        const ch = array.charCodeAt(i);
        const roomIdx = ch - ROOMOFFSET;
        if (roomIdx >= 0 && roomIdx < map.rooms.length) {
            if (map.rooms[roomIdx].rtype === VAULT)
                return String.fromCharCode(ch);
        }
    }
    return null;
}

// ========================================================================
// cf. vault.c:254 — uleftvault(grd)
// Hero has teleported out of vault while a guard is active.
// ========================================================================
export async function uleftvault(grd, map, player, fov) {
    if (!grd || !grd.isgd || grd.dead || (grd.mhp <= 0)) return;

    // If carrying gold and arriving anywhere other than next to the guard,
    // set the guard loose
    if ((money_cnt(player.inventory || player.invent) || hidden_gold(true, player))
        && !um_dist(grd.mx, grd.my, 1, player)) {
        if (grd.mpeaceful) {
            if (canspotmon(grd, player, fov, map)) {
                await pline("%s becomes irate.", Monnam(grd));
            }
            grd.mpeaceful = 0; // bypass setmangry()
        }
        // If arriving outside guard's temporary corridor, give guard an extra move
        if (!in_fcorridor(grd, player.x, player.y)) {
            await gd_move(grd, map, player, fov);
        }
    }
}

// ========================================================================
// cf. vault.c:280 [static] — find_guard_dest(guard, rx, ry)
// Finds corridor destination for guard to approach hero.
// Returns {x, y} or null on failure.
// ========================================================================
export function find_guard_dest(guard, map, player) {
    for (let dd = 2; dd < ROWNO || dd < COLNO; dd++) {
        let incr_radius = false;
        for (let y = player.y - dd; y <= player.y + dd; y++) {
            if (y < 0 || y > ROWNO - 1) continue;
            for (let x = player.x - dd; x <= player.x + dd; x++) {
                if (y !== player.y - dd && y !== player.y + dd
                    && x !== player.x - dd)
                    x = player.x + dd;
                if (x < 1 || x > COLNO - 1) continue;
                if (guard && ((x === guard.mx && y === guard.my)
                    || (guard.isgd && in_fcorridor(guard, x, y))))
                    continue;
                const loc = map.at(x, y);
                if (loc && loc.typ === CORR) {
                    const lx = (x < player.x) ? x + 1 : (x > player.x) ? x - 1 : x;
                    const ly = (y < player.y) ? y + 1 : (y > player.y) ? y - 1 : y;
                    const lLoc = map.at(lx, ly);
                    if (lLoc && lLoc.typ !== STONE && lLoc.typ !== CORR) {
                        incr_radius = true;
                        break;
                    }
                    return { x, y };
                }
            }
            if (incr_radius) break;
        }
    }
    // impossible("Not a single corridor on this level?");
    // C: tele(); — not called here, caller handles
    return null;
}

// ========================================================================
// cf. vault.c:631 [static] — move_gold(gold, vroom)
// Moves gold from its current position to inside the vault.
// Consumes rn2(2) twice for placement coordinates.
// ========================================================================
export function move_gold(gold, vroom, map) {
    if (!gold || !map || !map.rooms) return;
    const room = map.rooms[vroom];
    if (!room) return;

    // Remove from current position
    if (map.removeObject) map.removeObject(gold);
    newsym(gold.ox, gold.oy);
    const nx = room.lx + rn2(2);
    const ny = room.ly + rn2(2);
    gold.ox = nx;
    gold.oy = ny;
    placeFloorObject(map, gold);
    newsym(nx, ny);
}

// ========================================================================
// cf. vault.c:296 [static] — wallify_vault(grd)
// Closes vault walls behind guard.
// ========================================================================
export async function wallify_vault(grd, map, player, fov) {
    const egrd = grd.egd;
    if (!egrd || !map || !map.rooms) return;

    const vlt = egrd.vroom;
    const room = map.rooms[vlt];
    if (!room) return;

    const lox = room.lx - 1, hix = room.hx + 1;
    const loy = room.ly - 1, hiy = room.hy + 1;
    let fixed = false;
    let movedgold = false;

    for (let x = lox; x <= hix; x++) {
        for (let y = loy; y <= hiy; y++) {
            // Only boundary cells
            if (x !== lox && x !== hix && y !== loy && y !== hiy)
                continue;

            const loc = map.at(x, y);
            if (!loc) continue;

            const hasGold = !!g_at(x, y, map);
            const hasRock = !!sobj_at(ROCK, x, y, map) || !!sobj_at(BOULDER, x, y, map);

            if ((!IS_WALL(loc.typ) || hasGold || hasRock)
                && !in_fcorridor(grd, x, y)) {

                // Relocate any non-guard monster
                const mon = map.monsterAt ? map.monsterAt(x, y) : null;
                if (mon && mon !== grd) {
                    if (mon.tame || mon.mtame) {
                        // yelp(mon) — simplified
                    }
                    if (!await rloc(mon, RLOC_MSG, map, player)) {
                        const _omx = mon.mx, _omy = mon.my;
                        mon.mx = 0;
                        mon.my = 0;
                        newsym(_omx, _omy);
                    }
                }

                // Move gold at wall locations into the vault
                const gold = g_at(x, y, map);
                if (gold) {
                    move_gold(gold, egrd.vroom, map);
                    movedgold = true;
                }

                // Destroy rocks and boulders
                let rocks;
                while ((rocks = sobj_at(ROCK, x, y, map)) != null) {
                    if (map.removeObject) map.removeObject(rocks);
                }
                while ((rocks = sobj_at(BOULDER, x, y, map)) != null) {
                    if (map.removeObject) map.removeObject(rocks);
                }

                // Destroy traps
                const trap = t_at(x, y, map);
                if (trap) deltrap(map, trap);

                let typ;
                if (x === lox) {
                    typ = (y === loy) ? TLCORNER
                        : (y === hiy) ? BLCORNER
                        : VWALL;
                } else if (x === hix) {
                    typ = (y === loy) ? TRCORNER
                        : (y === hiy) ? BRCORNER
                        : VWALL;
                } else {
                    typ = HWALL;
                }

                loc.typ = typ;
                loc.wall_info = 0;
                // C: xy_set_wall_state(x, y) — set WA_MASK bits
                del_engr_at(x, y, map);
                // Hack: show wall restoration to player
                newsym(x, y);
                block_point(x, y);
                fixed = true;
            }
        }
    }

    if (movedgold || fixed) {
        if (in_fcorridor(grd, grd.mx, grd.my)
            || cansee(map, player, fov, grd.mx, grd.my)) {
            await pline("%s whispers an incantation.", noit_Monnam(grd));
        } else {
            await You_hear("a distant chant.");
        }
        if (movedgold)
            await pline("A mysterious force moves the gold into the vault.");
        if (fixed)
            await pline_The("damaged vault's walls are magically restored!");
    }
}

// ========================================================================
// cf. vault.c:733 [static] — gd_mv_monaway(grd, nx, ny)
// Move any monster out of guard's way.
// ========================================================================
export async function gd_mv_monaway(grd, nx, ny, map, player, fov) {
    const mtmp = map.monsterAt ? map.monsterAt(nx, ny) : null;
    if (mtmp && mtmp !== grd) {
        if (!player?.deaf) {
            await verbalize("Out of my way, scum!");
        }
        if (!await rloc(mtmp, RLOC_ERR | RLOC_MSG, map, player)
            || (map.monsterAt && map.monsterAt(nx, ny))) {
            // m_into_limbo
            const _omx = mtmp.mx, _omy = mtmp.my;
            mtmp.mx = 0;
            mtmp.my = 0;
            newsym(_omx, _omy);
        }
        recalc_block_point(nx, ny);
    }
}

// ========================================================================
// cf. vault.c:751 [static] — gd_pick_corridor_gold(grd, goldx, goldy)
// Have guard pick gold off the floor.
// ========================================================================
export async function gd_pick_corridor_gold(grd, goldx, goldy, map, player, fov) {
    const under_u = (player.x === goldx && player.y === goldy);
    const see_it = cansee(map, player, fov, goldx, goldy);
    const egrd = grd.egd;

    if (under_u) {
        // Grab gold from between hero's feet
        const gold = g_at(goldx, goldy, map);
        if (!gold) return;
        const guardx = grd.mx, guardy = grd.my;
        const gdelta = distu(player, guardx, guardy);

        if (gdelta > 2 && see_it) {
            // Try to move guard closer
            // C: enexto loop — simplified: just pick up without moving
        }

        // Pick up gold
        if (map.removeObject) map.removeObject(gold);
        add_to_minv(grd, gold);
        newsym(goldx, goldy);

    } else if (goldx === grd.mx && goldy === grd.my) {
        mpickgold(grd, map);

    } else {
        // Gold at third spot
        await gd_mv_monaway(grd, goldx, goldy, map, player, fov);
        if (see_it) {
            newsym(grd.mx, grd.my);
            place_monster(grd, goldx, goldy, map);
        }
        mpickgold(grd, map);
    }

    if (see_it) {
        await pline("%s%s picks up the gold%s.", Some_Monnam(grd),
            (grd.mpeaceful && egrd.warncnt > 5)
                ? " calms down and" : "",
            under_u ? " from beneath you" : "");
    }

    // If guard was moved, move back
    const guardx = grd.mx, guardy = grd.my;
    if (grd.mx !== guardx || grd.my !== guardy) {
        newsym(grd.mx, grd.my);
        place_monster(grd, guardx, guardy, map);
        newsym(guardx, guardy);
    }
}

// ========================================================================
// cf. vault.c:458 [static] — gd_letknow(grd)
// Guard issues warning to hero.
// ========================================================================
export async function gd_letknow(grd, map, player, fov) {
    if (!cansee(map, player, fov, grd.mx, grd.my) || !mon_visible(grd, player)) {
        await You_hear("%s.",
            m_carrying(grd, TIN_WHISTLE)
                ? "the shrill sound of a guard's whistle"
                : "angry shouting");
    } else {
        await You(!um_dist(grd.mx, grd.my, 2, player)
            ? "are confronted by %s."
            : "see %s approaching.",
            x_monnam(grd, ARTICLE_A, "angry", 0, false));
    }
}

// ========================================================================
// cf. vault.c:430 [static] — gd_move_cleanup(grd, semi_dead, disappear_msg_seen)
// Post-move guard cleanup.
// Returns: 1=guard moved, -2=died
// ========================================================================
export async function gd_move_cleanup(grd, semi_dead, disappear_msg_seen, map, player, fov) {
    const x = grd.mx, y = grd.my;
    const see_guard = canspotmon(grd, player, fov, map);
    parkguard(grd, map);
    await wallify_vault(grd, map, player, fov);
    await restfakecorr(grd, map, player, fov);
    if (!semi_dead && (in_fcorridor(grd, player.x, player.y)
        || cansee(map, player, fov, x, y))) {
        if (!disappear_msg_seen && see_guard) {
            await pline("Suddenly, %s disappears.", noit_mon_nam(grd));
        }
        return 1;
    }
    return -2;
}

// ========================================================================
// cf. vault.c:482 — invault()
// Called each turn when hero is in a vault. Manages guard summoning
// and interaction.
// ========================================================================
export async function invault(map, player, fov) {
    const vaultroom = vault_occupied(player.urooms || '', map);
    if (!vaultroom) {
        player.uinvault = 0;
        return;
    }

    // cf. vault.c:332 — guard reluctance based on deaths
    const vgdeathcount = map.mvitals?.[PM_GUARD]?.died || 0;
    if (vgdeathcount < 2
        || (vgdeathcount < 50 && !rn2(vgdeathcount * vgdeathcount))) {
        player.uinvault = (player.uinvault || 0) + 1;
    }
    if (player.uinvault < VAULT_GUARD_TIME
        || (player.uinvault % Math.floor(VAULT_GUARD_TIME / 2)) !== 0)
        return;

    let guard = findgd(map, player);
    if (guard) return; // guard already exists

    // cf. vault.c:348 — find guard destination
    const dest = find_guard_dest(null, map, player);
    if (!dest) return;

    const gdx = dest.x, gdy = dest.y;
    const vaultRoomIdx = vaultroom.charCodeAt(0) - ROOMOFFSET;

    // Find good door location in vault wall
    let x = player.x, y = player.y;
    let locAt = map.at(x, y);

    // If player is in a dug doorway (not ROOM), step into the room
    if (locAt && locAt.typ !== ROOM) {
        const dirs = [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
        for (const [dx, dy] of dirs) {
            const adj = map.at(x + dx, y + dy);
            if (adj && adj.typ === ROOM) {
                x += dx;
                y += dy;
                break;
            }
        }
    }

    // Walk from hero toward guard destination until hitting a wall
    while (true) {
        const loc = map.at(x, y);
        if (!loc || loc.typ !== ROOM) break;
        const dx = (gdx > x) ? 1 : (gdx < x) ? -1 : 0;
        const dy = (gdy > y) ? 1 : (gdy < y) ? -1 : 0;
        if (Math.abs(gdx - x) >= Math.abs(gdy - y))
            x += dx;
        else
            y += dy;
    }

    // If guard would appear at hero position, adjust
    if (player.x === x && player.y === y) {
        locAt = map.at(x, y);
        const locR = map.at(x + 1, y);
        const locL = map.at(x - 1, y);
        const locD = map.at(x, y + 1);
        const locU = map.at(x, y - 1);
        if (locR && (locR.typ === HWALL || locR.typ === DOOR))
            x = x + 1;
        else if (locL && (locL.typ === HWALL || locL.typ === DOOR))
            x = x - 1;
        else if (locD && (locD.typ === VWALL || locD.typ === DOOR))
            y = y + 1;
        else if (locU && (locU.typ === VWALL || locU.typ === DOOR))
            y = y - 1;
        else
            return;
    }

    // Create the guard
    guard = makemon(PM_GUARD, x, y, MM_EGD | MM_NOMSG,
        player.depth || 1, map);
    if (!guard) return;

    guard.isgd = 1;
    guard.mpeaceful = 1;
    // set_malign(guard) — simplified
    newegd(guard);
    const egrd = guard.egd;
    egrd.gddone = 0;
    egrd.ogx = x;
    egrd.ogy = y;
    egrd.gdlevel = player.uz ? { dnum: player.uz.dnum, dlevel: player.uz.dlevel } : null;
    egrd.vroom = vaultRoomIdx;
    egrd.warncnt = 0;

    // Ensure guard doesn't respawn next turn if killed immediately
    player.uinvault = (player.uinvault || 0) + 1;

    // C: reset_faint(), boulder handling — simplified

    const spotted = canspotmon(guard, player, fov, map);
    if (spotted) {
        await pline("Suddenly one of the Vault's %s enters!",
            pmname(guard.type || guard.data, Mgender(guard)) + 's');
        newsym(guard.mx, guard.my);
    } else {
        await pline("Someone else has entered the Vault.");
        map_invisible(map, guard.mx, guard.my, player);
    }

    // If hero is engulfed, guard can't interrogate
    if (player.uswallow) {
        if (!player.deaf) {
            await verbalize("What's going on here?");
        }
        if (!spotted) await pline_The("other presence vanishes.");
        mongone(guard, map, player);
        return;
    }

    // If hero is mimicking an object or undetected
    if (player.uundetected) {
        await pline("Puzzled, the guard turns around and leaves.");
        mongone(guard, map, player);
        return;
    }

    // If hero can't speak (strangled, silent, paralyzed)
    if (player.strangled || ((_gstate?.multi || 0) < 0)) {
        if (player.deaf) {
            await pline("%s huffs and turns to leave.", noit_Monnam(guard));
        } else {
            await verbalize("I'll be back when you're ready to speak to me!");
        }
        mongone(guard, map, player);
        return;
    }

    // C: stop_occupation(), nomul(0), unmul — simplified
    let buf = '';
    let trycount = 5;
    const prompt = player.deaf
        ? 'You are required to supply your name. -'
        : '"Hello stranger, who are you?" -';
    const promptDisplay = _gstate?.display || _gstate?.disp || null;
    do {
        buf = await getlin(prompt, promptDisplay);
        buf = String(buf || '').replace(/\s+/g, ' ').trim();
    } while (!buf && --trycount > 0);

    if (buf
        && (/^croesus$/i.test(buf)
            || /^kroisos$/i.test(buf)
            || /^creosote$/i.test(buf))) {
        if (player.deaf) {
            if (!player.blind) {
                await pline('%s waves goodbye.', noit_Monnam(guard));
            }
        } else {
            await verbalize('Oh, yes, of course.  Sorry to have disturbed you.');
        }
        mongone(guard, map, player);
        return;
    }

    if (player.deaf) {
        await pline("%s doesn't %srecognize you.", noit_Monnam(guard),
            player.blind ? "" : "appear to ");
    } else {
        await verbalize("I don't know you.");
    }

    const umoney = money_cnt(player.inventory || player.invent);
    const hgold = hidden_gold(true, player);
    if (!umoney && !hgold) {
        if (player.deaf) {
            await pline("%s stomps%s.", noit_Monnam(guard),
                player.blind ? "" : " and beckons");
        } else {
            await verbalize("Please follow me.");
        }
    } else {
        if (!umoney) {
            if (player.deaf) {
                if (!player.blind) {
                    await pline("%s glares at you%s.", noit_Monnam(guard),
                        (player.inventory || player.invent)?.length ? "r stuff" : "");
                }
            } else {
                await verbalize("You have hidden gold.");
            }
        }
        if (player.deaf) {
            if (!player.blind) {
                await pline("%s holds out %s palm and beckons with %s other hand.",
                    noit_Monnam(guard), "a", "the");
            }
        } else {
            await verbalize("Most likely all your gold was stolen from this vault.");
            await verbalize("Please drop that gold and follow me.");
        }
        egrd.dropgoldcnt++;
    }

    egrd.gdx = gdx;
    egrd.gdy = gdy;
    egrd.fcbeg = 0;
    egrd.fakecorr[0].fx = x;
    egrd.fakecorr[0].fy = y;

    const loc = map.at(x, y);
    let typ = loc ? loc.typ : STONE;

    if (!IS_WALL(typ)) {
        // Guard arriving at non-wall implies a door; vault wall was dug
        const lowx = map.rooms[vaultRoomIdx]?.lx || 0;
        const hix = map.rooms[vaultRoomIdx]?.hx || 0;
        const lowy = map.rooms[vaultRoomIdx]?.ly || 0;
        const hiy_val = map.rooms[vaultRoomIdx]?.hy || 0;

        if (x === lowx - 1 && y === lowy - 1)
            typ = TLCORNER;
        else if (x === hix + 1 && y === lowy - 1)
            typ = TRCORNER;
        else if (x === lowx - 1 && y === hiy_val + 1)
            typ = BLCORNER;
        else if (x === hix + 1 && y === hiy_val + 1)
            typ = BRCORNER;
        else if (y === lowy - 1 || y === hiy_val + 1)
            typ = HWALL;
        else if (x === lowx - 1 || x === hix + 1)
            typ = VWALL;

        if (loc) {
            loc.typ = typ; // will be changed to door below
            loc.wall_info = 0;
            // C: xy_set_wall_state(x, y) — set WA_MASK bits
        }
    }

    egrd.fakecorr[0].ftyp = typ;
    egrd.fakecorr[0].flags = loc ? loc.flags : 0;

    // C: spot_stop_timers(x, y, MELT_ICE_AWAY) — simplified
    if (loc) {
        loc.typ = DOOR;
        loc.flags = D_NODOOR;
    }
    unblock_point(x, y);
    egrd.fcend = 1;
    egrd.warncnt = 1;
}

// ========================================================================
// cf. vault.c:492 — gd_move(grd)
// Main vault guard AI movement function.
// Returns: 1=moved, 0=didn't move, -1=let m_move handle it, -2=died.
// ========================================================================
export async function gd_move(grd, map, player, fov) {
    if (!grd || !grd.egd) return -1;
    const egrd = grd.egd;

    // Check level
    if (egrd.gdlevel && player && player.uz) {
        if (egrd.gdlevel.dnum !== player.uz.dnum
            || egrd.gdlevel.dlevel !== player.uz.dlevel)
            return -1;
    }

    const semi_dead = !!(grd.dead || grd.mhp <= 0);

    if (semi_dead || !grd.mx || egrd.gddone) {
        egrd.gddone = 1;
        return await gd_move_cleanup(grd, semi_dead, false, map, player, fov);
    }

    const u_in_vault = !!vault_occupied(player.urooms || '', map);
    const grd_in_vault = !!in_rooms(grd.mx, grd.my, VAULT, map);

    if (!u_in_vault && !grd_in_vault) {
        await wallify_vault(grd, map, player, fov);
    }

    // Hostile guard
    if (!grd.mpeaceful) {
        if (!u_in_vault
            && (grd_in_vault || (in_fcorridor(grd, grd.mx, grd.my)
                && !in_fcorridor(grd, player.x, player.y)))) {
            await rloc(grd, RLOC_MSG, map, player);
            await wallify_vault(grd, map, player, fov);
            if (!in_fcorridor(grd, grd.mx, grd.my))
                await clear_fcorr(grd, true, map, player, fov);
            await gd_letknow(grd, map, player, fov);
            return -1;
        }
        if (!in_fcorridor(grd, grd.mx, grd.my))
            await clear_fcorr(grd, true, map, player, fov);
        return -1;
    }

    // Teleported guard — treat as regular monster
    if (Math.abs(egrd.ogx - grd.mx) > 1 || Math.abs(egrd.ogy - grd.my) > 1)
        return -1;

    // Guard witnessed gold destruction
    if (egrd.witness) {
        if (!player.deaf) {
            await verbalize("How dare you %s that gold, scoundrel!",
                (egrd.witness & GD_EATGOLD) ? "consume" : "destroy");
        }
        egrd.witness = 0;
        grd.mpeaceful = 0;
        return -1;
    }

    const umoney = money_cnt(player.inventory || player.invent);
    const u_carry_gold = (umoney > 0 || hidden_gold(true, player) > 0);

    // Phase 1: guard at entry point (fcend === 1)
    if (egrd.fcend === 1) {
        if (u_in_vault && (u_carry_gold || !um_dist(grd.mx, grd.my, 1, player))) {
            if (egrd.warncnt === 3 && !player.deaf) {
                let buf = '';
                if (u_carry_gold) {
                    buf = (!umoney ? "drop that hidden gold and " : "drop that gold and ");
                }
                buf += "follow me!";
                if (egrd.dropgoldcnt || !u_carry_gold)
                    await verbalize("I repeat, %s", buf);
                else
                    await verbalize("%s", upstart(buf));
                if (u_carry_gold)
                    egrd.dropgoldcnt++;
            }
            if (egrd.warncnt === 7) {
                const m = grd.mx, n = grd.my;
                if (!player.deaf) {
                    await verbalize("You've been warned, knave!");
                }
                grd.mpeaceful = 0;
                // C: mnexto(grd, RLOC_NOMSG) — simplified: rloc
                await rloc(grd, RLOC_NOMSG, map, player);
                // Restore entry point
                const loc = map.at(m, n);
                if (loc) {
                    loc.typ = egrd.fakecorr[0].ftyp;
                    loc.flags = egrd.fakecorr[0].flags;
                }
                recalc_block_point(m, n);
                del_engr_at(m, n, map);
                newsym(m, n);
                return -1;
            }
            // Not fair to get mad when (s)he's fainted or paralyzed
            if (!is_fainted(player) && (_gstate?.multi || 0) >= 0)
                egrd.warncnt++;
            return 0;
        }

        if (!u_in_vault) {
            if (u_carry_gold) {
                // Player teleported out with gold
                const m = grd.mx, n = grd.my;
                await rloc(grd, RLOC_MSG, map, player);
                const loc = map.at(m, n);
                if (loc) {
                    loc.typ = egrd.fakecorr[0].ftyp;
                    loc.flags = egrd.fakecorr[0].flags;
                }
                recalc_block_point(m, n);
                del_engr_at(m, n, map);
                newsym(m, n);
                grd.mpeaceful = 0;
                await gd_letknow(grd, map, player, fov);
                return -1;
            } else {
                if (!player.deaf) {
                    await verbalize("Well, begone.");
                }
                egrd.gddone = 1;
                return await gd_move_cleanup(grd, semi_dead, false, map, player, fov);
            }
        }
    }

    // Phase 2: guard escorting hero (fcend > 1)
    if (egrd.fcend > 1) {
        if (egrd.fcend > 2 && in_fcorridor(grd, grd.mx, grd.my)
            && !egrd.gddone && !in_fcorridor(grd, player.x, player.y)
            && map.at(egrd.fakecorr[0].fx, egrd.fakecorr[0].fy)?.typ
                === egrd.fakecorr[0].ftyp) {
            await pline("%s, confused, disappears.", noit_Monnam(grd));
            return await gd_move_cleanup(grd, semi_dead, true, map, player, fov);
        }
        if (u_carry_gold && (in_fcorridor(grd, player.x, player.y)
            || (egrd.fcend > 1 && u_in_vault))) {
            if (!grd.mx) {
                await restfakecorr(grd, map, player, fov);
                return -2;
            }
            if (egrd.warncnt < 6) {
                egrd.warncnt = 6;
                if (player.deaf) {
                    if (!player.blind) {
                        await pline("%s holds out %s palm demandingly!",
                            noit_Monnam(grd), "a");
                    }
                } else {
                    await verbalize("Drop all your gold, scoundrel!");
                }
                return 0;
            } else {
                if (player.deaf) {
                    if (!player.blind) {
                        await pline("%s rubs %s hands with enraged delight!",
                            noit_Monnam(grd), "the");
                    }
                } else {
                    await verbalize("So be it, rogue!");
                }
                grd.mpeaceful = 0;
                return -1;
            }
        }
    }

    // Check for gold in fake corridor
    let m = 0, n = 0;
    let goldincorridor = false;
    for (let fci = egrd.fcbeg; fci < egrd.fcend; fci++) {
        if (g_at(egrd.fakecorr[fci].fx, egrd.fakecorr[fci].fy, map)) {
            m = egrd.fakecorr[fci].fx;
            n = egrd.fakecorr[fci].fy;
            goldincorridor = true;
            break;
        }
    }

    // New gold can appear if it was embedded in stone and hero kicked it
    if (goldincorridor && !egrd.gddone) {
        await gd_pick_corridor_gold(grd, m, n, map, player, fov);
        if (!grd.mpeaceful)
            return -1;
        egrd.warncnt = 5;
        return 0;
    }

    if (!um_dist(grd.mx, grd.my, 1, player) || egrd.gddone) {
        if (!egrd.gddone && !rn2(10) && !player.deaf
            && !player.uswallow
            && !(player.ustuck /* && !sticks(youmonst.data) */)) {
            await verbalize("Move along!");
        }
        await restfakecorr(grd, map, player, fov);
        return 0; // didn't move
    }

    let x = grd.mx;
    let y = grd.my;

    if (u_in_vault) {
        // goto nextpos — skip corridor exit search
    } else {
        // Look around (hor & vert only) for accessible places
        let found_exit = false;
        for (let nx = x - 1; nx <= x + 1 && !found_exit; nx++) {
            for (let ny = y - 1; ny <= y + 1; ny++) {
                if ((nx === x || ny === y) && (nx !== x || ny !== y)
                    && isok(nx, ny)) {
                    const crm = map.at(nx, ny);
                    if (!crm) continue;
                    const typ = crm.typ;
                    if (!IS_STWALL(typ) && !IS_POOL(typ)) {
                        if (in_fcorridor(grd, nx, ny))
                            continue; // nextnxy

                        if (in_rooms(nx, ny, VAULT, map))
                            continue;

                        // Found good place to leave guard
                        egrd.gddone = 1;
                        if (ACCESSIBLE(typ)) {
                            // goto newpos
                            await gd_mv_monaway(grd, nx, ny, map, player, fov);
                            if (egrd.gddone)
                                return await gd_move_cleanup(grd, semi_dead, false, map, player, fov);
                            egrd.ogx = grd.mx;
                            egrd.ogy = grd.my;
                            newsym(grd.mx, grd.my);
                            place_monster(grd, nx, ny, map);
                            newsym(grd.mx, grd.my);
                            await restfakecorr(grd, map, player, fov);
                            return 1;
                        }
                        crm.typ = (typ === SCORR) ? CORR : DOOR;
                        if (crm.typ === DOOR)
                            crm.flags = D_NODOOR;
                        else
                            crm.flags = 0;
                        del_engr_at(nx, ny, map);
                        // goto proceed — fall through to newspot logic below
                        // We handle this inline:
                        unblock_point(nx, ny);
                        if (cansee(map, player, fov, nx, ny))
                            newsym(nx, ny);

                        // Add to fakecorr
                        if ((nx !== egrd.gdx || ny !== egrd.gdy)
                            || (grd.mx !== egrd.gdx || grd.my !== egrd.gdy)) {
                            const fcp = egrd.fakecorr[egrd.fcend];
                            if (egrd.fcend++ === FCSIZ)
                                throw new Error("fakecorr overflow");
                            fcp.fx = nx;
                            fcp.fy = ny;
                            fcp.ftyp = typ;
                            fcp.flags = crm.flags;
                        }

                        // newpos
                        await gd_mv_monaway(grd, nx, ny, map, player, fov);
                        if (egrd.gddone)
                            return await gd_move_cleanup(grd, semi_dead, false, map, player, fov);
                        egrd.ogx = grd.mx;
                        egrd.ogy = grd.my;
                        newsym(grd.mx, grd.my);
                        place_monster(grd, nx, ny, map);
                        if (g_at(nx, ny, map)) {
                            mpickgold(grd, map);
                            if (canspotmon(grd, player, fov, map))
                                await pline("%s picks up some gold.", Monnam(grd));
                        } else {
                            newsym(grd.mx, grd.my);
                        }
                        await restfakecorr(grd, map, player, fov);
                        return 1;
                    }
                }
            }
        }
    }

    // nextpos: Move toward gdx/gdy
    let nx = x;
    let ny = y;
    const ggx = egrd.gdx;
    const ggy = egrd.gdy;
    const dx = (ggx > x) ? 1 : (ggx < x) ? -1 : 0;
    const dy = (ggy > y) ? 1 : (ggy < y) ? -1 : 0;
    if (Math.abs(ggx - x) >= Math.abs(ggy - y))
        nx += dx;
    else
        ny += dy;

    let crm = map.at(nx, ny);
    let typ = crm ? crm.typ : STONE;
    let newspot = false;

    while (typ !== STONE) {
        const ex = nx + nx - x;
        const ey = ny + ny - y;
        // Must be a wall here
        if (isok(ex, ey) && IS_ROOM(map.at(ex, ey)?.typ || 0)) {
            crm = map.at(nx, ny);
            if (crm) {
                crm.typ = DOOR;
                crm.flags = D_NODOOR;
            }
            del_engr_at(ex, ey, map);
            break; // goto proceed
        }
        if (dy && nx !== x) {
            nx = x;
            ny = y + dy;
            crm = map.at(nx, ny);
            typ = crm ? crm.typ : STONE;
            continue;
        }
        if (dx && ny !== y) {
            ny = y;
            nx = x + dx;
            crm = map.at(nx, ny);
            typ = crm ? crm.typ : STONE;
            // C: dy = 0 — prevent further diagonal attempts
            continue;
        }
        // I don't like this, but ...
        if (IS_ROOM(typ)) {
            if (crm) {
                crm.typ = DOOR;
                crm.flags = D_NODOOR;
            }
            del_engr_at(ex, ey, map);
            break; // goto proceed
        }
        break;
    }

    // If we fell through the while loop without breaking (typ === STONE)
    if (typ === STONE) {
        crm = map.at(nx, ny);
        if (crm) {
            crm.typ = CORR;
            crm.flags = 0;
        }
    }

    // proceed:
    newspot = true;
    unblock_point(nx, ny);
    if (cansee(map, player, fov, nx, ny))
        newsym(nx, ny);

    if ((nx !== ggx || ny !== ggy) || (grd.mx !== ggx || grd.my !== ggy)) {
        const fcp = egrd.fakecorr[egrd.fcend];
        if (egrd.fcend++ === FCSIZ)
            throw new Error("fakecorr overflow");
        fcp.fx = nx;
        fcp.fy = ny;
        fcp.ftyp = typ;
        fcp.flags = crm ? crm.flags : 0;
    } else if (!egrd.gddone) {
        // We're stuck, so try to find a new destination
        const newDest = find_guard_dest(grd, map, player);
        if (!newDest || (newDest.x === ggx && newDest.y === ggy)) {
            await pline("%s, confused, disappears.", Monnam(grd));
            return await gd_move_cleanup(grd, semi_dead, true, map, player, fov);
        } else {
            egrd.gdx = newDest.x;
            egrd.gdy = newDest.y;
            // Retry movement — recursive would match C's goto nextpos
            // but to avoid stack overflow, just return 0 and let next turn try
            return 0;
        }
    }

    // newpos:
    await gd_mv_monaway(grd, nx, ny, map, player, fov);
    if (egrd.gddone)
        return await gd_move_cleanup(grd, semi_dead, false, map, player, fov);
    egrd.ogx = grd.mx;
    egrd.ogy = grd.my;
    newsym(grd.mx, grd.my);
    place_monster(grd, nx, ny, map);
    if (newspot && g_at(nx, ny, map)) {
        // Pick up pre-existing gold so guard doesn't blame hero later
        mpickgold(grd, map);
        if (canspotmon(grd, player, fov, map))
            await pline("%s picks up some gold.", Monnam(grd));
    } else {
        newsym(grd.mx, grd.my);
    }
    await restfakecorr(grd, map, player, fov);
    return 1;
}

// ========================================================================
// cf. vault.c:827 — paygd(silently)
// Routine when dying or quitting with a vault guard around.
// Consumes rn2(2) twice for gold placement if guard remits gold.
// ========================================================================
export async function paygd(silently, map, player) {
    const grd = findgd(map, player);
    const umoney = money_cnt(player.inventory || player.invent);

    if (!umoney || !grd)
        return;

    let gdx, gdy;

    if (player.uinvault) {
        if (!silently) {
            await pline("Your %ld %s goes into the Magic Memory Vault.",
                umoney, currency(umoney));
        }
        gdx = player.x;
        gdy = player.y;
    } else {
        if (grd.mpeaceful) {
            // peaceful guard has no "right" to your gold
            mongone(grd, map, player);
            return;
        }

        // C: mnexto(grd, RLOC_NOMSG) — simplified: rloc
        await rloc(grd, RLOC_NOMSG, map, player);
        if (!silently)
            await pline("%s remits your gold to the vault.", Monnam(grd));

        const room = map.rooms?.[grd.egd?.vroom];
        if (room) {
            gdx = room.lx + rn2(2);
            gdy = room.ly + rn2(2);
        } else {
            gdx = player.x;
            gdy = player.y;
        }
        // C: make_grave(gdx, gdy, buf) — simplified
    }

    // Move all gold coins from inventory to vault location
    const inventory = player.inventory || player.invent || [];
    const toRemove = [];
    for (const coins of inventory) {
        if (coins && coins.oclass === COIN_CLASS) {
            toRemove.push(coins);
        }
    }
    for (const coins of toRemove) {
        // freeinv(coins)
        const idx = inventory.indexOf(coins);
        if (idx >= 0) inventory.splice(idx, 1);
        coins.ox = gdx;
        coins.oy = gdy;
        placeFloorObject(map, coins);
    }

    mongone(grd, map, player);
}

// ========================================================================
// cf. vault.c:900 — hidden_gold(even_if_unknown)
// Returns total gold value in carried containers.
// ========================================================================
export function hidden_gold(even_if_unknown, player) {
    let value = 0;
    const inventory = player?.inventory || player?.invent || [];
    for (const obj of inventory) {
        if (!obj) continue;
        // C: Has_contents(obj) && (obj.cknown || even_if_unknown)
        if (obj.contents && Array.isArray(obj.contents)
            && (obj.cknown || even_if_unknown)) {
            value += contained_gold(obj, even_if_unknown);
        }
    }
    return value;
}

// C ref: contained_gold() — recursive gold count in containers
function contained_gold(container, even_if_unknown) {
    let value = 0;
    const contents = container?.contents || [];
    for (const obj of contents) {
        if (!obj) continue;
        if (obj.oclass === COIN_CLASS) {
            value += (obj.quan || 1);
        }
        if (obj.contents && Array.isArray(obj.contents)
            && (obj.cknown || even_if_unknown)) {
            value += contained_gold(obj, even_if_unknown);
        }
    }
    return value;
}

// ========================================================================
// cf. vault.c:921 — gd_sound()
// Returns false if hero is in vault or guard is present (suppress footsteps).
// ========================================================================
// Autotranslated from vault.c:1271
export function gd_sound(player) {
  return !(vault_occupied(player.urooms) || findgd());
}

// ========================================================================
// cf. vault.c:942 — vault_gd_watching(activity)
// Checks if guard is watching hero eat/destroy gold.
// ========================================================================
export function vault_gd_watching(activity, map, player) {
    const guard = findgd(map, player);
    if (guard && guard.mx && guard.mcansee && m_canseeu(guard)) {
        if (activity === GD_EATGOLD || activity === GD_DESTROYGOLD) {
            if (guard.egd) guard.egd.witness = activity;
        }
    }
}
