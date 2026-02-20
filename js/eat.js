// eat.js -- Eating mechanics
// cf. eat.c — doeat, start_eating, eatfood, bite, corpse intrinsics, hunger

import { rn2, rn1, rnd } from './rng.js';
import { nhgetch } from './input.js';
import { objectData, FOOD_CLASS, CORPSE, TRIPE_RATION, CLOVE_OF_GARLIC } from './objects.js';
import { doname, next_ident } from './mkobj.js';
import { mons, PM_LIZARD, PM_LICHEN, PM_NEWT,
         S_GOLEM, S_EYE, S_JELLY, S_PUDDING, S_BLOB, S_VORTEX,
         S_ELEMENTAL, S_FUNGUS, S_LIGHT } from './monsters.js';
import { PM_CAVEMAN, RACE_ORC } from './config.js';
import { applyMonflee } from './mhitu.js';
import { obj_resists } from './objdata.js';
import { compactInvletPromptChars } from './invent.js';


// ============================================================
// 1. Data / init
// ============================================================

// TODO: cf. eat.c hu_stat[] — hunger state name table
// TODO: cf. eat.c is_edible() — check if object is edible by hero
// TODO: cf. eat.c init_uhunger() — initialize hunger state at game start
// TODO: cf. eat.c eatmdone() — eating-mode cleanup

// ============================================================
// 2. Display / name
// ============================================================

// TODO: cf. eat.c eatmupdate() — update eating-mode display
// TODO: cf. eat.c food_xname() — food-specific naming for messages

// ============================================================
// 3. Choking / weight
// ============================================================

// TODO: cf. eat.c choke() — choking on food occupation callback
// TODO: cf. eat.c recalc_wt() — recalculate object weight after partial eating
// TODO: cf. eat.c adj_victual_nutrition() — adjust nutrition for partly-eaten food

// ============================================================
// 4. Food state
// ============================================================

// TODO: cf. eat.c touchfood() — mark food as touched (started eating)
// TODO: cf. eat.c reset_eat() — reset eating state
// TODO: cf. eat.c do_reset_eat() — external reset_eat wrapper
// TODO: cf. eat.c obj_nutrition() — get nutrition value for an object
// TODO: cf. eat.c food_disappears() — check if food vanishes on level change
// TODO: cf. eat.c food_substitution() — substitute food type (eg slime mold name)

// ============================================================
// 5. Eating occupation
// ============================================================

// TODO: cf. eat.c eating_dangerous_corpse() — warn about dangerous corpses
// TODO: cf. eat.c eatfood() — eating occupation callback
// TODO: cf. eat.c done_eating() — finish eating an item
// TODO: cf. eat.c eating_conducts() — track dietary conducts

// ============================================================
// 6. Brain / petrification
// ============================================================

// TODO: cf. eat.c eat_brains() — eat brain effects
// TODO: cf. eat.c fix_petrification() — cure petrification by eating
// TODO: cf. eat.c maybe_cannibal() — check/apply cannibalism effects

// ============================================================
// 7. Corpse prefix effects
// ============================================================

// TODO: cf. eat.c cprefx() — corpse prefix effects (before eating)
// TODO: cf. eat.c intrinsic_possible() — check if intrinsic gain is possible
// TODO: cf. eat.c should_givit() — decide whether to grant intrinsic
// TODO: cf. eat.c temp_givit() — grant temporary intrinsic from corpse
// TODO: cf. eat.c givit() — grant intrinsic from corpse
// TODO: cf. eat.c eye_of_newt_buzz() — energy boost from eating newt

// ============================================================
// 8. Corpse postfix effects
// ============================================================

// TODO: cf. eat.c cpostfx() — corpse postfix effects (after eating)
// TODO: cf. eat.c corpse_intrinsic() — umbrella corpse intrinsic handler
// TODO: cf. eat.c violated_vegetarian() — check vegetarian conduct violation
// TODO: cf. eat.c costly_tin() — handle cost of tin from shop

// ============================================================
// 9. Tin handling
// ============================================================

// TODO: cf. eat.c tin_variety_txt() — text for tin variety
// TODO: cf. eat.c tin_details() — determine tin contents and variety
// TODO: cf. eat.c set_tin_variety() — set variety on a tin object
// TODO: cf. eat.c tin_variety() — get tin variety
// TODO: cf. eat.c use_up_tin() — consume a tin after opening
// TODO: cf. eat.c consume_tin() — eat the contents of an opened tin
// TODO: cf. eat.c start_tin() — begin opening a tin

// ============================================================
// 10. Rotten / corpse eating
// ============================================================

// TODO: cf. eat.c Hear_again() — restore hearing after deafening food
// TODO: cf. eat.c rottenfood() — effects of eating rotten food
// TODO: cf. eat.c eatcorpse() — eat a corpse (rot checks, reqtime, etc.)
// TODO: cf. eat.c start_eating() — begin eating an item

// ============================================================
// 11. Food prefix / postfix
// ============================================================

// TODO: cf. eat.c garlic_breath() — scare nearby olfaction monsters
// TODO: cf. eat.c fprefx() — food prefix effects (non-corpse)
// TODO: cf. eat.c bounded_increase() — bounded stat increase helper
// TODO: cf. eat.c accessory_has_effect() — check if accessory eating has effect
// TODO: cf. eat.c eataccessory() — eat a ring or amulet
// TODO: cf. eat.c eatspecial() — eat special non-food items
// TODO: cf. eat.c fpostfx() — food postfix effects (non-corpse)
// TODO: cf. eat.c foodword() — word for eating action (eat/drink/etc.)

// ============================================================
// 12. Prompts / nonfood
// ============================================================

// TODO: cf. eat.c edibility_prompts() — prompts about food edibility
// TODO: cf. eat.c doeat_nonfood() — attempt to eat non-food item

// ============================================================
// 13. Main command
// ============================================================

// cf. eat.c doeat() — main eat command (partial).
// cf. eat.c opentin() — open a tin.
// cf. eat.c bite() — apply incremental nutrition per turn (partial).

// handleEat implements partial doeat()/eatcorpse()/bite()/start_eating()/eatfood().
// Covers: floor food prompt, inventory selection, corpse rot checks, stack splitting,
// nutrition distribution, tripe flavor, newt energy, garlic breath, multi-turn occupation.
async function handleEat(player, display, game) {
    const map = game?.map;
    const floorFoods = map
        ? map.objectsAt(player.x, player.y).filter((o) => o && o.oclass === FOOD_CLASS)
        : [];

    // cf. eat.c floorfood() (partial) — if edible food is at hero square,
    // ask before opening inventory selector.
    if (floorFoods.length > 0) {
        const floorItem = floorFoods[0];
        const floorDescribed = doname(floorItem, null);
        const floorName = floorDescribed.replace(/^(?:an?|the)\s+/i, '');
        const article = /^[aeiou]/i.test(floorName) ? 'an' : 'a';
        display.putstr_message(`There is ${article} ${floorName} here; eat it? [ynq] (n)`);
        const ans = String.fromCharCode(await nhgetch()).toLowerCase();
        if (ans === 'q') {
            // cf. eat.c floorfood() — 'q' exits immediately
            display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (ans === 'y') {
            if (floorItem.otyp === CORPSE) {
                const cnum = Number.isInteger(floorItem.corpsenm) ? floorItem.corpsenm : -1;
                const nonrotting = (cnum === PM_LIZARD || cnum === PM_LICHEN);
                let rottenTriggered = false;
                if (!nonrotting) {
                    rn2(20); // C: rotted age denominator
                    if (!rn2(7)) {
                        rottenTriggered = true;
                        // cf. eat.c rottenfood() branch probes
                        const c1 = rn2(4);
                        if (c1 !== 0) {
                            const c2 = rn2(4);
                            if (c2 !== 0) rn2(3);
                        }
                    }
                }
                const corpseWeight = (cnum >= 0 && mons[cnum]) ? (mons[cnum].weight || 0) : 0;
                // cf. eat.c eatcorpse() -> reqtime from corpse weight, then
                // rotten path consume_oeaten(..., 2) effectively quarters meal size.
                const baseReqtime = 3 + (corpseWeight >> 6);
                const reqtime = rottenTriggered
                    ? Math.max(1, Math.floor((baseReqtime + 2) / 4))
                    : baseReqtime;
                let usedtime = 1; // first bite happens immediately
                let consumedFloorItem = false;
                const consumeFloorItem = () => {
                    if (consumedFloorItem) return;
                    consumedFloorItem = true;
                    // cf. eat.c done_eating() -> useupf() -> delobj() -> delobj_core()
                    // delobj_core consumes obj_resists(obj, 0, 0) for ordinary objects.
                    obj_resists(floorItem, 0, 0);
                    map.removeObject(floorItem);
                };

                if (reqtime > 1) {
                    const finishFloorEating = () => {
                        consumeFloorItem();
                        if (rottenTriggered) {
                            display.putstr_message(`Blecch!  Rotten food!  You finish eating the ${floorName}.`);
                        } else {
                            display.putstr_message(`You finish eating the ${floorName}.`);
                        }
                    };
                    // cf. eat.c eatfood() / start_eating() — set_occupation
                    game.occupation = {
                        fn: () => {
                            usedtime++;
                            // cf. eat.c eatfood(): done when ++usedtime > reqtime.
                            if (usedtime > reqtime) {
                                finishFloorEating();
                                return 0;
                            }
                            return 1;
                        },
                        txt: `eating ${floorName}`,
                        xtime: reqtime,
                    };
                } else {
                    consumeFloorItem();
                    if (rottenTriggered) {
                        display.putstr_message(`Blecch!  Rotten food!  You finish eating the ${floorName}.`);
                    } else {
                        display.putstr_message(`You finish eating the ${floorName}.`);
                    }
                }
                return { moved: false, tookTime: true };
            }
        }
        // cf. eat.c floorfood() — 'n' (or default) falls through to getobj()
        // for inventory food selection, NOT "Never mind."
    }

    // cf. eat.c doeat() / eat_ok() (partial) — inventory food selection
    const food = player.inventory.filter(o => o.oclass === 6); // FOOD_CLASS
    if (food.length === 0) {
        display.putstr_message("You don't have anything to eat.");
        return { moved: false, tookTime: false };
    }

    const eatChoices = compactInvletPromptChars(food.map(f => f.invlet).join(''));
    while (true) {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
        display.putstr_message(`What do you want to eat? [${eatChoices} or ?*]`);
        const ch = await nhgetch();
        const c = String.fromCharCode(ch);

        if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
            if (typeof display.clearRow === 'function') display.clearRow(0);
            display.topMessage = null;
            display.messageNeedsMore = false;
            display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            continue;
        }

        const item = food.find(f => f.invlet === c);
        if (!item) {
            const anyItem = player.inventory.find((o) => o.invlet === c);
            if (anyItem) {
                // cf. eat.c doeat() → getobj returns non-food item
                // (eat_ok returns GETOBJ_EXCLUDE_SELECTABLE), then
                // is_edible() check fails → "You cannot eat that!" and exit.
                display.putstr_message('You cannot eat that!');
                return { moved: false, tookTime: false };
            }
            // cf. eat.c getobj() handles invalid letters differently depending
            // on mode. In non-wizard mode, it emits a "--More--" that blocks
            // until Space/Enter/Esc; in wizard mode it silently re-prompts.
            if (!player.wizard) {
                display.putstr_message("You don't have that object.--More--");
                while (true) {
                    const moreCh = await nhgetch();
                    if (moreCh === 32 || moreCh === 10 || moreCh === 13 || moreCh === 27) break;
                }
            }
            continue;
        }
        // cf. eat.c doesplit() path — splitobj() for stacked comestibles:
        // splitobj() creates a single-item object and consumes next_ident() (rnd(2)).
        const eatingFromStack = ((item.quan || 1) > 1 && item.oclass === FOOD_CLASS);
        let eatenItem = item;
        if (eatingFromStack) {
            // cf. eat.c splitobj() keeps both pieces in inventory until done_eating().
            eatenItem = { ...item, quan: 1, o_id: next_ident() };
            item.quan = (item.quan || 1) - 1;
            const itemIndex = player.inventory.indexOf(item);
            if (itemIndex >= 0) {
                eatenItem.invlet = item.invlet;
                player.inventory.splice(itemIndex + 1, 0, eatenItem);
            }
        }

        let corpseTasteIdx = null;
        // cf. eat.c eatcorpse() RNG used by taint/rotting checks.
        if (eatenItem.otyp === CORPSE) {
            const cnum = Number.isInteger(eatenItem.corpsenm) ? eatenItem.corpsenm : -1;
            const nonrotting = (cnum === PM_LIZARD || cnum === PM_LICHEN);
            if (!nonrotting) {
                rn2(20); // rotted denominator
                rn2(7);  // rottenfood gate (when no prior taste effect triggered)
            }
            rn2(10); // palatable taste gate
            corpseTasteIdx = rn2(5);  // palatable message choice index
        }
        const od = objectData[eatenItem.otyp];
        const cnum = Number.isInteger(eatenItem.corpsenm) ? eatenItem.corpsenm : -1;
        const isCorpse = eatenItem.otyp === CORPSE && cnum >= 0 && cnum < mons.length;
        // cf. eat.c eatcorpse() overrides reqtime to 3 + (corpse weight >> 6).
        const reqtime = isCorpse
            ? (3 + ((mons[cnum].weight || 0) >> 6))
            : Math.max(1, (od ? od.delay : 1));
        const baseNutr = isCorpse
            ? (mons[cnum].nutrition || (od ? od.nutrition : 200))
            : (od ? od.nutrition : 200);
        // cf. eat.c bite() nmod calculation — nutrition distributed per bite.
        // nmod < 0 means add -nmod each turn; nmod > 0 means add 1 some turns
        const nmod = (reqtime === 0 || baseNutr === 0) ? 0
            : (baseNutr >= reqtime) ? -Math.floor(baseNutr / reqtime)
            : reqtime % baseNutr;
        let usedtime = 0;

        // cf. eat.c bite() — apply incremental nutrition (partial)
        function doBite() {
            if (nmod < 0) {
                player.hunger += (-nmod);
                player.nutrition += (-nmod);
            } else if (nmod > 0 && (usedtime % nmod)) {
                player.hunger += 1;
                player.nutrition += 1;
            }
        }

        // First bite (turn 1) — mirrors C start_eating() + bite()
        usedtime++;
        doBite();
        // cf. eat.c start_eating() — fprefx() is called for fresh
        // (not already partly eaten) non-corpse food, producing flavor
        // messages and RNG calls for specific food types.
        if (!isCorpse) {
            // cf. eat.c fprefx() (partial)
            if (eatenItem.otyp === TRIPE_RATION) {
                // cf. eat.c fprefx() tripe — carnivorous non-humanoid: "surprisingly good!"
                // orc: "Mmm, tripe..." (no RNG)
                // else: "Yak - dog food!" + rn2(2) vomit check
                const isOrc = player.race === RACE_ORC;
                if (!isOrc) {
                    const cannibalAllowed = (player.roleIndex === PM_CAVEMAN || isOrc);
                    if (rn2(2) && !cannibalAllowed) {
                        rn1(reqtime, 14); // make_vomiting duration
                    }
                }
            }
            if (reqtime > 1) {
                display.putstr_message(`You begin eating the ${eatenItem.name}.`);
            }
        }
        let consumedInventoryItem = false;
        const consumeInventoryItem = () => {
            if (consumedInventoryItem) return;
            consumedInventoryItem = true;
            player.removeFromInventory(eatingFromStack ? eatenItem : item);
        };

        if (reqtime > 1) {
            const finishEating = (gameCtx) => {
                // cf. eat.c done_eating()/cpostfx() runs from eatfood() when
                // occupation reaches completion, before moveloop's next monster turn.
                consumeInventoryItem();
                if (isCorpse && corpseTasteIdx !== null) {
                    const tastes = ['okay', 'stringy', 'gamey', 'fatty', 'tough'];
                    const idx = Math.max(0, Math.min(tastes.length - 1, corpseTasteIdx));
                    const verb = idx === 0 ? 'tastes' : 'is';
                    display.putstr_message(
                        `This ${eatenItem.name} ${verb} ${tastes[idx]}.  `
                        + `You finish eating the ${eatenItem.name}.--More--`
                    );
                } else {
                    // cf. eat.c done_eating() generic multi-turn completion line.
                    display.putstr_message("You're finally finished.");
                }
                if (isCorpse && cnum === PM_NEWT) {
                    // cf. eat.c eye_of_newt_buzz() from cpostfx(PM_NEWT) (partial).
                    if (rn2(3) || (3 * (player.pw || 0) <= 2 * (player.pwmax || 0))) {
                        const oldPw = player.pw || 0;
                        player.pw = (player.pw || 0) + rnd(3);
                        if ((player.pw || 0) > (player.pwmax || 0)) {
                            if (!rn2(3)) {
                                player.pwmax = (player.pwmax || 0) + 1;
                            }
                            player.pw = player.pwmax || 0;
                        }
                        if ((player.pw || 0) !== oldPw) {
                            if (gameCtx) {
                                gameCtx.pendingToplineMessage = 'You feel a mild buzz.';
                            } else {
                                display.putstr_message('You feel a mild buzz.');
                            }
                        }
                    }
                }
            };
            // cf. eat.c eatfood() / start_eating() — set_occupation
            game.occupation = {
                fn: () => {
                    usedtime++;
                    // cf. eat.c eatfood(): done when ++usedtime > reqtime.
                    if (usedtime > reqtime) {
                        finishEating(game);
                        return 0; // done
                    }
                    doBite();
                    return 1; // continue
                },
                txt: `eating ${eatenItem.name}`,
                xtime: reqtime,
            };
        } else {
            // Single-turn food — eat instantly
            consumeInventoryItem();
            display.putstr_message(`This ${eatenItem.name} is delicious!`);
            // cf. eat.c garlic_breath() — scare nearby olfaction monsters (partial).
            if (eatenItem.otyp === CLOVE_OF_GARLIC && map) {
                for (const mon of map.monsters) {
                    if (mon.dead) continue;
                    const sym = mon.type?.symbol ?? (mons[mon.mndx]?.symbol);
                    // cf. mondata.c olfaction() — golems, eyes, jellies, puddings,
                    // blobs, vortexes, elementals, fungi, and lights lack olfaction.
                    if (sym === S_GOLEM || sym === S_EYE || sym === S_JELLY
                        || sym === S_PUDDING || sym === S_BLOB || sym === S_VORTEX
                        || sym === S_ELEMENTAL || sym === S_FUNGUS || sym === S_LIGHT) {
                        continue;
                    }
                    // cf. eat.c garlic_breath() — distu(mtmp) < 7
                    const dx = mon.mx - player.x, dy = mon.my - player.y;
                    if (dx * dx + dy * dy < 7) {
                        applyMonflee(mon, 0, false);
                    }
                }
            }
        }
        return { moved: false, tookTime: true };
    }
}

export { handleEat };


// ============================================================
// 14. Hunger system
// ============================================================

// TODO: cf. eat.c gethungry() — process hunger each turn
// TODO: cf. eat.c morehungry() — increase hunger by amount
// TODO: cf. eat.c lesshungry() — decrease hunger by amount
// TODO: cf. eat.c unfaint() — recover from fainting
// TODO: cf. eat.c is_fainted() — check if hero is fainted from hunger
// TODO: cf. eat.c reset_faint() — reset faint counter
// TODO: cf. eat.c newuhs() — update hunger state and messages

// ============================================================
// 15. Callbacks / floor
// ============================================================

// TODO: cf. eat.c eat_ok() — getobj callback for edible items
// TODO: cf. eat.c offer_ok() — getobj callback for sacrifice items
// TODO: cf. eat.c tin_ok() — getobj callback for tins
// TODO: cf. eat.c tinopen_ok() — getobj callback for tin opener
// TODO: cf. eat.c floorfood() — check/prompt for food on floor

// ============================================================
// 16. Side effects
// ============================================================

// TODO: cf. eat.c vomit() — vomiting effects
// TODO: cf. eat.c eaten_stat() — calculate how much of food has been eaten
// TODO: cf. eat.c consume_oeaten() — reduce oeaten field
// TODO: cf. eat.c maybe_finished_meal() — check if meal is done
// TODO: cf. eat.c cant_finish_meal() — interrupt meal completion
// TODO: cf. eat.c Popeye() — spinach strength boost
// TODO: cf. eat.c Finish_digestion() — complete digestion process
