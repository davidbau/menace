// test/comparison/session_runtime.js -- Thin compatibility facade.
//
// Session replay behavior now lives in core modules under js/.
// Keep this file as a stable import surface for legacy test helpers.

export {
    HeadlessDisplay,
    TYP_NAMES,
    typName,
    stripAnsiSequences,
    getSessionScreenLines,
    getSessionStartup,
    getSessionCharacter,
    getSessionGameplaySteps,
    parseTypGrid,
    parseSessionTypGrid,
    compareGrids,
    formatDiffs,
    extractTypGrid,
    compareRng,
    hasStartupBurstInFirstStep,
    replaySession,
    generateMapsSequential,
    checkWallCompleteness,
    checkConnectivity,
    checkStairs,
    checkDimensions,
    checkValidTypValues,
} from '../../js/replay_core.js';

export {
    generateMapsWithCoreReplay as generateMapsWithRng,
    generateStartupWithCoreReplay as generateStartupWithRng,
} from '../../js/headless_runtime.js';
