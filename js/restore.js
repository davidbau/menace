// restore.js -- Game state deserialization and save-file restoration
// cf. restore.c — dorecover, restgamestate, getlev, restlevelstate,
//                 restlevelfile, restlevchn, restdamage, restobj, restobjchn,
//                 restmon, restmonchn, rest_levl, rest_stairs, restcemetery,
//                 rest_bubbles, restore_gamelog, restore_msghistory,
//                 loadfruitchn, freefruitchn, ghostfruit,
//                 find_lev_obj, inven_inuse, trickery,
//                 get_plname_from_file, restore_menu,
//                 clear_id_mapping, add_id_mapping, lookup_id_mapping,
//                 reset_oattached_mids
//
// restore.c deserializes game state from a save file, the inverse of save.c.
// It uses Sfi_* macros (field-input) for reading, mirroring save.c's Sfo_*.
//
// Special concern: ghost/bones levels require ID remapping — monsters and
//   objects from a bones level have IDs from the original game that may
//   conflict with the current game. The add_id_mapping/lookup_id_mapping
//   system resolves this. reset_oattached_mids() updates embedded monster IDs
//   in corpse objects after remapping.
//
// Post-restore fixups: find_lev_obj() rebuilds the objects-by-position grid;
//   inven_inuse() completes actions (eating) interrupted by save;
//   restlevelstate() reconnects steed/engulfer pointers.
//
// N/A: JS port uses storage.js (localStorage/IndexedDB) with a different
//   format — no direct equivalents to these file-based restore functions.
//   Bones/ghost level handling is not yet implemented in JS.
import { pushRngLogEntry } from './rng.js';

// cf. restore.c:71 — find_lev_obj(): rebuild object-by-position grid
// Reconstructs svl.level.objects[x][y] by scanning all objects on the level.
// Called after restoring a level's objects.
// N/A: restore.c:71 — find_lev_obj() (no save file system)

// cf. restore.c:113 — inven_inuse(used): finish interrupted inventory actions
// Processes items marked "in_use" at save time (e.g., finish eating).
// Called after restoring inventory.
// N/A: restore.c:113 — inven_inuse() (no save file system)

// cf. restore.c:130 — restlevchn(nhfp): restore special level chain
// Reads s_level structs from file; reconstructs special level linked list.
// N/A: restore.c:130 — restlevchn() (no save file system)

// cf. restore.c:153 — restdamage(nhfp): restore shop damage list
// Reads pending damage entries; adjusts timestamps for ghost levels.
// N/A: restore.c:153 — restdamage() (no save file system)

// cf. restore.c:183 — restobj(nhfp, obj): restore a single object
// Reads object struct + extensions; reconstructs name, oextra, contained monster.
// N/A: restore.c:183 — restobj() (no save file system)

// cf. restore.c:231 — restobjchn(nhfp, ghostly): restore an object chain
// Reads object linked list recursively; handles ghost level ID remapping.
// ghostly=TRUE: applies add_id_mapping for bones-file objects.
// N/A: restore.c:231 — restobjchn() (no save file system)

// cf. restore.c:307 — restmon(nhfp, mon): restore a single monster
// Reads monster struct + extensions; reconstructs name and special structs
//   (guard/priest/shopkeeper/pet extra data).
// N/A: restore.c:307 — restmon() (no save file system)

// cf. restore.c:373 — restmonchn(nhfp): restore a monster chain
// Reads monster linked list with inventories; handles ghost ID remapping;
//   calls shopkeeper/priest setup for restored special monsters.
// N/A: restore.c:373 — restmonchn() (no save file system)

// cf. restore.c:465 — loadfruitchn(nhfp): load fruit name/ID chain
// Reads fruit name and ID pairs from file into fruit linked list.
// N/A: restore.c:465 — loadfruitchn() (no save file system)

// cf. restore.c:484 — freefruitchn(fruit): free fruit chain
// Frees all fruit struct nodes in the linked list.
// N/A: restore.c:484 — freefruitchn() (JS uses GC)

// cf. restore.c:497 — ghostfruit(obj): remap ghost-level fruit IDs
// Maps fruit IDs from a bones level to the current game's fruit list.
// Called during bones-level integration.
// N/A: restore.c:497 — ghostfruit() (no save file system)

// cf. restore.c:522 — restgamestate(nhfp): restore global game state
// Reads flags, context, player stats, inventory, monsters, artifacts, spells,
//   discoveries, dungeon structure; validates UID and authorization.
// N/A: restore.c:522 — restgamestate() (no save file system)

// cf. restore.c:734 — restlevelstate(): reconnect level-specific pointers
// Re-links steed and engulfer monster pointers for current level after restore.
// N/A: restore.c:734 — restlevelstate() (no save file system)

// cf. restore.c:747 — restlevelfile(lev): write restored level to level file
// After restoring from save, writes current level back to temp level file.
// N/A: restore.c:747 — restlevelfile() (no save file system)

// cf. restore.c:781 — dorecover(nhfp): main restore orchestrator
// Reads player name, current level, game state, all other levels;
//   calls post-restore fixups (find_lev_obj, inven_inuse, vision rebuild).
// N/A: restore.c:781 — dorecover() (no save file system)

// cf. restore.c:947 — rest_stairs(nhfp): restore stairway chain
// Reads stair positions; converts relative to absolute dungeon level numbers.
// N/A: restore.c:947 — rest_stairs() (no save file system)

// cf. restore.c:980 — restcemetery(nhfp, cemetery): restore cemetery/bones info
// Reads ghost monster data for this level's bones information.
// N/A: restore.c:980 — restcemetery() (no save file system)

// cf. restore.c:1013 — rest_levl(nhfp): restore 2D map grid
// Reads COLNO × ROWNO levl[][] terrain cells from file.
// N/A: restore.c:1013 — rest_levl() (no save file system)

// cf. restore.c:1027 — trickery(msg): end game for file inconsistency
// Calls done(TRICKED) with message when save file tampering detected.
// N/A: restore.c:1027 — trickery() (no save file system)

// cf. restore.c:1038 — getlev(nhfp, fd, lev): core level restoration
// Reads all level data: terrain, monsters, objects, traps, engravings,
//   timers; performs fixups for ghost/bones levels.
// N/A: restore.c:1038 — getlev() (no save file system)

// cf. restore.c:1308 — get_plname_from_file(nhfp, name, with_suffix): read player name
// Reads player name (optionally with role/race/gender/alignment suffix) from save.
// N/A: restore.c:1308 — get_plname_from_file() (no save file system)

// cf. restore.c:1339 — rest_bubbles(nhfp): restore air bubbles and clouds
// Reads bubbles (Plane of Water) and clouds (Plane of Air) from file.
// N/A: restore.c:1339 — rest_bubbles() (no save file system)

// cf. restore.c:1360 — restore_gamelog(nhfp): restore gamelog entries
// Reads game event history from save file.
// N/A: restore.c:1360 — restore_gamelog() (no save file system)

// cf. restore.c:1385 — restore_msghistory(nhfp): restore message history
// Reads recent messages from save file; restores to window port.
// N/A: restore.c:1385 — restore_msghistory() (no save file system)

// cf. restore.c:1417 — clear_id_mapping(): clear ghost-level ID mapping
// Resets object/monster ID mapping buckets for ghost-level restoration.
// N/A: restore.c:1417 — clear_id_mapping() (no save file system)

// cf. restore.c:1430 — add_id_mapping(oldid, newid): register ghost ID remap
// Records oldid → newid mapping for bones-file monster/object IDs.
// N/A: restore.c:1430 — add_id_mapping() (no save file system)

// cf. restore.c:1454 — lookup_id_mapping(oldid, newidp): find remapped ID
// Returns TRUE and sets *newidp if oldid was remapped during bones restoration.
// N/A: restore.c:1454 — lookup_id_mapping() (no save file system)

// cf. restore.c:1480 — reset_oattached_mids(ghostly): fix corpse monster IDs
// Updates monster IDs embedded in corpse objects after ghost-level ID remapping.
// N/A: restore.c:1480 — reset_oattached_mids() (no save file system)

// cf. restore.c:1506 — restore_menu(win): display saved game selection menu
// Shows list of saved games for player to choose from (ifdef SELECTSAVED).
// N/A: restore.c:1506 — restore_menu() (JS uses storage.js UI)

// Autotranslated from restore.c:306
export function restmon(nhfp, mtmp) {
  let buflen = 0, mc = 0;
  Sfi_monst(nhfp, mtmp, "monst");
  mtmp.nmon =  0;
  if (mtmp.mextra) {
    mtmp.mextra = newmextra();
    Sfi_int(nhfp, buflen, "monst-mgivenname_length");
    if (buflen > 0) {
      new_mgivenname(mtmp, buflen);
      Sfi_char(nhfp, MGIVENNAME(mtmp), "monst-mgivenname",  buflen);
    }
    Sfi_int(nhfp, buflen, "monst-egd_length");
    if (buflen > 0) { newegd(mtmp); Sfi_egd(nhfp, EGD(mtmp), "monst-egd"); }
    Sfi_int(nhfp, buflen, "monst-epri_length");
    if (buflen > 0) { newepri(mtmp); Sfi_epri(nhfp, EPRI(mtmp), "monst-epri"); }
    Sfi_int(nhfp, buflen, "monst-eshk_length");
    if (buflen > 0) { neweshk(mtmp); Sfi_eshk(nhfp, ESHK(mtmp), "monst-eshk"); }
    Sfi_int(nhfp, buflen, "monst-emin_length");
    if (buflen > 0) { newemin(mtmp); Sfi_emin(nhfp, EMIN(mtmp), "monst-emin"); }
    Sfi_int(nhfp, buflen, "monst-edog_length");
    if (buflen > 0) {
      newedog(mtmp);
      Sfi_edog(nhfp, EDOG(mtmp), "monst-edog");
      if (EDOG(mtmp).apport <= 0) { EDOG(mtmp).apport = 1; }
    }
    Sfi_int(nhfp, buflen, "monst-ebones_length");
    if (buflen > 0) { newebones(mtmp); Sfi_ebones(nhfp, EBONES(mtmp), "monst-ebones"); }
    Sfi_int(nhfp, mc, "monst-mcorpsenm");
    if (mtmp.mextra) mtmp.mextra.mcorpsenm = mc;
  }
}

// Autotranslated from restore.c:464
export function loadfruitchn(nhfp) {
  let flist, fnext;
  flist = 0;
  for (; ; ) {
    fnext = { fname: '', fid: 0, nextf: null };
    Sfi_fruit(nhfp, fnext, "fruit");
    if (fnext.fid !== 0) { fnext.nextf = flist; flist = fnext; }
    else {
      break;
    }
  }
  return flist;
}

// Autotranslated from restore.c:483
export function freefruitchn(flist) {
  // C dealloc_fruit is free() — JS uses GC, nothing to do
}

// Autotranslated from restore.c:979
export function restcemetery(nhfp, cemeteryaddr) {
  let bonesinfo, bonesaddr, cflag = 0;
  Sfi_int(nhfp, cflag, "cemetery-cemetery_flag");
  if (cflag === 0) {
    bonesaddr = cemeteryaddr;
    do {
      bonesinfo = { next: null };
      Sfi_cemetery(nhfp, bonesinfo, "cemetery-bonesinfo");
       bonesaddr = bonesinfo;
      bonesaddr = ( bonesaddr).next;
    } while ( bonesaddr);
  }
  else { cemeteryaddr = 0; }
  if (((nhfp.mode & CONVERTING) !== 0) || ((nhfp.mode & UNCONVERTING) !== 0)) {
    let thisbones, nextbones;
    nextbones = cemeteryaddr;
    while ((thisbones = nextbones) != null) {
      nextbones = thisbones.next;
    }
     cemeteryaddr = 0;
  }
}

// Autotranslated from restore.c:1012
export function rest_levl(nhfp, map) {
  let c, r;
  for (c = 0; c < COLNO; ++c) {
    for (r = 0; r < ROWNO; ++r) {
      Sfi_rm(nhfp, map.locations[c][r], "location-rm");
    }
  }
}

// Autotranslated from restore.c:1026
export async function trickery(reason) {
  pushRngLogEntry(`^trick[${reason ? String(reason) : ''}]`);
  await pline("Strange, this map is not as I remember it.");
  await pline("Somebody is trying some trickery here...");
  await pline("This game is void.");
  svk.killer.name = reason ? reason : "";
  await done(TRICKED);
}

// Autotranslated from restore.c:1339
export async function rest_bubbles(nhfp) {
  let bbubbly;
  bbubbly = 0;
  Sfi_xint8(nhfp, bbubbly, "bubbles-bbubbly");
  if (bbubbly) await restore_waterlevel(nhfp);
}

// Autotranslated from restore.c:1480
export function reset_oattached_mids(ghostly) {
  let otmp, oldid, nid;
  for (otmp = fobj; otmp; otmp = otmp.nobj) {
    if (ghostly && has_omonst(otmp)) {
      let mtmp = otmp.oextra?.omonst;
      mtmp.m_id = 0;
      mtmp.mpeaceful = mtmp.mtame = 0;
    }
    if (ghostly && has_omid(otmp)) {
      oldid = otmp.oextra?.omid;
      if (lookup_id_mapping(oldid, nid)) { if (otmp.oextra) otmp.oextra.omid = nid; }
      else {
        free_omid(otmp);
      }
    }
  }
}

// Autotranslated from restore.c:129
export function restlevchn(nhfp) {
  let cnt = 0, tmplev, x;
  svs.sp_levchn =  0;
  Sfi_int(nhfp, cnt, "levchn-lev_count");
  for (cnt > 0; cnt--; ) {
    tmplev = { next: null };
    Sfi_s_level(nhfp, tmplev, "levchn-s_level");
    if (!svs.sp_levchn) svs.sp_levchn = tmplev;
    else {
      for (x = svs.sp_levchn; x.next; x = x.next) {
      }
      x.next = tmplev;
    }
    tmplev.next =  0;
  }
}
