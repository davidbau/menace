// extralev.js -- Extra/special level generation helpers
// cf. extralev.c — roguejoin, roguecorr, miniwalk, makeroguerooms,
//                  corr, makerogueghost
//
// extralev.c provides helpers for generating rogue-style extra levels:
//   makeroguerooms(): generates a 3x3 grid of rooms/corridors in rogue style.
//   corr(): sets a location to regular or secret corridor randomly.
//   makerogueghost(): places a ghost monster with equipment in a random room.
//   roguejoin/roguecorr/miniwalk: corridor/connection helpers.
//
// JS implementations: none — all level generation is runtime.

// cf. extralev.c:20 [static] — roguejoin(x1, y1, x2, y2, horiz): connect two points
// Connects two points with corridors, horizontal or vertical first.
// TODO: extralev.c:20 — roguejoin(): rogue room connection

// cf. extralev.c:44 [static] — roguecorr(x, y, dir): create room corridor
// Creates a corridor between adjacent rooms in given direction.
// TODO: extralev.c:44 — roguecorr(): rogue corridor creation

// cf. extralev.c:138 [static] — miniwalk(x, y): recursive 3x3 grid walk
// Recursively walks through 3x3 grid to establish room connections.
// TODO: extralev.c:138 — miniwalk(): recursive room connection walk

// cf. extralev.c:192 — makeroguerooms(void): rogue-style level generation
// Generates a 3x3 grid of rooms with corridors in classic Rogue style.
// TODO: extralev.c:192 — makeroguerooms(): rogue-style room generation

// cf. extralev.c:277 — corr(x, y): set corridor location
// Randomly sets a map location to regular or secret corridor.
// TODO: extralev.c:277 — corr(): corridor placement

// cf. extralev.c:287 — makerogueghost(void): place ghost in rogue level
// Creates a ghost monster with appropriate equipment in a random room.
// TODO: extralev.c:287 — makerogueghost(): rogue ghost creation
