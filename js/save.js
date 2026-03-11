// save.js -- Game state serialization and save-file management
// cf. save.c — dosave, dosave0, savegamestate, savelev, savelev_core,
//              savelevl, saveobj, saveobjchn, savemon, savemonchn,
//              savetrapchn, savecemetery, savedamage, save_stairs,
//              save_bubbles, save_bc, savefruitchn, savelevchn,
//              store_plname_in_file, save_msghistory, save_gamelog,
//              free_dungeons, freedynamicdata, tricked_fileremoved,
//              savestateinlock
//
// save.c serializes the entire game state to a save file using NHFILE I/O.
// It operates in three modes (WRITING, COUNTING, FREEING) controlled by
// the Sfo_* family of macros. The save format is versioned binary.
//
// Key components saved:
//   - Version and player identity (store_plname_in_file)
//   - Global game state: flags, context, player stats, inventory (savegamestate)
//   - Per-level data: terrain, monsters, objects, traps, engravings (savelev_core)
//   - Dungeon structure: stairways, bubbles, cemetery, damage (save_stairs etc.)
//   - Auxiliary chains: fruit names, special levels, message history, gamelog
//
// N/A: JS port uses storage.js (localStorage/IndexedDB) with a different
//   format — no direct equivalents to these file-based save functions.
//   Memory management (freedynamicdata, free_dungeons) is handled by GC.
import { tmp_at } from './animation.js';
import { DISP_FREEMEM,
    ONAME, MGIVENNAME, EGD, EPRI, ESHK, EMIN, EDOG, EBONES, MCORPSENM } from './const.js';
import { pushRngLogEntry } from './rng.js';
import { monsndx } from './mondata.js';
import { pline, pline1 } from './pline.js';

// C serialization macros — stubs (JS uses storage.js, not binary save files)
function release_data(nhfp) { return false; }
function Sfo_int() {}
function Sfo_obj() {}
function Sfo_monst() {}
function Sfo_char() {}
function Sfo_unsigned() {}
function Sfo_egd() {}
function Sfo_epri() {}
function Sfo_eshk() {}
function Sfo_emin() {}
function Sfo_edog() {}
function Sfo_ebones() {}

// cf. save.c:42 — dosave(): player-facing #save command
// Prompts player to confirm; calls dosave0(); handles quit-to-save logic.
// N/A: save.c:42 — dosave() (JS uses storage.js)

// cf. save.c:74 — dosave0(): core save orchestrator
// Writes version, player name, current level, game state, all other levels.
// Uses tricked_fileremoved() to detect file tampering.
// Returns 1 on success, 0 on failure.
// N/A: save.c:74 — dosave0() (JS uses storage.js)

// cf. save.c:237 — save_gamelog(nhfp): serialize gamelog to file
// Writes game event history entries; optionally frees memory in FREEING mode.
// N/A: save.c:237 — save_gamelog() (no save file system)

// cf. save.c:265 — savegamestate(nhfp): serialize global game state
// Saves player stats, flags, context, inventory, monsters, artifacts, spells,
//   discoveries, dungeon structure, coin count, and timing data.
// N/A: save.c:265 — savegamestate() (no save file system)

// cf. save.c:329 — tricked_fileremoved(nhfp, name): detect save file tampering
// Checks if save file was removed unexpectedly; calls done(TRICKED) if so.
// N/A: save.c:329 — tricked_fileremoved() (no save file system)

// cf. save.c:343 — savestateinlock(): periodic checkpoint save
// Saves current game state to a lock file for recovery after crashes.
// Called periodically during gameplay (ifdef INSURANCE).
// N/A: save.c:343 — savestateinlock() (no save file system)

// cf. save.c:421 — savelev(nhfp, lev): save a dungeon level
// Wrapper for savelev_core() that manages uz_save state for the level.
// N/A: save.c:421 — savelev() (no save file system)

// cf. save.c:444 — savelev_core(nhfp, lev): core level serialization
// Saves bones data, map grid, monsters, objects, traps, engravings, damage,
//   regions, and air bubbles for one dungeon level.
// N/A: save.c:444 — savelev_core() (no save file system)

// cf. save.c:560 — savelevl(nhfp): save 2D map grid
// Writes COLNO × ROWNO levl[][] terrain cells to file.
// N/A: save.c:560 — savelevl() (no save file system)

// cf. save.c:574 — save_bubbles(nhfp, lev): save air bubbles and clouds
// Saves bubbles on the Plane of Water / clouds on the Plane of Air.
// N/A: save.c:574 — save_bubbles() (no save file system)

// cf. save.c:600 — savecemetery(nhfp, cemetery): save cemetery/bones info
// Saves ghost monster data (bones files) linked to the level.
// N/A: save.c:600 — savecemetery() (no save file system)

// cf. save.c:623 — savedamage(nhfp): save pending shop damage list
// Saves list of shop wall/floor damage pending repair.
// N/A: save.c:623 — savedamage() (no save file system)

// cf. save.c:648 — save_stairs(nhfp): save stairway positions and metadata
// Writes stair positions, up/down flags, and dungeon destination levels.
// N/A: save.c:648 — save_stairs() (no save file system)

// cf. save.c:679 — save_bc(nhfp): save ball and chain state
// Saves ball & chain if in unusual location (not on floor or in inventory).
// N/A: save.c:679 — save_bc() (no save file system)

// cf. save.c:709 — saveobj(nhfp, obj): save a single object
// Writes object struct + extensions (name string, oextra data, contained monster,
//   mail command). Uses Sfo_* macros with WRITING/COUNTING/FREEING modes.
// N/A: save.c:709 — saveobj() (no save file system)

// cf. save.c:745 — saveobjchn(nhfp, chain): save an object chain (linked list)
// Recursively saves all objects in chain including container contents.
// Frees objects in FREEING mode; writes null-terminator at end.
// N/A: save.c:745 — saveobjchn() (no save file system)

// cf. save.c:809 — savemon(nhfp, mon): save a single monster
// Writes monster struct + extensions (name, guard/priest/shopkeeper/pet data).
// N/A: save.c:809 — savemon() (no save file system)

// cf. save.c:862 — savemonchn(nhfp, chain): save a monster chain (linked list)
// Recursively saves all monsters and their inventories; frees in FREEING mode.
// N/A: save.c:862 — savemonchn() (no save file system)

// cf. save.c:898 — savetrapchn(nhfp, chain): save trap chain
// Writes all trap structs in the linked list.
// N/A: save.c:898 — savetrapchn() (no save file system)

// cf. save.c:929 — savefruitchn(nhfp): save fruit name chain
// Writes fruit name/ID pairs (used in bones-file identification).
// N/A: save.c:929 — savefruitchn() (no save file system)

// cf. save.c:952 — savelevchn(nhfp): save special level chain
// Writes s_level structs describing special levels (Sokoban, Mines, etc.).
// N/A: save.c:952 — savelevchn() (no save file system)

// cf. save.c:977 — store_plname_in_file(nhfp): write player name with suffix
// Writes player name + role/race/gender/alignment suffix for menu-based restore.
// N/A: save.c:977 — store_plname_in_file() (no save file system)

// cf. save.c:1008 — save_msghistory(nhfp): save message history
// Writes recent message history from window port to save file.
// N/A: save.c:1008 — save_msghistory() (no save file system)

// cf. save.c:1038 — free_dungeons(): free dungeon data structures
// Frees all dungeon branch and level data (ifdef FREE_ALL_MEMORY).
// N/A: save.c:1038 — free_dungeons() (JS uses GC)

// cf. save.c:1055 — freedynamicdata(): free all dynamically allocated memory
// Comprehensive cleanup of: menu colors, inventory buffers, timers, option
//   strings, dungeon structures, artifact list, etc.
// Called before exit to ensure clean memory state.
export function freedynamicdata() {
    // C parity: clear any lingering tmp_at transient display state.
    tmp_at(DISP_FREEMEM, 0);
}

// Autotranslated from save.c:236
// N/A: C binary save format — JS uses storage.js for persistence
export function save_gamelog(nhfp) {
}

// Autotranslated from save.c:328
export async function tricked_fileremoved(nhfp, whynot) {
  if (!nhfp) {
    pushRngLogEntry(`^trick[${whynot ? String(whynot) : ''}]`);
    pline1(whynot);
    await pline("Probably someone removed it.");
    svk.killer.name = whynot;
    await done(TRICKED);
    return true;
  }
  return false;
}

// Autotranslated from save.c:559
export function savelevl(nhfp, map) {
  let x, y;
  for (x = 0; x < COLNO; x++) {
    for (y = 0; y < ROWNO; y++) {
      Sfo_rm(nhfp, map.locations[x][y], "location-rm");
    }
  }
  return;
}

// Autotranslated from save.c:573
export function save_bubbles(nhfp, lev) {
  let bbubbly;
  bbubbly = 0;
  if (lev === ledger_no( water_level) || lev === ledger_no( air_level)) bbubbly = lev;
  if (update_file(nhfp)) Sfo_xint8(nhfp, bbubbly, "bubbles-bbubbly");
  if (bbubbly) save_waterlevel(nhfp);
}

// Autotranslated from save.c:599
export function savecemetery(nhfp, cemeteryaddr) {
  let thisbones, nextbones, flag;
  flag = cemeteryaddr ? 0 : -1;
  if (update_file(nhfp)) { Sfo_int(nhfp, flag, "cemetery-cemetery_flag"); }
  nextbones = cemeteryaddr;
  while ((thisbones = nextbones) != null) {
    nextbones = thisbones.next;
    if (update_file(nhfp)) {
      Sfo_cemetery(nhfp, thisbones, "cemetery-bonesinfo");
    }
    // C free(): JS GC handles cleanup
  }
  if (release_data(nhfp)) cemeteryaddr = 0;
}

// Autotranslated from save.c:708
export function saveobj(nhfp, otmp) {
  let buflen, zerobuf = 0;
  buflen = 1; // sizeof placeholder (JS uses structured serialization)
  Sfo_int(nhfp, buflen, "obj-obj_length");
  Sfo_obj(nhfp, otmp, "obj");
  if (otmp.oextra) {
    buflen = ONAME(otmp) ?  ONAME(otmp).length + 1 : 0;
    Sfo_int(nhfp, buflen, "obj-oname_length");
    if (buflen > 0) {
      Sfo_char(nhfp, ONAME(otmp), "obj-oname", buflen);
    }
    if (otmp.oextra?.omonst) { savemon(nhfp, otmp.oextra.omonst); }
    else { Sfo_int(nhfp, zerobuf, "obj-omonst_length"); }
    buflen = otmp.oextra?.omailcmd ?  otmp.oextra.omailcmd.length + 1 : 0;
    Sfo_int(nhfp, buflen, "obj-omailcmd_length");
    if (buflen > 0) {
      Sfo_char(nhfp, otmp.oextra.omailcmd, "obj-omailcmd", buflen);
    }
    Sfo_unsigned(nhfp, otmp.oextra?.omid || 0, "obj-omid");
  }
}

// Autotranslated from save.c:808
export function savemon(nhfp, mtmp) {
  let buflen;
  mtmp.mtemplit = 0;
  buflen = 1; // sizeof placeholder (JS uses structured serialization)
  Sfo_int(nhfp, buflen, "monst-monst_length");
  Sfo_monst(nhfp, mtmp, "monst");
  if (mtmp.mextra) {
    buflen = MGIVENNAME(mtmp) ?  MGIVENNAME(mtmp).length + 1 : 0;
    Sfo_int(nhfp, buflen, "monst-mgivenname_length");
    if (buflen > 0) {
      Sfo_char(nhfp, MGIVENNAME(mtmp), "monst-mgivenname", buflen);
    }
    buflen = EGD(mtmp) ? 1 : 0;
    Sfo_int(nhfp, buflen, "monst-egd_length");
    if (buflen > 0) { Sfo_egd(nhfp, EGD(mtmp), "monst-egd"); }
    buflen = EPRI(mtmp) ? 1 : 0;
    Sfo_int(nhfp, buflen, "monst-epri_length");
    if (buflen > 0) { Sfo_epri(nhfp, EPRI(mtmp), "monst-epri"); }
    buflen = ESHK(mtmp) ? 1 : 0;
    Sfo_int(nhfp, buflen, "monst-eshk_length");
    if (buflen > 0) { Sfo_eshk(nhfp, ESHK(mtmp), "monst-eshk"); }
    buflen = EMIN(mtmp) ? 1 : 0;
    Sfo_int(nhfp, buflen, "monst-emin_length");
    if (buflen > 0) { Sfo_emin(nhfp, EMIN(mtmp), "monst-emin"); }
    buflen = EDOG(mtmp) ? 1 : 0;
    Sfo_int(nhfp, buflen, "monst-edog_length");
    if (buflen > 0) { Sfo_edog(nhfp, EDOG(mtmp), "monst-edog"); }
    buflen = EBONES(mtmp) ? 1 : 0;
    Sfo_int(nhfp, buflen, "monst-ebones_length");
    if (buflen > 0) { Sfo_ebones(nhfp, EBONES(mtmp), "monst-ebones"); }
    buflen =  MCORPSENM(mtmp);
    Sfo_int(nhfp, buflen, "monst-mcorpsenm");
  }
}

// Autotranslated from save.c:861
export function savemonchn(nhfp, mtmp, game, player) {
  let mtmp2, minusone = -1;
  while (mtmp) {
    mtmp2 = mtmp.nmon;
    if (update_file(nhfp)) {
      mtmp.mnum = monsndx(mtmp.data);
      if (mtmp.ispriest) forget_temple_entry(mtmp);
      savemon(nhfp, mtmp);
    }
    if (mtmp.minvent) saveobjchn(nhfp, mtmp.minvent);
    if (release_data(nhfp)) {
      if (mtmp === game.svc.context.polearm.hitmon) {
        game.svc.context.polearm.m_id = mtmp.m_id;
        game.svc.context.polearm.hitmon = null;
      }
      if (mtmp === player.ustuck) player.ustuck_mid = player.ustuck.m_id;
      if (mtmp === player.usteed) player.usteed_mid = player.usteed.m_id;
      mtmp.nmon = null;
    }
    mtmp = mtmp2;
  }
  if (update_file(nhfp)) { Sfo_int(nhfp, minusone, "monst-monst_length"); }
}

// Autotranslated from save.c:928
export function savefruitchn(nhfp) {
  let zerofruit, f2, f1;
  f1 = gf.ffruit;
  while (f1) {
    f2 = f1.nextf;
    if (f1.fid >= 0 && update_file(nhfp)) { Sfo_fruit(nhfp, f1, "fruit"); }
    // C dealloc_fruit is free() — JS uses GC
    f1 = f2;
  }
  if (update_file(nhfp)) { Sfo_fruit(nhfp, zerofruit, "fruit"); }
  if (release_data(nhfp)) gf.ffruit = 0;
}

// Autotranslated from save.c:951
export function savelevchn(nhfp) {
  let tmplev, tmplev2, cnt = 0;
  for (tmplev = svs.sp_levchn; tmplev; tmplev = tmplev.next) {
    cnt++;
  }
  if (update_file(nhfp)) { Sfo_int(nhfp, cnt, "levchn-lev_count"); }
  for (tmplev = svs.sp_levchn; tmplev; tmplev = tmplev2) {
    tmplev2 = tmplev.next;
    if (update_file(nhfp)) { Sfo_s_level(nhfp, tmplev, "levchn-s_level"); }
    // C free(): JS GC handles cleanup
  }
  if (release_data(nhfp)) svs.sp_levchn = 0;
}

// Autotranslated from save.c:1037
export function free_dungeons() {
  let tnhfp = get_freeing_nhfile();
  savelevchn(tnhfp);
  save_dungeon(tnhfp, false, true);
  free_luathemes(all_themes);
  close_nhfile(tnhfp);
  return;
}
