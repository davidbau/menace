// kick.js -- Kicking doors, monsters, and objects
// cf. kick.c — dokick() and related functions

import { IS_DOOR, D_LOCKED, D_CLOSED, D_ISOPEN, D_BROKEN, D_NODOOR,
         IRONBARS, TREE, THRONE, ALTAR, FOUNTAIN, GRAVE, SINK,
         IS_STWALL, STAIRS, LADDER, LA_DOWN,
         A_STR, A_DEX, A_CON, SHOPBASE, ROOMOFFSET,
         RIGHT_SIDE } from './const.js';
import { rn2, rnd, rnl } from './rng.js';
import { exercise } from './attrib_exercise.js';
import { Luck, acurr } from './attrib.js';
import { x_monnam, is_watch } from './mondata.js';
import { KICKING_BOOTS } from './objects.js';
import { mondead, angry_guards, wake_nearto } from './mon.js';
import { newsym } from './display.js';
import { more, nhgetch } from './input.js';
import { DIRECTION_KEYS } from './const.js';
import { u_wipe_engr } from './engrave.js';
import { set_wounded_legs, legs_in_no_shape } from './do.js';
import { recalc_block_point, couldsee } from './vision.js';
import { add_damage, pay_for_damage } from './shk.js';
import { in_town } from './hack.js';

function hasMartialBonus(player) {
    const roleName = String(player?.role || '').toLowerCase();
    const roleAbbr = String(player?.roleAbbr || '').toLowerCase();
    const roleTitle = String(player?.roleName || '').toLowerCase();
    const monkOrSamurai = roleName === 'monk' || roleName === 'samurai'
        || roleAbbr === 'mon' || roleAbbr === 'sam'
        || roleTitle === 'monk' || roleTitle === 'samurai';
    // Kicking boots grant martial-style kicking in C's martial() macro.
    const wearingKickingBoots = !!(player?.boots && player.boots.otyp === KICKING_BOOTS);
    return monkOrSamurai || wearingKickingBoots;
}

// Handle kicking
// C ref: dokick.c dokick()
export async function handleKick(player, map, display, game) {
    // C ref: dokick.c:1279 — check wounded legs BEFORE asking direction
    const hasWoundedLegs = !!player?.woundedLegs
        || !!(player?.hWoundedLegs > 0)
        || !!((Number(player?.eWoundedLegs || 0) & 0x60000) !== 0);
    if (hasWoundedLegs) {
        await legs_in_no_shape("kicking", false, player);
        // C ref: dokick.c:1314 — display_nhwindow(WIN_MESSAGE, TRUE)
        // Consume a key for --More-- to match C's step boundary.
        await more(display, { game,
            site: 'kick.handleKick.woundedLegs.morePrompt',
        });
        return { moved: false, tookTime: false };
    }
    await display.putstr_message('In what direction? ');
    const dirCh = await nhgetch();
    // C getdir() prompt is transient; clear it before reporting kick outcome.
    if (display) {
        display.topMessage = null;
        display.messageNeedsMore = false;
    }
    const c = String.fromCharCode(dirCh);
    let dir = DIRECTION_KEYS[c];
    // Match getdir-style tty behavior used by recorded sessions.
    if (!dir && (dirCh === 10 || dirCh === 13)) {
        dir = DIRECTION_KEYS.j;
    }
    if (!dir) {
        if (game.flags.verbose) {
            await display.putstr_message("Never mind.");
        }
        return { moved: false, tookTime: false };
    }
    // C ref: dokick.c dokick() — successful kick direction smudges engraving.
    await u_wipe_engr(player, map, 2);

    const nx = player.x + dir[0];
    const ny = player.y + dir[1];
    player.kickedloc = { x: nx, y: ny };
    const loc = map.at(nx, ny);

    if (!loc) return { moved: false, tookTime: false };

    // Kick a monster
    const mon = map.monsterAt(nx, ny);
    if (mon) {
        await display.putstr_message(`You kick the ${x_monnam(mon)}!`);
        const damage = rnd(4) + player.strDamage;
        mon.mhp -= Math.max(1, damage);
        if (mon.mhp <= 0) {
            mondead(mon, map, player);
            await display.putstr_message(`The ${x_monnam(mon)} dies!`);
            map.removeMonster(mon);
        }
        return { moved: false, tookTime: true };
    }

    // Kick a closed or locked door (C kick_door handles both the same way).
    if (IS_DOOR(loc.typ) && (loc.flags & (D_LOCKED | D_CLOSED))) {
        await exercise(player, A_DEX, true);
        const str = acurr(player, A_STR);
        const dex = acurr(player, A_DEX);
        const con = acurr(player, A_CON);
        const avrgAttrib = Math.floor((str + dex + con) / 3);
        const roomno = Number(loc.roomno);
        const room = (Number.isInteger(roomno) && roomno >= ROOMOFFSET)
            ? map?.rooms?.[roomno - ROOMOFFSET]
            : null;
        const shopdoor = !!(room && Number.isFinite(room.rtype) && room.rtype >= SHOPBASE);
        const dexBonus = hasMartialBonus(player) ? dex : 0;
        const kickedOpen = rnl(35, Luck(player)) < (avrgAttrib + dexBonus);
        if (kickedOpen) {
            // C ref: dokick.c:940 — do not roll rn2(5) for shop doors.
            if (str > 18 && !shopdoor && rn2(5) === 0) {
                await display.putstr_message("As you kick the door, it shatters to pieces!");
                loc.flags = D_NODOOR;
            } else {
                await display.putstr_message("As you kick the door, it crashes open!");
                loc.flags = D_BROKEN;
            }
            // C ref: dokick.c kick_door() updates map cell immediately.
            newsym(nx, ny);
            recalc_block_point(nx, ny);
            await exercise(player, A_STR, true);
            if (shopdoor) {
                // C ref: dokick.c:953-956
                add_damage(nx, ny, 400, map, game?.moves ?? 0);
                pay_for_damage('break', false, map, player, game?.moves ?? 0);
            }
            // C ref: dokick.c:957-958 — in_town() then get_iter_mons(watchman_thief_arrest)
            if (in_town(nx, ny, map)) {
                await maybeWatchmanThiefArrest(map, player, display);
            }
        } else {
            await exercise(player, A_STR, true);
            // C ref: dokick.c:966 — Deaf (or rn2==0) yields "Thwack", else "Whammm".
            const isDeaf = !!(player?.deaf || player?.Deaf);
            await display.putstr_message((isDeaf || rn2(3) === 0) ? "Thwack!!" : "Whammm!!");
        }
        return { moved: false, tookTime: true };
    }

    // C ref: dokick.c kick_nondoor() handles stairs/ladder/stair-wall
    // before the generic kick_dumb fallback.
    if (loc.typ === STAIRS || loc.typ === LADDER || IS_STWALL(loc.typ)) {
        if (loc.typ === LADDER && loc.ladder === LA_DOWN && !IS_STWALL(loc.typ)) {
            await exercise(player, A_DEX, false);
            const dex = player.attributes?.[A_DEX] || 10;
            if (hasMartialBonus(player) || dex >= 16 || rn2(3) !== 0) {
                await display.putstr_message("You kick at empty space.");
            } else {
                await display.putstr_message("Dumb move!  You strain a muscle.");
                await exercise(player, A_STR, false);
                set_wounded_legs(RIGHT_SIDE, 5 + rnd(5), player);
            }
            return { moved: false, tookTime: true };
        }
        await display.putstr_message("Ouch!  That hurts!");
        await exercise(player, A_DEX, false);
        await exercise(player, A_STR, false);
        wake_nearto(nx, ny, 5 * 5, map);
        if (rn2(3) === 0) {
            set_wounded_legs(RIGHT_SIDE, 5 + rnd(5), player);
        }
        const con = acurr(player, A_CON);
        const dmg = rnd(con > 15 ? 3 : 5);
        player.uhp = Math.max(1, (player.uhp || 1) - Math.max(1, dmg));
        return { moved: false, tookTime: true };
    }

    // C ref: dokick.c kick_ouch() for hard non-door terrain.
    if (loc.typ === IRONBARS
        || loc.typ === TREE
        || loc.typ === THRONE
        || loc.typ === ALTAR
        || loc.typ === FOUNTAIN
        || loc.typ === GRAVE
        || loc.typ === SINK) {
        await display.putstr_message("Ouch!  That hurts!");
        // C ref: exercise(A_DEX, FALSE), exercise(A_STR, FALSE)
        await exercise(player, A_DEX, false);
        await exercise(player, A_STR, false);
        // C ref: dokick.c kick_ouch() wakes nearby monsters before wound-roll.
        wake_nearto(nx, ny, 5 * 5, map);
        // C ref: if (!rn2(3)) set_wounded_legs(RIGHT_SIDE, 5 + rnd(5))
        if (rn2(3) === 0) {
            set_wounded_legs(RIGHT_SIDE, 5 + rnd(5), player);
        }
        // C ref: dmg = rnd(ACURR(A_CON) > 15 ? 3 : 5)
        const con = acurr(player, A_CON);
        const dmg = rnd(con > 15 ? 3 : 5);
        player.uhp = Math.max(1, (player.uhp || 1) - Math.max(1, dmg));
        return { moved: false, tookTime: true };
    }

    // C ref: dokick.c kick_dumb() for kicking empty/non-solid space.
    await exercise(player, A_DEX, false);
    const dex = player.attributes?.[A_DEX] || 10;
    // C ref: dokick.c:867 — martial() short-circuits before rn2(3).
    if (hasMartialBonus(player) || dex >= 16 || rn2(3) !== 0) {
        await display.putstr_message("You kick at empty space.");
    } else {
        await display.putstr_message("Dumb move!  You strain a muscle.");
        await exercise(player, A_STR, false);
        set_wounded_legs(RIGHT_SIDE, 5 + rnd(5), player);
    }
    return { moved: false, tookTime: true };
}

async function maybeWatchmanThiefArrest(map, player, display) {
    if (!Array.isArray(map?.monsters)) return false;
    for (const mon of map.monsters) {
        if (!mon || mon.dead || !mon.mpeaceful) continue;
        const mdat = mon.data || mon.type || {};
        if (!is_watch(mdat)) continue;
        if (!couldsee(map, player, mon.mx, mon.my)) continue;
        const monName = x_monnam(mon) || 'watchman';
        const capName = monName[0].toUpperCase() + monName.slice(1);
        await display.putstr_message(`${capName} yells: "Halt, thief!  You're under arrest!"`);
        await angry_guards(false, map);
        return true;
    }
    return false;
}
