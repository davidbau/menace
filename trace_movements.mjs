#!/usr/bin/env node
// Trace actual movements to see if agent is moving or stuck

import { Agent } from './selfplay/agent.js';
import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';

async function traceMovements(seed, maxTurns = 30) {
    const adapter = new TmuxAdapter({ seed, keyDelay: 50 });
    await adapter.start({
        seed, role: 'Valkyrie', race: 'human',
        name: 'Agent', gender: 'female', align: 'neutral',
    });

    const agent = new Agent(adapter, { maxTurns });

    let lastPos = null;
    let turnsSinceMove = 0;
    let movements = [];

    agent.onTurn = (info) => {
        const pos = { x: agent.screen.playerX, y: agent.screen.playerY };

        if (lastPos && (pos.x !== lastPos.x || pos.y !== lastPos.y)) {
            const dx = pos.x - lastPos.x;
            const dy = pos.y - lastPos.y;
            movements.push({
                turn: info.turn,
                from: lastPos,
                to: pos,
                delta: {dx, dy},
                action: info.action?.type,
                key: info.action?.key
            });
            turnsSinceMove = 0;
        } else {
            turnsSinceMove++;
        }

        lastPos = { ...pos };

        if (info.turn % 10 === 0) {
            console.log(`Turn ${info.turn}: pos=(${pos.x},${pos.y}), action=${info.action?.type}, turnsSinceMove=${turnsSinceMove}`);
        }
    };

    await agent.run();

    console.log('\n=== Movement Summary ===');
    console.log(`Total movements: ${movements.length}/${maxTurns} turns`);
    console.log(`\nFirst 15 movements:`);
    for (let i = 0; i < Math.min(15, movements.length); i++) {
        const m = movements[i];
        console.log(`  Turn ${m.turn}: (${m.from.x},${m.from.y}) -> (${m.to.x},${m.to.y}) [dx=${m.delta.dx},dy=${m.delta.dy}] via ${m.action}/${m.key}`);
    }

    await adapter.stop();
}

traceMovements(44444, 30).catch(console.error);
