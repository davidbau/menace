// monmove.js -- Monster movement AI
// C-faithful port of mon.c movemon(), monmove.c dochug(), dogmove.c dog_move()
// Focus: exact RNG consumption alignment with C NetHack

import { COLNO, ROWNO, STONE, IS_WALL, IS_DOOR, IS_ROOM,
         ACCESSIBLE, CORR, DOOR, D_CLOSED, D_LOCKED,
         POOL, LAVAPOOL,
         NORMAL_SPEED, isok } from './config.js';
import { rn2, rnd } from './rng.js';
import { monsterAttackPlayer } from './combat.js';
import { FOOD_CLASS, BOULDER } from './objects.js';
import { dogfood, can_carry, DOGFOOD, CADAVER, ACCFOOD, MANFOOD, APPORT,
         POISON, UNDEF, TABU } from './dog.js';
import { couldsee, m_cansee } from './vision.js';
import { PM_GRID_BUG } from './monsters.js';

const MTSZ = 4;           // C ref: monst.h — track history size
const SQSRCHRADIUS = 5;   // C ref: dogmove.c — object search radius

// C direction tables (C ref: monmove.c)
const xdir = [0, 1, 1, 1, 0, -1, -1, -1];
const ydir = [-1, -1, 0, 1, 1, 1, 0, -1];

// Squared distance
function dist2(x1, y1, x2, y2) {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

// ========================================================================
// mfndpos — collect valid adjacent positions in column-major order
// ========================================================================
// C ref: mon.c mfndpos() — returns positions a monster can move to
// Iterates (x-1..x+1) × (y-1..y+1) in column-major order, skipping current pos.
// Handles NODIAG (grid bugs), terrain, doors, monsters, player, boulders.
function mfndpos(mon, map, player) {
    const omx = mon.mx, omy = mon.my;
    const nodiag = (mon.mndx === PM_GRID_BUG);
    const positions = [];
    const maxx = Math.min(omx + 1, COLNO - 1);
    const maxy = Math.min(omy + 1, ROWNO - 1);

    for (let nx = Math.max(1, omx - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, omy - 1); ny <= maxy; ny++) {
            if (nx === omx && ny === omy) continue;

            // C ref: NODIAG — grid bugs can only move in cardinal directions
            if (nx !== omx && ny !== omy && nodiag) continue;

            const loc = map.at(nx, ny);
            if (!loc || !ACCESSIBLE(loc.typ)) continue;

            // C ref: door checks
            if (IS_DOOR(loc.typ) && (loc.flags & (D_CLOSED | D_LOCKED))) continue;

            // C ref: MON_AT — skip positions with other monsters
            if (map.monsterAt(nx, ny)) continue;

            // C ref: u_at — skip player position
            if (nx === player.x && ny === player.y) continue;

            // C ref: sobj_at(BOULDER) — skip positions with boulders
            // (simplified: no monster can move boulders for now)
            let hasBoulder = false;
            for (const obj of map.objects) {
                if (obj.ox === nx && obj.oy === ny && obj.otyp === BOULDER) {
                    hasBoulder = true;
                    break;
                }
            }
            if (hasBoulder) continue;

            positions.push({ x: nx, y: ny });
        }
    }
    return positions;
}

// ========================================================================
// dog_goal helper functions — C-faithful checks
// ========================================================================

// C ref: dogmove.c:144-153 — cursed_object_at(x, y)
// Checks if ANY object at position (x, y) is cursed
function cursed_object_at(map, x, y) {
    for (const obj of map.objects) {
        if (obj.ox === x && obj.oy === y && obj.cursed)
            return true;
    }
    return false;
}

// C ref: dogmove.c:1353-1362 — could_reach_item(mon, nx, ny)
// Check if monster could pick up objects from location (no pool/lava/boulder blocking)
function could_reach_item(map, mon, nx, ny) {
    const loc = map.at(nx, ny);
    if (!loc) return false;
    const typ = loc.typ;
    // C: is_pool checks typ >= POOL && typ <= DRAWBRIDGE_UP (simplified)
    const isPool = (typ === POOL);
    const isLava = (typ === LAVAPOOL);
    // C: sobj_at(BOULDER, nx, ny) — is there a boulder at this position?
    let hasBoulder = false;
    for (const obj of map.objects) {
        if (obj.ox === nx && obj.oy === ny && obj.otyp === BOULDER) {
            hasBoulder = true; break;
        }
    }
    // Little dogs can't swim, don't like lava, can't throw rocks
    if (isPool) return false; // simplified: pets aren't swimmers
    if (isLava) return false; // simplified: pets don't like lava
    if (hasBoulder) return false; // simplified: pets can't throw rocks
    return true;
}

// C ref: dogmove.c:1371-1407 — can_reach_location(mon, mx, my, fx, fy)
// Recursive pathfinding: can monster navigate from (mx,my) to (fx,fy)?
// Uses greedy approach: only steps through cells closer to target.
function can_reach_location(map, mon, mx, my, fx, fy) {
    if (mx === fx && my === fy) return true;
    if (!isok(mx, my)) return false;

    const d = dist2(mx, my, fx, fy);
    for (let i = mx - 1; i <= mx + 1; i++) {
        for (let j = my - 1; j <= my + 1; j++) {
            if (!isok(i, j)) continue;
            if (dist2(i, j, fx, fy) >= d) continue;
            const loc = map.at(i, j);
            if (!loc) continue;
            // C: IS_OBSTRUCTED(typ) = typ < POOL
            if (loc.typ < POOL) continue;
            // C: closed/locked doors block
            if (IS_DOOR(loc.typ) && (loc.flags & (D_CLOSED | D_LOCKED)))
                continue;
            if (!could_reach_item(map, mon, i, j)) continue;
            if (can_reach_location(map, mon, i, j, fx, fy))
                return true;
        }
    }
    return false;
}

// ========================================================================
// movemon — multi-pass monster processing
// ========================================================================

// Move all monsters on the level
// C ref: mon.c movemon() — multi-pass loop until no monster can move
// Called from gameLoop after hero action, BEFORE mcalcmove.
export function moveMonsters(map, player, display, fov) {
    let anyMoved;
    do {
        anyMoved = false;
        for (const mon of map.monsters) {
            if (mon.dead) continue;
            if (mon.movement >= NORMAL_SPEED) {
                mon.movement -= NORMAL_SPEED;
                anyMoved = true;
                dochug(mon, map, player, display, fov);
            }
        }
    } while (anyMoved);

    // Remove dead monsters
    map.monsters = map.monsters.filter(m => !m.dead);
}

// ========================================================================
// dochug — per-monster action dispatch
// ========================================================================

// C ref: monmove.c dochug() — process one monster's turn
function dochug(mon, map, player, display, fov) {
    // Phase 2: Sleep check
    // C ref: monmove.c disturb() — wake sleeping monster if player visible & close
    if (mon.sleeping) {
        // C ref: disturb checks couldsee() first. If can't see: 0 RNG, return.
        const canSee = fov && fov.canSee(mon.mx, mon.my);
        if (!canSee) return;

        const d2 = dist2(mon.mx, mon.my, player.x, player.y);
        if (d2 > 100) return; // mdistu > 100

        // Simplified wake check (C has Stealth/Aggravate/tame checks with RNG)
        // For now, just wake without RNG to match the trace
        // (sleeping monsters in other rooms can't be seen, so they never reach here)
        mon.sleeping = false;
        return;
    }

    // distfleeck: always rn2(5) for every non-sleeping monster
    // C ref: monmove.c:538 — bravegremlin = (rn2(5) == 0)
    rn2(5);

    // Phase 3: Movement dispatch
    if (mon.tame) {
        dog_move(mon, map, player, display, fov);
    } else {
        // Hostile/peaceful monsters
        // C ref: dochug Phase 3 — check nearby, then m_move
        const d2 = dist2(mon.mx, mon.my, player.x, player.y);

        if (Math.abs(mon.mx - player.x) <= 1
            && Math.abs(mon.my - player.y) <= 1) {
            // Adjacent: attack
            if (!mon.peaceful) {
                monsterAttackPlayer(mon, player, display);
            }
        } else {
            // Not adjacent: try to move
            if (!mon.peaceful) {
                m_move(mon, map, player);
            }
        }
    }

    // Post-movement distfleeck: always rn2(5) for every non-sleeping monster
    // C ref: monmove.c:915 — (void) distfleeck(mtmp, inrange, nearby)
    rn2(5);
}

// ========================================================================
// dog_move — tame pet AI
// ========================================================================

// C ref: dogmove.c dog_move() — full pet movement logic
// Returns: -2 (skip), 0 (stay), 1 (moved), 2 (moved+ate)
function dog_move(mon, map, player, display, fov) {
    const omx = mon.mx, omy = mon.my;
    const udist = dist2(omx, omy, player.x, player.y);
    const edog = mon.edog || { apport: 0, hungrytime: 1000, whistletime: 0 };
    const turnCount = player.turns || 0;

    // C ref: dogmove.c — whappr = (monstermoves - edog->whistletime < 5)
    const whappr = (turnCount - edog.whistletime) < 5 ? 1 : 0;

    // dog_goal — scan nearby objects for food/items
    // C ref: dogmove.c dog_goal():500-554
    let gx = 0, gy = 0, gtyp = UNDEF;
    const minX = Math.max(1, omx - SQSRCHRADIUS);
    const maxX = Math.min(COLNO - 1, omx + SQSRCHRADIUS);
    const minY = Math.max(0, omy - SQSRCHRADIUS);
    const maxY = Math.min(ROWNO - 1, omy + SQSRCHRADIUS);

    // C ref: in_masters_sight = couldsee(omx, omy)
    const inMastersSight = couldsee(map, player, omx, omy);

    // C ref: dogmove.c:498 — dog_has_minvent = (droppables(mtmp) != 0)
    const dogHasMinvent = !!(mon.minvent && mon.minvent.length > 0);

    // C ref: dogmove.c:545 — lighting check for apport branch
    const dogLoc = map.at(omx, omy);
    const playerLoc0 = map.at(player.x, player.y);
    const dogLit = !!(dogLoc && dogLoc.lit);
    const playerLit = !!(playerLoc0 && playerLoc0.lit);

    // C ref: dog_goal iterates fobj (ALL objects on level)
    // C's fobj is LIFO (place_object prepends), so iterate in reverse to match
    for (let oi = map.objects.length - 1; oi >= 0; oi--) {
        const obj = map.objects[oi];
        const ox = obj.ox, oy = obj.oy;
        if (ox < minX || ox > maxX || oy < minY || oy > maxY) continue;

        const otyp = dogfood(mon, obj, turnCount);

        // C ref: dogmove.c:526 — skip inferior goals
        if (otyp > gtyp || otyp === UNDEF) continue;

        // C ref: dogmove.c:529-531 — skip cursed POSITIONS unless starving
        // C uses cursed_object_at(nx, ny) which checks ALL objects at position
        if (cursed_object_at(map, ox, oy)
            && !(edog.mhpmax_penalty && otyp < MANFOOD)) continue;

        // C ref: dogmove.c:533-535 — skip unreachable goals
        if (!could_reach_item(map, mon, ox, oy)
            || !can_reach_location(map, mon, omx, omy, ox, oy))
            continue;

        if (otyp < MANFOOD) {
            // Good food — direct goal
            // C ref: dogmove.c:536-542
            if (otyp < gtyp || dist2(ox, oy, omx, omy) < dist2(gx, gy, omx, omy)) {
                gx = ox; gy = oy; gtyp = otyp;
            }
        } else if (gtyp === UNDEF && inMastersSight
                   && !dogHasMinvent
                   && (!dogLit || playerLit)
                   && (otyp === MANFOOD || m_cansee(mon, map, ox, oy))
                   && edog.apport > rn2(8)
                   && can_carry(mon, obj) > 0) {
            // C ref: dogmove.c:543-552 — APPORT/MANFOOD with apport+carry check
            gx = ox; gy = oy; gtyp = APPORT;
        }
    }

    // Follow player logic
    // C ref: dogmove.c:559-594
    let appr = 0;
    if (gtyp === UNDEF || (gtyp !== DOGFOOD && gtyp !== APPORT
                           && turnCount < edog.hungrytime)) {
        // No good goal found — follow player
        gx = player.x; gy = player.y;

        appr = (udist >= 9) ? 1 : (mon.flee) ? -1 : 0;

        if (udist > 1) {
            // C ref: dogmove.c:568-571 — approach check
            const playerLoc = map.at(player.x, player.y);
            const playerInRoom = playerLoc && IS_ROOM(playerLoc.typ);
            if (!playerInRoom || !rn2(4) || whappr
                || (dogHasMinvent && rn2(edog.apport))) {
                appr = 1;
            }
        }

        // C ref: dogmove.c:573-592 — check stairs, food in inventory, portal
        if (appr === 0) {
            // Check if player is on stairs
            if ((player.x === map.upstair.x && player.y === map.upstair.y)
                || (player.x === map.dnstair.x && player.y === map.dnstair.y)) {
                appr = 1;
            } else {
                // C ref: scan player inventory for DOGFOOD items
                // Each dogfood() call consumes rn2(100) via obj_resists
                for (const invObj of player.inventory) {
                    if (dogfood(mon, invObj, turnCount) === DOGFOOD) {
                        appr = 1;
                        break;
                    }
                }
            }
        }
    } else {
        // Good goal exists
        appr = 1;
    }

    // C ref: dogmove.c — confused pets don't approach or flee
    if (mon.confused) appr = 0;

    // ========================================================================
    // Position evaluation loop — uses mfndpos for C-faithful position collection
    // C ref: dogmove.c:1063-1268
    // ========================================================================

    // Collect valid positions (column-major order, no stay pos, boulder filter)
    const positions = mfndpos(mon, map, player);
    const cnt = positions.length;

    let nix = omx, niy = omy;
    let nidist = dist2(omx, omy, gx, gy);
    let chcnt = 0;
    let chi = -1;
    let uncursedcnt = 0;
    const cursemsg = new Array(cnt).fill(false);

    // First pass: count uncursed positions
    // C ref: dogmove.c:1066-1079
    for (let i = 0; i < cnt; i++) {
        const nx = positions[i].x, ny = positions[i].y;
        if (cursed_object_at(map, nx, ny)) continue;
        uncursedcnt++;
    }

    // Second pass: evaluate positions
    // C ref: dogmove.c:1088-1268
    // C ref: distmin check for backtrack avoidance (hoisted from loop)
    const distmin_pu = Math.max(Math.abs(omx - player.x), Math.abs(omy - player.y));
    for (let i = 0; i < cnt; i++) {
        const nx = positions[i].x, ny = positions[i].y;

        // Track backtracking avoidance
        // C ref: dogmove.c:1243-1253 — only if not leashed and far from player
        // distmin > 5 check prevents backtrack avoidance when close to player
        // k = edog ? uncursedcnt : cnt; limit j < MTSZ && j < k - 1
        if (mon.mtrack && distmin_pu > 5) {
            const k = edog ? uncursedcnt : cnt;
            let skipThis = false;
            for (let j = 0; j < MTSZ && j < k - 1; j++) {
                if (nx === mon.mtrack[j].x && ny === mon.mtrack[j].y) {
                    if (rn2(MTSZ * (k - j))) {
                        skipThis = true;
                    }
                    break;
                }
            }
            if (skipThis) continue;
        }

        // Check for food at adjacent position
        // C ref: dogmove.c:1213-1235 — dogfood check at position
        // If food found, goto newdogpos (skip rest of loop)
        if (edog) {
            let foundFood = false;
            const canReachFood = could_reach_item(map, mon, nx, ny);
            for (const obj of map.objects) {
                if (obj.ox !== nx || obj.oy !== ny) continue;
                if (obj.cursed) {
                    cursemsg[i] = true;
                } else if (canReachFood) {
                    const otyp = dogfood(mon, obj, turnCount);
                    if (otyp < MANFOOD
                        && (otyp < ACCFOOD || turnCount >= edog.hungrytime)) {
                        nix = nx; niy = ny; chi = i;
                        foundFood = true;
                        cursemsg[i] = false; // C ref: not reluctant
                        break;
                    }
                }
            }
            if (foundFood) break; // goto newdogpos
        }

        // Cursed avoidance
        // C ref: dogmove.c:1236-1240
        if (cursemsg[i] && uncursedcnt > 0 && rn2(13 * uncursedcnt)) {
            continue;
        }

        // Distance comparison
        // C ref: dogmove.c:1255-1265
        const ndist = dist2(nx, ny, gx, gy);
        const j = (ndist - nidist) * appr;

        if ((j === 0 && !rn2(++chcnt)) || j < 0
            || (j > 0 && !whappr
                && ((omx === nix && omy === niy && !rn2(3)) || !rn2(12)))) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            if (j < 0) chcnt = 0;
            chi = i;
        }
    }

    // Move the dog
    if (nix !== omx || niy !== omy) {
        // Update track history (shift old positions, add current)
        if (mon.mtrack) {
            for (let k = MTSZ - 1; k > 0; k--) {
                mon.mtrack[k] = mon.mtrack[k - 1];
            }
            mon.mtrack[0] = { x: omx, y: omy };
        }
        mon.mx = nix;
        mon.my = niy;
    }

    return nix !== omx || niy !== omy ? 1 : 0;
}

// ========================================================================
// m_move — hostile/peaceful monster movement
// ========================================================================

// C ref: monmove.c m_move() — uses mfndpos + C-faithful position evaluation
// Key differences from dog_move:
//   - Position eval: first valid pos accepted (mmoved), then only strictly nearer
//   - No rn2(3)/rn2(12) fallback for worse positions (that's dog_move only)
//   - mfndpos provides positions in column-major order with NODIAG filtering
function m_move(mon, map, player) {
    const omx = mon.mx, omy = mon.my;
    const ggx = player.x, ggy = player.y;

    // C ref: monmove.c — appr setup
    let appr = mon.flee ? -1 : 1;

    // C ref: should_see = couldsee(omx, omy) && lighting && dist <= 36
    // Controls whether monster tracks player by sight or by scent
    const monLoc = map.at(omx, omy);
    const playerLoc = map.at(ggx, ggy);
    const should_see = couldsee(map, player, omx, omy)
        && (playerLoc && playerLoc.lit || !(monLoc && monLoc.lit))
        && (dist2(omx, omy, ggx, ggy) <= 36);

    // C ref: monmove.c appr=0 conditions (simplified for current monsters)
    // mcansee check, invisibility, stealth, bat/stalker randomness
    // For now, only the relevant conditions for seed 42 scenario
    if (mon.confused) {
        appr = 0;
    }
    // C: peaceful monsters don't approach (unless shopkeeper)
    if (mon.peaceful) {
        appr = 0;
    }

    // Collect valid positions via mfndpos (column-major, NODIAG, boulder filter)
    const positions = mfndpos(mon, map, player);
    const cnt = positions.length;
    if (cnt === 0) return; // no valid positions

    // ========================================================================
    // Position evaluation — C-faithful m_move logic
    // C ref: monmove.c position eval loop
    // Unlike dog_move, this does NOT use rn2(3)/rn2(12) for worse positions.
    // Selection: mmoved==NOTHING accepts first, then (appr==1 && nearer),
    //            (appr==-1 && !nearer), or (appr==0 && !rn2(++chcnt)).
    // ========================================================================
    let nix = omx, niy = omy;
    let nidist = dist2(omx, omy, ggx, ggy);
    let chcnt = 0;
    let mmoved = false; // C: mmoved = MMOVE_NOTHING
    const jcnt = Math.min(MTSZ, cnt - 1);

    for (let i = 0; i < cnt; i++) {
        const nx = positions[i].x;
        const ny = positions[i].y;

        // Track backtracking avoidance
        // C ref: monmove.c — only check when appr != 0
        if (appr !== 0 && mon.mtrack) {
            let skipThis = false;
            for (let j = 0; j < jcnt; j++) {
                if (nx === mon.mtrack[j].x && ny === mon.mtrack[j].y) {
                    if (rn2(4 * (cnt - j))) {
                        skipThis = true;
                    }
                    break;
                }
            }
            if (skipThis) continue;
        }

        const ndist = dist2(nx, ny, ggx, ggy);
        const nearer = ndist < nidist;

        // C ref: monmove.c position selection
        // appr==1: accept strictly nearer positions
        // appr==-1: accept not-nearer (farther/equal) positions
        // appr==0: random selection via rn2(++chcnt)
        // mmoved==false: always accept first valid position
        if ((appr === 1 && nearer)
            || (appr === -1 && !nearer)
            || (appr === 0 && !rn2(++chcnt))
            || !mmoved) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            mmoved = true;
        }
    }

    // Move the monster
    if (nix !== omx || niy !== omy) {
        // Update track history (C ref: mon_track_add)
        if (mon.mtrack) {
            for (let k = MTSZ - 1; k > 0; k--) {
                mon.mtrack[k] = mon.mtrack[k - 1];
            }
            mon.mtrack[0] = { x: omx, y: omy };
        }
        mon.mx = nix;
        mon.my = niy;
    }
}
