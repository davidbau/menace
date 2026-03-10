// steed.js -- Riding steeds (saddle, mount, dismount)
// cf. steed.c -- saddle application, mounting/dismounting, steed movement and kicks

import { rn2, rnd, rn1 } from './rng.js';
import {
    isok, A_WIS, A_DEX, A_CHA, W_SADDLE, ROOM, CORR,
    DISMOUNT_BYCHOICE, DISMOUNT_THROWN, DISMOUNT_KNOCKED, DISMOUNT_FELL,
    DISMOUNT_POLY, DISMOUNT_ENGULFED, DISMOUNT_BONES, DISMOUNT_GENERIC,
} from './const.js';
import { pline, You, Your, You_feel, You_cant, pline_The } from './pline.js';
import { exercise } from './attrib_exercise.js';
import { Monnam, mon_nam } from './do_name.js';
import { is_humanoid, slithy, amorphous, noncorporeal, is_whirly,
         unsolid, is_swimmer, is_floater, is_flyer,
         grounded, bigmonst, verysmall } from './mondata.js';
import { MZ_MEDIUM, MZ_SMALL, MZ_LARGE,
         S_QUADRUPED, S_UNICORN, S_ANGEL, S_CENTAUR, S_DRAGON,
         S_JABBERWOCK, PM_KNIGHT } from './monsters.js';
import { which_armor } from './worn.js';
import { SADDLE } from './objects.js';

// Monsters that might be ridden
const STEEDS = [S_QUADRUPED, S_UNICORN, S_ANGEL, S_CENTAUR, S_DRAGON, S_JABBERWOCK];

// MAXULEV for steed taming checks
const MAXULEV = 30;

// cf. steed.c:17 -- rider_cant_reach(): print message when rider can't reach something
export async function rider_cant_reach(player) {
    if (player.usteed) {
        await You("aren't skilled enough to reach from %s.", mon_nam(player.usteed));
    }
}

// cf. steed.c:26 -- can_saddle(mtmp): can this monster wear a saddle?
export function can_saddle(mtmp) {
    const ptr = mtmp.data || mtmp.type;
    if (!ptr) return false;
    return STEEDS.includes(ptr.mlet)
        && (ptr.msize >= MZ_MEDIUM)
        && (!is_humanoid(ptr) || ptr.mlet === S_CENTAUR)
        && !amorphous(ptr)
        && !noncorporeal(ptr)
        && !is_whirly(ptr)
        && !unsolid(ptr);
}

// cf. steed.c:169 -- can_ride(mtmp): can hero ride this monster?
export function can_ride(mtmp, player) {
    const playerType = player.type || {};
    return !!(mtmp.mtame
        && is_humanoid(playerType)
        && !verysmall(playerType)
        && !bigmonst(playerType)
        && (!player.underwater || is_swimmer(mtmp.data || mtmp.type || {})));
}

// cf. steed.c:142 -- put_saddle_on_mon(saddle, mtmp): put a saddle on a monster
export function put_saddle_on_mon(saddle, mtmp) {
    if (!can_saddle(mtmp) || which_armor(mtmp, W_SADDLE)) {
        return;
    }
    // If no saddle object provided, create one
    // (In practice, the caller usually provides one)
    if (!saddle) return;

    // Add saddle to monster's inventory
    if (!mtmp.minvent) mtmp.minvent = [];
    mtmp.minvent.push(saddle);
    mtmp.misc_worn_check = (mtmp.misc_worn_check || 0) | W_SADDLE;
    saddle.owornmask = W_SADDLE;
    saddle.leashmon = mtmp.m_id;
}

// C ref: steed.c:36 — use_saddle()
// Simplified saddle application helper used by apply flows.
export async function use_saddle(otmp, player, map, display, dx = 0, dy = 0) {
    if (!player || !map || !otmp) return 0;
    if (!dx && !dy) {
        if (display) await display.putstr_message('Saddle yourself?  Very funny...');
        return 0;
    }
    const tx = (player.x ?? player.ux ?? 0) + dx;
    const ty = (player.y ?? player.uy ?? 0) + dy;
    const mtmp = map.monsterAt ? map.monsterAt(tx, ty)
        : (map.monsters || []).find((m) => m && m.mx === tx && m.my === ty && !m.dead);
    if (!mtmp) {
        if (display) await display.putstr_message('I see nobody there.');
        return 0;
    }
    if ((mtmp.misc_worn_check & W_SADDLE) || which_armor(mtmp, W_SADDLE)) {
        if (display) await display.putstr_message(`${Monnam(mtmp)} doesn't need another one.`);
        return 0;
    }
    if (!can_saddle(mtmp)) {
        if (display) await display.putstr_message("You can't saddle such a creature.");
        return 0;
    }
    put_saddle_on_mon(otmp, mtmp);
    if (display) await display.putstr_message(`You put the saddle on ${mon_nam(mtmp)}.`);
    return 1;
}

// cf. steed.c:827 -- maybewakesteed(steed): wake sleeping/paralyzed steed
export async function maybewakesteed(steed) {
    const wasimmobile = !!(steed.msleeping || (steed.mfrozen && !steed.mcanmove));

    steed.msleeping = 0;
    steed.sleeping = false;
    let frozen = steed.mfrozen || 0;
    if (frozen) {
        frozen = Math.floor((frozen + 1) / 2); // half
        if (!rn2(frozen)) {
            steed.mfrozen = 0;
            steed.mcanmove = 1;
        } else {
            steed.mfrozen = frozen;
        }
    }
    const isNowImmobile = !!(steed.msleeping || (steed.mfrozen && !steed.mcanmove));
    if (wasimmobile && !isNowImmobile)
        await pline("%s wakes up.", Monnam(steed));
    // regardless of waking, terminate any meal in progress
    if (steed.meating) steed.meating = 0;
}

// cf. steed.c:178 -- doride(): #ride command
export async function doride(player, map, display) {
    if (player.usteed) {
        await dismount_steed(player, map, display, DISMOUNT_BYCHOICE);
        return 1; // ECMD_TIME
    }
    // TODO: getdir() to pick adjacent monster to mount
    // For now, simplified — look for adjacent tame saddled monster
    await pline("You don't see anything to ride here.");
    return 0; // ECMD_OK
}

// cf. steed.c:197 -- mount_steed(mtmp, force): start riding a monster
export async function mount_steed(mtmp, force, player, map, display) {
    // Sanity checks
    if (player.usteed) {
        await You("are already riding %s.", mon_nam(player.usteed));
        return false;
    }

    if (!mtmp) {
        await pline("I see nobody there.");
        return false;
    }

    // Is the player in the right form?
    if (player.hallucinating && !force) {
        await pline("Maybe you should find a designated driver.");
        return false;
    }

    if (player.wounded_legs && !force) {
        await pline("Your legs are in no shape for riding.");
        return false;
    }

    const playerType = player.type || {};
    if (player.polymorphed && (!is_humanoid(playerType)
                   || verysmall(playerType)
                   || bigmonst(playerType)
                   || slithy(playerType))) {
        await You("won't fit on a saddle.");
        return false;
    }

    // Encumbrance check
    if (!force && (player.encumbrance || 0) > 1) { // > SLT_ENCUMBER
        await You_cant("do that while carrying so much stuff.");
        return false;
    }

    // Visibility check
    if (!force && (player.blind && !player.telepathy)) {
        await pline("I see nobody there.");
        return false;
    }

    // Valid monster checks
    const otmp = which_armor(mtmp, W_SADDLE);
    if (!otmp) {
        await pline("%s is not saddled.", Monnam(mtmp));
        return false;
    }

    const ptr = mtmp.data || mtmp.type;

    // Touch petrification check
    // TODO: touch_petrifies check

    if (!mtmp.mtame || mtmp.isminion) {
        await pline("I think %s would mind.", mon_nam(mtmp));
        return false;
    }

    if (mtmp.mtrapped) {
        await You_cant("mount %s while it's trapped.", mon_nam(mtmp));
        return false;
    }

    // Tameness decrement for non-knight
    if (!force && player.roleMnum !== PM_KNIGHT && mtmp.mtame) {
        mtmp.mtame--;
        if (!mtmp.mtame) {
            await pline("%s resists!", Monnam(mtmp));
            return false;
        }
    }

    if (!force && player.underwater && !is_swimmer(ptr || {})) {
        await You_cant("ride that creature while under water.");
        return false;
    }

    if (!can_saddle(mtmp) || !can_ride(mtmp, player)) {
        await You_cant("ride such a creature.");
        return false;
    }

    // Impairment: Levitation check
    if (!force && !is_floater(ptr || {}) && !is_flyer(ptr || {})
        && player.levitating && !player.lev_at_will) {
        await You("cannot reach %s.", mon_nam(mtmp));
        return false;
    }

    // Rusty/corroded armor check
    // TODO: is_metallic(uarm) && greatest_erosion(uarm) check

    // Slip check
    if (!force
        && (player.confused || player.fumbling || player.glib
            || player.wounded_legs || otmp.cursed || otmp.greased
            || ((player.ulevel || 1) + mtmp.mtame < rnd(Math.floor(MAXULEV / 2) + 5)))) {
        if (player.levitating) {
            await pline("%s slips away from you.", Monnam(mtmp));
            return false;
        }
        await You("slip while trying to get on %s.", mon_nam(mtmp));
        // RNG parity: rn1(5, 10) for damage
        const dmg = rn1(5, 10);
        // TODO: losehp(Maybe_Half_Phys(dmg), buf, NO_KILLER_PREFIX)
        return false;
    }

    // Success
    await maybewakesteed(mtmp);
    if (!force) {
        if (player.levitating && !is_floater(ptr || {}) && !is_flyer(ptr || {}))
            await pline("%s magically floats up!", Monnam(mtmp));
        await You("mount %s.", mon_nam(mtmp));
        if (player.flying)
            await You("and %s take flight together.", mon_nam(mtmp));
    }

    // Set up steed
    player.usteed = mtmp;

    // Remove steed from map monster grid (it's now "on" the hero)
    map.removeMonster(mtmp);

    // Move hero to steed's former position
    // TODO: teleds(mtmp.mx, mtmp.my, TELEDS_ALLOW_DRAG)
    player.x = mtmp.mx;
    player.y = mtmp.my;

    return true;
}

// cf. steed.c:387 -- exercise_steed(): called each move while riding
export function exercise_steed(player) {
    if (!player.usteed)
        return;

    if (player.urideturns === undefined)
        player.urideturns = 0;

    if (++player.urideturns >= 100) {
        player.urideturns = 0;
        // TODO: use_skill(P_RIDING, 1)
    }
}

// cf. steed.c:402 -- kick_steed(): hero kicks or whips the steed
export async function kick_steed(player, map, display) {
    if (!player.usteed)
        return;

    const steed = player.usteed;

    // Sleeping/paralyzed steed
    if (steed.msleeping || (steed.mfrozen && !steed.mcanmove)) {
        if ((steed.mcanmove || steed.mfrozen) && !rn2(2)) {
            if (steed.mcanmove) {
                steed.msleeping = 0;
                steed.sleeping = false;
            } else if (steed.mfrozen > 2) {
                steed.mfrozen -= 2;
            } else {
                steed.mfrozen = 0;
                steed.mcanmove = 1;
            }
            const stillHelpless = steed.msleeping || (steed.mfrozen && !steed.mcanmove);
            if (stillHelpless)
                await pline("It stirs.");
            else
                await pline("It rouses itself!");
        } else {
            await pline("It does not respond.");
        }
        return;
    }

    // Make the steed less tame
    if (steed.mtame)
        steed.mtame--;

    if (!steed.mtame
        || ((player.ulevel || 1) + steed.mtame < rnd(Math.floor(MAXULEV / 2) + 5))) {
        await dismount_steed(player, map, display, DISMOUNT_THROWN);
        return;
    }

    await pline("%s gallops!", Monnam(steed));
    player.ugallop = (player.ugallop || 0) + rn1(20, 30);
}

// cf. steed.c:459 -- landing_spot(): find dismount landing spot
function landing_spot(player, map, reason) {
    // Try adjacent squares for a valid landing position
    const dirs = [
        [-1, 0], [0, -1], [1, 0], [0, 1],
        [-1, -1], [1, -1], [-1, 1], [1, 1]
    ];

    for (const [dx, dy] of dirs) {
        const nx = player.x + dx;
        const ny = player.y + dy;
        if (!isok(nx, ny)) continue;
        const loc = map.at(nx, ny);
        if (!loc) continue;
        // Check accessible and not occupied by monster
        // Simplified: check that it's a walkable tile
        const typ = loc.typ;
        if (typ >= ROOM || typ === CORR) {
            if (!map.monsterAt(nx, ny)) {
                return { x: nx, y: ny };
            }
        }
    }
    return null;
}

// cf. steed.c:576 -- dismount_steed(reason): stop riding
export async function dismount_steed(player, map, display, reason) {
    const mtmp = player.usteed;
    if (!mtmp) return;

    const repair_leg_damage = !!player.wounded_legs;
    const have_spot = landing_spot(player, map, reason);

    // Check the reason for dismounting
    const otmp = which_armor(mtmp, W_SADDLE);
    switch (reason) {
    case DISMOUNT_THROWN:
        await You("are thrown off of %s!", mon_nam(mtmp));
        {
            const dmg = rn1(10, 10);
            // TODO: losehp(Maybe_Half_Phys(dmg), "riding accident", KILLED_BY_AN)
            // TODO: set_wounded_legs(BOTH_SIDES, HWounded_legs + rn1(5, 5))
            rn1(5, 5); // RNG parity for wounded legs
        }
        break;
    case DISMOUNT_KNOCKED:
    case DISMOUNT_FELL:
        await You("fall off of %s!", mon_nam(mtmp));
        if (!player.levitating && !player.flying) {
            const dmg = rn1(10, 10);
            // TODO: losehp(Maybe_Half_Phys(dmg), "riding accident", KILLED_BY_AN)
            rn1(5, 5); // RNG parity for wounded legs
        }
        break;
    case DISMOUNT_POLY:
        await You("can no longer ride %s.", mon_nam(mtmp));
        break;
    case DISMOUNT_ENGULFED:
        // caller displays message
        break;
    case DISMOUNT_BONES:
        // hero has just died
        break;
    case DISMOUNT_GENERIC:
        // no messages
        break;
    case DISMOUNT_BYCHOICE:
    default:
        if (otmp && otmp.cursed) {
            await You_cant("The saddle seems to be cursed.");
            return;
        }
        if (!have_spot) {
            await You_cant("There isn't anywhere for you to stand.");
            return;
        }
        await You("dismount %s.", mon_nam(mtmp));
        break;
    }

    // Heal steed's wounded legs on dismount
    if (repair_leg_damage) {
        player.wounded_legs = 0;
    }

    // Release the steed
    player.usteed = null;
    player.ugallop = 0;

    // Place the steed back on the map at hero's position
    if (mtmp.mhp > 0) {
        place_monster(mtmp, player.x, player.y, map);

        // Move hero to landing spot if available
        if (have_spot && reason !== DISMOUNT_ENGULFED
            && reason !== DISMOUNT_BONES) {
            player.x = have_spot.x;
            player.y = have_spot.y;
        }
    }
}

// cf. steed.c:852 -- poly_steed(steed, oldshape): handle steed polymorphing
export async function poly_steed(steed, oldshape, player, map, display) {
    if (!can_saddle(steed) || !can_ride(steed, player)) {
        await dismount_steed(player, map, display, DISMOUNT_FELL);
    } else {
        await You("adjust yourself in the saddle on %s.", mon_nam(steed));
    }
}

// cf. steed.c:878 -- stucksteed(checkfeeding): check if steed can move
export async function stucksteed(player, checkfeeding) {
    const steed = player.usteed;
    if (steed) {
        // check whether steed can move
        if (steed.msleeping || (steed.mfrozen && !steed.mcanmove)) {
            await pline("%s won't move!", Monnam(steed));
            return true;
        }
        // optionally check whether steed is in the midst of a meal
        if (checkfeeding && steed.meating) {
            await pline("%s is still eating.", Monnam(steed));
            return true;
        }
    }
    return false;
}

// cf. steed.c:898 -- place_monster(mon, x, y): place a monster at map coordinates
export function place_monster(mon, x, y, map) {
    if (!isok(x, y) && (x !== 0 || y !== 0)) {
        // Invalid coordinates — try (0,0) as fallback for vault guards
        x = 0;
        y = 0;
    }

    // Set monster position
    mon.mx = x;
    mon.my = y;

    // Add to map if not already present
    if (map && map.monsters) {
        // Check if monster is already in the list
        if (!map.monsters.includes(mon)) {
            map.addMonster(mon);
        }
    }
}
