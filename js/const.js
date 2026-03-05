// const.js -- Consolidated constant surface for issue #227 phase 1.
//
// Initial migration step: re-export config constants through a stable import
// surface. symbols.js re-exports are added in a later pass after resolving
// duplicate export names shared with config.js.

export * from './config.js';
