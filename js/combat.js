// combat.js -- Combat system
// Mirrors uhitm.c (hero hits monster) and mhitu.c (monster hits hero)

import { rn2, rnd, d } from './rng.js';

// Attack a monster (hero attacking)
// C ref: uhitm.c attack() -> hmon_hitmon() -> hmon_hitmon_core()
export function playerAttackMonster(player, monster, display) {
    // To-hit calculation
    // C ref: uhitm.c find_roll_to_hit() -- tmp = 1 + abon + find_mac(mtmp) + level
    // then mhit = (tmp > rnd(20)); lower AC = better defense
    const dieRoll = rnd(20);
    const toHit = 1 + player.strToHit + monster.mac + player.level;

    if (toHit <= dieRoll || dieRoll === 20) {
        // Miss
        // C ref: uhitm.c -- "You miss the <monster>"
        display.putstr_message(`You miss the ${monster.name}.`);
        return false;
    }

    // Hit! Calculate damage
    // C ref: uhitm.c dmgval() -- base weapon damage + strength bonus
    let damage = 0;
    if (player.weapon && player.weapon.damage) {
        damage = d(player.weapon.damage[0], player.weapon.damage[1]);
        damage += player.weapon.enchantment || 0;
    } else {
        // Bare-handed combat
        // C ref: uhitm.c -- barehand damage is 1d2 + martial arts bonuses
        damage = rnd(2);
    }

    // Add strength bonus
    damage += player.strDamage;

    // Minimum 1 damage on a hit
    if (damage < 1) damage = 1;

    // Apply damage
    // C ref: uhitm.c -- "You hit the <monster>!"
    monster.mhp -= damage;

    if (monster.mhp <= 0) {
        // Monster killed
        // C ref: uhitm.c -> mon.c mondead() -> killed()
        display.putstr_message(`You kill the ${monster.name}!`);
        monster.dead = true;

        // Award experience
        // C ref: exper.c experience() -- roughly monster level * level
        const exp = (monster.mlevel + 1) * (monster.mlevel + 1);
        player.exp += exp;
        player.score += exp;

        // Check for level-up
        checkLevelUp(player, display);

        return true; // monster is dead
    } else {
        // C ref: uhitm.c -- various hit messages
        if (dieRoll >= 18) {
            display.putstr_message(`You smite the ${monster.name}!`);
        } else {
            display.putstr_message(`You hit the ${monster.name}.`);
        }
        return false;
    }
}

// Monster attacks the player
// C ref: mhitu.c mattacku() -> mattackm core
export function monsterAttackPlayer(monster, player, display) {
    if (!monster.attacks || monster.attacks.length === 0) return;
    if (monster.passive) return; // passive monsters don't initiate attacks

    for (const attack of monster.attacks) {
        // To-hit calculation for monster
        // C ref: mhitu.c mattacku() -- tmp includes monster level + player AC
        // Lower player AC = better defense (same convention as hero attacking)
        const dieRoll = rnd(20);
        const toHit = 1 + monster.mlevel + player.effectiveAC;

        if (toHit <= dieRoll || dieRoll === 20) {
            // Miss
            display.putstr_message(`The ${monster.name} misses!`);
            continue;
        }

        // Calculate damage
        let damage = 0;
        if (attack.dmg) {
            damage = d(attack.dmg[0], attack.dmg[1]);
        }

        // Handle special attack effects
        if (attack.special) {
            handleSpecialAttack(attack.special, monster, player, display);
        }

        if (damage > 0) {
            // Apply damage
            const died = player.takeDamage(damage, monster.name);

            if (damage === 1) {
                display.putstr_message(`The ${monster.name} bites!`);
            } else {
                display.putstr_message(`The ${monster.name} hits! [${damage} pts]`);
            }

            if (died) {
                display.putstr_message(`You die...`);
            }
        }
    }
}

// Handle special monster attack effects
// C ref: mhitu.c -- various AD_* damage types
function handleSpecialAttack(special, monster, player, display) {
    switch (special) {
        case 'poison':
            // C ref: mhitu.c AD_DRST -- poison attack
            if (rn2(5) === 0) {
                display.putstr_message(`You feel very sick!`);
                player.attributes[3] = Math.max(1, player.attributes[3] - 1); // DEX loss
            }
            break;

        case 'paralyze':
            // C ref: mhitu.c AD_PLYS -- floating eye paralysis
            display.putstr_message(`You are frozen by the ${monster.name}'s gaze!`);
            // In full implementation, this would set multi = -rnd(5)
            break;

        case 'blind':
            // C ref: mhitu.c AD_BLND -- blinding attack
            if (!player.blind) {
                display.putstr_message(`You are blinded by the ${monster.name}!`);
                player.blind = true;
            }
            break;

        case 'stick':
            // C ref: mhitu.c -- lichen sticking (holds you in place)
            display.putstr_message(`The ${monster.name} grabs you!`);
            break;
    }
}

// Check if player should level up
// C ref: exper.c newuexp() and pluslvl()
export function checkLevelUp(player, display) {
    // Experience table (approximate, from exper.c)
    // C ref: exper.c newuexp()
    const expTable = [0, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120,
                      10000, 20000, 40000, 80000, 160000, 320000, 640000,
                      1280000, 2560000, 5120000, 10000000, 20000000];

    while (player.level < 30 && player.exp >= (expTable[player.level] || Infinity)) {
        player.level++;
        // Gain HP and Pw
        // C ref: exper.c pluslvl() -- role-dependent gains
        const hpGain = rnd(8);
        player.hpmax += hpGain;
        player.hp += hpGain;
        const pwGain = rn2(3);
        player.pwmax += pwGain;
        player.pw += pwGain;

        display.putstr_message(`Welcome to experience level ${player.level}!`);
    }
}
