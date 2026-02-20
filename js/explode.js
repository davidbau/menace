// explode.js -- Explosion effects
// cf. explode.c — explosionmask, engulfer_explosion_msg, explode,
//                 scatter, splatter_burning_oil, explode_oil,
//                 adtyp_to_expltype, mon_explodes
//
// explode.c handles all explosion mechanics:
//   explode(x,y,type,dam,olet,expltype): center explosion at x,y;
//     display fireball animation, apply damage and effects to all in range.
//   scatter(sx,sy,blastforce,scflags,obj): scatter objects from blast site.
//   mon_explodes(mon,mattk): monster self-destructs with explosion.
//   explode_oil(obj,x,y): burning oil potion explodes.
//
// JS implementations: none — all explosion logic is runtime gameplay.

// cf. explode.c:25 [static] — explosionmask(m, adtyp, olet): shield effect check
// Determines which shield effects apply at location m for given damage type.
// TODO: explode.c:25 — explosionmask(): explosion shield determination

// cf. explode.c:117 [static] — engulfer_explosion_msg(adtyp, olet): engulfed-in-exploder message
// Generates message describing explosion effects on monster engulfing the player.
// TODO: explode.c:117 — engulfer_explosion_msg(): engulfer explosion message

// cf. explode.c:198 — explode(x, y, type, dam, olet, expltype): explosion
// Displays explosion animation and applies damage/effects centered at (x,y).
// TODO: explode.c:198 — explode(): explosion execution

// cf. explode.c:720 — scatter(sx, sy, blastforce, scflags, obj): scatter objects
// Flings objects from explosion site in random directions based on blast force.
// TODO: explode.c:720 — scatter(): object scattering from explosion

// cf. explode.c:959 — splatter_burning_oil(x, y, diluted_oil): oil splatter
// Performs regular explosion to splatter burning oil from given coordinates.
// TODO: explode.c:959 — splatter_burning_oil(): burning oil splatter

// cf. explode.c:971 — explode_oil(obj, x, y): oil potion explosion
// Extinguishes a lit oil potion and explodes it as burning oil.
// TODO: explode.c:971 — explode_oil(): oil potion explosion

// cf. explode.c:984 — adtyp_to_expltype(adtyp): damage type to explosion display
// Converts attack damage type to visual explosion display type.
// TODO: explode.c:984 — adtyp_to_expltype(): explosion display type mapping

// cf. explode.c:1016 — mon_explodes(mon, mattk): monster explosion attack
// Handles monster self-destruct explosion with visual effects; always kills attacker.
// TODO: explode.c:1016 — mon_explodes(): monster explosion
