import { Agent } from './selfplay/agent.js';
import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';

const adapter = new TmuxAdapter({ keyDelay: 80 });
await adapter.start({
    seed: 13296,
    role: 'Valkyrie',
    race: 'human',
    name: 'Agent',
    gender: 'female',
    align: 'neutral',
});

const agent = new Agent(adapter, {
    maxTurns: 10,
    onTurn: (info) => {
        console.log(`Turn ${info.turn}: action=${info.action?.type} key=${info.action?.key} reason=${info.action?.reason}`);
    },
});

await agent.run();
await adapter.stop();
