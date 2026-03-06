// Global game state holder.
// All modules import { game } from './gstate.js' to access live state.
// setGame() is called once at initialization.

export let game = null;

export function setGame(g) {
  game = g;
}
