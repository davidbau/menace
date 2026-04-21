# The Adventurer's Companion to the Great Underground Empire

## Volume II: The Complete Walkthrough

<p style="text-align: center; font-style: italic; margin: 1.5em 0;">"The dungeon is listening, but by this point it knows who you are."</p>

---

## Before You Read Further

Reader, a warning with more force than the one in Volume I: **this book
spoils everything**. If you have not played Dungeon, close it now. If
you have played it and solved some of its puzzles, close it now and go
solve the rest. If you have played it and you are **stuck** — not stuck
in the sense of *I need to think about this another day*, but stuck in
the sense of *I have exhausted every idea I had last week* — then welcome,
you have done the work of earning this book, and here is your reward.

This is not a hint book. It is a complete 616-point walkthrough. Every
treasure, every puzzle, every obscure command is spelled out in the
order a perfect run executes them. Commands are printed in
`fixed-width type`. Room names appear in **bold**. Notes are in
*italics*. Where the exact RNG outcome matters, we flag it.

The walkthrough assumes the Fortran 4.0 version as ported and maintained
by the archive. On other builds, small variations are possible — for
instance, the troll fight duration depends on the PRNG seed and may
take a couple more or fewer swings.

The walkthrough is structured as **twelve acts**, roughly corresponding
to geographic regions. A reader who has already completed some of them
can skip ahead. A reader starting from scratch should follow straight
through.

---

## Table of Contents

1. [Act I: Opening the House](#act-i-opening-the-house)
2. [Act II: The Cellar and the Troll](#act-ii-the-cellar-and-the-troll)
3. [Act III: The Coal Mine and the Basket](#act-iii-the-coal-mine-and-the-basket)
4. [Act IV: The Dam and the Reservoir](#act-iv-the-dam-and-the-reservoir)
5. [Act V: The Temple and the Land of the Living Dead](#act-v-the-temple-and-the-land-of-the-living-dead)
6. [Act VI: The Loud Room and the Cyclops](#act-vi-the-loud-room-and-the-cyclops)
7. [Act VII: The Mazes and the Thief's Lair](#act-vii-the-mazes-and-the-thiefs-lair)
8. [Act VIII: The River, the Rainbow, and the Barrel](#act-viii-the-river-the-rainbow-and-the-barrel)
9. [Act IX: The Wizard's Domain and the Robot](#act-ix-the-wizards-domain-and-the-robot)
10. [Act X: The Bank of Zork](#act-x-the-bank-of-zork)
11. [Act XI: The Dragon, the Ice, and the Volcano](#act-xi-the-dragon-the-ice-and-the-volcano)
12. [Act XII: The Endgame](#act-xii-the-endgame)

**Appendices**

- [Appendix A: The Complete Treasure List](#appendix-a-the-complete-treasure-list)
- [Appendix B: The Master Map](#appendix-b-the-master-map)
- [Appendix C: Magic Words, Verbs, and Shortcuts](#appendix-c-magic-words-verbs-and-shortcuts)
- [Appendix D: The Combat Arithmetic](#appendix-d-the-combat-arithmetic)
- [Appendix E: Death Scenarios and Prevention](#appendix-e-death-scenarios-and-prevention)
- [Appendix F: The Last Point](#appendix-f-the-last-point)

---

## Act I: Opening the House

You begin at **West of House**, an open field. There are three
surface objects to collect before descending.

```
> open mailbox
Opening the mailbox reveals:
   A leaflet.
> take leaflet
Taken.
> read leaflet
...
```

The leaflet is worth keeping — not for its contents, but because you
can later use it as a maze marker. Next:

```
> go north
North of House.
> go east
Behind House.
> open window
With great effort, you open the window far enough to allow entry.
> enter
Kitchen.
> take bottle
Taken.
```

You now have the **glass bottle** (contains water). Leave the brown
sack where it is for now unless you are inventory-heavy; it contains
lunch and a clove of garlic. Go up the staircase:

```
> go up
Attic.
> take all
nasty knife: Taken.
rope: Taken.
```

*The attic is dark unless the living room's lamp is on — but we haven't
lit it yet. Dungeon handles this with the following oddity: on the
first visit, the attic is implicitly lit by ambient light from below,
but on later visits you need light. Take all items now.*

Return to the kitchen and across to the Living Room:

```
> go down
Kitchen.
> go west
Living Room.
> take lamp
Taken.
> take sword
Taken.
> take newspaper
Taken.
> move rug
With a great effort, the rug is moved to one side of the room.
With the rug moved, the dusty cover of a closed trap door appears.
> open trap door
The door reluctantly opens to reveal a rickety staircase descending
into darkness.
> turn on lamp
The lamp is now on.
```

You are now carrying: leaflet, bottle, nasty knife, rope, lamp
(lit), sword, U.S. News & Dungeon Report. The **trophy case** is
here; visit it often.

*Note: the elvish sword glows blue when an enemy is nearby and bright
white when one is in the room. Watch for this; it is a free warning
system.*

---

## Act II: The Cellar and the Troll

```
> go down
Cellar.
(the trap door slams shut behind you)
Your sword is glowing with a faint blue glow.
> go east
Troll Room.
(a nasty-looking troll, brandishing a bloody axe, blocks all passages)
Your sword has begun to glow very brightly.
> attack troll with sword
> again
> again
> again
```

Four to six swings will usually finish the troll. On a bad roll he
lands a wounding blow; on a very bad one you are knocked unconscious
and may need to reload a save. *DIAGNOSE* after the fight if you're
not sure. When he dies:

```
The troll takes a final blow and slumps to the floor dead.
Almost as soon as the troll breathes his last, a cloud of sinister
black smoke envelops him, and when the fog lifts, the carcass has
disappeared.
```

*The troll's body and axe both vanish; do not wait for loot.* You now
have uncontested access to the cave system east. From the Troll Room
there are four useful directions:

- **N** → East-West Passage → E → Round Room (hub of many caves)
- **E** → North-South Crawlway (eventually to the Maze)
- **S** → South-of-Troll / Round Room area via different approach
- **W** → back to Cellar

Take the north route first.

```
> go north
East-West Passage.
> go east
Round Room.
```

The Round Room has a **dented steel box** containing a fancy violin
and is the hub of the middle dungeon. From here:

- **N** → Deep Canyon → E → Flood Control Dam #3
- **NE** → Chasm / Dome Room approach
- **NW** → also Deep Canyon (alternate path)
- **E** → Engravings Cave → Riddle Room → Pearl Room → Top of Well
- **SE** → Carousel / Machine Room access
- **UP/DOWN** → (conditional)

---

## Act III: The Coal Mine and the Basket

From the Troll Room, take the south route this time:

```
> go south
South of House (you arrive via the chimney — if not, detour).
```

Actually, the shortest path to the coal mine from the Troll Room is
east into the Maze area and then down. But since we haven't mapped the
Maze yet, it's simpler to approach via the Cellar's south crawlway:

```
> go west (to Cellar)
> go south
East-West Passage (a different one)
> go south
Round Room (via a scrambled carousel exit; if the carousel is spinning,
you may end up somewhere else — save first).
```

*The cleaner path: from the Round Room, go down to the Engravings
Cave, southeast to the Riddle Room (answer "well"), east to the Pearl
Room, east to the Top of Well, and use the bucket for the well
puzzle. But the coal mine requires a different descent.*

The coal mine is reached via the Mine Entrance, which lies north of
**Timber Room**, which lies east of **Smelly Room**, which is reached
via a series of twisty cave passages from the south of the Troll
Room. Get to the Slide Room (via the crawlway from the Cellar):

```
> go south (from Cellar)
Crawlway.
> go down
Slide Room.
> take shovel
Taken.
```

From the Slide Room, the slide itself is a one-way to the Smelly
Room. Save first:

```
> go down
(you slide into the Smelly Room)
> go north
Smelly Room... wait, we came from the slide which is one-way.
```

*Correction: the slide deposits you in the Cellar. The coal mine is
reached via the Timber Room and the Cave descent. Consult the master
map in Appendix B if confused.*

Path to the coal:

```
Troll Room → E → N-S Crawlway → E → (north-south crawlway, lit) →
S → Timber Room → (drop timber to create a bridge) → S → Mine
Entrance → Squeezy Room → Smelly Room → Coal Mine
```

Once in the Coal Mine:

```
> dig in pile with shovel
> again
> again
> again
(on the fourth or fifth dig, the message changes)
You uncover a small pile of coal.
> drop shovel
> take coal
Taken.
```

Return north to the **Drafty Room** (where there is a **basket** on a
rope). Put items in the basket:

```
> put coal in basket
> put torch in basket (if you have it)
> put screwdriver in basket (ditto)
> lower basket
```

Now exit up through the chimney to the Living Room, cross west and
down to the Cellar, and thence back to the Drafty Room's upper level
(the Dome Room). Take the rope descent:

```
> tie rope to railing
> climb down rope
Torch Room.
> take torch
Taken.
> raise basket
> take coal (and other items from the basket)
```

You now have: coal, torch, whatever else you lowered. The torch is a
treasure in its own right (15 points carried, 15 for the case).

**Making the diamond.** Go west to the **Machine Room**:

```
> open lid
The lid is open.
> put coal in machine
Done.
> close lid
The lid is closed.
> turn switch with screwdriver
The machine comes to life (figuratively) with a dazzling display of
colored lights and bizarre sounds.
> open lid
The lid is open.
> look in machine
There is an enormous diamond inside.
> take diamond
Taken.
```

The diamond is 50 points and another 50 in the case. Put it in the
basket, raise it, and exit via the Torch Room / Dome Room up to the
Temple area.

*Note: the Ice Room (via Dragon) requires the diamond or can give you
a second diamond. Volume II does not require two; it uses the coal-
mine diamond.*

---

## Act IV: The Dam and the Reservoir

From the Round Room, go north to the Deep Canyon and east to the Top
of the Dam. Optionally visit Dam Lobby (Dam → N) to pick up
**matchbook**, **guidebook**, and then east to **Maintenance Room**
for **tube** of putty, **wrench**, and **screwdriver**.

```
Round Room
> walk nw
South of Canyon.
> run east
Top of Dam.
> proceed north
Dam Lobby.
> take all
tour guidebook: Taken.
matchbook: Taken.
> read matchbook
[some advertising text]
> send for free brochure
Ok, but you know the postal service...
> go east
Maintenance Room.
> take all
tube: Taken.
wrench: Taken.
screwdriver: Taken.
> push yellow button
Click.
(the Dam's green bubble lights up — the bolt can now be opened)
```

Do **not** push the blue button. If you do, you have about fifteen
turns before the water is over your head. *Plug leak with putty*
using the tube saves you if you're trapped.

Return to the Dam:

```
> walk west
Dam Lobby.
> run south
Top of Dam.
> turn bolt with wrench
The sluice gates open, and water pours through the dam.
```

The Reservoir drains. Go get the treasures:

```
> go down
Base of Dam.
> proceed north
Reservoir South.
> go north
Reservoir.
> take all
trunk of jewels: Taken.
> run north
Reservoir North.
> take all
air pump: Taken.
```

*Do not push the yellow button again after draining — it does
nothing. If someone else were to push red (fill the reservoir) while
you are in it, you would drown. There is no one else.*

---

## Act V: The Temple and the Land of the Living Dead

Head toward the Temple. From the Round Room:

```
> go east
Engravings Cave.
> go se
Riddle Room.
> answer "well"
There is a clap of thunder, and the east door opens.
> go east
Pearl Room.
> take necklace
Taken.
> go east
Top of Well.
```

*Leave the well for the moment — you will come back through it from
below when you do the bucket ride.*

To reach the Temple, the direct route is: from the Round Room, east
to the Engravings Cave, north to the North-South Crawlway, east to
the Grail Room, then up to Temple West End (**bell**) and east to
Temple East End (**candles** and **book**).

```
Round Room → E (Engravings) → N → N-S Crawlway →
E → Round Room (alt entry; we're in the wrong cavern - the grail
room is reached from mirror/crawlway system. Use:)

Round Room → NE → High N-S Passage → NE → Loud Room
```

*The exact layout is: to reach the Grail Room, you either come from
above via the cave system (Mirror Room → Narrow Crawlway → Grail
Room) or via the direct Engravings/Round path. The carousel disables
the Round Room exits while spinning — see Act IX. For now we use the
Mirror route:*

Via Mirror:
```
Round Room → (scramble; with carousel off this is direct)
 → Cave ("tiny cave") → W → Mirror Room → N → Narrow Crawlway →
 N → Grail Room → up → Temple West End (bell) → E → Temple East
 End (book, candles)
```

Collect all three items:

```
> take bell
Taken.
> go east
Temple East End.
> take candles
Taken.
> take book
Taken.
```

Also take the **grail** from the Grail Room on the way back:

```
> go west
Temple West End.
> go west
Grail Room.
> take grail
Taken.
```

Now descend to the Entrance to Hades:

```
> go east
Narrow Crawlway.
> go south
Tiny Cave.
> go down
Entrance to Hades.
```

*Warning: the tiny cave has a draft that extinguishes carried lit
candles about half the time. If your candles go out en route, relight
them with a match before starting the exorcism.*

Perform the exorcism. The order is rigid:

```
> drop candles
Dropped.
> ring bell
Ding, dong. The bell suddenly becomes red hot and falls to the ground.
The wraiths, as if paralyzed...
> take candles
Taken.
> light match
One of the matches starts to burn.
> light candles with match
The candles are lit.
> read book
[commandment text; wraiths flee through the walls]
```

*The sequence is load-bearing: ring bell BEFORE taking candles so
the ring doesn't drop the candles and extinguish them. If ringing
while carrying lit candles, they are dropped and extinguished and
must be relit before reading the book. Alternatively, drop the
candles first, ring bell, pick them up, light them, read book — the
sequence above reflects this safer path.*

You may now pass east through the gate:

```
> go east
Land of the Living Dead.
> take all
[skeletons, bones; some are treasures]
> go east
Tomb of the Unknown Implementer.
> examine tomb
Here lie the implementers, whose heads were placed on poles by the
Keeper of the Dungeon for amazing feats of incompetence.
```

Return to the Entrance to Hades:

```
> go west
Land of the Living Dead.
> go west
Entrance to Hades.
```

The **skull** (from the Land of the Living Dead) is a treasure. Add
it to your inventory.

---

## Act VI: The Loud Room and the Cyclops

The Loud Room lies east of the Dome Room area. From the Round Room:

```
> go ne
High N-S Passage.
> go ne
Loud Room.
> echo
The acoustics of the room change subtly.
> take bar
Taken.
```

The **platinum bar** is 10 points and 10 in the case.

Continue east:

```
> go east
Deep Ravine.
> go east
Dam (alt entry).
```

Or back west to visit the Cyclops. The Cyclops is reached from the
Living Room via a path that only opens once you scare him. Since we
haven't scared him yet, approach from below:

```
Round Room → NE → ... → (see map) → Cyclops Room
```

The most reliable route is via the North-South Crawlway / Studio path:

```
Troll Room → E → N-S Crawlway → E → Studio (art gallery approach) →
U → Kitchen (shortcut!) → W → Living Room.
```

Actually the Cyclops Room is reached through the Labyrinth area — it
sits above an art gallery and below the Treasure Room. The canonical
path:

```
Cellar → S → East-West Passage → E → Round Room → NE → High N-S
Passage → (several rooms) → Studio → U → Kitchen OR → Cyclops Room.
```

See Appendix B for the exact map. When you arrive at the Cyclops:

```
Cyclops Room.
The cyclops, who is very narrow-minded, blocks your way.
> say odysseus
The cyclops, hearing the name of his father's deadly nemesis, flees
the room by knocking down the wall on the east side.
```

*A permanent east passage from the Cyclops Room to the Living Room
has just opened. This is the game's most useful shortcut and the
reason you want to scare the cyclops before engaging the thief.*

Climb up:

```
> go up
Treasure Room.
```

---

## Act VII: The Mazes and the Thief's Lair

The Treasure Room is the thief's lair. He may or may not be present
when you arrive.

**If the thief is present:**

```
> attack thief with sword
> again
> again
```

Save before this fight. Use the elvish sword *or* the nasty knife —
the knife is slightly better against the thief. He is formidable. A
typical outcome is three to eight exchanges, with luck deciding who
falls.

**If the thief is absent** (he's wandering):

Take everything.

```
> take all
chalice: Taken.
jewel-encrusted egg: Taken.
...
```

Among the treasures: chalice, egg (opened if you gave it to him
earlier), canary, silver chalice, gold coffin, and whatever else you
or he has deposited.

*The thief will follow you out if he returns. Always be ready to
fight.*

**The Egg Sequence (critical for full points):**

1. Take the egg from the Forest Clearing tree, early game.
2. Encounter the thief (any time after reaching the Cellar). Give him
   the egg: `give egg to thief`. He accepts and vanishes.
3. Return later to his lair. The egg is open. Take the egg shell and
   the **clockwork canary** inside.
4. Carry the canary up to the Forest Clearing tree.
5. `wind canary`. A songbird responds and drops a **brass bauble**.
   Take it.

**The Maze.** East of the Troll Room is a classic twisty maze. It
contains the **coffin** (an important treasure and an inventory burden)
in one of its rooms. Navigate by dropping the leaflet, the
newspaper, and similar junk one per room, walking, looking, and
mapping. Appendix B contains the solved map; alternatively, a typical
exploration sequence from the Troll Room is:

```
Troll Room → E → N-S Crawlway → E → Maze → (drop marker) → N →
(drop marker) → ... (see map)
```

The coffin is in one of the deeper maze rooms. Carrying it restricts
some passages — you cannot, for instance, go through the crawlway
under the mirror while holding it. Drag it out by a non-crawlway
route to the Living Room trophy case.

---

## Act VIII: The River, the Rainbow, and the Barrel

Return to the Dam Base. Inflate the boat:

```
Base of Dam.
> inflate boat with pump
The boat inflates.
> board boat
You are now in the boat.
> launch
```

You drift south down the Frigid River. Important landmarks to
disembark at:

1. **Sandy Beach** (east bank, after a few rooms). *LAND*. Contains a
   shovel and a sandbar (with a treasure if you dig).
2. **Red Beach** (west bank). Contains a **buoy**. Take the buoy;
   it has something inside.
3. **Aragain Falls**, at the south end. Do **not** go over the
   falls. Disembark at the bank just before.

```
> land
You disembark.
> open buoy
Opening the buoy reveals:
   An emerald.
> take emerald
Taken.
```

At **White Cliffs Beach** (north side of Aragain), disembark:

```
> land
White Cliffs Beach, North.
> go south
White Cliffs Beach, South.
```

The **Rainbow Room** is nearby. You need the **Royal Sceptre** from
the **Royal Puzzle** — which is the puzzle you haven't done yet. Put
this on hold. First finish the Wizard's domain (Act IX) to get the
sceptre, then return.

Once you have the sceptre:

```
Rainbow Room.
> wave sceptre
The rainbow solidifies.
> go east (across the rainbow)
End of Rainbow.
> take gold
Taken. (pot of gold)
```

**The Barrel.** In Gas Room / White Cliff area is the Barrel Room.

```
> board barrel
You are now in the barrel.
> say geronimo
The barrel rolls off the cliff and down the waterfall.
```

You end up at the bottom of the falls. Emerge and continue the
river journey on foot back up. The barrel itself is a treasure and
is transported with you; put it in the case later.

---

## Act IX: The Wizard's Domain and the Robot

Follow the cake puzzle. From the Pearl Room / Top of Well area:

```
Top of Well.
> get inside bucket
You are now in the wooden bucket.
> open bottle
Opened.
> pour water in bucket
There is now a puddle in the bottom of the wooden bucket.
(the bucket rises; you are now at Top of Well's counterpart)
> get out of bucket
You are on your own feet again.
> go east
Tea Room.
> take all
piece of "Eat-Me" cake: Taken.
piece of cake with orange icing: Taken.
piece of cake with red icing: Taken.
piece of cake with blue icing: Taken.
> eat eatme cake
Suddenly, the room appears to have become very large.
> go east
Pool Room (depressed half).
> throw red cake
The pool of water evaporates, revealing a tin of rare spices.
> take tin
Taken.
> walk west
Enormous Room.
> eat blue cake
The room around you seems to be getting smaller.
> walk nw
Low-Ceiling Room.
```

You are now approaching the Robot. Command him:

```
> tell robot "go east"
"Whirr, buzz, click!" Done.
> run east
Machine Room.
> tell robot "push triangular button"
"Whirr, buzz, click!" A dull thump is heard in the distance.
```

The carousel is now disabled. Continue:

```
> tell robot "go south"
"Whirr, buzz, click!" Done.
> go south
Closet with Sphere.
> get sphere
As you reach for the sphere, a steel cage falls from the ceiling to
entrap you.
> tell robot "lift cage"
The cage shakes and is hurled across the room.
> get sphere
Taken.
```

The **crystal sphere** is an important navigation / palantir item.

Return north:

```
> proceed north
Machine Room.
> walk west
Low Room (magnet).
> stare
> stare
(stare has special effects here)
> walk se
(with carousel off, you exit cleanly)
Tea Room.
```

Collect the **Royal Sceptre** from the Royal Puzzle. The Royal Puzzle
is a box-pushing puzzle — complex enough to warrant its own section
(see Appendix B, Royal Puzzle Solution). Once solved, you have the
**sceptre** and can cross the Rainbow (see Act VIII).

---

## Act X: The Bank of Zork

Entered from the Gallery, which is reached via the Art Studio north
of the Cellar path.

```
Cellar → S → Crawlway → (further south and southwest)
 → Art Studio → take painting → walk west → Bank Entrance
```

Actually, the Bank of Zork is reached more cleanly via:

```
Troll Room → E → N-S Crawlway → SE → Art Studio → take painting →
walk west → Bank Entrance.
```

Inside the Bank:

```
Bank Entrance.
> go nw
Small Room (teller's).
> walk through south wall
West Teller's Room (or East, depending on your entry).
> proceed west
Safety Depository.
> take all
painting: Taken. (already had one, leave this one)
stack of zorkmid bills: Taken.
portrait of J. Pierpont Flathead: Taken.
> walk through north wall
Back to the other side.
> walk south
Bank Entrance.
```

*The walk-through-walls mechanic is the whole puzzle: the curtains of
light between rooms are one-way illusions, and the room you arrive in
depends on the wall you walked through and your direction.*

**The Vault.** If you accidentally close the vault door or trigger
the alarm, you are trapped. The vault has its own wall-walking trick
that lets you out — see the guidebook in the Dam Lobby for the subtle
hint. The safe solution: never close the vault door, always carry the
guidebook as insurance.

---

## Act XI: The Dragon, the Ice, and the Volcano

**The Dragon.** Reached via a particular twist of the cave system
(see map). The dragon is asleep on entry.

```
Dragon Room.
> attack dragon
> go west
Ice Room.
(the dragon follows)
> wait
> wait
(the dragon sees his reflection, charges, melts the glacier, drowns)
```

The glacier melts. The passage west through the Ice Room opens:

```
> go west
Ice-Cave (formerly a glacier).
> take all
sapphire bracelet: Taken.
```

**The Volcano.** Reached via the Volcano Floor, at the end of a chain
of cave passages from the Machine Room. Alternatively, via balloon
from the top of the Volcano after ascending.

```
Volcano Floor.
> take balloon
Taken.
> take receptacle
Taken.
(move to a takeoff spot — the receptacle room)
> put report in receptacle
> light match
> light receptacle with match
The balloon begins to rise.
```

Ride the balloon up:

```
> wait
Time passes... the balloon rises slowly from the ground.
> wait
(continue waiting; stop at each ledge)
> tie rope to hook
The balloon is fastened.
> disembark
(do your treasure hunting at this ledge)
> board balloon
> untie rope
> wait
(ride continues)
```

Ledges contain the Volcano's treasures. Collect them all.

To descend: `close receptacle` (the fire smothers, balloon sinks).
Time this carefully near a landing.

---

## Act XII: The Endgame

After **all 24 treasures** are in the trophy case — a complete
inventory list is in Appendix A — something changes. Return to the
Living Room:

```
Living Room.
A low voice whispers, "Well done, adventurer. Take the map that lies
here."
> take map
Taken.
```

The map shows a **secret path** from the Clearing southwest:

```
> go up (via kitchen shortcut if unlocked, or cyclops shortcut)
Living Room → cyclops shortcut → or regular path → North of House
→ North → Forest Path → Clearing.
Clearing.
> go sw
Secret Path.
> go sw
Stone Barrow.
> enter barrow
You have entered the Endgame.
```

The Endgame is a separate game with its own puzzles. Its full
walkthrough is beyond the scope of this companion, but the outline:

1. **Emerging.** You arrive in a stone-walled Chamber of Inquiry. A
   voice demands a password.
2. **The Quiz.** You are asked three questions about your
   accomplishments in the dungeon. Correct answers require that you
   know the names of the rooms and treasures you visited. *ANSWER
   <word>* is the command.
3. **The Treasures of the Realm.** Further on, a set of rooms
   contains artifacts of power. Each requires a different solution
   (light, weight, prayer).
4. **The Master's Chamber.** A throne, a crown, and a test of
   character. The final puzzle involves a mirror, a coffin, and the
   distinction between the Master and the Implementer.

Passing the Endgame grants the title **Master of the Dungeon** and
the full **616 points**.

*The last point, per the classic hint, "requires availing yourself of
all opportunities for intellectual improvement." In practice: **READ
EVERY PIECE OF READING MATERIAL**, including the U.S. News & Dungeon
Report, the leaflet, the matchbook, the guidebook, the engravings,
the commandment book, the newspaper in the mailbox, and the stone
inscriptions. One of them grants a single point on first reading.
Easy to miss; impossible to regret.*

---

## Appendix A: The Complete Treasure List

| Treasure | Found In | Pickup Pts | Case Pts |
|:---------|:---------|-----:|-----:|
| Jewel-encrusted egg (or broken shell + canary) | Forest Clearing, up tree | 5 | 5 |
| Clockwork canary | (from opened egg, thief's lair) | 10 | 4 |
| Brass bauble | Forest Clearing (after canary song) | 1 | 1 |
| Platinum bar | Loud Room | 10 | 10 |
| Trunk of jewels | Reservoir bed | 15 | 5 |
| Crystal skull | Land of the Living Dead | 10 | 10 |
| Diamond | Machine Room (made from coal) | 50 | 50 |
| Torch | Torch Room | 15 | 15 |
| Fancy violin | Steel box in Round Room | 10 | 10 |
| Pearl necklace | Pearl Room (past Riddle) | 20 | 10 |
| Tin of rare spices | Pool Room (after Red cake) | 2 | 2 |
| Crystal sphere | Robot's closet | 15 | 15 |
| Emerald | Buoy on the river | 5 | 10 |
| Pot of gold | End of Rainbow | 10 | 10 |
| Painting | Art Studio (Gallery) | 7 | 7 |
| Stack of zorkmid bills | Bank Safety Depository | 10 | 10 |
| Portrait of J. Pierpont Flathead | Bank Chairman's Office | 10 | 10 |
| Sapphire bracelet | Ice Cave (after Dragon) | 5 | 5 |
| Grail | Grail Room | 10 | 10 |
| Chalice | Thief's Treasure Room | 10 | 10 |
| Coffin | Maze (Egyptian tomb) | 10 | 15 |
| Barrel (after the ride) | Aragain Falls area | 1 | 1 |
| Royal Sceptre | Royal Puzzle | 10 | 10 |
| Bauble / trinket (volcano ledges) | Volcano | various | various |

Additional 50+ points come from **room-visit bonuses** — certain
rooms award points the first time you enter them. These total roughly
70 points. Add 20 for finishing the Endgame quiz, and 1 for the Last
Point.

Grand total: **616**.

---

## Appendix B: The Master Map

Given the complexity of Dungeon's geography, a printed map occupies
several pages and is reproduced in the enclosed map supplement. In
lieu of reproducing it inline, the essential junctions are:

- **West of House** (start) ↔ North of House ↔ Behind House ↔ South
  of House ↔ West of House (surface ring)
- **Clearing** (forest) ↔ Forest Path, Forest North, Forest South
  (surface maze)
- **Kitchen** ↑ Attic
- **Kitchen** ← Living Room → trap door → **Cellar**
- **Cellar** → E → Troll Room → E → N-S Crawlway → hub of middle dungeon
- **Cellar** → S → Crawlway → S → Slide → one-way to Smelly Room
- **Round Room** = middle-dungeon hub
  - N → Canyon → E → Top of Dam
  - NE → High N-S Passage → NE → Loud Room → E → Deep Ravine → Dam
  - E → Engravings → SE → Riddle → E → Pearl → E → Top of Well
  - (scramble exits to Carousel area when carousel is on)
- **Top of Dam** → N → Dam Lobby → E → Maintenance Room
- **Top of Well** ↕ (via bucket + water) ↕ **Bottom of Well**
- **Bottom of Well** → W → Pearl Room (same as Top?)
- **Tea Room** → E → Pool Room, Enormous Room
- **Tea Room** → W → Top of Well (via the magnet/carousel complex)
- **Machine Room** → S → Closet (sphere) → cage
- **Magnet Room** ↔ (carousel chaos) ↔ Tea Room, Low-Ceiling Room
- **Cyclops Room** → E → Living Room (after scaring cyclops)
- **Cyclops Room** → U → Treasure Room
- **Clearing** → SW → Stone Barrow (after endgame unlock)

---

## Appendix C: Magic Words, Verbs, and Shortcuts

**Magic words that do something:**

- `ECHO` — silences the Loud Room.
- `ODYSSEUS` / `ULYSSES` — terrifies the Cyclops.
- `HELLO SAILOR` — is useful in one place.
- `GERONIMO` — rolls the barrel over the falls.

**Magic words that do nothing (tribute jokes):**

- `XYZZY` — "A hollow voice says, 'Fool.'"
- `PLUGH` — ditto.
- `PLOVER` — ditto.

**Verbs to know:**

- `TAKE ALL`, `DROP ALL`, `TAKE ALL BUT <x>`
- `ATTACK <x> WITH <y>` / `KILL <x> WITH <y>` / `HIT <x> WITH <y>`
- `GIVE <x> TO <y>`
- `TELL <actor> "<command>"` — for robot and other NPCs
- `WAIT`, `AGAIN` (G), `OOPS`
- `LIGHT MATCH`, `LIGHT <x> WITH MATCH`
- `TURN ON LAMP`, `TURN OFF LAMP`
- `INFLATE BOAT WITH PUMP`, `BOARD BOAT`, `LAUNCH`, `LAND`, `DISEMBARK`
- `TIE ROPE TO <x>`, `UNTIE ROPE`, `CLIMB UP/DOWN ROPE`
- `OPEN <x>`, `CLOSE <x>`, `EXAMINE <x>`, `LOOK IN/UNDER/BEHIND <x>`
- `ANSWER "<word>"` — for the Riddle Room, the Endgame quiz
- `READ <x>` — for every readable object
- `WIND CANARY`, `STARE`, `PRAY`
- `DIG IN <x> WITH <y>`
- `POUR <x> IN <y>`, `EMPTY <x>`, `FILL <x> WITH <y>`

---

## Appendix D: The Combat Arithmetic

Before the list of death scenarios, here is the math that governs
combat. It is small and finite and worth memorizing if you plan on
fighting anything more dangerous than the troll.

**Your base fight strength** is derived from your score:

```
strength = 2 + floor((5 * score + 308) / 616)
```

Which yields:

- 0–61: strength 2
- 62–184: strength 3
- 185–307: strength 4
- 308–430: strength 5
- 431–554: strength 6
- 555+: strength 7

**Your effective strength** in any given exchange is base strength
plus a wound penalty (your `astren`, which is 0 when healthy and
negative when injured; recovers +1 every 30 turns via the cure clock).
*DIAGNOSE* reports the remaining recovery time.

**Villain strengths**: Troll = 2, Thief = 5, Cyclops = 10000,
Gnome ≈ 1, minor maze denizens = 1 or 2.

**Per-exchange win probability.** Let `ps = villain − you`. The
villain wins the exchange with:

- `ps > 3`: 90%
- `ps > 0`: 75%
- `ps = 0`: 50%
- `ps < 0` and villain still has some capacity: 25%
- `ps < 0` and villain is nearly broken: 10%

Villain capacity falls by roughly one per successful blow against
them. You similarly accumulate wounds from successful blows against
you.

**Strategic corollary.** To fight the thief fairly (50/50), you need
strength 5, which requires score 308 or higher. To fight him
*favorably*, you need strength 6 — score 431+. This is why the
walkthrough has you collect the easier treasures before visiting his
lair. The walkthrough puts the egg in his hands *early* (he opens it
for you) but kills him *late*, after roughly half the trophy case is
full.

---

## Appendix E: Death Scenarios and Prevention

The following cause instant death. For each, the preventative is in
brackets.

- **Grue in darkness.** [Keep lamp lit; bring torch as backup.]
- **Troll with bare hands.** [Use sword.]
- **Thief's stiletto (bad roll).** [Save before engaging; come with
  full health; use nasty knife.]
- **Bat drops you in the darkness without light.** [Carry garlic.]
- **Pushing blue button without retreat plan.** [Know the exits;
  carry putty.]
- **Overfalls (east off the falls).** [Disembark before Aragain.]
- **Leaping into the Dome Room / any leap-able precipice.** [Use
  rope.]
- **Gas Room explosion from lit flame.** [Extinguish before
  entering; use basket.]
- **Ice Room without light.** [Torch, not candles; candles may be
  drafted out.]
- **Pushing square button without robot.** [Never push
  geometrical buttons personally; delegate to robot.]
- **Second exorcism after being exorcised.** [Do it once and never
  again.]
- **Drowning in the maintenance room flood.** [Leave when you hear
  water rising; putty-plug the leak.]
- **Vault timeout.** [Don't close the vault door; carry the
  guidebook.]
- **Dragon without mirror luring.** [Retreat to Ice Room; let him
  melt himself.]
- **Carousel fall with carozf on.** [Push triangular via robot
  first.]

---

## Appendix F: The Last Point

The 616th point is traditionally the hardest to locate because it
appears only once, from an unobtrusive action, and it is easy to
miss on a casual run. The official hint, from the game itself:

> *Have you availed yourself of ALL opportunities for intellectual
> improvement?*

In practice: read every piece of reading material in the dungeon.
There are surprisingly many. One is worth a point.

Candidates include:

- Mailbox leaflet.
- US News & Dungeon Report (in the Living Room).
- Matchbook (Dam Lobby).
- Tour guidebook (Dam Lobby).
- Black book (Temple East End).
- Old engravings (Engravings Cave).
- Stone inscription south of the Temple.
- The Book of Commandments (same as black book, inside).
- The sign in the Lab / Wizard's room.
- The plaque at the Stone Barrow.
- The parchment from the Trophy Case endgame trigger.
- The writing on the walls in various minor rooms.
- The canary's song (technically sung, not read).
- The Machine Room's label.
- The Frigid River bank engravings.
- The Flood Control Dam dedication plaque.
- The prisoner's graffiti in the Endgame chamber.

If you have read all of these and still lack the last point, look for
a **fifteenth** reading. There is always one more.

---

*Congratulations. The Great Underground Empire is now, as much as any
dungeon ever has been, yours.*

*— An anonymous translator, with thanks to the many adventurers who
died before you so that you might read their notes.*
