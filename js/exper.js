// exper.js -- Experience points and leveling
// cf. exper.c — newuexp, newexplevel, pluslvl, experience, losexp, more_experienced

import { rn2, rnd } from './rng.js';

// cf. exper.c:14 — newuexp(): experience points threshold for given level
export function newuexp(lev) {
    if (lev < 1)
        return 0;
    if (lev < 10)
        return 10 * (1 << lev);
    if (lev < 20)
        return 10000 * (1 << (lev - 10));
    return 10000000 * (lev - 19);
}

// cf. exper.c:25 [static] — enermod(): role-dependent energy modifier
// TODO: exper.c:25 — enermod(): needs Role_switch data from roles.js
// export function enermod(en) { ... }

// cf. exper.c:44 — newpw(): calculate spell power gain for new level
// TODO: exper.c:44 — newpw(): needs enadv struct data from roles/races (urole.enadv, urace.enadv)

// cf. exper.c:84 — experience(): full XP calculation with AC/speed/attack bonuses
// TODO: exper.c:84 — experience(mtmp, nk): needs find_mac, permonst attack data, extra_nasty

// cf. exper.c:168 — more_experienced(): award XP and score with wraparound cap
// TODO: exper.c:168 — more_experienced(exper, rexp): needs u.urexp, flags.showexp, disp.botl

// cf. exper.c:206 — losexp(): level drain (e.g., hit by drain life attack)
// Partial: drains level and HP but does not implement adjabil/uhpinc/ueninc.
// RNG: consumes rnd(10) for HP loss, rn2(5) for PW loss (matching C's newhp/newpw calls).
export function losexp(player, display, drainer) {
    if (player.level <= 1) {
        // Can't lose a level below 1; C would kill the hero
        return;
    }
    // cf. exper.c:230 — lose HP: normally role-dependent via uhpinc array;
    // simplified: rnd(10) as placeholder (matches C's newhp typical range).
    const hpLoss = rnd(10);
    player.hpmax = Math.max(1, player.hpmax - hpLoss);
    player.hp = Math.min(player.hp, player.hpmax);

    // cf. exper.c:250 — lose PW: normally role-dependent via ueninc array;
    // simplified: rn2(5) placeholder (matches C's newpw typical range).
    const pwLoss = rn2(5);
    player.pwmax = Math.max(0, player.pwmax - pwLoss);
    player.pw = Math.min(player.pw, player.pwmax);

    player.level--;
    player.exp = newuexp(player.level);
    if (display) {
        display.putstr_message(`You feel your life force draining away.`);
    }
}

// cf. exper.c:299 — newexplevel(): check if player should gain a level
export function newexplevel(player, display) {
    const MAXULEV = 30;
    if (player.level < MAXULEV && player.exp >= newuexp(player.level)) {
        pluslvl(player, display, true);
    }
}

// cf. exper.c:306 — pluslvl(): gain an experience level
export function pluslvl(player, display, incr) {
    const MAXULEV = 30;

    if (!incr) {
        display.putstr_message('You feel more experienced.');
    }

    // TODO: exper.c:324 newhp() — role-dependent HP gain; using rnd(8) placeholder
    const hpGain = rnd(8);
    player.hpmax += hpGain;
    player.hp += hpGain;

    // TODO: exper.c:330 newpw() — role-dependent PW gain; using rn2(3) placeholder
    const pwGain = rn2(3);
    player.pwmax += pwGain;
    player.pw += pwGain;

    if (player.level < MAXULEV) {
        if (incr) {
            const tmp = newuexp(player.level + 1);
            if (player.exp >= tmp) {
                player.exp = tmp - 1;
            }
        } else {
            player.exp = newuexp(player.level);
        }
        player.level++;
        const back = (player.ulevelmax != null && player.ulevelmax >= player.level) ? 'back ' : '';
        display.putstr_message(`Welcome ${back}to experience level ${player.level}.`);
        if (player.ulevelmax == null || player.ulevelmax < player.level) {
            player.ulevelmax = player.level;
        }
    }
}

// cf. exper.c:377 — rndexp(): random XP for potions/polyself
// TODO: exper.c:377 — rndexp(gaining): needs LARGEST_INT handling, rn2 with large diff
