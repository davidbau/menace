#!/usr/bin/env node
// Run a wizard-mode C NetHack session with Codex-driven setup, then agent play.

import { writeFileSync } from 'fs';
import { Agent } from '../agent.js';
import { TmuxAdapter } from '../interface/tmux_adapter.js';

function parseArgs(argv) {
    const opts = {
        seed: 321,
        role: 'Archeologist',
        race: 'human',
        gender: 'female',
        align: 'neutral',
        name: 'Recorder',
        symset: 'DECgraphics',
        keyDelay: 40,
        session: `wizard-agent-${Date.now()}`,
        tmuxSocket: process.env.SELFPLAY_TMUX_SOCKET || 'default',
        fixedDatetime: '20000110090000',
        keylog: null,
        setupBase64: '',
        agentTurns: 200,
        quiet: true,
    };

    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--quiet') opts.quiet = true;
        else if (a === '--verbose') opts.quiet = false;
        else if (a.startsWith('--seed=')) opts.seed = Number(a.slice(7));
        else if (a.startsWith('--role=')) opts.role = a.slice(7);
        else if (a.startsWith('--race=')) opts.race = a.slice(7);
        else if (a.startsWith('--gender=')) opts.gender = a.slice(9);
        else if (a.startsWith('--align=')) opts.align = a.slice(8);
        else if (a.startsWith('--name=')) opts.name = a.slice(7);
        else if (a.startsWith('--symset=')) opts.symset = a.slice(9);
        else if (a.startsWith('--key-delay=')) opts.keyDelay = Number(a.slice(12));
        else if (a.startsWith('--session=')) opts.session = a.slice(10);
        else if (a.startsWith('--tmux-socket=')) opts.tmuxSocket = a.slice(14);
        else if (a.startsWith('--datetime=')) opts.fixedDatetime = a.slice(11);
        else if (a.startsWith('--keylog=')) opts.keylog = a.slice(9);
        else if (a.startsWith('--setup-base64=')) opts.setupBase64 = a.slice(15);
        else if (a.startsWith('--agent-turns=')) opts.agentTurns = Number(a.slice(14));
    }

    if (!opts.keylog) throw new Error('--keylog is required');
    return opts;
}

function buildNethackOptions(opts) {
    const rc = [
        `OPTIONS=name:${opts.name}`,
        `OPTIONS=race:${opts.race}`,
        `OPTIONS=role:${opts.role}`,
        `OPTIONS=gender:${opts.gender}`,
        `OPTIONS=align:${opts.align}`,
        'OPTIONS=showexp',
        'OPTIONS=!autopickup',
        'OPTIONS=suppress_alert:3.4.3',
        'OPTIONS=!tutorial',
    ];
    if (opts.symset === 'DECgraphics') rc.push('OPTIONS=symset:DECgraphics');
    return rc;
}

function hasMorePrompt(grid) {
    if (!grid) return false;
    for (const row of grid) {
        const line = row.map((c) => c.ch).join('');
        if (line.includes('--More--')) return true;
    }
    return false;
}

async function clearPendingMore(adapter, maxClears = 40) {
    let clears = 0;
    while (clears < maxClears) {
        if (!(await adapter.isRunning())) break;
        const grid = await adapter.readScreen();
        if (!hasMorePrompt(grid)) break;
        await adapter.sendKey(' ');
        clears += 1;
    }
    return clears;
}

async function main() {
    const opts = parseArgs(process.argv);
    const setupKeys = opts.setupBase64 ? Buffer.from(opts.setupBase64, 'base64').toString('utf8') : '';

    const metadata = {
        type: 'meta',
        seed: opts.seed,
        role: opts.role,
        race: opts.race,
        gender: opts.gender,
        align: opts.align,
        name: opts.name,
        wizard: true,
        tutorial: false,
        symset: opts.symset,
        datetime: opts.fixedDatetime,
        keylogDelayMs: 0,
        nethackOptions: buildNethackOptions(opts),
        scripted: true,
        scriptedKeyCount: setupKeys.length,
        agentTurns: opts.agentTurns,
        recordedAt: new Date().toISOString(),
    };
    writeFileSync(opts.keylog, JSON.stringify(metadata) + '\n');

    process.env.NETHACK_KEYLOG = opts.keylog;
    process.env.NETHACK_KEYLOG_DELAY_MS = '0';
    process.env.NETHACK_FIXED_DATETIME = opts.fixedDatetime;
    if (!process.env.NETHACK_NO_DELAY) process.env.NETHACK_NO_DELAY = '1';
    if (opts.tmuxSocket) process.env.SELFPLAY_TMUX_SOCKET = opts.tmuxSocket;

    const adapter = new TmuxAdapter({
        sessionName: opts.session,
        keyDelay: opts.keyDelay,
        symset: opts.symset,
        tmuxSocket: opts.tmuxSocket,
    });

    let sentSetup = 0;
    let autoMoreSpaces = 0;
    try {
        await adapter.start({
            seed: opts.seed,
            role: opts.role,
            race: opts.race,
            gender: opts.gender,
            align: opts.align,
            name: opts.name,
            wizard: true,
            tutorial: false,
        });

        for (const ch of setupKeys) {
            if (!(await adapter.isRunning())) break;
            autoMoreSpaces += await clearPendingMore(adapter);
            await adapter.sendKey(ch);
            sentSetup += 1;
        }
        autoMoreSpaces += await clearPendingMore(adapter);

        const agent = new Agent(adapter, {
            maxTurns: opts.agentTurns,
            moveDelay: 0,
            onTurn: (info) => {
                if (!opts.quiet && (info.turn <= 10 || info.turn % 25 === 0)) {
                    console.log(
                        `agent_turn=${info.turn} hp=${info.hp}/${info.hpmax} dlvl=${info.dlvl} xl=${info.xl ?? '?'} xp=${info.xp ?? '?'}`
                    );
                }
            },
        });
        await agent.run();
    } finally {
        await adapter.stop();
        console.log(`sent_setup_keys=${sentSetup}`);
        console.log(`auto_more_spaces=${autoMoreSpaces}`);
        console.log(`keylog=${opts.keylog}`);
    }
}

main().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
});
