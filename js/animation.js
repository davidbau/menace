/**
 * animation.js - C-parity tmp_at()/nh_delay_output infrastructure.
 *
 * This is the canonical transient animation module.
 * C ref: display.c tmp_at(), include/display.h DISP_* constants,
 *        and nh_delay_output() timing boundaries.
 */
import {
    COLNO,
    DISP_BEAM, DISP_ALL, DISP_TETHER, DISP_FLASH, DISP_ALWAYS, DISP_CHANGE,
    DISP_END, DISP_FREEMEM, BACKTRACK,
} from './const.js';
import { game as activeGame, beginOriginAwait, endOriginAwait } from './gstate.js';

// C ref: display.c TMP_AT_MAX_GLYPHS (COLNO * 2)
const TMP_AT_MAX_GLYPHS = COLNO * 2;
const DEFAULT_DELAY_MS = 50;

class TmpGlyph {
    constructor(style, glyph) {
        this.style = style;
        this.glyph = glyph;
        this.saved = [];
        this.prev = null;
    }
}

class AnimationCore {
    constructor() {
        this.currentAnim = null;
        this.display = null;
        this.policy = {
            mode: 'interactive',
            delayMs: DEFAULT_DELAY_MS,
            skipDelays: false,
            trace: false,
            onTrace: null,
            onDelayBoundary: null,
            canSee: null,
        };
    }

    init(display, options = {}) {
        this.display = display || null;
        this.configure(options);
    }

    configure(options = {}) {
        this.policy = {
            ...this.policy,
            ...options,
        };
    }

    _trace(type, payload = {}) {
        if (!this.policy.trace) return;
        const line = { type, ...payload };
        if (typeof this.policy.onTrace === 'function') {
            this.policy.onTrace(line);
        }
    }

    // Autotranslated from display.c:1165
    tmp_at(x, y) {
        if (x === DISP_BEAM || x === DISP_ALL || x === DISP_TETHER
            || x === DISP_FLASH || x === DISP_ALWAYS) {
            return this._initAnimation(x, y);
        }

        if (x === DISP_END) {
            return this._endAnimation(y);
        }

        if (x === DISP_CHANGE) {
            if (this.currentAnim) this.currentAnim.glyph = y;
            return;
        }

        if (x === DISP_FREEMEM) {
            this._freeAll();
            return;
        }

        this._displayAt(x, y);
    }

    _initAnimation(mode, glyph) {
        const anim = new TmpGlyph(mode, glyph);
        anim.prev = this.currentAnim;
        this.currentAnim = anim;
        this._trace('tmp_at_start', { mode, glyph });
        this._flush();
    }

    _displayAt(x, y) {
        const anim = this.currentAnim;
        if (!anim) return;

        let shouldShow = false;
        if (anim.style === DISP_BEAM || anim.style === DISP_ALL) {
            if (anim.style === DISP_ALL || this._canSee(x, y)) {
                if (anim.saved.length < TMP_AT_MAX_GLYPHS) {
                    anim.saved.push({ x, y });
                    shouldShow = true;
                }
            }
        } else if (anim.style === DISP_TETHER) {
            if (anim.saved.length < TMP_AT_MAX_GLYPHS) {
                if (anim.saved.length > 0) {
                    const prev = anim.saved[anim.saved.length - 1];
                    this._showGlyph(prev.x, prev.y, this._getTetherGlyph(prev.x, prev.y, x, y));
                }
                anim.saved.push({ x, y });
                shouldShow = true;
            }
        } else {
            // C ref: display.c tmp_at() does newsym(previous) before cansee check
            // for DISP_FLASH/DISP_ALWAYS.
            if (anim.saved.length > 0) {
                const prev = anim.saved[0];
                this._redraw(prev.x, prev.y);
                anim.saved = [];
            }
            if (anim.style === DISP_ALWAYS || this._canSee(x, y)) {
                anim.saved = [{ x, y }];
                shouldShow = true;
            }
        }

        if (!shouldShow) return;
        this._showGlyph(x, y, anim.glyph);
        this._flush();
        this._trace('tmp_at_step', { x, y, glyph: anim.glyph, mode: anim.style });
    }

    async nh_delay_output(ms = this.policy.delayMs) {
        this._trace('delay_output', { ms });
        if (typeof this.policy.onDelayBoundary === 'function') {
            this.policy.onDelayBoundary({ ms });
        }
        this._flush();

        if (this.policy.skipDelays || this.policy.mode === 'headless') {
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Synchronous no-op delay boundary for legacy sync call paths.
    nh_delay_output_nowait(ms = this.policy.delayMs) {
        this._trace('delay_output', { ms, nowait: true });
        if (typeof this.policy.onDelayBoundary === 'function') {
            this.policy.onDelayBoundary({ ms, nowait: true });
        }
        this._flush();
    }

    _endAnimation(flags) {
        const anim = this.currentAnim;
        if (!anim) return;

        if (anim.style === DISP_BEAM || anim.style === DISP_ALL) {
            for (const pos of anim.saved) {
                this._redraw(pos.x, pos.y);
            }
        } else if (anim.style === DISP_TETHER) {
            if (flags === BACKTRACK && anim.saved.length > 1) {
                for (let i = anim.saved.length - 1; i > 0; i--) {
                    this._redraw(anim.saved[i].x, anim.saved[i].y);
                    this._showGlyph(anim.saved[i - 1].x, anim.saved[i - 1].y, anim.glyph);
                    this._flush();
                    // C ref: display.c tmp_at(DISP_END, BACKTRACK) calls
                    // nh_delay_output() on each backtrack frame.
                    this.nh_delay_output_nowait();
                }
                // C ref: after backtrack, leave only origin for final erase pass.
                anim.saved = [anim.saved[0]];
            }
            for (const pos of anim.saved) {
                this._redraw(pos.x, pos.y);
            }
        } else {
            if (anim.saved.length > 0) {
                this._redraw(anim.saved[0].x, anim.saved[0].y);
            }
        }

        this._trace('tmp_at_end', { flags, mode: anim.style });
        this.currentAnim = anim.prev;
    }

    async tmp_at_end_async(flags) {
        const anim = this.currentAnim;
        if (!anim) return;
        if (!(flags === BACKTRACK && anim.style === DISP_TETHER && anim.saved.length > 1)) {
            this._endAnimation(flags);
            return;
        }

        for (let i = anim.saved.length - 1; i > 0; i--) {
            this._redraw(anim.saved[i].x, anim.saved[i].y);
            this._showGlyph(anim.saved[i - 1].x, anim.saved[i - 1].y, anim.glyph);
            this._flush();
            await this.nh_delay_output();
        }
        anim.saved = [anim.saved[0]];
        for (const pos of anim.saved) {
            this._redraw(pos.x, pos.y);
        }
        this._trace('tmp_at_end', { flags, mode: anim.style });
        this.currentAnim = anim.prev;
    }

    _freeAll() {
        while (this.currentAnim) {
            this.currentAnim = this.currentAnim.prev;
        }
    }

    _canSee(_x, _y) {
        if (typeof this.policy.canSee === 'function') {
            try {
                return !!this.policy.canSee(_x, _y);
            } catch (_) {
                return true;
            }
        }
        return true;
    }

    _showGlyph(x, y, glyph) {
        if (this.display && typeof this.display.showTempGlyph === 'function') {
            this.display.showTempGlyph(x, y, glyph);
        }
    }

    _redraw(x, y) {
        if (this.display && typeof this.display.redraw === 'function') {
            this.display.redraw(x, y);
        }
    }

    _getTetherGlyph(_x0, _y0, _x1, _y1) {
        const anim = this.currentAnim;
        if (!anim) return null;
        if (!Number.isFinite(_x0) || !Number.isFinite(_y0)
            || !Number.isFinite(_x1) || !Number.isFinite(_y1)) {
            return anim.glyph;
        }
        const dx = Math.sign(_x1 - _x0);
        const dy = Math.sign(_y1 - _y0);
        if (dx !== 0 && dy === 0) return { ch: '-', color: 7 };
        if (dx === 0 && dy !== 0) return { ch: '|', color: 7 };
        if (dx === dy) return { ch: '\\', color: 7 };
        return { ch: '/', color: 7 };
    }

    _flush() {
        if (this.display && typeof this.display.flush === 'function') {
            this.display.flush();
        }
    }
}

const animationCore = new AnimationCore();

export function initAnimation(display, options = {}) {
    animationCore.init(display, options);
}

export function configureAnimation(options = {}) {
    animationCore.configure(options);
}

export function tmp_at(x, y) {
    animationCore.tmp_at(x, y);
}

export async function tmp_at_end_async(flags = 0) {
    await animationCore.tmp_at_end_async(flags);
}

export async function nh_delay_output(ms = undefined) {
    const snap = beginOriginAwait(activeGame, 'delay', { site: 'animation.nh_delay_output' });
    try {
        await animationCore.nh_delay_output(ms);
    } finally {
        endOriginAwait(activeGame, snap, { site: 'animation.nh_delay_output' });
    }
}

export function nh_delay_output_nowait(ms = undefined) {
    animationCore.nh_delay_output_nowait(ms);
}

export function skipAnimationDelays(skip) {
    animationCore.configure({ skipDelays: !!skip });
}

export function setAnimationMode(mode) {
    animationCore.configure({ mode });
}

export function getAnimationPolicy() {
    return { ...animationCore.policy };
}

// Back-compat name used by old tests/examples.
export const initAnimations = initAnimation;

export default {
    DISP_BEAM,
    DISP_ALL,
    DISP_TETHER,
    DISP_FLASH,
    DISP_ALWAYS,
    DISP_CHANGE,
    DISP_END,
    DISP_FREEMEM,
    BACKTRACK,
    initAnimation,
    initAnimations,
    configureAnimation,
    tmp_at,
    tmp_at_end_async,
    nh_delay_output,
    nh_delay_output_nowait,
    skipAnimationDelays,
    setAnimationMode,
    getAnimationPolicy,
};
