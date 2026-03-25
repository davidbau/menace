// talk.js -- BSD talk(1) simulation: split-screen real-time chat.
// Layout: rows 0-10 remote (CLR_CYAN), row 11 divider (CLR_YELLOW),
//         rows 12-22 local (CLR_GREEN), row 23 status.

import { CLR_CYAN, CLR_GREEN, CLR_YELLOW, CLR_WHITE } from '../js/render.js';
import { getHostname } from './filesystem.js';

// QWERTY adjacent keys for typo simulation
const ADJACENT = {
    'a':'sqwze','b':'vghn','c':'xdfv','d':'erfcs','e':'rdsw',
    'f':'tgdcr','g':'yhfvt','h':'ujgbn','i':'uojk','j':'ikhmn',
    'k':'olmji','l':'pkoi','m':'njk','n':'bmhj','o':'iplk',
    'p':'ol','q':'wa','r':'etdf','s':'awedxz','t':'ryfg',
    'u':'yhji','v':'cfgb','w':'qase','x':'zsdc','y':'tugh',
    'z':'asx',' ':' cvbn',
};

// Stop words excluded from user-word tracking
const STOP_WORDS = new Set([
    'i','a','the','is','it','to','do','you','me','my','in','on','at','of',
    'and','or','but','not','no','yes','can','will','how','what','why','when',
    'where','that','this','so','just','up','get','go','hey','hi','ok','any',
    'are','be','has','have','was','were','for','with','from','as','if','then',
    'than','by','an','its','all','one','out','about','did','does','been',
    'they','them','their','we','us','our','he','she','his','her','im','ive',
]);

// -------------------------------------------------------------------------
// EventMux: merges user keypresses and timer-scheduled remote events
// -------------------------------------------------------------------------
class EventMux {
    constructor(getch) {
        this._getch = getch;
        this._queue = [];
        this._resolvers = [];
        this._stopped = false;
        this._pump();
    }

    async _pump() {
        while (!this._stopped) {
            let ch;
            try { ch = await this._getch(); } catch (e) { break; }
            this._deliver({ type: 'key', ch });
        }
    }

    _deliver(event) {
        if (this._resolvers.length > 0) {
            this._resolvers.shift()(event);
        } else {
            this._queue.push(event);
        }
    }

    schedule(event, ms) {
        if (this._stopped) return;
        setTimeout(() => { if (!this._stopped) this._deliver(event); }, ms);
    }

    next() {
        if (this._queue.length > 0) return Promise.resolve(this._queue.shift());
        return new Promise(resolve => this._resolvers.push(resolve));
    }

    stop() {
        this._stopped = true;
        for (const r of this._resolvers) r({ type: 'stop' });
        this._resolvers = [];
    }
}

// -------------------------------------------------------------------------
// RemoteEngine: state machine that generates realistic typing events
//
// Four improvements over naive first-match/random:
//
// 1. Pattern depletion: each pattern's responses are shuffled into a deck;
//    all options are seen before any repeats.
//
// 2. Topic stack: last 3 matched topics tracked; when no pattern matches,
//    followUps from recent topics are used instead of generic fallbacks.
//
// 3. User word tracking: words the user has mentioned are tracked; when
//    multiple patterns match, the one on a fresher (less recently covered)
//    topic is preferred.
//
// 4. Conversation beats: a pattern can include a `beat` object with a
//    follow-up question and replies. After typing the response, the bot
//    appends the question and enters `awaiting_reply` state. The next user
//    message is matched against the beat's reply list instead of main
//    patterns.
// -------------------------------------------------------------------------
class RemoteEngine {
    constructor(mux, character, name) {
        this._mux = mux;
        // names: from character.names array, plus the username itself
        this._names = (character.names || []).concat(name ? [name] : []);
        this._wpm = character.wpm || 60;
        this._typoRate = character.typoRate || 0.04;
        this._thinkMs = character.thinkMs || [800, 2000];
        this._triggerWords = character.triggerWords || 5;
        this._patterns = character.patterns || [];
        this._fallbacks = character.fallbacks || ['hmm'];
        this._spontaneous = character.spontaneous || [];
        this._greeting = character.greeting || null;
        // verbosity: 0=strongly prefer short, 0.5=uniform, 1=strongly prefer long
        // default 0.7 biases towards longer responses across all characters
        this._verbosity = character.verbosity ?? 0.7;

        this._state = 'idle'; // idle | thinking | composing | awaiting_reply

        // Feature 1: shuffled deck per pattern + fallbacks
        this._patternDecks = this._patterns.map(p => this._makeDeck(p.responses.length));
        this._fallbackDeck = this._makeDeck(this._fallbacks.length);

        // Feature 2: topic stack (last 3 topics discussed)
        this._topicStack = [];

        // Feature 3: words user has mentioned this session
        this._userWords = new Set();

        // Feature 4: pending/active conversation beat
        this._pendingBeat = null;
        this._activeBeat = null;

        this._lastPartialCheck = '';

        this._scheduleSpontaneous();
    }

    // Fisher-Yates shuffled index array of length n
    _makeDeck(n) {
        const a = Array.from({ length: n }, (_, i) => i);
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // Draw next index from deck, reshuffling when exhausted (Feature 1).
    // Uses verbosity to bias towards longer (more lines) or shorter responses.
    // verbosity 0.5 = uniform; 1 = prefer longest; 0 = prefer shortest.
    _drawFrom(deck, size, responses) {
        if (deck.length === 0) deck.push(...this._makeDeck(size));
        if (!responses || this._verbosity === 0.5) return deck.shift();
        // Weighted selection: weight = lineCount ^ (2*verbosity - 1)
        const exp = 2 * this._verbosity - 1;
        const weights = deck.map(i => Math.pow((responses[i].split('\n').length), exp));
        const total = weights.reduce((s, w) => s + w, 0);
        let r = Math.random() * total;
        let chosen = 0;
        for (let i = 0; i < weights.length; i++) {
            r -= weights[i];
            if (r <= 0) { chosen = i; break; }
        }
        deck.splice(chosen, 1);
        return deck.length === 0 ? (deck.push(...this._makeDeck(size)), chosen) : chosen;
    }

    // Push topic to front of stack, keep last 3 (Feature 2)
    _pushTopic(topic) {
        if (!topic) return;
        const i = this._topicStack.indexOf(topic);
        if (i >= 0) this._topicStack.splice(i, 1);
        this._topicStack.unshift(topic);
        if (this._topicStack.length > 3) this._topicStack.pop();
    }

    // Track non-trivial words the user has used (Feature 3)
    _trackUserWords(text) {
        for (const w of text.toLowerCase().split(/\W+/)) {
            if (w.length > 2 && !STOP_WORDS.has(w)) this._userWords.add(w);
        }
    }

    // Freshness score: topics not recently discussed score higher (Feature 3)
    _freshnessScore(patternIdx) {
        const topic = this._patterns[patternIdx].topic ?? String(patternIdx);
        const pos = this._topicStack.indexOf(topic);
        return pos === -1 ? 10 : (3 - pos); // -1→10, 0→3, 1→2, 2→1
    }

    _pickResponse(text) {
        // Normalize: strip the character's name when used as a vocative so that
        // "hi jay" and "jay, what are you doing?" match the same patterns as
        // "hi" and "what are you doing?". Also replace possessive "jay's" → "your".
        let lower = text.toLowerCase();
        for (const n of this._names) {
            const escaped = n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // possessive: "jay's" → "your"
            lower = lower.replace(new RegExp(`\\b${escaped}'s\\b`, 'g'), 'your');
            // vocative with comma: "hi, jay" or "jay, hi" → strip name + comma + space
            lower = lower.replace(new RegExp(`(,\\s*\\b${escaped}\\b|\\b${escaped}\\b\\s*,)`, 'g'), '');
            // bare name: "hi jay" → strip name
            lower = lower.replace(new RegExp(`\\b${escaped}\\b`, 'g'), '');
        }
        lower = lower.replace(/\s+/g, ' ').trim();

        // Feature 4: if we're waiting for a beat reply, use beat's reply list
        if (this._activeBeat) {
            const beat = this._activeBeat;
            this._activeBeat = null;
            for (const r of (beat.replies || [])) {
                if (r.re && r.re.test(lower)) return r.response;
            }
            // Catch-all: last entry in replies, or null
            const last = beat.replies?.[beat.replies.length - 1];
            return last?.response ?? null;
        }

        // Collect all matching patterns
        const matches = [];
        for (let i = 0; i < this._patterns.length; i++) {
            if (this._patterns[i].re?.test(lower)) matches.push(i);
        }

        if (matches.length > 0) {
            // Feature 3: prefer fresher topics when multiple patterns match
            matches.sort((a, b) => this._freshnessScore(b) - this._freshnessScore(a));
            const best = matches[0];
            const p = this._patterns[best];

            // Feature 2: record this topic
            this._pushTopic(p.topic ?? String(best));

            // Feature 1: draw next response from shuffled deck
            const ri = this._drawFrom(this._patternDecks[best], p.responses.length, p.responses);

            // Feature 4: note any pending beat for this pattern
            if (p.beat) this._pendingBeat = p.beat;

            return p.responses[ri];
        }

        // Feature 2: use a follow-up from a recent topic before falling back
        for (const topic of this._topicStack) {
            const pi = this._patterns.findIndex(
                p => (p.topic ?? String(this._patterns.indexOf(p))) === topic
                     && p.followUps?.length
            );
            if (pi >= 0) {
                const fu = this._patterns[pi].followUps;
                return fu[Math.floor(Math.random() * fu.length)];
            }
        }

        // Feature 1: draw next fallback from shuffled deck
        const fi = this._drawFrom(this._fallbackDeck, this._fallbacks.length, this._fallbacks);
        return this._fallbacks[fi];
    }

    onUserMessage(text) {
        this._lastPartialCheck = '';
        if (text) this._trackUserWords(text); // Feature 3

        // Accept in idle or awaiting_reply; ignore if already typing
        if (this._state !== 'idle' && this._state !== 'awaiting_reply') return;

        const response = (text === '' && this._greeting)
            ? this._greeting
            : this._pickResponse(text);
        if (!response) { this._state = 'idle'; return; }

        this._state = 'thinking';
        const beat = this._pendingBeat;   // Feature 4: capture before clearing
        this._pendingBeat = null;
        const thinkDelay = this._thinkMs[0] + Math.random() * (this._thinkMs[1] - this._thinkMs[0]);

        setTimeout(() => {
            if (this._state !== 'thinking') return;
            if (beat) {
                // Feature 4: append beat question; enter awaiting_reply after typing
                this._activeBeat = beat;
                this._startTyping(response + '\n' + beat.question);
            } else {
                this._startTyping(response);
            }
        }, thinkDelay);
    }

    // Early trigger on partial input (Feature 3: freshness applies here too)
    checkPartialInput(partial) {
        if (this._state !== 'idle') return; // also blocks on awaiting_reply
        if (partial === this._lastPartialCheck) return;
        this._lastPartialCheck = partial;
        const words = partial.trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length < this._triggerWords) return;

        const response = this._pickResponse(partial);
        if (!response) return;
        this._state = 'thinking';
        const thinkDelay = this._thinkMs[0] * 0.5 + Math.random() * this._thinkMs[0];
        const beat = this._pendingBeat;
        this._pendingBeat = null;
        setTimeout(() => {
            if (this._state !== 'thinking') return;
            if (beat) {
                this._activeBeat = beat;
                this._startTyping(response + '\n' + beat.question);
            } else {
                this._startTyping(response);
            }
        }, thinkDelay);
    }

    _buildTypingSequence(text) {
        const charMs = 60000 / (this._wpm * 5);
        const events = [];
        let offset = 0;

        const lines = text.split('\n');
        for (let li = 0; li < lines.length; li++) {
            const line = lines[li];
            for (const ch of line) {
                const delay = charMs * (0.5 + Math.random());
                offset += delay;
                if (Math.random() < this._typoRate && ADJACENT[ch]) {
                    const adj = ADJACENT[ch];
                    const wrong = adj[Math.floor(Math.random() * adj.length)];
                    events.push({ type: 'remote_char', ch: wrong, offset });
                    offset += 150 + Math.random() * 350;
                    events.push({ type: 'remote_backspace', offset });
                    offset += 50 + Math.random() * 100;
                }
                events.push({ type: 'remote_char', ch, offset });
            }
            if (li < lines.length - 1) {
                offset += charMs * 2;
                events.push({ type: 'remote_newline', offset });
            }
        }
        offset += charMs * 3;
        events.push({ type: 'remote_done', offset });
        return events;
    }

    // Substitute {word} with a recent user word, if any (Feature 3 echo)
    _resolveTemplate(text) {
        if (!text.includes('{word}')) return text;
        const words = [...this._userWords];
        if (words.length === 0) return text.replace(/\{word\}/g, '');
        const w = words[Math.floor(Math.random() * words.length)];
        return text.replace(/\{word\}/g, w);
    }

    _startTyping(text) {
        this._state = 'composing';
        for (const ev of this._buildTypingSequence(this._resolveTemplate(text))) {
            this._mux.schedule(ev, ev.offset);
        }
    }

    // Feature 4: stay in awaiting_reply if a beat is active after this response
    onDone() {
        this._state = this._activeBeat ? 'awaiting_reply' : 'idle';
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
        this._remoteLines = [];
        this._remoteCurrent = '';
        this._localLines = [];
        this._localCurrent = '';
    }

    async run() {
        const d = this._d;

        d.clearScreen();
        d.putstr(0, 11, `[Waiting for ${this._username}@${getHostname()} to respond]`, CLR_YELLOW);
        if (typeof d.flush === 'function') d.flush();
        await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));

        this._drawLayout();

        const mux = new EventMux(this._getch);
        const engine = new RemoteEngine(mux, this._character, this._username);
        engine.onUserMessage(''); // trigger greeting

        let running = true;
        while (running) {
            const ev = await mux.next();
            if (ev.type === 'stop') break;

            if (ev.type === 'key') {
                if (!this._handleKey(ev.ch, engine)) { running = false; break; }
                engine.checkPartialInput(this._localCurrent);
                this._renderLocalHalf();
            } else if (ev.type === 'remote_char') {
                this._remoteCurrent += ev.ch;
                this._renderRemoteHalf(engine);
            } else if (ev.type === 'remote_backspace') {
                if (this._remoteCurrent.length > 0)
                    this._remoteCurrent = this._remoteCurrent.slice(0, -1);
                this._renderRemoteHalf(engine);
            } else if (ev.type === 'remote_newline') {
                this._remoteLines.push(this._remoteCurrent);
                this._remoteCurrent = '';
                this._renderRemoteHalf(engine);
            } else if (ev.type === 'remote_done') {
                // Commit current remote line so the next message starts fresh
                if (this._remoteCurrent.length > 0) {
                    this._remoteLines.push(this._remoteCurrent);
                    this._remoteCurrent = '';
                }
                engine.onDone();
                this._renderRemoteHalf(engine);
            }

            if (typeof d.flush === 'function') d.flush();
        }

        mux.stop();
        d.clearRow(23);
        d.putstr(0, 23, '[Connection closed]', CLR_YELLOW);
        if (typeof d.flush === 'function') d.flush();
        await new Promise(r => setTimeout(r, 1200));
    }

    _handleKey(ch, engine) {
        if (ch === 3 || ch === 27) return false; // Ctrl-C or ESC
        if (ch === 13 || ch === 10) {
            this._localLines.push(this._localCurrent);
            engine.onUserMessage(this._localCurrent);
            this._localCurrent = '';
            this._renderLocalHalf();
            return true;
        }
        if (ch === 8 || ch === 127) {
            if (this._localCurrent.length > 0)
                this._localCurrent = this._localCurrent.slice(0, -1);
            return true;
        }
        if (ch >= 32 && ch < 127 && this._localCurrent.length < 78)
            this._localCurrent += String.fromCharCode(ch);
        return true;
    }

    _drawLayout() {
        const d = this._d;
        d.clearScreen();
        const divider = `\u2500\u2500[talk: ${this._username}@${getHostname()}]` +
            '\u2500'.repeat(Math.max(0, 80 - 10 - this._username.length - 8));
        d.putstr(0, 11, divider.slice(0, 80), CLR_YELLOW);
        d.putstr(0, 23, '[Ctrl-C or ESC to quit]', CLR_YELLOW);
        this._renderRemoteHalf(null);
        this._renderLocalHalf();
        if (typeof d.flush === 'function') d.flush();
    }

    _renderRemoteHalf(engine) {
        const d = this._d;
        const isComposing = engine && (engine.state === 'composing' || engine.state === 'thinking');
        const cursor = isComposing ? '\u2588' : '';
        const allLines = [...this._remoteLines, this._remoteCurrent + cursor];
        const startIdx = Math.max(0, allLines.length - 11);
        for (let row = 0; row <= 10; row++) {
            d.clearRow(row);
            const li = startIdx + row;
            if (li < allLines.length)
                d.putstr(0, row, allLines[li].slice(0, 80), CLR_CYAN);
        }
    }

    _renderLocalHalf() {
        const d = this._d;
        // Show committed lines + current input line inline (1982 talk style)
        const allLines = [...this._localLines, this._localCurrent];
        const startIdx = Math.max(0, allLines.length - 11);
        for (let row = 12; row <= 22; row++) {
            d.clearRow(row);
            const li = startIdx + (row - 12);
            if (li < allLines.length) {
                d.putstr(0, row, allLines[li].slice(0, 80), CLR_GREEN);
                // Position cursor at end of the current (last) input line
                if (li === allLines.length - 1 && typeof d.setCursor === 'function')
                    d.setCursor(Math.min(allLines[li].length, 79), row);
            }
        }
    }
}
