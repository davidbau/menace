// test/comparison/session_helpers.js -- Legacy compatibility facade.
//
// Keep this file small so older tooling can keep importing the same paths.
// Replay behavior is now owned by core modules in js/.

export {
    compareRng,
    compareGrids,
    compareScreenLines,
    compareScreenAnsi,
} from './comparators.js';

export {
    stripAnsiSequences,
    getSessionScreenLines,
    getSessionScreenAnsiLines,
    normalizeSession,
    loadAllSessions,
} from './session_loader.js';

export {
    HeadlessDisplay,
    replaySession,
} from '../../js/replay_core.js';

export {
    TYP_NAMES,
    typName,
    parseTypGrid,
    parseSessionTypGrid,
    formatDiffs,
    extractTypGrid,
    generateMapsSequential,
    compareRng as compareRngCore,
    hasStartupBurstInFirstStep,
    getSessionStartup,
    getSessionCharacter,
    getSessionGameplaySteps,
    prepareReplayArgs,
} from '../../js/replay_compare.js';

export {
    generateMapsWithCoreReplay as generateMapsWithRng,
    generateStartupWithCoreReplay as generateStartupWithRng,
} from '../../js/headless.js';

// ---------------------------------------------------------------------------
// replayGameplaySession(seed, session, opts)
//
// Convenience bridge: accepts the old (seed, session, opts) calling convention,
// converts via prepareReplayArgs, calls the game-agnostic replaySession(seed, opts, keys),
// then groups the flat per-key results back into per-step results for backward-
// compatible test assertions.
// ---------------------------------------------------------------------------

import { replaySession as _replaySession } from '../../js/replay_core.js';
import { prepareReplayArgs as _prepareReplayArgs } from '../../js/replay_compare.js';

export async function replayGameplaySession(seed, session, opts = {}) {
    const args = _prepareReplayArgs(seed, session, opts);
    const result = await _replaySession(args.seed, args.opts, args.keys);

    // Group flat per-key results into per-step results using stepBoundaries.
    const steps = [];
    let keyIdx = 0;
    for (const len of args.stepBoundaries) {
        const stepKeys = result.keys.slice(keyIdx, keyIdx + len);
        steps.push({
            rng: stepKeys.flatMap(k => k.rng),
            rngCalls: stepKeys.reduce((n, k) => n + k.rng.length, 0),
            screen: stepKeys.length > 0 ? stepKeys[stepKeys.length - 1].screen : [],
            screenAnsi: stepKeys.length > 0 ? stepKeys[stepKeys.length - 1].screenAnsi : undefined,
            cursor: stepKeys.length > 0 ? stepKeys[stepKeys.length - 1].cursor : undefined,
        });
        keyIdx += len;
    }

    return { startup: result.startup, steps, keys: result.keys };
}
