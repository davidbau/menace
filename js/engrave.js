// engrave.js -- Engraving mechanics: Elbereth, write, tombstones
// cf. engrave.c — random_engraving, wipeout_text, can_reach_floor,
//                 cant_reach_floor, engr_at, sengr_at, u_wipe_engr,
//                 wipe_engr_at, engr_can_be_felt, read_engr_at,
//                 make_engr_at, del_engr_at, freehand, stylus_ok,
//                 u_can_engrave, doengrave_ctx_init, doengrave_sfx_item_WAN,
//                 doengrave_sfx_item, doengrave_ctx_verb, doengrave,
//                 engrave, blengr, sanitize_engravings, forget_engravings,
//                 engraving_sanity_check, save_engravings, rest_engravings,
//                 engr_stats, del_engr, rloc_engr, make_grave,
//                 disturb_grave, see_engraving, feel_engraving
//
// engrave.c handles all engraving mechanics:
//   doengrave(): the #engrave command — select stylus, prompt text, start occupation.
//   engrave(): occupation callback that engraves char by char.
//   make_engr_at(): create a new engraving at a location.
//   sengr_at("Elbereth",...): detect protective Elbereth engravings.
//   make_grave/disturb_grave: grave creation and disturbance.
//   save/rest_engravings: persistence across levels.
//
// JS implementations:
//   engrave_data.js: encrypted engrave/epitaph text data
//   engr_at/sengr_at → commands.js (partial, for Elbereth checking)
//   wipeout_text → commands.js:1507 wipeoutEngravingText (PARTIAL)
//   wipe_engr_at → commands.js:1522 wipeEngravingAt (PARTIAL)

// cf. engrave.c:51 — random_engraving(outbuf, pristine_copy): random engraving text
// Selects random engraving text from rumors or engrave file; degrades it.
// TODO: engrave.c:51 — random_engraving(): random engraving selection

// cf. engrave.c:120 — wipeout_text(engr, cnt, seed): degrade engraving
// Degrades cnt characters in engraving string via character rubout table.
// JS equiv: commands.js:1507 — wipeoutEngravingText() (PARTIAL)
// PARTIAL: engrave.c:120 — wipeout_text() ↔ commands.js:1507

// cf. engrave.c:187 — can_reach_floor(check_pit): can reach floor?
// Returns TRUE if hero can reach floor (not levitating, swallowed, stuck, etc.).
// TODO: engrave.c:187 — can_reach_floor(): floor reach check

// cf. engrave.c:218 — cant_reach_floor(x, y, up, check_pit, wand_engraving): explain unreachable
// Prints message explaining why hero can't reach floor or ceiling.
// TODO: engrave.c:218 — cant_reach_floor(): unreachable floor message

// cf. engrave.c:231 — engr_at(x, y): engraving at location
// Returns engraving struct at given coordinates, or null if none.
// TODO: engrave.c:231 — engr_at(): engraving lookup

// cf. engrave.c:251 — sengr_at(s, x, y, strict): find engraving with string
// Finds engraving at location containing string s (substring or exact match).
// TODO: engrave.c:251 — sengr_at(): engraving string search

// cf. engrave.c:264 — u_wipe_engr(cnt): wipe engraving at hero's location
// Wipes cnt characters from engraving at hero's position if reachable.
// TODO: engrave.c:264 — u_wipe_engr(): hero position engraving wipe

// cf. engrave.c:271 — wipe_engr_at(x, y, cnt, magical): wipe engraving
// Erodes cnt characters from engraving at given location.
// JS equiv: commands.js:1522 — wipeEngravingAt() (PARTIAL)
// PARTIAL: engrave.c:271 — wipe_engr_at() ↔ commands.js:1522

// cf. engrave.c:297 — engr_can_be_felt(ep): engraving can be felt?
// Returns TRUE if engraving type can be detected by blind characters.
// TODO: engrave.c:297 — engr_can_be_felt(): tactile engrave check

// cf. engrave.c:318 — read_engr_at(x, y): display engraving text
// Shows engraving text at location with appropriate sense message.
// TODO: engrave.c:318 — read_engr_at(): engraving text display

// cf. engrave.c:408 — make_engr_at(x, y, s, pristine_s, e_time, e_type): create engraving
// Creates new engraving with pristine and degraded text copies at location.
// TODO: engrave.c:408 — make_engr_at(): engraving creation

// cf. engrave.c:461 — del_engr_at(x, y): delete engraving
// Removes the engraving at given location.
// TODO: engrave.c:461 — del_engr_at(): engraving deletion

// cf. engrave.c:473 — freehand(void): player has free hand?
// Returns TRUE if player has a free hand to engrave with.
// TODO: engrave.c:473 — freehand(): free hand check

// cf. engrave.c:481 [static] — stylus_ok(obj): object is engraving stylus?
// Filter callback for getobj; rates objects as suitable engraving tools.
// TODO: engrave.c:481 — stylus_ok(): engraving tool filter

// cf. engrave.c:503 [static] — u_can_engrave(void): player can engrave?
// Checks if player is at a valid location for engraving.
// TODO: engrave.c:503 — u_can_engrave(): engrave location check

// cf. engrave.c:545 [static] — doengrave_ctx_init(de): init engrave context
// Initializes doengrave context structure with defaults.
// TODO: engrave.c:545 — doengrave_ctx_init(): engrave context initialization

// cf. engrave.c:583 [static] — doengrave_sfx_item_WAN(de): wand engraving effects
// Handles special wand effects during engraving (fire, lightning, digging, etc.).
// TODO: engrave.c:583 — doengrave_sfx_item_WAN(): wand engrave special effects

// cf. engrave.c:741 [static] — doengrave_sfx_item(de): object engraving effects
// Handles special effects for all object types used for engraving.
// TODO: engrave.c:741 — doengrave_sfx_item(): engrave object effects

// cf. engrave.c:895 [static] — doengrave_ctx_verb(de): engrave verb selection
// Sets verb phrasing for engraving prompt (write/engrave/burn/melt/scrawl).
// TODO: engrave.c:895 — doengrave_ctx_verb(): engrave verb

// cf. engrave.c:955 — doengrave(void): #engrave command handler
// Selects stylus, prompts for text, handles effects, starts engraving occupation.
// TODO: engrave.c:955 — doengrave(): engrave command handler

// cf. engrave.c:1266 — engrave(void): engraving occupation callback
// Gradually engraves text char by char; handles stylus wear and marker ink.
// TODO: engrave.c:1266 — engrave(): engrave occupation callback

// cf. engrave.c:1764 [static] — blengr(void): blind engraving text
// Returns encrypted blind-writing text for blind player engraving attempts.
// TODO: engrave.c:1764 — blengr(): blind engraving text

// cf. engrave.c:1497 — sanitize_engravings(void): remove control chars
// Removes terminal-disrupting characters from engravings when loading bones.
// TODO: engrave.c:1497 — sanitize_engravings(): engraving sanitization

// cf. engrave.c:1508 — forget_engravings(void): mark engravings as unread
// Marks all engravings as unseen/unread before saving bones.
// TODO: engrave.c:1508 — forget_engravings(): engraving reset for bones

// cf. engrave.c:1523 — engraving_sanity_check(void): validate engravings
// Checks all engravings have legal locations and accessible terrain.
// TODO: engrave.c:1523 — engraving_sanity_check(): engraving validation

// cf. engrave.c:1550 — save_engravings(nhfp): serialize engravings
// Writes engraving structures to save file.
// N/A: engrave.c:1550 — save_engravings() (JS uses storage.js)

// cf. engrave.c:1583 — rest_engravings(nhfp): deserialize engravings
// Reads engravings from save file.
// N/A: engrave.c:1583 — rest_engravings() (JS uses storage.js)

// cf. engrave.c:1625 — engr_stats(hdrfmt, hdrbuf, count, size): engraving stats
// Calculates memory usage statistics for engraving data.
// TODO: engrave.c:1625 — engr_stats(): engraving memory stats

// cf. engrave.c:1644 — del_engr(ep): remove engraving from list
// Removes engraving from linked list and frees memory.
// TODO: engrave.c:1644 — del_engr(): engraving list removal

// cf. engrave.c:1666 — rloc_engr(ep): relocate engraving randomly
// Moves engraving to a new valid location on the level.
// TODO: engrave.c:1666 — rloc_engr(): engraving relocation

// cf. engrave.c:1686 — make_grave(x, y, str): create headstone
// Creates headstone at location with epitaph text.
// TODO: engrave.c:1686 — make_grave(): headstone creation

// cf. engrave.c:1706 — disturb_grave(x, y): disturb a grave
// Summons ghoul when grave is disturbed by engraving or kicking.
// TODO: engrave.c:1706 — disturb_grave(): grave disturbance

// cf. engrave.c:1723 — see_engraving(ep): update engraving display
// Updates display symbol at engraving location.
// TODO: engrave.c:1723 — see_engraving(): engraving display update

// cf. engrave.c:1731 — feel_engraving(ep): feel engraving (blind)
// Marks engraving as read/revealed for engravings detectable by touch.
// TODO: engrave.c:1731 — feel_engraving(): tactile engraving detection
