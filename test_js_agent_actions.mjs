import { runHeadless } from './selfplay/runner/headless_runner.js';

await runHeadless({
    seed: 13296,
    maxTurns: 10,
    verbose: false,
    onTurn: (info) => {
        console.log(`Turn ${info.turn}: action=${info.action?.type} key=${info.action?.key} reason=${info.action?.reason}`);
    },
});
