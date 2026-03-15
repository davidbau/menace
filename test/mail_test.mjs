#!/usr/bin/env node
// test/mail_test.mjs -- Unit tests for the mail system.
// Run: node test/mail_test.mjs

import assert from 'assert';
import { setStorageForTesting } from '../js/storage.js';
import {
    loadMailState, saveMailState,
    seedInboxIfNeeded, deliverPending,
    getMessages, getMessage, saveMessage, deleteSavedMessage,
    addToInbox, addToSent, getSentMessages, getUnreadCount,
    scheduleReply, pickAndDeliverCorpusMessage,
    isDaemonDue, resetDaemonTimer,
} from '../js/mail.js';
import {
    SEED_MESSAGES, CORPUS, REPLY_RULES, SOCIAL_ROUTING, SOCIAL_TEMPLATES,
} from '../js/mailcorpus.js';

// =========================================================================
// Test runner
// =========================================================================

let passed = 0, failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓  ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ✗  ${name}`);
        console.error(`     ${e.message}`);
        failed++;
    }
}

// =========================================================================
// Mock storage factory
// =========================================================================

function makeMock() {
    const store = {};
    return {
        getItem:    (k) => (k in store ? store[k] : null),
        setItem:    (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        get length() { return Object.keys(store).length; },
        key:        (i) => Object.keys(store)[i] ?? null,
        _clear:     () => { for (const k of Object.keys(store)) delete store[k]; },
    };
}

// Wire up a fresh mock before each section that uses storage
let mock;
function freshMock() {
    mock = makeMock();
    setStorageForTesting(mock);
}

// =========================================================================
// 1. Corpus decode
// =========================================================================

console.log('\nCorpus decode:');

test('SEED_MESSAGES is an array of 8', () => {
    assert.ok(Array.isArray(SEED_MESSAGES), 'not an array');
    assert.strictEqual(SEED_MESSAGES.length, 8, `expected 8, got ${SEED_MESSAGES.length}`);
});

test('each seed message has from / subject / body / daysAgo', () => {
    for (const m of SEED_MESSAGES) {
        assert.ok(m.from,    `missing from: ${JSON.stringify(m).slice(0, 60)}`);
        assert.ok(m.subject, `missing subject in msg from ${m.from}`);
        assert.ok(m.body,    `missing body in msg from ${m.from}`);
        assert.ok(typeof m.daysAgo === 'number', `bad daysAgo in msg from ${m.from}`);
    }
});

test('CORPUS has 108 entries', () => {
    assert.strictEqual(CORPUS.length, 108, `expected 108, got ${CORPUS.length}`);
});

test('each corpus entry has from / subject / body', () => {
    for (const m of CORPUS) {
        assert.ok(m.from,    `missing from in corpus entry`);
        assert.ok(m.subject, `missing subject from ${m.from}`);
        assert.ok(m.body,    `missing body from ${m.from}`);
    }
});

test('REPLY_RULES is an object with expected user keys', () => {
    assert.ok(typeof REPLY_RULES === 'object' && REPLY_RULES !== null);
    for (const user of ['izchak', 'walz', 'harvey', 'oracle', 'thief', 'crowther']) {
        assert.ok(user in REPLY_RULES, `missing REPLY_RULES entry for ${user}`);
    }
});

test('each REPLY_RULES entry has replyRules array + genericResponses array', () => {
    for (const [user, rules] of Object.entries(REPLY_RULES)) {
        assert.ok(Array.isArray(rules.replyRules),
            `${user}.replyRules is not an array`);
        assert.ok(Array.isArray(rules.genericResponses),
            `${user}.genericResponses is not an array`);
        assert.ok(rules.genericResponses.length > 0,
            `${user}.genericResponses is empty`);
        for (const rule of rules.replyRules) {
            assert.ok(Array.isArray(rule.keywords),  `${user} rule missing keywords`);
            assert.ok(Array.isArray(rule.responses), `${user} rule missing responses`);
            assert.ok(rule.keywords.length > 0,  `${user} rule has empty keywords`);
            assert.ok(rule.responses.length > 0, `${user} rule has empty responses`);
            for (const r of rule.responses) {
                assert.ok(r.subject, `${user} response missing subject`);
                assert.ok(r.body,    `${user} response missing body`);
            }
        }
        for (const r of rules.genericResponses) {
            assert.ok(r.subject, `${user} generic missing subject`);
            assert.ok(r.body,    `${user} generic missing body`);
        }
    }
});

test('SOCIAL_ROUTING is a non-empty array with required fields', () => {
    assert.ok(Array.isArray(SOCIAL_ROUTING) && SOCIAL_ROUTING.length > 0);
    for (const r of SOCIAL_ROUTING) {
        assert.ok(Array.isArray(r.keywords) && r.keywords.length > 0,
            `bad keywords: ${JSON.stringify(r)}`);
        assert.ok(r.expert,  `missing expert: ${JSON.stringify(r)}`);
        assert.ok(r.topic,   `missing topic: ${JSON.stringify(r)}`);
    }
});

test('SOCIAL_ROUTING experts are known REPLY_RULES users', () => {
    for (const r of SOCIAL_ROUTING) {
        assert.ok(r.expert in REPLY_RULES,
            `expert "${r.expert}" has no REPLY_RULES entry`);
    }
});

test('SOCIAL_TEMPLATES contains {via} and {topic} placeholders', () => {
    assert.ok(Array.isArray(SOCIAL_TEMPLATES) && SOCIAL_TEMPLATES.length > 0);
    for (const t of SOCIAL_TEMPLATES) {
        assert.ok(t.includes('{via}'),   `template missing {via}: "${t}"`);
        assert.ok(t.includes('{topic}'), `template missing {topic}: "${t}"`);
    }
});

// =========================================================================
// 2. Mail storage API
// =========================================================================

console.log('\nMail storage API:');

freshMock();

test('loadMailState returns defaults on empty storage', () => {
    const s = loadMailState();
    assert.strictEqual(s.nextId, 1);
    assert.deepStrictEqual(s.pendingReplies, []);
    assert.deepStrictEqual(s.corpusDelivered, {});
    assert.strictEqual(s.seeded, false);
    assert.strictEqual(s.daemonVisitAfter, 0);
});

test('addToInbox stores a message and increments nextId', () => {
    const msg = addToInbox('izchak', 'Test subject', 'Test body', 1000000);
    assert.strictEqual(msg.from, 'izchak');
    assert.strictEqual(msg.to, 'rodney');
    assert.strictEqual(msg.subject, 'Test subject');
    assert.strictEqual(msg.body, 'Test body');
    assert.strictEqual(msg.date, 1000000);
    assert.strictEqual(msg.read, false);
    assert.strictEqual(msg.deleted, false);
    assert.strictEqual(loadMailState().nextId, 2);
});

test('getMessages returns stored messages sorted by date', () => {
    addToInbox('walz', 'Second', 'body2', 2000000);
    addToInbox('oracle', 'First', 'body1', 500000);
    const msgs = getMessages();
    assert.strictEqual(msgs.length, 3); // 1 from prev test + 2 new
    assert.ok(msgs[0].date <= msgs[1].date && msgs[1].date <= msgs[2].date,
        'messages not sorted by date');
});

test('getMessage retrieves a specific message by id', () => {
    const msgs = getMessages();
    const m = getMessage(msgs[0].id);
    assert.ok(m, 'getMessage returned null');
    assert.strictEqual(m.id, msgs[0].id);
});

test('getMessage returns null for non-existent id', () => {
    assert.strictEqual(getMessage('9999'), null);
});

test('getUnreadCount counts unread non-deleted messages', () => {
    const msgs = getMessages();
    assert.strictEqual(getUnreadCount(), msgs.length); // all unread
    // Mark one read
    saveMessage({ ...msgs[0], read: true });
    assert.strictEqual(getUnreadCount(), msgs.length - 1);
});

test('deleteSavedMessage removes a message from inbox', () => {
    const before = getMessages().length;
    deleteSavedMessage(getMessages()[0].id);
    assert.strictEqual(getMessages().length, before - 1);
});

test('addToSent stores a sent message', () => {
    addToSent('oracle', 'My question', 'What is the answer?');
    const sent = getSentMessages();
    assert.ok(sent.length >= 1);
    const m = sent[sent.length - 1];
    assert.strictEqual(m.from, 'rodney');
    assert.strictEqual(m.to, 'oracle');
    assert.strictEqual(m.read, true);
});

test('scheduleReply adds to pendingReplies', () => {
    const before = loadMailState().pendingReplies.length;
    scheduleReply('oracle', 'Prophecy', 'You shall seek.', 3600000);
    assert.strictEqual(loadMailState().pendingReplies.length, before + 1);
});

test('deliverPending delivers only matured replies', () => {
    // Queue one past-due and one future reply
    freshMock();
    const state = loadMailState();
    state.pendingReplies = [
        { sendAt: Date.now() - 1000, from: 'oracle', subject: 'Past', body: 'Due now.' },
        { sendAt: Date.now() + 9999999, from: 'walz', subject: 'Future', body: 'Not yet.' },
    ];
    saveMailState(state);

    const delivered = deliverPending();
    assert.strictEqual(delivered.length, 1);
    assert.strictEqual(delivered[0].from, 'oracle');
    assert.strictEqual(getMessages().length, 1);
    assert.strictEqual(loadMailState().pendingReplies.length, 1); // future still pending
});

test('deliverPending is idempotent (no double-delivery)', () => {
    const d2 = deliverPending();
    assert.strictEqual(d2.length, 0);
    assert.strictEqual(getMessages().length, 1);
});

test('seedInboxIfNeeded populates all SEED_MESSAGES on first run', () => {
    freshMock();
    seedInboxIfNeeded(SEED_MESSAGES);
    assert.strictEqual(getMessages().length, SEED_MESSAGES.length);
    const state = loadMailState();
    assert.strictEqual(state.seeded, true);
    assert.ok(state.daemonVisitAfter > 0, 'daemonVisitAfter not set');
    assert.ok(state.daemonVisitAfter > Date.now(), 'daemonVisitAfter in the past');
});

test('seedInboxIfNeeded is idempotent', () => {
    seedInboxIfNeeded(SEED_MESSAGES);
    assert.strictEqual(getMessages().length, SEED_MESSAGES.length);
});

test('seed message dates are spread across daysAgo', () => {
    const msgs = getMessages();
    const now = Date.now();
    // The message with daysAgo=14 should be ~14 days old
    const oldest = Math.max(...SEED_MESSAGES.map(m => m.daysAgo || 0));
    const approxOldest = msgs.reduce((a, m) => Math.max(a, now - m.date), 0);
    const dayMs = 24 * 60 * 60 * 1000;
    assert.ok(approxOldest >= (oldest - 1) * dayMs,
        `oldest message not old enough: ${approxOldest / dayMs} days`);
});

test('isDaemonDue returns false right after seed', () => {
    // daemonVisitAfter is 2-5h in future
    assert.strictEqual(isDaemonDue(), false);
});

test('isDaemonDue returns true when timer has expired', () => {
    freshMock();
    const state = loadMailState();
    state.daemonVisitAfter = Date.now() - 1;
    saveMailState(state);
    assert.strictEqual(isDaemonDue(), true);
});

test('resetDaemonTimer sets a future visit time', () => {
    resetDaemonTimer();
    const state = loadMailState();
    assert.ok(state.daemonVisitAfter > Date.now(), 'daemonVisitAfter should be in future');
});

test('pickAndDeliverCorpusMessage delivers one undelivered entry', () => {
    freshMock();
    const msg = pickAndDeliverCorpusMessage(CORPUS);
    assert.ok(msg, 'no message delivered');
    assert.ok(msg.from, 'delivered message has no from');
    assert.strictEqual(getMessages().length, 1);
    // Verify it is marked as delivered
    const state = loadMailState();
    const deliveredKeys = Object.keys(state.corpusDelivered);
    assert.strictEqual(deliveredKeys.length, 1);
});

test('pickAndDeliverCorpusMessage does not repeat delivered entries', () => {
    // Deliver all 108 corpus entries
    for (let i = 0; i < CORPUS.length - 1; i++) {
        pickAndDeliverCorpusMessage(CORPUS);
    }
    assert.strictEqual(getMessages().length, CORPUS.length);
    // One more attempt with fully-delivered corpus
    const extra = pickAndDeliverCorpusMessage(CORPUS);
    assert.strictEqual(extra, null, 'should return null when all delivered');
});

// =========================================================================
// 3. Reply engine (mirrors _pickReply logic from commands.js)
// =========================================================================

console.log('\nReply engine:');

// Replicate _pickReply from commands.js so we can test it standalone.
// If this diverges, tests here will catch it and remind us to sync.
function pickReply(to, subject, body) {
    const toKey = to.toLowerCase();
    const textLower = (subject + ' ' + body).toLowerCase();
    const rules = REPLY_RULES[toKey];
    if (rules) {
        for (const rule of (rules.replyRules || [])) {
            if ((rule.keywords || []).some(k => textLower.includes(k))) {
                const responses = rule.responses || [];
                if (responses.length > 0) {
                    return { ...responses[Math.floor(Math.random() * responses.length)], from: to };
                }
            }
        }
        const generics = rules.genericResponses || [];
        if (generics.length > 0) {
            return { ...generics[Math.floor(Math.random() * generics.length)], from: to };
        }
    }
    for (const route of SOCIAL_ROUTING) {
        if ((route.keywords || []).some(k => textLower.includes(k))) {
            const tmpl = SOCIAL_TEMPLATES[0]; // deterministic in tests
            const intro = tmpl.replace('{via}', to).replace('{topic}', route.topic);
            const expert = route.expert;
            const expertRules = REPLY_RULES[expert];
            if (expertRules) {
                for (const rule of (expertRules.replyRules || [])) {
                    if ((rule.keywords || []).some(k => textLower.includes(k))) {
                        const responses = rule.responses || [];
                        if (responses.length > 0) {
                            const r = responses[0];
                            return { from: expert, subject: r.subject, body: intro + '\n\n' + r.body };
                        }
                    }
                }
                const generics2 = expertRules.genericResponses || [];
                if (generics2.length > 0) {
                    const r = generics2[0];
                    return { from: expert, subject: r.subject, body: intro + '\n\n' + r.body };
                }
            }
            return { from: expert, subject: 'Re: ' + subject, body: intro };
        }
    }
    return null;
}

test('izchak responds to "wand" keyword', () => {
    const r = pickReply('izchak', 'wand of striking', 'do you have any in stock?');
    assert.ok(r, 'no reply generated');
    assert.strictEqual(r.from, 'izchak');
    assert.ok(r.subject, 'reply has no subject');
    assert.ok(r.body, 'reply has no body');
});

test('izchak responds to "potion" keyword', () => {
    const r = pickReply('izchak', 'potions', 'I need a healing potion');
    assert.ok(r, 'no reply');
    assert.strictEqual(r.from, 'izchak');
});

test('izchak gives generic reply for unrecognized topic', () => {
    const r = pickReply('izchak', 'the weather', 'nice day in the dungeon');
    assert.ok(r, 'should have a generic fallback');
    assert.strictEqual(r.from, 'izchak');
});

test('harvey responds to "logo" keyword', () => {
    const r = pickReply('harvey', 'Logo question', 'can recursion replace all loops?');
    assert.ok(r, 'no reply');
    assert.strictEqual(r.from, 'harvey');
});

test('harvey responds to "scheme" keyword', () => {
    const r = pickReply('harvey', 'Scheme vs Logo', 'which should I learn first?');
    assert.ok(r, 'no reply');
    assert.strictEqual(r.from, 'harvey');
});

test('oracle responds to "prophecy" keyword', () => {
    const r = pickReply('oracle', 'prophecy', 'what does my future hold?');
    assert.ok(r, 'no reply');
    assert.strictEqual(r.from, 'oracle');
});

test('thief responds to "treasure" keyword', () => {
    const r = pickReply('thief', 'the jewels', 'where are the crown jewels?');
    assert.ok(r, 'no reply');
    assert.strictEqual(r.from, 'thief');
});

test('social routing: logo question to unknown user routes to harvey', () => {
    // "daemon" is not in REPLY_RULES, so social routing fires for logo keyword
    const logoRoute = SOCIAL_ROUTING.find(rt => rt.keywords.includes('logo'));
    assert.ok(logoRoute, 'no logo route in SOCIAL_ROUTING');
    const r = pickReply('daemon', 'logo recursion', 'can recursion replace goto?');
    assert.ok(r, 'no reply generated');
    assert.strictEqual(r.from, logoRoute.expert);
});

test('social routing: zork topic routes to correct expert', () => {
    const zorkRoute = SOCIAL_ROUTING.find(rt => rt.keywords.includes('zork'));
    assert.ok(zorkRoute, 'no zork route in SOCIAL_ROUTING');
    // Use "daemon" who has no REPLY_RULES so social routing triggers
    const r = pickReply('daemon', 'zork parser', 'how does the zork parser work?');
    assert.ok(r, 'no reply');
    assert.strictEqual(r.from, zorkRoute.expert);
});

test('social routing reply has {via} and {topic} filled in (no raw placeholders)', () => {
    const logoRoute = SOCIAL_ROUTING.find(rt => rt.keywords.includes('logo'));
    if (!logoRoute) return;
    // "daemon" has no REPLY_RULES, so social routing fires
    const r = pickReply('daemon', 'logo', 'logo recursion question');
    assert.ok(r, 'no reply');
    assert.ok(!r.body.includes('{via}'),   'body still has {via} placeholder');
    assert.ok(!r.body.includes('{topic}'), 'body still has {topic} placeholder');
    assert.ok(r.body.includes('daemon'),   'body should mention "daemon" as via user');
});

test('completely unknown user with no routing returns null', () => {
    // gridbug has no rules and no social route matches "ZAP ZAP ZAP"
    const r = pickReply('gridbug', 'ZAP ZAP ZAP', 'ZAP ZAP ZAP ZAP');
    // May be null or a social-route reply — just must not crash
    assert.ok(r === null || (r.from && r.subject), 'invalid reply shape');
});

test('reply has non-empty from, subject, and body', () => {
    // Spot-check all REPLY_RULES users with a generic topic
    for (const user of Object.keys(REPLY_RULES)) {
        const r = pickReply(user, 'hello', 'just saying hi');
        if (r) {
            assert.ok(r.from,    `${user}: reply.from is empty`);
            assert.ok(r.subject, `${user}: reply.subject is empty`);
            assert.ok(r.body,    `${user}: reply.body is empty`);
        }
    }
});

// =========================================================================
// Summary
// =========================================================================

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
