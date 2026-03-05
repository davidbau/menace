# SPOILER_UPDATES.md — Edit Plan for `spoilers/guide.md`

This document is a comprehensive review of what needs to change in `spoilers/guide.md` to
make it fully current for NetHack 3.7.0. It is an edit plan: read it, refine it, then
use it as a blueprint for editing the guide.

For each change, draft text is provided in the guide's voice so the edit can be made
without having to reconstruct tone from scratch.

**Structure:**
- [Part A: Section-by-section edits to existing guide content](#part-a-section-by-section-edits)
- [Part B: New sections and subsections to add](#part-b-new-sections-to-add)
- [Part C: Draft text — Returning Players appendix](#part-c-returning-players-appendix-draft)
- [Verification Checklist](#verification-checklist)

---

## Part A: Section-by-Section Edits

### A1. Table of Contents (line ~98)

**Change:** `— What's new since 3.4.3` → `— What's new in 3.7.0 vs 3.6.x`

**Also add** a new appendix entry for the Returning Players section (Part C).

---

### A2. The Roles → Valkyrie (line ~205)

**What to change:** The current text sends readers toward fountain-dipping for
Excalibur without giving the actual odds, which matter enormously. Non-Knights now
have a 1-in-30 chance per dip. Knights still get 1-in-6. A lawful Valkyrie who
shows up at a fountain expecting Excalibur to materialize promptly will be there
a while.

**Replace** the current Excalibur paragraph with:

> If you're lawful, you can find a long sword and dip it in a fountain at experience
> level 5 or higher for a chance at Excalibur — but "a chance" is doing some work
> in that sentence. Non-Knights get a 1-in-30 probability per dip. Knights get
> 1-in-6. If you're a lawful Valkyrie with a long sword and nothing but time and
> fountains, budget for a long afternoon. If Excalibur doesn't materialize,
> keep moving; a well-enchanted mundane long sword will carry you through the early
> game just fine.

---

### A3. The Roles → Priest (line ~171)

**What to change:** Priests now have a reliable path to a very good artifact weapon
early. Demonbane — the guaranteed first sacrifice gift for Priests — is now a silver
mace, which aligns with Priest weapon skills. This belongs in the Priest role
description.

**Add after** "Priests are competent fighters with access to clerical spells and
begin with a mace":

> There's also a gift waiting at the first altar. Demonbane, now a silver mace,
> is the guaranteed first sacrifice gift for Priests — the gods have apparently
> decided that someone who starts the game knowing what everything's blessed or
> cursed status is deserves a matching weapon. The silver mace type aligns with
> Priest weapon skills, which means you actually want what you'll receive.
> Sacrifice early, sacrifice often. The altar is your friend, and it has presents.

---

### A4. The Roles → Wizard (line ~215)

**What to change:** In 3.7, Wizards gain a systematic spellbook identification
bonus from advancing spell school skills. This is a meaningful advantage that
belongs in the Wizard role description — it changes how you think about skill
investment.

**Add after** "You'll lean heavily on your spells and need to find ways to avoid
melee combat until you're strong enough to dominate it":

> One bookkeeping advantage that's easy to overlook: in current editions, advancing
> a spell school skill automatically reveals the appearances of spellbooks in that
> school. Reach Expert in attack magic and you'll know what every attack spellbook
> looks like at a glance. This means training your spell skills has identification
> value on top of casting power — a reason to specialize deliberately rather than
> spreading ranks around. The dungeon is full of books you'd love to read; now
> you can tell which ones they are without risking your sanity on the wrong one.

---

### A5. A Field Guide to Dungeon Fauna (line ~1214)

#### Gold dragon and dragon table overhaul

**What to change:** Four new species exist in 3.7 that the fauna tables don't mention
(gold dragon, baby gold dragon, displacer beast, genetic engineer). Additionally, the
`D`-class description is too sparse and misses strategically important per-color
properties.

**Replace** the current `D` entry (currently just "Each color has a different breath
weapon and resistance. Gray dragons are prized for scale mail.") with:

> Dragons deserve a full briefing. Each color has its own breath weapon, resistance,
> scale mail property, and degree of desire to kill you specifically. The summary:
>
> **Gray** dragon scale mail grants magic resistance — the most important defensive
> property in the game, full stop. Gray dragons are the ones you most want to
> kill for their skin, and also the ones most likely to make you regret trying.
>
> **Silver** dragon scale mail grants reflection. The second pillar of not dying
> to wands.
>
> **Gold** dragons are new in current editions and come with a surprise: their
> scale mail provides a built-in light source (2-square radius). Wearing gold
> dragon scale mail means you never need a lamp again. It also provides two
> resistances. If your lamp budget is eating into your ascension kit, gold
> dragon scale mail is the solution.
>
> **Black** dragons now have a passive disintegration attack in melee — stay
> ranged. Their scale mail grants drain resistance.
>
> **Green** dragon scale mail grants sickness immunity, which is niche but
> occasionally the niche that saves you.
>
> All other colors follow the same logic: kill them for their scales, respect
> their breath weapon, and don't let them breathe on your spellbooks.

#### Displacer beast (add to fauna table)

**Add** to the feline/mid-dungeon threats table:

> **Displacer beast** (`f`). The name says it: this creature's apparent position
> is offset from where it actually stands. Every swing aimed at the image
> misses. The trick, once you know it, is to attack the empty square where the
> image *isn't* — the monster occupies the other one. Before you know it, you
> will swing at something, miss, wonder how, and then read this entry again.

*(TODO: verify exact symbol in `nethack-c/upstream/src/monst.c` before publishing.)*

#### Genetic engineer (add to "Things You Don't Want to Meet")

> **Genetic engineer** (`@`). Alone, a manageable humanoid. Given time, a factory
> for monsters that are worse than whatever it made them from. The genetic engineer
> creates chimeras — hybrid creatures that combine the attack patterns of two
> different species. The unpleasant combinations are left as an exercise for your
> first encounter. Kill genetic engineers before they go to work. They are a
> priority target on any floor you share with them.

*(TODO: verify symbol and chimera mechanics in `monst.c` and `muse.c` before publishing.)*

#### Centaurs — kiting note

**Replace** the current centaur entry ("Fast, good archers. Mountain centaurs hit
hard.") with:

> **Centaurs** (`C`). Fast archers who have learned, in current editions, to back
> away when you approach. The old tactic of simply walking toward a centaur to
> neutralize its archery doesn't work anymore — it will retreat to maintain range.
> Mountain centaurs are the worst: fast, powerful, and determined to stay just
> far enough away to keep shooting. Use corners to cut off their retreat, or
> bring ranged options of your own.

---

### A6. Making Friends → Keeping Your Pet Alive (line ~1547)

**What to change:** Two significant 3.7 mechanics aren't covered in the pet section:
pets gain resistances from corpses, and dead pets can be revived at altars.

**Add at the end of "Keeping Your Pet Alive":**

> Current editions have added two things that veteran pet-owners should know.
>
> First: your pet eats for a reason beyond loyalty. The same corpse mechanics that
> grant you resistances apply to pets as well. A pet that dines on the right
> monsters will gain resistances — fire resistance, cold resistance, whatever the
> dungeon's terrible buffet was offering. A well-fed pet is also a better-armored
> one. This is not something you can reliably engineer, but it's a reason to let
> your pet eat rather than scooping up every corpse yourself.
>
> Second, and more importantly: pets can now be revived. If your companion falls
> in battle, stand on its corpse at a co-aligned altar and pray. The gods, in
> their occasional mercy, may return it to you. This is a last-resort miracle, not
> a renewable strategy — your prayer timeout, your alignment, and a certain
> amount of luck all factor in. But it means that the large cat you've carried
> since level 3, the one who has earned names and battle scars and the terrified
> respect of every dungeon denizen you've walked past, is worth a detour to the
> nearest temple before you write it off. The dungeon kept this secret for a long
> time. Now you know.

---

### A7. The Apothecary → Alchemy (line ~2157)

**What to change:** The section needs two 3.7 changes added: diluted stacks only
alchemize 2 at a time (the bulk-conversion play is dead), and an alchemy smock
reduces explosion risk substantially.

**Replace** the current explosion-warning paragraph with:

> **A note on the current state of dungeon chemistry.** The old alchemy
> trick — dilute a large stack of potions by dipping them in water, then convert
> the whole diluted stack at once — no longer works. Current editions cap diluted
> dips at two potions per operation. The chain from healing up to gain ability
> is still there; you just do it in small batches with undiluted inputs. Think of
> it as artisanal alchemy rather than industrial production.
>
> The explosion risk is real: roughly 10% on any non-water combination. An alchemy
> smock — if you find one — reduces this to about 1 in 30, which is the
> difference between "risky hobby" and "acceptable profession." Do your chemistry
> in an isolated room, away from your stash, and never use a cursed potion as a
> dipping target. Cursed targets always explode. The dungeon is consistent about
> this if nothing else.

---

### A8. Wands → Key Wands: add make invisible entry (line ~2329)

**What to change:** The wand of make invisible is missing from the Key Wands
section, and its behavior changed significantly in 3.7. Self-zapping no longer
grants a permanent intrinsic.

**Add** to the Key Wands section:

> **Make invisible.** Turns a target — or yourself, if you zap it reflexively —
> invisible. In older editions, self-zapping granted a permanent invisibility
> intrinsic, which made this a coveted find. In current editions, it gives you
> 31–45 turns of temporary invisibility. Still useful for slipping through a
> dangerous area or turning a fight in your favor, but not a permanent upgrade.
> For lasting invisibility, you want a ring of invisibility or a cloak. The wand
> is now a tactical tool rather than a build enabler — think of it as "invisibility
> on demand for the next minute" rather than "invisibility forever from one lucky
> find."

---

### A9. Wands → Identification by Engraving (line ~2367)

**What to change:** Cursed wands may now explode when used to engrave. Players
who rely on the engrave-test protocol as their primary wand-sorting method need to
know this before they test a cursed wand.

**Add** at the start of the "Identification by Engraving" section, before the
protocol explanation:

> One precaution before you start writing on the floor: in current editions, a
> *cursed* wand used for engraving may explode. This puts a premium on knowing a
> wand's BUC status before you test it. A scroll of identify spent on an unknown
> wand you're about to engrave-test is not a waste — it's cheaper than the
> alternative, which is standing in a crater where your engrave station used to be.
> BUC-test at an altar, use a potion of holy water on the wand, or apply a scroll
> of identify first. Then engrave to your heart's content.

---

### A10. Rings → Aggravate monster (line ~2467)

**What to change:** The ring is listed as "Bad (auto-curse)" with no further
commentary. In 3.7 it has a meaningful strategic use: it significantly raises
effective dungeon difficulty for monster generation, which matters for sacrifice
targeting.

**Add** a note after the Ring Table:

> **Ring of aggravate monster** deserves a footnote in the "niche uses of terrible
> things" category. In current editions, wearing it roughly doubles the effective
> dungeon level for purposes of monster generation — so creatures well above your
> current depth start appearing. This is obviously catastrophic if you forget
> you're wearing it. But for a chaotic player who needs high-difficulty sacrifice
> fodder for the next artifact gift, deliberately wearing the ring to force harder
> spawns — then removing it — is a calculated risk with an actual payoff. The
> key word is "deliberately." The ring is auto-cursed 90% of the time. If it goes
> on and won't come off, the fact that you're now generating liches on dungeon
> level 8 is no longer a feature.

---

### A11. Rings → polymorph control note (line ~2493)

**What to change:** The section should note that blessed potions of polymorph now
grant control for that transformation, making the ring of polymorph control less
of a prerequisite.

**Add** to the discussion of polymorph-related rings:

> In current editions, a blessed potion of polymorph grants you polymorph control
> for that specific transformation — you choose the form, no ring required. This
> makes the ring of polymorph control less of a critical acquisition: you no longer
> need to find it or wish for it just to do a single controlled polyself. The ring
> remains useful if you want ongoing control for repeated transformations, but
> it's no longer a hard prerequisite for the opening act of any polymorph strategy.
> Save that wish for something else.

---

### A12. Amulets → Restful sleep (line ~2525)

**What to change:** The current entry says only "Puts you to sleep randomly
(usually cursed)" with no strategic content. In 3.7 it has a genuine use.

**Replace** the restful sleep entry with:

> **Restful sleep** puts you to sleep randomly and is usually cursed, which
> should tell you everything you need to know about when to put it on
> unexamined. However, in current editions, wearing it while asleep grants +1 HP
> per turn via accelerated regeneration — stacking with your normal healing. In
> a fully secured room with the door spiked shut and nothing actively trying to
> kill you, this turns a nearly useless item into a slow but functional field
> hospital. The conditions required — safety, time, and nothing better to do —
> describe a situation you rarely find in the Mazes. When you do, the amulet
> is less embarrassing to wear than it looks.

---

### A13. Tools of the Trade → Containers (line ~2566)

**What to change:** In 3.7 monsters can loot unlocked containers. This is a
material gameplay change that belongs in the Containers section.

**Add** to the Containers subsection:

> One current-edition hazard that the adventuring community is still adjusting to:
> intelligent monsters can now loot unlocked containers. They can remove items,
> carry containers away, and unlock chests with keys. If you've been leaving
> your secondary stash in an unlocked chest on a partially-cleared level while
> you scouted ahead, stop. The Castle chest in particular — containing the wand
> of wishing — can be emptied by the level's residents if you leave them time
> and opportunity. Clear levels before abandoning valuables, and keep your most
> important containers locked. The dungeon has gotten better at wanting what
> you have.

---

### A14. Divine Relations → Sacrifice (line ~2905)

**What to change:** The section needs the minimum sacrifice value requirement
added. Sacrificing weak monsters no longer contributes toward artifact gifts.

**Add** after the current sacrifice rules:

> There is a minimum. In current editions, not every corpse you drop on the
> altar moves you toward the next artifact gift — the gods have opinions about
> what constitutes a worthy offering, and a kobold doesn't make the cut. Fresh
> corpses of appropriately challenging monsters are what advances your standing.
> If you've been feeding the altar with early-dungeon sweepings and wondering
> why the gifts aren't arriving, this is why. Sacrifice up; sacrifice well.

---

### A15. Luck and Fortune → Gaining and Losing Luck (line ~3338)

**What to change:** The luck-gain-from-sacrifice mechanic has a cap in 3.7 that
the current section doesn't mention. This closes the old "sacrifice a hundred
kobolds to max luck" play.

**Add** after the Luck table:

> There is a ceiling on the luck you can harvest from any given corpse. If your
> current luck score already exceeds the difficulty rating of the monster you just
> sacrificed, you gain nothing. The altar accepts your offering politely and gives
> you nothing in return, because the gods have standards.
>
> This closes a beloved old strategy: sitting at a co-aligned altar with a pile of
> kobold corpses and grinding luck to maximum. It no longer works once your luck
> is already above modest levels. To raise luck via sacrifice in the mid-to-late
> game, you need fresh corpses of monsters whose difficulty exceeds your current
> luck value. In practice: a luckstone, occasional mid-tier sacrifices, and not
> killing peacefuls is now the standard path to high luck. The dungeon made luck
> feel like luck again.

---

### A16. The Art of Combat → Damage (line ~2976)

**What to change:** Two-handed weapons now get a 50% multiplier on the strength
damage bonus. This is a meaningful buff that belongs in the Damage section.

**Add** after the strength bonus line:

> Two-handed weapons also receive a 50% bonus to the strength damage modifier,
> which is new in current editions. This narrows the gap between two-handed
> builds and dual-wielding considerably. A Barbarian with a two-handed sword
> and respectable Strength is not just accepting the trade-off of foregoing a
> shield — they're dealing genuinely more damage per swing than a comparable
> one-handed build. If you've been avoiding two-handed weapons because the math
> didn't add up, run those numbers again.

---

### A17. The Art of Combat → Fighting Smart (line ~3018)

**What to change:** Two monster AI changes affect tactics significantly: ranged
attackers now actively kite, and cornered scared monsters fight back. Both need
to be added to Fighting Smart. Also: the spellcaster extra-move bug from 3.6.x
is fixed and worth noting.

**Add** to the Fighting Smart bullet list:

> - **Ranged attackers retreat.** Monsters with ranged attacks — archers, spellcasters,
>   anything that can hurt you from a distance — now actively back away when you
>   close to melee range. Walking toward a centaur archer to neutralize its bow no
>   longer works; it will simply back up and keep shooting. The tactical implications:
>   use corners and narrow passages to cut off their retreat, bring ranged options
>   of your own, or use a wand of teleportation to skip past the dance. This change
>   also means monster spellcasters are more dangerous than they used to be —
>   they'll maintain the range they need to cast while you struggle to close.
>
> - **Cornered scared monsters fight.** Elbereth still works, and the engrave-and-
>   regenerate tactic still works — but only when the monster has somewhere to go.
>   A frightened monster that has nowhere to flee will now turn and fight rather
>   than stand helplessly while you recover. If you've carved Elbereth in a corridor
>   and then backed a monster into a dead end, be ready for it to make a decision
>   about that arrangement. Keep an exit behind the monster, or expect contact.
>
> - **Monster spellcasters no longer get a free extra step after casting.** This was
>   a 3.6.x quirk that made casters feel unpredictably aggressive — they'd cast a
>   spell and then *also* move. Fixed in current editions. Combat near spellcasters
>   is now more predictable, which is the dungeon's way of making you feel better
>   before introducing something else that isn't.

---

### A18. Spellcasting → Learning Spells (line ~3140)

**What to change:** The Wizard's systematic spellbook identification benefit from
advancing spell school skills isn't covered in the spellcasting chapter. It belongs
here as well as in the Wizard role description.

**Add** a paragraph after the Int/XL reading table:

> **Wizards identify books by training.** In current editions, advancing a spell
> school skill to each rank automatically reveals the appearances of spellbooks
> in that school — unskilled unlocks level-1 appearances, basic level-3, skilled
> level-5, expert level-7. A Wizard starts knowing all level-1 appearances and
> level-3 in attack and enchantment, which means they begin the game with a
> meaningful identification advantage in their core schools.
>
> The practical consequence: training your spell school skills has an
> identification payoff beyond casting improvement. The book you've been
> carrying since level 5 without knowing what it is? Train up the right school
> and suddenly you know. Prioritize the schools containing your most-needed
> unidentified books, not just the schools that let you cast your current spells
> better.

---

### A19. Voluntary Challenges (line ~4366)

**What to change:** Four new conducts exist in 3.7 that aren't covered: pauper,
petless, permadeaf, and Sokoban. Each deserves its own subsection.

**Add** after the existing conduct sections:

> #### Pauper
>
> Never spend gold. Purchases, shop fees, bribes, and any other payment breaks
> it. You can carry gold — the coins in your pocket aren't the problem. It's
> giving them to someone else. In a game where shops provide identification
> services, healing supplies, and blessed items for those willing to pay, walking
> past every shopkeeper with a polite wave requires creative use of every other
> resource you have. Price identification becomes more valuable, not less — you
> want to know what something is before you carry it home for free rather than
> learning the hard way.

> #### Petless
>
> Never have a pet. Decline your starting companion, don't tame anything, and
> try not to wander into magic traps that have opinions about your social
> calendar. You lose the curse-detection trick, the combat assist, the shoplifting
> option, and the companionship. What you gain is the particular satisfaction of
> knowing that everything that died did so by your hand, and that you never had
> to feel guilty about leading something loyal into a polymorph trap.

> #### Permadeaf
>
> Never hear anything — enforced by the game tracking your entire run for sound
> events and never reversing magical deafness. Many monster warnings, environmental
> cues, and status messages arrive as sounds. Permadeaf requires navigating the
> dungeon by sight and logic alone, which turns out to be possible and occasionally
> educational about how much information you normally get for free.
> *(Verify exact tracking conditions against `conduct.c` before finalizing.)*

> #### Sokoban
>
> Complete Sokoban without cheating. No digging through the puzzle levels, no
> teleportation to skip steps, no picking up boulders and carrying them to
> impossible positions. Solve it the way the puzzle designers intended, by
> actually solving the puzzle. The game now tracks violations automatically.
> This is the conduct for players who found Sokoban's boulder-shoving too easy
> and want to be told they did it properly.

---

### A20. "What Changed Since Last Time" framing (line ~4737)

**What to change:** The title in the TOC says "What's new since 3.4.3." Update
to frame it as 3.7.0 changes versus the 3.6.x baseline, which is where most
returning players are coming from.

**In the TOC**, change:
`— What's new since 3.4.3`
to:
`— What's new in 3.7.0 versus 3.6.x`

**In the appendix heading**, change the opening paragraph's framing from
"the version you may remember" to something that acknowledges 3.6.x specifically
as the baseline.

The appendix's strategic implications belong in the new Returning Players appendix
(Part C), not here. The "What Changed" section should remain the clean factual list
it is — the Returning Players appendix is where the *so what* lives.

---

## Part B: New Sections to Add

### B1. Supply Containers

**Placement:** New subsection in "Your First Descent" or as a sidebar in
"The Lay of the Land."

> #### Supply Containers
>
> Somebody has been leaving care packages.
>
> In current editions, the upper dungeon levels occasionally generate supply
> containers — chests or boxes placed with better-than-average early-game
> contents. Healing potions, scrolls of enchantment, occasionally something more
> interesting. They look like any other container, which is the point: the Mazes
> are not in the habit of labeling things "useful, open me."
>
> On your first ten levels, check every container you find. A locked one will
> yield to a credit card, a key, a wand of opening, or patience with a pickaxe.
> The contents aren't guaranteed to change your run, but finding a stack of
> healing potions on level 4 before you've learned the hard way how much you
> need them is the dungeon's occasional act of goodwill. Accept it graciously
> and move on.

---

### B2. Iron Bars

**Placement:** New subsection in "Traps and Hazards" or "The Lay of the Land."

> #### Iron Bars
>
> Iron bars block doorways and passages like impassable walls, except that unlike
> walls, they can be removed. The options: pour acid on them (a potion of acid
> works; so will the acidic blood of an appropriate monster if you get creative
> and messy), or beat them with a war hammer until they give up. Standard
> digging spells, picks, and sheer frustration have no effect.
>
> They're most often encountered blocking access to special areas or vaults,
> which is the dungeon's way of asking whether you have a potion of acid. If
> you do, the bar becomes an obstacle you've already solved. If you don't,
> the bar is a reminder to carry one next time. Your pet may be able to
> squeeze through in some configurations, which is one more reason to keep
> the animal well-fed and close.

---

### B3. Peaceful Monster Displacement

**Placement:** New subsection in "Making Friends" or a note in "The Lay of
the Land → Room Types."

> #### Navigating Crowds
>
> Minetown is full of people going about their business, most of them peaceful,
> none of them interested in moving out of the doorway you need to pass through.
> In older editions, walking into a peaceful monster meant attacking it, which
> meant alignment penalties, which meant the gods quietly rearranging your
> prayer odds. Experienced players learned to route around peacefuls, treat
> them as furniture to navigate rather than obstacles to solve.
>
> In current editions, this has been addressed. You can now displace peaceful
> monsters by walking into them — you and the monster swap positions, exactly
> as with your pet. No attack, no offense taken, no alignment consequence.
> The townsfolk of Minetown are finally navigable.
>
> The limits are sensible: you cannot displace shopkeepers, priests, quest
> leaders, the Oracle, guards, or any monster that is sleeping or paralyzed.
> (Waking a sleeping monster by shoving it aside would be rude by any standard,
> dungeon or otherwise.) You also cannot displace a peaceful into a trap or
> hazardous terrain — the safety logic prevents it. Within those constraints,
> crowded peaceful areas are no longer puzzles. They're just rooms with people
> in them.

---

### B4. Genetic Engineer — Dangerous Encounters

**Placement:** Add to "Dangerous Encounters" section.

> #### The Genetic Engineer
>
> The genetic engineer is a humanoid you encounter in the deeper dungeon, and
> alone it is not the problem. The problem is what it does with time. Genetic
> engineers create chimeras — hybrid monsters that inherit the attacks, abilities,
> and temperament of two different creature types. The combinations are theoretically
> bounded by what monsters are available on that level. In practice, this means
> that a level with a genetic engineer on it contains both a threat and a factory
> for worse threats.
>
> A chimera's danger depends entirely on what got combined. Some combinations
> are merely annoying. Others — a floating eye's paralysis attached to a fast
> body, a disenchanter's inventory-stripping reach on a creature that can fly —
> are the kind of thing that ends runs in ways that take a paragraph to explain
> to other players afterward.
>
> Kill the genetic engineer first. Always. It is not a hard rule to remember,
> because the reason is self-evident the moment you see what it made.

---

## Part C: Returning Players Appendix Draft

**Add as a new appendix** between "What Changed Since Last Time" and
"Acknowledgements," numbered as the new appendix 35 (shifting Acknowledgements
to 36).

**Suggested TOC entry:**
`35. [If You've Been Here Before](#if-youve-been-here-before) — For travelers returning from 3.6.x`

---

### If You've Been Here Before

*The dungeon has been renovated. Some of the renovations are improvements.
Some of them are traps disguised as improvements. This appendix is for
travelers who know the old dungeon and need to know what changed — not just
what changed, but what to do about it.*

---

#### Things That No Longer Work

**The wand of speed monster is a tactical tool, not a build step.**

In 3.6.x, zapping yourself with a wand of speed monster granted a permanent
speed intrinsic. It was efficient, elegant, and a reliable early priority.
In current editions, self-zapping gives 50–74 turns of *very fast* speed.
Good in a fight. Gone afterward.

Speed boots are now the primary path to permanent speed. Put them on your
wish list. The wand remains excellent for a mid-combat burst — or for giving
your pet an edge — but treat it as a resource to use, not a property to acquire.

**The wand of make invisible no longer makes you permanently invisible.**

Same story. Self-zapping used to grant the invisibility intrinsic. Now it
gives 31–45 turns of temporary invisibility. For the permanent variety, you
need a ring or cloak of invisibility. The wand is still useful for tactical
windows — slipping past something dangerous, closing ground on an enemy that
fights by sight — but the game no longer hands you permanent invisibility
through a single lucky wand find.

**You cannot luck-grind by sacrificing weak corpses.**

The altar has gotten selective. In 3.6.x, a stack of kobold corpses and a
co-aligned altar could push your luck to maximum through sheer volume of
sacrifice. In current editions, if your current luck score already exceeds
the difficulty rating of the monster you're sacrificing, you gain zero luck.
The gods will accept your kobold, bless the corpse, and give you nothing,
because your luck is already better than a kobold deserves to affect.

To raise luck further once you're past the low positives, you need fresh
corpses of monsters whose difficulty actually exceeds your luck value. In
practice: a luckstone handles the maintenance; sacrifice mid-tier monsters
when you want to push higher. The kobold pile strategy is retired.

**Elbereth does not pacify a monster that has nowhere to go.**

Writing Elbereth and standing on it still works — the monsters mill around,
refuse to approach, and look frustrated. The catch in current editions is
that a scared monster with no escape route will turn and fight rather than
stand helplessly while you regenerate. If you've carved Elbereth in a tight
corridor and then backed a monster against the dead end of it, expect it to
make a decision. Keep the monster's exit clear, or finish the fight before
it makes that decision for you.

**Bulk diluted-stack alchemy is gone.**

The production-line approach — dilute a large stack of healing potions, then
convert the whole diluted stack in a single dip — hit a wall in current
editions. Only two potions alchemize per dip from a diluted stack now.
The healing → extra healing → full healing → gain ability chain still works
perfectly. You just do it in small batches with undiluted inputs. Think of it
as quality craft work rather than factory output. The math still favors
alchemy; the throughput is lower.

**Demonbane is a silver mace.**

For Priests, this is a gift. For anyone who played a non-Priest and expected
to pick up Demonbane and swing it comfortably with their long sword skill: the
weapon changed types. It now demands mace skill. If your build didn't route
through maces, this artifact that used to be a welcome find is now a skill-penalty
situation. Plan accordingly, or route toward a different artifact.

**Valkyries no longer start with a long sword.**

They start with a spear. An immediate Excalibur dip at experience level 5 now
requires finding a long sword first. And for non-Knights, the fountain odds for
Excalibur are now 1-in-30 per dip — not guaranteed, not even reliable over a
handful of tries. Factor this into early routing; the long sword detour and
potential dry spells at fountains are real.

---

#### New Strategies Worth Building Around

**A blessed potion of polymorph is now a self-contained controlled polyself.**

No ring of polymorph control required. A blessed potion of polymorph grants
control for that specific transformation: you pick the form, execute the plan,
move on. This makes single-use polymorph strategies — grab iron golem form for
extreme AC, go bat form to scout the next level, pick something with a good
intrinsic — accessible without needing to find or wish for the ring first.

The ring of polymorph control is less of a priority acquisition now. It's
still useful for ongoing or repeated polymorphing. But for a single planned
transformation, one blessed potion does everything the ring would have done.

**Vampire polyself now supports genuine form cycling.**

A hero polymorphed into a vampire can use `#monster` to switch between vampire,
bat, and fog cloud forms. This used to be a one-way door: enter bat form and
stay there until the polymorph expired. In current editions it's a loop.

Fog cloud form passes through doors and certain barriers, making navigation
through heavily-gated areas practical. Bat form offers flight and mobility.
Vampire form is where you do the actual fighting. A polyed vampire can now
plan routes through an area the way a veteran player plans routes through
Gehennom: by form rather than by direction. Fog through the chokepoint, fight
in the open room, reposition as bat, repeat.

**Gold dragon scale mail eliminates your light source slot.**

Gold dragon scale mail provides a 2-square light radius as an innate property,
in addition to two resistances. In the late game, when inventory is a puzzle
and every slot counts, wearing gold dragon scale mail means you can retire the
lamp and use that slot for something that actually matters. It's no longer the
dragon scale mail without a compelling niche. It has one.

**The amulet of guarding completes your magic cancellation elegantly.**

The amulet provides +2 AC and +2 magic cancellation. Add a cloak of magic
resistance (MC1) and you reach MC3 without needing the cloak of protection
(the only single-item MC3 source, which takes your cloak slot entirely).
This frees your neck slot for the amulet, your cloak slot for magic resistance,
and keeps you at MC3. It's a clean solution to what used to be a slot-allocation
headache.

**Plan for more wishes.** Vlad's throne now guarantees a wish eventually
(four of thirteen outcomes; the throne survives the other nine so you can sit
again), and picking up the Amulet of Yendor for the first time grants a wish.
A prepared player can reliably expect five to seven wishes across a game now.
This gives you more flexibility in what to spend early wishes on — a good
second or third priority item is now a reasonable target.

**Your pet can grow stronger and come back from the dead.**

Pets gain resistances from the corpses they eat, exactly as you do. More
importantly, a dead pet can be revived. Stand on its corpse at a co-aligned
altar and pray. The conditions have to align — prayer timeout, alignment
record, Luck — but when they do, the companion that's been with you since
level 3 walks out of the other side of death and gets back to work.

---

#### Quiet Changes That Will Get You Killed

**Potions don't survive Gehennom's floor.**

Dropping a potion on the floor in Gehennom has roughly a 50–70% chance of
shattering it, modified by BUC status and Luck. The floor is hot. Potions
are glass. This is the predictable result. Keep potions in containers in
Gehennom; don't casually drop while swapping inventory; don't stash them
for later on the floor. The exception is holy water you're using right now,
and even then, get it back into a container.

**Monsters will take your things.**

Intelligent monsters can now unlock chests, remove items from open containers,
and even carry containers away. A wand of undead turning in a monster's hands
can animate corpses in your open inventory. The Castle chest — historically
sitting there waiting for you — can be looted by the level's residents given
time and a key. Clear levels before leaving. Keep critical containers locked.
Don't haul a collection of interesting corpses through an area with caster
monsters and expect them all to still be inert on the other side.

**Ranged monsters run from you now.**

Anything with a ranged attack actively backs away to maintain distance when
you approach. The centaur archer that used to stand still while you walked
toward it now retreats. The monster spellcaster that used to close to cast
now stays where it can cast comfortably. Closing to melee is no longer a
reliable response to a ranged threat. Corners, wands of teleportation, and
your own ranged options become necessary more often.

**Monster spellcasters stopped giving you a free turn after casting.**
This was a 3.6.x quirk — they'd cast a spell and then also move, making them
jitter. Fixed now. Positioning-based tactics near casters work more reliably
as a result, but the additional free-turn exploit is gone.

**Themed rooms mean that uniform rooms are above-curve.**

A room full of giants is almost certainly a themed room, not a coincidence.
Themed rooms have above-average monster density concentrated around a single
type. Any room that looks like it was curated deserves more respect than a
random room of equivalent apparent difficulty. Retreat, assess, and enter
with a plan rather than a direction.

**Spell levels shifted.**

Charm monster is now level 5 (was 3). If your tactical framework relied on
charm monster as a cheap mid-game taming tool, recalibrate. Sleep is now
level 3 (was 1), less accessible to non-specialists. Confuse monster dropped
to level 1 (was 2), much more accessible. The balance of what spells are
practical for non-Wizards has shifted; check the current table before
planning around spells that used to be free.

---

#### What to Change in Your Habits Right Now

1. Stop planning permanent speed or invisibility around self-zap wands.
2. Stop luck-grinding with low-difficulty sacrifice fodder once luck is positive.
3. Stop leaving containers unattended in cleared-but-not-cleaned areas.
4. Stop carrying speculative corpse collections through caster-heavy floors.
5. Stop walking toward ranged threats expecting to neutralize them in melee.
6. Stop dropping potions on the floor in Gehennom.
7. Start checking every container in the first ten levels for supply caches.
8. Start treating a blessed polymorph potion as a planned power spike, not
   a lucky accident.

---

*The dungeon has been thoughtfully redesigned by people who wanted it to be
better and more dangerous simultaneously, which is exactly the kind of thing
that experienced NetHack players think is wonderful and newcomers find bracing.
You know what the old dungeon held. The new one keeps most of it and adds
surprises. Treat every floor you think you know with the respect you'd give
one you've never seen before.*

---

## Verification Checklist

Before committing edits to `guide.md`, verify each of the following against
`nethack-c/upstream/src/`:

- [ ] Displacer beast monster class symbol and behavior — `monst.c`
- [ ] Genetic engineer monster class symbol and chimera mechanics — `monst.c`, `muse.c`
- [ ] Vampire `#monster` form-switching conditions — `polyself.c`
- [ ] Ring of aggravate monster difficulty formula — `dungeon.c`
      (source confirms: `res > 25 ? 50 : res * 2`)
- [ ] Sacrifice luck cap formula — `pray.c`
      (source confirms: `if (orig_luck > value) luck_increase = 0`)
- [ ] New conducts (pauper, petless, permadeaf, Sokoban) exact tracking — `conduct.c`
- [ ] Supply container spawn rules and contents — `mkobj.c` or `mklev.c`
- [ ] Gold dragon scale mail light radius — `objects.c` or `apply.c`
- [ ] Amulet of restful sleep regen — `allmain.c`
      (source confirms: `Sleepy && u.usleep` path adds extra healing)
- [ ] Castle chest contents (potion of gain level) — `dat/Castle.lua` or equivalent
- [ ] Alchemy smock blast chance reduction — `potion.c`
- [ ] Fountain Excalibur odds for non-Knights (1/30) — `sit.c`
- [ ] Wizard spellbook ID via school skill — `spell.c`
      (source confirms: `skill_based_spellbook_id`)
- [ ] Minimum sacrifice value requirement — `pray.c`
- [ ] Pet revival by prayer — `pray.c` or `dog.c`
- [ ] Pet resistance gain from corpses — `mon.c` or `eat.c`
- [ ] Peaceful displacement limits — `hack.c`
      (source confirms: exists with safety checks for NPCs and terrain)


## Audit Note (2026-03-05)
This file was spot-audited for NetHack 3.7.0 correctness against nethack-c/upstream source and nethack-c/upstream/doc/fixes3-7-0.txt for major strategy deltas (peaceful displacement, vampire form-loop updates, Demonbane silver-mace change, undead-turning monster usage, restful sleep regen, hot-ground potion breakage, sacrifice-luck cap, and ranged-kiting AI). No contradictory 3.7.0 behavior was found in those areas.
