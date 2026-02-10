/**
 * animations.js - Temporary animation display system
 * JavaScript port of C NetHack's tmp_at() animation system
 */

// Display mode constants (from C NetHack display.h)
export const DISP_BEAM = -1;     // Keep all glyphs showing & clean up at end
export const DISP_ALL = -2;      // Like beam, but still displayed if not visible
export const DISP_TETHER = -3;   // Like beam, but tether glyph differs from final
export const DISP_FLASH = -4;    // Clean up each glyph before displaying new one
export const DISP_ALWAYS = -5;   // Like flash, but still displayed if not visible
export const DISP_CHANGE = -6;   // Change glyph
export const DISP_END = -7;      // Clean up
export const DISP_FREEMEM = -8;  // Free all memory during exit only

export const BACKTRACK = -1;     // For DISP_END to display each prior location

// Maximum number of positions to save for beam animations
const TMP_AT_MAX_GLYPHS = 32;

/**
 * Animation state for a single tmp_at session
 */
class TmpGlyph {
    constructor(style, glyph) {
        this.style = style;           // Display mode (DISP_BEAM, DISP_FLASH, etc.)
        this.glyph = glyph;           // The glyph to display
        this.saved = [];              // Saved positions [{x, y}, ...]
        this.prev = null;             // Previous animation (for nesting)
    }
}

/**
 * Temporary animation display system
 * Equivalent to C NetHack's tmp_at() function
 */
class AnimationSystem {
    constructor(display) {
        this.display = display;       // Display instance for rendering
        this.currentAnim = null;      // Current animation state
    }

    /**
     * Main tmp_at() function - matches C NetHack API
     * @param {number|coordxy} x - Mode constant or x coordinate
     * @param {number|coordxy} y - Glyph or y coordinate
     */
    tmp_at(x, y) {
        // Handle mode initialization
        if (x === DISP_BEAM || x === DISP_ALL || x === DISP_TETHER ||
            x === DISP_FLASH || x === DISP_ALWAYS) {
            return this._initAnimation(x, y);
        }

        // Handle cleanup
        if (x === DISP_END) {
            return this._endAnimation(y);
        }

        // Handle mode change
        if (x === DISP_CHANGE) {
            if (this.currentAnim) {
                this.currentAnim.glyph = y;
            }
            return;
        }

        // Handle memory cleanup
        if (x === DISP_FREEMEM) {
            this._freeAll();
            return;
        }

        // Handle position display - default case: tmp_at(x, y)
        this._displayAt(x, y);
    }

    /**
     * Initialize a new animation
     * @private
     */
    _initAnimation(mode, glyph) {
        const anim = new TmpGlyph(mode, glyph);
        anim.prev = this.currentAnim;
        this.currentAnim = anim;

        // Flush any buffered display updates
        if (this.display && this.display.flush) {
            this.display.flush();
        }
    }

    /**
     * Display glyph at a position
     * @private
     */
    _displayAt(x, y) {
        if (!this.currentAnim) {
            console.error('tmp_at: currentAnim not initialized');
            return;
        }

        const anim = this.currentAnim;

        if (anim.style === DISP_BEAM || anim.style === DISP_ALL) {
            // Beam mode: save position and display
            if (anim.style === DISP_ALL || this._canSee(x, y)) {
                if (anim.saved.length < TMP_AT_MAX_GLYPHS) {
                    anim.saved.push({x, y});
                    this._showGlyph(x, y, anim.glyph);
                }
            }
        } else if (anim.style === DISP_TETHER) {
            // Tether mode: show connecting line
            if (anim.saved.length < TMP_AT_MAX_GLYPHS) {
                // If we have a previous position, update it with tether glyph
                if (anim.saved.length > 0) {
                    const prev = anim.saved[anim.saved.length - 1];
                    this._showGlyph(prev.x, prev.y, this._getTetherGlyph(prev.x, prev.y));
                }
                anim.saved.push({x, y});
            }
        } else { // DISP_FLASH or DISP_ALWAYS
            // Flash mode: erase previous, show current
            if (anim.saved.length > 0) {
                const prev = anim.saved[0];
                this._redraw(prev.x, prev.y);
            }
            anim.saved = [{x, y}];
            this._showGlyph(x, y, anim.glyph);
        }
    }

    /**
     * End animation and cleanup
     * @private
     */
    _endAnimation(flags) {
        if (!this.currentAnim) {
            return;
        }

        const anim = this.currentAnim;

        if (anim.style === DISP_BEAM || anim.style === DISP_ALL) {
            // Erase all saved positions
            for (const pos of anim.saved) {
                this._redraw(pos.x, pos.y);
            }
        } else if (anim.style === DISP_TETHER) {
            if (flags === BACKTRACK && anim.saved.length > 1) {
                // Backtrack mode: animate return path
                for (let i = anim.saved.length - 1; i > 0; i--) {
                    this._redraw(anim.saved[i].x, anim.saved[i].y);
                    this._showGlyph(anim.saved[i - 1].x, anim.saved[i - 1].y, anim.glyph);
                    if (this.display && this.display.flush) {
                        this.display.flush();
                    }
                    // Note: delay_output() would be called here in actual use
                }
            }
            // Erase all positions
            for (const pos of anim.saved) {
                this._redraw(pos.x, pos.y);
            }
        } else { // DISP_FLASH or DISP_ALWAYS
            // Erase last position
            if (anim.saved.length > 0) {
                this._redraw(anim.saved[0].x, anim.saved[0].y);
            }
        }

        // Pop animation stack
        this.currentAnim = anim.prev;
    }

    /**
     * Free all animations (for cleanup during exit)
     * @private
     */
    _freeAll() {
        while (this.currentAnim) {
            const prev = this.currentAnim.prev;
            this.currentAnim = prev;
        }
    }

    /**
     * Check if position is visible to player
     * @private
     */
    _canSee(x, y) {
        // TODO: Implement actual visibility check
        // For now, assume all positions are visible
        return true;
    }

    /**
     * Show a glyph at a position
     * @private
     */
    _showGlyph(x, y, glyph) {
        if (this.display && this.display.showTempGlyph) {
            this.display.showTempGlyph(x, y, glyph);
        }
    }

    /**
     * Redraw a position (erase temp glyph)
     * @private
     */
    _redraw(x, y) {
        if (this.display && this.display.redraw) {
            this.display.redraw(x, y);
        }
    }

    /**
     * Get tether glyph for connecting line
     * @private
     */
    _getTetherGlyph(x, y) {
        // TODO: Implement actual tether glyph calculation
        // Would show rope/chain connecting weapon to hero
        return this.currentAnim.glyph;
    }
}

// Export singleton instance (will be initialized with display)
let animationSystem = null;

/**
 * Initialize animation system with display instance
 */
export function initAnimations(display) {
    animationSystem = new AnimationSystem(display);
}

/**
 * Global tmp_at function (matches C API)
 */
export function tmp_at(x, y) {
    if (!animationSystem) {
        console.warn('Animation system not initialized');
        return;
    }
    animationSystem.tmp_at(x, y);
}

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
    initAnimations,
    tmp_at
};
