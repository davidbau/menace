// vault.js -- Vault guard (Croesus) mechanics and vault corridors
// cf. vault.c — gold guard placement, corridor management, guard behavior
//
// Data model: Each vault guard has an `egd` (extra-guard-data) struct attached
// via mon->mextra (cast to egd_s). Key fields:
//   fakecorr[FCSIZ]  — array of temporary corridor segments {fx,fy,ftyp}
//   fcbeg, fcend     — range of active fakecorr entries
//   vroom            — room index of the vault being guarded
//   gdlevel          — dlevel where the vault is
//   warncnt          — how many times guard has warned hero
//   gddone           — flag: guard is done (gold retrieved or hero left)
//   ogx, ogy         — guard's original position (for parking)
// Vault corridors (fakecorr) are dynamically carved and restored.
// Partial JS support: vault room creation in dungeon.js; vault sound in
//   nethack.js:1790 and headless_runtime.js:1016; hidden_gold referenced
//   in u_init.js:1558,1622. No vault guard logic exists in JS yet.

// cf. vault.c:66 [static] — clear_fcorr(grd, forceall): restore fakecorr terrain
// Restores each fake corridor cell back to its original terrain type.
// forceall=TRUE restores all; otherwise only cells not occupied by hero/monster.
// TODO: vault.c:66 — clear_fcorr(): restore temporary vault corridor terrain

// cf. vault.c:103 [static] — blackout(x, y): remove any seen corridor from memory
// Sets display memory at (x,y) back to floor if it currently shows a corridor.
// TODO: vault.c:103 — blackout(): clear corridor visibility memory

// cf. vault.c:117 [static] — restfakecorr(grd): clear fake corridors that are now empty
// Calls clear_fcorr on empty corridor sections; blackouts remaining cells.
// TODO: vault.c:117 — restfakecorr(): peel back fake corridor from tail end

// cf. vault.c:153 [static] — parkguard(grd): move guard to "parked" position (0,0)
// Guard temporarily parks at <0,0> while corridor is being cleaned up.
// Calls remove_monster() and sets guard mx/my=0; rejoins fmon list later.
// TODO: vault.c:153 — parkguard(): move guard off map temporarily

// cf. vault.c:172 — newegd(): allocate a new egd_s struct (extra guard data)
// Zeroes the struct; does not attach it to any monster.
// TODO: vault.c:172 — newegd(): allocate egd (extra guard data)

// cf. vault.c:180 — free_egd(mtmp): free egd_s struct attached to a monster
// Frees mtmp->mextra->egd; sets it to null.
// TODO: vault.c:180 — free_egd(): free extra guard data

// cf. vault.c:188 — grddead(mtmp): called when a vault guard dies
// Restores all fake corridors (clear_fcorr forceall=TRUE), re-closes vault,
//   marks vault room as no longer guarded, frees egd via free_egd().
// TODO: vault.c:188 — grddead(): vault guard death cleanup

// cf. vault.c:221 — findgd(): find the first live vault guard on the level
// Scans fmon list for isgd monster. Returns pointer (or null if none).
// TODO: vault.c:221 — findgd(): find active vault guard

// cf. vault.c:234 [static] — in_fcorridor(grd, x, y): is (x,y) inside guard's fake corridor?
// Checks the fakecorr[fcbeg..fcend] range for matching coordinates.
// TODO: vault.c:234 — in_fcorridor(): test if coord is in fake corridor

// cf. vault.c:247 [static] — find_guard_dest(grd, x, y): set guard destination to enter vault
// Chooses entry point adjacent to vault room; sets guard's target mx/my.
// TODO: vault.c:247 — find_guard_dest(): pick vault approach destination

// cf. vault.c:271 [static] — move_gold(grd, vroom): move vault gold to guard's feet
// Collects all gold objects from vault floor, gives them to guard,
//   or drops them at guard position if returning gold.
// TODO: vault.c:271 — move_gold(): transfer gold between vault and guard

// cf. vault.c:296 [static] — wallify_vault(grd): close vault behind guard
// Restores wall terrain on vault opening after guard enters/exits.
// TODO: vault.c:296 — wallify_vault(): re-wall vault entrance

// cf. vault.c:312 — vault_summon_gd(x, y, typ): create a vault guard at position
// Creates a Kops (vault guard) via makemon; attaches egd; sets vroom, gdlevel.
// Sets guard's starting position and sets isgd flag.
// TODO: vault.c:312 — vault_summon_gd(): spawn vault guard monster

// cf. vault.c:354 — vault_occupied(room): is hero currently inside this vault room?
// Returns TRUE if hero's current room index matches room.
// TODO: vault.c:354 — vault_occupied(): check if hero is in vault

// cf. vault.c:363 — uleftvault(room): hero just left the vault room
// If hero had been in vault: trigger guard response (paygd if guard alive, etc.).
// TODO: vault.c:363 — uleftvault(): handle hero departing vault

// cf. vault.c:385 [static] — gd_mv_monaway(grd, mx, my): push non-guard monster out of corridor
// If another monster is blocking the corridor, tries to move it away.
// TODO: vault.c:385 — gd_mv_monaway(): clear corridor of blocking monsters

// cf. vault.c:413 [static] — gd_pick_corridor_gold(grd): guard picks up gold in corridor
// Guard collects any gold objects in its fake corridor cells.
// TODO: vault.c:413 — gd_pick_corridor_gold(): corridor gold collection

// cf. vault.c:430 [static] — gd_move_cleanup(grd, move_done): final guard move bookkeeping
// After guard movement: restore corridors, update hero/guard visibility,
//   possibly park guard if mission complete.
// TODO: vault.c:430 — gd_move_cleanup(): post-move corridor and state cleanup

// cf. vault.c:458 [static] — gd_letknow(grd): guard issues warning to hero
// Prints one of the guard's warning messages based on warncnt.
//   First warning: "I work for the dungeon national bank..."
//   Subsequent: escalating threats.
// TODO: vault.c:458 — gd_letknow(): vault guard warning message

// cf. vault.c:482 — invault(): is hero currently in a vault room?
// Checks hero's current room against vault room flags.
// Returns room index if in vault, -1 otherwise.
// TODO: vault.c:482 — invault(): check hero is in a vault room

// cf. vault.c:492 — gd_move(grd): main vault guard AI movement function
// Called each turn; manages guard state machine:
//   - carves fake corridor toward hero
//   - warns hero (gd_letknow) with warncnt
//   - escorts hero to vault exit
//   - retrieves gold if hero left gold behind
//   - returns gold to vault and closes up
// TODO: vault.c:492 — gd_move(): vault guard AI (main movement/behavior)

// cf. vault.c:827 — paygd(): process hero's gold payment to vault guard
// If hero has enough gold (matches gold_paid from gd_move interaction),
//   guard takes gold and leaves. Otherwise guard attacks or ejects hero.
// TODO: vault.c:827 — paygd(): hero pays vault guard toll

// cf. vault.c:900 — hidden_gold(guess): count gold in vaults or off-map
// Returns total gold value hidden in vault rooms or buried.
// guess=TRUE: use approximation. Called from financial_status in u_init.js.
// Referenced in u_init.js:1558 and u_init.js:1622.
// TODO: vault.c:900 — hidden_gold(): count vault and buried gold

// cf. vault.c:921 — gd_sound(): make ambient vault sounds
// Called periodically when has_vault is set; rn2(200) chance per turn.
// Prints "You hear the chinkling of coins." or similar.
// Partially implemented: the rn2(200) trigger exists in nethack.js:1790
//   and headless_runtime.js:1016, but sound message not printed there.
// TODO: vault.c:921 — gd_sound(): vault ambient sound message

// cf. vault.c:942 — vault_gd_watching(which): check if guard is watching hero
// Returns TRUE if a vault guard has line-of-sight to hero.
// which=0: any guard; which=1: specific guard.
// TODO: vault.c:942 — vault_gd_watching(): guard line-of-sight check
