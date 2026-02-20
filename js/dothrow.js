// dothrow.js -- Throwing and firing mechanics, projectile physics
// cf. dothrow.c — multishot_class_bonus, throw_obj, ok_to_throw, throw_ok,
//                 dothrow, autoquiver, find_launcher, dofire, endmultishot,
//                 hitfloor, walk_path, hurtle_jump, hurtle_step, will_hurtle,
//                 mhurtle_step, hurtle, mhurtle, check_shop_obj,
//                 harmless_missile, toss_up, throwing_weapon,
//                 sho_obj_return_to_u, throwit_return, swallowit,
//                 throwit_mon_hit, throwit, return_throw_to_inv, omon_adj,
//                 tmiss, should_mulch_missile, thitmonst, gem_accept,
//                 hero_breaks, breaks, release_camera_demon, breakobj,
//                 breaktest, breakmsg, throw_gold
//
// dothrow.c handles all throwing and firing mechanics:
//   dothrow(): #throw command — select object, choose direction, execute throw.
//   dofire(): #fire command — throw from quiver slot.
//   throwit(): core throw execution including hit resolution and landing.
//   thitmonst(): thrown object hitting a monster with full combat mechanics.
//   hurtle(): move hero through air after kick or impact.
//   breakobj()/breaktest(): object breakage mechanics.
//
// JS implementations:
//   (none yet — throw/fire mechanics not yet ported)

// cf. dothrow.c:38 — multishot_class_bonus(pm, ammo, launcher): multishot volley bonus
// Determines multishot volley bonus based on character class, ammo, and launcher.
// TODO: dothrow.c:38 — multishot_class_bonus(): multishot bonus calculation

// cf. dothrow.c:86 [static] — throw_obj(obj, shotlimit): core throwing logic
// Core throwing logic: direction, multishot, item disposal.
// TODO: dothrow.c:86 — throw_obj(): core throw logic

// cf. dothrow.c:296 [static] — ok_to_throw(shotlimit_p): throw precondition check
// Checks preconditions for throwing and initializes shot limit.
// TODO: dothrow.c:296 — ok_to_throw(): throw precondition check

// cf. dothrow.c:316 [static] — throw_ok(obj): getobj callback for throwable objects
// Getobj callback to determine if an object is suitable to throw.
// TODO: dothrow.c:316 — throw_ok(): throwable object filter

// cf. dothrow.c:351 — dothrow(void): #throw command handler
// The #throw extended command handler.
// TODO: dothrow.c:351 — dothrow(): throw command handler

// cf. dothrow.c:380 [static] — autoquiver(void): automatic quiver selection
// Automatically selects an appropriate item for the quiver slot.
// TODO: dothrow.c:380 — autoquiver(): quiver auto-selection

// cf. dothrow.c:446 [static] — find_launcher(ammo): find matching launcher
// Finds a launcher in inventory matching the given ammunition.
// TODO: dothrow.c:446 — find_launcher(): ammo launcher lookup

// cf. dothrow.c:468 — dofire(void): #fire command handler
// The #fire extended command handler (throw from quiver).
// TODO: dothrow.c:468 — dofire(): fire from quiver command

// cf. dothrow.c:589 — endmultishot(verbose): stop multishot sequence
// Stops a multishot sequence early with optional message.
// TODO: dothrow.c:589 — endmultishot(): multishot sequence end

// cf. dothrow.c:605 — hitfloor(obj, verbosely): object hits floor at hero's feet
// Handles an object hitting the floor at the hero's position.
// TODO: dothrow.c:605 — hitfloor(): floor landing

// cf. dothrow.c:655 — walk_path(src_cc, dest_cc, check_proc, arg): Bresenham path walker
// Walks a Bresenham path calling a callback for each location along the way.
// TODO: dothrow.c:655 — walk_path(): Bresenham path traversal

// cf. dothrow.c:741 — hurtle_jump(arg, x, y): hurtle step (no water jump)
// Wrapper for hurtle_step that prevents jumping into water.
// TODO: dothrow.c:741 — hurtle_jump(): hurtle water barrier

// cf. dothrow.c:772 — hurtle_step(arg, x, y): single hurtle step
// Executes a single step of the player hurtling through the air.
// TODO: dothrow.c:772 — hurtle_step(): player hurtle single step

// cf. dothrow.c:976 — will_hurtle(mon, x, y): check monster knockback location
// Checks if a monster can be knocked back to a given location.
// TODO: dothrow.c:976 — will_hurtle(): monster knockback location check

// cf. dothrow.c:991 [static] — mhurtle_step(arg, x, y): single monster hurtle step
// Executes a single step of a monster being hurtled through the air.
// TODO: dothrow.c:991 — mhurtle_step(): monster hurtle single step

// cf. dothrow.c:1077 — hurtle(dx, dy, range, verbose): move hero through air
// Moves the hero through the air after a kick or impact.
// TODO: dothrow.c:1077 — hurtle(): hero air movement

// cf. dothrow.c:1129 — mhurtle(mon, dx, dy, range): move monster through air
// Moves a monster through the air after being struck.
// TODO: dothrow.c:1129 — mhurtle(): monster air movement

// cf. dothrow.c:1180 [static] — check_shop_obj(obj, x, y, broken): shop thrown-object accounting
// Handles shop accounting for thrown objects.
// TODO: dothrow.c:1180 — check_shop_obj(): throw shop accounting

// cf. dothrow.c:1219 — harmless_missile(obj): check if thrown object hurts hero
// Determines if a thrown object causes damage if it falls on the hero.
// TODO: dothrow.c:1219 — harmless_missile(): safe missile check

// cf. dothrow.c:1255 [static] — toss_up(obj, hitsroof): object thrown upward
// Handles an object thrown upward with ceiling collision and fallback.
// TODO: dothrow.c:1255 — toss_up(): upward throw mechanics

// cf. dothrow.c:1429 — throwing_weapon(obj): check if object is a throwing weapon
// Determines if an object is designed to be thrown as a weapon.
// TODO: dothrow.c:1429 — throwing_weapon(): throwing weapon check

// cf. dothrow.c:1441 [static] — sho_obj_return_to_u(obj): display returning weapon path
// Displays the returning throw-and-return weapon path back to the hero.
// TODO: dothrow.c:1441 — sho_obj_return_to_u(): returning weapon display

// cf. dothrow.c:1459 [static] — throwit_return(clear_thrownobj): return weapon cleanup
// Cleans up after a throw-and-return weapon has been caught.
// TODO: dothrow.c:1459 — throwit_return(): return weapon catch cleanup

// cf. dothrow.c:1467 [static] — swallowit(obj): thrown object swallowed
// Handles a thrown object being swallowed by a monster.
// TODO: dothrow.c:1467 — swallowit(): object swallow on throw

// cf. dothrow.c:1481 — throwit_mon_hit(obj, mon): process thrown object hitting monster
// Processes a thrown object hitting a monster.
// TODO: dothrow.c:1481 — throwit_mon_hit(): throw monster hit

// cf. dothrow.c:1509 — throwit(obj, wep_mask, twoweap, oldslot): execute throw
// Executes a throw including collision resolution and landing.
// TODO: dothrow.c:1509 — throwit(): full throw execution

// cf. dothrow.c:1854 [static] — return_throw_to_inv(obj, wep_mask, twoweap, oldslot): add returning weapon to inv
// Returns a throw-and-return weapon back to inventory.
// TODO: dothrow.c:1854 — return_throw_to_inv(): catch returning weapon

// cf. dothrow.c:1912 — omon_adj(mon, obj, mon_notices): monster to-hit adjustment
// Calculates to-hit adjustments for a monster being thrown at.
// TODO: dothrow.c:1912 — omon_adj(): throw vs monster to-hit

// cf. dothrow.c:1950 [static] — tmiss(obj, mon, maybe_wakeup): thrown object miss message
// Displays message for a thrown object missing its target.
// TODO: dothrow.c:1950 — tmiss(): throw miss message

// cf. dothrow.c:1975 — should_mulch_missile(obj): check if ammo should be destroyed
// Determines if ammo or missile should be destroyed on impact.
// TODO: dothrow.c:1975 — should_mulch_missile(): ammo destruction check

// cf. dothrow.c:2010 — thitmonst(mon, obj): thrown object hits monster
// Processes a thrown object hitting a monster with full combat mechanics.
// TODO: dothrow.c:2010 — thitmonst(): full throw monster hit

// cf. dothrow.c:2308 [static] — gem_accept(mon, obj): unicorn accepts gem
// Handles a unicorn accepting a thrown gem and resulting luck changes.
// TODO: dothrow.c:2308 — gem_accept(): unicorn gem gift

// cf. dothrow.c:2416 — hero_breaks(obj, x, y, breakflags): hero-caused break
// Breaks an object as a result of hero action.
// TODO: dothrow.c:2416 — hero_breaks(): hero object breaking

// cf. dothrow.c:2443 — breaks(obj, x, y): break object
// Breaks an object for reasons other than direct hero action.
// TODO: dothrow.c:2443 — breaks(): object breaking

// cf. dothrow.c:2456 — release_camera_demon(obj, x, y): camera break demon
// Unleashes demon from a broken expensive camera.
// TODO: dothrow.c:2456 — release_camera_demon(): camera demon release

// cf. dothrow.c:2479 — breakobj(obj, x, y, hero_caused, from_invent): actually break object
// Actually breaks an object and handles all side effects.
// TODO: dothrow.c:2479 — breakobj(): object break execution

// cf. dothrow.c:2581 — breaktest(obj): test if object will break
// Tests if an object will break on impact without actually breaking it.
// TODO: dothrow.c:2581 — breaktest(): break probability test

// cf. dothrow.c:2611 [static] — breakmsg(obj, in_view): object break message
// Displays a message about an object breaking.
// TODO: dothrow.c:2611 — breakmsg(): break message display

// cf. dothrow.c:2655 [static] — throw_gold(obj): throw gold coins
// Handles throwing gold coins as a special case.
// TODO: dothrow.c:2655 — throw_gold(): gold coin throwing
