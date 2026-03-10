// exec_guard.js -- compatibility re-exports for command/origin guard state.
// Canonical implementation now lives in gstate.js.

export {
    beginCommandExec,
    endCommandExec,
    beforeTypedSuspend,
    afterTypedSuspend,
    getCommandExecState,
    beginOriginAwait,
    endOriginAwait,
    getOriginAwaitState,
} from './gstate.js';
