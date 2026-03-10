// track.js -- Player tracking (for pets)
// Faithful port of track.c from NetHack 3.7.
//
// Circular buffer recording player positions for pet pathfinding.
// Pets use gettrack() to find nearby hero footprints when deciding where to move.

// cf. track.c:9
const UTSZ = 100;

let utrack = new Array(UTSZ).fill(null).map(() => ({ x: 0, y: 0 }));
let utcnt = 0;
let utpnt = 0;

// cf. track.c:15
export function initrack() {
    utcnt = utpnt = 0;
    utrack = new Array(UTSZ).fill(null).map(() => ({ x: 0, y: 0 }));
}

// cf. track.c:24 — add to track
// Autotranslated from track.c:23
export function settrack(player) {
  if (utcnt < UTSZ) utcnt++;
  if (utpnt === UTSZ) utpnt = 0;
  utrack[utpnt].x = player.x;
  utrack[utpnt].y = player.y;
  utpnt++;
}

// cf. track.c:38 — get a track coord on or next to x,y last tracked by hero
// Returns the track entry if distmin=1 (adjacent), null if distmin=0 (same pos) or not found.
export function gettrack(x, y) {
    let cnt = utcnt;
    let idx = utpnt;
    while (cnt-- > 0) {
        if (idx === 0) idx = UTSZ - 1;
        else idx--;
        const tc = utrack[idx];
        const ndist = Math.max(Math.abs(x - tc.x), Math.abs(y - tc.y)); // distmin
        if (ndist <= 1) return ndist ? tc : null;
    }
    return null;
}

// cf. track.c:59 — return true if x,y has hero tracks on it
// Autotranslated from track.c:58
export function hastrack(x, y) {
    for (let i = 0; i < utcnt; i++) {
        if (utrack[i].x === x && utrack[i].y === y)
            return true;
    }
    return false;
}

export function save_track(nhfp) {
    if (!nhfp || typeof nhfp !== 'object') return;
    nhfp.trackState = {
        utcnt,
        utpnt,
        utrack: utrack.slice(0, utcnt).map((c) => ({ x: c.x, y: c.y })),
    };
    if (nhfp.releaseData) initrack();
}

export function rest_track(nhfp) {
    const state = nhfp?.trackState;
    if (!state) return;
    const nextCnt = Number(state.utcnt || 0);
    const nextPnt = Number(state.utpnt || 0);
    if (nextCnt > UTSZ || nextPnt > UTSZ) {
        throw new Error('rest_track: impossible pt counts');
    }
    initrack();
    utcnt = nextCnt;
    utpnt = nextPnt;
    const src = Array.isArray(state.utrack) ? state.utrack : [];
    for (let i = 0; i < utcnt && i < src.length; i++) {
        utrack[i].x = Number(src[i].x || 0);
        utrack[i].y = Number(src[i].y || 0);
    }
}
