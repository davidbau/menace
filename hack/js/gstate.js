// Global game state holder.
// All modules import { game } from './gstate.js' to access live state.
// setGame() is called once at initialization.

export let game = null;

export function setGame(g) {
  game = g;
}

// GameOver is here (not main.js) to avoid circular imports since do1.js needs it.
export class GameOver extends Error {
  constructor(reason) { super('Game over: ' + reason); this.reason = reason; }
}
