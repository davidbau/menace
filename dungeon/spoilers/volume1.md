# The Adventurer's Companion to the Great Underground Empire

## Volume I: Whispers from the Deep

<p style="text-align: center; font-style: italic; margin: 1.5em 0;">"It is pitch black. You are likely to be eaten by a grue."</p>

---

## Before You Read Further

You are holding the first of two volumes prepared for those foolhardy
souls who have decided to descend into the dungeon beneath the white
house west of the forest. The entrance is a mailbox in an open field.
The treasures lie somewhere below. Whether you reach them is, in large
part, a matter of how prepared you are to be inconvenienced.

This volume is a **hint book**. It will not solve the game for you. It
will nudge, prod, and on occasion gently mock. Each significant puzzle
appears here as a question with a series of answers — a gentle first
hint, a pointed second hint, and, for the truly stuck, a nearly-complete
third. You are trusted to read only as far as you need and to put the
book down when the nudge is enough. This is an old convention from the
age of printed hint books, whose answers were hidden behind invisible
ink and revealed one at a time with a chemical developer pen: you had
to *want* the spoiler before you got it. We have preserved the spirit.
The pen has been replaced by a small slider beside each hint: drag it
to the right to reveal that hint, and the slider for the next one will
become available. You can always leave a hint unread, and you can
always stop.

If you want the complete walkthrough — every move, every treasure —
that is **Volume II**. Keep it on a shelf where you cannot accidentally
read it during a difficult evening.

A word on the game itself. What you are about to play is, technically,
**Dungeon** — a 616-point Fortran port of the original MDL game written
at MIT between 1977 and 1979 by Tim Anderson, Marc Blank, Bruce Daniels,
and Dave Lebling. It was called Zork on the PDP-10 and renamed Dungeon
when Bob Supnik and friends ported it out of the lab and into the wider
world. When Infocom commercialized the game, they split it into Zork I,
II, and III — three smaller, polished games totaling fewer points than
their common ancestor. This dungeon is the whole thing: the Great
Underground Empire, the Flood Control Dam, the Bank of Zork, the
Wizard's domain, the Volcano, and the Endgame, all in one unbroken
descent. It is older, stranger, and rougher around the edges than the
Infocom trilogy. It also has 616 points of treasure waiting to be found.

Good luck. You will need it, though less than you fear.

---

## Table of Contents

**Part One: Preparations**

1. [Getting Your Bearings](#getting-your-bearings) — The parser, directions, and the commands that save lives
2. [The Art of Mapping](#the-art-of-mapping) — On graph paper, dropped objects, and the geography of confusion
3. [Strength, Death, and the Twice-Dead Rule](#strength-death-and-the-twice-dead-rule) — How your body works and when it stops working
4. [The Thief](#the-thief) — A man of few words, many pockets, and one stiletto

**Part Two: A Field Guide to Trouble**

5. [The Surface and the White House](#the-surface-and-the-white-house) — Leaves, mailboxes, and the thing in the attic
6. [Light in the Dungeon](#light-in-the-dungeon) — Lamp, torch, candles, match, and the grue
7. [The Forest](#the-forest) — Not a maze, but it pretends to be
8. [The Troll](#the-troll) — The first honest fight
9. [The Coal Mine and the Bat](#the-coal-mine-and-the-bat) — Going dark, going deep, coming back with coal
10. [The Dam and the Reservoir](#the-dam-and-the-reservoir) — Four buttons, one bolt, one enormous relief valve
11. [The Loud Room](#the-loud-room) — Where a single word is the whole puzzle
12. [The Cyclops](#the-cyclops) — A hungry classicist
13. [The Thief's Treasure Room](#the-thiefs-treasure-room) — The room from which all stolen items can be reclaimed
14. [The Temple and the Land of the Living Dead](#the-temple-and-the-land-of-the-living-dead) — Exorcism by bell, book, and candle
15. [The Rainbow, the Barrel, and the River](#the-rainbow-the-barrel-and-the-river) — All the ways the Frigid River wants you dead
16. [The Wizard's Domain](#the-wizards-domain) — Alice, cakes, a robot, and a carousel
17. [The Bank of Zork](#the-bank-of-zork) — Where the walls are suggestions
18. [The Dragon and the Ice Room](#the-dragon-and-the-ice-room) — Vanity has its uses
19. [The Volcano](#the-volcano) — The hot-air balloon and what lies above
20. [The Palantirs](#the-palantirs) — Seeing, being seen, and getting lost in the looking
21. [The Endgame](#the-endgame) — After all the treasures are in the case

**Part Three: Appendices**

22. [Magic Words](#magic-words) — Plugh, Xyzzy, Plover, and the ones that work
23. [Have You Ever …?](#have-you-ever) — A partial list of things worth trying at least once
24. [Ranks and Titles](#ranks-and-titles) — What the game will call you
25. [On Style](#on-style) — Acknowledgments and a note about the voice of this guide

---

## Part One: Preparations

---

### Getting Your Bearings

Before you enter the dungeon, it is worth knowing what the game will
understand. The parser is described in the manual as "moderately
stupid," which is a self-deprecating way of saying it is the finest
English-sentence parser that existed in 1979. It recognizes the first
**eight letters** of every word, so *DISASSEMBLE* and *DISASSEMBLY*
look identical to it. It accepts multiple commands on a line, separated
by periods or semicolons (`TAKE SWORD. ATTACK TROLL WITH SWORD`). It
accepts lists with *AND* or commas (`TAKE LAMP AND SWORD`). It accepts
the collective nouns *EVERYTHING*, *VALUABLES*, and *POSSESSIONS*, each
optionally qualified by *EXCEPT* (`DROP EVERYTHING EXCEPT THE LAMP`).

The following commands have no in-game cost and should be burned into
your fingers:

**LOOK** (or **L**) redescribes your surroundings. Use it whenever you
return to a room after combat, after dropping things, or whenever you
suspect something has changed.

**INVENTORY** (or **I**) lists what you are carrying. Check it before
and after any encounter with the thief.

**DIAGNOSE** reports your current state of health. If it tells you
about a "serious" wound, don't pick a fight.

**SCORE** reports your running total and your rank. Watching the rank
rise from "Beginner" through "Amateur Adventurer," "Novice Adventurer,"
"Junior Adventurer," "Adventurer," "Master," "Master Adventurer,"
"Wizard," and finally "Master Adventurer" is most of the reward. (The
game will also cheerfully tell you when you have a *negative* score and
will say something condescending about it.)

**WAIT** passes one turn. It is surprisingly useful: certain events
happen on a clock and certain people like the thief must be allowed to
arrive.

**AGAIN** (or **G**) repeats the last successful command. Invaluable in
combat: `ATTACK TROLL WITH SWORD`, then `G`, then `G`, and so on.

**SAVE** writes your progress to a file; **RESTORE** loads it back.
Save *often*, and always before you push a colored button, before you
give anything to the thief, and before you try any sentence containing
the word "dragon."

**VERBOSE / BRIEF / SUPERBRIEF** control how loquacious the game is.
*BRIEF* is the default (full description on first visit, short
descriptions thereafter). *VERBOSE* makes the game re-describe every
room every time. *SUPERBRIEF* gives you only the room name, which is
what you want once you know the map. Swap between them depending on
your mood.

Finally, **OOPS** corrects a misspelled word. If you get
`[I don't know the word "swrod"]`, you can reply `OOPS SWORD` without
retyping the whole command.

---

### The Art of Mapping

The dungeon is not randomly generated. It is a fixed, elaborate
geography which is nonetheless easy to get lost in because it contains
mazes, one-way passages, and rooms whose "obvious" exits are only
sometimes obvious. You will need a map. Most adventurers use graph
paper, one square per room, with arrows for exits. The game's
abbreviations (N, S, E, W, NE, NW, SE, SW, U, D, IN, OUT) work well as
arrow labels.

Two warnings:

**Not every passage is symmetric.** A room whose description says
"passages lead off to the north and east" may have non-obvious exits to
the south, down, or through a window. *EXAMINE* things. Look for
adjectives like "dusty," which often mark trap doors.

**Some passages are one-way.** The slide in Cellar doesn't let you back
up. The chimney only goes up once the trap door has shut behind you.

When a room is described in a way that makes the exits unclear — the
Cellar, anything in a maze — **drop an object** as a marker. The
Fortran parser does not refuse to drop items simply because a room is
labeled the same as another. Use **junk** for markers: the leaflet from
the mailbox, a torn piece of newspaper, the *Dungeon Report*. **Do not
use treasures for markers.** The thief wanders, and the thief will
find them.

The mazes are where this technique earns its keep. From the Troll Room
there is a maze ("twisty passages, all alike"). There is another, more
insidious region of unreliable exits near the Forest. Drop one item
per room, walk, look, note which item is now present. Two rooms with
the same description but different dropped items are different rooms.
Two "different" rooms with the same dropped item are actually the same
room, reached from another direction.

Many adventurers keep a **separate sheet** for each maze, labeling rooms
M1, M2, M3, etc., until the shape emerges. There is a well-known
"Grating Room" and a "Cyclops Room" hidden inside these mazes. Finding
them is half the reward.

**A note for the impatient.** A complete map of the Great Underground
Empire, hand-drawn by David Bau from repeated mainframe-era plays, is
reproduced in **Volume II, Appendix A2**. Looking at it will not spoil
any puzzles, only the geography, and it will save you a very large
number of hours of confusion if you prefer to understand the shape of
the place before you explore it. Alternatively: don't look. Draw your
own. There is a particular satisfaction in the fully-annotated
hand-drawn dungeon map that no reproduced one can match.

---

### Strength, Death, and the Twice-Dead Rule

Your character has two things that affect combat. One is a permanent
**base strength** that grows as you play. The other is a temporary
**wound penalty** that shrinks when you get hit and recovers with
time. Understanding both is essential to knowing when to fight.

**Base strength grows with your score.** This is the single most
important and least obvious mechanic in the game. Your score — the
number the *SCORE* command reports — is not only a measure of how
well you are doing. It is also your *character level*. The game uses
a simple linear formula: a score of zero gives you the minimum
strength of 2, and a maximum score of 616 gives you 7. The thresholds,
roughly, are:

| Score | Strength |
|------:|:---------|
| 0–61 | 2 |
| 62–184 | 3 |
| 185–307 | 4 |
| 308–430 | 5 |
| 431–554 | 6 |
| 555+ | 7 |

Every 62 to 123 points you accumulate pushes you up another step. The
points can come from *anything* that scores: picking up a treasure
(half points), putting it in the trophy case (the other half), or
visiting a special room for the first time. The game does not
distinguish between "earned through combat" and "earned through
housekeeping." Dropping the platinum bar in the case makes you
measurably better at swinging a sword. That is not a metaphor; it is
the formula.

**Wounds subtract from your effective strength temporarily.** Every
landed blow by an enemy sets an internal "stamina" value to a small
negative number. The stamina recovers by one unit every thirty turns
of game time. While you are wounded, your *effective* fight strength
is the base strength **plus** the (negative) stamina. A fresh wound
easily brings you back to where you were fifty points ago.

The **DIAGNOSE** command reports both values indirectly: a message
about a "slight" or "serious" injury tells you how much stamina you've
lost, and the "you will be cured after X moves" line tells you how
long until you're back to zero. If *DIAGNOSE* says you're injured,
**don't pick a second fight**. Find a lit room, *WAIT*, and check
again. Recovery is free; dying is not.

**Villain strengths, for comparison.** Because the underlying table
is small and finite, it's worth knowing it:

| Opponent | Strength | Fair Match At |
|:---------|---------:|:---------|
| Troll | 2 | Score 0 (50/50 from the start) |
| Thief | 5 | Score 300+ (coin flip); 430+ (favored) |
| Cyclops | 10,000 | Never — do not fight him |
| Gnome of Zurich | low | Any score |

The troll is designed to be a fair fight at the beginning of the game.
The thief is emphatically not. A player who walks into the thief's
lair at score 25 is executing the same plan as a player who walks into
a chainsaw. The thief is a late-game opponent, in combat terms; you
are *supposed* to meet him earlier, let him rob you blind, and come
back for your things when you're strong.

**Other combat modifiers.** A handful of weapons are preferred against
specific opponents. The **elvish sword** is the all-purpose weapon
and glows blue near danger. The **nasty knife** (from the attic) is
slightly better against the **thief** specifically — the game
recognizes the dramatic appropriateness of stabbing him with a
stiletto-analogue. A few villains are resistant to particular
weapons, and the game will say so when you try.

Combat in Dungeon is less about tactics and more about *when*. Most
of your decisions come down to one question: is my score high enough
for this?

You can die. Most of your deaths will not end the game. When you are
killed (by the troll, by the thief, by a fall, by darkness, by an
ill-advised *LEAP*), your possessions are scattered through the upper
rooms of the dungeon and you are restored to life, minus ten points,
in a place you will quickly recognize as the Entrance to Hades. This
is not a friendly place. The gates are barred by wraiths. You can
wander, but you cannot buy passage through, and you cannot retrieve
your belongings from here.

You are allowed **two deaths**. The third is permanent. The game
charges ten points each time and will, after the third, deliver a
valedictory message about suicidal maniacs and remove you from play.

There is, however, a way to be exorcised — to leave the Land of the
Living Dead as an adventurer rather than a ghost. It is the Temple
puzzle, covered later. Solving it improves your standing in the
afterlife considerably; in particular, a subsequent death delivers a
rather different message about the dungeon mistaking you for an evil
spirit. The rules about two-and-out still apply. Exorcism is not
resurrection. It is more like a character reference.

---

### The Thief

The thief is the most beloved and most feared of the dungeon's
inhabitants. He carries a large bag. He steals. He does it with a
smile.

Some facts you should know before you meet him, but need not believe
until you do:

- He can appear in any *lit* room you are in. He announces himself:
  *"Someone carrying a large bag is casually leaning against one of the
  walls here."*
- He picks pockets. If you see *"The other occupant just left carrying
  his large bag. You may not have noticed that he robbed you blind
  first,"* check your inventory. He will usually have taken whatever is
  most valuable.
- He carries a **stiletto**. In combat, you may be lucky and knock him
  unconscious; you may be less lucky and be knocked unconscious
  yourself; in the worst case, he ends the fight with a formal bow and
  a murder.
- He has a home. Everything he steals ends up there. If you find his
  home with him absent, you may collect his hoard. If you find his
  home with him present, you will have a serious fight on your hands.
- He can be **killed**. Once dead, he drops the stiletto and anything
  he happens to be holding.

Strategic options for dealing with him, in approximate order of
sophistication:

1. **Avoid him** until you are strong, have a good weapon, and know
   where his lair is. (This is harder than it sounds — he has a habit
   of visiting you when you're busy.)
2. **Let him rob you** of *useful* things. You can reclaim them from
   his lair.
3. **Give him something you want opened.** He is a skilled jeweler.
   The jewel-encrusted egg, in particular, has a lock too delicate for
   your fingers. He has no such difficulty.
4. **Kill him, in his lair.** Use the nasty knife (slightly better
   than the sword, against him), bring your health with you, and —
   critically — bring your *score*. See the previous section: your
   fight strength scales with the total points you've accumulated.
   The thief is a 5. You start as a 2. He dominates you three-to-one
   on every exchange until your score climbs past 300, reaches parity
   around 400, and tilts in your favor at 430 and above. This is why
   the conventional order is: gather the easy treasures first, bank
   them in the trophy case, *then* pay the thief a visit. A player
   who tries to kill him at score 25 is attempting a task that the
   game's own arithmetic rejects.

The thief is the game's best-designed antagonist. Treat him well.

---

## Part Two: A Field Guide to Trouble

From here on, this volume is organized by puzzle. Each puzzle is
presented as a question, followed by a series of progressively more
detailed hints, followed — if you are truly stuck — by something very
close to a full answer. Each hint has its own reveal slider; the next
hint's slider only activates once you've read the previous one.

The rule is: **read one hint, close the book, and try again.** The
pleasure of Dungeon is in solving its puzzles, and the book will ruin
that pleasure if you let it.

---

### The Surface and the White House

You begin in an open field west of a white house. There is a mailbox,
a rubber mat, and an unhelpful mention of a boarded front door. What
now?

**Q1. How do I get into the house?**

> Hint 1. The front door is, as mentioned, boarded. But a white house
> has more than one side.
>
> Hint 2. Walk around the house. One of the sides has a window. One
> of the windows is unusual.
>
> Hint 3. Go north, then east. Open the window. Enter.

**Q2. Is there anything useful in the mailbox?**

> Hint 1. Yes.
>
> Hint 2. Open the mailbox.
>
> Hint 3. There is a leaflet inside. Read it. It will not help you
> solve any puzzles, but it does explain what the game is about, and
> it makes useful maze-marker litter.

**Q3. What's in the kitchen?**

> Hint 1. A table. On the table, a sack and a bottle.
>
> Hint 2. Take the bottle. The water in it is worth bringing along.
> The sack is a useful container.

**Q4. What's in the living room?**

> Hint 1. A lantern. A sword. A rug. A trophy case. Some reading
> material.
>
> Hint 2. Take the lantern and the sword. The lantern has a limited
> battery; don't turn it on until you need it.
>
> Hint 3. The rug is not decoration. Try *MOVE RUG*.

**Q5. What is the trophy case for?**

> Hint 1. It is the destination of your career. The game rewards you
> for depositing treasures here.
>
> Hint 2. You get points for *picking up* a treasure and additional
> points for *putting it in the trophy case*. Don't forget the second
> half.

**Q6. How do I get upstairs?**

> Hint 1. The kitchen has a staircase going up. It leads to the attic.
>
> Hint 2. The attic is dark. Bring a light.
>
> Hint 3. There is a useful object in the attic. Take it.

---

### Light in the Dungeon

Everything below the cellar is dark. Without a light source, you will
hear the words *"It is pitch black. You are likely to be eaten by a
grue,"* and shortly thereafter, you will be.

**Q1. What light sources exist?**

> Hint 1. A **brass lantern** in the living room. A **torch**, found
> deeper. **Candles** and **matches**, also found deeper.
>
> Hint 2. The lantern is your workhorse. It has a finite battery —
> turn it off when you don't need it.
>
> Hint 3. The torch never runs out, but it attracts hazards in certain
> rooms. The candles are needed for the Temple puzzle and should be
> kept lit only as briefly as necessary. The matches are consumable.

**Q2. What is a grue?**

> Hint 1. A sinister, lurking presence that never ventures into the
> light, but which is never far from the darkest recesses.
>
> Hint 2. You will never see one. Grues cannot abide light; wherever
> one is, the darkness prevents you from seeing it; and wherever
> light is, there is no grue.
>
> Hint 3. The only safe rooms in darkness are those naturally lit.
> In the absence of natural light, carry a working lamp. Always.

**Q3. My candles went out. Why?**

> Hint 1. Some rooms have drafts. The tiny cave above the Entrance to
> Hades is particularly drafty. Candles blown out by drafts cannot
> relight themselves.
>
> Hint 2. You can always relight them. Bring the matches.
>
> Hint 3. *LIGHT MATCH*, then *LIGHT CANDLES WITH MATCH*.

**Q4. My lamp is getting dim.**

> Hint 1. The battery is running low. You have a few dozen turns left.
>
> Hint 2. There is a spare in the dungeon, but you have to find it.
>
> Hint 3. Look in the Machine Room.

---

### The Forest

North of the white house, the forest looks like a maze. It isn't,
quite. But it will act like one if you don't pay attention.

**Q1. Where are the exits?**

> Hint 1. The forest is small — four rooms, connected in a circle with
> the Clearing at one corner.
>
> Hint 2. From the Clearing, there is a way *down* (through a grating,
> once you find it) and a way back to North of House.

**Q2. The clearing mentions a pile of leaves. What do I do with it?**

> Hint 1. *MOVE LEAVES*. You will find something underneath.
>
> Hint 2. A grating, but it's locked from this side.
>
> Hint 3. The grating can be unlocked from the *other* side, which is
> below. When you arrive there, unlock it, and the Clearing becomes a
> handy shortcut.

**Q3. There's a tree. What do I do with it?**

> Hint 1. Climb it.
>
> Hint 2. *GO UP* or *CLIMB TREE*. You must not be carrying too much.
>
> Hint 3. The treetop contains a bird's nest. In the nest is a
> jewel-encrusted egg. Take it. Do not try to open it here.

---

### The Troll

Down through the cellar (via the trap door under the rug in the living
room) and east, you meet a troll. He carries a bloody axe. He blocks
all the passages out of the room. He is your first fight.

**Q1. How do I get past the troll?**

> Hint 1. You have to kill him. There is no way around.
>
> Hint 2. Bring the sword. Do not try this with bare hands unless you
> are trying to die.
>
> Hint 3. *ATTACK TROLL WITH SWORD*, then *G*, and keep at it. He may
> parry, miss, stagger, or land a blow; eventually one of you falls.

**Q2. The sword is glowing. What does that mean?**

> Hint 1. The sword senses danger.
>
> Hint 2. Faint blue = something unpleasant is nearby. Bright = it's
> in this room.
>
> Hint 3. When the sword stops glowing, you are — at least for the
> moment — safe.

**Q3. Can I use the axe?**

> Hint 1. The troll's axe is described but does not survive his death.
>
> Hint 2. When the troll dies, a black fog envelops his carcass and
> everything he was carrying. The axe vanishes with him. Keep your
> sword.

---

### The Coal Mine and the Bat

South of the Troll Room, a series of passages takes you through the
Mine Entrance, past a Vampire Bat, and into the coal country.

**Q1. The bat grabs me and drops me somewhere random. How do I get past him?**

> Hint 1. The bat is repelled by something pungent.
>
> Hint 2. There is a clove of garlic somewhere in the dungeon.
>
> Hint 3. The garlic is in the brown sack on the kitchen table. Carry
> it, and the bat will leave you alone.

**Q2. What do I do in the Coal Mine?**

> Hint 1. You need coal. To get coal, you need a tool.
>
> Hint 2. There is a shovel in the Slide Room. Dig with it.
>
> Hint 3. *DIG IN PILE WITH SHOVEL*. After a few tries you will
> uncover a small pile of coal.

**Q3. The coal has no visible value. Why do I want it?**

> Hint 1. It is not a treasure in itself.
>
> Hint 2. It is an ingredient in a much larger puzzle.
>
> Hint 3. Coal + machine + pressure = diamond.

**Q4. How do I get the coal out of the mine without being eaten by a grue?**

> Hint 1. You cannot carry a lit torch through the Gas Room — it
> explodes. You cannot carry the unlit lamp *and* have enough light.
> The Gas Room is a bottleneck.
>
> Hint 2. Find a way to move objects through the Gas Room without
> carrying them yourself.
>
> Hint 3. The basket in the Drafty Room connects to a room near the
> coal. Put the coal (and whatever else you need) in the basket and
> retrieve it from the other side via the elevator rope.

---

### The Dam and the Reservoir

North of the Round Room is the Flood Control Dam #3, built by the
Frobozz Magic Flood Control Company and maintained somewhat
intermittently. The dam has a control panel. The control panel has
colored buttons.

**Q1. What do the buttons do?**

> Hint 1. Three of them are harmless. One of them is very much not.
>
> Hint 2. The buttons' colors correspond, in a cute way, to the colors
> of the events they cause. The blue one is the one you should not
> push while standing in the maintenance room.
>
> Hint 3. **Yellow** turns on the bolt's indicator (so the dam can be
> opened). **Brown** drains the reservoir. **Red** fills it back up.
> **Blue** opens a pipe valve, flooding the maintenance room itself.
> Do not push blue and then decide to stay for tea.

**Q2. I pushed blue and I can hear water rising. What do I do?**

> Hint 1. Leave.
>
> Hint 2. You have about fifteen turns before the water goes over your
> head.
>
> Hint 3. If you are trapped — say, because you came by a one-way
> slide — pray that you have the screwdriver. *Plug leak with putty*.

**Q3. How do I drain the reservoir?**

> Hint 1. Open the sluice gates at the dam.
>
> Hint 2. You need a tool. The bolt is tight.
>
> Hint 3. Find the **wrench** in the maintenance room, return to the
> dam, and *TURN BOLT WITH WRENCH*. The gates open and the reservoir
> drains.

**Q4. What's in the drained reservoir?**

> Hint 1. Treasures that were under the water.
>
> Hint 2. A **platinum bar** — no, that's elsewhere. A **trunk of
> jewels** is in the reservoir bed. Walk across and take it.
>
> Hint 3. Don't dawdle. If someone refills the reservoir while you
> are in it, you will drown.

---

### The Loud Room

The Loud Room lives up to its name. Your voice echoes off the walls.
So does every other sound. There is a **platinum bar** here, but if
you try to take it, you hear yourself say "take bar" in a roar and the
parser refuses.

**Q1. How do I quiet the room?**

> Hint 1. The room is a giant echo chamber. Echoes cancel.
>
> Hint 2. The right word — one that describes exactly what the room is
> doing — will cancel the acoustics.
>
> Hint 3. Say *ECHO*. The echoes neutralize each other, the room
> subsides, and the bar is takeable.

**Q2. The room echoes everything I say. Is there anything else I
should say in here?**

> Hint 1. Most phrases echo harmlessly. A handful do something.
>
> Hint 2. The game has two small easter eggs: *BUG* and *FEATURE*.
> They do nothing of use. They are amusing.

---

### The Cyclops

A Cyclops sits in the Cyclops Room, hungry and thirsty. He blocks the
stairs up to the Thief's Treasure Room. He will, given the chance,
eat you.

**Q1. How do I get past him?**

> Hint 1. You can fight him, but he is very strong.
>
> Hint 2. You can feed him, but he is also very thirsty, and feeding
> him is a temporary solution.
>
> Hint 3. He is afraid of a particular name from classical literature.

**Q2. What name?**

> Hint 1. There was once a man who blinded a Cyclops with a hot
> poker and escaped by tying himself under a sheep.
>
> Hint 2. That man's most famous name is five syllables; he also had
> a Latin one, also five syllables.
>
> Hint 3. Say *ODYSSEUS* — or, if you prefer the Roman, *ULYSSES*. The
> Cyclops panics, runs through the nearest wall, and opens a
> permanent shortcut into the Living Room.

**Q3. I said ODYSSEUS and he ran. What's the shortcut for?**

> Hint 1. A way down from the Living Room without the trap door, and
> a way up from deep in the dungeon without the chimney.
>
> Hint 2. Use it every time you need to ferry treasures to the trophy
> case.

---

### The Thief's Treasure Room

At the top of the stairs past the Cyclops is the Thief's Treasure
Room. Everything he has stolen from you ends up here.

**Q1. The thief is here. What do I do?**

> Hint 1. Fight him.
>
> Hint 2. Bring the sword. Bring your health. Save first.
>
> Hint 3. The fight is winnable but not trivial. When he dies, he
> drops the stiletto and the contents of his bag: every treasure he
> stole from you, plus the jewel-encrusted egg he opened in your
> absence, plus whatever he found in the room.

**Q2. What does he do with the egg?**

> Hint 1. He opens it. You can't.
>
> Hint 2. The egg has a delicate mechanism. You need a jeweler's
> touch.
>
> Hint 3. *GIVE EGG TO THIEF*. He will accept it politely, vanish,
> open it in his lair, and leave behind a very interesting broken
> shell and a clockwork canary. Kill him in his lair to collect.

**Q3. What's in the canary?**

> Hint 1. Gears and rubies and a silver beak, but also a song.
>
> Hint 2. The song attracts wildlife. Use it somewhere wildlife lives.
>
> Hint 3. In the Forest Clearing — up a tree, after the egg — *WIND
> CANARY*. A songbird responds with a dropped **brass bauble**,
> another treasure.

---

### The Temple and the Land of the Living Dead

Beyond the Round Room and the Narrow Crawlway lies the Temple, a
two-room shrine containing a **bell** (west end), a **book**
(east-end altar), and a pair of **candles** (east-end altar). Below
the Temple is the Entrance to Hades, where the spirits of the dead
bar the gates.

**Q1. What is the Temple for?**

> Hint 1. It is the key to entering the Land of the Living Dead alive
> and to surviving death with more dignity.
>
> Hint 2. The bell, the book, and the candles together perform an
> exorcism.

**Q2. How do I perform the exorcism?**

> Hint 1. Bring all three items — and a match — to the Entrance to
> Hades.
>
> Hint 2. The ceremony has three parts, in a specific order.
>
> Hint 3. *RING BELL* (the wraiths freeze; the hot bell falls from
> your hand), then *LIGHT MATCH* and *LIGHT CANDLES WITH MATCH*, then
> *READ BOOK*. The spirits flee through the walls. You may now pass
> east through the gate.

**Q3. Why would I want to be exorcised?**

> Hint 1. Points. The Entrance itself, the Land, and the Tomb of the
> Unknown Implementer beyond are worth points.
>
> Hint 2. Also, if you die *after* being exorcised, the post-death
> message changes. You are still dead, but the game stops treating
> you as damned.
>
> Hint 3. Do not attempt the exorcism a second time after it has
> succeeded. It kills you.

**Q4. My candles went out on the way to Hades. Now what?**

> Hint 1. The tiny cave above Hades has a draft. Candles are
> unreliable there.
>
> Hint 2. Relight them. You brought a match; use it.
>
> Hint 3. Or drop the candles before ringing the bell. Ringing the
> bell while carrying lit candles drops them anyway and extinguishes
> them. Either way, the fix is *LIGHT MATCH*, *LIGHT CANDLES WITH
> MATCH*, then proceed.

---

### The Rainbow, the Barrel, and the River

The Frigid River flows through the middle of the dungeon. You can
follow it in a boat. It leads to a waterfall, to a rainbow, to a
beach, and at one point, with luck, to a chasm at Aragain Falls.

**Q1. How do I sail the river?**

> Hint 1. You need a **boat**. There isn't a real one, but there is
> an **inflatable** one.
>
> Hint 2. It's in the Dam Lobby, rolled up into a pile of plastic.
> You also need a way to inflate it.
>
> Hint 3. The air pump is elsewhere; bring it. *INFLATE BOAT WITH
> PUMP*. Launch at the dam base.

**Q2. I'm on the river. Where do I go?**

> Hint 1. You float south. You cannot paddle upstream.
>
> Hint 2. There are several landings. Watch for them in the room
> descriptions. Use *LAND* to disembark at any safe one.
>
> Hint 3. Past a certain point you reach Aragain Falls. Do not go
> over the falls.

**Q3. There's a rainbow at Aragain Falls. How do I cross it?**

> Hint 1. Rainbows are insubstantial by default. You need to make
> this one solid.
>
> Hint 2. There is a magical object whose purpose is to make light
> solid.
>
> Hint 3. **Wave the sceptre** (found in the Royal Puzzle further
> below) at the rainbow. It solidifies. Walk across for the **pot of
> gold**.

**Q4. What's the barrel for?**

> Hint 1. It is not a container in the normal sense.
>
> Hint 2. It is a mode of transport, mostly fatal.
>
> Hint 3. It's a joke. The hint book itself recommends *GERONIMO*.
> Say it from inside the barrel. You will go for quite a ride.

---

### The Wizard's Domain

Deep in the dungeon is the Wizard's study — a small square room with
four cakes on a table, a fluorescent flask, and a door to a curious
room full of mirrors. The cakes are labeled, if you can read them.

**Q1. What are the cakes for?**

> Hint 1. They change your size.
>
> Hint 2. One shrinks you. One enlarges you. One evaporates water.
> One is not for eating at all.
>
> Hint 3. *EAT-ME* makes you large enough to cross the Leak Room but
> small enough to be harmless. *Blue* returns you to normal. *Red*
> dries up a pool and reveals a hidden tin. *Orange* is — we'll leave
> this one to you.

**Q2. Why would I want to shrink?**

> Hint 1. There are corridors designed for people smaller than you.
>
> Hint 2. The Wizard's laboratory and the rooms beyond it are one such
> region.
>
> Hint 3. Eat *EAT-ME*, then go through the small east passage. Do
> not forget to eat blue on the way back.

**Q3. There's a robot in the machine room. What do I do with him?**

> Hint 1. He responds to orders. He does what you say, literally.
>
> Hint 2. *TELL ROBOT "GO EAST"*. *TELL ROBOT "PUSH TRIANGULAR
> BUTTON"*. *TELL ROBOT "LIFT CAGE"*. Think of him as a remote-
> controlled ally with a narrow mind.
>
> Hint 3. The robot can push the geometrical buttons in the Machine
> Room, which you cannot (you die if you touch them). He can also
> lift the cage that traps you in the sphere closet.

**Q4. What are the geometrical buttons?**

> Hint 1. They control the Carousel.
>
> Hint 2. **Square** speeds the Carousel. **Round** slows it.
> **Triangular** toggles it on and off. You want it off when
> traveling through it.
>
> Hint 3. Warning: the Magnet Room, adjacent to the Carousel, will
> re-enable it whenever you pass through while the Carousel is off.
> Plan accordingly.

**Q5. The Carousel spins my compass and dumps me in the wrong room.**

> Hint 1. While spinning, it picks a random exit for you.
>
> Hint 2. If the Carousel is stopped (triangular button pushed by
> the robot), its exits are ordinary.
>
> Hint 3. If it's spinning and you're forced to cross, accept that
> you will arrive somewhere unexpected and map it from there.
> Dropping markers helps.

---

### The Bank of Zork

Entered from the Gallery north of the Cellar, the Bank of Zork is a
small, elegant, maddening place. It has a lobby, a chairman's office,
two teller rooms, a safety depository, and a vault. Also some
portraits.

**Q1. The walls between rooms flicker. What's that?**

> Hint 1. They are not walls. They are illusions.
>
> Hint 2. The "curtain of light" between certain bank rooms is an
> illusion. You can walk through it.
>
> Hint 3. *WALK THROUGH NORTH WALL* (for example). The entrance you
> use determines where you end up — it is not symmetric.

**Q2. I'm trapped in the vault.**

> Hint 1. The vault door closed. That's on purpose.
>
> Hint 2. There is no physical way out, but there may be an
> illusory one.
>
> Hint 3. The vault has its own curtain trick. Try walking through
> the same wall you came in through. Or, if you triggered the alarm,
> pray. If neither works and the timer runs out — the bank calls
> the guards, and the guards do not read hint books.

**Q3. What treasures are here?**

> Hint 1. A **stack of bills** and a **portrait of J. Pierpont
> Flathead**. Both count toward the trophy case.
>
> Hint 2. The portrait is in the Chairman's office, the bills in
> the Vault. Both will require walking through walls to recover.

---

### The Dragon and the Ice Room

Deep in the dungeon is a Dragon Room. The dragon is asleep. He wakes
up when you attack him. He does not die easily. He does, however,
have a weakness.

**Q1. Fighting the dragon head-on gets me killed.**

> Hint 1. That is because you are fighting a dragon.
>
> Hint 2. Your sword will not suffice.
>
> Hint 3. You need him to kill himself. Dragons have a flaw shared by
> cats and small children: they are confused by mirrors.

**Q2. How do I get him to a mirror?**

> Hint 1. Lure him. He pursues when attacked.
>
> Hint 2. There is a reflective surface nearby — an iceberg in the
> Ice Room.
>
> Hint 3. Anger the dragon in the Dragon Room, then retreat step by
> step. He follows. When you reach the Ice Room, the dragon sees his
> reflection in the glacier, charges it with flame, melts the
> glacier, and drowns. The passage west through the Ice Room is now
> open; inside are a number of treasures, including the **sapphire
> bracelet**.

**Q3. The lamp went out in the Ice Room.**

> Hint 1. Bring a torch instead.
>
> Hint 2. Or, if you must, carry matches and candles as backup.

---

### The Volcano

At the very top of the Wizard's domain, through the Machine Room and
beyond the Robot's closet, there is a Volcano. Reaching it requires a
**hot-air balloon**.

**Q1. Where is the balloon?**

> Hint 1. In the Volcano Floor, in the Receptacle Room.
>
> Hint 2. It's in pieces. You must inflate it and attach the basket.

**Q2. How do I launch?**

> Hint 1. The receptacle is a fuel burner. Fill it with something
> flammable and light it.
>
> Hint 2. The U.S. News & Dungeon Report from the living room makes
> excellent fuel.
>
> Hint 3. *PUT REPORT IN RECEPTACLE*, *LIGHT MATCH*, *LIGHT
> RECEPTACLE WITH MATCH*. The balloon rises.

**Q3. The balloon only goes up and down. How do I reach the ledges?**

> Hint 1. There are three ledges at different heights. You stop at
> them automatically when passing.
>
> Hint 2. *TIE ROPE TO HOOK* at the ledge you want, disembark, do
> your business, untie when ready to continue.
>
> Hint 3. The receptacle can be closed (descend) or opened (ascend).
> Ride up to each ledge, land, take treasure, untie, continue.

---

### The Palantirs

In later rooms of the dungeon, especially near the endgame, you will
find dark crystal balls. They are palantirs.

**Q1. What does a palantir show?**

> Hint 1. It shows you another room. Sometimes a room you have been
> to, sometimes one you haven't.
>
> Hint 2. *LOOK IN PALANTIR*. You will see a brief description.
>
> Hint 3. Each palantir is linked to another palantir in another
> room. You can see what's happening around the linked palantir —
> and sometimes be seen by things there. Use carefully.

**Q2. Why do I want one?**

> Hint 1. Points, mostly.
>
> Hint 2. Information — the palantirs reveal things about rooms you
> haven't reached yet.
>
> Hint 3. The Palantir puzzle is one of the newer V3.0 additions and
> is largely about careful observation. There is no trick; there is
> just attention.

---

### The Endgame

When every treasure is in the trophy case, something changes.

**Q1. I've put everything in the case. Now what?**

> Hint 1. Walk back to the living room. Something has happened.
>
> Hint 2. The case speaks. Or something near the case speaks.
>
> Hint 3. A voice whispers. A map appears. Take it.

**Q2. Where does the map lead?**

> Hint 1. Somewhere near the surface you haven't used yet.
>
> Hint 2. The Stone Barrow, west of the Clearing.
>
> Hint 3. Go to the Clearing. Follow the secret path southwest. Enter
> the Barrow. You leave the dungeon behind and enter the Endgame.

**Q3. What is the Endgame?**

> Hint 1. It is a second game — a test — that evaluates whether you
> are worthy to become the Master Adventurer.
>
> Hint 2. It contains puzzles of its own, with its own points table.
> Your dungeon score carries over as context, but the Endgame has its
> own challenges.
>
> Hint 3. We will not spoil the Endgame here. Volume II has the full
> walkthrough. Read it if and only if you want the full 616.

---

## Part Three: Appendices

---

### Magic Words

Certain words have magical effects. Others pretend to. Some of the
most famous pretenders:

- **XYZZY.** In the Colossal Cave Adventure, it teleported you between
  the Building and the Debris Room. In Dungeon, a hollow voice says
  "Fool." So does the game's creator, in spirit.
- **PLUGH.** Same story. Hollow voice, same fool.
- **PLOVER.** Also from Colossal Cave. Not here.

Words that actually work:

- **ECHO** (in the Loud Room): cancels the echoes; lets you take the
  platinum bar.
- **ULYSSES / ODYSSEUS** (in the Cyclops Room): terrifies the cyclops.
- **FROBOZZ / FROBIZZ / FROBNOZ**: name of the magic company; does
  nothing by itself but appears everywhere.
- **HELLO SAILOR**: the most famous useless phrase in the Great
  Underground Empire. It does something in one specific place. You
  will know it when you find it, or when Volume II tells you.
- **GERONIMO** (in the barrel): sends you on a ride.
- **KADATH** and other Lovecraft-derived words: try them on the
  Cyclops's menu.

---

### Have You Ever …?

This is the traditional hint-book appendix — a list of things worth
trying at least once, for curiosity or amusement. None advance the
game.

- …eaten the leaflet from the mailbox?
- …waved the sceptre while standing on the rainbow?
- …asked the bird to carry you?
- …tried *SAY HELLO* to the troll?
- …rubbed the lamp like it was a genie?
- …given the garlic to the thief?
- …opened the sack while standing in the wind?
- …read the magazines?
- …left the trophy case full and gone for a walk?
- …died on purpose to see the Living Dead message?
- …kicked the bucket?
- …said *GERONIMO* outside the barrel?
- …asked the gnome a question?
- …closed the trap door behind you?

---

### Ranks and Titles

The game ranks you based on your score. The thresholds vary slightly
between versions; the ranks themselves do not.

| Score | Rank |
|-----:|:-----|
| 0 | Beginner |
| 25 | Novice Adventurer |
| 100 | Junior Adventurer |
| 200 | Adventurer |
| 300 | Master |
| 400 | Wizard |
| 500 | Master Adventurer |
| 550 | Dungeon Master |
| 616 | Cavalier of the Realm |

The final 616 is obtainable only with perfect play, including the
Endgame. A negative score (achieved by dying three times in quick
succession, or by dropping treasures into bottomless places on
purpose) earns the rank of **Beginner** plus a short admonishment.

---

### On Style

The voice of this guide is in debt to two sources: the printed
hint-book tradition of the 1980s, which taught a generation of
adventurers to enjoy partial spoilers by revealing them one layer
at a time; and the game's own 1994 *HELP* text, written by the
anonymous translator who would eventually be identified as Bob
Supnik and who, like his translator character, preferred to remain
anonymous for a very long time.

The author has followed the old convention of progressively
revealing hints, and has tried to preserve the dry, slightly arch
voice of that era. Any failure of wit is the author's; any success
is an echo.

If you cleared the dungeon with this book as your only companion, you
did most of the work. If you cleared it without opening this book,
close it now. If you are reading this and still haven't started,
turn off the computer, find some graph paper, and go.

---

*Continued in Volume II: The Complete Walkthrough.*
