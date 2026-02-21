import { THRONE, SINK, GRAVE, FOUNTAIN, STAIRS, ALTAR, IS_DOOR, D_ISOPEN } from './config.js';
import { objectData, COIN_CLASS } from './objects.js';
import { nhgetch } from './input.js';
import { doname } from './mkobj.js';
import { observeObject } from './discovery.js';
import { formatGoldPickupMessage, formatInventoryPickupMessage } from './do.js';

// pickup.js -- Autopickup, floor object pickup, container looting
// cf. pickup.c — pickup(), doloot(), doloot_core(),
//                u_safe_from_fatal_corpse, fatal_corpse_mistake,
//                rider_corpse_revival, force_decor, describe_decor,
//                check_here, n_or_more, menu_class_present,
//                add_valid_menu_class, all_but_uchain, allow_all,
//                allow_category, allow_cat_no_uchain, is_worn_by_type,
//                reset_justpicked, count_justpicked, find_justpicked,
//                check_autopickup_exceptions, autopick_testobj,
//                count_categories, delta_cwt, carry_count, lift_object,
//                pick_obj, pickup_prinv, encumber_msg, container_at,
//                mon_beside, doloot, doloot_core, reverse_loot,
//                loot_mon, mbag_explodes, is_boh_item_gone,
//                do_boh_explosion, boh_loss, in_container, ck_bag,
//                out_container, removed_from_icebox, mbag_item_gone,
//                observe_quantum_cat, explain_container_prompt,
//                u_handsy, stash_ok, traditional_loot, menu_loot,
//                tip_ok, choose_tip_container_menu, dotip,
//                tipcontainer_gettarget
//
// pickup.c handles all object pickup and container looting:
//   autopick_testobj(): check if object matches autopickup conditions.
//   pick_obj(): perform actual pickup from floor into inventory.
//   doloot(): #loot command — loot container or saddle.
//   loot_mon(): loot container from monster or remove saddle.
//   dotip(): #tip command — empty container contents onto floor.
//   observe_quantum_cat(): handle Schrodinger's cat in containers.
//
// JS implementations:
//   handlePickup(): floor object pickup (pickup.c pickup())
//   handleLoot(): container looting (pickup.c doloot/doloot_core)
//   handlePay(): shopkeeper payment stub (shk.c dopay)

// cf. pickup.c:273 — u_safe_from_fatal_corpse(obj, tests): safe from corpse check
// Checks if the hero is protected from fatal corpse effects.
// TODO: pickup.c:273 — u_safe_from_fatal_corpse(): fatal corpse protection check

// cf. pickup.c:285 [static] — fatal_corpse_mistake(obj, remotely): bare-hand corpse check
// Checks if the hero is bare-handedly touching a cockatrice corpse.
// TODO: pickup.c:285 — fatal_corpse_mistake(): bare-hand cockatrice corpse check

// cf. pickup.c:303 — rider_corpse_revival(obj, remotely): Rider corpse revival
// Manipulating a Rider's corpse triggers its revival.
// TODO: pickup.c:303 — rider_corpse_revival(): Rider corpse manipulation

// cf. pickup.c:317 — force_decor(via_probing): describe dungeon feature
// Describes a dungeon feature when revealed by a probing wand.
// TODO: pickup.c:317 — force_decor(): probed feature description

// cf. pickup.c:353 [static] — describe_decor(void): mention decor when walking
// Handles mention_decor when walking onto stairs/altar/special features.
// TODO: pickup.c:353 — describe_decor(): floor feature mention

// cf. pickup.c:430 [static] — check_here(picked_some): look at floor objects
// Looks at floor objects unless too many to display.
// TODO: pickup.c:430 — check_here(): floor object display check

// cf. pickup.c:460 [static] — n_or_more(obj): count threshold query callback
// Query callback returning TRUE if object count >= reference value.
// TODO: pickup.c:460 — n_or_more(): count threshold callback

// cf. pickup.c:469 — menu_class_present(c): check valid menu class
// Checks if the valid_menu_classes array contains an entry.
// TODO: pickup.c:469 — menu_class_present(): menu class presence check

// cf. pickup.c:475 — add_valid_menu_class(c): add menu class entry
// Adds an entry to the valid_menu_classes array.
// TODO: pickup.c:475 — add_valid_menu_class(): menu class addition

// cf. pickup.c:509 [static] — all_but_uchain(obj): all-except-chain filter
// Query callback returning TRUE if not the player's chain.
// TODO: pickup.c:509 — all_but_uchain(): chain exclusion filter

// cf. pickup.c:517 — allow_all(obj): allow all objects filter
// Always returns TRUE for all objects.
// TODO: pickup.c:517 — allow_all(): universal allow filter

// cf. pickup.c:523 — allow_category(obj): allow by category filter
// Returns TRUE for objects in the valid category.
// TODO: pickup.c:523 — allow_category(): category filter

// cf. pickup.c:597 [static] — allow_cat_no_uchain(obj): category filter excluding chain
// Query callback for valid category excluding player's chain.
// TODO: pickup.c:597 — allow_cat_no_uchain(): category no-chain filter

// cf. pickup.c:609 — is_worn_by_type(otmp): worn item by class filter
// Query callback for valid class objects currently worn by player.
// TODO: pickup.c:609 — is_worn_by_type(): worn by type filter

// cf. pickup.c:616 — reset_justpicked(olist): reset just-picked flags
// Resets last-picked-up flags on an object list.
// TODO: pickup.c:616 — reset_justpicked(): just-picked flag reset

// cf. pickup.c:635 — count_justpicked(olist): count recently picked objects
// Counts recently picked up objects in a list.
// TODO: pickup.c:635 — count_justpicked(): just-picked object count

// cf. pickup.c:648 — find_justpicked(olist): find recently picked object
// Finds the first recently picked up object in a list.
// TODO: pickup.c:648 — find_justpicked(): just-picked object search

// cf. pickup.c:913 — check_autopickup_exceptions(obj): check autopickup exception patterns
// Tests if an object matches any autopickup exception pattern.
// TODO: pickup.c:913 — check_autopickup_exceptions(): autopickup exception matching

// cf. pickup.c:930 — autopick_testobj(otmp, calc_costly): check autopickup conditions
// Checks if an object matches autopickup conditions.
// TODO: pickup.c:930 — autopick_testobj(): autopickup eligibility check

// cf. pickup.c:1511 [static] — count_categories(olist, qflags): count object categories
// Counts object categories in a list.
// TODO: pickup.c:1511 — count_categories(): object category count

// cf. pickup.c:1544 [static] — delta_cwt(container, obj): weight change calculation
// Calculates weight change when removing an object from a container.
// TODO: pickup.c:1544 — delta_cwt(): container weight change

// cf. pickup.c:1574 [static] — carry_count(obj, container, count_p, telekinesis, allow_pickup): pickup count
// Determines the number of items to pick up.
// TODO: pickup.c:1574 — carry_count(): pickup quantity determination

// cf. pickup.c:1709 [static] — lift_object(obj, container, cnt_p, telekinesis, allow_pickup): lift object
// Performs the actual pickup of an object into inventory.
// TODO: pickup.c:1709 — lift_object(): object inventory lift

// cf. pickup.c:1897 — pick_obj(otmp): pick up object from floor
// Performs actual pickup of an object from floor or monster.
// TODO: pickup.c:1897 — pick_obj(): floor object pickup

// cf. pickup.c:1945 [static] — pickup_prinv(obj, count, verb): print pickup message
// Prints added-to-inventory message for a picked up object.
// TODO: pickup.c:1945 — pickup_prinv(): pickup inventory message

// cf. pickup.c:1972 — encumber_msg(void): encumbrance status message
// Prints message if encumbrance status changed since last check.
// TODO: pickup.c:1972 — encumber_msg(): encumbrance change message

// cf. pickup.c:2018 — container_at(x, y, countem): check container at position
// Checks if a container exists at a position, optionally counting containers.
// TODO: pickup.c:2018 — container_at(): container position check

// cf. pickup.c:2066 [static] — mon_beside(x, y): monster at position check
// Checks if a monster exists at a position (can't loot in water with monster).
// TODO: pickup.c:2066 — mon_beside(): monster adjacency check

// cf. pickup.c:2160 — doloot(void): #loot command handler
// Handles the #loot extended command.
// JS equiv: handleLoot() below
// PARTIAL: pickup.c:2160 — doloot() ↔ handleLoot()

// cf. pickup.c:2172 [static] — doloot_core(void): core loot function
// Core loot function for containers on floor or saddle.
// TODO: pickup.c:2172 — doloot_core(): loot core mechanics

// cf. pickup.c:2344 [static] — reverse_loot(void): confused loot
// Called when attempting #loot while confused.
// TODO: pickup.c:2344 — reverse_loot(): confused looting

// cf. pickup.c:2425 — loot_mon(mtmp, passed_info, prev_loot): loot container from monster
// Loots a container from a monster or removes a saddle.
// TODO: pickup.c:2425 — loot_mon(): monster container loot

// cf. pickup.c:2482 [static] — mbag_explodes(obj, depthin): magic bag explosion check
// Decides if a magic bag will explode when an object is inserted.
// TODO: pickup.c:2482 — mbag_explodes(): magic bag explosion check

// cf. pickup.c:2504 [static] — is_boh_item_gone(void): bag of holding item check
// Checks if a bag of holding item was destroyed.
// TODO: pickup.c:2504 — is_boh_item_gone(): bag of holding item check

// cf. pickup.c:2512 [static] — do_boh_explosion(boh, on_floor): bag of holding explosion
// Scatters destroyed bag of holding contents.
// TODO: pickup.c:2512 — do_boh_explosion(): bag of holding explosion

// cf. pickup.c:2531 [static] — boh_loss(container, held): bag of holding item loss
// Handles items lost from magic bags.
// TODO: pickup.c:2531 — boh_loss(): magic bag item loss

// cf. pickup.c:2552 [static] — in_container(obj): object can go in container filter
// Filter for putting objects into containers.
// TODO: pickup.c:2552 — in_container(): containable object filter

// cf. pickup.c:2714 — ck_bag(obj): intact container filter
// Filter for intact containers excluding the current container.
// TODO: pickup.c:2714 — ck_bag(): intact container filter

// cf. pickup.c:2721 [static] — out_container(obj): object can leave container filter
// Filter for removing objects from containers.
// TODO: pickup.c:2721 — out_container(): removable container object filter

// cf. pickup.c:2775 — removed_from_icebox(obj): icebox corpse adjustment
// Adjusts corpse when removed from an ice box.
// TODO: pickup.c:2775 — removed_from_icebox(): icebox corpse adjustment

// cf. pickup.c:2797 [static] — mbag_item_gone(held, item, silent): magic bag item destruction
// Handles item destruction in magic bags.
// TODO: pickup.c:2797 — mbag_item_gone(): magic bag item destruction

// cf. pickup.c:2820 — observe_quantum_cat(box, makecat, givemsg): Schrodinger's cat
// Handles Schrodinger's cat when accessing a container.
// TODO: pickup.c:2820 — observe_quantum_cat(): quantum cat observation

// cf. pickup.c:2891 [static] — explain_container_prompt(more_containers): explain container prompt
// Explains the container handling prompt to the player.
// TODO: pickup.c:2891 — explain_container_prompt(): container prompt explanation

// cf. pickup.c:2923 — u_handsy(void): container manipulation prompt
// Displays the container manipulation prompt options.
// TODO: pickup.c:2923 — u_handsy(): container manipulation prompt

// cf. pickup.c:2937 [static] — stash_ok(obj): object can be stashed filter
// Filter for objects that can be stashed in containers.
// TODO: pickup.c:2937 — stash_ok(): stashable object filter

// cf. pickup.c:3210 [static] — traditional_loot(put_in): traditional loot prompting
// Loots a container by prompting for each item.
// TODO: pickup.c:3210 — traditional_loot(): item-by-item container loot

// cf. pickup.c:3245 [static] — menu_loot(retry, put_in): menu-based looting
// Loots a container using a menu interface.
// TODO: pickup.c:3245 — menu_loot(): menu container loot

// cf. pickup.c:3461 [static] — tip_ok(obj): tippable object filter
// Filter for objects that can be tipped into containers.
// TODO: pickup.c:3461 — tip_ok(): tippable object filter

// cf. pickup.c:3485 [static] — choose_tip_container_menu(void): tip container menu
// Displays menu of containers under hero for tipping.
// TODO: pickup.c:3485 — choose_tip_container_menu(): tip container selection

// cf. pickup.c:3542 — dotip(void): #tip command handler
// Handles the #tip command to empty container contents.
// TODO: pickup.c:3542 — dotip(): tip container command

// cf. pickup.c:3853 [static] — tipcontainer_gettarget(box, cancelled): get tip target container
// Gets the target container for a tipping operation.
// TODO: pickup.c:3853 — tipcontainer_gettarget(): tip target selection

// ---------------------------------------------------------------------------
// Implemented pickup / loot / pay functions
// ---------------------------------------------------------------------------

// Handle picking up items
// C ref: pickup.c pickup()
function handlePickup(player, map, display) {
    const objs = map.objectsAt(player.x, player.y);
    if (objs.length === 0) {
        const loc = map.at(player.x, player.y);
        if (loc && loc.typ === THRONE) {
            display.putstr_message(`It must weigh${loc.looted ? ' almost' : ''} a ton!`);
            return { moved: false, tookTime: false };
        }
        if (loc && loc.typ === SINK) {
            display.putstr_message('The plumbing connects it to the floor.');
            return { moved: false, tookTime: false };
        }
        if (loc && loc.typ === GRAVE) {
            display.putstr_message("You don't need a gravestone.  Yet.");
            return { moved: false, tookTime: false };
        }
        if (loc && loc.typ === FOUNTAIN) {
            display.putstr_message('You could drink the water...');
            return { moved: false, tookTime: false };
        }
        if (loc && IS_DOOR(loc.typ) && (loc.flags & D_ISOPEN)) {
            display.putstr_message("It won't come off the hinges.");
            return { moved: false, tookTime: false };
        }
        if (loc && loc.typ === ALTAR) {
            display.putstr_message('Moving the altar would be a very bad idea.');
            return { moved: false, tookTime: false };
        }
        if (loc && loc.typ === STAIRS) {
            display.putstr_message('The stairs are solidly affixed.');
            return { moved: false, tookTime: false };
        }
        display.putstr_message('There is nothing here to pick up.');
        return { moved: false, tookTime: false };
    }

    // Pick up gold first if present
    const gold = objs.find(o => o.oclass === COIN_CLASS);
    if (gold) {
        player.addToInventory(gold);
        map.removeObject(gold);
        display.putstr_message(formatGoldPickupMessage(gold, player));
        return { moved: false, tookTime: true };
    }

    // Pick up first other item
    // TODO: show menu if multiple items (like C NetHack)
    const obj = objs[0];
    if (!obj) {
        display.putstr_message('There is nothing here to pick up.');
        return { moved: false, tookTime: false };
    }

    const inventoryObj = player.addToInventory(obj);
    map.removeObject(obj);
    observeObject(obj);
    display.putstr_message(formatInventoryPickupMessage(obj, inventoryObj, player));
    return { moved: false, tookTime: true };
}

function getContainerContents(container) {
    if (Array.isArray(container?.contents)) return container.contents;
    if (Array.isArray(container?.cobj)) return container.cobj;
    return [];
}

function setContainerContents(container, items) {
    const out = Array.isArray(items) ? items : [];
    if (Array.isArray(container?.contents)) container.contents = out;
    if (Array.isArray(container?.cobj)) container.cobj = out;
    if (!Array.isArray(container?.contents) && !Array.isArray(container?.cobj)) {
        container.contents = out;
    }
}

async function handleLoot(game) {
    const { player, map, display } = game;

    // Check floor containers at player's position.
    const floorContainers = (map.objectsAt(player.x, player.y) || [])
        .filter((obj) => !!objectData[obj?.otyp]?.container);

    // Check inventory containers the player is carrying.
    // cf. pickup.c doloot_core() — also offers to loot carried containers.
    const invContainers = (player.inventory || [])
        .filter((obj) => obj && !!objectData[obj?.otyp]?.container);

    if (floorContainers.length === 0 && invContainers.length === 0) {
        display.putstr_message("You don't find anything here to loot.");
        return { moved: false, tookTime: false };
    }

    // Loot floor container first (C behavior: floor takes priority).
    if (floorContainers.length > 0) {
        const container = floorContainers[0];
        if (container.olocked && !container.obroken) {
            display.putstr_message('Hmmm, it seems to be locked.');
            return { moved: false, tookTime: false };
        }
        const contents = getContainerContents(container);
        if (contents.length === 0) {
            display.putstr_message("It's empty.");
            return { moved: false, tookTime: true };
        }
        for (const item of contents) {
            player.addToInventory(item);
            observeObject(item);
        }
        setContainerContents(container, []);
        const count = contents.length;
        display.putstr_message(`You loot ${count} item${count === 1 ? '' : 's'}.`);
        return { moved: false, tookTime: true };
    }

    // Loot an inventory container (take things out).
    // cf. pickup.c doloot_core() — "Do you want to take things out?"
    // If only one inventory container, offer it directly; else prompt for letter.
    let container;
    if (invContainers.length === 1) {
        container = invContainers[0];
    } else {
        // Build letter prompt from inventory letters.
        const letters = invContainers.map((o) => o.invlet).filter(Boolean).join('');
        const prompt = letters
            ? `Loot which container? [${letters} or ?*]`
            : 'Loot which container? [?*]';
        while (true) {
            display.putstr_message(prompt);
            const ch = await nhgetch();
            const c = String.fromCharCode(ch);
            if (ch === 27 || ch === 10 || ch === 13 || ch === 32) {
                display.topMessage = null;
                display.putstr_message('Never mind.');
                return { moved: false, tookTime: false };
            }
            container = invContainers.find((o) => o.invlet === c);
            if (container) break;
        }
        display.topMessage = null;
    }

    // cf. pickup.c doloot_core() — "Do you want to take things out of <x>? [yn]"
    const containerName = doname(container, player);
    display.putstr_message(`Do you want to take things out of your ${containerName}? [yn] `);
    const ans = await nhgetch();
    display.topMessage = null;
    if (String.fromCharCode(ans) !== 'y') {
        display.putstr_message('Never mind.');
        return { moved: false, tookTime: false };
    }

    const contents = getContainerContents(container);
    if (contents.length === 0) {
        display.putstr_message("It's empty.");
        return { moved: false, tookTime: true };
    }
    for (const item of contents) {
        player.addToInventory(item);
        observeObject(item);
    }
    setContainerContents(container, []);
    const count = contents.length;
    display.putstr_message(`You take out ${count} item${count === 1 ? '' : 's'}.`);
    return { moved: false, tookTime: true };
}

// C ref: shk.c dopay() — stub; full billing flow not yet ported.
async function handlePay(player, map, display) {
    // C ref: shk.c dopay() can still report "There appears..." even when
    // shopkeepers exist elsewhere on level; our billing-state model is partial,
    // so keep the C-safe no-shopkeeper text for strict replay parity.
    display.putstr_message('There appears to be no shopkeeper here to receive your payment.');
    return { moved: false, tookTime: false };
}

// Toggle autopickup (@)
// C ref: options.c dotogglepickup()
async function handleTogglePickup(game) {
    const { display } = game;

    // Toggle pickup flag
    game.flags.pickup = !game.flags.pickup;

    // Build message matching C NetHack format
    let msg;
    if (game.flags.pickup) {
        const pickupTypes = String(game.flags.pickup_types || '');
        if (pickupTypes.length > 0) {
            msg = `Autopickup: ON, for ${pickupTypes} objects.`;
        } else {
            msg = 'Autopickup: ON, for all objects.';
        }
    } else {
        msg = 'Autopickup: OFF.';
    }

    display.putstr_message(msg);
    return { moved: false, tookTime: false };
}

export { handlePickup, handleLoot, handlePay, handleTogglePickup };
