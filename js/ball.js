// ball.js -- Ball and chain mechanics
// cf. ball.c — ballrelease, ballfall, placebc_core, unplacebc_core,
//              check_restriction, placebc, unplacebc,
//              unplacebc_and_covet_placebc, lift_covet_and_placebc,
//              bc_order, set_bc, move_bc,
//              drag_ball, drop_ball, litter, drag_down, bc_sanity_check

import { rn2, rnd, rn1 } from './rng.js';
import { pline, pline_The, You, Your, You_feel, impossible } from './pline.js';
import { newsym } from './display.js';
import { dist2, distmin } from './hacklib.js';
import { movobj, near_capacity, losehp, nomul, spoteffects, Maybe_Half_Phys, weight_cap } from './hack.js';
import { game as _gstate } from './gstate.js';
import { flooreffects } from './do.js';
import { placeFloorObject, carried } from './invent.js';
import { body_part } from './polyself.js';
import { is_pool } from './dbridge.js';
import { place_object, remove_object } from './mkobj.js';
import { IS_OBSTRUCTED, IS_DOOR, D_CLOSED, D_LOCKED, POOL,
         is_pit, is_hole, A_STR, SLT_ENCUMBER,
         W_BALL, W_CHAIN, W_WEAPONS,
         NO_KILLER_PREFIX, KILLED_BY_AN, KILLED_BY,
         TT_NONE, TT_PIT, TT_WEB, TT_LAVA, TT_BEARTRAP, TT_INFLOOR, TT_BURIEDBALL,
         BC_BALL, BC_CHAIN, OBJ_FREE, LEFT_SIDE, RIGHT_SIDE } from './const.js';
import { xname } from './objnam.js';
import { HEAVY_IRON_BALL, IRON_CHAIN } from './objects.js';
import { exercise } from './attrib_exercise.js';
import { maybe_unhide_at } from './mon.js';
import { obj_extract_self } from './mkobj.js';
import { t_at } from './trap.js';
import { welded } from './wield.js';
import { Is_waterlevel } from './dungeon.js';
import { hard_helmet } from './do_wear.js';

// cf. ball.c:17 — static restriction state
let bcrestriction = 0;
// cf. hack.h: enum bcargs { override_restriction = -1 }
const override_restriction = -1;

// cf. ball.c:107-109 — bc position constants
const BCPOS_DIFFER = 0; // ball & chain at different positions
const BCPOS_CHAIN = 1;  // chain on top of ball
const BCPOS_BALL = 2;   // ball on top of chain

// hard_helmet imported from do_wear.js
// body_part imported from polyself.js

// Maybe_Half_Phys imported from hack.js

// Helper: Soundeffect stub
function Soundeffect() { }

// is_pool imported from dbridge.js

// Helper: IS_CHAIN_ROCK — is position solid rock or closed/locked door?
function IS_CHAIN_ROCK(x, y, map) {
    const loc = map.at(x, y);
    if (!loc) return true;
    return IS_OBSTRUCTED(loc.typ)
        || (IS_DOOR(loc.typ) && ((loc.flags || 0) & (D_CLOSED | D_LOCKED)));
}

// Helper: CHAIN_IN_MIDDLE — chain position is valid between hero and ball
function CHAIN_IN_MIDDLE(chx, chy, x, y, uball) {
    return distmin(x, y, chx, chy) <= 1
        && distmin(chx, chy, uball.ox, uball.oy) <= 1;
}

// Is_waterlevel imported from dungeon.js

// Helper: cls — clear screen
function cls(display) {
    // Display clear; no-op in headless mode
    if (display && display.clear) display.clear();
}

// place_object, remove_object imported from mkobj.js

// cf. ball.c:23 — ballrelease(showmsg): drop carried ball
export async function ballrelease(showmsg, player, map) {
    const uball = player.uball;
    if (!uball) return;
    if (carried(uball) && !welded(uball, player)) {
        if (showmsg)
            await pline("Startled, you drop the iron ball.");
        if (player.weapon === uball)
            player.weapon = null;
        if (player.swapWeapon === uball)
            player.swapWeapon = null;
        if (player.quiver === uball)
            player.quiver = null;
        // freeinv: remove from inventory but don't place on floor
        const idx = player.inventory ? player.inventory.indexOf(uball) : -1;
        if (idx >= 0) player.inventory.splice(idx, 1);
        uball.where = OBJ_FREE;
        // encumber_msg() — recalculate encumbrance
    }
}

// cf. ball.c:43 — ballfall(void): ball falls through trapdoor
export async function ballfall(player, map) {
    const uball = player.uball;
    if (!uball || (uball && carried(uball) && welded(uball, player)))
        return;

    const gets_hit = ((uball.ox !== player.x) || (uball.oy !== player.y))
                     && ((player.weapon === uball) ? false : !!rn2(5));
    await ballrelease(true, player, map);
    if (gets_hit) {
        let dmg = rn1(7, 25);

        await pline_The("iron ball falls on your %s.", body_part('HEAD'));
        if (player.helmet) {
            if (hard_helmet(player.helmet)) {
                await pline("Fortunately, you are wearing a hard helmet.");
                dmg = 3;
            } else {
                // flags.verbose — assume true
                await pline("%s does not protect you.", player.helmet.oname || "Your helmet");
            }
        }
        await losehp(Maybe_Half_Phys(dmg, player), "crunched in the head by an iron ball",
               NO_KILLER_PREFIX, player, _gstate?.display, _gstate);
    }
}

// cf. ball.c:119 — placebc_core(): place ball and chain on floor
export async function placebc_core(player, map) {
    const uchain = player.uchain;
    const uball = player.uball;
    if (!uchain || !uball) {
        impossible("Where are your ball and chain?");
        return;
    }

    await flooreffects(uchain, player.x, player.y, "", player, map); // chain might rust

    if (carried(uball)) { // the ball is carried
        player.bc_order = BCPOS_DIFFER;
    } else {
        // ball might rust — already checked when carried
        await flooreffects(uball, player.x, player.y, "", player, map);
        place_object(uball, player.x, player.y, map);
        player.bc_order = BCPOS_CHAIN;
    }

    place_object(uchain, player.x, player.y, map);

    const loc = map.at(player.x, player.y);
    player.bglyph = player.cglyph = loc ? loc.glyph : -1; // pick up glyph

    newsym(player.x, player.y);
    bcrestriction = 0;
}

// cf. ball.c:146 — unplacebc_core(): remove ball and chain from floor
export function unplacebc_core(player, map) {
    const uchain = player.uchain;
    const uball = player.uball;

    if (player.uswallow) {
        if (Is_waterlevel(map)) {
            // proceed with removal so movebubbles() disregards it
            if (!carried(uball))
                obj_extract_self(uball, map);
            obj_extract_self(uchain, map);
        }
        // ball&chain not unplaced while swallowed
        return;
    }

    if (!carried(uball)) {
        obj_extract_self(uball, map);
        if (player.blind && (player.bc_felt & BC_BALL)) { // drop glyph
            const loc = map.at(uball.ox, uball.oy);
            if (loc) loc.glyph = player.bglyph;
        }
        maybe_unhide_at(uball.ox, uball.oy, map);
        newsym(uball.ox, uball.oy);
    }
    obj_extract_self(uchain, map);
    if (player.blind && (player.bc_felt & BC_CHAIN)) { // drop glyph
        const loc = map.at(uchain.ox, uchain.oy);
        if (loc) loc.glyph = player.cglyph;
    }
    maybe_unhide_at(uchain.ox, uchain.oy, map);

    newsym(uchain.ox, uchain.oy);
    player.bc_felt = 0; // feel nothing
}

// cf. ball.c:179 — check_restriction(): validate bc operation
// Autotranslated from ball.c:179
export function check_restriction(restriction) {
  let ret = false;
  if (!bcrestriction || (restriction === override_restriction)) ret = true;
  else {
    ret = (bcrestriction === restriction) ? true : false;
  }
  return ret;
}

// cf. ball.c:192 — placebc(): place ball and chain
export async function placebc(player, map) {
    if (!check_restriction(0)) {
        return;
    }
    if (player.uchain && player.uchain.where !== 'OBJ_FREE') {
        impossible("bc already placed?");
        return;
    }
    await placebc_core(player, map);
}

// C ref: ball.c:259 Placebc() — compatibility alias.
export async function Placebc(player, map) {
    return placebc(player, map);
}

// cf. ball.c:211 — unplacebc(): remove ball and chain
// Autotranslated from ball.c:211
export function unplacebc() {
  if (bcrestriction) {
    impossible("unplacebc denied, restriction in_ place");
    return;
  }
  unplacebc_core();
}

// C ref: ball.c:287 Unplacebc() — compatibility alias.
export function Unplacebc() {
    return unplacebc();
}

// cf. ball.c:221 — unplacebc_and_covet_placebc(): remove and pin bc
// Autotranslated from ball.c:221
export function unplacebc_and_covet_placebc() {
  let restriction = 0;
  if (bcrestriction) {
    impossible("unplacebc_and_covet_placebc denied, already restricted");
  }
  else { restriction = bcrestriction = rnd(400); unplacebc_core(); }
  return restriction;
}

// C ref: ball.c:306 Unplacebc_and_covet_placebc() — compatibility alias.
export function Unplacebc_and_covet_placebc() {
    return unplacebc_and_covet_placebc();
}

// cf. ball.c:235 — lift_covet_and_placebc(pin): lift restriction and replace
export async function lift_covet_and_placebc(pin, player, map) {
    if (!check_restriction(pin)) {
        return;
    }
    if (player.uchain && player.uchain.where !== 'OBJ_FREE') {
        impossible("bc already placed?");
        return;
    }
    await placebc_core(player, map);
}

// C ref: ball.c:327 Lift_covet_and_placebc() — compatibility alias.
export async function Lift_covet_and_placebc(pin, player, map) {
    return lift_covet_and_placebc(pin, player, map);
}

// cf. ball.c:353 — bc_order(): ball/chain stacking order
function bc_order_fn(player, map) {
    const uchain = player.uchain;
    const uball = player.uball;
    if (!uchain || !uball) return BCPOS_DIFFER;

    if (uchain.ox !== uball.ox || uchain.oy !== uball.oy || carried(uball)
        || player.uswallow)
        return BCPOS_DIFFER;

    // Walk objects at ball position to determine stacking order
    const objs = map.objectsAt ? map.objectsAt(uball.ox, uball.oy)
                 : (map.objects || []).filter(o => o.ox === uball.ox && o.oy === uball.oy);
    for (const obj of objs) {
        if (obj === uchain) return BCPOS_CHAIN;
        if (obj === uball) return BCPOS_BALL;
    }
    impossible("bc_order: ball&chain not in same location!");
    return BCPOS_DIFFER;
}

// C ref: ball.c:354 bc_order() — expose ordering helper.
export function bc_order(player, map) {
    return bc_order_fn(player, map);
}

// cf. ball.c:379 — set_bc(already_blind): set up blind bc tracking
export function set_bc(already_blind, player, map) {
    const uball = player.uball;
    const uchain = player.uchain;
    if (!uball || !uchain) return;

    const ball_on_floor = !carried(uball);

    player.bc_order = bc_order_fn(player, map); // get the order
    player.bc_felt = ball_on_floor ? (BC_BALL | BC_CHAIN) : BC_CHAIN; // felt

    if (already_blind || player.uswallow) {
        const loc = map.at(player.x, player.y);
        player.cglyph = player.bglyph = loc ? loc.glyph : -1;
        return;
    }

    // Since we can still see, remove ball&chain and get glyph beneath them,
    // then put them back.
    remove_object(uchain, map);
    if (ball_on_floor)
        remove_object(uball, map);

    newsym(uchain.ox, uchain.oy);
    const chainLoc = map.at(uchain.ox, uchain.oy);
    player.cglyph = chainLoc ? chainLoc.glyph : -1;

    if (player.bc_order === BCPOS_DIFFER) { // different locations
        place_object(uchain, uchain.ox, uchain.oy, map);
        newsym(uchain.ox, uchain.oy);
        if (ball_on_floor) {
            newsym(uball.ox, uball.oy); // see under ball
            const ballLoc = map.at(uball.ox, uball.oy);
            player.bglyph = ballLoc ? ballLoc.glyph : -1;
            place_object(uball, uball.ox, uball.oy, map);
            newsym(uball.ox, uball.oy); // restore ball
        }
    } else {
        player.bglyph = player.cglyph;
        if (player.bc_order === BCPOS_CHAIN) {
            place_object(uball, uball.ox, uball.oy, map);
            place_object(uchain, uchain.ox, uchain.oy, map);
        } else {
            place_object(uchain, uchain.ox, uchain.oy, map);
            place_object(uball, uball.ox, uball.oy, map);
        }
        newsym(uball.ox, uball.oy);
    }
}

// cf. ball.c:436 — move_bc(): ball/chain movement during hero move
export function move_bc(before, control, ballx, bally, chainx, chainy, player, map) {
    const uball = player.uball;
    const uchain = player.uchain;
    if (!uball || !uchain) return;

    if (player.blind) {
        if (!before) {
            if ((control & BC_CHAIN) && (control & BC_BALL)) {
                // Both ball and chain moved. If felt, drop glyph.
                if (player.bc_felt & BC_BALL) {
                    const loc = map.at(uball.ox, uball.oy);
                    if (loc) loc.glyph = player.bglyph;
                }
                if (player.bc_felt & BC_CHAIN) {
                    const loc = map.at(uchain.ox, uchain.oy);
                    if (loc) loc.glyph = player.cglyph;
                }
                player.bc_felt = 0;

                // Pick up glyph at new location.
                const bloc = map.at(ballx, bally);
                player.bglyph = bloc ? bloc.glyph : -1;
                const cloc = map.at(chainx, chainy);
                player.cglyph = cloc ? cloc.glyph : -1;

                movobj(uball, ballx, bally, map);
                movobj(uchain, chainx, chainy, map);
            } else if (control & BC_BALL) {
                if (player.bc_felt & BC_BALL) {
                    if (player.bc_order === BCPOS_DIFFER) { // ball by itself
                        const loc = map.at(uball.ox, uball.oy);
                        if (loc) loc.glyph = player.bglyph;
                    } else if (player.bc_order === BCPOS_BALL) {
                        if (player.bc_felt & BC_CHAIN) { // know chain is there
                            // map_object(uchain, 0) — stub: display chain glyph
                        } else {
                            const loc = map.at(uball.ox, uball.oy);
                            if (loc) loc.glyph = player.bglyph;
                        }
                    }
                    player.bc_felt &= ~BC_BALL; // no longer feel the ball
                }

                // Pick up glyph at new position.
                if (ballx !== chainx || bally !== chainy) {
                    const loc = map.at(ballx, bally);
                    player.bglyph = loc ? loc.glyph : -1;
                } else {
                    player.bglyph = player.cglyph;
                }

                movobj(uball, ballx, bally, map);
            } else if (control & BC_CHAIN) {
                if (player.bc_felt & BC_CHAIN) {
                    if (player.bc_order === BCPOS_DIFFER) {
                        const loc = map.at(uchain.ox, uchain.oy);
                        if (loc) loc.glyph = player.cglyph;
                    } else if (player.bc_order === BCPOS_CHAIN) {
                        if (player.bc_felt & BC_BALL) {
                            // map_object(uball, 0) — stub: display ball glyph
                        } else {
                            const loc = map.at(uchain.ox, uchain.oy);
                            if (loc) loc.glyph = player.cglyph;
                        }
                    }
                    player.bc_felt &= ~BC_CHAIN;
                }
                // Pick up glyph at new position.
                if (ballx !== chainx || bally !== chainy) {
                    const loc = map.at(chainx, chainy);
                    player.cglyph = loc ? loc.glyph : -1;
                } else {
                    player.cglyph = player.bglyph;
                }

                movobj(uchain, chainx, chainy, map);
            }

            player.bc_order = bc_order_fn(player, map); // reset the order
        }

    } else {
        // Hero is not blind.
        if (before) {
            if (!control) {
                // Neither ball nor chain is moving; remember stacking order.
                player.bc_order = bc_order_fn(player, map);
            }

            remove_object(uchain, map);
            maybe_unhide_at(uchain.ox, uchain.oy, map);
            newsym(uchain.ox, uchain.oy);
            if (!carried(uball)) {
                remove_object(uball, map);
                maybe_unhide_at(uball.ox, uball.oy, map);
                newsym(uball.ox, uball.oy);
            }
        } else {
            const on_floor = !carried(uball);

            if ((control & BC_CHAIN)
                || (!control && player.bc_order === BCPOS_CHAIN)) {
                // Chain moved or nothing moved & chain on top.
                if (on_floor)
                    place_object(uball, ballx, bally, map);
                place_object(uchain, chainx, chainy, map); // chain on top
            } else {
                place_object(uchain, chainx, chainy, map);
                if (on_floor)
                    place_object(uball, ballx, bally, map);
                // ball on top
            }
            newsym(chainx, chainy);
            if (on_floor)
                newsym(ballx, bally);
        }
    }
}

// cf. ball.c:559 — drag_ball(): ball/chain drag computation
// Returns { ret, bc_control, ballx, bally, chainx, chainy, cause_delay }
// ret is true if caller needs to place ball and chain down again
export async function drag_ball(x, y, allow_drag, player, map, game) {
    const uball = player.uball;
    const uchain = player.uchain;
    if (!uball || !uchain) return { ret: false, bc_control: 0, ballx: 0, bally: 0, chainx: 0, chainy: 0, cause_delay: false };

    let ballx = uball.ox;
    let bally = uball.oy;
    let chainx = uchain.ox;
    let chainy = uchain.oy;
    let bc_control = 0;
    let cause_delay = false;

    if (dist2(x, y, uchain.ox, uchain.oy) <= 2) { // nothing moved
        move_bc(1, bc_control, ballx, bally, chainx, chainy, player, map);
        return { ret: true, bc_control, ballx, bally, chainx, chainy, cause_delay };
    }

    // only need to move the chain?
    if (carried(uball) || distmin(x, y, uball.ox, uball.oy) <= 2) {
        const oldchainx = uchain.ox, oldchainy = uchain.oy;

        bc_control = BC_CHAIN;
        move_bc(1, bc_control, ballx, bally, chainx, chainy, player, map);
        if (carried(uball)) {
            // move chain only if necessary
            if (distmin(x, y, uchain.ox, uchain.oy) > 1) {
                chainx = player.x;
                chainy = player.y;
            }
            return { ret: true, bc_control, ballx, bally, chainx, chainy, cause_delay };
        }

        // Check if chain would be in rock
        let already_in_rock;
        if (IS_CHAIN_ROCK(player.x, player.y, map) || IS_CHAIN_ROCK(chainx, chainy, map)
            || IS_CHAIN_ROCK(uball.ox, uball.oy, map))
            already_in_rock = true;
        else
            already_in_rock = false;

        // SKIP_TO_DRAG helper — restore chain and jump to drag section
        let skip_to_drag = false;
        function SKIP_TO_DRAG() {
            chainx = oldchainx;
            chainy = oldchainy;
            move_bc(0, bc_control, ballx, bally, chainx, chainy, player, map);
            skip_to_drag = true;
        }

        switch (dist2(x, y, uball.ox, uball.oy)) {
        // two spaces diagonal from ball, move chain in-between
        case 8:
            chainx = Math.floor((uball.ox + x) / 2);
            chainy = Math.floor((uball.oy + y) / 2);
            if (IS_CHAIN_ROCK(chainx, chainy, map) && !already_in_rock)
                SKIP_TO_DRAG();
            break;

        // player is distance 2/1 from ball
        case 5: {
            let tempx, tempy, tempx2, tempy2;

            if (Math.abs(x - uball.ox) === 1) {
                tempx = x;
                tempx2 = uball.ox;
                tempy = tempy2 = Math.floor((uball.oy + y) / 2);
            } else {
                tempx = tempx2 = Math.floor((uball.ox + x) / 2);
                tempy = y;
                tempy2 = uball.oy;
            }
            if (IS_CHAIN_ROCK(tempx, tempy, map) && !IS_CHAIN_ROCK(tempx2, tempy2, map)
                && !already_in_rock) {
                if (allow_drag) {
                    if (dist2(player.x, player.y, uball.ox, uball.oy) === 5
                        && dist2(x, y, tempx, tempy) === 1)
                        SKIP_TO_DRAG();
                    if (!skip_to_drag && dist2(player.x, player.y, uball.ox, uball.oy) === 4
                        && dist2(x, y, tempx, tempy) === 2)
                        SKIP_TO_DRAG();
                }
                if (!skip_to_drag) {
                    chainx = tempx2;
                    chainy = tempy2;
                }
            } else if (!skip_to_drag && !IS_CHAIN_ROCK(tempx, tempy, map)
                       && IS_CHAIN_ROCK(tempx2, tempy2, map) && !already_in_rock) {
                if (allow_drag) {
                    if (dist2(player.x, player.y, uball.ox, uball.oy) === 5
                        && dist2(x, y, tempx2, tempy2) === 1)
                        SKIP_TO_DRAG();
                    if (!skip_to_drag && dist2(player.x, player.y, uball.ox, uball.oy) === 4
                        && dist2(x, y, tempx2, tempy2) === 2)
                        SKIP_TO_DRAG();
                }
                if (!skip_to_drag) {
                    chainx = tempx;
                    chainy = tempy;
                }
            } else if (!skip_to_drag && IS_CHAIN_ROCK(tempx, tempy, map)
                       && IS_CHAIN_ROCK(tempx2, tempy2, map) && !already_in_rock) {
                SKIP_TO_DRAG();
            } else if (!skip_to_drag) {
                if (dist2(tempx, tempy, uchain.ox, uchain.oy)
                        < dist2(tempx2, tempy2, uchain.ox, uchain.oy)
                    || ((dist2(tempx, tempy, uchain.ox, uchain.oy)
                         === dist2(tempx2, tempy2, uchain.ox, uchain.oy))
                        && rn2(2))) {
                    chainx = tempx;
                    chainy = tempy;
                } else {
                    chainx = tempx2;
                    chainy = tempy2;
                }
            }
            break;
        }

        // ball is two spaces horizontal or vertical from player
        case 4:
            if (!CHAIN_IN_MIDDLE(uchain.ox, uchain.oy, x, y, uball))
                ;  // fall through to set chain position
            else break;
            chainx = Math.floor((x + uball.ox) / 2);
            chainy = Math.floor((y + uball.oy) / 2);
            if (IS_CHAIN_ROCK(chainx, chainy, map) && !already_in_rock)
                SKIP_TO_DRAG();
            break;

        // ball is one space diagonal from player
        case 2:
            if (dist2(x, y, uball.ox, uball.oy) === 2
                && dist2(x, y, uchain.ox, uchain.oy) === 4) {
                if (uchain.oy === y)
                    chainx = uball.ox;
                else
                    chainy = uball.oy;
                if (IS_CHAIN_ROCK(chainx, chainy, map) && !already_in_rock)
                    SKIP_TO_DRAG();
                break;
            }
            // FALLTHROUGH
            // eslint-disable-next-line no-fallthrough
        case 1:
        case 0:
            // do nothing if possible
            if (CHAIN_IN_MIDDLE(uchain.ox, uchain.oy, x, y, uball))
                break;
            // otherwise try to drag chain to player's old position
            if (CHAIN_IN_MIDDLE(player.x, player.y, x, y, uball)) {
                chainx = player.x;
                chainy = player.y;
                break;
            }
            // otherwise use player's new position
            chainx = x;
            chainy = y;
            break;

        default:
            impossible("bad chain movement");
            break;
        }

        if (!skip_to_drag) {
            return { ret: true, bc_control, ballx, bally, chainx, chainy, cause_delay };
        }

        // Fall through to drag section
    }

    // drag:
    if (near_capacity(player) > SLT_ENCUMBER && dist2(x, y, player.x, player.y) <= 2) {
        await You("cannot %sdrag the heavy iron ball.",
            (player.inventory && player.inventory.length) ? "carry all that and also " : "");
        nomul(0, game);
        return { ret: false, bc_control, ballx, bally, chainx, chainy, cause_delay };
    }

    if ((is_pool(uchain.ox, uchain.oy, map)
         // water not mere continuation of previous water
         && (map.at(uchain.ox, uchain.oy).typ === POOL
             || !is_pool(uball.ox, uball.oy, map)
             || map.at(uball.ox, uball.oy).typ === POOL))
        || ((() => { const t = t_at(uchain.ox, uchain.oy, map);
                     return t && (is_pit(t.ttyp) || is_hole(t.ttyp)); })())
    ) {
        if (player.levitating || player.levitation) {
            await You_feel("a tug from the iron ball.");
            const t = t_at(uchain.ox, uchain.oy, map);
            if (t) t.tseen = 1;
        } else {
            await You("are jerked back by the iron ball!");
            const victim = map.monsterAt ? map.monsterAt(uchain.ox, uchain.oy) : null;
            if (victim) {
                const dieroll = rnd(20);
                let tmp = -2 + (player.luck || 0) + (typeof victim.findMac === 'function' ? victim.findMac() : 10);
                // omon_adj not wired; skip for now
                // tmp += omon_adj(victim, uball, true);

                if (tmp >= dieroll) {
                    // hmon(victim, uball, HMON_DRAGGED, dieroll) — combat not wired for ball drag
                } else {
                    // miss(xname(uball), victim) — miss message not wired
                }
            }
            // now check again in case mon died
            const still_there = map.monsterAt ? map.monsterAt(uchain.ox, uchain.oy) : null;
            if (!still_there) {
                player.x0 = player.x;
                player.y0 = player.y;
                player.x = uchain.ox;
                player.y = uchain.oy;
                newsym(player.x0, player.y0);
            }
            nomul(0, game);

            bc_control = BC_BALL;
            move_bc(1, bc_control, ballx, bally, chainx, chainy, player, map);
            ballx = uchain.ox;
            bally = uchain.oy;
            move_bc(0, bc_control, ballx, bally, chainx, chainy, player, map);
            await spoteffects(true, player, map, null, game);
            return { ret: false, bc_control, ballx, bally, chainx, chainy, cause_delay };
        }
    }

    bc_control = BC_BALL | BC_CHAIN;

    move_bc(1, bc_control, ballx, bally, chainx, chainy, player, map);
    if (dist2(x, y, player.x, player.y) > 2) {
        // Teleported more than one square — just put everything at target.
        ballx = chainx = x;
        bally = chainy = y;
    } else {
        let newchainx = player.x, newchainy = player.y;

        if (dist2(x, y, uchain.ox, uchain.oy) === 4
            && !IS_CHAIN_ROCK(newchainx, newchainy, map)) {
            newchainx = Math.floor((x + uchain.ox) / 2);
            newchainy = Math.floor((y + uchain.oy) / 2);
            if (IS_CHAIN_ROCK(newchainx, newchainy, map)) {
                newchainx = player.x;
                newchainy = player.y;
            }
        }

        ballx = uchain.ox;
        bally = uchain.oy;
        chainx = newchainx;
        chainy = newchainy;
    }
    cause_delay = true;
    return { ret: true, bc_control, ballx, bally, chainx, chainy, cause_delay };
}

// cf. ball.c:881 — drop_ball(x, y): drop ball at location
export async function drop_ball(x, y, player, map, game) {
    const uball = player.uball;
    const uchain = player.uchain;
    if (!uball || !uchain) return;

    // TT_ constants imported from trap.js

    if (player.blind) {
        // get the order
        player.bc_order = bc_order_fn(player, map);
        // pick up glyph
        if (player.bc_order) {
            player.bglyph = player.cglyph;
        } else {
            const loc = map.at(x, y);
            player.bglyph = loc ? loc.glyph : -1;
        }
    }

    if (x !== player.x || y !== player.y) {
        const pullmsg = "The ball pulls you out of the ";

        if (player.utrap
            && player.utraptype !== TT_INFLOOR && player.utraptype !== TT_BURIEDBALL) {
            switch (player.utraptype) {
            case TT_PIT:
                await pline("%s%s!", pullmsg, "pit");
                break;
            case TT_WEB:
                await pline("%s%s!", pullmsg, "web");
                Soundeffect();
                await pline_The("web is destroyed!");
                // deltrap(t_at(player.x, player.y)) — trap deletion
                { const t = t_at(player.x, player.y, map);
                  if (t && map.traps) {
                      const idx = map.traps.indexOf(t);
                      if (idx >= 0) map.traps.splice(idx, 1);
                  }
                }
                break;
            case TT_LAVA:
                await pline("%s%s!", pullmsg, "lava");
                break;
            case TT_BEARTRAP: {
                const side = rn2(3) ? LEFT_SIDE : RIGHT_SIDE;
                await pline("%s%s!", pullmsg, "bear trap");
                // set_wounded_legs(side, rn1(1000, 500))
                // Stub: wounded legs not fully wired
                if (!player.usteed) {
                    await Your("%s %s is severely damaged.",
                         (side === LEFT_SIDE) ? "left" : "right",
                         body_part('LEG'));
                    await losehp(Maybe_Half_Phys(2, player),
                           "leg damage from being pulled out of a bear trap",
                           KILLED_BY, player, game?.display, game);
                }
                break;
            }
            }
            // reset_utrap(true)
            player.utrap = 0;
            player.utraptype = TT_NONE;
            // fill_pit(player.x, player.y) — stub
        }

        player.x0 = player.x;
        player.y0 = player.y;
        const MON_AT = map.monsterAt ? !!map.monsterAt(x, y) : false;
        if (!(player.levitating || player.levitation) && !MON_AT && !player.utrap
            && (is_pool(x, y, map)
                || ((() => { const t = t_at(x, y, map);
                             return t && (is_pit(t.ttyp) || is_hole(t.ttyp)); })()))) {
            player.x = x;
            player.y = y;
        } else {
            player.x = x - (player.dx || 0);
            player.y = y - (player.dy || 0);
        }
        // vision_full_recalc = 1; // hero has moved

        if (player.blind) {
            // drop glyph under the chain
            if (player.bc_felt & BC_CHAIN) {
                const loc = map.at(uchain.ox, uchain.oy);
                if (loc) loc.glyph = player.cglyph;
            }
            player.bc_felt = 0; // feel nothing
            // pick up new glyph
            if (player.bc_order) {
                player.cglyph = player.bglyph;
            } else {
                const loc = map.at(player.x, player.y);
                player.cglyph = loc ? loc.glyph : -1;
            }
        }
        movobj(uchain, player.x, player.y, map); // has a newsym
        if (player.blind) {
            player.bc_order = bc_order_fn(player, map);
        }
        newsym(player.x0, player.y0); // clean up old position
        if (player.x0 !== player.x || player.y0 !== player.y) {
            await spoteffects(true, player, map, null, game);
        }
    }
}

// cf. ball.c:964 — litter(): scatter items when dragged downstairs
async function litter(player, map) {
    const capacity = weight_cap(player);
    const inventory = player.inventory;
    if (!inventory) return;
    const uball = player.uball;

    for (let i = inventory.length - 1; i >= 0; i--) {
        const otmp = inventory[i];
        if (otmp !== uball && rnd(capacity) <= (otmp.owt || 0)) {
            // canletgo check — simplified: skip cursed worn items
            if (otmp.owornmask) continue;
            const qstr = (otmp.quan || 1) === 1 ? "it" : "they";
            const fallstr = (otmp.quan || 1) === 1 ? "falls" : "fall";
            await You("drop %s and %s %s down the stairs with you.",
                xname(otmp), qstr, fallstr);
            // setnotworn + freeinv + hitfloor
            inventory.splice(i, 1);
            otmp.where = OBJ_FREE;
            otmp.ox = player.x;
            otmp.oy = player.y;
            placeFloorObject(map, otmp);
        }
    }
}

// cf. ball.c:985 — drag_down(): effects of ball dragging hero downstairs
export async function drag_down(player, map, display, game) {
    const uball = player.uball;
    if (!uball) return;

    // forward: ball falls forward if wielded, unarmed, or 1/3 chance
    const forward = carried(uball) && (player.weapon === uball || !player.weapon || !rn2(3));

    if (carried(uball) && !welded(uball, player))
        await You("lose your grip on the iron ball.");

    cls(display); // clear previous level display

    if (forward) {
        if (rn2(6)) {
            await pline_The("iron ball drags you downstairs!");
            await losehp(Maybe_Half_Phys(rnd(6), player),
                   "dragged downstairs by an iron ball", NO_KILLER_PREFIX,
                   player, display, game);
            await litter(player, map);
        }
    } else {
        let dragchance = 3;
        if (rn2(2)) {
            Soundeffect();
            await pline_The("iron ball smacks into you!");
            await losehp(Maybe_Half_Phys(rnd(20), player), "iron ball collision",
                   KILLED_BY_AN, player, display, game);
            await exercise(player, A_STR, false);
            dragchance -= 2;
        }
        if (dragchance >= rnd(6)) {
            await pline_The("iron ball drags you downstairs!");
            await losehp(Maybe_Half_Phys(rnd(3), player),
                   "dragged downstairs by an iron ball", NO_KILLER_PREFIX,
                   player, display, game);
            await exercise(player, A_STR, false);
            await litter(player, map);
        }
    }
}

// cf. ball.c:1033 — bc_sanity_check(): validate ball/chain state
export function bc_sanity_check(player, map) {
    const uball = player.uball;
    const uchain = player.uchain;

    if (player.punished && (!uball || !uchain)) {
        impossible("Punished without %s%s%s?",
                   !uball ? "iron ball" : "",
                   (!uball && !uchain) ? " and " : "",
                   !uchain ? "attached chain" : "");
    } else if (!player.punished && (uball || uchain)) {
        impossible("Attached %s%s%s without being Punished?",
                   uchain ? "chain" : "",
                   (uchain && uball) ? " and " : "",
                   uball ? "iron ball" : "");
    }

    const freechain = (!uchain || uchain.where === OBJ_FREE);
    let freeball = (!uball || uball.where === OBJ_FREE
                    || (freechain && carried(uball)));

    if (uball && (uball.otyp !== HEAVY_IRON_BALL
                  || (uball.where !== 'OBJ_FLOOR'
                      && !carried(uball)
                      && uball.where !== 'OBJ_FREE')
                  || (freeball !== freechain) // XOR mismatch
                  || !(uball.owornmask & W_BALL)
                  || (uball.owornmask & ~(W_BALL | W_WEAPONS)) !== 0)) {
        const otyp = uball.otyp;
        impossible("uball: type %d, where %s, wornmask=0x%08x",
                   otyp, uball.where, uball.owornmask);
    }

    if (uchain && (uchain.otyp !== IRON_CHAIN
                   || (uchain.where !== 'OBJ_FLOOR'
                       && uchain.where !== 'OBJ_FREE')
                   || (freechain !== freeball)
                   || !(uchain.owornmask & W_CHAIN)
                   || (uchain.owornmask & ~W_CHAIN) !== 0)) {
        const otyp = uchain.otyp;
        impossible("uchain: type %d, where %s, wornmask=0x%08x",
                   otyp, uchain.where, uchain.owornmask);
    }

    if (uball && uchain && !(freeball && freechain)) {
        // non-free chain should be under or next to the hero;
        // non-free ball should be on or next to the chain or else carried
        const cx = uchain.ox, cy = uchain.oy;
        const cdx = Math.abs(cx - player.x), cdy = Math.abs(cy - player.y);
        let bx, by;
        if (carried(uball)) {
            bx = player.x; by = player.y;
        } else {
            bx = uball.ox; by = uball.oy;
        }
        const bdx = Math.abs(bx - cx), bdy = Math.abs(by - cy);
        if (cdx > 1 || cdy > 1 || bdx > 1 || bdy > 1)
            impossible(
                "b&c distance: you@<%d,%d>, chain@<%d,%d>, ball@<%d,%d>",
                player.x, player.y, cx, cy, bx, by);
    }
}
