// test/comparison/session_runtime.js -- Thin compatibility facade.
//
// Session replay behavior now lives in core modules under js/.
// Keep this file as a stable import surface for legacy test helpers.

export {
    HeadlessDisplay,
    replaySession,
} from '../../js/replay_core.js';

export {
    TYP_NAMES,
    typName,
    stripAnsiSequences,
    getSessionScreenLines,
    getSessionStartup,
    getSessionCharacter,
    getSessionGameplaySteps,
    hasStartupBurstInFirstStep,
    parseTypGrid,
    parseSessionTypGrid,
    compareGrids,
    formatDiffs,
    extractTypGrid,
    compareRng,
    generateMapsSequential,
} from '../../js/replay_compare.js';

export {
    generateMapsWithCoreReplay as generateMapsWithRng,
    generateStartupWithCoreReplay as generateStartupWithRng,
    HeadlessGame,
} from '../../js/headless.js';
