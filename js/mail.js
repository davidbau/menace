// js/mail.js -- Mail storage and delivery API.
// Backed by the VFS system (localStorage via 'menace-fs' key).
// All mail is stored under the 'mail/' prefix.
//
// Paths:
//   mail/inbox/NNNN.json  -- received messages
//   mail/sent/NNNN.json   -- sent messages
//   mail/state.json       -- global metadata
//
// Message schema:
//   { id, from, to, subject, date, body, read, deleted }
//
// State schema:
//   { nextId, corpusDelivered, pendingReplies, daemonVisitAfter, seeded }

import { vfsReadFile, vfsWriteFile, vfsDeleteFile, vfsListFiles } from './storage.js';

// -------------------------------------------------------------------------
// Internal helpers
// -------------------------------------------------------------------------

function _formatId(n) {
    return String(n).padStart(4, '0');
}

function _randBetween(lo, hi) {
    return lo + Math.floor(Math.random() * (hi - lo + 1));
}

// -------------------------------------------------------------------------
// State management
// -------------------------------------------------------------------------

const DEFAULT_STATE = {
    nextId: 1,
    corpusDelivered: {},
    pendingReplies: [],
    daemonVisitAfter: 0,
    seeded: false,
};

export function loadMailState() {
    const raw = vfsReadFile('mail/state.json');
    if (!raw) return { ...DEFAULT_STATE };
    try {
        const s = JSON.parse(raw);
        // fill in any missing keys from defaults
        return { ...DEFAULT_STATE, ...s };
    } catch (e) {
        return { ...DEFAULT_STATE };
    }
}

export function saveMailState(state) {
    vfsWriteFile('mail/state.json', JSON.stringify(state));
}

// -------------------------------------------------------------------------
// Message I/O
// -------------------------------------------------------------------------

export function getMessages() {
    const paths = vfsListFiles('mail/inbox/');
    const msgs = [];
    for (const p of paths) {
        if (!p.endsWith('.json')) continue;
        const raw = vfsReadFile(p);
        if (!raw) continue;
        try { msgs.push(JSON.parse(raw)); } catch (e) { /* skip corrupt */ }
    }
    msgs.sort((a, b) => (a.date || 0) - (b.date || 0));
    return msgs;
}

export function getMessage(id) {
    const raw = vfsReadFile(`mail/inbox/${_formatId(id)}.json`);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
}

export function saveMessage(msg) {
    vfsWriteFile(`mail/inbox/${_formatId(msg.id)}.json`, JSON.stringify(msg));
}

export function deleteSavedMessage(id) {
    vfsDeleteFile(`mail/inbox/${_formatId(id)}.json`);
}

export function addToInbox(from, subject, body, dateMs) {
    const state = loadMailState();
    const id = state.nextId;
    state.nextId += 1;
    saveMailState(state);

    const msg = {
        id: _formatId(id),
        from,
        to: 'rodney',
        subject,
        date: dateMs != null ? dateMs : Date.now(),
        body,
        read: false,
        deleted: false,
    };
    saveMessage(msg);
    return msg;
}

export function getSentMessages() {
    const paths = vfsListFiles('mail/sent/');
    const msgs = [];
    for (const p of paths) {
        if (!p.endsWith('.json')) continue;
        const raw = vfsReadFile(p);
        if (!raw) continue;
        try { msgs.push(JSON.parse(raw)); } catch (e) { /* skip */ }
    }
    msgs.sort((a, b) => (a.date || 0) - (b.date || 0));
    return msgs;
}

export function addToSent(to, subject, body) {
    const state = loadMailState();
    const id = state.nextId;
    state.nextId += 1;
    saveMailState(state);

    const msg = {
        id: _formatId(id),
        from: 'rodney',
        to,
        subject,
        date: Date.now(),
        body,
        read: true,
        deleted: false,
    };
    vfsWriteFile(`mail/sent/${_formatId(id)}.json`, JSON.stringify(msg));
    return msg;
}

// -------------------------------------------------------------------------
// Unread count
// -------------------------------------------------------------------------

export function getUnreadCount() {
    const msgs = getMessages();
    return msgs.filter(m => !m.read && !m.deleted).length;
}

// -------------------------------------------------------------------------
// Pending reply delivery
// -------------------------------------------------------------------------

export function deliverPending() {
    const state = loadMailState();
    const now = Date.now();
    const delivered = [];
    const remaining = [];

    for (const entry of state.pendingReplies) {
        if (entry.sendAt <= now) {
            const msg = addToInbox(entry.from, entry.subject, entry.body, now);
            delivered.push(msg);
        } else {
            remaining.push(entry);
        }
    }

    if (delivered.length > 0) {
        state.pendingReplies = remaining;
        saveMailState(state);
    }

    return delivered;
}

// -------------------------------------------------------------------------
// Scheduling replies
// -------------------------------------------------------------------------

export function scheduleReply(from, subject, body, delayMs) {
    const state = loadMailState();
    state.pendingReplies.push({
        sendAt: Date.now() + delayMs,
        from,
        subject,
        body,
    });
    saveMailState(state);
}

// -------------------------------------------------------------------------
// Corpus delivery (for mail daemon)
// -------------------------------------------------------------------------

export function pickAndDeliverCorpusMessage(corpus) {
    const state = loadMailState();
    // Build list of undelivered corpus entries
    const undelivered = [];
    for (let i = 0; i < corpus.length; i++) {
        const key = `${corpus[i].from}/${i}`;
        if (!state.corpusDelivered[key]) {
            undelivered.push({ entry: corpus[i], key });
        }
    }
    if (undelivered.length === 0) return null;

    const pick = undelivered[Math.floor(Math.random() * undelivered.length)];
    const msg = addToInbox(pick.entry.from, pick.entry.subject, pick.entry.body, Date.now());

    // Reload state (addToInbox may have bumped nextId)
    const state2 = loadMailState();
    state2.corpusDelivered[pick.key] = true;
    saveMailState(state2);

    return msg;
}

// -------------------------------------------------------------------------
// Seed inbox on first launch
// -------------------------------------------------------------------------

export function seedInboxIfNeeded(seedMessages) {
    const state = loadMailState();
    if (state.seeded) return;

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    for (const sm of seedMessages) {
        const dateMs = now - (sm.daysAgo || 0) * DAY_MS;
        addToInbox(sm.from, sm.subject, sm.body, dateMs);
    }

    // Reload state after addToInbox calls (nextId advanced)
    const state2 = loadMailState();
    state2.seeded = true;
    // random first daemon visit: 2–5 hours
    state2.daemonVisitAfter = now + _randBetween(2 * 3600 * 1000, 5 * 3600 * 1000);
    saveMailState(state2);
}

// -------------------------------------------------------------------------
// Daemon timing
// -------------------------------------------------------------------------

export function isDaemonDue() {
    const state = loadMailState();
    return state.daemonVisitAfter > 0 && Date.now() >= state.daemonVisitAfter;
}

export function resetDaemonTimer() {
    const state = loadMailState();
    state.daemonVisitAfter = Date.now() + _randBetween(2 * 3600 * 1000, 5 * 3600 * 1000);
    saveMailState(state);
}
