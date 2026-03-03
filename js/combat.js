// combat.js -- Compatibility shim for tests and legacy imports.
//
// Earlier versions of this codebase referenced combat primitives from
// `js/combat.js`. The implementation has since been split into
// `uhitm.js`/`mhitu.js`; this shim re-exports the active functions.

import { do_attack } from './uhitm.js';
import { mattacku } from './mhitu.js';
import { newexplevel } from './exper.js';

export { do_attack, mattacku };

// C helper: new level on sufficient XP.
export async function checkLevelUp(player, display) {
    await newexplevel(player, display);
}
