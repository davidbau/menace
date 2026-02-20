// ball.js -- Ball and chain mechanics
// cf. ball.c — ballrelease, ballfall, placebc_core, unplacebc_core,
//              check_restriction, placebc, unplacebc,
//              unplacebc_and_covet_placebc, lift_covet_and_placebc,
//              Placebc, Unplacebc, Unplacebc_and_covet_placebc,
//              Lift_covet_and_placebc, bc_order, set_bc, move_bc,
//              drag_ball, drop_ball, litter, drag_down, bc_sanity_check
//
// ball.c manages all ball-and-chain object mechanics:
//   placebc/unplacebc: place or remove ball and chain on floor.
//   move_bc: move ball/chain during hero movement (handles blind glyph tracking).
//   drag_ball: compute new ball/chain position after hero moves.
//   drop_ball: drop ball at location; may pull hero into water/pits.
//   drag_down: effects when ball drags hero downstairs (damage, item scattering).
//   set_bc: set up visibility tracking when hero goes blind.
//   bc_sanity_check: validate ball/chain state consistency.
//
// JS implementations: none — all ball/chain logic is runtime gameplay.

// cf. ball.c:23 — ballrelease(showmsg): drop carried ball
// Drops iron ball if carried and unwelded; shows message if requested.
// TODO: ball.c:23 — ballrelease(): ball dropping

// cf. ball.c:43 — ballfall(void): ball falls through trapdoor
// Handles iron ball falling through trap door; damages hero if from different location.
// TODO: ball.c:43 — ballfall(): ball trapdoor fall

// cf. ball.c:119 [static] — placebc_core(void): place ball and chain on floor
// Places ball and chain under hero, handling floor effects and visibility.
// TODO: ball.c:119 — placebc_core(): ball/chain floor placement

// cf. ball.c:146 [static] — unplacebc_core(void): remove ball and chain from floor
// Removes ball and chain from floor; restores covered glyphs when blind.
// TODO: ball.c:146 — unplacebc_core(): ball/chain floor removal

// cf. ball.c:179 [static] — check_restriction(restriction): validate bc operation
// Checks if ball/chain operations are allowed given current restriction state.
// TODO: ball.c:179 — check_restriction(): bc operation validation

// cf. ball.c:192 — placebc(void): place ball and chain
// Public wrapper: places ball and chain after checking restrictions.
// TODO: ball.c:192 — placebc(): ball/chain placement

// cf. ball.c:211 — unplacebc(void): remove ball and chain
// Public wrapper: removes ball and chain after checking restrictions.
// TODO: ball.c:211 — unplacebc(): ball/chain removal

// cf. ball.c:221 — unplacebc_and_covet_placebc(void): remove and pin
// Removes ball/chain and sets restriction pin for later replacement.
// TODO: ball.c:221 — unplacebc_and_covet_placebc(): remove and pin bc

// cf. ball.c:235 — lift_covet_and_placebc(pin): lift restriction and replace
// Lifts restriction pin and replaces ball/chain at original position.
// TODO: ball.c:235 — lift_covet_and_placebc(): restore bc from pin

// cf. ball.c:258 — Placebc(funcnm, linenum): debug placebc with breadcrumbs
// Debug version of placebc with function/line tracking (BREADCRUMBS builds).
// TODO: ball.c:258 — Placebc(): debug ball/chain placement

// cf. ball.c:287 — Unplacebc(funcnm, linenum): debug unplacebc with breadcrumbs
// Debug version of unplacebc with function/line tracking.
// TODO: ball.c:287 — Unplacebc(): debug ball/chain removal

// cf. ball.c:305 — Unplacebc_and_covet_placebc(funcnm, linenum): debug remove and pin
// Debug version with breadcrumb tracking.
// TODO: ball.c:305 — Unplacebc_and_covet_placebc(): debug remove and pin

// cf. ball.c:327 — Lift_covet_and_placebc(pin, funcnm, linenum): debug restore
// Debug version of lift_covet_and_placebc with breadcrumb tracking.
// TODO: ball.c:327 — Lift_covet_and_placebc(): debug restore bc

// cf. ball.c:353 [static] — bc_order(void): ball/chain stacking order
// Determines display stacking order of ball and chain at same location.
// TODO: ball.c:353 — bc_order(): ball/chain display order

// cf. ball.c:379 — set_bc(already_blind): set up blind bc tracking
// Establishes ball/chain visibility tracking when hero goes blind.
// TODO: ball.c:379 — set_bc(): blind ball/chain setup

// cf. ball.c:436 — move_bc(before, control, ballx, bally, chainx, chainy): move bc
// Moves ball and chain during hero movement; handles blind glyph management.
// TODO: ball.c:436 — move_bc(): ball/chain movement during hero move

// cf. ball.c:559 — drag_ball(x, y, bc_control, ballx, bally, chainx, chainy, cause_delay, allow_drag): drag
// Computes new ball/chain positions after hero moves; handles dragging.
// TODO: ball.c:559 — drag_ball(): ball/chain drag computation

// cf. ball.c:881 — drop_ball(x, y): drop ball at location
// Drops iron ball; may pull hero out of traps or into water/pits.
// TODO: ball.c:881 — drop_ball(): ball dropping effects

// cf. ball.c:964 [static] — litter(void): scatter items when dragged downstairs
// Randomly drops items from inventory when ball drags hero downstairs.
// TODO: ball.c:964 — litter(): inventory scattering

// cf. ball.c:985 — drag_down(void): effects of ball dragging hero downstairs
// Handles damage and item-scattering when ball drags hero down a level.
// TODO: ball.c:985 — drag_down(): ball drag downstairs effects

// cf. ball.c:1033 — bc_sanity_check(void): validate ball/chain state
// Checks consistency of ball/chain object state and positioning.
// TODO: ball.c:1033 — bc_sanity_check(): ball/chain state validation
