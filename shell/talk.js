// talk.js -- BSD talk(1) simulation: split-screen real-time chat.
// Layout: rows 0-9 remote (CLR_CYAN), row 10 divider (CLR_YELLOW),
//         rows 11-21 local (CLR_GREEN), row 22 empty, row 23 input (CLR_WHITE).

import { CLR_CYAN, CLR_GREEN, CLR_YELLOW, CLR_WHITE } from '../js/render.js';

// QWERTY adjacent keys for typo simulation
const ADJACENT = {
    'a':'sqwze','b':'vghn','c':'xdfv','d':'erfcs','e':'rdsw',
    'f':'tgdcr','g':'yhfvt','h':'ujgbn','i':'uojk','j':'ikhmn',
    'k':'olmji','l':'pkoi','m':'njk','n':'bmhj','o':'iplk',
    'p':'ol','q':'wa','r':'etdf','s':'awedxz','t':'ryfg',
    'u':'yhji','v':'cfgb','w':'qase','x':'zsdc','y':'tugh',
    'z':'asx',' ':' cvbn',
};

// -------------------------------------------------------------------------
// EventMux: merges user keypresses and timer-scheduled remote events
// -------------------------------------------------------------------------
class EventMux {
    constructor(getch) {
        this._getch = getch;
        this._queue = [];
        this._resolvers = [];
        this._stopped = false;
        this._pumping = false;
        this._pump();
    }

    // Continuously pull keypresses from getch (serially, never two pending)
    async _pump() {
        this._pumping = true;
        while (!this._stopped) {
            let ch;
            try {
                ch = await this._getch();
            } catch (e) {
                break;
            }
            this._deliver({ type: 'key', ch });
        }
        this._pumping = false;
    }

    _deliver(event) {
        if (this._resolvers.length > 0) {
            const resolve = this._resolvers.shift();
            resolve(event);
        } else {
            this._queue.push(event);
        }
    }

    // Schedule a remote event to be delivered after ms milliseconds
    schedule(event, ms) {
        if (this._stopped) return;
        setTimeout(() => {
            if (!this._stopped) this._deliver(event);
        }, ms);
    }

    // Returns the next event (user key or remote)
    next() {
        if (this._queue.length > 0) {
            return Promise.resolve(this._queue.shift());
        }
        return new Promise(resolve => {
            this._resolvers.push(resolve);
        });
    }

    stop() {
        this._stopped = true;
        // Drain any waiting resolvers with a sentinel
        for (const r of this._resolvers) {
            r({ type: 'stop' });
        }
        this._resolvers = [];
    }
}

// -------------------------------------------------------------------------
// RemoteEngine: state machine that generates realistic typing events
// -------------------------------------------------------------------------
class RemoteEngine {
    constructor(mux, character) {
        this._mux = mux;
        this._wpm = character.wpm || 60;
        this._typoRate = character.typoRate || 0.04;
        this._thinkMs = character.thinkMs || [800, 2000];
        this._triggerWords = character.triggerWords || 5;
        this._patterns = character.patterns || [];
        this._fallbacks = character.fallbacks || ['hmm'];
        this._spontaneous = character.spontaneous || [];
        this._greeting = character.greeting || null;

        this._state = 'idle';
        this._pendingResponse = null;
        this._scheduledAt = 0;
        this._userWordsSinceLastResponse = 0;
        this._lastPartialCheck = '';

        // Schedule occasional spontaneous messages
        this._scheduleSpontaneous();
    }

    _scheduleSpontaneous() {
        if (this._spontaneous.length === 0) return;
        const delay = 15000 + Math.random() * 30000;
        setTimeout(() => {
            if (this._state === 'idle') {
                const msg = this._spontaneous[Math.floor(Math.random() * this._spontaneous.length)];
                this._startTyping(msg);
            }
            this._scheduleSpontaneous();
        }, delay);
    }

    _pickResponse(text) {
        const lower = text.toLowerCase();
        // Try patterns
        for (const p of this._patterns) {
            if (p.re && p.re.test(lower)) {
                const opts = p.responses;
                return opts[Math.floor(Math.random() * opts.length)];
            }
        }
        // Fallback
        return this._fallbacks[Math.floor(Math.random() * this._fallbacks.length)];
    }

    // Called when user sends a complete message
    onUserMessage(text) {
        this._userWordsSinceLastResponse = 0;
        this._lastPartialCheck = '';

        if (this._state !== 'idle') return; // already composing
        const response = (text === '' && this._greeting)
            ? this._greeting
            : this._pickResponse(text);
        this._state = 'thinking';
        const thinkDelay = this._thinkMs[0] + Math.random() * (this._thinkMs[1] - this._thinkMs[0]);
        setTimeout(() => {
            if (this._state === 'thinking') {
                this._startTyping(response);
            }
        }, thinkDelay);
    }

    // Called on each partial keystroke — triggers early if enough trigger words typed
    checkPartialInput(partial) {
        if (this._state !== 'idle') return;
        if (partial === this._lastPartialCheck) return;
        this._lastPartialCheck = partial;
        const words = partial.trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length >= this._triggerWords) {
            const response = this._pickResponse(partial);
            this._state = 'thinking';
            const thinkDelay = this._thinkMs[0] * 0.5 + Math.random() * this._thinkMs[0];
            setTimeout(() => {
                if (this._state === 'thinking') {
                    this._startTyping(response);
                }
            }, thinkDelay);
        }
    }

    // Build the typing event sequence for a response string
    _buildTypingSequence(text) {
        const charMs = 60000 / (this._wpm * 5); // ms per character at given wpm
        const events = [];
        let offset = 0;

        // Split text on \n into lines, typing each line then a newline
        const lines = text.split('\n');
        for (let li = 0; li < lines.length; li++) {
            const line = lines[li];
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                const delay = charMs * (0.5 + Math.random());
                offset += delay;

                // Maybe inject a typo before this character
                if (Math.random() < this._typoRate && ADJACENT[ch]) {
                    const adj = ADJACENT[ch];
                    const wrong = adj[Math.floor(Math.random() * adj.length)];
                    // Type the wrong char
                    events.push({ type: 'remote_char', ch: wrong, offset });
                    offset += 150 + Math.random() * 350;
                    // Backspace it
                    events.push({ type: 'remote_backspace', offset });
                    offset += 50 + Math.random() * 100;
                }

                events.push({ type: 'remote_char', ch, offset });
            }
            // Newline between lines (but not after last line)
            if (li < lines.length - 1) {
                offset += charMs * 2;
                events.push({ type: 'remote_newline', offset });
            }
        }

        // Done signal
        offset += charMs * 3;
        events.push({ type: 'remote_done', offset });
        return events;
    }

    _startTyping(text) {
        this._state = 'composing';
        const seq = this._buildTypingSequence(text);
        for (const ev of seq) {
            this._mux.schedule(ev, ev.offset);
        }
    }

    // Called when remote_done fires — resets state to idle
    onDone() {
        this._state = 'idle';
    }

    get state() { return this._state; }
}

// -------------------------------------------------------------------------
// TalkSession: manages the full talk UI
// -------------------------------------------------------------------------
export class TalkSession {
    constructor(display, getch, username, character) {
        this._d = display;
        this._getch = getch;
        this._username = username;
        this._character = character;

        // Remote half state
        this._remoteLines = [];      // completed lines
        this._remoteCurrent = '';   // currently being typed

        // Local half state
        this._localLines = [];       // completed lines
        this._localCurrent = '';    // being typed right now
    }

    async run() {
        const d = this._d;

        // Show waiting message
        d.clearScreen();
        const waitMsg = `[Waiting for ${this._username}@pdp11 to respond]`;
        d.putstr(0, 12, waitMsg, CLR_YELLOW);
        if (typeof d.flush === 'function') d.flush();

        const waitMs = 1500 + Math.random() * 2000;
        await new Promise(r => setTimeout(r, waitMs));

        // Draw the split screen layout
        this._drawLayout();

        // Create mux and engine
        const mux = new EventMux(this._getch);
        const engine = new RemoteEngine(mux, this._character);

        // Trigger greeting
        engine.onUserMessage('');

        // Main event loop
        let running = true;
        while (running) {
            const ev = await mux.next();
            if (ev.type === 'stop') break;

            if (ev.type === 'key') {
                const cont = this._handleKey(ev.ch, engine);
                if (!cont) {
                    running = false;
                    break;
                }
                // Check for early trigger on partial input
                engine.checkPartialInput(this._localCurrent);
                this._renderLocalHalf();
            } else if (ev.type === 'remote_char') {
                this._remoteCurrent += ev.ch;
                this._renderRemoteHalf(engine);
            } else if (ev.type === 'remote_backspace') {
                if (this._remoteCurrent.length > 0) {
                    this._remoteCurrent = this._remoteCurrent.slice(0, -1);
                }
                this._renderRemoteHalf(engine);
            } else if (ev.type === 'remote_newline') {
                this._remoteLines.push(this._remoteCurrent);
                this._remoteCurrent = '';
                this._renderRemoteHalf(engine);
            } else if (ev.type === 'remote_done') {
                engine.onDone();
                this._renderRemoteHalf(engine);
            }

            if (typeof d.flush === 'function') d.flush();
        }

        mux.stop();

        // Show connection closed
        d.clearRow(22);
        d.putstr(0, 22, '[Connection closed]', CLR_YELLOW);
        if (typeof d.flush === 'function') d.flush();
        await new Promise(r => setTimeout(r, 1200));
    }

    _handleKey(ch, engine) {
        // Ctrl-C
        if (ch === 3) return false;

        // Enter — send line
        if (ch === 13 || ch === 10) {
            const line = this._localCurrent;
            this._localLines.push(line);
            this._localCurrent = '';
            engine.onUserMessage(line);
            this._renderLocalHalf();
            return true;
        }

        // Backspace
        if (ch === 8 || ch === 127) {
            if (this._localCurrent.length > 0) {
                this._localCurrent = this._localCurrent.slice(0, -1);
            }
            return true;
        }

        // Printable chars (keep lines under 78 chars to avoid wrapping issues)
        if (ch >= 32 && ch < 127 && this._localCurrent.length < 78) {
            this._localCurrent += String.fromCharCode(ch);
        }

        return true;
    }

    _drawLayout() {
        const d = this._d;
        d.clearScreen();

        // Draw divider on row 10
        const divider = `\u2500\u2500[talk: ${this._username}@pdp11]` +
            '\u2500'.repeat(Math.max(0, 80 - 10 - this._username.length - 8));
        d.putstr(0, 10, divider.slice(0, 80), CLR_YELLOW);

        // Initial cursors
        this._renderRemoteHalf(null);
        this._renderLocalHalf();

        if (typeof d.flush === 'function') d.flush();
    }

    // Render the top 10 rows (remote half, rows 0-9)
    _renderRemoteHalf(engine) {
        const d = this._d;
        const isComposing = engine && engine.state === 'composing';

        // Build display lines: completed lines + current
        const cursor = isComposing ? '\u2588' : '';
        const allLines = [...this._remoteLines, this._remoteCurrent + cursor];

        // Show last 10 lines in rows 0-9
        const startIdx = Math.max(0, allLines.length - 10);
        for (let row = 0; row < 10; row++) {
            d.clearRow(row);
            const lineIdx = startIdx + row;
            if (lineIdx < allLines.length) {
                const text = allLines[lineIdx].slice(0, 80);
                d.putstr(0, row, text, CLR_CYAN);
            }
        }
    }

    // Render the local half: rows 11-21 for completed lines, row 23 for current input
    _renderLocalHalf() {
        const d = this._d;

        // Rows 11-21: last 11 completed lines
        const startIdx = Math.max(0, this._localLines.length - 11);
        for (let row = 11; row <= 21; row++) {
            d.clearRow(row);
            const lineIdx = startIdx + (row - 11);
            if (lineIdx < this._localLines.length) {
                const text = this._localLines[lineIdx].slice(0, 80);
                d.putstr(0, row, text, CLR_GREEN);
            }
        }

        // Row 23: current input with cursor
        d.clearRow(23);
        d.putstr(0, 23, this._localCurrent.slice(0, 79), CLR_WHITE);
        if (typeof d.setCursor === 'function') {
            d.setCursor(Math.min(this._localCurrent.length, 79), 23);
        }
    }
}
