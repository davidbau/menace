// lock.js -- Lock picking, door opening/closing, chest forcing
// cf. lock.c — picking_lock, picking_at, lock_action, picklock,
//              breakchestlock, forcelock, reset_pick, maybe_reset_pick,
//              autokey, pick_lock, u_have_forceable_weapon, doforce,
//              stumble_on_door_mimic, doopen, doopen_indir, obstructed,
//              doclose, boxlock, doorlock, chest_shatter_msg
//
// lock.c handles all lock manipulation mechanics:
//   doopen()/doclose(): #open and #close door commands.
//   pick_lock(): initiate lock-picking on door or container.
//   picklock(): occupation callback that picks the lock each turn.
//   doforce(): #force command — force a locked chest open with a weapon.
//   autokey(): find appropriate key/pick for auto-unlocking.
//   boxlock()/doorlock(): wand/spell effects on boxes and doors.
//
// JS implementations:
//   (none yet — lock/door mechanics not yet ported)

// cf. lock.c:17 — picking_lock(x, y): check if picking a lock
// Returns true if currently picking a lock and sets x,y to the target location.
// TODO: lock.c:17 — picking_lock(): active lock-picking check

// cf. lock.c:30 — picking_at(x, y): check if picking lock at location
// Returns true if currently picking the lock at the specified location.
// TODO: lock.c:30 — picking_at(): location lock-picking check

// cf. lock.c:38 [static] — lock_action(void): current lock-picking action description
// Returns a descriptive string for the current lock-picking action.
// TODO: lock.c:38 — lock_action(): lock action description

// cf. lock.c:68 [static] — picklock(void): lock-picking occupation callback
// Occupation callback that handles the lock-picking action each turn.
// TODO: lock.c:68 — picklock(): lock-picking turn callback

// cf. lock.c:162 — breakchestlock(box, destroyit): break chest lock
// Breaks a chest's lock, optionally destroying it and scattering contents.
// TODO: lock.c:162 — breakchestlock(): chest lock breaking

// cf. lock.c:216 [static] — forcelock(void): forced lock occupation callback
// Occupation callback that handles forcing a locked chest open.
// TODO: lock.c:216 — forcelock(): chest forcing turn callback

// cf. lock.c:259 — reset_pick(void): clear lock-picking context
// Clears the lock-picking context when the activity is abandoned.
// TODO: lock.c:259 — reset_pick(): lock-picking context reset

// cf. lock.c:269 — maybe_reset_pick(container): reset pick if container gone
// Clears lock-picking context if the container was deleted or level was changed.
// TODO: lock.c:269 — maybe_reset_pick(): conditional lock-picking reset

// cf. lock.c:289 — autokey(opening): find appropriate key
// Finds an appropriate key, pick, or card for automatic lock unlocking.
// TODO: lock.c:289 — autokey(): automatic key selection

// cf. lock.c:358 — pick_lock(pick, rx, ry, container): initiate lock-picking
// Initiates lock-picking on a door or container.
// TODO: lock.c:358 — pick_lock(): lock-picking initiation

// cf. lock.c:660 — u_have_forceable_weapon(void): check for force weapon
// Returns true if the hero is wielding a weapon suitable for forcing locks.
// TODO: lock.c:660 — u_have_forceable_weapon(): forceable weapon check

// cf. lock.c:676 — doforce(void): #force command handler
// Executes the #force command to force a locked chest open with a weapon.
// TODO: lock.c:676 — doforce(): chest force command

// cf. lock.c:759 — stumble_on_door_mimic(x, y): detect door mimic
// Detects and triggers a door mimic at a location if present.
// TODO: lock.c:759 — stumble_on_door_mimic(): door mimic detection

// cf. lock.c:773 — doopen(void): #open command handler
// Executes the #open command to open a door.
// TODO: lock.c:773 — doopen(): door open command

// cf. lock.c:780 — doopen_indir(x, y): open door at coordinates
// Opens a door in a specified direction or at specified coordinates.
// TODO: lock.c:780 — doopen_indir(): directed door opening

// cf. lock.c:926 [static] — obstructed(x, y, quietly): check location obstruction
// Returns true if a monster or object blocks the specified location.
// TODO: lock.c:926 — obstructed(): location obstruction check

// cf. lock.c:957 — doclose(void): #close command handler
// Executes the #close command to close a door.
// TODO: lock.c:957 — doclose(): door close command

// cf. lock.c:1056 — boxlock(obj, otmp): wand/spell effect on box
// Applies spell or wand effects to a box, handling locking/unlocking.
// TODO: lock.c:1056 — boxlock(): box lock/unlock spell effect

// cf. lock.c:1103 — doorlock(otmp, x, y): wand/spell effect on door
// Applies spell or wand effects to a door, handling locking/unlocking and secret doors.
// TODO: lock.c:1103 — doorlock(): door lock/unlock spell effect

// cf. lock.c:1276 [static] — chest_shatter_msg(otmp): chest shatter message
// Prints a message describing how an item inside a destroyed chest is destroyed.
// TODO: lock.c:1276 — chest_shatter_msg(): chest destruction message
