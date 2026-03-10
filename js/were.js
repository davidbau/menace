// were.js -- Lycanthropy mechanics
// cf. were.c — lycanthrope form changes, summoning, and player lycanthropy

import { rn2, rnd, rn1 } from './rng.js';
import { makemon } from './makemon.js';
import { NO_MM_FLAGS } from './const.js';
import { canseemon } from './mondata.js';
import { mon_break_armor } from './worn.js';
import { newsym } from './display.js';
import { possibly_unwield } from './weapon.js';
import { nhimport } from './origin_awaits.js';
import {
    mons,
    PM_WERERAT,
    PM_WEREJACKAL,
    PM_WEREWOLF,
    PM_HUMAN_WERERAT,
    PM_HUMAN_WEREJACKAL,
    PM_HUMAN_WEREWOLF,
    PM_SEWER_RAT,
    PM_GIANT_RAT,
    PM_RABID_RAT,
    PM_JACKAL,
    PM_FOX,
    PM_COYOTE,
    PM_WOLF,
    PM_WARG,
    PM_WINTER_WOLF,
    PM_WINTER_WOLF_CUB,
} from './monsters.js';

// cf. were.c:48 — map lycanthrope to its alternate form
export function counter_were(pm) {
    switch (pm) {
    case PM_WEREWOLF:
        return PM_HUMAN_WEREWOLF;
    case PM_HUMAN_WEREWOLF:
        return PM_WEREWOLF;
    case PM_WEREJACKAL:
        return PM_HUMAN_WEREJACKAL;
    case PM_HUMAN_WEREJACKAL:
        return PM_WEREJACKAL;
    case PM_WERERAT:
        return PM_HUMAN_WERERAT;
    case PM_HUMAN_WERERAT:
        return PM_WERERAT;
    default:
        return null;
    }
}

// cf. were.c:70 — convert monsters similar to werecritters into appropriate werebeast
export function were_beastie(pm) {
    switch (pm) {
    case PM_WERERAT:
    case PM_SEWER_RAT:
    case PM_GIANT_RAT:
    case PM_RABID_RAT:
        return PM_WERERAT;
    case PM_WEREJACKAL:
    case PM_JACKAL:
    case PM_FOX:
    case PM_COYOTE:
        return PM_WEREJACKAL;
    case PM_WEREWOLF:
    case PM_WOLF:
    case PM_WARG:
    case PM_WINTER_WOLF:
    case PM_WINTER_WOLF_CUB:
        return PM_WEREWOLF;
    default:
        return null;
    }
}

// Helper: check if mndx is a human were form (not in C; derived from counter_were logic)
function isHumanWereForm(mndx) {
    return mndx === PM_HUMAN_WERERAT
        || mndx === PM_HUMAN_WEREJACKAL
        || mndx === PM_HUMAN_WEREWOLF;
}

// canSeeMonster: alias for shared canseemon (mondata.js)
const canSeeMonster = canseemon;

// Helper: wake monsters near a location (cf. mon.c:4369 wake_nearto_core)
function wakeNear(map, x, y, dist2max) {
    if (!map?.monsters) return;
    for (const mon of map.monsters) {
        if (!mon || mon.dead) continue;
        const dx = mon.mx - x;
        const dy = mon.my - y;
        if ((dx * dx + dy * dy) >= dist2max) continue;
        mon.sleeping = false;
        mon.msleeping = false;
    }
}

// cf. were.c:96 — apply lycanthrope form change (wake, heal, update data)
export async function new_were(mon, newMndx, ctx = null) {
    const data = mons[newMndx];
    if (!data) return;
    mon.mndx = newMndx;
    mon.data = data;
    mon.type = data;
    mon.name = data.mname;
    mon.speed = data.mmove;
    mon.attacks = data.mattk;

    // Transformation wakes helpless monsters
    if (mon.sleeping || (mon.mfrozen > 0) || mon.mcanmove === false) {
        mon.sleeping = false;
        mon.msleeping = false;
        mon.mfrozen = 0;
        mon.mcanmove = true;
    }

    // Heal 1/4 of missing HP
    const hp = mon.mhp ?? 0;
    const hpmax = mon.mhpmax ?? hp;
    const heal = Math.max(0, Math.floor((hpmax - hp) / 4));
    mon.mhp = Math.min(hpmax, hp + heal);
    newsym(mon.mx, mon.my);
    await mon_break_armor(mon, false, ctx?.map || null, {
        player: ctx?.player || null,
        fov: ctx?.fov || null,
        display: ctx?.display || null,
    });
    possibly_unwield(mon, false);
}

// cf. were.c:9 — turn-end lycanthrope form change check
export async function were_change(mon, ctx) {
    if (!mon || mon.dead) return;

    const otherForm = counter_were(mon.mndx);
    if (otherForm == null) {
        return;
    }

    const protectedFromShifters = !!ctx?.player?.protectionFromShapeChangers;

    if (isHumanWereForm(mon.mndx)) {
        // Human form: chance to change into animal form
        // C ref: were.c:16 — threshold depends on night() and flags.moonphase
        // Using rn2(50) as stable default; night()/moonphase depend on wall-clock
        // time which differs between C recording and JS replay, causing divergence.
        // TODO: freeze replay time to match C session recording time
        if (protectedFromShifters) return;
        if (rn2(50) !== 0) return;

        await new_were(mon, otherForm, ctx);

        // Unseen jackal/wolf change can trigger howl + wake_nearto
        const deaf = !!ctx?.player?.deaf;
        if (deaf || canSeeMonster(mon, ctx?.player, ctx?.fov)) return;
        let howler = null;
        if (mon.mndx === PM_WEREWOLF) howler = 'wolf';
        if (mon.mndx === PM_WEREJACKAL) howler = 'jackal';
        if (!howler) return;
        ctx?.display?.putstr_message?.(`You hear a ${howler} howling at the moon.`);
        wakeNear(ctx?.map, mon.mx, mon.my, 16);
        return;
    }

    // Beast form: chance to revert to human form
    if (rn2(30) === 0 || protectedFromShifters) {
        await new_were(mon, otherForm, ctx);
    }
}

// cf. were.c:142 — summon a horde of were-associated creatures (1-5)
// ptr:   permonst of the summoning lycanthrope
// x, y:  spawn location (player position in C)
// yours: if true, summoned creatures should be tamed (tamedog TODO)
// ctx:   game context with optional player.protectionFromShapeChangers + fov
// map:   GameMap for makemon placement
// depth: dungeon depth for makemon
// Returns { total, visible, genbuf } where genbuf is 'rat'|'jackal'|'wolf'|null
export function were_summon(ptr, x, y, yours, ctx, map, depth) {
    const pm = mons.indexOf(ptr);
    let total = 0, visible = 0, genbuf = null;

    if (ctx?.player?.protectionFromShapeChangers && !yours) return { total, visible, genbuf };

    for (let i = rnd(5); i > 0; i--) {
        let typ;
        switch (pm) {
        case PM_WERERAT:
        case PM_HUMAN_WERERAT:
            typ = rn2(3) ? PM_SEWER_RAT : rn2(3) ? PM_GIANT_RAT : PM_RABID_RAT;
            genbuf = 'rat';
            break;
        case PM_WEREJACKAL:
        case PM_HUMAN_WEREJACKAL:
            typ = rn2(7) ? PM_JACKAL : rn2(3) ? PM_COYOTE : PM_FOX;
            genbuf = 'jackal';
            break;
        case PM_WEREWOLF:
        case PM_HUMAN_WEREWOLF:
            typ = rn2(5) ? PM_WOLF : rn2(2) ? PM_WARG : PM_WINTER_WOLF;
            genbuf = 'wolf';
            break;
        default:
            continue;
        }
        const mtmp = makemon(mons[typ], x, y, NO_MM_FLAGS, depth || 1, map);
        if (mtmp) {
            total++;
            if (canSeeMonster(mtmp, ctx?.player, ctx?.fov)) visible++;
        }
        // TODO: were.c:183 — if (yours && mtmp) tamedog(mtmp) — tamedog not yet in JS
    }
    return { total, visible, genbuf };
}

// cf. were.c:192 — you_were(): player changes to lycanthrope beast form
// JS note: full polymorph-control UX is not yet wired here; caller can supply
// ctx.polymon(player, mndx) and ctx.monster_nearby() for deeper fidelity.
export async function you_were(player, ctx = {}) {
    if (!player) return false;
    if (player.Unchanging || player.unchanging) return false;
    if (!Number.isInteger(player.ulycn) || player.ulycn < 0) return false;
    if (player.umonnum === player.ulycn) return false;

    const stunnedOrUnaware = !!(player.stunned || player.Stunned
        || player.unaware || player.Unaware);
    const polymorphControl = !!(player.polyControl || player.Polymorph_control);
    const controllable_poly = polymorphControl && !stunnedOrUnaware;

    if (controllable_poly) {
        if (typeof ctx.confirmWerechange === 'function') {
            if (!ctx.confirmWerechange(player)) return false;
        }
    } else {
        let nearby = false;
        if (typeof ctx.monster_nearby === 'function') {
            nearby = !!ctx.monster_nearby();
        } else if (ctx.map && player && Number.isInteger(player.x) && Number.isInteger(player.y)) {
            const { monster_nearby } = await nhimport('./hack.js');
            nearby = !!monster_nearby(ctx.map, player, ctx.fov || null);
        }
        if (nearby) return false;
    }

    player.were_changes = Number(player.were_changes || 0) + 1;
    let polymonFn = null;
    if (typeof ctx.polymon === 'function') {
        polymonFn = ctx.polymon;
    } else if (ctx.useRuntime === true) {
        polymonFn = (await nhimport('./polyself.js')).polymon;
    }
    if (typeof polymonFn === 'function') {
        await polymonFn(player, player.ulycn, ctx.map || null);
    } else {
        // Minimal fallback used by tests/non-polymorph contexts.
        player.umonnum = player.ulycn;
        if (!(player.mtimedone > 0)) player.mtimedone = rn1(500, 500);
    }
    return true;
}

// cf. were.c:213 — you_unwere(purify): revert hero from lycanthrope beast form
// JS note: caller can supply ctx.rehumanize(player) and ctx.monster_nearby().
export async function you_unwere(player, purify, ctx = {}) {
    if (!player) return false;
    if (purify) set_ulycn(player, -1);

    const pm = Number.isInteger(player.umonnum) ? player.umonnum : null;
    const isWereForm = (pm != null && counter_were(pm) != null);

    if (player.Unchanging || player.unchanging) return false;

    const stunnedOrUnaware = !!(player.stunned || player.Stunned
        || player.unaware || player.Unaware);
    const polymorphControl = !!(player.polyControl || player.Polymorph_control);
    const controllable_poly = polymorphControl && !stunnedOrUnaware;

    let nearby = false;
    if (typeof ctx.monster_nearby === 'function') {
        nearby = !!ctx.monster_nearby();
    } else if (ctx.map && Number.isInteger(player.x) && Number.isInteger(player.y)) {
        const { monster_nearby } = await nhimport('./hack.js');
        nearby = !!monster_nearby(ctx.map, player, ctx.fov || null);
    }

    let remainInBeast = false;
    if (isWereForm && controllable_poly && typeof ctx.confirmRemainBeast === 'function') {
        remainInBeast = !!ctx.confirmRemainBeast(player);
    }

    if (isWereForm && !nearby && !remainInBeast) {
        let rehumanizeFn = null;
        if (typeof ctx.rehumanize === 'function') {
            rehumanizeFn = ctx.rehumanize;
        } else if (ctx.useRuntime === true) {
            rehumanizeFn = (await nhimport('./polyself.js')).rehumanize;
        }
        if (typeof rehumanizeFn === 'function') {
            await rehumanizeFn(player);
        } else {
            player.mtimedone = 0;
            if (Number.isInteger(player.umonster) && player.umonster >= 0) {
                player.umonnum = player.umonster;
            }
        }
        return true;
    }
    if (isWereForm && !(player.mtimedone > 0)) {
        player.mtimedone = rn1(200, 200);
    }
    return false;
}

// cf. were.c:232 — set/clear player lycanthropy type
export function set_ulycn(player, which) {
    if (!player) return;
    player.ulycn = which;
    if (typeof player.set_uasmon === 'function') {
        player.set_uasmon(player);
    }
}
