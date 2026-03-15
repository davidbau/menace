# Rogue: A Guide to the Dungeons of Doom

*by Glenn Wichman and Michael Toy*

---

## Introduction

You have just finished your training as a fighter and are ready to embark on a perilous quest. Your task is to retrieve the Amulet of Yendor from the Dungeons of Doom, a labyrinth of shifting passages deep in the earth. The dungeons are full of monsters, traps, and treasure. You start equipped with an enchanted mace, a bow and quiver of arrows, elf-crafted armor, and some food — but the deeper you go, the deadlier the dangers.

Rogue differs from most computer fantasy games in that it is screen oriented. Commands are all one or two keystrokes and the results of your commands are displayed graphically on the screen rather than described in text. The game requires a display of at least 24 lines by 80 columns.

---

## The Screen

The top line of the screen is the message line, where game events are reported. The bottom line shows your current status:

```
Level: 1  Gold: 0  Hp: 12(12)  Str: 16(16)  Arm: 4  Exp: 1/0
```

- **Level** — dungeon depth (deeper = more dangerous)
- **Gold** — gold pieces collected
- **Hp** — current and maximum hit points
- **Str** — current and maximum strength
- **Arm** — armor class (lower is better)
- **Exp** — experience level and points

The rest of the screen shows your current dungeon level. Rooms are connected by passages. You can only see areas you have explored.

---

## Symbols

| Symbol | Meaning |
|--------|---------|
| `@` | You, the player |
| `-` `\|` | Walls of a room |
| `+` | Door |
| `.` | Room floor |
| `#` | Passage |
| `*` | Gold |
| `)` | Weapon |
| `]` | Armor |
| `!` | Potion |
| `?` | Scroll |
| `=` | Ring |
| `/` | Staff or wand |
| `^` | Trap |
| `%` | Stairs |
| `:` | Food |
| `A`–`Z` | Monsters |

---

## Movement

Use these keys to move one step at a time:

```
y  k  u
 \ | /
h -@- l
 / | \
b  j  n
```

- `h` left · `j` down · `k` up · `l` right
- `y` upper-left · `u` upper-right · `b` lower-left · `n` lower-right

Capitalize any direction (`H`, `J`, `K`, `L`, `Y`, `U`, `B`, `N`) to run in that direction until something interesting is found.

Use `Ctrl` with a direction to run down a passage until it turns or ends.

You can prefix a number before any movement command to repeat it — for example `10j` moves down 10 spaces.

---

## Commands

### Weapons
- `w` — Wield a weapon (take it in hand)
- `t` — Throw an object (prompted for direction)

### Armor
- `W` — Wear armor
- `T` — Take off armor

### Rings
- `P` — Put on a ring
- `R` — Remove a ring (you can wear two rings at once)

### Items
- `,` — Pick up an object on the floor
- `d` — Drop an object from your pack
- `e` — Eat food
- `q` — Quaff (drink) a potion
- `r` — Read a scroll
- `z` — Zap a staff or wand (prompts for direction)
- `c` — Call an item by a name you choose

### Information
- `i` — Show inventory (all items)
- `I` — Selective inventory (describe one item)
- `D` — Show discoveries (items you have identified)
- `)` — Show current weapon
- `]` — Show current armor
- `=` — Show current rings
- `@` — Reprint status line
- `/` — Identify a symbol on the screen
- `?` — Help (list commands)
- `v` — Print version number

### Exploration
- `s` — Search for traps and secret doors in adjacent squares
- `>` — Go down stairs (when standing on `%`)
- `<` — Go up stairs (requires the Amulet of Yendor)
- `.` — Rest for one turn
- `^` — Identify the type of a trap you are standing on

### Combat
- `f` — Fight a monster to the death (prompts for direction)

### Game Control
- `o` — Examine or set options
- `^R` — Redraw the screen
- `^P` — Repeat the last message
- `S` — Save the game (and quit)
- `Q` — Quit the game
- `ESC` — Cancel a command or count

---

## Rooms

Rooms are lit when you enter them, unless they are dark rooms — these can only be explored one step at a time. Monsters in dark rooms are only visible when adjacent to you.

Corridors are always dark. You can see one step in any direction even in the dark.

Doors sometimes have secret doors nearby that can be found by searching.

---

## Fighting

To attack a monster, simply move into its square. The game reports whether you hit or missed, and how much damage was dealt. Many monsters will fight back. Some monsters have special attacks: stealing gold or items, draining experience, putting you to sleep, and more.

Some monsters are peaceful until attacked. Running from a fight is often wise.

If you are killed, the game ends and you receive a score based on your gold, experience, and dungeon level reached.

---

## Objects

All objects (except food and gold) are unknown when first found. Scrolls bear mysterious titles; potions have colored liquids; staves and wands are made of various materials; rings have different gemstones. Once you identify an object, all items of the same type become known for the rest of the game.

### Armor

Armor reduces damage from monster attacks. Lower armor class is better:

| Armor | Class |
|-------|-------|
| None | 10 |
| Leather | 8 |
| Studded leather / Ring mail | 7 |
| Scale mail | 6 |
| Chain mail | 5 |
| Banded / Splint mail | 4 |
| Plate mail | 3 |

Enchanted armor has a lower class (better); cursed armor has a higher class (worse) and cannot be removed.

### Weapons

You can only wield one weapon at a time. Some weapons can be thrown; arrows are most effective when fired from a bow. Cursed weapons cannot be exchanged.

### Scrolls

Scrolls are single-use items that disappear when read. They can identify objects, enchant items, map the level, summon monsters, and more.

### Potions

Potions are single-use liquids that affect your character when drunk — healing wounds, restoring strength, granting temporary powers, or causing harmful effects.

### Staves and Wands

Staves (made of wood) and wands (made of metal or bone) can be aimed in any direction. They have limited charges and run out eventually.

### Rings

Rings provide continuous magical effects while worn: protecting against damage, adding strength, seeing invisible creatures, and more. You can wear two rings at once, but rings increase your food consumption.

### Food

You must eat to survive. If you run out of food and become faint from hunger, you will lose strength and eventually die. Eat regularly.

---

## Options

Type `o` to view and change options, or set them in the `ROGUEOPTS` environment variable as a comma-separated list.

- **terse** — Shorten messages
- **jump** — Hide intermediate steps when running
- **flush** — Clear keystroke buffer after each combat round
- **seefloor** — Show floor tiles in dark rooms
- **passgo** — Follow passage turns automatically when running
- **tombstone** — Show a tombstone when you die
- **inven=***style* — Inventory style: `overwrite`, `slow`, or `clear`
- **name=***name* — Your character's name (for the score file)
- **fruit=***name* — Your favorite fruit (appears in the dungeon)
- **file=***path* — Save file location

---

## Scoring

The top scores are kept in a score file. When you quit, you keep all your gold. When you die, 10% of your gold goes to the dungeon's wizard and the rest to your next of kin. The deeper you reach and the more gold you carry, the higher your score.

---

## Credits

Rogue was created by **Glenn Wichman** and **Michael Toy** at UC Santa Cruz, with significant contributions from **Ken Arnold** at UC Berkeley. Many others helped along the way.

*"The rot-proof scroll of scare monster, dropped in your path by some benevolent deity, is a true godsend."*
