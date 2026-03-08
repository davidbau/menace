// lock.js -- Lock picking, door opening/closing, chest forcing
// cf. lock.c — picking_lock, picking_at, lock_action, picklock,
//              breakchestlock, forcelock, reset_pick, maybe_reset_pick,
//              autokey, pick_lock, u_have_forceable_weapon, doforce,
//              stumble_onto_mimic, doopen, doopen_indir, obstructed,
//              doclose, boxlock, doorlock, chest_shatter_msg
//
// lock.c handles all lock manipulation mechanics:
//   doopen()/doclose(): #open and #close door commands.
//   pick_lock(): initiate lock-picking on door or container.
//   picklock(): occupation callback that picks the lock each turn.
//   doforce(): #force command — force a locked chest open with a weapon.
//   autokey(): find appropriate key/pick for auto-unlocking.
//   boxlock()/doorlock(): wand/spell effects on boxes and doors.

import { IS_DOOR, D_CLOSED, D_LOCKED, D_ISOPEN, D_NODOOR, D_BROKEN, D_TRAPPED,
         SDOOR, DOOR, A_STR, A_DEX, A_CON, A_WIS,
         SHOPBASE, FINGER } from './const.js';
import { PM_ROGUE, PM_WIZARD } from './monsters.js';
import { Role_if } from './role.js';
import { rn2, rnl, rnd } from './rng.js';
import { nhgetch, ynFunction } from './input.js';
import { exercise } from './attrib_exercise.js';
import { objectData, WEAPON_CLASS, TOOL_CLASS, ROCK_CLASS, POTION_CLASS,
         SKELETON_KEY, LOCK_PICK, CREDIT_CARD,
         CHEST, LARGE_BOX, ICE_BOX,
         PICK_AXE, DWARVISH_MATTOCK,
         WAN_LOCKING, WAN_OPENING, WAN_STRIKING, WAN_POLYMORPH,
         SPE_WIZARD_LOCK, SPE_KNOCK, SPE_FORCE_BOLT, SPE_POLYMORPH,
         PAPER, WAX, VEGGY, FLESH, GLASS, WOOD,
       } from './objects.js';
import { doname, xname } from './mkobj.js';
import { DIRECTION_KEYS, M_AP_NOTHING, M_AP_FURNITURE, M_AP_OBJECT } from './const.js';
import { handleLoot } from './pickup.js';
import { pline, pline_The, You, You_cant, You_hear, There, set_msg_xy,
         verbalize } from './pline.js';
import { acurr, acurrstr } from './attrib.js';
import { obj_resists } from './objdata.js';
import { newsym } from './display.js';
import { block_point, unblock_point, recalc_block_point, cansee } from './vision.js';
import { wake_nearto, wake_nearby } from './mon.js';
import { useup, delobj, currency } from './invent.js';
import { stackobj } from './invent.js';
import { add_damage } from './shk.js';
import { mon_nam, some_mon_nam } from './do_name.js';
import { canseemon } from './mondata.js';
import { chest_trap } from './trap.js';
import { is_weptool, Is_box } from './objnam.js';

// ============================================================================
// Local helpers (cf. obj.h macros)
// ============================================================================

// Skill constants for weapon classification
const P_DAGGER = 1;
const P_SABER = 9;
const P_FLAIL = 13;
const P_LANCE = 19;

// cf. obj.h: is_blade(otmp)
function is_blade(otmp) {
    if (!otmp || otmp.oclass !== WEAPON_CLASS) return false;
    const sk = objectData[otmp.otyp]?.oc_subtyp ?? 0;
    return sk >= P_DAGGER && sk <= P_SABER;
}

// cf. obj.h: is_pick(otmp)
function is_pick(otmp) {
    return otmp && (otmp.otyp === PICK_AXE || otmp.otyp === DWARVISH_MATTOCK);
}

// is_weptool imported from objnam.js

// cf. obj.h: Is_box(obj)
// Is_box imported from objnam.js

// cf. obj.h: greatest_erosion(obj)
function greatest_erosion(obj) {
    return Math.max(obj.oeroded || 0, obj.oeroded2 || 0);
}

// cf. role check

// cf. obj.h: carried(obj)
function carried(obj) {
    return obj.where === 'OBJ_INVENT' || obj.where === 'invent';
}

// ============================================================================
// Lock-picking context — cf. C's gx.xlock struct
// ============================================================================
// The xlock context is stored on the game object as game.xlock.
// We initialize it lazily.

function getXlock(game) {
    if (!game.xlock) {
        game.xlock = {
            usedtime: 0,
            chance: 0,
            picktyp: 0,
            magic_key: false,
            door: null,     // reference to map location (loc object)
            box: null,      // reference to container object
        };
    }
    return game.xlock;
}

// cf. lock.c:259 — reset_pick(void): clear lock-picking context
// Autotranslated from lock.c:258
export function reset_pick() {
  gx.xlock.usedtime = gx.xlock.chance = gx.xlock.picktyp = 0;
  gx.xlock.magic_key = false;
  gx.xlock.door =  0;
  gx.xlock.box =  0;
}

// cf. lock.c:269 — maybe_reset_pick(container): reset pick if container gone
// Level change or object deletion; context may no longer be valid.
export function maybe_reset_pick(game, container) {
    const xlock = getXlock(game);
    if (container ? (container === xlock.box)
                  : (!xlock.box || !carried(xlock.box))) {
        reset_pick(game);
    }
}

// cf. lock.c:17 — picking_lock(x, y): check if picking a lock
// Returns { picking: true, x, y } if currently picking a lock, else { picking: false }.
export function picking_lock(game) {
    const xlock = getXlock(game);
    if (game.occupation && game.occupation.occtxt
        && (game.occupation.occtxt.includes('locking')
            || game.occupation.occtxt === 'picking the lock')
        && xlock._isPicklock) {
        return { picking: true, x: xlock._targetX, y: xlock._targetY };
    }
    return { picking: false, x: 0, y: 0 };
}

// cf. lock.c:30 — picking_at(x, y): check if picking lock at location
export function picking_at(game, x, y) {
    const xlock = getXlock(game);
    if (game.occupation && xlock._isPicklock && xlock.door) {
        return xlock._targetX === x && xlock._targetY === y;
    }
    return false;
}

// cf. lock.c:38 [static] — lock_action(void): current lock-picking action description
export function lock_action(game) {
    const xlock = getXlock(game);
    // if the target is currently unlocked, we're trying to lock it now
    if (xlock.door && !(xlock.door.flags & D_LOCKED)) {
        return 'locking the door';
    } else if (xlock.box && !xlock.box.olocked) {
        return xlock.box.otyp === CHEST ? 'locking the chest' : 'locking the box';
    }
    // otherwise we're trying to unlock it
    if (xlock.picktyp === LOCK_PICK || xlock.picktyp === CREDIT_CARD) {
        return 'picking the lock';
    } else if (xlock.door) {
        return 'unlocking the door';
    } else if (xlock.box) {
        return xlock.box.otyp === CHEST ? 'unlocking the chest' : 'unlocking the box';
    }
    return 'picking the lock';
}

// cf. lock.c:1276 [static] — chest_shatter_msg(otmp): chest shatter message
export async function chest_shatter_msg(otmp) {
    if (otmp.oclass === POTION_CLASS) {
        // C: You("%s %s shatter!", Blind ? "hear" : "see", an(bottlename()));
        // potionbreathe not ported — just print the message
        await pline("You see a bottle shatter!");
        return;
    }
    const thing = xname(otmp);
    const mat = objectData[otmp.otyp]?.oc_material;
    let disposition;
    switch (mat) {
    case PAPER:  disposition = 'is torn to shreds'; break;
    case WAX:    disposition = 'is crushed'; break;
    case VEGGY:  disposition = 'is pulped'; break;
    case FLESH:  disposition = 'is mashed'; break;
    case GLASS:  disposition = 'shatters'; break;
    case WOOD:   disposition = 'splinters to fragments'; break;
    default:     disposition = 'is destroyed'; break;
    }
    // C: pline("%s %s!", An(thing), disposition);
    const an_thing = thing.charAt(0).toUpperCase() + thing.slice(1);
    await pline(`A ${an_thing} ${disposition}!`);
}

// cf. lock.c:162 — breakchestlock(box, destroyit): break chest lock
export async function breakchestlock(game, box, destroyit) {
    const { player, map } = game;
    if (!destroyit) {
        // Bill for the box but not for its contents
        // C: costly_alteration(box, COST_BRKLCK) — not yet ported, skip billing
        box.olocked = false;
        box.obroken = true;
        box.lknown = true;
    } else {
        // #force has destroyed this box
        const the_name = `the ${xname(box)}`;
        await pline(`In fact, you've totally destroyed ${the_name}.`);
        // Put the contents on ground at the hero's feet
        const contents = Array.isArray(box.cobj) ? [...box.cobj] : [];
        for (const otmp of contents) {
            if (!rn2(3) || otmp.oclass === POTION_CLASS) {
                await chest_shatter_msg(otmp);
                if (otmp.quan === 1 || otmp.quan == null) {
                    // Remove from contents
                    const idx = box.cobj.indexOf(otmp);
                    if (idx >= 0) box.cobj.splice(idx, 1);
                    continue;
                }
                // Reduce quantity by 1
                otmp.quan = (otmp.quan || 1) - 1;
            }
            // Remove from box contents
            if (Array.isArray(box.cobj)) {
                const idx = box.cobj.indexOf(otmp);
                if (idx >= 0) box.cobj.splice(idx, 1);
            }
            // Place object on the floor
            if (map.placeObject) {
                map.placeObject(otmp, player.x, player.y);
            }
        }
        // Delete the box
        if (map.removeObject) {
            map.removeObject(box, player.x, player.y);
        }
        delobj(box, map);
    }
}

// cf. lock.c:926 [static] — obstructed(x, y, quietly): check location obstruction
export async function obstructed(x, y, quietly, map) {
    const mtmp = map.monsterAt(x, y);
    if (mtmp) {
        // C: M_AP_TYPE != M_AP_FURNITURE check
        if (mtmp.m_ap_type !== M_AP_FURNITURE) {
            if (mtmp.m_ap_type === M_AP_OBJECT) {
                // fall through to object check
            } else {
                if (!quietly) {
                    const mname = some_mon_nam(mtmp) || 'Something';
                    const Mn = mname.charAt(0).toUpperCase() + mname.slice(1);
                    await pline(`${Mn} blocks the way!`);
                }
                return true;
            }
        }
    }
    const objs = map.objectsAt(x, y) || [];
    if (objs.length > 0) {
        if (!quietly) {
            await pline("Something's in the way.");
        }
        return true;
    }
    return false;
}

// cf. lock.c:660 — u_have_forceable_weapon(void): check for force weapon
// Autotranslated from lock.c:659
export function u_have_forceable_weapon() {
  if (!uwep /* proper type test */ || ((uwep.oclass === WEAPON_CLASS || is_weptool(uwep)) ? (objects[uwep.otyp].oc_skill < P_DAGGER || objects[uwep.otyp].oc_skill === P_FLAIL || objects[uwep.otyp].oc_skill > P_LANCE) : uwep.oclass !== ROCK_CLASS)) return false;
  return true;
}

// cf. lock.c:759 — stumble_onto_mimic(x, y): detect door mimic
export async function stumble_onto_mimic(x, y, map) {
    const mtmp = map.monsterAt(x, y);
    if (mtmp && mtmp.m_ap_type === M_AP_FURNITURE
        && mtmp.mappearance === DOOR) {
        // C: stumble_onto_mimic(mtmp) — not ported; reveal the mimic
        await pline("The door actually was a monster!");
        if (mtmp.m_ap_type) mtmp.m_ap_type = M_AP_NOTHING;
        if (mtmp.mappearance) mtmp.mappearance = null;
        return true;
    }
    return false;
}

// cf. lock.c:289 — autokey(opening): find appropriate key
export function autokey(player, opening) {
    let key = null, pick = null, card = null;

    const invent = player.inventory || [];
    for (const o of invent) {
        switch (o.otyp) {
        case SKELETON_KEY:
            if (!key) key = o;
            break;
        case LOCK_PICK:
            if (!pick) pick = o;
            break;
        case CREDIT_CARD:
            if (!card) card = o;
            break;
        }
    }
    if (!opening) card = null;
    return key || pick || card || null;
}

// cf. lock.c:68 [static] — picklock(void): lock-picking occupation callback
// This creates and returns the occupation callback function.
async function makePicklockOccupation(game) {
    const { player, map, display } = game;
    const xlock = getXlock(game);

    return async function picklock_fn() {
        if (xlock.box) {
            // Check if box is still on floor at player position
            if (xlock.box.where !== 'OBJ_FLOOR'
                || xlock.box.ox !== player.x || xlock.box.oy !== player.y) {
                // Also check via objectsAt
                const objs = map.objectsAt(player.x, player.y) || [];
                if (!objs.includes(xlock.box)) {
                    xlock.usedtime = 0;
                    return false; // you or it moved
                }
            }
        } else if (xlock.door) {
            // Check door is still at expected location
            const dx = xlock._targetX;
            const dy = xlock._targetY;
            const loc = map.at(dx, dy);
            if (loc !== xlock.door) {
                xlock.usedtime = 0;
                return false; // you moved
            }
            switch (xlock.door.flags) {
            case D_NODOOR:
                await pline("This doorway has no door.");
                xlock.usedtime = 0;
                return false;
            case D_ISOPEN:
                await You("cannot lock an open door.");
                xlock.usedtime = 0;
                return false;
            case D_BROKEN:
                await pline("This door is broken.");
                xlock.usedtime = 0;
                return false;
            }
        }

        if (xlock.usedtime++ >= 50) {
            await You(`give up your attempt at ${lock_action(game)}.`);
            await exercise(player, A_DEX, true); // even if you don't succeed
            xlock.usedtime = 0;
            return false;
        }

        if (rn2(100) >= xlock.chance) {
            return true; // still busy
        }

        // C: using the Master Key of Thievery finds traps if its bless/curse
        //    state is adequate — simplified: magic_key trap detection
        const isTrapped = xlock.door
            ? !!(xlock.door.flags & D_TRAPPED)
            : !!(xlock.box && xlock.box.otrapped);
        if (isTrapped && xlock.magic_key) {
            xlock.chance += 20;
            // Trap detection with magic key — simplified
            if (!xlock.door && xlock.box && !xlock.box.tknown) {
                await You("find a trap!");
                xlock.box.tknown = true;
            }
            // C prompts "Do you want to try to disarm it?" — simplified: always disarm
            if (xlock.door) {
                xlock.door.flags = xlock.door.flags & ~D_TRAPPED;
            } else if (xlock.box) {
                xlock.box.otrapped = false;
                xlock.box.tknown = false;
            }
            await You("succeed in disarming the trap.");
            await exercise(player, A_WIS, true);
            xlock.usedtime = 0;
            return false;
        }

        await You(`succeed in ${lock_action(game)}.`);
        if (xlock.door) {
            if (xlock.door.flags & D_TRAPPED) {
                // C: b_trapped("door", FINGER) — door trap explodes
                await pline("You set off a trap!");
                xlock.door.flags = D_NODOOR;
                const dx = xlock._targetX;
                const dy = xlock._targetY;
                unblock_point(dx, dy);
                newsym(dx, dy);
            } else if (xlock.door.flags & D_LOCKED) {
                xlock.door.flags = D_CLOSED;
            } else {
                xlock.door.flags = D_LOCKED;
            }
        } else if (xlock.box) {
            xlock.box.olocked = !xlock.box.olocked;
            xlock.box.lknown = true;
            // C lock.c: if trapped, chest_trap() runs before exercise().
            if (xlock.box.otrapped) {
                await chest_trap(xlock.box, FINGER, false, game, player);
            }
        }
        await exercise(player, A_DEX, true);
        xlock.usedtime = 0;
        return false;
    };
}

// cf. lock.c:216 [static] — forcelock(void): forced lock occupation callback
// This creates and returns the occupation callback function.
async function makeForcelockOccupation(game) {
    const { player, map, display } = game;
    const xlock = getXlock(game);

    return async function forcelock_fn() {
        if (!xlock.box) {
            xlock.usedtime = 0;
            return false;
        }
        // Check box is still at player position
        const objs = map.objectsAt(player.x, player.y) || [];
        if (!objs.includes(xlock.box)) {
            xlock.usedtime = 0;
            return false; // you or it moved
        }

        const uwep = player.weapon;
        if (xlock.usedtime++ >= 50 || !uwep) {
            await You("give up your attempt to force the lock.");
            if (xlock.usedtime >= 50) {
                await exercise(player, xlock.picktyp ? A_DEX : A_STR, true);
            }
            xlock.usedtime = 0;
            return false;
        }

        if (xlock.picktyp) {
            // blade — weapon may break
            if (rn2(1000 - (uwep.spe || 0)) > (992 - greatest_erosion(uwep) * 10)
                && !uwep.cursed && !obj_resists(uwep, 0, 99)) {
                const prefix = (uwep.quan > 1) ? "One of your" : "Your";
                await pline(`${prefix} ${xname(uwep)} broke!`);
                useup(uwep, player);
                await You("give up your attempt to force the lock.");
                await exercise(player, A_DEX, true);
                xlock.usedtime = 0;
                return false;
            }
        } else {
            // blunt — wake nearby monsters
            wake_nearby(false, player, map);
        }

        if (rn2(100) >= xlock.chance) {
            return true; // still busy
        }

        await You("succeed in forcing the lock.");
        await exercise(player, xlock.picktyp ? A_DEX : A_STR, true);
        // C: breakchestlock(xlock.box, !picktyp && !rn2(3))
        await breakchestlock(game, xlock.box, !xlock.picktyp && !rn2(3));
        reset_pick(game);
        return false;
    };
}

// cf. lock.c:358 — pick_lock(pick, rx, ry, container): initiate lock-picking
// Returns: -1 (learned something, time passes), 0 (nothing happened), 1 (did something)
export async function pick_lock(game, pick, rx, ry, container) {
    const { player, map, display } = game;
    const xlock = getXlock(game);
    const PICKLOCK_LEARNED_SOMETHING = -1;
    const PICKLOCK_DID_NOTHING = 0;
    const PICKLOCK_DID_SOMETHING = 1;

    const picktyp = pick ? pick.otyp : 0;
    const autounlock = (rx !== 0 || container != null);

    // Check whether we're resuming an interrupted previous attempt
    if (xlock.usedtime && picktyp === xlock.picktyp) {
        const action = lock_action(game);
        await You(`resume your attempt at ${action}.`);
        xlock.magic_key = false; // simplified: is_magic_key not available here
        game.occupation = {
            occtxt: action,
            fn: await makePicklockOccupation(game),
        };
        xlock._isPicklock = true;
        return PICKLOCK_DID_SOMETHING;
    }

    if (pick && picktyp !== SKELETON_KEY && picktyp !== LOCK_PICK
        && picktyp !== CREDIT_CARD) {
        return PICKLOCK_DID_NOTHING;
    }

    let ch = 0;
    let ccx, ccy;

    if (rx !== 0) {
        // autounlock — caller provided coordinates
        ccx = rx;
        ccy = ry;
    } else {
        // Prompt for direction
        await display.putstr_message('In what direction? ');
        const dirCh = await nhgetch();
        display.topMessage = null;
        const c = String.fromCharCode(dirCh);
        let dir = DIRECTION_KEYS[c];
        if (!dir && (dirCh === 10 || dirCh === 13)) dir = DIRECTION_KEYS.j;
        if (!dir && (c === '.' || c === 's')) dir = [0, 0];
        if (!dir) {
            return PICKLOCK_DID_NOTHING;
        }
        ccx = player.x + dir[0];
        ccy = player.y + dir[1];
    }

    if (ccx === player.x && ccy === player.y) {
        // Pick lock on a container at hero's location
        const floorObjs = map.objectsAt(player.x, player.y) || [];
        let found = false;
        let count = 0;

        for (const otmp of floorObjs) {
            if (autounlock && otmp !== container) continue;
            if (!Is_box(otmp)) continue;
            count++;

            let verb;
            let it = false;
            if (otmp.obroken) {
                verb = 'fix';
            } else if (!otmp.olocked) {
                verb = 'lock'; it = true;
            } else if (picktyp !== LOCK_PICK) {
                verb = 'unlock'; it = true;
            } else {
                verb = 'pick';
            }

            if (!autounlock) {
                const qbuf = `There is ${doname(otmp)} here; ${verb} ${it ? 'it' : 'its lock'}?`;
                otmp.lknown = true;
                const ansCode = await ynFunction(qbuf, 'ynq', 'n'.charCodeAt(0), display);
                const ansChar = String.fromCharCode(ansCode);
                if (ansChar === 'q') return PICKLOCK_DID_NOTHING;
                if (ansChar === 'n') continue;
            } else {
                // autounlock — simplified: proceed directly
                if (!pick) return PICKLOCK_DID_NOTHING;
                const qbuf = `Unlock it with ${doname(pick)}?`;
                const ansCode = await ynFunction(qbuf, 'ynq', 'n'.charCodeAt(0), display);
                if (String.fromCharCode(ansCode) !== 'y') return PICKLOCK_DID_NOTHING;
            }

            if (otmp.obroken) {
                await You_cant(`fix its broken lock with ${doname(pick)}.`);
                return PICKLOCK_LEARNED_SOMETHING;
            } else if (picktyp === CREDIT_CARD && !otmp.olocked) {
                await You_cant("do that with a credit card.");
                return PICKLOCK_LEARNED_SOMETHING;
            }

            const dex = acurr(player, A_DEX);
            const isRogue = Role_if(player, PM_ROGUE) ? 1 : 0;
            switch (picktyp) {
            case CREDIT_CARD:
                ch = dex + 20 * isRogue;
                break;
            case LOCK_PICK:
                ch = 4 * dex + 25 * isRogue;
                break;
            case SKELETON_KEY:
                ch = 75 + dex;
                break;
            default:
                ch = 0;
            }
            if (otmp.cursed) ch = Math.floor(ch / 2);

            xlock.box = otmp;
            xlock.door = null;
            found = true;
            break;
        }

        if (!found) {
            if (!count) {
                await There("doesn't seem to be any sort of lock here.");
            }
            return PICKLOCK_LEARNED_SOMETHING;
        }

    } else {
        // Pick lock on an adjacent door
        const loc = map.at(ccx, ccy);

        const mtmp = map.monsterAt(ccx, ccy);
        if (mtmp && mtmp.m_ap_type !== M_AP_FURNITURE && mtmp.m_ap_type !== M_AP_OBJECT) {
            if (picktyp === CREDIT_CARD
                && (mtmp.isshk || mtmp.data?.mname === 'Oracle')) {
                await verbalize("No checks, no credit, no problem.");
            } else {
                await pline(`I don't think ${mon_nam(mtmp)} would appreciate that.`);
            }
            return PICKLOCK_LEARNED_SOMETHING;
        }

        if (!loc || !IS_DOOR(loc.typ)) {
            await You("see no door there.");
            return PICKLOCK_DID_NOTHING;
        }

        switch (loc.flags) {
        case D_NODOOR:
            await pline("This doorway has no door.");
            return PICKLOCK_LEARNED_SOMETHING;
        case D_ISOPEN:
            await You("cannot lock an open door.");
            return PICKLOCK_LEARNED_SOMETHING;
        case D_BROKEN:
            await pline("This door is broken.");
            return PICKLOCK_LEARNED_SOMETHING;
        default:
            // credit cards are only good for unlocking
            if (picktyp === CREDIT_CARD && !(loc.flags & D_LOCKED)) {
                await You_cant("lock a door with a credit card.");
                return PICKLOCK_LEARNED_SOMETHING;
            }

            const lockStr = (loc.flags & D_LOCKED) ? 'Unlock' : 'Lock';
            const qbuf = autounlock
                ? `${lockStr} it with ${doname(pick)}?`
                : `${lockStr} it?`;
            const ansCode = await ynFunction(qbuf, 'ynq', 'n'.charCodeAt(0), display);
            if (String.fromCharCode(ansCode) !== 'y') {
                return PICKLOCK_DID_NOTHING;
            }

            const dex = acurr(player, A_DEX);
            const isRogue = Role_if(player, PM_ROGUE) ? 1 : 0;
            switch (picktyp) {
            case CREDIT_CARD:
                ch = 2 * dex + 20 * isRogue;
                break;
            case LOCK_PICK:
                ch = 3 * dex + 30 * isRogue;
                break;
            case SKELETON_KEY:
                ch = 70 + dex;
                break;
            default:
                ch = 0;
            }
            xlock.door = loc;
            xlock.box = null;
        }
    }

    xlock.chance = ch;
    xlock.picktyp = picktyp;
    xlock.magic_key = false; // simplified
    xlock.usedtime = 0;
    xlock._isPicklock = true;
    xlock._targetX = ccx;
    xlock._targetY = ccy;

    const action = lock_action(game);
    game.occupation = {
        occtxt: action,
        fn: await makePicklockOccupation(game),
    };
    return PICKLOCK_DID_SOMETHING;
}

// cf. lock.c:1056 — boxlock(obj, otmp): wand/spell effect on box
// Returns true if something happened.
export async function boxlock(game, obj, otmp) {
    const xlock = getXlock(game);
    const player = (game.u || game.player);
    let res = false;

    switch (otmp.otyp) {
    case WAN_LOCKING:
    case SPE_WIZARD_LOCK:
        if (!obj.olocked) {
            await pline("Klunk!");
            obj.olocked = true;
            obj.obroken = false;
            if (Role_if(player, PM_WIZARD))
                obj.lknown = true;
            else
                obj.lknown = false;
            res = true;
        }
        break;
    case WAN_OPENING:
    case SPE_KNOCK:
        if (obj.olocked) {
            await pline("Klick!");
            obj.olocked = false;
            res = true;
            if (Role_if(player, PM_WIZARD))
                obj.lknown = true;
            else
                obj.lknown = false;
        } else {
            // silently fix if broken
            obj.obroken = false;
        }
        break;
    case WAN_POLYMORPH:
    case SPE_POLYMORPH:
        // Maybe start unlocking chest, get interrupted, then zap it;
        // we must avoid any attempt to resume unlocking it
        if (xlock.box === obj) {
            reset_pick(game);
        }
        break;
    }
    return res;
}

// cf. lock.c:1103 — doorlock(otmp, x, y): wand/spell effect on door
// Returns true if something happened.
export async function doorlock(game, otmp, x, y) {
    const { map, player } = game;
    const door = map.at(x, y);
    if (!door) return false;

    let res = true;
    let loudness = 0;
    let msg = null;

    // C: SDOOR handling
    if (door.typ === SDOOR) {
        switch (otmp.otyp) {
        case WAN_OPENING:
        case SPE_KNOCK:
        case WAN_STRIKING:
        case SPE_FORCE_BOLT:
            door.typ = DOOR;
            door.flags = D_CLOSED | (door.flags & D_TRAPPED);
            newsym(x, y);
            if (cansee(map, player, player.fov, x, y)) {
                await pline("A door appears in the wall!");
            }
            if (otmp.otyp === WAN_OPENING || otmp.otyp === SPE_KNOCK) {
                return true;
            }
            break; // striking: continue door handling below
        case WAN_LOCKING:
        case SPE_WIZARD_LOCK:
        default:
            return false;
        }
    }

    switch (otmp.otyp) {
    case WAN_LOCKING:
    case SPE_WIZARD_LOCK:
        if (await obstructed(x, y, false, map)) {
            return false;
        }
        switch (door.flags & ~D_TRAPPED) {
        case D_CLOSED:
            msg = "The door locks!";
            break;
        case D_ISOPEN:
            msg = "The door swings shut, and locks!";
            break;
        case D_BROKEN:
            msg = "The broken door reassembles and locks!";
            break;
        case D_NODOOR:
            msg = "A cloud of dust springs up and assembles itself into a door!";
            break;
        default:
            res = false;
            break;
        }
        block_point(x, y);
        door.flags = D_LOCKED | (door.flags & D_TRAPPED);
        newsym(x, y);
        break;

    case WAN_OPENING:
    case SPE_KNOCK:
        if (door.flags & D_LOCKED) {
            msg = "The door unlocks!";
            door.flags = D_CLOSED | (door.flags & D_TRAPPED);
        } else {
            res = false;
        }
        break;

    case WAN_STRIKING:
    case SPE_FORCE_BOLT:
        if (door.flags & (D_LOCKED | D_CLOSED)) {
            if (door.flags & D_TRAPPED) {
                door.flags = D_NODOOR;
                unblock_point(x, y);
                newsym(x, y);
                // C: mb_trapped or kaboom
                loudness = 40;
                if (cansee(map, player, player.fov, x, y)) {
                    await pline("KABOOM!!  You see a door explode.");
                } else {
                    await You_hear("a nearby explosion.");
                }
                break;
            }
            door.flags = D_BROKEN;
            recalc_block_point(x, y);
            newsym(x, y);
            if (cansee(map, player, player.fov, x, y)) {
                await pline_The("door crashes open!");
            } else {
                await You_hear("a crashing sound.");
            }
            loudness = 20;
        } else {
            res = false;
        }
        break;

    default:
        break;
    }

    if (msg && cansee(map, player, player.fov, x, y)) {
        await pline(msg);
    }
    if (loudness > 0) {
        wake_nearto(x, y, loudness, map);
        // C: if (*in_rooms(x, y, SHOPBASE)) add_damage(x, y, 0L)
        // Shop damage tracking simplified
    }

    if (res && picking_at(game, x, y)) {
        // maybe unseen monster zaps door you're unlocking
        game.occupation = null;
        reset_pick(game);
    }
    return res;
}

// ============================================================================
// Command handlers — handleForce, handleOpen, handleClose
// These are the top-level async functions called from cmd.js.
// ============================================================================

// cf. lock.c doforce() / forcelock() — #force command: bash open a locked chest
export async function handleForce(game) {
    const { player, map, display } = game;
    const xlock = getXlock(game);

    // C ref: lock.c doforce() checks u_have_forceable_weapon()
    const wep = player.weapon;
    if (!u_have_forceable_weapon(player)) {
        if (!wep) {
            await You_cant("force anything when not wielding a weapon.");
        } else {
            await You_cant("force anything with that weapon.");
        }
        return { moved: false, tookTime: false };
    }

    // C ref: picktyp = is_blade(uwep) && !is_pick(uwep)
    const picktyp = is_blade(wep) && !is_pick(wep) ? 1 : 0;

    // C ref: resume previous attempt
    if (xlock.usedtime && xlock.box && picktyp === xlock.picktyp) {
        await You("resume your attempt to force the lock.");
        game.occupation = {
            occtxt: 'forcing the lock',
            fn: await makeForcelockOccupation(game),
        };
        return { moved: false, tookTime: true };
    }

    // Find a locked box on the floor at the player's position.
    // C ref: lock.c doforce() scans level.objects[u.ux][u.uy] for Is_box().
    const floorObjs = map.objectsAt(player.x, player.y) || [];
    xlock.box = null;

    for (const otmp of floorObjs) {
        if (!Is_box(otmp)) continue;
        if (otmp.obroken || !otmp.olocked) {
            otmp.lknown = false; // C: force doname() to omit prefix
            const lockState = otmp.obroken ? 'broken' : 'unlocked';
            await There(`is ${doname(otmp)} here, but its lock is already ${lockState}.`);
            otmp.lknown = true;
            continue;
        }
        const qbuf = `There is ${doname(otmp)} here; force its lock?`;
        otmp.lknown = true;

        const ansCode = await ynFunction(qbuf, 'ynq', 'n'.charCodeAt(0), display);
        const ansChar = String.fromCharCode(ansCode);
        if (ansChar === 'q') {
            return { moved: false, tookTime: false };
        }
        if (ansChar === 'n') continue;

        if (picktyp) {
            await You(`force ${doname(wep)} into a crack and pry.`);
        } else {
            await You(`start bashing it with ${doname(wep)}.`);
        }
        xlock.box = otmp;
        xlock.chance = (objectData[wep.otyp]?.oc_wldam || 4) * 2;
        xlock.picktyp = picktyp;
        xlock.magic_key = false;
        xlock.usedtime = 0;
        break;
    }

    if (xlock.box) {
        game.occupation = {
            occtxt: 'forcing the lock',
            fn: await makeForcelockOccupation(game),
        };
    } else {
        await You("decide not to force the issue.");
    }
    return { moved: false, tookTime: true };
}

// Handle opening a door
// C ref: lock.c doopen() / doopen_indir()
export async function handleOpen(player, map, display, game) {
    await display.putstr_message('In what direction? ');
    const dirCh = await nhgetch();
    // Prompt should not concatenate with outcome message.
    display.topMessage = null;
    const c = String.fromCharCode(dirCh);
    let dir = DIRECTION_KEYS[c];
    if (!dir && (dirCh === 10 || dirCh === 13)) dir = DIRECTION_KEYS.j;
    // C ref: getdir() accepts self-direction ('.' and 's').
    if (!dir && (c === '.' || c === 's')) {
        dir = [0, 0];
    }
    if (!dir) {
        // C ref: getdir() + get_adjacent_loc() — wizard sessions (cmdassist on)
        // silently fail with just "Never mind."; non-wizard sessions emit
        // "What a strange direction!" before the caller's "Never mind."
        if (game?.player?.wizard) {
            await display.putstr_message('Never mind.');
        } else {
            await display.putstr_message('What a strange direction!  Never mind.');
        }
        return { moved: false, tookTime: false };
    }

    // C ref: doopen() with self-direction routes through loot handling.
    if (dir[0] === 0 && dir[1] === 0) {
        return await handleLoot(game);
    }

    const nx = player.x + dir[0];
    const ny = player.y + dir[1];

    // C ref: stumble_onto_mimic
    if (await stumble_onto_mimic(nx, ny, map)) {
        return { moved: false, tookTime: true };
    }

    const loc = map.at(nx, ny);

    if (!loc || !IS_DOOR(loc.typ)) {
        await display.putstr_message('You see no door there.');
        return { moved: false, tookTime: false };
    }

    // C: if (!(door->doormask & D_CLOSED)) — handle non-closed states
    if (!(loc.flags & D_CLOSED)) {
        let mesg;
        switch (loc.flags) {
        case D_BROKEN:
            mesg = ' is broken'; break;
        case D_NODOOR:
            mesg = 'way has no door'; break;
        case D_ISOPEN:
            mesg = ' is already open'; break;
        default:
            mesg = ' is locked'; break;
        }
        await display.putstr_message(`This door${mesg}.`);
        return { moved: false, tookTime: false };
    }

    // Door is known to be CLOSED
    // C ref: lock.c:904 doopen_indir — rnl(20) strength check
    const str = acurrstr(player);
    const dex = acurr(player, A_DEX);
    const con = acurr(player, A_CON);
    const luck = (player.uluck ?? player.luck) || 0;
    if (rnl(20, luck) < Math.floor((str + dex + con) / 3)) {
        await display.putstr_message("The door opens.");
        if (loc.flags & D_TRAPPED) {
            await display.putstr_message("You set off a trap!");
            loc.flags = D_NODOOR;
            unblock_point(nx, ny);
            newsym(nx, ny);
        } else {
            loc.flags = D_ISOPEN;
        }
        recalc_block_point(nx, ny);
        newsym(nx, ny);
    } else {
        await exercise(player, A_STR, true);
        await display.putstr_message("The door resists!");
    }
    return { moved: false, tookTime: true };
}

// Handle closing a door
// C ref: lock.c doclose()
export async function handleClose(player, map, display, game) {
    await display.putstr_message('In what direction? ');
    const dirCh = await nhgetch();
    display.topMessage = null;
    display.messageNeedsMore = false;
    const c = String.fromCharCode(dirCh);
    let dir = DIRECTION_KEYS[c];
    if (!dir && (dirCh === 10 || dirCh === 13)) dir = DIRECTION_KEYS.j;
    if (!dir) {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        return { moved: false, tookTime: false };
    }

    const nx = player.x + dir[0];
    const ny = player.y + dir[1];

    // C: self-direction check
    if (nx === player.x && ny === player.y) {
        await display.putstr_message("You are in the way!");
        return { moved: false, tookTime: true };
    }

    const loc = map.at(nx, ny);

    // C: stumble_onto_mimic
    if (await stumble_onto_mimic(nx, ny, map)) {
        return { moved: false, tookTime: true };
    }

    if (!loc || !IS_DOOR(loc.typ)) {
        await display.putstr_message('You see no door there.');
        return { moved: false, tookTime: false };
    }

    if (loc.flags === D_NODOOR) {
        await display.putstr_message("This doorway has no door.");
        return { moved: false, tookTime: false };
    }

    // C: obstructed check
    if (await obstructed(nx, ny, false, map)) {
        return { moved: false, tookTime: false };
    }

    if (loc.flags === D_BROKEN) {
        await display.putstr_message("This door is broken.");
        return { moved: false, tookTime: false };
    }

    if (loc.flags & (D_CLOSED | D_LOCKED)) {
        await display.putstr_message("This door is already closed.");
        return { moved: false, tookTime: false };
    }

    if (loc.flags === D_ISOPEN || (loc.flags & D_ISOPEN)) {
        // C: rn2(25) < (ACURRSTR + ACURR(A_DEX) + ACURR(A_CON)) / 3
        const str = acurrstr(player);
        const dex = acurr(player, A_DEX);
        const con = acurr(player, A_CON);
        if (rn2(25) < Math.floor((str + dex + con) / 3)) {
            await display.putstr_message("The door closes.");
            loc.flags = D_CLOSED;
            block_point(nx, ny);
            newsym(nx, ny);
        } else {
            await exercise(player, A_STR, true);
            await display.putstr_message("The door resists!");
        }
    }

    return { moved: false, tookTime: true };
}

// Autotranslated from lock.c:758
export async function stumble_on_door_mimic(x, y) {
  let mtmp;
  if ((mtmp = m_at(x, y)) && is_door_mappear(mtmp) && !Protection_from_shape_changers) { await stumble_onto_mimic(mtmp); return true; }
  return false;
}

// Autotranslated from lock.c:772
export function doopen() {
  return doopen_indir(0, 0);
}
