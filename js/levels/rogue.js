/**
 * rogue - Rogue level generator
 *
 * C ref: mkmaze.c makeroguerooms() path selected by roguelike branch flags.
 * The special-level harness expects this as a callable generator.
 */

import * as des from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'rogue' });
    return des.finalize_level();
}
