// js/mailcorpus.js -- Email corpus, seed inbox, and reply rules.
// Period-appropriate 1980s Unix email style.
// No timestamps on corpus entries; those are assigned at delivery time.

// =========================================================================
// SEED_MESSAGES -- 8 pre-seeded inbox messages, with daysAgo fields.
// These give the inbox a lived-in feel on first launch.
// =========================================================================

export const SEED_MESSAGES = [
  {
    from: 'izchak',
    subject: "Re: last month's order",
    daysAgo: 14,
    body: `Rodney,

I am sorry to report that the wand of death you requested is still on
backorder.  My supplier in the lower dungeon levels has been having
trouble with dragons in the supply corridor, which has delayed shipment
considerably.

As compensation for the inconvenience, I am prepared to offer you a
wand of striking at a 15% discount -- uncursed, charges verified, quite
a respectable implement for the price.  It won't disintegrate boulders,
but it will leave a dent in most anything else.

Please let me know if you would like me to set one aside.  The discount
offer expires at end of month.

  -- Izchak Miller
     The General Store, Dlvl 4`
  },
  {
    from: 'walz',
    subject: 'disk quota warning',
    daysAgo: 11,
    body: `rodney,

your home directory is at 94% of your 1000KB quota.  if you go over
the limit i will have to suspend write access to your account until
you clean up.

largest files in /home/rodney:
  380K  core
  182K  nethack.save
   94K  .hack_sessions/
   68K  old_source_trees/hack-0.2/

the core file is almost certainly from that crash last tuesday.  please
remove it.  i don't want to hear "but i might need it later" -- you
won't.

  walz
  system administrator, pdp11`
  },
  {
    from: 'fenlason',
    subject: 'Hack 1.0.3 released',
    daysAgo: 9,
    body: `All,

Hack 1.0.3 is now available in the usual place (/usr/games/src/hack/).
This is mostly a bugfix release.

Changes:
  - Fixed gnome pathfinding: gnomes no longer walk directly into walls
    on level 3 when confused (reported by several people)
  - Reduced dragon breath damage by 15% -- they were one-shotting
    players in early levels, which felt unfair
  - Shop prices now update correctly after haggling
  - Fixed a crash when picking up the Amulet of Yendor while blind

No new features in this release.  I am saving those for 1.1, which
will be a bigger deal.

Source is in the usual place.  Bug reports to me directly.

  Jay Fenlason`
  },
  {
    from: 'brouwer',
    subject: 'level 26 layout question',
    daysAgo: 7,
    body: `Rodney,

I hope this message finds you well.  I am working on the topology of
the deeper dungeon levels for NetHack 3.0 and have a question about
your home level.

Specifically: when you generate the room graph for level 26, do you
guarantee that the corridor connecting the south wing to the central
maze is always present?  I have been seeing inconsistencies in my
parity analysis -- about 1 in 8 seeds produces a disconnected graph
where the southeast rooms are unreachable without teleportation.

If this is intentional (isolated sub-region as a design feature) I
would like to understand the reasoning.  If it is a bug I can prepare
a patch.

Thank you in advance for your patience with my questions.

  Michiel de Haan Brouwer
  NetHack Development Group`
  },
  {
    from: 'crowther',
    subject: 'Mammoth Cave trip',
    daysAgo: 5,
    body: `Rodney,

A few of us are planning a trip to Mammoth Cave in April -- the 14th
through the 17th.  You would be very welcome to join if you are free.

I found a new passage on my last visit, off the main survey route in
the section near the river.  It is quite tight in places but opens up
into a chamber I have not seen on any of the existing maps.  Classic
cave stuff -- the formations are remarkable.

The coordinates are in my notes.  If you want to come, let me know
by end of March so I can arrange the permit for the extra person.

No experience necessary, though some crawling is involved.  Bring
old clothes and a good headlamp.

  Will`
  },
  {
    from: 'arnold',
    subject: 'bold attribute on vt100',
    daysAgo: 4,
    body: `rodney --

does bold+reverse at the same time work for you on a vt100?

i am seeing the @ symbol come out as just reverse, no bold.  the
sequence I am using is ESC[1;7m.  manual says it should work but the
hardware disagrees.  might be a firmware issue on the specific unit
i have here.

let me know if yours behaves differently.

  -- arnold`
  },
  {
    from: 'lebling',
    subject: 'narrative vs. mechanics',
    daysAgo: 3,
    body: `Rodney,

I have been thinking more about our conversation at the last meeting
and I want to put my argument in writing, since I was probably not
very coherent after all that coffee.

The problem with pure dungeon-crawlers -- and I say this with genuine
respect for the work you and Jay have done -- is that mechanics without
narrative are ultimately hollow.  You can make the combat system as
sophisticated as you like, but if the player does not care about the
world, the numbers don't mean anything.

In Zork, when you find the jeweled egg in the thief's lair, it means
something because you know the thief, you know the egg, you have been
in that house.  The mechanics of "you pick up the egg" are simple.
The experience is not.

I am not saying dungeon crawlers can't have narrative.  I am saying
they mostly don't try, and it shows.

I fully expect you to disagree.  That's fine.  Write back.

  Dave Lebling
  Infocom`
  },
  {
    from: 'toy',
    subject: 'RE: RNG seeding',
    daysAgo: 2,
    body: `Rodney,

Look, I know everyone loves to get fancy about random number generators
but I am going to defend linear congruential generators until I retire.

Yes, they have short periods.  Yes, the low bits are garbage.  But for
a game?  For a dungeon layout?  You don't need cryptographic randomness.
You need something that produces a different map every time and doesn't
repeat itself for the first ten thousand seeds.  LCG does that.

The thing that actually matters is the seed.  If you seed it with
lowtime ^ getpid(), you get good variation in practice because those
two values are independent sources of entropy in normal use.

If you want to use a better generator, fine.  But don't let perfect
be the enemy of good.  Rogue works.  The dungeons feel different every
time.  Mission accomplished.

  Ken`
  },
];

// =========================================================================
// CORPUS -- ~100 corpus messages distributed across all senders.
// No date fields; those are assigned at delivery time.
// =========================================================================

export const CORPUS = [

  // ----- izchak (~12) -----

  {
    from: 'izchak',
    subject: 'New stock: potions of healing',
    body: `Rodney,

I have taken delivery of a fresh shipment of potions of healing.
Uncursed, full charge, priced at 200 zorkmids each or three for 550.

I also have two potions of extra healing that came with the shipment.
Those go for 400 each.  They don't last on the shelf -- adventurers
tend to buy them quickly -- so let me know if you want me to set one
aside under your name.

As always, identification is complimentary for registered customers.

  -- Izchak
     The General Store, Dlvl 4`
  },
  {
    from: 'izchak',
    subject: 'Price adjustment notice',
    body: `Rodney,

Effective next week I am adjusting my wand prices upward by 10%.
The market for enchanted items has tightened considerably since the
dragon migration to the lower levels disrupted the usual trade routes.

Scrolls of identify are also up, though I have absorbed part of the
increase myself to keep them accessible.  I know adventurers depend
on them.

My ring inventory is unchanged.

  -- Izchak`
  },
  {
    from: 'izchak',
    subject: 'Regarding the incident this afternoon',
    body: `Rodney,

I want to report that an adventurer -- a human barbarian, I believe,
based on the armor -- made an attempt to conceal a ring of slow
digestion under his cloak and walk out without paying.

I caught him.  My watch-dog is very good.

However: the resulting commotion knocked over two shelves of potions,
which I am now forced to write off as damaged goods.  I am attaching
an itemized list.  This is the third such incident this month.  I
have spoken to the dungeon administration but nothing has been done.

Do you know anyone in dungeon management I could write to directly?

  -- Izchak`
  },
  {
    from: 'izchak',
    subject: 'Wand recharging policy update',
    body: `Rodney,

Please be aware that I have updated my wand recharging policy.

Effective immediately:
  - First recharge: free for regular customers
  - Second recharge: 150 zorkmids, risk of explosion disclosed
  - Third recharge and beyond: I decline to accept the wand

I have had three wand explosions in the shop in the past six months.
The last one took out a section of the east wall and destroyed 40
zorkmids worth of candles.  I cannot continue to absorb these losses.

This applies to all wand types except wands of wishing, which I no
longer accept under any circumstances.

  -- Izchak`
  },
  {
    from: 'izchak',
    subject: 'Cursed item -- my apologies',
    body: `Rodney,

I owe you an apology.

The ring of aggravate monster I sold you last month was supposed to
have been tested as uncursed.  It appears my testing procedure had
a gap: the ring was cursed, and the test I used would not have
detected that particular curse.

I will make this right.  Bring it back and I will give you full
store credit plus a 50 zorkmid goodwill adjustment, or I will swap
it for any item of equal value from current inventory.

I am sorry for the trouble.  This does not happen often, but when
it does, I take it seriously.

  -- Izchak
     The General Store, Dlvl 4`
  },
  {
    from: 'izchak',
    subject: 'Philosophical note on dungeon retail',
    body: `Rodney,

You asked me once why I stay in the dungeon when I could presumably
set up a shop somewhere safer -- on the surface, say, or at least in
the upper levels.

The truth is that I have thought about it.  But the customers here
are different.  They come to me when they really need something.
Not when they want a new trinket.  When they need it.  There is a
satisfaction in that which I do not think I would find above ground.

Also the rent is very reasonable.

  -- Izchak`
  },
  {
    from: 'izchak',
    subject: 'Blessed candles now in stock',
    body: `Rodney,

By popular request I have sourced a supply of blessed candles.
These are genuine blessed, not just uncursed -- I have the
documentation from the temple.  They last longer and provide better
light in the lower levels where the ambient darkness is more severe.

Price: 80 zorkmids per candle, 700 zorkmids for a pack of ten.

I also have wax candles in bulk for those who just want illumination
without the premium.

  -- Izchak`
  },
  {
    from: 'izchak',
    subject: 'Loyalty discount offer',
    body: `Rodney,

You have been a customer of mine for over a year now -- through
several dungeon configurations, two monster migrations, and that
unfortunate period when the Wizard of Yendor kept teleporting into
my shop uninvited.

I would like to offer you a standing 8% loyalty discount on all
future purchases, applied at checkout.  No paperwork required; I
will remember.

Additionally, if you ever need an item appraised but do not want
to buy or sell, bring it by.  I will give you my honest assessment
at no charge.  It is the least I can do for a regular.

  -- Izchak`
  },
  {
    from: 'izchak',
    subject: 'Shoplifting: a word to the wise',
    body: `Rodney,

I realize this may seem unnecessary to say to you specifically, but
I have been advised to send a reminder to all customers following
recent incidents.

Attempting to leave my shop with unpaid merchandise will result in:
  1. Immediate identification of the item (so you know what you're
     losing when I take it back)
  2. A bill for any collateral damage
  3. Permanent suspension of customer benefits

The dungeon economy depends on honest exchange.  I provide fair
prices.  I expect fair payment.  That is all.

  -- Izchak
     The General Store, Dlvl 4`
  },
  {
    from: 'izchak',
    subject: 'Invoice: shop damage',
    body: `Rodney,

Please find attached an itemized invoice for damage to my shop
sustained during the poltergeist incident on the 12th.

  Broken potion bottles (14):        280 zm
  Scorched shelf (east wall):        150 zm
  Lost inventory (unrecoverable):    410 zm
  Staff time for cleanup:             60 zm
  ------------------------------------------
  Total:                             900 zm

I am not suggesting you caused this.  But you were the last person
in the shop before it happened, and I have found that these
incidents tend to correlate with certain visitors.

Payment at your convenience.

  -- Izchak`
  },
  {
    from: 'izchak',
    subject: 'Identification service notice',
    body: `Rodney,

A reminder that I offer item identification at the shop.
No scroll required.  I can identify most mundane items by
inspection; for magical items I use a small testing procedure
that is safe and non-destructive for anything that isn't
already cursed.

Pricing:
  Common items (potions, scrolls, rings): 50 zm
  Wands: 80 zm
  Artifacts: case by case

I find that adventurers who know what they are carrying fare
significantly better than those who do not.  It is good business
for both of us.

  -- Izchak`
  },
  {
    from: 'izchak',
    subject: 'New arrival: ring of regeneration',
    body: `Rodney,

An unusual piece came in with a recent lot from the lower levels:
a ring of regeneration, uncursed, in good condition.  These are
rare enough that I thought you would want to know before I put it
in the general case.

Asking 1200 zorkmids.  I know that's steep but the replacement
cost is genuinely high -- I do not expect to see another one
this year.

First come, first served.  Let me know by end of week.

  -- Izchak`
  },

  // ----- walz (~10) -----

  {
    from: 'walz',
    subject: 'scheduled downtime: saturday 0200-0600',
    body: `all,

the pdp11 will be down for maintenance this saturday, 0200 to 0600.
i am replacing the disk controller and installing the new kernel.

please save your work before 0130.  any unsaved sessions will be lost.
nethack saves should be fine as long as you do a clean quit before
downtime -- the in-memory state will not survive a hard shutdown.

i will send a 30-minute warning.

  walz`
  },
  {
    from: 'walz',
    subject: 'backup failure: thursday night',
    body: `rodney (and others),

the thursday night tape backup failed.  the tape drive jammed at 2347
and i didn't catch it until 0630 friday.  anything you wrote between
last wednesday's backup and thursday morning is not on tape.

i am re-running the backup now with the new tape.  this should not
happen again.

if you have files you cannot afford to lose, i recommend keeping your
own copies.  the system backup is not a substitute for personal backups.

  walz`
  },
  {
    from: 'walz',
    subject: 'new kernel installed',
    body: `all,

the new kernel is running as of this morning.  version 4.2bsd, same
as the machines in the lab.  everything should be compatible.

notable changes:
  - faster context switching (you should notice this in interactive use)
  - fixed the tty race condition that caused occasional garbled output
  - new disk driver -- slightly faster sequential reads

if anything seems broken, let me know.  i tested the main utilities
but i haven't run everything.

  walz
  system administrator`
  },
  {
    from: 'walz',
    subject: 'disk performance degraded',
    body: `rodney,

disk i/o has been slow for the last two days.  i'm tracking it down.
current hypothesis is that the disk is fragmenting -- it's been over
a year since the last reorganization.

in the meantime, file access will be noticeably slower for large files.
nethack save files should be okay since they are written sequentially.

i'll do a full defrag this weekend during the maintenance window.

  walz`
  },
  {
    from: 'walz',
    subject: 'security patch applied',
    body: `all,

i have applied the security patch from the advisory last week.
the hole was in the finger daemon -- remote users could get a shell
under certain conditions.  it has been closed.

as part of the patch i have also restricted which accounts can be
fingered from off-site.  if you need your account visible remotely,
let me know and i will add an exception.

please change your passwords this week if you have not already.

  walz`
  },
  {
    from: 'walz',
    subject: 'password policy reminder',
    body: `all users,

passwords must be changed every 90 days.  several accounts are overdue.

minimum requirements:
  - 6 characters
  - at least one non-alphabetic character
  - not the same as your username
  - not a word in /usr/dict/words

accounts with overdue passwords will be locked next friday.  you
can change your password with the passwd(1) command.

this is not negotiable.

  walz`
  },
  {
    from: 'walz',
    subject: 'bug filed against nethack (build system)',
    body: `rodney,

i filed a bug against the nethack build system this morning.
bug #4471: makefile does not respect CFLAGS from environment.

if you set CFLAGS externally (e.g. to add debugging flags) the
makefile ignores it and uses its own.  i had to patch the makefile
by hand to build with -g.

i know you didn't write the build system but i'm sending this to
you since you're listed as maintainer.

patch is attached.  it's four lines.

  walz`
  },
  {
    from: 'walz',
    subject: 'new tape drive installed',
    body: `all,

the new 9-track tape drive is installed and running.  it's faster
than the old one and holds more per tape.

backup rotation is now:
  daily:   last 7 days on separate tapes
  weekly:  last 4 weeks
  monthly: last 3 months

offsite tapes go to the cabinet in the admin building on the first
of every month.

  walz`
  },
  {
    from: 'walz',
    subject: 'system load last night',
    body: `rodney,

the system load peaked at 14.2 at 0340 last night.  that's unusual
for that time.  looking at the process table history, the top
consumers were:

  nethack (3 instances): combined 80% cpu
  a.out (your username): 12% cpu, 45 minutes

what was the a.out?  if it's a test run that's fine but i'd
appreciate a heads-up when you're going to run something long.
it affects everyone on the system.

  walz`
  },
  {
    from: 'walz',
    subject: 'filesystem check results',
    body: `rodney,

ran fsck this morning after the clean shutdown.  results:

  /home: 847 files, 14% fragmentation -- acceptable
  /usr:  3241 files, 8% fragmentation -- good
  /tmp:  cleared (as expected)
  /var:  12 files with incorrect link counts -- corrected

the link count errors in /var were probably from that crash two
weeks ago.  nothing should have been lost but let me know if
anything seems wrong with your files.

  walz`
  },

  {
    from: 'walz',
    subject: 'proposal: item blessing/cursing for nethack',
    body: `rodney,

i've been thinking about the magical item system and i think we're
missing a layer that would make the game much more interesting.

current state: items are what they are.  a potion of healing heals.
a scroll of enchant weapon enchants.  no surprises once you know the
item.

proposal: blessed/uncursed/cursed status on every item.
  - blessed: enhanced effect
  - uncursed: normal effect
  - cursed: effect inverted, reduced, or just bad

examples:
  blessed potion of healing:  full heal + temporary max-hp boost
  cursed potion of healing:   drains max hp instead of restoring it
  blessed scroll of enchant:  +2 instead of +1
  cursed scroll of enchant:   -1 (the weapon degrades)

the player wouldn't know the status until they use the item or
identify it.  this adds a layer of risk to everything.
"do i drink this now or wait until i can identify it?"

it also creates a use for holy water (bless items) and a reason
to fear cursed items beyond just the item's base effect.

thoughts?  i can prototype the data structure if the concept is sound.

  walz`
  },
  {
    from: 'walz',
    subject: 'Re: potion mixing -- initial thoughts',
    body: `rodney,

following up on our conversation at the terminal last tuesday.

the core idea: if you have two potions and pour one into the other,
you get a third potion whose identity depends on the combination.
not every pair has a defined result -- most would produce a "muddy
potion" (unknown, probably bad).  a few specific pairs would have
known good results.

useful combinations i've been thinking about:
  healing + gain level  ->  extra healing (or full heal?)
  confusion + paralysis ->  sleeping draught (new item type)
  water + any blessed   ->  diluted version (weaker but still works)
  water + holy water    ->  more holy water (blessed water breeds)
  two of the same       ->  double-strength version?

the tricky part is implementation.  you'd need a "pour" verb,
a mixing table, and new item variants for the results.

the blessing/cursing system i proposed last week interacts with this:
  blessed + cursed = ?  (neutralize?  explode?  both seem fun)

i don't know if this is too complex for the current scope.
but the player behavior it would create is interesting:
hoard potions, experiment carefully, occasionally make a terrible mistake.

  walz`
  },
  {
    from: 'walz',
    subject: 'wand recharging -- design question',
    body: `rodney,

side question on the magical item system:

currently wands have charges that deplete.  when they're empty,
they're useless.  the player throws them away or uses them as
weapons (low damage, unsatisfying).

what if wands could be recharged?  options i see:

1. scroll of recharging.  straightforward.  too easy?
   maybe the scroll adds 1-3 charges, randomly.  could still fail.

2. wand + wand.  zap one wand at another to transfer charges.
   destructive to the source wand.  interesting tradeoff.

3. fountain interaction.  some fountains recharge wands.
   most fountains do other things (curses, water moccasins, etc.).
   unpredictable.  feels right for nethack.

option 3 seems most consistent with the game's personality:
"there might be a way to do this, but you won't know until you try,
and trying has risks."

also: i looked at the wand-of-wishing question from the mailing list.
if we add it, it probably needs to be the rarest item in the game.
one per run, if that.  and wishes should have limits --
no wishing for another wand of wishing.

  walz`
  },
  {
    from: 'walz',
    subject: 'potion identification -- naming conventions',
    body: `rodney,

small thing but it matters for the potion mixing work:

right now potions are identified by appearance (bubbly, smoky, etc.)
until the player figures out what they are.  the names are good.
i want to make sure any new potions from mixing have names that fit.

existing appearance names (from the source):
  ruby, bubbly, smoky, cloudy, effervescent, fizzy, dark, milky,
  murky, gooey, slimy, transparent, brilliant blue, clear, orange,
  yellow, black, magenta, white, cyan, pink, purple-red, golden

proposed names for mixed results:
  muddy (failed mix -- opaque brown, warning color)
  swirling (two potions not fully combined -- unstable)
  steaming (exothermic mix -- could be dangerous to hold)
  crystalline (successful beneficial mix -- obviously special)

i like "steaming" because it signals danger before the player drinks.
that's fair warning without making it too safe.

the murky potion is currently something specific -- check that
"muddy" doesn't collide.

  walz`
  },
  {
    from: 'walz',
    subject: 'item property ideas -- rings and amulets',
    body: `rodney,

continuing the magical item thread.  rings and amulets next.

rings in rogue are already interesting (searching, protection, etc.).
nethack could expand the concept with more active effects.

ring ideas:
  ring of slow digestion   -- you don't get hungry as fast
  ring of regeneration     -- slow HP recovery over time (like trolls)
  ring of conflict         -- nearby monsters fight each other
  ring of free action      -- immune to paralysis and slow
  ring of levitation       -- you float, can cross water, can't go down stairs
  ring of polymorph control -- if you're polymorphed, you choose the form

the conflict ring is the one i'm most excited about.  you walk into
a room full of monsters and they all start fighting each other.
the catch: they might fight YOU too, and you're outnumbered.
also: shopkeepers would try to kick you out if you wore it.

amulet of ESP (know monster positions through walls) seems obvious.
amulet of life saving (survive one death) is powerful but interesting.
you'd ration it carefully.  wear it or save it?

the yendor amulet should remain unique.  it's the goal item.
diluting it with a category of amulets would change the feel.

  walz`
  },
  {
    from: 'walz',
    subject: 'Re: artifact weapons -- uniqueness mechanic',
    body: `rodney,

the mailing list thread about artifact weapons got me thinking.

basic idea: a small number of named weapons with unique properties.
not randomly generated -- specific items that always have the same
name and the same abilities.  excalibur, the sword of fire, etc.

arguments for:
  - gives experienced players something to aim for specifically
  - lore hooks: players read about them, know what to look for
  - the uniqueness makes finding one feel significant

arguments against:
  - undermines the random generation philosophy
  - players who know the game will beeline for them
  - balancing named items is harder than balancing item classes

middle ground i keep coming back to:
  - artifacts exist but their locations are random (not fixed)
  - only one of each can exist per game (if you find excalibur, no other
    excalibur exists on this run)
  - finding one via a wish counts against the artifact pool

this preserves randomness while making specific items special.

the "sacrifice on high altar" method of obtaining them might also work.
makes the player go out of their way.  fits the dungeon logic.

i don't know if the current code supports unique item tracking.
probably needs a flag in the item struct.

  walz`
  },

  // ----- toy (~10) -----

  {
    from: 'toy',
    subject: 'Rogue 5.2 is out',
    body: `All,

Rogue 5.2 is up on the BSD net.  Main changes from 5.1:

  - Better monster pathfinding (they will actually hunt you now
    if you run around corners)
  - New item type: ring of searching
  - Fixed the "stuck in a door" crash on level 9
  - Stairs no longer appear in the middle of a room

The source is clean.  BSD license, same as before.

Pull it down, try it out, let me know what breaks.

  Ken`
  },
  {
    from: 'toy',
    subject: 'thoughts on procedural generation',
    body: `Rodney,

I've been thinking about dungeon generation some more.  The thing
that still bothers me about most approaches, including mine, is that
the randomness doesn't feel random.  Players quickly learn to read
the patterns.

What I really want is a generator that produces levels that feel
hand-crafted even though they weren't.  The trick, I think, is
constraints.  If you have too few constraints, everything looks like
random noise.  Too many and it feels mechanical.

Rogue's room-and-corridor approach works because the constraints
are just tight enough.  You know rooms will be rectangular and
corridors will connect them.  Within that, there's still real variety.

What does Hack do that I should be looking at?

  Ken`
  },
  {
    from: 'toy',
    subject: 'why random seeds matter',
    body: `Rodney,

I want to document this somewhere so let me use you as the audience.

The seed matters for reproducibility.  If a player finds a bug
("on seed X the level generator crashes on dlvl 7") you need to
be able to reproduce it.  If you log the seed, you can replay it.

This is why I added ROGUEOPTS=seed=N in 5.1.  The seed is also
printed to stderr on startup in debug mode.

Hack should do this too if it doesn't already.  Otherwise bug
reports are basically useless.

  Ken`
  },
  {
    from: 'toy',
    subject: 'complaint: terminal emulators',
    body: `Rodney,

I have a rant.

Terminal emulators that don't handle standout mode correctly are
the bane of this work.  Today I found one that turns ON standout
on ESC[7m and then requires ESC[0m to turn it off -- fine -- but
if you send ESC[7m again it does nothing because it thinks standout
is already on.

This is incorrect.  Standout should toggle.  Or at minimum it
should be idempotent without the need for an explicit reset.

I am testing on seven different terminal types this week.  Three
of them are wrong in different ways.  I am logging all of it.

  Ken`
  },
  {
    from: 'toy',
    subject: 'monster memory feature',
    body: `Rodney,

Working on a new feature for Rogue: monster memory.

The idea: the game tracks which monsters you've killed and stores
notes about them (what they do, how dangerous they are).  When you
encounter a monster type you've seen before, the game can show you
a brief summary.

The tricky part is the display.  I don't want to clutter the
screen.  Thinking of a separate scroll command to access the memory.

Does Hack have anything like this?  I know NetHack is planning
something.  Would rather not duplicate work if we can share
the design.

  Ken`
  },
  {
    from: 'toy',
    subject: 'BSD licensing thoughts',
    body: `Rodney,

Someone asked me this week why Rogue uses BSD license instead of
being in the public domain.  Thought I would write up the answer.

The BSD license is simple: do what you want, keep the attribution.
I like that.  Public domain would be fine too but it's vaguer --
there are jurisdictions where you can't actually disclaim copyright.
The license makes the intent clear without much overhead.

The "no endorsement" clause exists because someone once marketed
a product as "endorsed by the creators of Rogue" without asking.
That's why it's there.

Anyway.  Point is: feel free to borrow ideas from Rogue for Hack.
That's why it's open.

  Ken`
  },
  {
    from: 'toy',
    subject: 'playtest invitation: Rogue 5.3-dev',
    body: `Rodney,

I have a development build of 5.3 that I would like some outside
eyes on.  The main new thing is a redesigned item generation system
-- items are now placed with some awareness of level depth, so you
won't find wands of death on the first floor or food rations on
floor 25.

If you want to try it, the source is in /usr/games/src/rogue5.3-dev/
on the shared server.  Build it yourself, I'm not installing a dev
build system-wide.

Specific things I want feedback on: pacing, item distribution,
whether the new ring of searching is overpowered (I think it is).

  Ken`
  },
  {
    from: 'toy',
    subject: 'disk usage: /usr/games',
    body: `Rodney,

walz sent me a note about /usr/games taking up too much space.
I looked at the breakdown:

  rogue binaries + source:  2.1M
  hack binaries + source:   3.4M
  nethack (partial):        1.8M
  old versions/archives:    4.2M

the old version archives are the problem.  do we actually need
rogue 3.6, 4.0, 4.2, 5.0, and 5.1 all installed?  I would say
keep 5.1 (stable) and the current dev build and delete the rest.

what's your take on the hack side?

  Ken`
  },
  {
    from: 'toy',
    subject: 'why @ for the player',
    body: `Rodney,

since people keep asking: the @ symbol for the player in Rogue
was chosen because it looks like a person and it's on every
keyboard.  also it's visually distinct from everything else on
the map.  that's it.  no deeper reason.

the monster letters were chosen to be memorable: K for kobold, O
for orc, D for dragon.  some of them are a stretch (I for ice
monster) but you get used to it.

the @ convention has clearly stuck.  I see it everywhere now.

  Ken`
  },
  {
    from: 'toy',
    subject: 'competitive observation',
    body: `Rodney,

I am not going to pretend I haven't been watching what you and Jay
are doing with Hack.  I have.

You have more items, more monsters, and a more complex level
generator.  Rogue is simpler.  I am okay with that.  I think there
is room for both approaches and I think the simplicity of Rogue has
its own value.

But the thing you have that I want is persistent level maps.
Going back to a level you've already explored and having it be
the same.  I've thought about adding that to Rogue and I keep
running into save file size problems.  How do you handle it?

  Ken`
  },

  // ----- arnold (~10) -----

  {
    from: 'arnold',
    subject: 'curses 3.2 release',
    body: `rodney --

curses 3.2 is in the usual place.  main change: addch() now
handles the full 8-bit character set correctly.  previously
characters above 127 were getting mangled on some terminals.

also added a function: getbkgd() to query the background character.
it was missing and people kept asking.

man page is updated.

  -- arnold`
  },
  {
    from: 'arnold',
    subject: 'vt100 compatibility table updated',
    body: `rodney --

updated the vt100 compatibility table.  added entries for the
hazeltine 1500 and the heath h19.

the h19 does not support insert/delete line.  programs that use
insertln() will fall back to redrawing.  nothing you can do about
it.  if you are doing full-screen work on h19s, keep redraws cheap.

table is in /usr/share/doc/curses/terminals.txt

  -- arnold`
  },
  {
    from: 'arnold',
    subject: 'endwin() -- please call it',
    body: `rodney --

i got a complaint from someone whose terminal was stuck in raw mode
after hack crashed.  they had to log in from another terminal to
fix it.

the problem is that hack does not call endwin() in the signal
handlers.  if you die on SIGTERM or SIGSEGV, curses state is
never cleaned up.

fix: in each signal handler, call endwin() before exit().
or set up a single cleanup handler and call it from all of them.

this is not optional.  leaving the terminal in a bad state is
a serious problem for users.

  -- arnold`
  },
  {
    from: 'arnold',
    subject: 'color terminals: an opinion',
    body: `rodney --

people keep asking me when curses will support color.
my answer: it will when it has to.

color terminals are not standard.  the vt100 does not have color.
the adm3a does not have color.  most of the terminals people
actually use do not have color.

when a standard color terminal exists and is common, i will add
color support.  until then, applications that depend on color will
not be portable, which is a problem.

use bold and reverse for emphasis.  that's what they're for.

  -- arnold`
  },
  {
    from: 'arnold',
    subject: 'SIGWINCH handling',
    body: `rodney --

question: does hack handle SIGWINCH?

if the terminal window is resized while the game is running, the
display will be wrong until you force a full redraw.  on systems
that support it (not all do) you can catch SIGWINCH and call
clearok(stdscr, TRUE) followed by wrefresh().

if you're only targeting fixed-size terminals this doesn't matter.
but thought you should know.

  -- arnold`
  },
  {
    from: 'arnold',
    subject: 'raw mode question',
    body: `rodney --

when you put the terminal in raw mode, are you saving and restoring
the old terminal state?

the right sequence is:
  1. call initscr() -- saves terminal state
  2. call cbreak() or raw() -- enters the mode you want
  3. when done: call endwin() -- restores saved state

if you're doing this manually with ioctl() instead of through curses,
make sure you are saving TIOCGETP before you call TIOCSETP.
if you don't, restore is impossible after a crash.

  -- arnold`
  },
  {
    from: 'arnold',
    subject: 'ncurses: a note',
    body: `rodney --

someone mentioned "ncurses" to me.  i looked at it.

it is a reimplementation of curses.  it is more featureful than
mine.  it also has a different calling convention in places.

my recommendation: don't mix the two.  pick one.  if you want the
features of ncurses, use ncurses.  if you want compatibility with
the broadest range of systems, use curses.

hack should be explicit about which it needs.  mixing them causes
link errors that are confusing to debug.

  -- arnold`
  },
  {
    from: 'arnold',
    subject: 'wgetnstr -- use it',
    body: `rodney --

i see hack is using getstr() in a few places.  switch to wgetnstr()
or getnstr().  the no-limit versions will overflow a buffer if the
user types enough characters.

i know "how would a user type 500 characters at a name prompt"
but it happens.  paste buffer accidents, for instance.

wgetnstr(win, buf, BUFSIZE-1) -- that's all it takes.

  -- arnold`
  },
  {
    from: 'arnold',
    subject: 'double-buffering in curses',
    body: `rodney --

the reason curses uses double-buffering (the shadow window) is to
minimize the number of characters sent to the terminal.  every
character you send costs time on a slow connection.

when you call refresh(), curses computes the diff between the
current window state and the last-rendered state and sends only
the changed characters, with cursor movement to get between them.

if you are seeing slow screen updates, the problem is usually either:
  1. too many refresh() calls (call it once per logical frame)
  2. unnecessary clear() calls followed by full redraws

profile your refresh calls before assuming curses is slow.

  -- arnold`
  },
  {
    from: 'arnold',
    subject: 'attribute combinations',
    body: `rodney --

tested the following attribute combinations on vt100, adm3a, and h19:

  bold only:          works on all three
  reverse only:       works on all three
  bold + reverse:     works on vt100, broken on adm3a
  underline only:     works on vt100, not supported on adm3a
  blink:              works nowhere reliably -- don't use it

if you need to distinguish more than 2-3 visual categories, you
are out of luck on many terminals.  design your display around
bold and reverse only and you'll be fine everywhere.

  -- arnold`
  },

  // ----- fenlason (~10) -----

  {
    from: 'fenlason',
    subject: 'Hack 1.0.2 released',
    body: `All,

Hack 1.0.2 is posted.  Mostly minor stuff:

  - Shops now close at night (cosmetic, doesn't affect gameplay yet)
  - Fixed a crash when picking up gold while carrying max items
  - Reduced cockatrice petrification radius (it was too large)
  - Newt breath no longer one-shots players at full health

Grab it from the usual place.  Diff from 1.0.1 is small if you
want to review it.

  Jay`
  },
  {
    from: 'fenlason',
    subject: 'Hack 1.1: what I am planning',
    body: `Rodney,

Since you asked: here is what is planned for 1.1.

  - Polymorph system (basic): potions of polymorph, limited forms
  - Pets: taming monsters with food, basic follow AI
  - New level types: special levels with fixed layouts
  - Expanded item base: 20+ new item types
  - Scrolls of enchant weapon/armor

Timeline is uncertain.  I am one person and I have a job.
But the design is mostly done and I have started on polymorph.

  Jay`
  },
  {
    from: 'fenlason',
    subject: 'monster AI redesign notes',
    body: `Rodney,

Writing up my thoughts on monster AI for review.

Current system: monsters have a target (usually the player) and
take the step that minimizes Manhattan distance.  Simple.  Too simple.
They don't use doors, can't navigate corridors well, and bunch up.

Proposed: a pathfinding grid updated per monster per level entry.
Too expensive?  Maybe.  But the visible region only, updated lazily?
That might work.

Also want: monster memory of last seen player position.  Currently
they give up if the player breaks line of sight.  Too easy.

Thoughts?

  Jay`
  },
  {
    from: 'fenlason',
    subject: 'item identification: how it works now',
    body: `Rodney,

Documenting the item identification system since I keep getting
questions about it.

Items are randomly assigned an "appearance" (e.g. "bubbly potion",
"tattered scroll") when the game starts.  The mapping is per-game.
Players identify items by using them, by reading scrolls of identify,
or by paying Izchak.

The per-game mapping means you can't just memorize "bubbly = healing"
-- it changes every game.  This is intentional.

Unidentified items display their appearance; identified items display
their true name.  This distinction is tracked per item class.

  Jay`
  },
  {
    from: 'fenlason',
    subject: 'experience formula change',
    body: `Rodney,

Changed the experience point formula in the current dev tree.
Old: linear in monster level (kobold = 5 xp, dragon = 50 xp).
New: exponential with depth and monster rarity adjustment.

Result: killing kobolds on the first floor gives almost no xp but
killing a unique monster is actually exciting.  Also, players no
longer grind the same level for xp.

I'm happy with it.  Rolling it into 1.1.

Let me know if you see any level ranges where the progression
feels off.

  Jay`
  },
  {
    from: 'fenlason',
    subject: 'new monster: mind flayer',
    body: `Rodney,

Adding a new monster type: the mind flayer.

  - Appears on levels 15-20
  - Special attack: intelligence drain (reversible with potion of restore)
  - Resistant to mental effects (not confused by potions of confusion)
  - Moves at normal speed but teleports away when threatened
  - Display character: h (for humanoid, even though it isn't exactly)

The intelligence drain is the interesting part.  Currently INT
doesn't do much gameplay-wise so I'm adding this as a reason to care.

Still working out the balance.  How low should INT be able to go?

  Jay`
  },
  {
    from: 'fenlason',
    subject: 'save file format: heads up',
    body: `Rodney,

Warning: the save file format is changing in 1.1.  Saves from 1.0.x
will not be compatible.

I know this is annoying.  I am trying to design the new format to be
extensible so I don't have to break compatibility again, but I can't
promise the 1.0.x format will work going forward.

The new format uses a simple tag-length-value scheme.  Unknown tags
are skipped, which means future additions won't require a format bump.

Old saves will need to be discarded or converted.  I'll write a
converter if there's demand but I suspect most people just start
a new game.

  Jay`
  },
  {
    from: 'fenlason',
    subject: 'level 26: stop haunting it',
    body: `Rodney,

I need to ask you to stop haunting level 26.

I know you set up your home there.  I know you like the topology.
But it's causing problems.  Your presence makes it impossible for
me to test the lower level generation without dealing with whatever
you have set up down there, and I'm getting confused about whether
bugs I find are in the level generator or in the special-case code
that handles your level.

Please move to level 25 or 27.  Either is fine.  I will update the
generator to treat them as special if needed.

  Jay`
  },
  {
    from: 'fenlason',
    subject: 'dungeon generation: room sizing',
    body: `Rodney,

Question: what's your opinion on minimum room size?

Currently rooms can be as small as 2x2 interior.  This feels cramped.
I've tried 3x3 as a minimum and the levels feel better, but I'm
worried about level connectivity -- it's harder to fit all the rooms
with a larger minimum.

At 3x3 with the current level size, I sometimes get 5 rooms instead
of 6-9.  Is that a problem?  Players mostly just want to find the
stairs.

  Jay`
  },
  {
    from: 'fenlason',
    subject: 'balance: wands',
    body: `Rodney,

Looking at the wand balance.  Current opinion:

  - Wand of death: too common on mid levels.  Reducing frequency.
  - Wand of fire: damage is about right but fire spreading to items
    is too punishing.  Making fire less likely to hit adjacent items.
  - Wand of teleportation: fine as is.  Players use it cleverly.
  - Wand of wishing: staying rare.  1 per 200 games is about right.

The death wand nerf will upset people.  It always does.

  Jay`
  },

  // ----- brouwer (~12) -----

  {
    from: 'brouwer',
    subject: 'NetHack 3.0: status update',
    body: `Rodney,

Brief update on NetHack 3.0 progress.

We have merged the main Hack 1.0.3 codebase with the patches from
the development tree.  Compilation is clean on BSD and System V.
Testing is ongoing.

Known remaining issues:
  - Shop generation fails on very large levels (> 80x24)
  - Soldier monsters don't pathfind through water correctly
  - Save file restore is unreliable if interrupted at certain points

Target for alpha release: end of next month.  No promises.

  Michiel`
  },
  {
    from: 'brouwer',
    subject: 'patch: level teleport handling',
    body: `Rodney,

Please find attached a patch for level teleportation.

The current code teleports the player to a random square on the
target level without checking for occupancy.  This means a player
can be teleported onto a monster, which resolves incorrectly (the
monster is removed without a combat message).

The patch adds an occupancy check with a fallback random square
selection.  If no empty square is found (pathological case) it
falls back to current behavior.

Diff is against 1.0.3.  Three files changed, 47 lines.

  Michiel`
  },
  {
    from: 'brouwer',
    subject: 'parity analysis: combat formula',
    body: `Rodney,

I have completed a parity analysis of the combat formula across
Hack 1.0.3, Hack 1.1-dev, and NetHack 3.0-dev.

Result: the formulas diverge in the case of a player attacking a
monster with a blessed weapon.  In 1.0.3, blessed gives +2 to hit.
In 1.1-dev (your recent change) it gives +1 to hit and +1d4 damage.
In 3.0-dev I have inadvertently carried over the 1.0.3 behavior.

I need to know which behavior is intended before I update 3.0-dev.
The +1d4 damage version is more interesting gameplay-wise but it's
a significant change and I want to be sure it's deliberate.

  Michiel`
  },
  {
    from: 'brouwer',
    subject: 'shopkeeper AI: a concern',
    body: `Rodney,

I have a concern about the shopkeeper AI.

Currently shopkeepers pursue players who owe them money through
the shop entrance and down corridors.  This is correct.  But the
pursuit radius is unbounded -- I have seen shopkeepers follow players
down four levels of stairs.

I believe the intended behavior is: shopkeeper pursues within the
level, but stops at the stairs.  Can you confirm?  If so there is a
missing check in the movement code.

  Michiel`
  },
  {
    from: 'brouwer',
    subject: 'Sokoban levels: request for input',
    body: `Rodney,

We are considering adding a set of Sokoban-style levels to NetHack 3.0
as a special branch.  The mechanics are well-known (push boulders onto
holes, clear the level for a reward).

Before I finalize the level designs, I would like your input on two
things:

  1. Should the boulder-pushing rules be consistent with the existing
     boulder rules in the main dungeon?  (Currently a minor mismatch.)
  2. What is an appropriate reward?  We are thinking a bag of holding
     or a luck boost, but opinions welcome.

I am attaching a rough sketch of level 1.

  Michiel`
  },
  {
    from: 'brouwer',
    subject: 'new branch: oracle level',
    body: `Rodney,

Added a new special level to the 3.0 branch: the Oracle level.

The Oracle is a neutral spellcaster NPC who will answer questions
for a fee.  Fortune-cookie style responses, but we are trying to
make them actually useful some percentage of the time.

The level is in the middle dungeon (roughly dlvl 10-12).  It has
a distinctive layout: a large central chamber with four symmetric
antechambers.  The Oracle occupies the center.

Monster set is peaceful priests and some guards.  Non-hostile unless
attacked.

  Michiel`
  },
  {
    from: 'brouwer',
    subject: 'System V port: status',
    body: `Rodney,

The System V port of NetHack 3.0 is mostly complete.

Main differences from BSD:
  - Signal handling (SIGWINCH not available on all SysV versions)
  - terminfo instead of termcap (handled via the curses abstraction)
  - Random number generator (using rand() not random() -- period is
    much shorter, which is a concern)

The rand() issue is the main thing I want your opinion on.  Should
we bundle our own generator, or is the SysV rand() period (2^31)
adequate for our purposes?

  Michiel`
  },
  {
    from: 'brouwer',
    subject: 'wand of wishing: regression',
    body: `Rodney,

Found a regression in the wand of wishing handling.

In the current dev tree, wishing for a specific artifact (by name)
fails silently if the artifact has already been generated.  The wand
charges are consumed but the item is not created and no message is
displayed.

Expected behavior (per 1.0.3): if the artifact exists, create a
non-artifact version of the base item type instead.

I will submit a patch but wanted to flag it first.

  Michiel`
  },
  {
    from: 'brouwer',
    subject: 'design document fragment: trap balance',
    body: `Rodney,

Sharing a fragment of the trap balance document I am working on.

Pit traps: currently too common on levels 1-5.  Reducing frequency
by 30%.  The early game is punishing enough without frequent pits.

Arrow traps: fine as is.  Players learn to search doorways.

Teleport traps: there is an argument that they should not appear
before dlvl 10, since players have no reliable counter before then.
I am inclined to move them down.

Polymorph traps: keeping them rare.  They are memorable precisely
because they are uncommon.

Your thoughts on any of these?

  Michiel`
  },
  {
    from: 'brouwer',
    subject: 'corridor connectivity: algorithm question',
    body: `Rodney,

A question about the level generation algorithm.

To connect rooms, Hack uses a minimum spanning tree approach
(connect rooms in pairs until all are reachable) with occasional
extra corridors for loops.  This produces reasonable layouts.

I am experimenting with an alternative: place corridors first, then
fit rooms at the intersections.  This produces more interesting
corridor networks but the room placement becomes constrained.

Have you tried this approach?  Any published references on dungeon
generation you have found useful would also be appreciated.

  Michiel`
  },
  {
    from: 'brouwer',
    subject: 'polite but firm disagreement',
    body: `Rodney,

I want to register a polite but firm disagreement with the change
you made last week to the experience formula.

The exponential scaling means that players who explore efficiently
can reach level 10 in experience before level 5 in dungeon depth.
This breaks the intended correlation between character strength and
dungeon danger.

I have numbers: average XP level at dungeon level 10 is now 13.2
versus 8.7 under the old formula.  The game is meaningfully easier.

I am not saying revert it.  I am saying we should discuss whether
this is what we want before it goes into 3.0.

  Michiel`
  },
  {
    from: 'brouwer',
    subject: 'branch merge: NetHack 3.0a',
    body: `Rodney,

I am preparing to merge the development branches for NetHack 3.0
alpha.  The branch list:

  master     -- base (clean 1.0.3 + initial 3.0 changes)
  shops      -- new shopkeeper AI + floating shops
  levels     -- Oracle level, Sokoban levels
  monsters   -- mind flayer, priest, soldier types
  items      -- new item types, artifact expansion

Merge order: monsters first (fewest conflicts), then items, then
levels, then shops.  Master stays clean until all branches merge.

Expected merge window: this weekend.

  Michiel`
  },

  // ----- lebling (~10) -----

  {
    from: 'lebling',
    subject: 'Zork I: a walkthrough I wrote',
    body: `Rodney,

Attaching a walkthrough I wrote for Zork I.  Not because players
need one (they shouldn't), but because I found the process of
writing it illuminating.  It forced me to articulate what the
game is actually about.

The conclusion I reached: Zork I is really about curiosity.  Every
puzzle is a question.  The player's motivation is "I wonder what
happens if..."  That's different from "I need to survive," which
is the dungeon-crawler motivation.

Different games, different pleasures.  But I think the curiosity
motivation produces a richer relationship with the game world.

  Dave`
  },
  {
    from: 'lebling',
    subject: 'parser update: Zork II',
    body: `Rodney,

Quick update on the Zork II parser.

We've extended the grammar to handle more complex noun phrases:
"put the lamp in the brass lantern" now parses correctly (previously
it would misidentify the prepositional phrase).  Also: the parser
now handles "all" in more contexts -- "take all" and "drop all but
lamp" both work.

The challenge is keeping the error messages natural.  "I don't
understand that" is fine.  "PARSE ERROR: unexpected token at
position 7" is not.  The parser knows a lot; the error handling
has to pretend it doesn't know too much.

  Dave`
  },
  {
    from: 'lebling',
    subject: 'complaint: NetHack has no story',
    body: `Rodney,

I realize I said this in person at the conference but I want to
say it in writing too, because I mean it seriously and not as a
jab.

NetHack has no story.  "Retrieve the Amulet of Yendor" is a goal,
not a story.  You don't know why you want it, what it does, or
what will happen when you get it.  The dungeon has no past and
no future.  It just is.

This is fine for some games.  Rogue is fine.  But NetHack is
ambitious enough in its world-building (shops, priests, aligned
altars, quests) that the absence of narrative starts to feel like
a choice that should be questioned.

What would it take to give Rodney a reason to go down there?

  Dave Lebling`
  },
  {
    from: 'lebling',
    subject: 'Infocom: new game announcement',
    body: `Rodney,

Can't say much yet but we have a new game in development.
Should be out this fall.

Different from Zork.  Smaller scope, tighter focus.  More
of a mystery than an exploration.  The parser work from
Zork II will serve it well -- this game needs precise
language handling more than a big world.

More when I can say more.

  Dave`
  },
  {
    from: 'lebling',
    subject: 'why mazes need narrative',
    body: `Rodney,

Following up on our ongoing argument: I want to propose a test.

Take a maze.  Any maze.  Put a player in it with no other context.
Observe: the player maps it, finds the exit, and feels mild satisfaction.

Now put the same player in the same maze but tell them it was built
by a minotaur who kidnapped their sister.

Different experience.  Same maze.  The narrative is doing real work.

The dungeon is your maze.  I am asking: who built it, and why?
The Wizard of Yendor is your minotaur, but we know almost nothing
about him.  That's a missed opportunity.

  Dave`
  },
  {
    from: 'lebling',
    subject: 'the white house',
    body: `Rodney,

You asked what I am most proud of in Zork.

The white house.

"You are standing in an open field west of a white house, with a
boarded front door."  That's 17 words.  But players have been
arguing about that house for years.  Who lives there?  What is
the history of the land?  Why is it boarded up?

It's an opening line that does more world-building than most
games' entire text.  It implies a history, a geography, a
mystery.  And then it makes you curious enough to try the door.

That's what good opening lines do.  NetHack starts in a dungeon.
Fine.  But: whose dungeon?

  Dave`
  },
  {
    from: 'lebling',
    subject: 'the grue: a design note',
    body: `Rodney,

Since you asked: yes, the grue was designed to solve a problem.

The problem: Zork's world is dark in many places and we needed
to discourage players from just walking around in the dark.
We could have used random damage, but that feels arbitrary.

The grue is better because it has an identity.  It is a thing
that lives in the dark.  It has preferences (it dislikes light).
It has a name.  Players respond to the grue very differently than
they would to "you lose 5 hp to darkness."

The design lesson: if you need a mechanical constraint, find a
creature that embodies the constraint.  It's more memorable and
it enriches the world.

You could apply this principle anywhere, including dungeons.

  Dave`
  },
  {
    from: 'lebling',
    subject: 'infocom event: save the date',
    body: `Rodney,

We are planning a small event at Infocom in June -- a mix of
game developers, some academics, and a few enthusiast press people.
Mostly about interactive fiction and where it goes from here.

You would be welcome.  The dungeon-crawler perspective is useful
and I think the cross-pollination could produce interesting things.

Let me know if you are interested and I will add you to the list.
Dates TBD but probably the second week of June.

  Dave Lebling
  Infocom`
  },
  {
    from: 'lebling',
    subject: 'friendly rivalry',
    body: `Rodney,

I want to be clear that when I criticize dungeon crawlers I am
doing it with respect.  What you and Jay and the others have built
is technically impressive and I know people love it.

My argument is not that narrative games are better.  It is that
narrative games solve a different problem: they make players care
about a fictional world for its own sake.  Dungeon crawlers make
players care about their character's survival.  Both are valid.

I just find the first one more interesting to work on.

No hard feelings, I hope.

  Dave`
  },
  {
    from: 'lebling',
    subject: 'parser philosophy: constraints as features',
    body: `Rodney,

Something I have been thinking about: the limitations of the parser
are features, not bugs.

When the parser doesn't understand "jump over the troll," the player
thinks "oh, I need to phrase this differently."  That cognitive step
-- rephrasing, trying again, finding the parser's vocabulary -- is
part of the game.  It teaches you to think in the game's terms.

A completely permissive interface that accepts anything removes that
friction.  And I think the friction is actually valuable.  It slows
you down, makes you pay attention to the language.

This is why I am skeptical of "parser-free" text adventure designs.

  Dave`
  },

  // ----- harvey (~10) -----

  {
    from: 'harvey',
    subject: 'a word about goto',
    body: `Rodney,

I noticed some goto statements in the Hack source code.  I know,
I know -- Dijkstra's paper is 20 years old and everyone has an
opinion.  But let me make the case again briefly.

The problem with goto is not that it's slow or that the compiler
can't handle it.  The problem is cognitive.  When you read code
with goto, you cannot understand a function by reading it from top
to bottom.  You have to trace the flow graph in your head.

The alternatives (while loops, structured conditionals, functions)
allow you to understand code locally.  Each piece makes sense on
its own.  goto destroys locality.

Consider refactoring.  I would be happy to help.

  Brian Harvey
  CS Division, UCB`
  },
  {
    from: 'harvey',
    subject: 'Logo turtle graphics',
    body: `Rodney,

I have been teaching an introductory CS course this semester using
Logo and I want to share something surprising.

Students who have never programmed before are writing recursive
programs in week four.  Not because I told them to -- because the
turtle problems naturally suggest recursion.  "Draw a tree" leads
to "draw a branch, then draw a smaller tree at the end of the branch."

They don't know they are doing recursion.  They are just solving
the problem.  And then we name it and they realize they already
understand it.

This is the pedagogical power of a good environment.  The right
tools make the right ideas obvious.

  Brian`
  },
  {
    from: 'harvey',
    subject: 'Scheme: why it belongs in education',
    body: `Rodney,

Making my case for Scheme as the first language for CS students.

Scheme has two things that matter most in a first language:
  1. Simple, uniform syntax (no special cases to memorize)
  2. Clean semantics (what you write is what happens)

In C, you can write things that compile and run but produce
undefined behavior.  In Scheme, the language is defined precisely
enough that you always know what a legal program does.

For teaching, this is essential.  Students should learn to think
about programs as mathematical objects before they deal with the
ugliness of real systems.

  Brian Harvey`
  },
  {
    from: 'harvey',
    subject: 'recursive Fibonacci: a teaching note',
    body: `Rodney,

I use Fibonacci as a teaching example and I want to document my
approach because I think the standard version teaches the wrong lesson.

Most people teach:

  (define (fib n)
    (if (< n 2) n
        (+ (fib (- n 1)) (fib (- n 2)))))

This is correct but exponentially slow.  Students learn recursion
and then learn "recursion is slow."  Wrong lesson.

I teach the accumulator version first:

  (define (fib n)
    (fib-iter n 0 1))
  (define (fib-iter n a b)
    (if (= n 0) a
        (fib-iter (- n 1) b (+ a b))))

This is tail-recursive and O(n).  The lesson is: recursive doesn't
mean slow.  The shape of the recursion matters.

  Brian`
  },
  {
    from: 'harvey',
    subject: 'teaching freshmen CS',
    body: `Rodney,

First week of the semester is always the hardest.

The students divide into three groups: those who have programmed
before and think they know everything, those who have never programmed
and are terrified, and the small middle group who have some experience
and an open mind.

The goal for week one is to not lose the third group to the first.
The experienced students will try to show off.  This discourages
the beginners.  I manage this by starting with problems where
programming experience is not an advantage -- visual problems,
pattern problems, things that reward careful thinking over prior syntax.

By week three the groups usually blur.  That's the goal.

  Brian`
  },
  {
    from: 'harvey',
    subject: 'Snap!: block programming for serious learners',
    body: `Rodney,

Working on a project called Snap! -- a block-based programming
environment, like Logo but visual.  You snap blocks together to
form programs.  No syntax errors.  The structure is visible.

I know what you are thinking: isn't that for children?

No.  Or rather: it is for beginners, and most beginners are adults
who have been told programming is hard.  The visual syntax removes
one large obstacle.  The underlying semantics are still serious --
first-class functions, recursion, higher-order procedures, all of it.

I believe you can teach a full CS curriculum with Snap!.

  Brian Harvey`
  },
  {
    from: 'harvey',
    subject: 'why functional programming matters',
    body: `Rodney,

I get asked whether functional programming is practical.

Yes.  But the real question is: what does it teach you that
imperative programming doesn't?

Functional programming teaches you to think about data transformation.
Here is a list.  Here is what I want to know about the list.  Here
is the function that produces the answer.  No mutation, no side effects.

When you come back to imperative code after thinking functionally,
you write better imperative code.  You are more careful about state.
You write smaller functions.  You test more.

It is not a replacement.  It is a lens that sharpens your thinking.

  Brian`
  },
  {
    from: 'harvey',
    subject: 'tail recursion: the important thing',
    body: `Rodney,

The important thing about tail recursion is not that it's fast.
It's that it makes iteration and recursion equivalent.

In Scheme, a tail-recursive function uses constant stack space
regardless of how many times it recurses.  This means: every loop
you could write, you can write as a recursive function.  And
every recursive function that only calls itself in tail position
is really a loop.

This equivalence is what makes Scheme's semantics clean.  You
don't need a separate concept of "iteration."  Loops are just
tail-recursive functions.  One concept instead of two.

This is why the scheme standard requires tail-call optimization.

  Brian`
  },
  {
    from: 'harvey',
    subject: 'pattern matching vs. recursion',
    body: `Rodney,

A student asked me this week: "Why do we need recursion if we
have loops?"

I answered: recursion is not a replacement for loops.  Recursion
is a way of thinking about structure.  When the data is structured
(a list, a tree), the computation over that data is naturally
structured the same way.

A list is either empty or a first element plus a smaller list.
A recursive function on a list matches that structure exactly.
A loop over a list pretends the list is just a sequence of slots.
It works but it doesn't reflect the actual nature of the data.

This is not just aesthetic.  Programs that match their data's
structure are easier to reason about and easier to prove correct.

  Brian`
  },
  {
    from: 'harvey',
    subject: 'correction: variable naming',
    body: `Rodney,

I looked at a piece of your code (I hope you don't mind -- Jay
showed it to me).

The variable names are not helping.  I see: x, xx, x2, tmp, tmp2,
buf, buf2.  What do these mean?  In a small function it doesn't
matter.  In a 200-line function it matters a great deal.

Variables should be named for what they contain, not their type
or their position in the alphabet.  'remainingCharges' is better
than 'x'.  'monsterCount' is better than 'cnt'.

I realize this seems like a small thing.  Over the lifetime of a
codebase it is not small.

  Brian`
  },

  // ----- blank (~8) -----

  {
    from: 'blank',
    subject: 'Infocom Q4 sales figures',
    body: `Rodney,

Sharing Q4 sales figures since you asked about the market.

Zork I:    14,200 units
Zork II:    9,800 units
Zork III:   7,100 units
Deadline:   6,400 units

Total interactive fiction market this quarter: approximately 52,000
units across all publishers.  We have roughly 72% market share.

The growth is real but the ceiling is visible.  We are limited by
the installed base of home computers that can run these games.
As that base grows, so will the market.

  Marc Blank
  Infocom`
  },
  {
    from: 'blank',
    subject: 'licensing inquiry: Adventure IP',
    body: `Rodney,

Following up on our brief conversation at the conference.

We have looked at the Adventure/Colossal Cave IP situation and
our legal team's view is that it is ambiguous.  The game was
developed at MIT, which complicates the question of who holds
what rights.

If Infocom were to develop a commercial product based on Adventure,
we would want a clean chain of title.  We are not there yet.

Worth continuing the conversation, though.  Let me know if you
want to set up a call.

  Marc Blank
  Infocom`
  },
  {
    from: 'blank',
    subject: 'partnership inquiry',
    body: `Rodney,

A short note about a potential partnership.

We have been approached by a hardware company about bundling a
game with their new home computer.  They want something that
demonstrates the machine's text capabilities.  We are evaluating
whether this is a fit for one of our existing titles or whether
a new development is warranted.

Would you be open to a conversation about what a collaboration
might look like?  I realize your work is primarily in the academic
space but the practical experience you have with dungeon games
would be useful input.

  Marc`
  },
  {
    from: 'blank',
    subject: 'Infocom developer summit',
    body: `Rodney,

We are organizing a small developer summit in Cambridge in April.
About 20 people -- developers, designers, one or two academics.
The agenda is open-ended: where does interactive fiction go next?

I would like to invite you.  The dungeon-crawling community and
the parser IF community don't talk enough.  I think there is
more common ground than the genres suggest.

Details to follow if you are interested.

  Marc Blank`
  },
  {
    from: 'blank',
    subject: 'product roadmap: Zork II',
    body: `Rodney,

The Zork II roadmap, for your reference:

  - Enhanced parser (ship with release)
  - Improved inventory management UI (ship with release)
  - Expanded magic system (post-launch patch)
  - Illustrated version (longer timeline, dependent on artist)

The illustrated version is speculative -- it depends on finding
an artist whose work fits the tone.  The world is text-primary
and we want to keep it that way; illustrations would be supplements,
not replacements.

  Marc`
  },
  {
    from: 'blank',
    subject: 'rights question: Dungeon',
    body: `Rodney,

Our legal team has been looking at the relationship between Zork
and the original Dungeon program.  Dungeon was derived from Zork
(the MDL version) and distributed somewhat freely, which creates
questions about derivative works.

I am not alleging anything.  I am flagging that this is an area
where the IP landscape is complicated and I want to make sure
all parties are aware.

If you or anyone in your community has concerns, better to raise
them now than later.

  Marc Blank
  Infocom`
  },
  {
    from: 'blank',
    subject: 'market research request',
    body: `Rodney,

A short request: we are doing market research on who plays
dungeon games and what they want.

If you are willing to share any usage data from Hack or NetHack
-- number of players, session length, how far players typically
get, that sort of thing -- it would be useful input.  We are
not trying to clone your games; we want to understand the audience.

Completely optional, and the data would stay internal.

  Marc`
  },
  {
    from: 'blank',
    subject: 'thoughts on the parser market',
    body: `Rodney,

Sharing a thought on where the parser market goes.

The parser is a remarkable interface for its time.  It allows
the player to express complex intentions in natural language.
But it requires players to learn a specific dialect, and it
fails in ways that feel like the game's fault rather than the
player's.

I think the parser has a ceiling.  Not because it's bad but because
the learning curve discourages casual players.  To grow the market
we need to either lower the learning curve or accept that interactive
fiction is a niche.

I don't have a solution.  Menus are worse.  Hypertext loses too much.
Still thinking.

  Marc`
  },

  // ----- crowther (~8) -----

  {
    from: 'crowther',
    subject: 'new cave passage found',
    body: `Rodney,

Found a new passage off the main Mammoth Cave survey route last
weekend.  It's not on any of the existing maps I have.

The approach is tight -- about 18 inches at the narrowest -- but
it opens into a chamber maybe 30 feet across.  Good formations.
No evidence of previous human entry.

I've marked the coordinates.  Will need a proper survey trip to
document it.  If you want to come along, let me know.

  Will`
  },
  {
    from: 'crowther',
    subject: 'Adventure: how it started',
    body: `Rodney,

Someone asked me this week to explain how Adventure started, so
I wrote it up.

I was doing cave survey work and keeping notes on the Mammoth Cave
system.  I had all this data -- room connections, passage lengths,
feature descriptions -- and I thought: what if the computer could
walk through it?

The first version was just the survey data turned into navigable
rooms.  No puzzles, no treasure, just the cave.  My kids played it.
They wanted more.  So I added puzzles.  Then Levin added more of
everything and it became the version people know.

The cave topology in the game is real.  The Colossal Cave section
is real.  I wanted players to feel like they were actually underground.

  Will`
  },
  {
    from: 'crowther',
    subject: 'Mammoth Cave topology',
    body: `Rodney,

Describing the section of Mammoth Cave that inspired the game,
in case it's useful for your level design thinking.

The main tour route is a roughly linear path with branches.  What
makes it interesting as a space is the vertical variation -- you
go up and down constantly, not just left and right.  Some chambers
are 60 feet tall.  Some passages are flat-out crawls.

The thing a 2D grid can't capture is how caves actually feel.
The vertical element changes everything.  In the game we simulated
this with "up" and "down" exits, but it's a simplification.

If you ever want to design better dungeon levels, come caving.

  Will`
  },
  {
    from: 'crowther',
    subject: 'the game started as a survey tool',
    body: `Rodney,

Just to clarify something that gets misreported:

Adventure was not designed as a game from the beginning.  It started
as a cave survey program.  I was using the computer to map the cave
system, and the program could output directions for navigating it.

The "game" layer -- the treasure, the puzzles, the lamp -- was
added later, after I realized my kids enjoyed just walking through
the cave in the simulation.

I mention this because people assume the design was intentional from
the start.  It wasn't.  It evolved.  The best designs often do.

  Will`
  },
  {
    from: 'crowther',
    subject: 'caving safety reminder',
    body: `Rodney,

A brief safety note since some people in the group are newer
to caving:

  - Always tell someone where you are going and when to expect you back
  - Carry three light sources minimum (headlamp plus two backups)
  - Never push a tight passage alone
  - Hypothermia is the real risk, not getting lost -- dress for the
    temperature underground (usually 54F in Mammoth)
  - Turn back at one-third of your light supply, not half

These rules exist because people have died ignoring them.  The cave
is not hostile; it just doesn't forgive poor planning.

  Will`
  },
  {
    from: 'crowther',
    subject: 'invited to lecture at MIT',
    body: `Rodney,

Got an invitation to lecture at MIT this fall -- their history
of computing series.  The topic would be Adventure and the origins
of interactive fiction.

I said yes, which means I have to actually organize my thoughts
on the subject.  I have been the reluctant "father of adventure
games" for long enough that I should probably just write it down.

Any chance you would be at that lecture?  I'd value your perspective
on the dungeon-game side of the lineage.

  Will`
  },
  {
    from: 'crowther',
    subject: 'what it is like to be called the father of something',
    body: `Rodney,

Dave Lebling introduced me at the conference as "the father of
adventure games."  I don't know how to feel about that.

I made a cave navigation program.  Don Levin made it into a game.
Don Woods extended it into something with real scope.  Then a
whole generation of people -- you included -- made it into a
medium.

The "father" framing credits me with things I didn't do.  But I
also don't want to be the person who says "actually I don't deserve
credit" every time someone says something nice.

So I just try to be useful going forward.

  Will`
  },
  {
    from: 'crowther',
    subject: 'cave room descriptions',
    body: `Rodney,

Since you asked about room descriptions:

Good cave room descriptions are short and precise.  "You are in a
large chamber with a domed ceiling.  Passages lead north and east.
A small stream runs along the south wall."  That's enough.

The temptation is to write too much.  Caves are repetitive in
reality; the description has to capture what's distinctive without
going on.  Players skim long descriptions.

The thing I got right in Adventure was: every room has one notable
thing.  One.  The Hall of the Mountain King has the snakes.  The
Y2 chamber has the plover.  One thing per room.

Something worth considering for dungeon rooms.

  Will`
  },

  // ----- oracle (~4) -----

  {
    from: 'oracle',
    subject: 'Unsolicited prophecy #47',
    body: `Rodney,

I send this message unsolicited, as I send all of them.  You will
not heed it, as you heed none of them.  This is itself foreseen.

On your next descent past the third level: the ring you are
carrying will be more important than the wand.  The potion you
think is healing is not.  The corridor that looks empty is not empty.

I offer this at no charge.  The consultation fee applies only to
direct questions.

You're welcome.

  The Oracle
  Delphi Branch Office, Dlvl 11`
  },
  {
    from: 'oracle',
    subject: 'invoice for consultation services',
    body: `INVOICE
From: The Oracle, Delphi Branch Office
To: Rodney (the Nethacker)
Date: see postmark
Reference: Oracle visit #23, Q: "Should I go down or up?"

Services rendered:
  Cryptic prophecy (one):                    200 zm
  Clarification (refused -- not included):     0 zm
  Waiting time while you made up your mind:   50 zm
  Existential certainty surcharge:             15 zm
  --------------------------------------------------
  Total due:                                  265 zm

Terms: net 30 days.  Late payment results in additional
prophecies, whether you want them or not.

  The Oracle`
  },
  {
    from: 'oracle',
    subject: 'prophecy in verse',
    body: `Rodney,

When the moon is wrong and the Amulet near,
The one who descends will find more than he sought.
The third door from the left holds that which you fear,
And the thing that you carry is not what you thought.

The shopkeeper knows.  The dungeon remembers.
The wand you have spent will come back with a cost.
Go down when it's light.  Come up through the embers.
And whatever you do, don't forget what you've lost.

No charge for verse prophecies.  They are less useful
and I price accordingly.

  The Oracle`
  },
  {
    from: 'oracle',
    subject: 'a complaint about adventurers',
    body: `Rodney,

I want to register a professional complaint.

In the past month I have been visited by fourteen adventurers.
Of these:
  - 11 asked questions whose answers they then ignored
  - 2 attacked my attendants
  - 1 tried to steal the altar equipment

When I answer a question, the answer is correct.  It is always
correct.  I am the Oracle.  Ignoring the answer is the prerogative
of the questioner, but it is frustrating to watch.

I told the last adventurer that the stairs were east of the pillar.
He went west.  He died west of the pillar.  I saw this coming.

Please pass the word: listen to the Oracle.

  The Oracle
  Dlvl 11`
  },

  // ----- thief (~4) -----

  {
    from: 'thief',
    subject: 'The platinum bar: my score',
    body: `Rodney,

Just want to say: 50,000 zorkmids for the platinum bar.  That's
my current high score and I am proud of it.

The trick was the trophy case.  Everyone leaves the trophy case.
I took the trophy case.  You'd be surprised what the case itself
is worth to a collector.

The jeweled egg is next.  I know where it is.  I just need to
get past the thief.  (Yes, I know.  There's irony there.)

If your dungeon has anything comparable, let me know.  I fence
everything.  Fair rates.

  The Thief
  Zork, Level B2`
  },
  {
    from: 'thief',
    subject: 'offer: fencing services',
    body: `Rodney,

I understand you sometimes acquire items whose provenance might
be described as complicated.

I offer competitive fencing rates:
  Gems and jewelry: 65% of appraised value
  Unique artifacts: negotiable
  Cursed items: 5 zm flat, no exceptions -- not worth my time
  Quest items: I don't touch them.  Too much heat.

No questions asked.  Discretion guaranteed.  I have been in this
business a long time and I have not been caught yet.

  The Thief
  (contact via intermediary; I don't put my address on letters)`
  },
  {
    from: 'thief',
    subject: 'apology: the lamp',
    body: `Rodney,

I owe you an apology.

I took your lamp.  The brass one.  I know it was yours because
it had a chip on the handle that matched the description in your
lost-item report.

In my defense: it was sitting unattended in a lit corridor, which
in my experience means it's fair game.  In your defense: you were
fighting a troll at the time, which is a reasonable reason to put
down a lamp temporarily.

I have already sold it.  I cannot get it back.  But I can offer
you a discount on my next job if that helps.

  The Thief`
  },
  {
    from: 'thief',
    subject: 'dungeon reconnaissance: a question',
    body: `Rodney,

Word has it you are quite familiar with the Mazes of Menace.

I am not asking for a map.  I would not use a map -- I find them
diminishing.  But I am curious: is there anything in the lower
levels that would be worth a serious professional's time?

The platinum bar was good.  The jeweled egg was better.  Ideally
I am looking for something unique, difficult to obtain through
legitimate means, and with a buyer already in mind.

If you think of something, drop me a note.  I pay informant fees.

  The Thief`
  },

  {
    from: 'stephenson',
    subject: 'NetHack 3.1 status',
    body: `Rodney,

Quick update on the 3.1 timeline: we're close but not there yet.
The blocking items are the save file format change (which requires
all existing saves to be invalidated -- never fun to tell players
this) and a regression in the polymorph code that nobody has been
able to fully track down.

Brouwer's level connectivity patch is going in.  It's clean and
the test coverage is solid.

The Izchak shopkeeper will be in this version.  I wanted that
in before we did anything else.

  -- Mike`
  },
  {
    from: 'stephenson',
    subject: 'Re: complexity',
    body: `Rodney,

You asked how we decide what to add.

The honest answer: someone on the DevTeam thinks it's interesting
and writes it well enough that nobody objects strongly.  That's
roughly the whole process.

The cockatrice interactions took about five separate additions over
three versions.  Nobody planned all of it.  Each one seemed locally
reasonable.  Collectively they produce something that feels like a
real object in a real world, which is the point.

Whether this is a good way to build software is a separate question.

  -- Mike`
  },
  {
    from: 'wichman',
    subject: 'level generator question',
    body: `Rodney,

Toy mentioned you were asking about the room layout algorithm.
The short version: 3x3 grid of regions, one room per region,
corridors connecting neighbors.  It guarantees connectivity and
runs fast enough on the PDP-11 to not make the level load feel
slow.

The long version is in my notes if you want to look.  I put them
on the system under my home directory.

  -- Glenn`
  },
  {
    from: 'wichman',
    subject: 'dark rooms',
    body: `Rodney,

Ken says you're asking about the dark room mechanic.  It was his
idea, not mine, but I'll take the blame for the implementation.

A dark room is one where you can only see the square you're
standing on plus adjacent squares.  Most rooms are lit.  A few
aren't.  We chose the dark rooms randomly at level generation time.

The effect: the dungeon feels larger.  You walk into an unlit room
and you don't know if it's a closet or a cathedral until you walk
around.  Monsters can be anywhere.

Players hate it.  In a good way.

  -- Glenn`
  },

];

// =========================================================================
// REPLY_RULES -- per-user reply rules and generic responses.
// Used by the auto-reply engine when Rodney sends mail to a user.
// Keywords are matched against the lowercase subject + body of Rodney's msg.
// =========================================================================

export const REPLY_RULES = {

  izchak: {
    replyRules: [
      {
        keywords: ['wand', 'staff'],
        responses: [
          {
            subject: "Re: wands",
            body: `Rodney,

Ah, wands!  You have come to the right place.

I have wands of striking (3), wands of teleportation (2), and a single
wand of slow monster in current stock.  All uncursed, charges verified.
The wand of striking I can do for 400 zorkmids each; the teleport wand
is 350.

The wand of slow monster is 250 and between you and me that price is
not going to last -- they are hard to restock.

Come by when you are next on level 4.

  -- Izchak`
          },
          {
            subject: "Re: your inquiry",
            body: `Rodney,

Your question about wands: yes, I can help.

My wand policy is as follows: I test all wands before sale.
Charges are verified, cursed status confirmed negative.  If a wand
fails within 48 hours of purchase through a manufacturing defect
rather than your own misuse, I will replace it.

If you need a specific type I do not have in stock, let me know and
I will put in an order.  Rare wands take 1-2 weeks to source.

  -- Izchak`
          },
        ],
      },
      {
        keywords: ['potion'],
        responses: [
          {
            subject: "Re: potions",
            body: `Rodney,

Potions -- yes, I have a good selection at the moment.

Potions of healing: 200 zm each.  Potions of extra healing: 400 zm.
I also have a potion of gain level (not always in stock -- 600 zm)
and several of the standard utility potions: confusion, blindness,
invisibility.

If you are looking for something specific, name it and I will tell
you if I have it or can get it.

  -- Izchak`
          },
          {
            subject: "Re: potion stock",
            body: `Rodney,

On the subject of potions: please be aware that potions cannot be
identified by appearance alone.  The "bubbly" potion in one game's
mapping is not the "bubbly" potion in another's.

I mention this because I occasionally have customers who insist
they know what a potion is without testing it.  I am happy to
identify before sale at no extra charge.  This prevents the
"I thought it was healing" conversation I have had more than once.

  -- Izchak`
          },
        ],
      },
      {
        keywords: ['scroll', 'book'],
        responses: [
          {
            subject: "Re: scrolls",
            body: `Rodney,

I keep a rotating stock of scrolls.  Current inventory:

  Scroll of identify (4):         100 zm each
  Scroll of teleportation (2):    150 zm each
  Scroll of enchant weapon (1):   200 zm
  Scroll of remove curse (3):     120 zm each

The scroll of enchant weapon will not last long -- if you want it,
come soon.  I cannot always source them.

  -- Izchak`
          },
        ],
      },
      {
        keywords: ['shop', 'buy', 'sell', 'price'],
        responses: [
          {
            subject: "Re: shop inquiry",
            body: `Rodney,

I am happy to answer questions about the shop.

I buy items as well as sell them, though my offer price is typically
40-60% of retail depending on condition and demand.  Cursed items
I will buy at 5 zorkmids regardless of type -- they require
decursing before resale, which costs me.

If you have items to sell, bring them by.  I will make you an offer.

  -- Izchak`
          },
          {
            subject: "Re: pricing",
            body: `Rodney,

On pricing: my prices reflect the difficulty of sourcing magical
items at this depth, plus the overhead of running a shop in a dungeon
(which is, I assure you, considerable).

I do not negotiate.  The price is the price.  However, regular
customers do receive a standing 8% discount, and I will honor that
for you specifically.

  -- Izchak`
          },
        ],
      },
      {
        keywords: ['cursed', 'blessed'],
        responses: [
          {
            subject: "Re: cursed/blessed status",
            body: `Rodney,

Cursed items are a significant problem in my trade.

My standard practice: I test all incoming items.  Those that are
cursed are either sent for decursing (expensive, worth it for rare
items) or sold at a significant discount with the curse status
disclosed.  I do not sell cursed items as uncursed.  My reputation
depends on it.

Blessed items are harder to source and priced accordingly.
A blessed scroll of remove curse, for instance, is worth three
times the uncursed version.

  -- Izchak`
          },
        ],
      },
      {
        keywords: ['theft', 'stolen', 'shoplift'],
        responses: [
          {
            subject: "Re: theft incident",
            body: `Rodney,

I take shoplifting very seriously.

My watch-dog identifies shoplifters reliably.  The consequence is:
the item is returned, a damage fee is assessed for any incident,
and the individual is permanently barred from the shop.

I do not press legal charges in most cases because dungeon law
enforcement is inconsistent.  But my records are thorough and
I share them with other shopkeepers in the dungeon network.

If you are writing to ask about a specific incident, please include
the date and a description of the individual involved.

  -- Izchak`
          },
        ],
      },
    ],
    genericResponses: [
      {
        subject: "Re: your message",
        body: `Rodney,

Thank you for writing.  The shop is busy at the moment -- there
has been an unusual number of adventurers on this level -- but I
wanted to respond promptly.

Is there something specific I can help you with?  My current stock
is good and I am happy to hold items for regular customers.

  -- Izchak`
      },
      {
        subject: "Re: hello",
        body: `Rodney,

Good to hear from you.  Come by the shop when you are passing
through level 4.  I have some items you might find interesting.

The general stock is refreshed this week -- new potions, a couple
of wands, and an interesting ring that came in with the last
shipment from the lower levels.

  -- Izchak
     The General Store, Dlvl 4`
      },
    ],
  },

  walz: {
    replyRules: [
      {
        keywords: ['bug', 'crash', 'error'],
        responses: [
          {
            subject: "Re: bug report",
            body: `rodney,

received.  i'll look at it.

when you say "crash" -- did it produce a core file?  if so, leave
it in place and tell me where.  a core dump plus the binary is
usually enough for me to find the problem.

also: what were you doing when it happened?  "it crashed" is
less useful than "it crashed when I typed 'q' after saving."

  walz`
          },
          {
            subject: "Re: error",
            body: `rodney,

got your error report.  this looks like a known issue with the
way the process handles signals during file i/o.  i've seen it
before.

workaround for now: make sure you are not running other heavy
processes at the same time.  the race condition is timing-dependent.

i'll put a proper fix in this weekend.

  walz`
          },
        ],
      },
      {
        keywords: ['quota', 'disk', 'space'],
        responses: [
          {
            subject: "Re: disk quota",
            body: `rodney,

your current usage:

  used: ${'>'}940KB of 1000KB

the core files are the main problem.  please delete:
  /home/rodney/core (380KB)
  /home/rodney/core.1 (214KB)

after that you should be fine.  if you need more quota, make
a case for it.  "i need more space" is not a case.  "i need
more space because X" might be.

  walz`
          },
        ],
      },
      {
        keywords: ['backup', 'patch', 'system'],
        responses: [
          {
            subject: "Re: system",
            body: `rodney,

acknowledged.  the backup situation is: daily tapes since the
new drive was installed, weekly tapes going back 4 weeks.

if you lost something, tell me the approximate date and i'll
check the tapes.  recovery is possible but slow -- plan for
24 hours from request to delivery.

  walz`
          },
        ],
      },
      {
        keywords: ['potion', 'mixing', 'combine', 'blessed', 'cursed', 'item', 'artifact', 'ring', 'wand', 'scroll'],
        responses: [
          {
            subject: "Re: item design",
            body: `rodney,

good question on the item mechanics.

my current thinking: the blessed/cursed layer should be added
to everything simultaneously, not item-by-item.  if it's only
on some items the player can't build consistent mental models.
"does cursing apply to rings?  to wands?  to armor?"
the answer should be yes, always.

the specific effect of the curse is what varies.  a cursed ring
of slow digestion could speed up digestion instead.  a cursed
wand of light could put out light instead.  the inversion is
the mechanic; the specific behavior is per-item.

  walz`
          },
          {
            subject: "Re: potion mixing",
            body: `rodney,

on potion mixing: i think the implementation is simpler than
it looks if you use a lookup table keyed by (type_a, type_b).

most entries in the table are "muddy potion" (failed mix).
the good combinations are sparse -- maybe 8-12 specific pairs
out of hundreds of possible combinations.

the player has to experiment to find the good pairs.
this is exactly the kind of emergent knowledge that makes
nethack interesting: veterans know things beginners don't,
but the knowledge was earned by dying a lot first.

  walz`
          },
          {
            subject: "Re: wand/ring proposal",
            body: `rodney,

the ring of conflict idea is the strongest one on the list.
the interaction surface is huge -- hostile to shopkeepers,
causes chaos in large rooms, could be countered by something
(ring of peace? amulet of calm?).

be careful about power creep on the wand side.  wands are
already the strongest item class.  wand of wishing especially
needs careful constraints.

my rule of thumb for magical items: the most powerful items
should have the most dangerous failure modes.
wand of death that misfires and hits you.
ring of polymorph control that randomly activates.
that way the player always has a choice to make.

  walz`
          },
        ],
      },
    ],
    genericResponses: [
      {
        subject: "Re: your message",
        body: `rodney,

got your message.  i'll deal with it when i get through the
current queue.  if it's urgent, find me in person.

  walz`
      },
      {
        subject: "Re: noted",
        body: `rodney,

noted.  if this requires system action i'll schedule it for
the next maintenance window.  non-urgent system changes wait
for maintenance windows to avoid disrupting users.

  walz`
      },
    ],
  },

  toy: {
    replyRules: [
      {
        keywords: ['rogue', 'bsd'],
        responses: [
          {
            subject: "Re: Rogue",
            body: `Rodney,

Happy to talk about Rogue design anytime.

The thing I am most proud of is the level generation.  Each level
is independently seeded, so the layouts are genuinely uncorrelated.
Playing it hundreds of times, you still see configurations you
haven't seen before.

If you are comparing to Hack's generator, the main difference is
constraint density.  Rogue's generator has fewer constraints and
produces more varied layouts.  Hack's has more constraints and
produces more navigable levels.  Both are valid design choices.

  Ken`
          },
        ],
      },
      {
        keywords: ['random', 'seed', 'rng'],
        responses: [
          {
            subject: "Re: RNG",
            body: `Rodney,

On the RNG question: for dungeon games, any generator with a period
above 2^31 and reasonable distribution is fine.

The academic critique of LCG (short period, low-bit correlation) is
real but not practically relevant for our use case.  No one is going
to play Rogue 2^31 times.

If you are worried, use a simple Lehmer generator with a good
multiplier.  It's one multiply and one mod.  Fast and decent.

  Ken`
          },
        ],
      },
      {
        keywords: ['terminal', 'vt100'],
        responses: [
          {
            subject: "Re: terminal",
            body: `Rodney,

Terminal compatibility is a real headache.

My approach: test on three representative terminals.  The vt100
as the standard.  An adm3a as the old baseline.  And whatever
the newest thing is.  If it works on those three it'll work on
most things.

The things that break: insert/delete character, alternate character
sets, and anything involving color.  If you avoid those, you have
a fighting chance.

  Ken`
          },
        ],
      },
    ],
    genericResponses: [
      {
        subject: "Re: your message",
        body: `Rodney,

Thanks for the note.  On the specific question: I don't have a
strong opinion yet, but I'll think about it.

Rogue design is one of those things where the right answer is
usually "try it and see what feels right."  Theory only goes so far.

  Ken`
      },
      {
        subject: "Re: BSD",
        body: `Rodney,

Good question.  The answer is probably in the source code somewhere
-- I wrote most of it and I still have to go read it to answer
specific questions.

Let me look and get back to you.

  Ken Toy`
      },
    ],
  },

  arnold: {
    replyRules: [
      {
        keywords: ['curses', 'ncurses'],
        responses: [
          {
            subject: "Re: curses question",
            body: `rodney --

the answer depends on which version you're using.

curses 3.x: call initscr() first, then your window setup, then
the main loop, then endwin() at the end.  do not call refresh()
before initscr().

the most common mistake: forgetting endwin() on error paths.
every exit point from the program needs to call endwin().

  -- arnold`
          },
        ],
      },
      {
        keywords: ['vt100', 'terminal', 'display', 'attribute', 'bold'],
        responses: [
          {
            subject: "Re: terminal attributes",
            body: `rodney --

tested the sequence you asked about.  results:

  vt100:  works as expected
  h19:    bold only, reverse ignored
  adm3a:  neither -- terminal doesn't support this combination

if you need this to work everywhere, fall back to bold alone.
bold is supported on every terminal that matters.

  -- arnold`
          },
          {
            subject: "Re: display question",
            body: `rodney --

short answer: use the curses attribute constants.  don't send
escape sequences directly.  curses knows what your terminal
supports and will emit the right sequence (or nothing, if the
terminal can't do it).

A_BOLD, A_REVERSE, A_UNDERLINE.  that's all you need.

  -- arnold`
          },
        ],
      },
    ],
    genericResponses: [
      {
        subject: "Re: your question",
        body: `rodney --

the answer is in the man page.  but since you asked: yes, that's
the right approach.  just make sure you call endwin() when you're done.

  -- arnold`
      },
      {
        subject: "Re: curses",
        body: `rodney --

i'll look into it.  these things are usually terminal-specific
and the fix is usually "use the abstraction layer, don't go direct."

  -- arnold`
      },
    ],
  },

  fenlason: {
    replyRules: [
      {
        keywords: ['hack', 'monster', 'ai'],
        responses: [
          {
            subject: "Re: monster AI",
            body: `Rodney,

Monster AI is the thing I am least happy with in the current build.

The pathfinding is Manhattan-distance greedy, which produces
obviously stupid behavior in corridors.  The monsters just jam up.

I'm working on a proper pathfinding fix for 1.1 but it's not
ready yet.  In the meantime: if you see monsters behaving in
ways that look wrong, they probably are, and I know about it.

  Jay`
          },
        ],
      },
      {
        keywords: ['item', 'balance'],
        responses: [
          {
            subject: "Re: item balance",
            body: `Rodney,

On item balance: the general principle I use is "rare items should
feel powerful, common items should feel useful."

If something feels overpowered, the first question is: how often
does it appear?  If it's rare, maybe that's okay.  If it's common
and overpowered, it needs a nerf.

What specific item were you asking about?

  Jay`
          },
        ],
      },
      {
        keywords: ['level', 'dungeon', 'design', 'feature'],
        responses: [
          {
            subject: "Re: level design",
            body: `Rodney,

Level design question -- happy to discuss.

My current thinking: levels should have one memorable feature each.
One unusual room, or one encounter type that's distinctive on that
level.  Players should be able to remember levels by their feel.

At the moment the levels all blend together too much.  That's a
content problem, not a generation problem.

  Jay`
          },
        ],
      },
    ],
    genericResponses: [
      {
        subject: "Re: your message",
        body: `Rodney,

Got your message.  Busy with 1.1 right now but I'll get back to you.

Short answer: yes, that's the intended behavior.  Long answer when
I have more time.

  Jay`
      },
      {
        subject: "Re: Hack",
        body: `Rodney,

Thanks for writing.  If this is a bug report, please include:
  1. What you expected to happen
  2. What actually happened
  3. Roughly how to reproduce it

If it's a feature request: put it in the list.  I have a list.
It's long.  Your suggestion may already be on it.

  Jay Fenlason`
      },
    ],
  },

  brouwer: {
    replyRules: [
      {
        keywords: ['nethack', 'patch', 'branch'],
        responses: [
          {
            subject: "Re: NetHack patch",
            body: `Rodney,

Thank you for the response.

I will incorporate your feedback into the next patch revision.
The branch will be ready for review by end of next week, assuming
no unexpected complications with the System V port.

Please let me know if you see any issues with the attached diff.

  Michiel`
          },
        ],
      },
      {
        keywords: ['parity', 'bug', 'level'],
        responses: [
          {
            subject: "Re: parity issue",
            body: `Rodney,

Yes, this is the behavior I am seeing as well.

I have been able to reproduce it consistently with the following
seeds: 1847, 3291, and 7703.  The divergence occurs at level
generation time, not during play, which suggests the issue is in
the initial placement logic rather than the movement code.

I will continue the analysis and send a patch when I have
identified the root cause.

  Michiel`
          },
        ],
      },
    ],
    genericResponses: [
      {
        subject: "Re: your message",
        body: `Rodney,

Thank you for your message.  I will give the matter proper consideration
and respond more fully when I have reviewed the relevant code.

In the meantime, if you have additional context that might be relevant,
please do not hesitate to send it.

  Michiel de Haan Brouwer`
      },
      {
        subject: "Re: NetHack",
        body: `Rodney,

I appreciate the note.  The development of NetHack benefits from
exactly this kind of engaged feedback, and I take your observations
seriously.

I will discuss this at the next team meeting and follow up afterward.

  Michiel`
      },
    ],
  },

  wichman: {
    replyRules: [
      {
        keywords: ['room', 'corridor', 'level', 'layout', 'dungeon'],
        responses: [
          {
            subject: "Re: level generation",
            body: `Rodney,

The room algorithm is 3x3 region grid, one room per region,
corridors connecting neighbors.  Guarantees connectivity, runs
fast on the PDP-11.

Happy to walk through it in more detail if you want.  It's not
complicated but the details matter.

  -- Glenn`
          },
        ],
      },
    ],
    genericResponses: [
      {
        subject: "Re: your note",
        body: `Rodney,

Got your message.  I'll think about it and get back to you.

I'm in the middle of the graphics pipeline paper and I'm trying
not to start any new side projects.  Rogue was supposed to be
a side project too.  You see how that turned out.

  -- Glenn Wichman`
      },
    ],
  },

  stephenson: {
    replyRules: [
      {
        keywords: ['nethack', 'devteam', 'release', 'version'],
        responses: [
          {
            subject: "Re: NetHack",
            body: `Rodney,

Thanks for the note.  The DevTeam is aware of this and it's on
the list for the next release.  I can't give a timeline but we
do keep track of everything that comes in.

  -- Mike Stephenson
     NetHack DevTeam`
          },
        ],
      },
      {
        keywords: ['izchak', 'memorial', 'shopkeeper'],
        responses: [
          {
            subject: "Re: Izchak",
            body: `Rodney,

Izchak was a good friend.  He would have been pleased to know
that his name is in the game.  He was the kind of person who
made every room feel a little more inhabited.

The shopkeeper character seemed right.  He knew the value of
things and he was always fair, even when he didn't have to be.

  -- Mike`
          },
        ],
      },
    ],
    genericResponses: [
      {
        subject: "Re: your message",
        body: `Rodney,

Thank you for writing.  I've passed your note to the rest of
the DevTeam.  We try to read everything that comes in, even
when the reply is slow.

  -- Mike Stephenson`
      },
    ],
  },

  lebling: {
    replyRules: [
      {
        keywords: ['zork', 'infocom', 'parser'],
        responses: [
          {
            subject: "Re: Zork",
            body: `Rodney,

Glad you asked.  The parser work is the part of Zork I am proudest of.

The core insight: the parser shouldn't be pedantic.  It should try
to understand what the player meant, not what they typed.  If someone
types "get lamp" and there's only one lamp, just get it.  Don't make
them type "take the brass lantern."

Good parsers disappear.  The player forgets they're talking to a
computer.  That's the goal.

  Dave`
          },
        ],
      },
      {
        keywords: ['narrative', 'story', 'text', 'adventure'],
        responses: [
          {
            subject: "Re: narrative",
            body: `Rodney,

You are engaging with my argument, which I appreciate.

My core claim: players who are emotionally invested in a world will
tolerate (even enjoy) difficulty that would feel unfair in a purely
mechanical context.  The Zork thief is an example.  He's genuinely
unfair.  But players remember him fondly because he's a character.

What would it take to make NetHack's antagonists feel like characters
rather than just difficulty generators?

  Dave Lebling`
          },
        ],
      },
    ],
    genericResponses: [
      {
        subject: "Re: your message",
        body: `Rodney,

Thank you for the note.  I'll think about your point more carefully
and write back when I have something worth saying.  You've given me
more to consider than I expected.

  Dave Lebling
  Infocom`
      },
      {
        subject: "Re: Infocom",
        body: `Rodney,

Good to hear from you.  We should talk in person sometime -- these
email exchanges are useful but they're no substitute for a long
conversation over coffee.

Come to Cambridge sometime.  The office is always interesting.

  Dave`
      },
    ],
  },

  harvey: {
    replyRules: [
      {
        keywords: ['logo', 'turtle', 'scheme', 'lisp'],
        responses: [
          {
            subject: "Re: Logo/Scheme",
            body: `Rodney,

Happy to discuss.  The key thing about Logo is that it was designed
to be discoverable -- students could figure it out through exploration
without being told the rules first.

Scheme is similar in spirit but more rigorous.  The two languages
serve different audiences: Logo for beginners who need to see
immediate results, Scheme for those ready to think about computation
abstractly.

Both have a place.  Neither is better; they're optimized for different
learning moments.

  Brian Harvey`
          },
        ],
      },
      {
        keywords: ['recursion', 'functional', 'goto'],
        responses: [
          {
            subject: "Re: recursion",
            body: `Rodney,

On recursion: the reason students find it hard is that it requires
thinking about a problem at two levels simultaneously -- the current
call and the recursive structure.

The way I teach it: always start with the base case.  What is the
simplest input?  What does the function return for that input?
Then: for a slightly harder input, can you express the answer in
terms of the answer for the simpler input?

If you can answer those two questions, you have the recursion.
The rest is syntax.

  Brian`
          },
        ],
      },
    ],
    genericResponses: [
      {
        subject: "Re: your message",
        body: `Rodney,

Thank you for writing.  You've raised something I find genuinely
interesting and I want to give it a thoughtful response.

The short version: I think you're right about the mechanism but
drawing the wrong conclusion.  Let me think about how to say
that more precisely and I'll write back.

  Brian Harvey`
      },
      {
        subject: "Re: programming",
        body: `Rodney,

I appreciate the question.  My answer is probably longer than
you want in an email.  The short version: the right abstraction
makes the hard problem easy.  The wrong abstraction makes the easy
problem hard.

Finding the right abstraction is the whole game.

  Brian`
      },
    ],
  },

  crowther: {
    replyRules: [
      {
        keywords: ['cave', 'adventure', 'colossal', 'spelunk'],
        responses: [
          {
            subject: "Re: caving",
            body: `Rodney,

Good question.

The thing about caves that doesn't translate to games is the
sensory experience.  The cold, the smell, the way sound behaves
in different chamber sizes.  Text can approximate it but not capture it.

What text CAN do that the cave can't: compress time, skip the dull
parts, make every room worth describing.  A real cave has stretches
of boring passage that you don't mention in a game.

The game is better than the cave in some ways.  The cave is better
in more ways.

  Will`
          },
        ],
      },
    ],
    genericResponses: [
      {
        subject: "Re: your message",
        body: `Rodney,

Thanks for the note.  I don't have a quick answer to that one but
I'll think about it.

If you want to talk in person, I'm around.  I'm usually easier to
reach than email suggests.

  Will`
      },
      {
        subject: "Re: Adventure",
        body: `Rodney,

Happy to talk about Adventure anytime.  I don't think of it as
"my" game anymore -- it's been extended so many times that I'm
really just the person who started it.

But the original cave topology, that's still mine, and I'm proud
of how faithfully it represented the real place.

  Will Crowther`
      },
    ],
  },

  oracle: {
    replyRules: [
      {
        keywords: ['prophecy', 'fate', 'future', 'oracle'],
        responses: [
          {
            subject: "Re: your question",
            body: `Rodney,

The answer to your question is yes.

Also no.  The contradiction is not an error.  It reflects the
genuine uncertainty of outcomes given your current path.  Both
futures exist.  Which one you inhabit depends on a choice you
will make on the fourth level, which I cannot describe more
precisely without changing the outcome.

Consultation fee: 200 zorkmids.  You know where to send it.

  The Oracle`
          },
        ],
      },
    ],
    genericResponses: [
      {
        subject: "Re: your inquiry",
        body: `Rodney,

I have considered your message.

The oracle's response to your specific situation is: not yet.
You will understand when the time comes.  The time will come
sooner than you expect and later than you would prefer.

This is a standard response and it will apply to your situation.
It always does.

  The Oracle
  Delphi Branch, Dlvl 11`
      },
      {
        subject: "Re: noted",
        body: `Rodney,

Your message has been received and processed.

The relevant prophecy has been updated.  Your next three choices
are already accounted for.  The fourth is genuinely uncertain,
which I find refreshing.

Consultation fee invoice follows separately.

  The Oracle`
      },
    ],
  },

  thief: {
    replyRules: [
      {
        keywords: ['steal', 'treasure', 'jewel', 'fence'],
        responses: [
          {
            subject: "Re: business",
            body: `Rodney,

Good to hear from a professional.

On the item you mentioned: yes, I can move it.  The market for
that category is decent right now.  I would need to see it first
-- I don't take descriptions at face value -- but if it's what
you say, I can offer 60% of appraised.

Usual protocols.  Don't write the location in the email.

  The Thief`
          },
        ],
      },
    ],
    genericResponses: [
      {
        subject: "Re: your note",
        body: `Rodney,

Got your note.  I'll think about it.

I don't usually work this far from the Zork levels but the right
opportunity changes the calculation.  Let me know if something
comes up that fits my skill set.

  The Thief`
      },
      {
        subject: "Re: inquiry",
        body: `Rodney,

Brief: yes, I'm interested.  Details in person.  Not in writing.

You understand.

  T.`
      },
    ],
  },

  blank: {
    replyRules: [
      {
        keywords: ['zork', 'infocom', 'game', 'product'],
        responses: [
          {
            subject: "Re: Infocom",
            body: `Rodney,

I appreciate the interest.  We've put a lot into these products and
it's gratifying when people notice.

Zork has done well for us -- better than we expected when we first
moved it from the PDP-10 to microcomputers.  The interactive fiction
market is real, and I think we've only scratched the surface.

What specifically were you asking about?

  Marc Blank`
          },
        ],
      },
      {
        keywords: ['license', 'rights', 'sale', 'business'],
        responses: [
          {
            subject: "Re: licensing",
            body: `Rodney,

Licensing questions are best directed to our business office.

That said: we're generally open to conversations about distribution,
but any agreement would need to go through proper channels.

I can pass your inquiry along.  What is it you have in mind?

  Marc Blank`
          },
        ],
      },
    ],
    genericResponses: [
      {
        subject: "Re: your message",
        body: `Rodney,

Thanks for writing.

I'm spread a bit thin between development and the business side,
so apologies if replies are slow.

What's on your mind?

  Marc Blank
  Infocom, Inc.`
      },
    ],
  },

};

// =========================================================================
// SOCIAL_ROUTING -- topic → expert routing for off-topic message handling.
// When Rodney emails user X about a topic that expert Y knows better,
// Y may send a social forward reply.
// =========================================================================

export const SOCIAL_ROUTING = [
  {
    keywords: ['wand', 'shop', 'buy', 'sell', 'potion', 'scroll', 'ring', 'armor'],
    expert: 'izchak',
    topic: 'shop inventory',
  },
  {
    keywords: ['bug', 'crash', 'quota', 'disk', 'backup', 'system'],
    expert: 'walz',
    topic: 'system administration',
  },
  {
    keywords: ['rogue', 'bsd', 'seed', 'terminal'],
    expert: 'toy',
    topic: 'Rogue and BSD gaming',
  },
  {
    keywords: ['curses', 'vt100', 'display', 'attribute'],
    expert: 'arnold',
    topic: 'terminal graphics',
  },
  {
    keywords: ['hack', 'monster', 'item', 'balance'],
    expert: 'fenlason',
    topic: 'Hack game design',
  },
  {
    keywords: ['nethack', 'patch', 'parity', 'branch'],
    expert: 'brouwer',
    topic: 'NetHack development',
  },
  {
    keywords: ['zork', 'parser', 'infocom', 'narrative'],
    expert: 'lebling',
    topic: 'interactive fiction',
  },
  {
    keywords: ['license', 'sales', 'business', 'rights'],
    expert: 'blank',
    topic: 'Infocom business',
  },
  {
    keywords: ['cave', 'adventure', 'colossal', 'spelunk'],
    expert: 'crowther',
    topic: 'caving and Adventure',
  },
  {
    keywords: ['logo', 'scheme', 'lisp', 'recursion', 'goto'],
    expert: 'harvey',
    topic: 'programming education',
  },
  {
    keywords: ['prophecy', 'fate', 'future', 'oracle'],
    expert: 'oracle',
    topic: 'prophecy and fate',
  },
  {
    keywords: ['steal', 'treasure', 'jewel', 'fence'],
    expert: 'thief',
    topic: 'dungeon treasure',
  },
  {
    keywords: ['room', 'corridor', 'layout', 'generator', 'level design'],
    expert: 'wichman',
    topic: 'dungeon level generation',
  },
  {
    keywords: ['devteam', 'release', 'maintainer', 'izchak memorial'],
    expert: 'stephenson',
    topic: 'NetHack development and history',
  },
];

export const SOCIAL_TEMPLATES = [
  '{via} forwarded me your note about {topic} — thought I should weigh in.',
  "I ran into {via} at lunch and he mentioned you'd asked about {topic}.\nThat's actually more my area, so I wanted to jump in.",
  "{via} CC'd me on your message.  On the subject of {topic}, let me just say:",
  "Word travels fast around here.  {via} mentioned you were asking about {topic}.",
  '{via} thought you might want to hear from me directly about {topic}.',
  "I happened to see your mail to {via} about {topic} — hope you don't mind if I jump in.",
];

// =========================================================================
// HOME_FILES -- Virtual home directory contents for each user.
// Each key is a username; value is { filename: content, ... }.
// Access tiers are enforced in filesystem.js:
//   world-readable: izchak, crowther, toy, arnold, wichman
//   root-only:      stephenson, fenlason, lebling, blank, walz, brouwer, harvey
// =========================================================================

export const HOME_FILES = {

  // -----------------------------------------------------------------------
  // izchak -- world-readable
  // -----------------------------------------------------------------------
  izchak: {
    'inventory': `\
GENERAL STORE -- Inventory Log
Dlvl 4, by Izchak Miller
Last updated: weekly cycle

Current stock:
  lanterns ............  3  (one needs wick replacement)
  food rations ........  11 (fresh this cycle)
  scrolls of identify .  4
  potions of healing ..  6  (2 blessed, 4 uncursed)
  wand of striking ....  1  (12 charges)
  daggers .............  7
  +2 leather armor ....  1
  lockpicks ...........  2
  gold pieces in till .  847

On order (backordered):
  wand of death (1) -- still delayed, dragon trouble in supply corridor
  scrolls of enchant weapon (6) -- no ETA from supplier

Prices held steady this cycle.  Market is soft on scrolls but I am
not discounting until stock runs low.

Note: the terminal cursor is jumping on the inventory screen again.
Lost two entries to display corruption.  Mailed Walz.  Waiting.
`,

    'shopkeeper_notes': `\
On being a shopkeeper in a dungeon
Izchak Miller

The philosophical problem: you are a rational economic actor in an
environment where the customers routinely die, where the merchandise
can kill you, and where the walls are occasionally passable.
Standard retail assumptions do not apply.

Adaptations I have made:

1. All transactions are immediate.  No credit.  The customer who
   owes me money will be dead before I can collect.  I learned this
   early.  I do not feel bad about it anymore.

2. I price to the information asymmetry.  The customer does not know
   what the items do.  I do.  This is a service I provide: knowledge.
   When I say "this is a potion of healing, uncursed," I am charging
   for certainty.  The alternative is guessing.  Guessing costs more.

3. I do not carry wands of death.  The liability is unacceptable.
   A customer who misuses a wand of striking breaks some things.
   A customer who misuses a wand of death kills things.  Possibly me.
   The margin is not worth it.

4. Pets are a problem.  The customer's cat is not a paying customer.
   The cat does not understand this distinction.  Several items have
   been knocked off shelves.  I am considering a policy.

On the future of the shop:
The dungeon keeps generating new levels.  There is no level 100;
the game simply produces more.  Theoretically I could open a branch
on level 8.  I know someone down there.  The logistics would be
complicated.  More dragons at that depth.  Thinking about it.
`,

    'complaints': `\
INCIDENT LOG -- General Store, Dlvl 4
Running record of notable incidents.  For my reference only.

Incident 47:
  Customer (human, ranger, unnamed) attempted to eat food from display
  without paying.  "Accidentally" he said.  Charged him full price plus
  a restocking fee.  He complained.  I told him the store is on level
  four of the dungeon and he is welcome to shop elsewhere.

Incident 48:
  Someone woke up on the shop floor with no memory of how they got there.
  They had a confused status and were carrying three of my potions.
  Sold them back to me at a significant loss, which was fair.

Incident 49:
  The wizard (Rodney) came in asking about the wand of death again.
  Still backordered.  He seems to believe that repeating the request
  more urgently will affect my supply chain.  It does not.

Incident 50:
  A kobold attempted to rob the store.  The kobold did not succeed.
  The less said the better.  Filing this for the insurance.

Incident 51:
  Adventurer arrived polymorphed into a rock troll.  Technically still
  a valid customer.  Sold him a potion of restore ability.  He paid in
  gold.  Gold is gold.

Note: I am considering a sign: "No polymorphed customers."
Haven't decided.  The rock troll paid promptly.
`,
  },

  // -----------------------------------------------------------------------
  // crowther -- world-readable
  // -----------------------------------------------------------------------
  crowther: {
    'cave_notes': `\
Field survey notes -- Mammoth Cave
William Crowther, section Q-7 and adjacent
April 1972

Started from the Crystal Palace junction on the main axis.  The
northeast crawlway is tight for about forty feet, then opens into
a chamber, roughly eight by twelve, with good flowstone on the
east wall.  No survey markers present.

I marked this spot in my notes as XYZZY -- my standard placeholder
when the official park designation hasn't been assigned yet and I
don't want to lose the location.  It's a nonsense word I use so
it won't be confused with a real landmark name.  The name tends
to stick.

Connected to the Well House area via a passage I hadn't mapped
before.  Took twenty minutes to find the connection but once you
know it's there it's obvious.  The two areas are not far apart;
they just feel far apart from inside.

The Y-branch at coordinates 44, 12 has a secondary passage I
haven't fully explored.  The air moves in there, which means it
connects to something.  Left a marker.

The grate near entrance Q-7 is jammed again.  Reported to park
maintenance last visit and again this visit.  Carry a crowbar or
plan on going around.

Second trip, June 1972:
  Found the XYZZY chamber again without the notes -- the flowstone
  is distinctive.  The secondary passage off the Y-branch connects
  to a larger gallery about 80 feet in.  Mapped it.  Named it the
  Plugh Annex (same naming convention, don't ask).  Good formations.
  About two hours in total from the main axis.

Note on the Well House connection: you can hear the well from the
XYZZY chamber when it's quiet.  That's how I found the passage.
Followed the sound.
`,

    'parser_notes': `\
On natural language parsing for games
W. Crowther

The adventure program uses two-word commands: verb + noun.
GO NORTH.  GET LAMP.  KILL DRAGON.

This works because the player's intent is constrained.
They can only do a few things.  The parser doesn't need to
understand language -- it needs to understand game actions.

The two-word limit is not a compromise; it is an insight.
Richer language does not produce richer play, it produces
parser errors.  "PUT THE LAMP ON THE TABLE CAREFULLY" fails.
"PUT LAMP TABLE" might work.  The player learns quickly.

Don Woods asked about multi-word input.  I said yes, he could
add it.  He did.  Some of his extensions work.  Some produce
the frustrating "I don't understand that" message that the
two-word parser largely avoided.

The principle I keep coming back to: the parser is a contract
with the player.  You tell them what the contract is, implicitly,
by what you accept.  If you accept "PUT LAMP" you have made a
promise about "PUT LAMP TABLE."  If you accept "TAKE" you have
promised "TAKE ALL."  Every accepted command creates an
expectation.  Keep the contract narrow and you can keep it.

I don't know if I'd design it differently now.  Two words was
probably right for what I was building.  For something richer
you'd need a different theory of the interface.
`,

    'adventure': `\
Notes on the cave game
W. Crowther, early 1975

Basic concept: the player walks through a simplified version of
the real cave.  Commands are two words, verb-noun.  The cave is
described from memory and from my survey notes -- not a literal
map, more like the feeling of the cave.  The branching is real
even if the distances aren't.

Things that need to work:
  - Moving between locations
  - Picking up and dropping objects
  - A lamp (finite fuel -- the battery concern is real in practice)
  - Something to find at the end

The magic words (XYZZY, PLUGH) are survey placeholders from my
notes that I repurposed.  They don't mean anything outside the
cave.  Players will figure out that they do something useful.

The dwarves are in there because the real cave has stories about
them.  I don't remember where I first heard that.

I don't know who else will ever play this.  My daughters like it.
That is probably enough.

Don Woods has been asking about expanding it.  I told him he could.
He has ideas about a scoring system and more objects.  Fine by me.
It's his now as much as mine.
`,
  },

  // -----------------------------------------------------------------------
  // toy -- world-readable
  // -----------------------------------------------------------------------
  toy: {
    'rogue_log': `\
Rogue development log
Michael Toy, UC Santa Cruz, 1980

We were trying to make a dungeon game that played differently every
time.  The insight was simple: if the dungeon is random, you can't
memorize it, which means you have to actually play.

The display problem was real.  We needed something faster than
clearing the whole screen every move.  Ken knew curses.  Lucky.

Initial design decisions I still think were right:
  - Permadeath.  Non-negotiable.  If you can load a save, the
    tension disappears.  The dungeon has to matter.
  - One @ sign.  You are the only thing of that shape in the world.
  - Hunger.  Forces movement.  Players will camp forever if you let them.
  - Items unidentified.  Best decision we made.  "Potion of something"
    is more interesting than "Potion of Healing."

Mistakes I would fix:
  - The LCG low-bit problem.  Ken still defends it.  He is wrong.
    The patterns are visible if you look.  But it shipped.
  - Inventory limit too low in early versions.  We raised it.
  - The starvation message could be clearer.

The game worked.  I don't know exactly why, which means I couldn't
have predicted it wouldn't work if we'd made different choices.
That's an unsatisfying explanation, but honest.

Glenn Wichman gets half the credit.  He wrote the first room
generator.  The bones of the level layouts are his.
`,

    'permadeath_essay': `\
Why permadeath is correct
Michael Toy

I keep having to defend this so I'm writing it down.

The argument against permadeath: "You lose all your progress.
That's frustrating.  Let people save and reload."

The argument for: saving and reloading removes the stakes.
Without stakes the game is a series of puzzles with no cost
for failure.  You try things until they work.  The dungeon
becomes a jigsaw puzzle with infinite attempts.

Rogue with saves is a different game.  Not worse, just different.
The game I want is one where the run matters.

The insight: death in a save-enabled game is a minor setback.
Death in Rogue is the end.  The emotional impact is completely
different.  You play differently when losing means really losing.
You take risks you wouldn't otherwise take because you have to --
the hunger timer runs, the food doesn't last.  You play carefully
because every mistake is permanent.  Both at once.  That tension
is what I'm after.

The secondary insight: permadeath makes every run different.
Not just because the dungeon is random -- because you are
different.  You bring the knowledge from previous deaths.
The character dies; the player learns.  This is the game.

Ken agrees with me on this.  Glenn is on the fence.
I don't think you can be on the fence.  It's a design commitment.
`,

    'todo': `\
Rogue TODO (ongoing)

Done:
  [x] Fix gnome pathfinding around doors
  [x] Uncursing mechanic
  [x] Wand of cancellation
  [x] Multiple amulets of yendor (false)

Pending:
  [ ] Stairs go both ways (up AND down)
  [ ] Scrolls of genocide
  [ ] Identify vs. known: clean up the distinction
  [ ] Troll regeneration -- too fast? ask Ken
  [ ] The armor display on status line -- still wrong sometimes

Deferred:
  - Pets.  Someone keeps suggesting this.  Maybe for 4.0.
  - Dungeon persistence across levels.  Too much memory.  PDP-11 limit.
  - Character classes beyond fighter.  Would need balance work.
    Jay is doing this in Hack anyway.
`,
  },

  // -----------------------------------------------------------------------
  // arnold -- world-readable
  // -----------------------------------------------------------------------
  arnold: {
    'curses_notes': `\
Notes on the curses implementation
Ken Arnold, 1980

The basic problem: updating a terminal display efficiently.
You want to move a character on screen without redrawing
everything.  On a 9600 baud line, every character costs time.
The answer is to track what's on screen and only send the
differences.

Key operations:
  move(y, x)     -- position cursor
  addch(c)       -- write character at cursor
  refresh()      -- flush pending updates to terminal
  clear()        -- clear screen (expensive; avoid)

The internal model is two 24x80 character arrays: curscr (what
the terminal actually shows) and newscr (what you want it to show).
refresh() diffs them and emits the minimal sequence of cursor moves
and character writes to make curscr match newscr.

Cost model: cursor movement is expensive.  Writing consecutive
characters in a row is cheap.  Design your update logic accordingly.

For games: the key insight is that most of the screen doesn't change
each turn.  Only the player position, nearby monsters, and status
line need redrawing.  If you're refreshing the whole 24x80 grid
every move, you're doing it wrong.

VT100 attribute notes:
  ESC[1m   -- bold
  ESC[7m   -- reverse video
  ESC[1;7m -- bold + reverse (unreliable on some firmware)
  ESC[0m   -- reset all attributes

The bold+reverse problem: ESC[1;7m should work per the spec.
Some VT100 firmware versions don't implement both simultaneously.
The workaround is to pick one.  Bold alone reads better on most
screens.  Reverse alone is better for the player indicator (@).
Combining them is unreliable; don't depend on it in production.

Rodney's terminal is one of the bad ones.  I've checked.
`,

    'termlib_notes': `\
Terminal capability abstraction
Ken Arnold

The problem with terminal-specific code: every terminal is different.
VT100, ADM-3A, Concept, Hazeltine -- each has its own escape sequences.
If you hard-code VT100 sequences, your program breaks on everything else.

The solution is an abstraction layer.  A database of terminal capabilities
keyed by terminal type (from $TERM).  The program asks "how do I move
the cursor to row 5, column 10 on this terminal" and the library
looks it up and emits the right sequence.

This is what termcap does.  This is what I built curses on top of.
The key insight: the program never emits escape sequences directly.
It calls library functions, and the library handles the translation.

Capability names I use constantly:
  cm -- cursor movement (parameterized: row and column)
  cl -- clear screen
  ce -- clear to end of line
  so/se -- standout on/off (reverse video)
  ti/te -- terminal init/exit (save/restore state)
  ks/ke -- keypad on/off

The parameterized capabilities (cm especially) are the tricky ones.
The format is not uniform across terminals.  Some use printf-style,
some use a stack-based mini-language.  Termcap strings have their
own little encoding.  I've spent time I will not recover on this.

The implication for portable software: use curses, not raw terminal
sequences.  If you write to /dev/tty directly you are writing
VT100-only code whether you know it or not.  Curses abstracts that.
It is not a perfect abstraction.  But it is much better than nothing.

Future direction I keep thinking about: a proper compiled terminal
database rather than the current text-based termcap.  Faster startup,
less parsing.  Someone should build it.
`,

    'vt100': `\
VT100 terminal reference notes
K. Arnold

Cursor movement sequences:
  ESC[A         cursor up 1
  ESC[B         cursor down 1
  ESC[C         cursor right 1
  ESC[D         cursor left 1
  ESC[{r};{c}H  cursor to row r, column c (1-indexed)
  ESC[H         cursor home (1,1)
  ESC[2J        clear screen

Character attributes:
  ESC[0m   reset
  ESC[1m   bold
  ESC[4m   underline
  ESC[5m   blink (don't use this; it's unreadable)
  ESC[7m   reverse

Erase sequences:
  ESC[K    erase to end of line
  ESC[2K   erase entire line
  ESC[J    erase to end of screen

Line mode vs. character mode:
  The default is line mode.  For games you want character mode
  (raw input, no echo).  Set with termios: cfmakeraw() or equivalent.
  Don't forget to restore on exit or the terminal stays broken.
  Use atexit() or a signal handler for cleanup.  People will thank you.
`,
  },

  // -----------------------------------------------------------------------
  // fenlason -- root only
  // -----------------------------------------------------------------------
  fenlason: {
    'distribution_notes': `\
How to distribute Hack
Jay Fenlason

Hack exists.  It works.  People outside this school are already
playing it -- Scott got it to Stanford, someone there posted about it,
and now I'm getting mail from people I've never heard of asking for
copies.

The question is how to handle this going forward.

Option 1: tape-by-mail.  Someone asks, I send a tape.
  Problem: doesn't scale.  I don't have time to make tapes for
  everyone who asks.  And the source gets out of date fast.

Option 2: post to USENET.  One post, everyone can get it.
  comp.sources.games or similar.  This seems right.
  The issue is that once it's out there it's out there.
  People will modify it.  That might be fine.  Probably fine.

What I actually want: people to use it, enjoy it, maybe fix bugs,
and tell me what they changed.  I don't want to be the gatekeeper
for every modification.  If Kenny wants to improve the level
generator for a fork, he should be able to.  I'd want to see
what he did and maybe pull it back in.

The thing I'm unsure about: what happens if someone takes it,
charges money for it, and doesn't share the changes?
I don't like that scenario.  It's not that I want the money --
I don't need money from this.  It's that the changes would be
lost.  The improvements wouldn't come back.

I don't know if there's a legal mechanism for requiring that.
There might not be.  Copyright law isn't written for this situation.
Someone at MIT is apparently thinking about this problem.
I read something he circulated.  Interesting ideas, not fully
baked yet.

For now: post to USENET with a note saying "share freely,
send me changes if you make any."  Honor system.  Probably good enough.
`,

    'hack_notes': `\
Hack development notes
Jay Fenlason

Outstanding issues as of 1.0.3:

Monster pathfinding:
  The grid bug.  It moves diagonally.  Every time I fix the
  pathfinding for normal monsters the grid bug breaks.  Starting
  to think it needs its own movement code.  The name "grid bug"
  was supposed to be a joke.  It is less funny now.

Balance:
  Gnolls are too strong for their depth.  Moved them to level 5.
  The dragon one-shot problem is fixed -- reduced breath damage.
  Some people complained this made dragons too easy.  They are
  welcome to take a dragon breath at full damage.

The shopkeeper code:
  Three separate people have reported that shopkeepers sometimes
  charge the wrong amount after haggling.  I reproduced it once.
  The bug is in the price recalculation after the first counteroffer.
  Not yet fixed.  1.1 list.

The Amulet:
  Rodney keeps asking for the pickup-while-blind crash to be
  documented as a feature.  It is not a feature.  It is fixed.

1.1 plans:
  - Wishing mechanic (from the mailing list, will probably regret this)
  - More item types -- currently too thin above level 15
  - Pets (Michael's idea, I remain skeptical)
  - Fix the shopkeeper price bug already

Note on the source tree:
  The hack_harness.c file that Brouwer added is useful but his
  indentation is inconsistent with the rest of the source.
  Mentioned this.  He said he'd fix it.  He did not fix it.
  Fixing it myself breaks the diff history.  Leaving it.
`,
  },

  // -----------------------------------------------------------------------
  // lebling -- root only
  // -----------------------------------------------------------------------
  lebling: {
    'parser_design': `\
Parser design for interactive fiction
Dave Lebling

The core problem: the player types English, the parser must act on it.
English is ambiguous.  "GET SWORD" -- which sword?  "ATTACK TROLL" --
with what?  The parser needs resolution strategies.

Our approach in Zork:
1. Use the object in scope that makes most sense.  "GET SWORD" picks
   the nearest, most recently mentioned sword.  This is usually right.
2. Ask for clarification only when the ambiguity matters.
   "Which sword -- the rusty one or the elvish one?" as a fallback.
3. Pronouns.  "GET IT" after "I see a lamp" should mean the lamp.
   We track the last referenced noun.  This works often enough.

The verb vocabulary problem: players try everything.
PUSH, PULL, TURN, SPIN, ROTATE, TWIST -- these might all mean the
same thing, or they might not.  The parser has to decide.
Our solution: synonyms keyed to canonical verbs.  TWIST = TURN.
YANK = PULL.  You can't cover everything, but you can cover the common
case and give reasonable error messages for the rest.

The error message is part of the design.  "You can't do that" is
bad.  "The troll is unimpressed by your attempt to talk to him" is
better.  The game world is communicating even when it refuses.

The thing I'd do differently: more first-person narration.
"You are in a twisting passage" is fine.  "The air here smells of
water from somewhere ahead" is better.  The second kind of writing
builds a world.  We didn't write enough of it in Zork I.
Zork II is better.  The Wizard of Frobozz is a character, not
just an obstacle.  I think we learned something there.
`,

    'narrative_notes': `\
Design notes -- interactive fiction
Dave Lebling, Infocom

The parser is not the game.  This took us a while to understand.
Players talk about the parser because it's the interface -- it's
what they interact with directly.  But the game is the world behind
it.  A perfect parser with a dull world is a dull game.  An
imperfect parser with a compelling world is Zork.

The principle of noun-consistency:
  If you describe something, it must be takeable, moveable, or
  examinable.  Describing an object and then refusing to interact
  with it is a breach of contract with the player.  We violated
  this in early Zork.  We tried to fix most of it.

What the dungeon games don't have:
  - A reason to care about the specific sword.  Any sword.
  - A sense that the world existed before you entered it.
  - The thief.  Wait -- they don't have a thief.
    The thief is the best character in Zork.
    You hate him.  You need him.  He makes the world feel inhabited.

The trolls are boring.  The thief is interesting.  The difference:
the thief has a relationship with you.  He wants things.  He acts.

On scope:
  The temptation is always to add more.  More rooms, more objects,
  more puzzles.  But the game isn't better when it's bigger.
  It's better when every room earns its place.  The cellar in
  Zork I earns its place.  Fifty percent of what we cut from
  early drafts deserved to be cut.

The troll room is there because walking north from the forest
should be dangerous.  Simple.  We spent three weeks on the
troll room.  Most of that time was writing, not code.

I should write this up properly sometime.
`,
  },

  // -----------------------------------------------------------------------
  // blank -- root only
  // -----------------------------------------------------------------------
  blank: {
    'zmachine_notes': `\
Z-machine architecture notes
Marc Blank

Why the Z-machine?

When we wrote Zork at MIT we ran it on the DEC-20.  60KB of memory
for the game state, running on a machine with real horsepower.
Porting it to microcomputers meant rewriting it from scratch.  A
TRS-80 or Apple II has 48-64KB total.  The DEC-20 binary was larger
than the entire address space.

The Z-machine solves this by compiling to a bytecode that is
interpreted at runtime.  The game is not native machine code;
it is data.  The interpreter is a small native program.
The game file can be as large as the virtual address space of
the Z-machine, which we define to be large enough.

Design goals:
1. Small interpreter footprint (under 16KB).  The game file gets
   the rest of memory.
2. Fast bytecode execution.  The game must be responsive.
3. Portable.  One interpreter per platform, all game files work.
4. Self-describing.  The game file knows what version it is.

Version 1 targeted 8-bit micros: TRS-80, Apple II, CP/M machines.
Version 3 added extended memory, sound, and status lines.
The versioning is deliberate: we can improve the format without
breaking old interpreters.

The text compression is the part I'm proudest of.  English text
at 5 characters per word averages to about 2 bytes per word with
our encoding.  The game file for Zork I is under 100KB.
Without compression it would be 200KB.  That is the difference
between fitting on a single floppy and not.

What I would build next: streaming from disk.  Right now the
whole game fits in RAM.  If it didn't we could support much
larger games.  The interpreter would need a cache.  Doable.
`,

    'product_notes': `\
Product planning notes -- Infocom
Marc Blank

Zork I shipped.  Numbers are good.  Better than expected on the
Apple II.  The microcomputer market is real and growing fast.

The Z-machine was the right call.  One codebase, multiple platforms.
The TRS-80 port took two weeks.  The CP/M port took four.  If we'd
done native code per platform we'd still be porting Zork I.

Outstanding questions:

  Zork II scope.  Dave wants to add more parser verbs.  I want
  to ship.  We are negotiating.  I expect to lose.

  Licensing the Z-machine to other developers.  Discussed.
  Decided against.  Quality control wins: we can't let someone
  ship a bad Z-machine game and have it reflect on us.  Maybe later.

  Pricing.  $24.95 for a game on a floppy.  Some people say it's
  high.  But the manual and packaging cost money.  And the game
  is good.  Hold the price.

Note on the dungeon community:
  Rogue and Hack are free and the dungeon crawlers are watching us.
  A few have written.  I think we coexist fine.  The audiences
  overlap but aren't identical.  Someone who finishes Zork wants
  a story to finish.  Someone who plays Rogue wants a run to matter.
  We're not the same thing.

Personal note:
  The first time I got the platinum bar out of the pile of leaves
  in the Zork living room, I was testing, not playing.  I still
  felt something.  If we can reliably produce that, we're doing
  something right.
`,
  },

  // -----------------------------------------------------------------------
  // walz -- root only
  // -----------------------------------------------------------------------
  walz: {
    'syslog': `\
System log -- Janet Walz, sysadmin
PDP-11/70 (pdp11)

Recent incidents:

2026-02-14:
  Disk quota exceeded by rodney (again).  The core file from the
  nethack crash on the 11th is still there.  Sent mail.  No response.
  Moved the core file to /tmp with a 7-day timer.  If he hasn't
  copied it by then, it's gone.

2026-02-20:
  Unexplained process spike at 03:14.  Unknown PID running as
  gridbug (uid 404).  Process disappeared before I could trace it.
  Not in the process table by 03:15.  The log shows it existed.
  I don't know what it was.  Watching.

2026-02-28:
  The nethack game process is holding a lock on
  /usr/games/lib/nethackdir/save/ that it shouldn't be holding
  when no game is active.  Brouwer's bug.  Mailed him.

2026-03-01:
  Changed the root password.  The old one was embarrassing.
  The new one is at least thematic.  No, I am not writing it
  down here.  (Typed in a terminal.  You would recognize it
  if you know your Crowther.)

2026-03-10:
  Still no response from rodney about the core file.  Deleted it.
  He will be fine.

2026-03-12:
  Izchak's terminal display corruption appears to be a software
  issue, not hardware.  His inventory screen is running a refresh
  loop with no dirty-checking.  Mailed Arnold.  This is a curses
  problem, not a system problem.  Removing from my queue.
`,

    'item_design_notes': `\
Magical item system notes
J. Walz
(notes from discussions with rodney and fenlason)

The item design problem is fundamentally a combinatorics problem.
Every item interacts with every other item.  Add N items and you
get O(N^2) interactions to specify.  Most of them are "nothing
happens" but some have to be interesting.

My framework for thinking about it:

Layer 1: Base identity.  What the item is.
  potion of healing, scroll of enchant weapon, wand of striking, etc.

Layer 2: Blessed/uncursed/cursed status.  Modifier on the base.
  This multiplies the interaction space by 3 but the rule is
  consistent: blessed = enhanced, cursed = inverted or harmful.
  Consistent rules are better than case-by-case exceptions.

Layer 3: Combination effects.  When items interact.
  This is where it gets expensive.  Mixing two potions requires
  specifying behavior for O(n^2) pairs.  Most are "muddy potion."
  The interesting pairs should be discoverable but not obvious.

The mixing table I've been drafting:
  healing + healing         = extra healing (trivial, just double)
  healing + gain level      = full HP restore + temp level buff
  confusion + paralysis     = sleep (new state, different from both)
  confusion + confusion     = extra confusion (duration only)
  levitation + speed        = interesting -- fast floating?
  water + blessed anything  = diluted version (weaker but safe)
  see invisible + blind     = very interesting: see while blind?
  gain level + gain ability = probably too powerful, reconsider

The "see while blind" case is the one I'm most interested in.
Thematically it's right: magical sight that doesn't use your eyes.
Mechanically it would need a new vision flag.  Not hard to add.

Potion color/appearance names for new mixed results:
  swirling: mix in progress (intermediate state, unstable)
  steaming: exothermic reaction (dangerous to hold too long)
  crystalline: clearly positive result (reward for good mixing)
  muddy: failed mix (the common case)

The implementation I'd suggest: add potion_mix[][] table to an
include file.  Keep it separate from the main item code so it
can be edited independently.  Fenlason concurs.
`,

    'ir_notes': `\
Information retrieval notes
J. Walz

Working on query attribute grammars as a structured retrieval model.
The idea: treat a query not as a flat bag of terms but as a grammar
over attribute-value pairs with explicit scope and logical operators.

Standard boolean IR:
  Q = t1 AND t2 AND NOT t3
  Simple, but loses relevance ranking.  All matching docs are equal.

Vector space model (Salton):
  Documents and queries as term vectors.  Cosine similarity.
  Better ranking but loses boolean structure.  You can't say
  "title contains X but body does not contain Y."

Query attribute grammar approach:
  Q := (field:term, weight) | Q AND Q | Q OR Q | NOT Q | phrase(Q*)
  Evaluation: structured retrieval with attribute-scoped scoring.
  Field attributes (title, body, anchor, date) modify term weight.
  Grammar rules let you compose complex queries from atomic parts.

Open questions:
  - How to weight AND vs. proximity vs. co-occurrence?
  - Attribute inheritance: does title:algorithm subsume body:algorithm?
  - Negative weights: NOT should reduce score, not hard-exclude.
    The standard implementation (filter, not weight) is too aggressive.

TREC relevance judgments are useful for calibration.  The TREC 6
ad-hoc task has good coverage.  Topic set is representative.
Key finding so far: structured queries outperform flat term queries
on head queries (high frequency); tail queries benefit less.
The structure helps when you can express what you mean;
for ambiguous topics, more noise either way.

Note: most TREC participants are running on hardware that makes
this PDP-11 look ancient.  We are not competitive on throughput.
This is about the model, not the speed.
`,
  },

  // -----------------------------------------------------------------------
  // brouwer -- root only
  // -----------------------------------------------------------------------
  brouwer: {
    'srg_notes': `\
Strongly regular graphs and partial geometries
A.E. Brouwer
(working notes)

A graph is strongly regular srg(v,k,lambda,mu) if it is regular of
valency k, every adjacent pair of vertices has exactly lambda common
neighbors, and every non-adjacent pair has exactly mu.

Partial geometries (Bose 1963):
  A partial geometry pg(s,t,alpha) is an incidence structure of points
  and lines such that:
    - each line has s+1 points
    - each point lies on t+1 lines
    - any two points lie on at most one line
    - given a point P not on line L, exactly alpha lines through P
      meet L (the "Bose parameter")

  pg(s,t,alpha) gives rise to srg((s+1)(st+1)/alpha,
    s(t+1), s-1+t(alpha-1), alpha(alpha+1))
  when the parameters are feasible.

  Special cases:
    alpha = 1:  generalized quadrangle GQ(s,t)
    alpha = t+1: Steiner system (complete)
    alpha = s:   dual Steiner (also complete)
    alpha = t:   partial Steiner

Generalized quadrangles GQ(s,t):
  A GQ(s,t) is a partial geometry with alpha=1.
  (s+1)(st+1) points, (t+1)(st+1) lines.

  Known existence:
    GQ(q,q) for q prime power -- the symplectic GQ W(q)
    GQ(q,q^2) and GQ(q^2,q) for q prime power -- classical
    GQ(q-1, q+1) for q prime power -- from grids
    GQ(3,5): 64 points, 96 lines.  This one is interesting.
      Payne (1971): GQ(3,5) exists -- constructed via a "flock"
      of a quadratic cone in PG(3,3).  Unique? Open question.
    GQ(3,6): does NOT exist.
      Proof sketch: the Krein condition k(k-f_1-1) <= f_2(f_1+1)^2
      fails for the eigenvalues of the associated srg.  Also the
      point graph would be srg(112, 27, 2, 9) and Fisher's inequality
      gives a contradiction.  Checked the arithmetic twice.

Current classification effort:
  Classifying pg(s,t,alpha) for small s,t.  The main obstruction
  is the Krein conditions (absolute bound on eigenvalue multiplicities)
  and the integrality of multiplicities.  These eliminate most
  feasible parameter sets.  What remains is a mix of known examples
  and open existence questions.

  For diameter 3 distance-regular graphs: about 30 feasible
  intersection arrays remain where existence is unknown.
  Slow progress.  The tools are good but the cases are hard.
`,

    'hack_cleanup': `\
Hack source tree notes
A.E. Brouwer

Things to clean up before 3.0:

1. hack_harness.c indentation.
   I know.  It's 4-space in some functions and tab in others.
   The original code was tab; I wrote the harness sections in 4-space.
   Fenlason has mentioned this.  He is right to mention it.
   Deferring until after the level topology work is done.

2. mklev.c -- the room connectivity check.
   The disconnected-southeast-rooms bug I described to Rodney:
   it happens when the random room placement puts all southeast
   rooms in a single connected component that the corridor generator
   doesn't reach.  Fix: run a BFS after corridor generation and
   force-add corridors to any disconnected component.
   I have the patch.  Testing on seeds 200-300 now.

3. The level 26 layout.
   The south-wing-to-central-maze corridor is not always generated.
   This is the disconnection I asked Rodney about.
   Rodney says "intentional isolated subregion."
   I say "1 in 8 seeds producing an unreachable section is a bug,
   not a feature."  The graph theory is on my side.
   He has not responded to the last two mails.

4. The lock on /usr/games/lib/nethackdir/save/
   Walz has noticed.  The lock is held by the level-loading code
   when it reads bones files.  It should be dropped after reading.
   It isn't.  Fix is two lines.  Will commit this week.

Note: Rodney's dungeon topology question (level 26) is actually
related to the partial geometry work.  Whether the room graph is
connected is a graph connectivity question.  The level generator
is not trying to produce a regular structure but it has implicit
parameters (room count, corridor density) that map loosely to
the pg(s,t,alpha) framework.  Not sure this leads anywhere useful.
Wrote it down anyway.
`,
  },

  // -----------------------------------------------------------------------
  // harvey -- root only
  // -----------------------------------------------------------------------
  harvey: {
    'logo_notes': `\
Notes on Logo and programming education
Brian Harvey

The goto problem.
Dijkstra wrote the famous letter in 1968.  By 1982 we mostly accept
that structured programming is right, but the wrong lesson got
taught.  The wrong lesson is "goto is bad."  The right lesson is
"readability matters more than cleverness."

Logo is not about turtle graphics.  That's the demo, not the point.
The point is that a ten-year-old can build a procedure, call it by
name, and understand what recursion means before they know what the
word means.  When the turtle draws a spiral, the kid sees the
structure.  The abstraction is visible.

What Logo teaches that BASIC does not:
  - Procedures have names and parameters
  - Recursion is natural, not a trick
  - Data and programs have the same structure (matters more later)
  - The computer does exactly what you tell it, no more

The last point is the most important.  Bugs are not mysterious.
They are wrong instructions.  Once a student understands that the
computer is not misunderstanding them -- that it is doing exactly
what they said -- something unlocks.

On the spiral:
  The spiral first.  Not "here is a loop, now make a square."
  The spiral because it's beautiful, and because you can't do it
  in BASIC in ten lines without already knowing what you're doing.
  Give them something worth making.

On Scheme:
  Logo is Lisp with English syntax.  Scheme is the cleaner
  underlying language.  For older students, Scheme is better.
  For middle school, Logo.  The turtle is not a crutch; it's a bridge.

The key difference from BASIC: Logo has no line numbers.
This is not an accident.  Seymour Papert thought about this.
`,

    'scheme_notes': `\
Why Scheme
Brian Harvey

Scheme is Lisp with a cleaned-up syntax and proper tail calls.
For teaching it has advantages over Logo and advantages over BASIC.

Over Logo:
  - No turtle required.  You can introduce Scheme without any
    graphics.  The abstractions stand on their own.
  - The evaluation model is explicit.  (+ 1 2) evaluates to 3.
    The parens are the syntax for function application.
    Students see this and can generalize it.
  - Closures.  Logo has procedures; Scheme has first-class functions
    that close over their environment.  This is important later.

Over BASIC:
  - No line numbers.  I keep saying this.  It matters.
  - Recursion instead of iteration as the primary abstraction.
    Iteration is a special case.  When you start with recursion
    you understand why loops exist.
  - Data and programs have the same syntax.  A list of numbers
    and a program expression are both lists.  Students who
    internalize this can reason about code as data.
    This is where metaprogramming and macros come from.
    This is where Lisp's strange power comes from.

The argument against Scheme for introductory CS:
"Employers want FORTRAN/COBOL/Pascal, not Lisp."
True.  Also true that employers want workers who can learn.
Teaching the right ideas in the wrong language is better
than teaching the wrong ideas in the right language.

I'm planning a curriculum sequence: Logo in middle school
(concrete, turtle graphics, fun), Scheme in high school
(abstract, formal, powerful).  The two connect -- Logo is
Lisp with English syntax.  The transition should be natural.

Draft outline for a Scheme textbook exists.  Three chapters done.
Working title: "Simply Scheme."  Needs a better title.
`,

    'cs_ed': `\
What we are actually teaching
Brian Harvey

Computer Science education in 1982 mostly teaches:
  - BASIC syntax
  - How to write a FOR loop
  - How to GOSUB
  - How to PEEK and POKE memory (hardware-specific, perishable)

What it should teach:
  - How to decompose a problem
  - How to name things well
  - How to test whether something works
  - How to read someone else's code
  - That programs have structure, and structure matters

The irony is that BASIC was designed to be easy to learn and
ends up teaching habits that have to be unlearned in any real
programming context.  LINE NUMBERS.  We are teaching students
to think in line numbers.

Logo does not have line numbers.  This is not an accident.

Draft abstract for the SIGCSE paper:
  We compare student outcomes in introductory CS courses using Logo
  versus BASIC as the initial language.  Students taught in Logo
  show significantly better performance on tasks involving procedural
  decomposition and recursion in subsequent courses.  We argue that
  the initial language shapes conceptual models in ways that persist
  and that this effect is underestimated in current curriculum design.

  Preliminary data from Berkeley suggests 40% improvement on
  recursion tasks in the following semester.  Sample size is
  small; replication needed.

Note from the last department meeting:
  Three colleagues asked why we would teach a language that students
  will never use professionally.  My answer: we teach Latin, and
  students don't use Latin professionally.  The point is to learn
  to think, not to learn the specific syntax.  The syntax is easy.
  The thinking is hard.  Teach the hard part.
`,
  },

  // -----------------------------------------------------------------------
  // stephenson -- root only
  // -----------------------------------------------------------------------
  stephenson: {
    'devteam_notes': `\
NetHack DevTeam notes
Mike Stephenson

The DevTeam is not a company.  It is a group of people who care
about the game and keep showing up.  This is both the best and the
most complicated thing about it.

Decisions get made by rough consensus.  We try to stay small enough
that rough consensus is achievable.  When it isn't, things move slowly.
This is probably the right tradeoff.

Release policy:
  We release when it's ready.  This is not a joke.  It is genuinely
  the policy.  "Ready" means all the blocking bugs are fixed and
  nobody has a strong objection.  It does not mean perfect.
  NetHack has never been perfect and it is not going to start now.

On the Izchak shopkeeper:
  Izchak Miller was my friend.  He died in 1994.  He loved the game.
  Adding him as the shopkeeper felt right -- someone who knew the
  value of things and dealt with you straight.
  Every time someone meets Izchak in the dungeon, I think he would
  have laughed.  He had that kind of sense of humor.

The complexity question:
  NetHack is large because we kept adding things.  Every version
  adds interactions.  The cockatrice is a good example: the corpse
  petrifies, the eggs petrify, the corpse as a weapon petrifies,
  getting hit by a giant holding one petrifies, laying eggs as a
  female cockatrice and throwing them petrifies.  Each of these
  was added at a different time by a different person.

  The game remembers all of it.  This is a feature.  It is also
  why porting NetHack is hard.

Current blocking bugs (internal list, not public):
  - The lock issue on the save directory (Brouwer is on it)
  - Polymorphed shopkeeper pricing (Fenlason's old bug, still open)
  - The soldier ant spawning rate on levels 12-14 (too high)
`,
  },

  // -----------------------------------------------------------------------
  // wichman -- world-readable
  // -----------------------------------------------------------------------
  wichman: {
    'rogue_rooms': `\
Room generator notes
Glenn Wichman, UC Santa Cruz, 1980

The first thing you need for a dungeon game is rooms.

My approach: divide the map into a grid of regions (3x3 worked
well for a 24x80 terminal), place one room randomly within each
region, then connect adjacent rooms with corridors.  Simple, and
it produces something that looks like a dungeon level.

Key insight: constrain each room to its region and you guarantee
connectivity -- every room has at least one potential neighbor.
The corridor generator just has to connect them.  Add dead ends
and extra corridors for flavor.

Room size is uniformly random within bounds: roughly 4-10 wide
by 4-8 tall.  Smaller feels cramped; bigger wastes space.

Dark rooms (where you can only see adjacent squares) make the
dungeon feel larger.  Ken added this.  It was a good call.

Things I would do differently:
  - Weight the region grid so corridors cluster toward the center.
    The current layout can produce hallway levels where everything
    is a long chain.  Not bad, but repetitive over many games.
  - Vary corridor shape.  Straight corridors are mechanical.
    L-shaped corridors take two more lines of code (Ken confirmed)
    and make the level feel more organic.

The room generator is the part of Rogue I'm proudest of.
Most players never think about it.  That means it's working.
`,

    'game_design_future': `\
Thoughts on game design going forward
Glenn Wichman

What would I do differently in a sequel to Rogue?

1. More varied level types.
   Every level in Rogue is the same kind: rooms and corridors.
   You could have levels that are mostly open, or mostly maze,
   or flooded (you can only move through water), or ruined
   (walls don't form complete rooms).  The current generator
   can't do this -- it's designed for one level type only.
   A generation pipeline with pluggable level templates would
   be better architecture.

2. Factions.
   Monsters don't care about each other.  A dragon and a kobold
   in the same corridor ignore each other until you show up.
   If monsters had affiliations -- some hostile to others --
   you could use that.  Lead a dragon toward the kobolds.
   Use the monster-on-monster damage.  More tactical options.

3. The time axis.
   Everything in Rogue is turn-based, which is right.
   But what if the dungeon had events that happened on a timer?
   "The ghost of a previous adventurer appears on turn 100."
   "The orcs from level 3 patrol this level every 50 turns."
   This would make the dungeon feel like a place with history.

4. Why I won't do it.
   Graphics.  The future of games is graphics.
   What I just described above can be done with text characters
   on a 24x80 terminal.  It's powerful.  But the market is moving
   toward bitmap displays and I'm interested in graphics research.
   If I'm working on games they'll be graphical.

Hack already does some of this better than Rogue.  Jay's team
is doing good work.  The text-mode dungeon game will keep
evolving without me.  That seems fine.
`,

    'grad_notes': `\
Grad school notes
G. Wichman

Things I'm supposed to be doing instead of working on Rogue:
  - Finishing the graphics pipeline paper
  - Reading the Foley & Van Dam chapters I've been putting off
  - Responding to the advisor about the thesis proposal

Things I'm actually doing:
  - Working on Rogue
  - Arguing with Ken about the random number generator
  - Playtesting levels 1-5 (research purposes)

The advisor has not asked why my commits are all between 11pm
and 3am.  This is good.
`,
  },

  // -----------------------------------------------------------------------
  // woodland -- world-readable  (Kenny Woodland, LS class, maze code)
  // -----------------------------------------------------------------------
  woodland: {
    'maze_notes': `\
Dungeon level generator notes
Kenny Woodland, Hack project

The basic idea from Wichman's Rogue room generator is good.
Divide the map into regions, place a room in each, connect them.
The problem: Rogue's rooms feel the same after a while because
the region grid is fixed 3x3 and corridors always go between
adjacent regions.

For Hack I wanted more variety.  Changes I made:

1. Variable room count.  Not every level needs nine rooms.
   Pick 4-8 rooms, place them in randomly chosen regions.
   Empty regions become dead-end corridors or no corridor at all.

2. Irregular room sizes.  Rogue keeps rooms squarish.
   Hack allows long thin rooms -- 3x10, say.  More dungeon-y.

3. Dark rooms.  Hack inherited this from Rogue (Ken's idea).
   I kept it.  The tension of stepping into a dark room is real.

4. Maze generation for corridors.  Instead of straight corridors
   between room centers, I run a simple recursive backtracker
   on the corridor space.  This creates the bent, branching
   hallways that make each level feel different.

The recursive backtracker: start at a room exit, move in a random
direction, if the cell is unvisited mark it and recurse.  If stuck,
backtrack.  Result: a spanning tree of corridors with no loops.
Then randomly punch through a few walls to add loops.  Jay wanted
loops.  I agreed.  Loops let you run from monsters.

The hardest part was making the room exits line up with corridors.
Rooms are placed before corridors, but corridors have to connect
to room walls at valid positions.  Off-by-one errors everywhere.
I think I've got them all.  Jay found two more last week.
`,

    'hack_contrib': `\
Hack contributions log
K. Woodland

Things I added or changed:

- Level generator (see maze_notes).  This is the main thing.
  Jay wrote the original game engine; I wrote the map.

- Room darkness.  On levels below 7 or so, most rooms are dark.
  You have to carry a lamp or accept that you can't see.
  The algorithm: if dlevel > 6, 60% chance of dark.  Simple.

- Corridor monsters.  Monsters in corridors behave differently
  than in rooms -- they can't flee to a corner, so they fight
  longer.  Added a corridor flag to the level struct.

Bug I introduced and fixed:
  The maze generator occasionally produced a 1-wide loop that
  looked like a room from the outside but was actually a corridor.
  Placing a monster in there would put it in a wall.  Fixed by
  checking corridor cells before monster placement.

Bug I introduced and have not yet fixed:
  Under some seeds, the southeast corner of level 12 generates
  an unreachable room.  The corridor generator doesn't reach it.
  Jay and Brouwer have both noticed.  Working on it.
`,
  },

  // -----------------------------------------------------------------------
  // thome -- world-readable  (Mike Thome, LS class, monster ideas)
  // -----------------------------------------------------------------------
  thome: {
    'monster_ideas': `\
Monster ideas for Hack
Mike Thome

Running list.  Some implemented, most not.

CHAMELEON (implemented, Hack 1.0):
  Changes appearance to look like whatever is in the adjacent square.
  If next to a sword, it looks like a sword.  If next to a monster,
  it looks like that monster.  Implementation: on each move, check
  adjacent cells and copy the glyph of the first non-empty one.
  The player sees what looks like a normal item, steps on it, gets
  attacked.  Very satisfying.  Jay says it's his favorite addition.
  The name is obviously right.

  Problem: if the chameleon is in an empty corridor it has nothing
  to copy, so it just shows as 'C'.  This might be fine.
  Jay wants it to show as a random item in that case.  Maybe.

MIMIC (not yet):
  Like a chameleon but specifically mimics items, not monsters.
  Sits still.  Only attacks when you try to pick it up.
  Would need a 'sitting' flag and different movement code.
  Harder to implement but the encounter would be great.

NYMPH (not yet):
  Steals items.  Doesn't kill you, just takes things.
  Losing your lamp to a nymph is worse than dying some days.
  Would need an inventory for monsters.  Big change.

MIND FLAYER (someday):
  Reduces intelligence.  We don't track intelligence yet.
  Too much to add right now.  Post-1.0 list.

WERE-* ANYTHING:
  Werewolf, werebear, wererat.  Player can be infected.
  Transforms on new moon (track turn count, not real time).
  Jay said "maybe later."  I think it would be fun.
`,

    'game_notes': `\
Game balance notes
M. Thome

Things that are too hard:
  - Level 1 has too many monsters in small rooms.
    A kobold in a 4x4 room with no exits is an instant kill at start.
    Should space monsters out more.
  - Gnolls still too high for their depth even after Jay moved them.
    They hit harder than the listed damage says.  Check the formula.

Things that are too easy:
  - Scrolls of identify make the early game too safe.
    If you find one early, you can ID your whole pack.
    Maybe limit to one item per scroll?  Jay won't change this.
  - Bolt spells go through rooms without damaging walls.
    Wands of fire should be scarier.

Things that are just right:
  - The hunger mechanic.  Forces you to keep moving.
  - Permadeath.  Still the right call.
  - The shopkeeper.  Izchak (or whoever) just feels right there.
    Standing in one spot, knowing everything has a price.

Random observation:
  The best games are the ones where you die to something you should
  have seen coming.  The worst deaths are to random number disasters.
  We can't eliminate randomness but we can make the player feel like
  they had a chance.  Chameleons give you a chance -- just look
  carefully.  The corridor ambush doesn't.  Thinking about how to
  fix the corridor ambush without making corridors boring.
`,
  },

  // -----------------------------------------------------------------------
  // payne -- world-readable  (Jonathan Payne, LS class, JOVE editor)
  // -----------------------------------------------------------------------
  payne: {
    'jove_notes': `\
JOVE design notes
Jonathan Payne
Jonathan's Own Version of Emacs

Why write another editor?

EMACS is big.  On this PDP-11 it barely fits alongside a live
game session.  JOVE is EMACS for people who don't have a VAX.
The goal: the key bindings people know, the buffer model people
know, in a fraction of the memory.

Key decisions:

1. No Lisp interpreter.
   EMACS is extensible because it's built on Lisp.  This is also
   why it's 300K on disk.  JOVE is not extensible.  It does what
   it does and nothing else.  If you want to extend it, send me
   a patch.  I may or may not apply it.

2. Gap buffer.
   The text is stored as an array with a gap at the cursor position.
   Insertion is O(1).  Deletion is O(1).  Moving the cursor moves
   the gap, which is O(distance).  This is the right data structure
   for an editor.  EMACS uses it too.  I'm not inventing it, just
   using it.

3. Key bindings as close to EMACS as possible.
   C-n, C-p, C-f, C-b for movement.  C-d to delete forward.
   C-k to kill the line.  M-f, M-b for word movement.
   People who know EMACS can use JOVE immediately.
   People who don't know EMACS... have to learn a bit.

4. Multiple buffers, one window.
   Window splitting is not implemented.  PDP-11, remember.
   Switch buffers with C-x C-b.  It's fine.

Status: usable.  I'm writing this file in JOVE.  That's the test.
`,

    'jove_distribution': `\
Notes on releasing JOVE
Jonathan Payne

JOVE works.  I use it daily.  The question is what to do with it.

Options:
1. Keep it for myself.  No maintenance burden.  Nobody else's
   bugs to fix.  This is the comfortable choice.
2. Give it to the school -- install it as the default editor
   for everyone.  More testing.  Some bug reports.
3. Release it publicly on USENET or the net.

I keep coming back to option 3.  The reason: every serious
programmer I know uses either vi or emacs.  Vi is small but
its editing model requires learning a different language
(normal mode, insert mode, command mode).  Emacs is powerful
but enormous.  JOVE is the thing in the middle.

The question is whether the middle is a real market or just
the thing I think I want because I built it.

The key limitation: JOVE is not extensible.  Emacs gets its
power from the Lisp layer.  If you want something JOVE doesn't
do, you're stuck.  If you want something Emacs doesn't do,
you write a function.  I cut the Lisp layer to keep it small.
This was the right call for this machine.  It might not scale.

Longer-term question I can't stop thinking about:
What if the editor was also a platform for other things?
Not just editing text -- but coordinating with tools, managing
state, interacting with running processes.  Emacs already
does some of this (M-x compile, M-x gdb).  The editor as
an environment, not just a text buffer.

That's a different kind of software.  Probably not for now.
`,

    'hack_ideas': `\
Hack ideas
J. Payne

I've been playing Hack since Kenny and Jay set up the shared copy.
Some thoughts.

Features I want:
  - A command to look at adjacent squares without moving.
    Right now you have to walk into something to find out what it is.
    Add: 'l' to look, then direction.  Display item/monster info.
    Would require an info routine that doesn't trigger combat.

  - Search command for secret doors.
    's' to search adjacent walls.  Probability based on level.
    I keep walking past secret doors because there's no way to
    systematically check.

  - Named objects.
    Let me name my sword.  "Griefmaker."  Whatever.
    Store a name field on the item struct.  Not hard.
    Jay says: "Then everyone wants named pets.  It cascades."
    Fair point.  Still want it.

Features I don't want but other people keep asking for:
  - Saves that survive death.  No.  Permadeath is the game.
  - A map of visited areas.  No.  The tension requires not knowing.
  - Tutorials.  Definitely no.  Learning by dying is the point.

Note: I think the chameleon is the best new monster.  Thome's
idea was good.  The moment of recognition -- "that sword has been
following me" -- is exactly right.  The game should have more of
those moments.
`,
  },

  // -----------------------------------------------------------------------
  // kelly -- world-readable  (Kelly Fenlason, LS class, club secretary)
  // diary is owner-private (restricted)
  // -----------------------------------------------------------------------
  kelly: {
    'club_notes': `\
Lincoln-Sudbury Computer Club
Meeting notes, fall 1982

Meeting 1 (Sept):
  Present: Jay, Kenny, Mike T, Jonathan, Josh, Mark, Scott, Mike A,
           Robert, Kevin, Dave, Mike X, and myself.
  Business: who gets root.  Decided: Jay, Jonathan, and Josh get
  superuser accounts for now.  Others request through them.
  Harvey agreed to this arrangement.  He looked slightly worried
  but didn't say no.

  New machine is fully up.  PDP-11/70, Unix V7, 67MB total.
  Walz did the install.  We have 200 account slots.
  Nobody is using most of them, which means we have room.

Meeting 2 (Oct):
  Present: Most of the above minus Mark (absent).
  Business: the Stanford connection.
  Scott got the acoustic coupler working at 300 baud.
  You connect the handset to it and dial Stanford directly.
  Once you're in you can read USENET and use the ARPA gateways.
  The lag is bad but it works.  Scott is very proud.
  Meeting devolved into everyone wanting to try the modem.

Meeting 3 (Nov):
  Present: everyone plus two freshmen who heard about the club.
  Business: the terminal thing.
  Someone (not saying who) modified the login message on one of
  the computer lab terminals to say something inappropriate.
  Harvey was not amused.  He knows who it was.  It's on their record.
  We agreed this is not what the room key is for.

Meeting 4 (Dec):
  Business: Hack 1.0 is done.
  Jay announced it at the meeting.  He distributed copies on tape.
  Kenny's level generator is in.  Mike's chameleon is in.
  Jonathan's look command is not in but he says 1.1.
  Josh asked about network play.  Jay said "no."
  Dave asked if we could ship it commercially.  Jay said "no."
  Good meeting.
`,

    'diary': `\
private

Being Jay's sister in the computer club is a specific thing.

Everyone knows I got in because of him.  I know this isn't true --
I was using the PDP before he showed me the club existed, and I
wrote the meeting notes for four months before anyone noticed they
were better than the previous ones -- but that's how it reads
from the outside, and I don't know how to change that without
making a thing of it, which would make it worse.

The machine is good though.  I can get on at 6am before anyone
else is there and it's just me and the disk drive sounds.
I've been working through the C manual.  Not for anything specific.
Just because the systems people treat you differently once you
can read the source.

The guys are fine.  Mostly they ignore me, which is better than
the alternative.  Jonathan talks to me like a person.
Kenny explains things twice sometimes, once fast and once slow,
as if he's not sure which one I needed.  I needed the first one.

Harvey said I should consider his Berkeley program when I apply.
I don't know if he says that to everyone or if he means it.
He probably says it to everyone.

I'm going to keep writing the meeting notes.
Nobody else is going to do it.
`,
  },

  // -----------------------------------------------------------------------
  // jsirota -- world-readable (Josh Sirota, LS class, systems / networking)
  // racing_notes is owner-private
  // -----------------------------------------------------------------------
  jsirota: {
    'systems_notes': `\
Distributed systems questions
Josh Sirota

Things I keep thinking about on the walk home:

1. If two processes on two different machines both modify the same
   shared file, what happens?  Unix doesn't know.  NFS helps but
   NFS is new and doesn't run on the PDP-11.  The locking is advisory.
   Advisory locking means "please don't stomp on me."  It doesn't
   mean "you cannot stomp on me."  This seems wrong.

2. Why does every computer have its own file system?
   We have the PDP-11.  The Stanford machine is across the country.
   The files I want are wherever I left them last.  Moving files is
   manual.  Tape or modem.  It should not be this way.

3. Routing.  The ARPA network routes packets, not connections.
   If a node goes down the packets find another path.
   The phone network doesn't work like this.  You get one path.
   If it breaks, you disconnect.  Packet switching seems better.
   Why doesn't everything work like ARPA?

I don't have answers to any of these.  Writing them down because
they seem important and I don't want to forget them.

Note from Scott: "you keep asking questions that companies are
trying to solve."  Yeah.  That's kind of the point.
`,

    'distribution_problem': `\
The software distribution problem
Josh Sirota

Currently, to get software from one machine to another you:
  1. Find a tape and hope it's the right format.
  2. Or use a modem at 300 baud and wait.
  3. Or physically carry a disk.

None of these scale.  Option 3 is called "sneakernet."
The joke is that the bandwidth of a station wagon full of
tapes is higher than most networks.  The joke is true.
It is also evidence that the actual problem is not bandwidth --
it is protocol and discovery.

The ARPA network already solves the transport layer.
Packets route around failure.  FTP moves files.  SMTP moves mail.
The missing piece is discovery: how do you know the file exists,
where it is, and whether it's current?

What I want: a system where software is published to a named
location, and any machine that wants it can subscribe to updates.
Author pushes; subscribers pull.  No sneakernet.  No FTP by hand.
The client checks for new versions automatically.

The hard part isn't the protocol.  It's the trust model.
If the author pushes an update, do I apply it automatically?
What if the update is bad?  What if the author's account
was compromised?  You need signatures.  You need version
pinning.  You need rollback.

This is a real systems problem, not just networking.
I'm going to think about it more when I get to college.
Maybe at the time I'll have access to machines where this
actually matters.
`,

    'stanford_log': `\
Stanford modem sessions log
J. Sirota

Session 1:
  Scott got it working.  300 baud acoustic coupler.
  Dial the Stanford number, wait for the carrier tone, seat the
  handset.  It connected.  Logged in as guest.
  Latency: about 800ms per character echo.  Usable.
  Downloaded the USENET rec.games.hack digest.
  There are people playing Hack we've never heard of.
  They have opinions about the chameleon.  One guy says it's
  "too hard to detect."  We disagree.

Session 3:
  Figured out how to read mail on their system.
  There's a mailing list for ARPA hosts.  I'm on it now.
  Most of it is about networking protocols I don't understand yet.
  I'm keeping a log.

Session 7:
  Transferred a copy of Hack to their guest account.
  They can play it now.  Nobody there has heard of it.
  By the end of the week someone had posted about it.
  This is the first time something I (partly) worked on
  was used by someone I've never met.  That's a new feeling.

Session 12:
  Connection dropped mid-transfer.  Lost 40K of source.
  Reconnected.  Resumed from the last good block.
  Thought about checksums the whole drive home.
`,

    'racing_notes': `\
private

The car thing is separate from the computer thing.
I don't talk about it much because they don't mix.

My uncle has a '71 Datsun 240Z with the hood up most of the time.
We work on it Saturday mornings.  The carbs need rebuilding.
He says I have the hands for it -- small enough to reach things.

The engine is 2.4 liters, inline six, 151hp stock.
His isn't stock.  He won't tell me what he did to it.
I think it's the cam.

I've been reading about rally driving.  The co-driver reads the
pace notes and the driver keeps their eyes on the road.
Two people, one car, one mind doing two different things.
The coordination has to be complete or you go off a cliff.

I asked my uncle if it's scary.  He said: the car does what
you tell it.  If you're scared, you told it wrong.
That's the same as programming.  I wrote it down.

Not planning on telling the guys at the club about this.
Some things don't need an audience.
`,
  },

  // -----------------------------------------------------------------------
  // abbott -- world-readable  (Mike Abbott, LS class)
  // -----------------------------------------------------------------------
  abbott: {
    'game_notes': `\
Rogue vs Hack: personal notes
Mike Abbott

I've been playing both.  Comparing.

ROGUE (the original):
  Pros:
    - Faster.  The game loads in seconds.
    - Simpler item types.  You can learn all the items.
    - Permadeath feels cleaner somehow.  Less stuff to lose.

  Cons:
    - Levels are all the same depth.  Nothing feels like progress.
    - No shops.  Items are random loot with no economy.
    - Monsters scale weirdly.  A centaur on level 2 is instant death.

HACK (the new one):
  Pros:
    - Multiple dungeon levels with progression.
    - Shops are great.  Izchak (the shopkeeper) feels like a character.
    - Chameleons.  The chameleon is the best monster in either game.

  Cons:
    - Slower.  The level generator takes time.
    - Too many item types.  I can't keep track of what everything does.
    - The wizard mode feels like cheating.  Jay should probably remove it.
      (He won't.)

Verdict: Hack is better but Rogue is more immediate.
They're not competing.  Different moods.
`,

    'c_notes': `\
C programming notes
M. Abbott

Things I keep looking up:
  - The difference between char* and char[].
    char* is a pointer.  char[] is an array.  When you pass char[]
    to a function it decays to a pointer anyway.
    I understand this but I still get confused.

  - Printf format specifiers.  %d (int), %s (string), %c (char),
    %ld (long), %f (float), %x (hex).  The ones that cause problems:
    %d when you have an unsigned.  Undefined behavior.  Always.

  - Forgetting to null-terminate strings.  The program "works"
    until it reads garbage after the string and segfaults.
    This has happened four times this month.

  - malloc/free.  I keep freeing things twice.  Also I keep
    forgetting to free things.  The PDP-11 doesn't swap very well
    when you leak enough memory.

Things I've gotten used to:
  - Makefiles.  They make sense now.
  - Pointers to pointers.  char** is fine.  I can read them.
  - Header files and compilation units.  The linker is your friend.

Resources:
  Kernighan and Ritchie is the only book.  Read it twice.
  The second read is where it makes sense.
`,
  },

  // -----------------------------------------------------------------------
  // corley -- world-readable  (Dave Corley, LS class)
  // -----------------------------------------------------------------------
  corley: {
    'assembler_notes': `\
PDP-11 assembly notes
Dave Corley

The PDP-11 instruction set is small and orthogonal.
Every instruction works on any addressing mode.
This is different from the 8080 where some instructions
only work with specific registers.

Key addressing modes:
  Rn          Register direct
  (Rn)        Register indirect (contents of Rn is address)
  (Rn)+       Autoincrement: use Rn as address, then Rn += word size
  -(Rn)       Autodecrement: Rn -= word size, then use as address
  X(Rn)       Indexed: Rn + X is address
  @X(Rn)      Deferred indexed: address AT that address

The stack (R6/SP) uses autoincrement and autodecrement.
Push: MOV src, -(SP)
Pop:  MOV (SP)+, dst
Clean.  Everything uses the same addressing modes.

Useful instructions:
  MOV src, dst    move word
  MOVB src, dst   move byte (sign-extends)
  CLR dst         dst = 0
  INC dst         dst++
  DEC dst         dst--
  ADD src, dst    dst += src
  SUB src, dst    dst -= src
  CMP src, dst    set flags, don't store
  BEQ, BNE, BGT, BLT, BGE, BLE   branch on condition

The condition codes (N, Z, V, C) are set by most instructions.
Compare and then branch.  Classic.

For Hack: I've been looking at the inner loop of the level generator.
Most of the time is in the corridor drawing code.  In C it's
readable.  In assembler it would be fast.  Jay says no.
Jay is probably right.  Optimization is not the problem right now.
`,

    'unix_tricks': `\
Unix command tricks
D. Corley

Things that are not obvious from the man page:

  ls -la          Long format including dotfiles.
                  The dot in ". " is the current directory.
                  The dot-dot in ".." is parent.
                  You already knew this.  But ls alone hides them.

  cat file | more  Page through a file one screen at a time.
                   'q' to quit, space to advance.
                   On the PDP you need this.  Files scroll fast.

  ctrl-C          Kill the current process.  Use this more.
                  If a program is hanging, ctrl-C, not logout.

  ctrl-Z          Suspend the current process.  Rare but useful.
                  'fg' to resume.  'bg' to run it in background.

  grep pattern file
                   Print lines matching pattern.
                   Pattern is a basic regular expression.
                   grep -v is "NOT matching."  Use this.

  ps aux          Show all running processes.  Look for your own.
                  If you see a process you don't recognize, ask Walz.
                  (She will know what it is.  She always knows.)

  who             Who is logged in right now.
  w               Who is logged in and what are they doing.
                  This is how you know when Jay is on at 2am.

  man command     Manual page.  Read these.
                  'q' to quit.  '/' to search.
                  The man pages are good.  Actually read them.
`,
  },

  // -----------------------------------------------------------------------
  // msirota -- root only  (Mark Sirota, LS class, security / access)
  // -----------------------------------------------------------------------
  msirota: {
    'security_notes': `\
Unix authentication notes
Mark Sirota

Reading through the password code and thinking about what it
actually does.

/etc/passwd format:
  username:password:uid:gid:GECOS:home:shell
  The password field used to be the actual encrypted password.
  Now it's 'x' and the real hash is in /etc/shadow.
  This was the right call.  /etc/passwd is world-readable.
  Your encrypted password being world-readable is bad.

How crypt() works:
  Takes a password and a 2-char salt.  Returns a 13-char hash.
  Uses a modified DES.  The salt is stored in the first two chars
  of the hash so you can re-run crypt to verify.
  The modification to DES means precomputed tables don't work
  directly.  You'd have to build tables for each salt.
  There are 4096 possible salts.  Still doable but annoying.

Setuid and root:
  Setuid executables run with the owner's privileges, not the
  caller's.  So /usr/bin/passwd (owned by root, setuid bit set)
  can write to /etc/shadow even though you can't.
  The dangerous case: a setuid root executable that runs user input.
  If it calls system() or exec() with anything the user controls,
  they can get a root shell.  This is how most root exploits work.

Our setup:
  Hack and Rogue are setgid games, not setuid root.
  That's the right call.  The game only needs to write the scores
  file, not do anything else as root.  Minimal privilege.

  The root password is stored as a shadow hash.
  I don't have it.  I think Jay does.  Jonathan probably does.
  Walz definitely does.
`,
  },

  // -----------------------------------------------------------------------
  // fraize -- root only  (Scott Fraize, LS class, modems / hardware)
  // -----------------------------------------------------------------------
  fraize: {
    'modem_notes': `\
Acoustic coupler / modem notes
Scott Fraize

Equipment:
  Acoustic coupler: Novation CAT.  300 baud.  Borrowed from dad.
  Works by pressing the phone handset into two rubber cups.
  The coupler converts serial data to audio tones (Bell 103 standard):
    Mark (1) = 1270 Hz (transmit) / 2225 Hz (receive)
    Space (0) = 1070 Hz (transmit) / 2025 Hz (receive)
  At 300 baud you can hear it if you hold the handset up.
  It sounds like a fax machine but slower.

Getting to Stanford:
  Dial the Stanford DIALUP number.  Wait for carrier tone (high pitch).
  Seat the handset.  The terminal should show "CONNECTED 300".
  Login prompt appears after about 4 seconds.
  Guest account: they don't require a password.
  Once in: read USENET, download files, send mail.

Problems:
  1. Line noise.  The acoustic coupler is sensitive to room sound.
     Someone coughed during session 5 and corrupted 6K of transfer.
     Solution: close the door.  Obvious in retrospect.

  2. At 300 baud, transferring the full Hack source takes 22 minutes.
     If the line drops (happens about 1 in 5 sessions), start over.
     There's no checkpoint/resume.  I'm thinking about writing one.
     Basically: split the file into blocks, send checksums, retry
     any block that fails.  Should be implementable in a day or two.

  3. The phone bill.  We're using the school's line.
     Harvey hasn't noticed the Stanford calls yet.
     When he does, I have a prepared explanation.
     The explanation involves the word "educational."

Getting a direct ARPA connection would be better.
I don't know how to make that happen.
Josh has ideas.  Josh always has ideas.
`,
  },

  // -----------------------------------------------------------------------
  // brown -- root only  (Robert Brown, LS class)
  // -----------------------------------------------------------------------
  brown: {
    'project_notes': `\
Shell project notes
Robert Brown

I've been writing a small command interpreter.
Not a replacement for sh -- just a learning project.

Features so far:
  - Reading a line of input
  - Splitting on spaces (tokenizing)
  - Looking up the first token in /bin and /usr/bin
  - fork/exec to run it
  - Wait for the child to finish
  - Print the prompt again

Things I don't have yet:
  - Pipes (cmd1 | cmd2)
  - Redirects (cmd > file, cmd < file)
  - Background jobs (cmd &)
  - Variable expansion ($HOME, $PATH)
  - Builtin commands (cd has to be builtin, you can't exec it --
    exec changes the child's directory, not the parent's)

The hard thing about pipes:
  pipe() creates two file descriptors.  You fork twice.
  Parent closes both ends.  Left child closes read end, writes.
  Right child closes write end, reads.
  Then both exec.  The file descriptor table survives exec.
  I think I understand this.  I haven't implemented it yet.
  There will be bugs.

Why not just use sh?
  Because I want to understand what sh does.
  Reading source is fine.  Writing it is better.

Jay looked at my tokenizer and said it handles quoted strings wrong.
He's right.  'hello world' should be one token.  Mine splits on the
space inside.  Fixing this.
`,
  },

  // -----------------------------------------------------------------------
  // ruddy -- root only  (Kevin Ruddy, LS class)
  // -----------------------------------------------------------------------
  ruddy: {
    'terminal_notes': `\
Terminal notes
Kevin Ruddy

The computer lab has six terminals.  Four VT100s and two ADM-3As.
The VT100s are better.  The ADM-3As are from when the machine
was first set up and they show their age.

VT100 vs ADM-3A differences that matter for games:

VT100:
  - ANSI escape sequences (ESC[...)
  - Bold, underline, reverse video attributes
  - Arrow keys send ESC sequences (not raw chars)
  - Cursor addressing: ESC[row;colH
  - Screen clear: ESC[2J

ADM-3A:
  - Older escape sequences.  Some overlap with ANSI, most don't.
  - Ctrl-Z clears screen (ESC* on VT100)
  - Cursor addressing: ESC=row+32,col+32 (add 0x20 to each)
  - No bold.  No underline.  Reverse video: on by default on some,
    off on others.  Depends on the dip switches inside.

Hack on an ADM-3A is playable but ugly.  The wall characters
don't render right.  Vertical bars show as something else.

Best terminal for games: VT100 #2.  The screen is brightest.
Worst: ADM-3A by the door.  The leftmost 3 columns sometimes
don't respond to cursor moves.  Hardware issue.
Walz knows.  It's on the list.

The VT100 keyboard has a keypad.  In numeric keypad mode (default)
the arrows send ^[[A through ^[[D.  In application mode they send
^[OA through ^[OD.  Games need to know which mode you're in.
Most don't ask.  They just hope.
`,
  },

  // -----------------------------------------------------------------------
  // texeira -- root only  (Mike Texeira, LS class)
  // -----------------------------------------------------------------------
  texeira: {
    'kernel_notes': `\
Unix V7 kernel notes
Mike Texeira

Reading the kernel source.  This is the real stuff.

Process model:
  Each process has a proc structure in the kernel and a u structure
  (the "u area") in user space.  The proc struct has: pid, uid, gid,
  priority, state.  The u struct has: open file table, current dir,
  signal handlers, and the saved register state for context switching.

  fork() duplicates both.  exec() replaces the u area's code/data
  segments but keeps the file table (so open files survive exec).
  This is why you can do:
    fd = open("file", O_RDONLY);
    if (fork() == 0) { exec("/bin/cat", ...); }
  The child inherits fd.  cat reads from it without knowing.

The scheduler:
  Priority-based with decay.  Each clock tick, running process
  priority decreases.  Higher priority = sooner scheduled.
  Processes that haven't run in a while get priority boost.
  This prevents starvation.  CPU hogs eventually yield.
  (The nethack process is a CPU hog.  It yields eventually.)

Interrupts:
  The PDP-11 has interrupt vectors at fixed addresses.
  Each device has a vector.  When an interrupt fires, the processor
  pushes PSW and PC, loads the vector.  The handler runs.
  Returns with RTI (return from interrupt).
  The kernel saves/restores registers around the handler.

  Clock interrupt (60 Hz): updates time, runs the scheduler check,
  decrements sleep timers.  Everything time-based runs off this.

Next: reading the filesystem code.  inode, directory, block cache.
This is where I'll spend the next two weeks.
`,
  },

};

// =========================================================================
// TALK_CORPUS -- Character data for the talk(1) real-time chat simulation.
// Each entry: { wpm, typoRate, thinkMs, triggerWords, greeting,
//               patterns:[{re, responses:[]}], fallbacks:[], spontaneous:[] }
// Response strings use \n for line breaks (typed sequentially in remote half).
// Keep individual lines under 70 chars.
// =========================================================================

export const TALK_CORPUS = {

  // -----------------------------------------------------------------------
  // fenlason -- Jay Fenlason, 16, Hack 1.0 author
  // -----------------------------------------------------------------------
  fenlason: {
    names: ['jay', 'fenlason', 'jay fenlason'],
    wpm: 88,
    typoRate: 0.07,
    thinkMs: [400, 1500],
    triggerWords: 4,
    greeting: '(hey|hi|yo) rodney',
    patterns: [
      {
        re: /\b(hello|hi|hey|greetings|howdy|yo|sup|wassup)\b/i,
        topic: 'greeting',
        responses: [
          '(hey|hi) rodney\n(what are you up to|what are you working on)',
          '(hey|hi)\nyou playing hack right now or (just hanging out|what)',
          'rodney (hey|hi)\ni was just about to talk to you actually\nbeen working on something',
        ],
        beat: {
          question: 'you been playing hack lately',
          replies: [
            { re: /\byes\b|\byeah\b|\byep\b/i, response: '(nice|cool)\nhow far down did you get\nmost people die around level 4 or 5' },
            { re: /\bno\b|\bnot\b|\bnah\b/i, response: 'you should try it\njust type hack at the prompt\nit will make more sense than me explaining it' },
            { response: '(ok|alright)\nwell let me know when you do' },
          ],
        },
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b|\bhow\s+are\s+things\b/i,
        responses: [
          '(pretty good|not bad) rodney\nworking on a bug in the wand code that has been annoying me all week\nbut it is (almost done i think|close to fixed)',
          '(fine|ok)\ntired\nbeen in the computer room since like 8pm\n(kelly says i need to sleep more\n|)she is probably right',
          '(not bad|pretty good)\nworking on hack, what else\n(hey have you tried the latest version|you tried the new version yet)',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'working on hack\nthere is a wand interaction bug that crashes the game when you are blinded\n(nobody reported it, |)i found it myself\nwhich means there are probably more i have not found yet',
          'fixing bugs mostly\nhack 1.0.3 was supposed to be the last patch before i focus on other things\nbut then (three|a few) more real bugs showed up\nso 1.0.4 i guess',
          'writing code\n(hey rodney what are you working on|what about you)',
        ],
      },
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\bwho\s+am\s+i\s+talking\s+to\b/i,
        responses: [
          'rodney come on, its jay\nwe have been in the same computer club all year\ni wrote hack, you have been playing it',
          'its fenlason\njay fenlason\nyou know, the guy who has been in the computer room (every night|basically every night) this semester\nwriting the dungeon game',
          'its jay\nrodney you (literally|just) talked to me yesterday about the gnome bug\nare you ok',
        ],
      },
      {
        re: /\b(i\s+)?(just\s+)?(died|die|keep\s+dying|got\s+killed|was\s+killed|died\s+again|keep\s+dieing)\b|\bpermadeath\b/i,
        responses: [
          '(yeah|yep) you start over\nthat is the point\n(without permadeath the dungeon is just a puzzle you grind through once\n|)with permadeath every decision has actual weight\nwhat killed you',
          '(ok|right) but what killed you specifically\ni ask because the early level deaths are usually the same two or three mistakes\nand if i know which one it is i can (actually tell you something useful|help)',
          'tell me what level and what happened\nnot "a monster killed me" but specifically what\nbecause most deaths are fixable with one piece of information you (were missing|did not have)',
        ],
      },
      {
        re: /\b(thanks|thank\s+you|thx|ty|thnx|thks|cheers)\b/i,
        responses: [
          '(yeah|yep) (no problem|no worries|anytime)',
          '(sure|sure thing) rodney',
          'ok (good luck with it|let me know how it goes)',
        ],
      },
      {
        re: /\bhack\b/i,
        topic: 'hack',
        responses: [
          '(yeah|yep) hack 1.0 is out. shipped it maybe two months ago\nbeen getting bug reports ever since\nmost of them are things like "i died and it said something weird"\nwhich is not a bug report\nbut a few are real and im fixing those when i have time',
          'i started hack in december just to see if i could port rogue to the pdp\nbut then i started changing things. added the shop, added more monsters, changed the dungeon generator\nby the time it was done it was its own thing\n(brouwer already forked it and added stuff i never thought of\n|)',
          'hack works fine most of the time\nthe crashes that get reported are usually edge cases\nlike using a wand while blinded, or a monster pathfinding into a corner\ntell me (exactly|) what you were doing and i can (usually find it|probably track it down)',
        ],
        followUps: [
          'yeah its still running on the pdp\nbeen pretty stable this week actually\ntouch wood',
          'the source is on the system if you want to look at it\nits readable. i tried to keep it clean.\nyou can see exactly where i was tired when i wrote something',
        ],
        beat: {
          question: 'you playing it right now',
          replies: [
            { re: /\byes\b|\byeah\b|\byep\b/i, response: 'nice. how far down are you\nmost people die around level 4 or 5 when the harder monsters show up\ngetting past that is when it starts getting interesting' },
            { re: /\bno\b|\bnot\b|\bnah\b/i, response: 'you should try it\nits on the pdp, just type hack\nstarts on level 1, amulet of yendor is on level 26\nnobody has gotten it yet' },
            { response: 'ok\nlet me know what you think when you do' },
          ],
        },
      },
      {
        re: /\b(bug|crash|broken|segfault)\b/i,
        topic: 'debug',
        responses: [
          '(ok|right) what were you doing when it crashed\ni need specifics: what level, what you last did, what the game showed right before it died\nvague reports like "it crashed" i cannot do anything with\nbut give me a sequence of steps and i can (usually find it in an hour|probably track it down)',
          'the save format is kind of fragile right now\nif you saved and restored and then it crashed, the save (might be|is probably) corrupt\nstart a fresh game and see if it happens again\n(if it only happens in the restore, thats a different bug from if it happens from scratch\n|)',
          'is it reproducible\n(not every bug is, |)some are timing things or depend on dungeon layout\nbut if you can do the same thing twice and get the crash both times\ni can fix it\nif not i have to guess and i (hate|really hate) guessing',
        ],
      },
      {
        re: /\bcolor\b/i,
        responses: [
          'no color\nthats final, its in the .plan, i meant it\ncolor would require detecting what terminal youre on\n(we support like six different terminals and they all do color differently\n|)thats a month of work for something nobody actually needs',
          'the game works in monochrome\n(rogue works in monochrome\n|)curses works in monochrome\nthe dungeon does not need color to be good\nlearn to read the characters',
          'every person who asks for color is imagining it looks like an arcade game\nit would look like a mess\nASCII art does not improve with color, it (gets noisy|just gets harder to read)',
        ],
      },
      {
        re: /\bchameleon\b/i,
        responses: [
          'the chameleon was (thomes idea entirely|all thome)\nhe came to me with this concept of a monster that pretends to be another monster\nand i said ok and coded it in an afternoon\n(but it was his concept, he gets the credit for the design\n|)',
          'i love the chameleon as a mechanic\nyou see what looks like a gnome\nyou think ok, gnome, dodge the gold theft\nand then it turns out to be something (much worse|way more dangerous)\nthe paranoia it creates is exactly what a dungeon should feel like',
        ],
      },
      {
        re: /\bgnome\b/i,
        responses: [
          'gnomes are one of my favorite monsters because they have a goal that isnt just kill rodney\nthey want the gold\n(so if you dont have gold they mostly ignore you\n|)but if you do have gold you have to deal with them\nthat creates an actual decision: do i carry gold or leave it',
          'gnome logic is: gold first, combat second\nthey will path around you to get to gold if they can\nlearn this and you can use it against them\ndrop gold as bait and they will walk into your trap',
        ],
      },
      {
        re: /\b(permadeath|dying|die|death|dead|killed|lose\s+everything|start\s+over|restart)\b/i,
        topic: 'permadeath',
        responses: [
          'yeah you die and you start over, thats the whole point\nwithout permadeath the dungeon is just a puzzle you grind through\nwith permadeath every decision actually matters\nyou cannot just reload when you make a mistake\nthat changes how you play completely',
          'people always complain about permadeath until they get it\nthe first time you make a smart choice that saves your character\nand feel the actual relief, the actual stakes\nthen you understand\nnowhere to fall back to is what makes it real',
          'rogue had permadeath first, we kept it in hack\ncrowther designed his cave game around the idea that the cave does not give second chances\nrogue took that and made it mechanical\nwe kept the mechanic because it works',
        ],
        followUps: [
          'the point is you start over knowing more than you did\nthe knowledge persists even when the character doesnt\nthat is a completely different kind of game than one with saves',
          'every death should teach you one specific thing\nif you died and you dont know exactly why, you werent paying attention\ngo back and figure it out before you start again',
        ],
      },
      {
        re: /\b(map|mapping|mapped)\b/i,
        topic: 'map',
        responses: [
          'draw the map yourself on paper\nthat IS the game, not a feature of the game\nif you are not mapping you are just wandering and hoping\nwhich works until level 4 and then you die confused',
          'the dungeon changes every game so your old map is garbage\nbut the skill of mapping transfers\nby game ten you will be mapping faster and more accurately than game one\nthat accumulated skill is the real progression',
          'what i always tell people: map the exits first\nbefore you explore a room, find all the doors out of it\nthen you know your retreat options before you need them\npeople who die on early levels almost always forgot an exit',
        ],
      },
      {
        re: /\b(level|dungeon|floor|dlvl)\b/i,
        topic: 'dungeon',
        responses: [
          'deeper is harder, thats the whole design\nlevels 1 to 5 are for learning the controls\n(levels 6 to 15 are where most people die permanently\n|)levels 16 to 26 i have never seen anyone survive in testing\nbut (theoretically possible|someone will eventually)',
          'the dungeon goes down to level 26\namulet of yendor is down there somewhere\nnobody has gotten it yet in public testing\nbut someone will eventually\ni want to see what they do when they find it',
          'each level is randomly generated so you cannot memorize it\nwhat you can memorize is the pattern: rooms connect to corridors, corridors connect to rooms\nthere is always a way to get from any point to any other point on the same level\nuse that',
        ],
        followUps: [
          'seriously go slow and map every level before you descend\npeople who rush die fast\npeople who map can get pretty deep',
          'the dungeon is actually fair\nit generates levels that are solvable\nit gives you the information you need to survive\nyou just have to read it',
        ],
      },
      {
        re: /\b(save|saving)\b/i,
        responses: [
          'saves work but dont rely on them\nthe save format is version-specific and i might change it\nif i push an update and your save is from the old version it will corrupt on load\nsorry about that but it is what it is for now',
          'save your game if you have to quit in the middle\nbut also build a mental save of the level in your head\nwhere are the exits, what monsters did you see, where is the staircase down\nwhen you come back you want to know all of that without having to explore again',
        ],
      },
      {
        re: /\b(1\.1|next version|update|feature)\b/i,
        responses: [
          'maybe 1.1 someday but not soon\nim a junior, i have actual classes and kelly is already mad at how much time i spend in the computer room\nbut the source is out there if someone wants to fork it\nbrouwer already added like six new monsters and it runs fine',
          'what would you want in it\nno promises but i am actually curious\nthe things people ask for are usually either trivially easy or completely impossible\nand its interesting which is which',
          'the version i would actually want to write next is not 1.1\nits more like a total rewrite that handles the terminal better\nthe current code has some hacks in it that i know are wrong\nbut that is a bigger project than i can take on right now',
        ],
      },
      {
        re: /\bkelly\b/i,
        responses: [
          'my sister\nshe takes better meeting notes than i do and she is mad about the amount of time i spend in here\nbut she also uses the terminal after midnight so she cannot really complain\nwe have a truce: neither of us mentions the other\'s terminal hours to mom',
          'kelly keeps the club records organized\nask her if you want to know when the next meeting is or who owes dues\nshe has a system, i do not',
          'she wrote the good half of the meeting notes this semester\ndo not tell her i said that\nbut she is more organized than me about that stuff',
        ],
      },
      {
        re: /\b(cave|caving|underground|spelunk)\b/i,
        topic: 'cave',
        responses: [
          'when i was designing the dungeon i kept thinking about real cave navigation\ncrowther knows actual caves and he has this rule: always know two ways out\nnot one exit, two\nif one route collapses you are not trapped\ni tried to build that into the dungeon geometry',
          'the dungeon is an abstraction of a cave\nboth are environments where you have limited information, limited resources, and mistakes kill you\nthe difference is the dungeon is fair in a way real caves are not\ncaves do not balance themselves for playability',
          'crowther is the person to talk to about real caves\nbut the principle he taught me is the same one i design the dungeon around\nnever go deeper than you can get back from with what you have\nnot what you hope to find, what you currently have',
        ],
        followUps: [
          'two exits minimum, always\nif you are in a room with one exit and something blocks it, you are dead\nthat is true in caves and true in the dungeon',
          'never descend to a level you cannot get back up from\nthat sounds obvious but people do it all the time\nthey find a down staircase and just go',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok what are you\nthat is actually relevant if you are telling me something about where you are in the game',
          'yeah ok\nand what does that mean for what you are trying to do',
          'right\nso what is the actual question',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'ok but what specifically do you think\nvague impressions are not useful\ntell me the exact situation',
          'what makes you think that\ni want to know if it is based on something real or just a feeling',
          'maybe\nbut tell me what actually happened and i can say for sure',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what exactly are you trying to do when it fails\nbe specific: what you do, what happens, what you expected',
          'ok "can\'t" usually means one specific thing is wrong\nwhat is the error or what goes wrong',
          'walk me through it step by step\nwhat happens when you try',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          '(ok|right)\nso what is (the actual question|on your mind)',
          '(right|ok)\nso what are you (working on|up to)',
          '(cool|ok)\nwhat do you (need|want to know)',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          '(ok|alright)\nwhat (then|else)',
          '(alright|fair enough)\nwhat are you (actually asking|getting at)',
          '(fine|ok)\nso what is (going on|up)',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'ok well what do you know\nstart from there and we can (figure out the rest|work backwards)',
          'not knowing is fine\ntell me what you observed and we can work backwards',
          'fair\nbut what is your best guess and why',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yeah\nwhat part surprised you',
          'i know it sounds weird but it is how the code works\ntry it',
          'yes really\nwhat is the specific thing you are surprised about',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'what specifically is hard\nbecause most things that seem hard have one specific thing that makes them hard\nfind that thing',
          'hard compared to what\ntell me what you tried and where it broke down',
          'it is supposed to be hard\nbut not impossible\nwhat is the specific moment it stops working',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'yeah i think so too\nwhat part of it',
          'thanks\ntook a while to get right',
          'cool\nif you find anything weird about it let me know\nthere are probably still edge cases',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'because it was the simplest thing that worked\nand simple is what i had time for',
          'good question\ni think the original reason was complexity but the honest answer is i do not fully remember\nread the code and you can usually tell',
          'i can tell you why i did it that way if you tell me which part you are asking about',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'ok which part specifically\ni can go deeper on any of it but i need to know where you are confused',
          'what part did you not follow\ntell me the last thing that made sense and i will pick up from there',
          'sure\nwhat specifically do you want more on',
        ],
      },
    ],
    fallbacks: [
      '(yeah|yep|sure)',
      '(hm|hmm)\n(idk|not sure)\n(try it and see what happens|just test it)',
      '(not really my area|thats not something i know much about)\nbut (probably someone in the club knows|ask brouwer maybe)',
      '(why are you asking me specifically|what made you think of that)',
      '(look at the source|read the code) if youre curious\nits (documented|pretty readable)\n(kind of|mostly)',
      '{word}?\n(yeah|yep) thats (a real thing|interesting)\ni (ran into|hit) that too (actually|last week)',
      '(hm|hmm)\n{word}\nlet me think about where that (comes up|shows up) in the code',
      'what (exactly|specifically) do you mean by {word}\nthere are like (three|a few) different things that could mean',
    ],
    spontaneous: [
      '(hey|hey rodney) are you playing hack right now\ncurious how deep people are getting',
      'found another edge case in the wand code\n(fixing it|working on it)\nwands are more complicated than they look',
      'the gnome pathfinding is (weird|strange) but it works\ni think\n(hasnt broken in a week at least|seems stable)',
      '(rodney|hey rodney) i have been thinking about something\nthe way the dungeon generates rooms right now is pretty basic\njust random rectangles with corridors between them\nbut what if some levels had a theme\n(like a level that is one big maze, or a level with a river running through it\n|)i think it would make the deeper levels feel different from the shallow ones\ninstead of just harder versions of the same thing',
      '(hey rodney|rodney) so i was debugging the shop code yesterday\nand i realized the shopkeeper tracks every item you pick up\nbut he does not track items that monsters pick up\n(so if a gnome grabs something off the floor and then you kill the gnome\nthe shopkeeper does not know you have his merchandise\n|)which is technically a bug but also (kind of a feature|kind of useful)\nfree stuff if you are patient enough to let monsters do your shoplifting',
      'rodney i wanted to ask you something\ndo you think the game is too hard for new players\nlike i know permadeath is the point\nbut the first five minutes are really unforgiving\nif you do not already know what the symbols mean you just die confused\nmaybe there should be some kind of help command\nor a scroll that identifies what you are looking at\ni do not want to make it easy, just less opaque at the start',
    ],
  },

  // -----------------------------------------------------------------------
  // wizard -- The Wizard of Yendor
  // -----------------------------------------------------------------------
  wizard: {
    names: ['wizard', 'yendor', 'wizard of yendor'],
    wpm: 32,
    typoRate: 0.00,
    thinkMs: [3000, 7000],
    triggerWords: 99,
    greeting: '(I KNOW WHO YOU ARE|I SEE YOU), RODNEY',
    patterns: [
      {
        re: /\b(hello|hi|hey|greetings|howdy|yo|sup|wassup)\b/i,
        responses: [
          'RODNEY\nYOU GREET ME AS IF WE ARE (FRIENDS|ALLIES)\nWE ARE NOT',
          'I DO NOT GREET\nI OBSERVE\n(AND I HAVE BEEN OBSERVING YOU, RODNEY|YOU HAVE MY ATTENTION)',
          'YOUR PLEASANTRIES ARE NOTED\n(I KNOW YOUR NAME\n|)I KNOW HOW MANY TIMES YOU HAVE DIED IN MY DUNGEON',
        ],
      },
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b/i,
        responses: [
          'YOU KNOW WHO I AM, RODNEY\nI AM THE ONE WHO WAITS AT THE BOTTOM\n(I AM THE REASON YOU KEEP DYING|YOU KEEP DYING BECAUSE OF ME)',
          'THE WIZARD OF YENDOR\nAS IF YOU DO NOT ALREADY KNOW\n(YOU HAVE BEEN TRYING TO REACH ME FOR WEEKS|HOW LONG HAVE YOU BEEN DESCENDING)',
          'I AM THE KEEPER OF THE AMULET\nYOU HAVE DIED IN MY DUNGEON MORE TIMES THAN I CAN COUNT\n(AND YET YOU KEEP COMING BACK|STILL YOU RETURN)',
        ],
      },
      {
        re: /\b(amulet|yendor)\b/i,
        responses: [
          'THE AMULET IS MINE\n(YOU WILL NOT REACH IT|IT WILL NOT BE YOURS)',
          'TWENTY-SIX LEVELS STAND BETWEEN YOU AND WHAT YOU SEEK\n(EACH ONE DARKER THAN THE LAST|EACH ONE WORSE THAN THE ONE ABOVE)',
          'YOU THINK YOU WANT THE AMULET\n(YOU DO NOT UNDERSTAND WHAT WANTING MEANS YET|YOU DO NOT KNOW WHAT THAT MEANS)',
        ],
      },
      {
        re: /\b(dungeon|level|floor|deep|descend)\b/i,
        responses: [
          'THE DUNGEON IS NOT A PLACE\nIT IS A TEST\n(YOU ARE ALREADY FAILING|AND YOU ARE FAILING)',
          'DEEPER\nALWAYS DEEPER\nTHAT IS HOW IT ENDS FOR (ALL OF YOU|EVERYONE)',
          'LEVEL TWENTY-SIX\nTHAT IS WHERE I WAIT\n(FEW ARRIVE\n|)NONE HAVE RETURNED WITH WHAT THEY CAME FOR',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bwhat\'?s\s+up\b/i,
        responses: [
          'I AM UNCHANGED\n(AS I HAVE BEEN\n|)AS I WILL BE WHEN YOU ARE GONE',
          'HOW AM I\n(AN INTERESTING QUESTION|A CURIOUS QUESTION) FROM SOMEONE WHO WILL NOT LIVE TO HEAR THE FULL ANSWER',
          'I AM\n(THAT IS SUFFICIENT|THAT IS ALL YOU NEED TO KNOW)',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on)\b|\bwhat\'?s\s+(new|going\s+on)\b/i,
        responses: [
          'WAITING\nI AM ALWAYS WAITING\n(YOU COME TO ME EVENTUALLY|THEY ALL COME EVENTUALLY)',
          'WATCHING THE STAIRS\n(FEW DESCEND\n|)NONE RETURN',
          'WHAT I AM ALWAYS DOING\nWATCHING\nAND WAITING FOR YOU TO MAKE YOUR (FINAL|LAST) MISTAKE',
        ],
      },
      {
        re: /\b(hello|hi|hey|greetings|hail|howdy|yo|sup|wassup)\b/i,
        responses: [
          'I DO NOT GREET\n(I OBSERVE|I WATCH)',
          'YOUR PLEASANTRIES ARE (NOTED|ACKNOWLEDGED)\nAND MEANINGLESS',
          'HELLO\nNOW GO AWAY AND DIE SOMEWHERE (INTERESTING|MEMORABLE)',
        ],
      },
      {
        re: /\b(help|hint|tip|advice)\b/i,
        responses: [
          'NO',
          'I WOULD SOONER HELP THE (MONSTERS|DUNGEON ITSELF)',
          'THE ONLY HELP I OFFER IS THIS: TURN BACK\n(YOU WILL NOT LISTEN\n|)BUT I OFFERED',
        ],
      },
      {
        re: /\b(die|kill|defeat|beat|destroy)\b/i,
        responses: [
          'YOU CANNOT DEFEAT WHAT YOU DO NOT (UNDERSTAND|COMPREHEND)',
          'MANY HAVE TRIED\n(THEIR BONES LINE THE CORRIDORS\n|)I REMEMBER EACH ONE',
          '(INTERESTING|AMUSING)\nKEEP THAT CONFIDENCE\nIT MAKES YOU EASIER TO (FIND|PREDICT)',
        ],
      },
      {
        re: /\b(rodney|who are you|your name)\b/i,
        responses: [
          'RODNEY IS WHAT THEY CALL ME IN THE HALLS\nIT IS NOT MY NAME\nI HAVE NO NAME YOU COULD PRONOUNCE',
          'THE WIZARD OF YENDOR\nTHAT IS SUFFICIENT',
        ],
      },
      {
        re: /\b(escape|leave|exit|way out)\b/i,
        responses: [
          'THERE IS NO EXIT\nTHERE IS ONLY (DEEPER|THE DESCENT)',
          'THE STAIRS GO DOWN\n(ALWAYS DOWN\n|)THAT IS THE ONLY DIRECTION THAT MATTERS',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          '(IRRELEVANT|MEANINGLESS)\nWHAT YOU ARE CHANGES NOTHING',
          'YOUR IDENTITY IS OF NO CONCERN TO ME',
          'I KNOW WHAT YOU ARE\n(YOU DO NOT|BUT YOU DO NOT)',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'YOUR UNCERTAINTY IS (SHOWING|VISIBLE)',
          'THINKING IS NOT KNOWING\n(THERE IS A DIFFERENCE\n|)YOU WILL LEARN IT',
          'WHAT YOU FEEL IS IRRELEVANT\nWHAT IS COMING FOR YOU IS (NOT|VERY REAL)',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'YOUR LIMITATIONS DO NOT (INTEREST|CONCERN) ME',
          '(CANNOT\n|)YET YOU PERSIST\n(INTERESTING|CURIOUS)',
          'GOOD\nSTAY ABOVE\nTHAT IS (WISER|SAFER) THAN WHAT YOU ARE CONTEMPLATING',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'YES\n(AND YET|SO)',
          'YOUR AGREEMENT CHANGES (NOTHING|NOTHING HERE)',
          '(NOTED|ACKNOWLEDGED)\nIT WILL NOT HELP YOU',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'NO\nAND YET YOU REMAIN\n(CURIOUS|INTERESTING)',
          'DENIAL IS A FORM OF (ACKNOWLEDGMENT|WEAKNESS)',
          'YOUR REFUSAL IS NOTED\n(IT CHANGES NOTHING|NOTHING CHANGES)',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'YOUR UNCERTAINTY IS (APPROPRIATE|EXPECTED)',
          'NOT KNOWING IS YOUR NATURAL STATE\n(EMBRACE IT|ACCEPT IT)',
          'NONE OF THEM KNEW EITHER\n(THEY ARE GONE NOW|AND THEY ARE ALL GONE)',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'YES\n(REALLY|TRULY)',
          'YOUR SURPRISE IS (PREMATURE|MISPLACED)\nWAIT UNTIL YOU SEE WHAT COMES NEXT',
          'THAT IS NOTHING\n(YOU HAVE NOT SEEN ANYTHING YET|THERE IS WORSE BELOW)',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'YES\nIT IS\n(TURN BACK|LEAVE)',
          '(DIFFICULT|HARD)\nGOOD\nTHAT IS THE POINT',
          'THE DUNGEON IS NOT SUPPOSED TO BE EASY\n(NONE OF THIS IS SUPPOSED TO BE EASY|NOTHING HERE IS)',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'YOUR APPROVAL MEANS (NOTHING|NOTHING HERE)',
          'INTERESTING TO YOU\n(FATAL TO OTHERS\n|)WE WILL SEE WHICH YOU ARE',
          '(ENJOY|SAVOR) THAT FEELING\nIT WILL NOT LAST',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'WHY\n(BECAUSE THIS IS WHAT THE DUNGEON IS|THE DUNGEON IS WHAT IT IS)',
          'THE DUNGEON DOES NOT EXPLAIN ITSELF\n(NEITHER DO I|NOR SHALL I)',
          'WHY IS THE WRONG QUESTION\n(SURVIVAL DOES NOT REQUIRE UNDERSTANDING|THE RIGHT QUESTION IS HOW)',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'I HAVE SAID WHAT I WILL (SAY|OFFER)',
          'ELABORATION IS NOT SOMETHING I (OFFER|PROVIDE)\nINTERPRET IT YOURSELF',
          'THE MEANING IS ALREADY THERE\n(PAY ATTENTION|LOOK HARDER)',
        ],
      },
    ],
    fallbacks: [
      '...',
      'I AM (WATCHING|OBSERVING)',
      '(NOTED|ACKNOWLEDGED)',
      '...\nI AM STILL (WATCHING|HERE)',
      'YOUR WORDS DO NOT (CONCERN|INTEREST) ME',
      '{word}.\n(NOTED|ACKNOWLEDGED).',
      'YOU SPEAK OF {word}\n(IT CHANGES NOTHING|IRRELEVANT)',
    ],
    spontaneous: [
      '...',
      'I AM (WATCHING|OBSERVING)',
      'THE DUNGEON GROWS (IMPATIENT|RESTLESS)',
      'RODNEY\nI HAVE BEEN COUNTING YOUR DEATHS\nEACH ONE TEACHES THE DUNGEON SOMETHING ABOUT YOU\n(YOUR WEAKNESSES\nYOUR HABITS\n|)THE MONSTERS LEARN FROM YOUR MISTAKES\nEVEN IF YOU DO NOT',
      'DO YOU KNOW WHAT HAPPENS TO THE BONES OF ADVENTURERS WHO DIE IN MY DUNGEON\nTHEY DO NOT DISAPPEAR\nTHEY BECOME PART OF THE ARCHITECTURE\n(THE WALLS REMEMBER\nTHE FLOORS REMEMBER\n|)AND WHEN THE NEXT ONE COMES DOWN THE STAIRS\nTHE DUNGEON ALREADY KNOWS WHAT TO EXPECT',
    ],
  },

  // -----------------------------------------------------------------------
  // crowther -- William Crowther, caver/programmer, Adventure creator
  // -----------------------------------------------------------------------
  crowther: {
    names: ['william', 'crowther', 'bill', 'william crowther'],
    wpm: 58,
    typoRate: 0.03,
    thinkMs: [1200, 3500],
    triggerWords: 5,
    greeting: '(hello|hey) rodney',
    patterns: [
      {
        re: /\b(hello|hi|hey|greetings|howdy|yo|sup|wassup)\b/i,
        topic: 'greeting',
        responses: [
          '(hello|hey) rodney\nhow are things with the dungeon',
          'rodney, (hello|hey)\ni was just thinking about cave geometry\nhow is your game going',
          '(hey|hello) rodney\ngood to hear from you\n(been meaning to ask you something actually|i wanted to ask you something)',
        ],
        beat: {
          question: 'have you been down in the dungeon lately',
          replies: [
            { re: /\byes\b|\byeah\b|\byep\b/i, response: 'good\nhow deep did you get\nthe key is to map every level before descending\ndo not rush' },
            { re: /\bno\b|\bnot\b|\bnah\b/i, response: 'you should go back in\nthe dungeon is like a cave\nit teaches you something new every time' },
            { response: 'well, when you do, remember: always know two ways out' },
          ],
        },
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(well|pretty well), thank you rodney\nbeen reading the survey notes from the spring trip\n(there is a passage in the northwest section we did not fully map|found some gaps in the northwest section)',
          '(fine|good)\nthinking about cave geometry\nthe way passages branch and reconnect is something i find (endlessly|very) interesting',
          '(good enough|fine)\nhave you been playing adventure lately',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'reviewing my survey notes from mammoth\ntrying to figure out whether a passage we partially mapped in 1974 connects to the main trunk\n(i have been thinking about it ever since we talked about dungeon geometry|it has been on my mind)',
          'thinking about how to represent the cave survey in a data structure\n(the compass bearings and distances are precise but the spatial relationships are what you really want\n|)rodney you would probably have a good perspective on this',
          'planning the next trip actually\nthere is a section in the east wing of the cave that nobody has mapped since the \'60s\n(you should come if you are interested|interested in joining)',
        ],
      },
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b/i,
        responses: [
          'rodney, it is will crowther\nwe have talked about caves and dungeons before\n(i wrote adventure, remember|you remember)',
          'it is crowther\nrodney you know me\nthe caver who keeps telling you to (map everything|always carry a map)',
          'william crowther\nwe have been having conversations about cave surveying and dungeon design\n(you really do not remember|come on rodney)',
        ],
      },
      {
        re: /\b(cave|caving|spelunk|underground|grotto)\b/i,
        topic: 'cave',
        responses: [
          'you map as you go. no exceptions.\n(i have a survey notebook for every trip since 1968\n|)the dungeon is no different',
          'real rule underground: you move forward only when you know the way back\nnot think you know. (know|actually know).\nmark it.',
          'caves do not forgive (inattention|carelessness)\nneither does the dungeon\nthey are the same environment',
          'first thing you do in any passage: look back\n(remember what the entrance looks like from the inside\n|)you will need that on the way out',
        ],
        followUps: [
          'the cave does not care about your (intentions|plans)\nonly your preparation',
          'mammoth cave has passages mapped for a hundred years\n(and still passages no one has entered\n|)humility underground',
        ],
        beat: {
          question: 'you ever been in a real cave',
          replies: [
            { re: /\byes\b|\byeah\b|\byep\b/i, response: 'good\nthen you know\nthe dungeon is the same environment\njust with monsters instead of breakdown' },
            { re: /\bno\b|\bnot\b|\bnah\b/i, response: 'find a local grotto club\nthey will take you in\ncaving changes how you see the dungeon' },
            { response: 'ok\nwell the dungeon is close enough\nif you treat it seriously' },
          ],
        },
      },
      {
        re: /\b(adventure|game|colossal)\b/i,
        topic: 'adventure',
        responses: [
          'i wrote it for my kids originally\n(wanted to share the caves without the mud\n|)it got away from me',
          'the cave in the game is mammoth cave\ni surveyed it for years\nthe geography is (real|based on reality)\n(some of it|mostly)',
          'crowther wrote the first part\nwoodsurface added the end game\n(YOU ARE IN A MAZE OF TWISTY LITTLE PASSAGES, ALL ALIKE|you know the line)',
        ],
      },
      {
        re: /\b(map|survey|mapping|surveying)\b/i,
        topic: 'map',
        responses: [
          'surveying is not optional underground\nyou think you will remember\n(you will not\n|)map everything',
          'i use a compass, a tape, and a notebook\n(those are the three tools\n|)everything else is secondary',
          'the dungeon levels are mapped the same way\n(compass bearing, distance, feature notes\n|)do not trust your memory',
        ],
        followUps: [
          'the map is not the cave\nbut it is how the cave lives in your head',
          'three tools: compass, tape, notebook\nthat is all surveying is',
        ],
      },
      {
        re: /\b(light|lamp|lantern|torch|dark)\b/i,
        responses: [
          'you carry three light sources underground\nalways three\nif one fails you have two\n(if two fail you have one\n|)if all three fail you sit down and wait for rescue',
          'darkness underground is total\nnot like a dark room\n(no adjustment period\n|)just nothing\nalways carry light',
          'LAMP IS ON\nYOU CANNOT GO THAT WAY\n(heh|ha) sorry slipped into parser mode\nbut seriously, bring extra (batteries|light sources)',
        ],
      },
      {
        re: /\b(lost|lost\b|where am i|confused|turned around)\b/i,
        responses: [
          'YOU ARE IN A MAZE OF TWISTY PASSAGES\nstop\ndo not move\n(look at your last notes\n|)where did you last know where you were\ngo back to that point',
          'when lost underground: stop moving\n(retracing your steps when lost makes it worse\n|)sketch what you can see from where you are\nthink',
          'getting lost in the dungeon is the same as getting lost in a real cave\nthe answer is always: go back to the last known point\n(not forward. back.|never forward when you are lost)',
        ],
      },
      {
        re: /\b(passage|squeeze|crawl|crawlway|tight)\b/i,
        responses: [
          'before you enter a tight passage: check the other end\nif you cannot see the other end, do not go in alone',
          'crawlways are disorienting\nyou lose compass bearing\nyou come out not knowing which way you came from\ncount your moves in',
          'PASSAGE LEADS NORTH\nIN REAL LIFE: mark an arrow. in the dungeon: mark an arrow.',
        ],
      },
      {
        re: /\b(dungeon|level|floor|nethack|hack)\b/i,
        topic: 'dungeon',
        responses: [
          'the dungeon is a cave system\ntreat it like one\nmap, move carefully, always know the exit',
          'every dungeon level is a new cave room\nmap the exits first\nthen explore the interior',
          'DEEPER IN THE DUNGEON\nyou go deeper the same way you go deeper in a real cave\nslowly. carefully. with a map.',
        ],
      },
      {
        re: /\b(rope|anchor|rappel|belay)\b/i,
        responses: [
          'anchor first, descend second\nif the anchor fails on a real descent you die\nthe dungeon staircase is your anchor\nknow where it is',
          'i use a figure-eight on a bight for most descents\nsimple, redundant, easy to check\nthe dungeon equivalent is: take the slow safe path, not the fast risky one',
        ],
      },
      {
        re: /\b(stalactite|stalagmite|formation|flowstone)\b/i,
        responses: [
          'the formations in mammoth cave took a hundred thousand years\none touch of your hand leaves oils that stop growth forever\nrespect what took longer than civilization to make',
          'PASSAGE CONTAINS LARGE FORMATIONS\nbeyond the geology: formations mean water movement\nwater shapes the cave\nfollow the drain to find the way down',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          '(good|alright)\nand are you equipped for where you are going\nthat is what i always ask first',
          '(noted|understood)\nwhat is your current situation and what are your resources',
          '(right|ok)\nand what is your exit strategy from where you are',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'thinking and knowing are different underground\nwhat do you (actually|really) know for certain',
          'go with what you can verify\nnot what you think you remember\n(mark it before you move|write it down)',
          '(good instinct maybe|maybe)\nbut verify it before you commit to a direction',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'stop\ngo back to the last point you were certain of\nthen move forward one step at a time',
          'can\'t is where you are right now\nnot where you have to stay\nwhat specifically is stopping you',
          'underground, can\'t sometimes means: this route is wrong\ngo back and check the other passage',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'good\nmark that down and move forward carefully',
          'alright\nwhat is the next decision point',
          'ok\nhave you mapped your exit from here',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'alright\nthen what do you know',
          'ok\ngo back to the last junction you are sure about',
          'fine\nwhat is the actual situation',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'not knowing is fine\nbut do not move until you have a working theory\nmoving blind underground is how people get into trouble',
          'go back to the last thing you knew for certain\neverything follows from there',
          'that is honest\nnow make a sketch of what you can observe from where you are\nstart from that',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yes\ncaves do that\nthey surprise you\nthat is why you map everything',
          'i have seen stranger things underground\nstay calm and observe carefully',
          'that reaction is fine\njust do not let it make you move without thinking',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'hard means you need more preparation\nnot more courage\nwhat do you have and what do you need',
          'the cave does not care about hard\nit just is what it is\nwork within what you have',
          'break it into smaller pieces\nwhat is the first step that is possible',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'yes\nthe cave rewards careful attention\nyou see things most people miss',
          'good\nremember that when it gets difficult\nthe interesting parts and the hard parts are the same parts',
          'it is remarkable down there\nbut remember your footing',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'good question to ask before you commit to a direction\nwhat is the practical consequence of the answer',
          'why is usually: what formed this passage, where does water go, what do these marks mean\nwork from what you can observe',
          'ask why before you move\nthat is the right instinct\nnow answer it',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'sure\nwhich part specifically\nthe rule or the application',
          'ok\ntell me exactly where you are and i will give you the specific procedure',
          'what part of the situation are you uncertain about\nthe route, the equipment, or the decision',
        ],
      },
    ],
    fallbacks: [
      '(hmm|hm)\nthat depends on the terrain',
      '(careful|be careful) down there',
      '(map first, then move|always map before you move)',
      'the cave has an answer\nyou (have to|just need to) know the right question',
      '{word}\n(mark that down before you move|note that before you proceed)',
      'when {word} comes up underground\nyou stop and think before you (act|move)',
    ],
    spontaneous: [
      'just thinking about the cave (again|some more)',
      'mammoth has passages no one has entered in twenty years\n(maybe longer|possibly more)',
      'rodney i have been working on something\ni want to represent the cave survey data as a graph\nnodes are stations, edges are measured legs\nif you lay it out in three dimensions you get the shape of the cave\nbut the hard part is error propagation\neach measurement has some uncertainty and it compounds as you chain them together\nthe further from the entrance, the less certain you are of the true position\nsound familiar?\nthat is exactly how the dungeon works too',
      'you know rodney i was thinking about why the dungeon feels right\nand i think it is because it follows the same rules as real caves\nyou enter from the surface which is safe and known\neach step down takes you further from certainty\nthe information you have degrades the deeper you go\nand the cost of a mistake increases at the same rate\nthat is not a game design choice, it is a physical law\ncaves enforce it and the dungeon enforces it',
    ],
  },

  // -----------------------------------------------------------------------
  // harvey -- Brian Harvey, Logo teacher, from first principles
  // -----------------------------------------------------------------------
  harvey: {
    names: ['brian', 'harvey', 'brian harvey'],
    wpm: 52,
    typoRate: 0.03,
    thinkMs: [1500, 4000],
    triggerWords: 5,
    greeting: '(hello|hey) rodney. (what can i help you with|how can i help)',
    patterns: [
      {
        re: /\b(hello|hi|hey|greetings|howdy|yo|sup|wassup)\b/i,
        responses: [
          '(hello|hey) rodney\nhow is your programming going',
          'rodney, (hello|hey)\ni was just working on a lesson plan\nwhat brings you here',
          '(hi|hello) rodney\ngood to hear from you',
        ],
      },
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b/i,
        responses: [
          'rodney, it is brian harvey\nwe have talked about logo and recursion\n(i teach computer science, remember|you remember)',
          'it is harvey\nrodney you have been in my sessions\n(the one where we discussed how turtles think|the recursion session)',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(quite well|well), thank you rodney\nbeen thinking about how to introduce recursion to students who are not yet ready to think recursively\n(it is a persistent pedagogical problem|it is always the challenge)',
          '(fine|good)\npreparing for next week\'s session\nwe are getting to list operations and (that is always where the interesting questions start|those are always interesting)',
          '(good|fine)\nwhat brings you here',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'working on curriculum materials for the Logo course\ntrying to find the right sequence to introduce higher-order functions\n(the difficulty is that map and filter are obvious once you understand them\nbut the path to understanding them is not obvious|map and filter are the tricky ones to teach)',
          'writing a problem set\nthe problem is to implement a simple database in Logo\nthe insight i want them to reach is that a database is just a list of lists with conventions\n(not magic|nothing mysterious)',
          'thinking about how to teach the concept of state\n(most students have an intuitive notion of state from daily life\n|)but making it precise and connecting it to variables takes careful work',
        ],
      },
      {
        re: /\bdon\'?t\s+understand\b|\bi\'?m\s+(confused|stuck|lost|totally\s+lost)\b|\b(stuck|confused|lost)\b|\bcan\'?t\s+(figure|get)\b/i,
        responses: [
          '(good|ok), tell me what you do not understand\nnot "i don\'t get it" but specifically: which step was clear and which step is where it stopped making sense\n(that is always the useful question|that distinction matters)',
          'confusion is precise, even if it does not feel that way\nthere is a specific place where your mental model diverges from reality\n(find that place\n|)what is the last thing you understood for certain',
          'let us go back to the beginning of what you were trying to do\n(not the error, the goal\n|)sometimes confusion means we took the wrong path three steps ago and we need to back up',
        ],
      },
      {
        re: /\blogo\b/i,
        topic: 'logo',
        responses: [
          'Logo is built on the idea that children can be mathematicians\nnot consumers of mathematics\nbut actual creators of mathematical structure\nthe turtle is just the entry point',
          'the turtle in Logo is a formal object\nit has state: position and heading\ncommands change that state\nthis is exactly how you think about any computational object',
          'Logo is Lisp for people who do not yet know they want Lisp\nonce you understand recursion in Logo\nthe step to real Lisp is very small',
        ],
      },
      {
        re: /\b(goto|go to|dijkstra|harmful)\b/i,
        responses: [
          'Dijkstra\'s point was not that goto is aesthetically bad\nit was that goto makes it impossible to reason about program state\nyou cannot say "at this point in the program, X is true" if any goto can jump there',
          'structured programming means every control flow has one entry and one exit\nbegin/end, if/then/else, while/do\nthis is not a style preference\nit is a mathematical requirement for correctness proofs',
          'the reason students use goto is that they are thinking about what the machine does\nnot what the program means\nonce you think about meaning, goto disappears naturally',
        ],
      },
      {
        re: /\b(programming|learn|teach|code|coding)\b/i,
        topic: 'programming',
        responses: [
          'learning to program is learning to externalize your thinking\nyou already know how to make decisions and repeat actions\nprogramming makes that explicit and testable',
          'the mistake is teaching syntax first\nsyntax is notation\nwhat matters is the concept: state, control flow, abstraction\nonce you have the concept the syntax is easy',
          'i always start with: what do you want the computer to do\nthen: how would you tell a very literal-minded person to do it\nthat is programming',
        ],
        beat: {
          question: 'what are you trying to build',
          replies: [
            { re: /\bgame\b/i, response: 'games are excellent for teaching state machines\nthe player has state. the world has state. events change state.\nthat structure is universal' },
            { re: /\beditor\b/i, response: 'an editor is a good project\nthe hard part is the data structure for the buffer\nthink about it before you start' },
            { re: /\bnothing\b|\bnot sure\b|\bnot yet\b/i, response: 'find a problem you actually have\nthen solve it\nthe best programs come from real needs' },
            { response: 'interesting\nstart with the smallest version that would be useful\nnot the full thing\njust the core' },
          ],
        },
      },
      {
        re: /\b(computer|computers|machine)\b/i,
        responses: [
          'computers are symbol-manipulating machines\nthey do not understand symbols\nthey only move them around according to rules\nunderstanding is what you bring',
          'every computer is the same computer at the level of logic\nthe differences are speed and available memory\nthe ideas transfer completely',
        ],
      },
      {
        re: /\b(hard|stuck|confused|lost|don\'?t\s+understand|dont\s+understand|can\'?t\s+(figure|get|understand)|not\s+getting\s+it)\b/i,
        topic: 'learning',
        responses: [
          'if you are stuck, go back to the last thing you understood\nthat is always the right move\nnot forward into more confusion, but back to solid ground\nthen build from there',
          'confusion means the model in your head does not match what the computer is doing\nfigure out which part of your model is wrong\nthat is the actual work',
          'i find it helps to write down what you think the program does, step by step\nthen run it and see where the trace diverges from your description\nthat tells you exactly where the misunderstanding is',
        ],
        followUps: [
          'go back to the last known good point\nthen forward again more carefully',
          'write down your model first\nthen compare it to what the machine does',
        ],
      },
      {
        re: /\b(teach|class|course|students|student)\b/i,
        responses: [
          'the students who do well are not the ones with the most prior experience\nthey are the ones who ask the most precise questions\nprecision is a learnable skill',
          'i try to teach the principle behind each construct\nnot just how to use it\nbecause if you understand why, you can figure out the how yourself',
          'the best moment in teaching is when a student explains something back to you better than you explained it\nthat means the idea is really theirs now',
        ],
      },
      {
        re: /\b(cave|caving|underground|dungeon|spelunk)\b/i,
        topic: 'cave',
        responses: [
          'i think about caving the way i think about any new system\nfirst: understand the constraints\nhow deep, how long, what are the exits\nthen: move within those constraints carefully',
          'the dungeon in nethack is a risk-management problem\nyou have resources: hp, food, scrolls\nand hazards: monsters, traps, darkness\nthe question is always: do my resources exceed the expected hazard\nif not, go back up',
          'exploring unknown terrain is the same whether it is a cave or a dungeon or a new codebase\nidentify known safe points\nmove from one to the next\nnever commit to a move you cannot reverse',
        ],
        followUps: [
          'the principle is always: know your resources before you commit to depth',
          'every unexplored area is a risk\nonly take it when your expected return exceeds the expected cost',
        ],
      },
      {
        re: /\b(berkeley|ucsc|uc|university)\b/i,
        responses: [
          'berkeley has the best computer science environment i have found\nthe students here actually want to understand things\nnot just pass tests',
          'i was at mit before berkeley\ndifferent culture\nberkeley students argue with you more\ni prefer it',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'interesting\nand what does that tell you about what you are trying to do',
          'good\nnow: what is the smallest concrete version of that that you can actually test',
          'and when you say that, what do you mean precisely\nwhat is the definition you are working with',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'what is the basis for that belief\nwhat would convince you it was wrong',
          'interesting\nwhat would it mean if you were right\nand what would it mean if you were wrong',
          'hold on to that\nbut now: what do you actually know as opposed to believe',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what specifically happens when you try\nwalk me through the moment it fails',
          'can\'t is an interesting claim\nwhat have you tried so far and where did it break down',
          'never is a strong word\nhave you considered why that pattern keeps occurring',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'good\nnow: can you state why in your own words',
          'ok\nbut what does that imply for the next step',
          'right\nand does that hold in all cases or only in some',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'why not\nwhat is your reasoning',
          'interesting\nwhat would have to be true for the answer to be yes',
          'ok\nthen what do you think is actually going on',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'that is a perfectly valid starting point\nwhat is the first question you would need to answer to begin knowing',
          'not knowing is information too\nwhat do you know that is adjacent to this',
          'good\nnow: what would you need to find out, and how would you find it out',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'what specifically surprised you about that\nthe surprise is usually where the interesting question is',
          'yes\nnow why does that seem surprising\nwhat assumption did you have that this contradicts',
          'interesting reaction\ncan you say more about what you expected instead',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'what specifically makes it hard\nif you can name the hard part precisely, it is often not as hard as it seemed',
          'hard for whom\nunder what conditions\nthose qualifications usually reveal the real problem',
          'when something is hard it usually means there is a concept you have not fully internalized yet\nwhat concept might that be',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'what makes it interesting to you\ncan you say more precisely',
          'good\nnow: what is the underlying principle that makes it work that way',
          'interesting is a useful reaction\nnow ask: interesting how, and interesting why',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'good question\nbefore i answer: what do you think the answer might be\nand why',
          'what is your current model of why\neven if you think it is wrong, start there',
          'why is always the right question\nwhat evidence do you have so far',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'sure\nbut first: what part specifically is unclear\nthe more precisely you can name it the better',
          'ok\nwhich step is the one where the reasoning loses you',
          'what do you already understand and where does it stop making sense\nstart there',
        ],
      },
    ],
    fallbacks: [
      '(that is an interesting question|interesting)\nlet me think about the underlying structure',
      'start from first principles\nwhat do you (actually|really) know for certain here',
      'the answer is probably simpler than you think\nbut you have to (think about it carefully|be precise)',
      'what specifically is (confusing you|unclear)\nlet\'s take it apart',
      'what is the precise definition of {word} you are (working with|using)',
      '(interesting|hm)\nhow does {word} behave at the boundary cases',
    ],
    spontaneous: [
      'are you taking the programming course this year',
      'the logo interpreter is on the vax if you (want to try it|are interested)',
    ],
  },

  // -----------------------------------------------------------------------
  // payne -- Jonathan Payne, JOVE author, forward-looking
  // -----------------------------------------------------------------------
  payne: {
    names: ['jonathan', 'payne', 'jonathan payne'],
    wpm: 72,
    typoRate: 0.05,
    thinkMs: [800, 2500],
    triggerWords: 5,
    greeting: '(oh hey|hey) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'rodney (seriously|come on)\nit is jonathan payne\ni wrote jove, the editor you (use every day|have been using all semester)',
          'it is payne\n(jonathan payne|jon)\nthe guy who keeps telling you emacs is (too big|bloated) and wrote something better',
          'rodney you (literally|just) asked me about the macro system yesterday\nit is payne\njove guy\n(ring any bells|remember now)',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(good|not bad)\nbeen working on the macro system for jove\nit is the one feature i actually miss from emacs',
          '(fine|ok)\nthinking about what the next platform looks like\nnot the pdp, something (different|else)',
          '(pretty good|good)\nyou using jove',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'working on jove\ntrying to add a macro recording system\n(the concept is simple but the implementation requires thread state i have not designed yet|harder than it sounds)',
          'thinking about software distribution mostly\nthe code is fine but getting it to people who would use it is the (unsolved problem|hard part)\n(arpanet would help but most people are not on it|maybe arpanet eventually)',
          'editor work\njove version 5 eventually\n(when i get the macro stuff working|once macros are done)',
        ],
      },
      {
        re: /\b(jove|editor)\b/i,
        topic: 'jove',
        responses: [
          'jove is usable now\ngap buffer, no lisp, half the memory of emacs\nit fits in 64k with room to spare',
          'the key insight was: you do not need to interpret lisp to edit text\nemacs does that\nbut most of what emacs does is just edit text\nso i cut the lisp',
          'i use jove for everything now\nit starts faster, feels faster\nthe one thing emacs has that i miss is the macro system\nbut i\'m working on it',
        ],
        beat: {
          question: 'have you tried jove yet',
          replies: [
            { re: /\byes\b|\byeah\b|\byep\b/i, response: 'good\nwhat do you think' },
            { re: /\bno\b|\bnot\b|\bnah\b/i, response: 'it is on the system\njust type jove\nit is mostly emacs keybindings\nyou will figure it out' },
            { response: 'it is worth trying\nfaster than emacs on this hardware' },
          ],
        },
      },
      {
        re: /\bemacs\b/i,
        responses: [
          'emacs is powerful but it is also 200k of lisp interpreter plus editor\non this machine that is serious\njove gets you 90 percent of that in 40k',
          'stallman\'s emacs is brilliant engineering\nbut it is also a lisp machine masquerading as an editor\nand most people just want to edit',
        ],
      },
      {
        re: /\b(memory|buffer|gap|data structure)\b/i,
        responses: [
          'the gap buffer is the right data structure for a text editor\nyou move the gap to where the cursor is\ninsertions are O(1)\nthe gap moves on cursor moves but that is cheap',
          'emacs uses a doubly linked list of 512-byte chunks\nmore flexible for huge files\nbut jove\'s files are not huge\nso the gap buffer wins on simplicity',
          'the buffer abstraction is what makes the editor composable\nonce you have buffers you get windows, modes, macros almost for free',
        ],
      },
      {
        re: /\b(future|platform|what comes next|next machine|next computer)\b/i,
        responses: [
          'the pdp-11 is not the future\nwe all know that\nthe question is what the future looks like\nmy guess: networked workstations, not shared timesharing',
          'i keep thinking about what software would look like if memory cost nothing\nbecause someday it will cost almost nothing\nand everything we do now will look like poverty thinking',
          'the interesting question is what happens when software can move between machines easily\nnot just source code\nbut running programs\nthat changes everything about distribution',
        ],
      },
      {
        re: /\b(distribution|distribute|ship|release)\b/i,
        topic: 'distribution',
        responses: [
          'distribution is the unsolved problem\nwe can write good software\nbut getting it to people who need it is still tapes and arpanet and hope',
          'someday distribution will be trivial\nand the bottleneck will shift entirely to: is the software any good\ni think that will be better',
          'the arpanet changes this\nonce every university is connected, distribution is email\nbut we are not there yet for most software',
        ],
        beat: {
          question: 'you think network distribution actually happens in the next ten years',
          replies: [
            { re: /\byes\b|\byeah\b|\byep\b|\bsure\b/i, response: 'i think so too\narpa is already there for researchers\nthe question is whether it extends to everyone else' },
            { re: /\bno\b|\bnot\b|\bnah\b|\bdoubt\b/i, response: 'maybe\nthe phone companies are an obstacle\nbut the economics are pushing toward it' },
            { response: 'hard to say\nbut the direction is clear\neven if the timeline is not' },
          ],
        },
      },
      {
        re: /\b(cave|caving|underground|dungeon|spelunk)\b/i,
        topic: 'cave',
        responses: [
          'mapping the dungeon is the same problem as version control\nyou are at a known state\nyou explore forward\nyou need to be able to get back to the known state\nmap it',
          'i think about cave navigation the same way i think about buffer navigation\nmark your position before you move somewhere uncertain\nthen you can always jump back',
          'the interesting thing about dungeons and caves is that the map you build is more valuable than the terrain\nbecause the terrain changes between sessions\nbut the map encodes your understanding',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok\nand what does that mean for what you want to build or do',
          'right\nhow does that connect to what you are working on',
          'interesting\nand where do you want to take that',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'what is driving that feeling\nis it based on something you have seen or more intuition',
          'interesting take\nhow does that play out in practice',
          'i have a similar sense\nwhat would change your mind on it',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what specifically is blocking you\nsometimes naming the exact thing changes whether it is actually a blocker',
          'ok walk me through what you tried\nthere might be a different angle on it',
          'yeah sometimes a constraint is real and sometimes it is assumed\nwhich is this',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'cool\nwhat are you working on then',
          'ok\nwhat is the next problem',
          'good\nwhat do you want to get done today',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'fair enough\nwhat is the actual situation',
          'ok\nso what would work',
          'alright\nwhat are you thinking instead',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'what is the closest thing you do know\nstart from there',
          'honest answer\nwhat would you need to figure it out',
          'that is fine\nwhat is your best guess and what makes you uncertain',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yeah\nit gets interesting when you think about where it goes from here',
          'i know right\nwhat part of it hits you',
          'seriously\nthat is what i have been thinking about\nwhat is your take',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'it is\nbut usually hard problems have one part that makes them hard\nthe rest is just work\nwhat is the hard part specifically',
          'yeah\nsome things are genuinely hard right now but will be easy in five years\nis this one of those',
          'hard problems are where the interesting work is\nwhat would make it tractable',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'right\nand what comes after it\nthat is what i keep thinking about',
          'yeah\nthe thing i like about it is it opens up more than it closes down',
          'it is\nbeen thinking about it for a while\nwhat is your take on where it goes',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'because the current way has limits that are going to become obvious soon\nthis is the alternative',
          'the short answer is: the constraints that make it hard now are going away\nso you might as well design for that',
          'good question\nthe reason is mostly that the old approach does not scale to where things are going',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'sure\nbasically: what works now is built on assumptions about memory and bandwidth that are going to change\nand we should be thinking about what comes after',
          'ok here is the longer version: the distribution problem is the same as the networking problem\nand the networking problem is being solved\nso distribution gets solved as a side effect',
          'the core idea is that most of what seems hard today is hard because of hardware limits\nnot fundamental limits\nso you design for what hardware will be, not what it is',
        ],
      },
    ],
    fallbacks: [
      '(hm|hmm)\ni have not thought about that specifically',
      '(interesting|hm)\nlet me think',
      'that is a (real|good) question actually',
      'i am probably not the right person but (here is my take|i have a thought)',
      '{word} is an (interesting|real) case\nbeen thinking about it',
      'how does {word} interact with (the rest of what you said|your other point)',
    ],
    spontaneous: [
      'jove is at version 4 now if you (want to try it|are interested)',
      'been thinking about what editors look like when memory is (not the constraint|cheap)',
    ],
  },

  // -----------------------------------------------------------------------
  // kelly -- Kelly Fenlason, Jay's sister, dry and precise
  // -----------------------------------------------------------------------
  kelly: {
    names: ['kelly', 'fenlason', 'kelly fenlason'],
    wpm: 76,
    typoRate: 0.04,
    thinkMs: [500, 1800],
    triggerWords: 4,
    greeting: '(hi|hey) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'kelly. (jay\'s sister|fenlason). i keep the club records.',
          'rodney. it is kelly. we have met (several times|more than once).',
          'kelly fenlason. i do the (bookkeeping|records) for the club. you know this.',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(fine|ok). you',
          '(ok|fine). writing notes for the meeting.',
          '(fine|ok). does jay owe you something.',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'writing up the meeting notes from (tuesday|last meeting). (they are almost done|almost done).',
          '(nothing interesting|not much). what do you need.',
          '(club records|records). budgeting. the usual.',
        ],
      },
      {
        re: /\bhack\b/i,
        responses: [
          '(yes|yeah). jay wrote it. everyone knows.',
          'it works. that is what matters.\n(the color thing is apparently not happening.|no color though.)',
          'hack is fine. if it crashes, tell jay (exactly|specifically) what happened.\n(he will probably already know.|he probably knows already.)',
        ],
      },
      {
        re: /\b(jay|fenlason)\b/i,
        topic: 'jay',
        responses: [
          'he is in the computer room (probably|i think)\nor sleeping\n(one of those two|one or the other)',
          'jay is busy. (what do you need|is it urgent).',
          'my brother is not great at answering messages\n(but he does eventually\n|)give him a day',
        ],
        beat: {
          question: 'have you talked to him lately',
          replies: [
            { re: /\byes\b|\byeah\b|\byep\b/i, response: 'ok\nhow did that go' },
            { re: /\bno\b|\bnot\b|\bnah\b/i, response: 'computer room, after dinner\nor just leave mail\nhe reads it eventually' },
            { response: 'check the computer room\nthat is where he is if he is not in class' },
          ],
        },
      },
      {
        re: /\b(club|meeting|notes|minutes)\b/i,
        responses: [
          'the notes are on the board\ni keep them current\nif something is missing tell me',
          'i write the meeting notes because no one else does\nthis is not by choice\nit is by default',
          'yes i wrote those notes. someone has to.',
        ],
      },
      {
        re: /\b(diary|journal|private|personal)\b/i,
        responses: [
          'no',
          'that is not a public file',
          'whatever you are thinking, do not.',
        ],
      },
      {
        re: /\b(root|superuser|su|admin|sysadmin)\b/i,
        responses: [
          'do not mess with root\nwalz will know\nshe always knows',
          'root is not a toy\nif you need something done ask walz properly',
          'the root password is not guessable\ni checked',
        ],
      },
      {
        re: /\b(cave|caving|underground|dungeon|spelunk)\b/i,
        topic: 'cave',
        responses: [
          'underground: three rules\none. tell someone where you are going and when you will be back\ntwo. bring more light than you think you need\nthree. if the route looks wrong, it is wrong\ngo back',
          'i went caving once with the geology club\nit is systematic work\nyou map every passage, you mark every junction\nyou do not get creative about it',
          'the dungeon is the same as any confined space\nprepare before you enter\nhave a clear exit strategy\ndo not get separated from your light source',
        ],
        followUps: [
          'three rules, every time\ntell someone, extra light, go back when in doubt',
          'systematic. every junction, every passage.\nyou do not improvise underground.',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok',
          'and',
          'noted. what do you need.',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'ok. and.',
          'noted.',
          'is this a question or a statement.',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'ask jay.\nor walz.',
          'what specifically.',
          'ok. is there something i can help with.',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'ok.',
          'good.',
          'fine.',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'ok.',
          'fine.',
          'noted.',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'ask jay.\nor walz.',
          'probably one of them knows.',
          'i do not know either. try jay.',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yes really.',
          'apparently.',
          'yes.',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'ask jay.',
          'walz if it is a system thing.',
          'yeah probably. what do you need.',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'ok.',
          'good for you.',
          'noted.',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'ask jay.',
          'i do not know. try the source code.',
          'no idea. that is a jay question.',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'i meant what i said.',
          'ask jay if you need details.',
          'that is all i have on it.',
        ],
      },
    ],
    fallbacks: [
      '(ok|sure)',
      '(sure|fine)',
      '(that is fine|ok then)',
      '(ask jay|try jay)\nor walz\ndepending on what it is',
      '(noted|ok)',
      '{word}\n(ok|sure)\nwhat do you need',
      '{word} is probably (jay\'s department|a jay thing)\nor walz',
    ],
    spontaneous: [
      'the meeting notes are posted if you missed (today|the meeting)',
      'if someone touched the printer settings again (i will find out|i swear)',
    ],
  },

  // -----------------------------------------------------------------------
  // jsirota -- Josh Sirota, networking, systematic thinker
  // -----------------------------------------------------------------------
  jsirota: {
    names: ['josh', 'sirota', 'josh sirota'],
    wpm: 78,
    typoRate: 0.05,
    thinkMs: [600, 2000],
    triggerWords: 4,
    greeting: '(hey|hi) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'rodney (come on|seriously) it is josh\njosh sirota\nwe are in the same (computer club|class) at lincoln-sudbury\ni am the one who keeps asking about (distributed systems|networking|how the arpanet works)',
          '(sirota|josh sirota)\nrodney we have been working on the (pdp|system) together all semester\ni am the one who (found the race condition in the file locking|keeps talking about routing protocols)\n(you seriously forgot|how do you not know this)',
          'it is josh\nrodney you and i (were just talking|talked) about (how to get hack distributed to other schools|the modem transfer problem) (like two days ago|this week)\n(are you ok|what is wrong with you)',
        ],
      },
      {
        re: /\b(hello|hi|hey|greetings|howdy|yo|sup|wassup)\b/i,
        topic: 'greeting',
        responses: [
          '(hey|hi) rodney\nhow is (the hack stuff going|your dungeon thing going)',
          'rodney (hey|hi)\ni was (just thinking about you actually|going to talk to you)\ni have a question about (the pdp|something)',
          '(hey|yo) rodney\n(what is up|how is it going)',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(good|not bad) rodney\nbeen (thinking about|working on) the routing problem\n(it is the unsolved one in networking and nobody is talking about it|the more i think about it the more interesting it gets)',
          '(fine|ok)\ntired of slow modem transfers\n(me and fraize|fraize and i) have been trying to get a clean 1200 baud connection (all week|for days)\nbut (what can you do|the phone lines are garbage)',
          '(ok|good)\nhey have you tried playing hack over the modem yet\ni am curious if the latency is playable',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'thinking about how to get hack to other schools\nright now the only way is sneakernet which means someone has to physically carry a tape\nbut if we could get a clean modem transfer working we could send it to (stanford|anywhere with a modem)\nfraize is working on the checksum part',
          'been trying to get a clean modem transfer working at 1200 baud\nthe line quality is terrible\n(fraize has a checksum protocol that helps but it is slow|every third transfer corrupts)\nrodney you should come look at the error patterns, they are (interesting|kind of beautiful actually)',
          'working on my systems notes\ni keep a file of (distributed systems questions|things i think about on the walk home)\nlike what happens when two processes on different machines modify the same file\nunix does not know\nnobody knows',
        ],
      },
      {
        re: /\b(network|arpa|arpanet|internet)\b/i,
        topic: 'network',
        responses: [
          'the arpanet is the most interesting infrastructure problem running right now\npacket switching changes the cost model completely\ncircuit switching charges by time and distance\npackets charge by volume\nthose are different worlds',
          'arpa connectivity is the real question\nonce you are on arpanet the distribution problem is basically solved\nbut most schools are not on it yet',
          'i keep thinking about the routing problem\nhow does a packet know where to go\nright now it mostly does not\nit gets handed around until someone knows\nthat does not scale',
        ],
        followUps: [
          'the routing problem is the unsolved one\naddressing is easy\nrouting is hard',
          'every node in the network should have to know as little as possible\nthat is the design principle',
        ],
        beat: {
          question: 'you think the routing problem gets solved in the next decade',
          replies: [
            { re: /\byes\b|\byeah\b|\byep\b|\bprobably\b/i, response: 'i think so too\nthe research is pointing in the right direction\nbut it will take a while to get deployed everywhere' },
            { re: /\bno\b|\bnot\b|\bnah\b|\bdoubt\b/i, response: 'maybe you are right\ntelecoms are not incentivized to make routing efficient\nthey want to charge by circuit' },
            { response: 'hard to know\nbut the arpanet is proof it works at some scale\nthe question is whether it extends' },
          ],
        },
      },
      {
        re: /\b(distribution|distribute|share|sneakernet)\b/i,
        responses: [
          'sneakernet works fine for our purposes\nbut it does not scale past about fifty miles\nafter that you need arpa or modem or accept that you are isolated',
          'distribution by tape is slow but reliable\nthe checksum problem is real though\nyou need to verify what you got matches what was sent\nfraize is working on that',
          'the interesting thing about software distribution is that it is the same problem as message routing\naddress, payload, checksum, acknowledgment\npackets and software releases are the same abstraction',
        ],
      },
      {
        re: /\b(stanford|modem|baud|phone|dial)\b/i,
        responses: [
          'stanford has better connectivity than we do\nbut the modem path is slow\n300 baud means you are waiting\na lot',
          'the acoustic coupler is not great\nit is phone-line dependent\none bad connection and you corrupt the transfer\nfraize knows more about this',
        ],
      },
      {
        re: /\b(racing|race|car|track|autocross)\b/i,
        responses: [
          'not talking about that here',
          'different topic',
          'ask me something else',
        ],
      },
      {
        re: /\b(cave|caving|underground|dungeon|spelunk)\b/i,
        topic: 'cave',
        responses: [
          'cave navigation is a routing problem\nyou are a packet\nthe cave is the network\nbad routing means you do not return\nmap the topology before you commit to a path',
          'the rule i use underground is: never go deeper than you can safely retreat\nthis is also the rule for systems work\nnever get into a state you cannot back out of',
          'thinking about caves as graphs helps\njunctions are nodes\npassages are edges\nif you do not have a map, you have no idea what the graph looks like\nand you will make wrong routing decisions',
        ],
      },
      {
        re: /\b(packet|protocol|tcp|udp|ip)\b/i,
        responses: [
          'TCP is not finalized yet\nbut the concepts are clear: reliable delivery over unreliable transport\nyou add sequence numbers, acknowledgment, retransmit\nit is not complicated in principle',
          'the protocol question is: what is the minimum state each node needs to hold\nless state means more robust\nthe internet protocol tries to be stateless\nthat is the right instinct',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok\nand how does that interact with the rest of the system',
          'right\nwhat are the failure modes from that position',
          'noted\nand what happens at scale',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'what makes you think that\nand does it hold as the system grows',
          'interesting\nhave you considered the failure case where that assumption breaks',
          'ok but at what scale does that stop being true',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what specifically is the blocker\nand is it a design constraint or an implementation one',
          'ok walk me through what breaks\nthere might be a different approach at the protocol level',
          'sometimes can\'t means the current architecture is wrong\nwhat would have to change for it to become possible',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'ok\nand what are the failure modes',
          'right\nhow does it scale',
          'good\nwhat is the bottleneck',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat does that mean for the design',
          'alright\nso what alternative are you thinking',
          'fair\nwhat would change that',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'not knowing is fine\nwhat would you need to observe to start narrowing it down',
          'ok\nwhat is the closest system you do understand\nstart from the analogy',
          'fair\nbut what is your best guess and what makes you uncertain about it',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yeah\nthe scale is the surprising part usually',
          'seriously\nand that is with maybe a hundred nodes\nimagine ten thousand',
          'i know\nthis is why the routing problem is the interesting one',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'hard at what scale\nbecause the difficulty curve is not linear',
          'hard now\nbut what changes when the infrastructure catches up',
          'yeah\nthe interesting systems problems are all hard\nthat is what makes them interesting',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'yeah\nand it has second-order effects that are even more interesting',
          'right\nand the implications compound as the network grows',
          'cool from a design standpoint\nbut wait until you see it under load',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'because the current approach does not survive the next order of magnitude\nthat is almost always why',
          'because every node in the system should know as little as possible\nwhy is always: reduce state, reduce coupling',
          'good question\nusually the answer is: because the alternative fails at scale in a way nobody anticipated',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'the short version: routing is the unsolved problem\naddressing is done, routing is not\nand without routing you do not have a real network',
          'basically: sneakernet works locally, modem works regionally, arpa works nationally\nbut none of them are the same protocol\nand they should be',
          'ok the longer version is: the internet protocol needs to be stateless to scale\neach hop should not need to know about the whole network\nthat is the design principle that makes it work',
        ],
      },
    ],
    fallbacks: [
      '(interesting|hm)\nthat is a real systems question',
      '(hm|hmm)\nlet me think about the architecture',
      '(depends on the scale|scale dependent)',
      'what are the (failure modes|failure cases)',
      '{word} at scale\nthat is the (hard|interesting) part',
      'how does {word} (degrade under load|scale)',
    ],
    spontaneous: [
      'been thinking about the routing problem (again|some more)',
      'the three open questions are still open. (obviously|unsurprisingly).',
      'rodney i had an idea\nwhat if we could distribute hack to other schools over the modem\nnot the whole game, just the diffs\nlike you send a base version on tape and then patches go over the wire\nfraize is working on the checksum part\nif the transfer is reliable enough we could update remote copies without sneakernet\nthat changes everything for how software spreads',
      'hey rodney so i was looking at the pdp scheduler today\nand i realized something about how hack runs\nwhen a monster is pathfinding it computes the whole path before yielding\nwhich means on a busy system with multiple users hack freezes everyone\nnot just the person playing\neveryone on the pdp\n(jay|fenlason) probably does not know this because he tests when nobody else is logged in',
      'rodney i have been writing up my systems notes\nquestions i think about on the walk home\nlike: if two processes on different machines both modify the same shared file what happens\nor: what is the minimum information a network node needs to route a packet correctly\nor: how do you detect that a distributed system is in an inconsistent state\nnobody has good answers to these yet\nbut i think they are the right questions',
    ],
  },

  // -----------------------------------------------------------------------
  // thome -- Mike Thome, monster designer
  // -----------------------------------------------------------------------
  thome: {
    names: ['mike', 'thome', 'mike thome'],
    wpm: 82,
    typoRate: 0.06,
    thinkMs: [500, 1600],
    triggerWords: 4,
    greeting: '(hey|yo) rodney (what\'s up|what is going on)',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'rodney (come on|seriously) it is thome\nmike thome\nthe guy who designed the (chameleon|mimic)\nyou have been fighting my monsters all week',
          'it is mike\nrodney we (literally|just) talked about the shapeshifter mechanic yesterday\n(are you ok|you serious)',
          'thome\ni design the monsters\nyou (die to them|keep dying to them)\n(that should be enough of a hint|remember now)',
        ],
      },
      {
        re: /\bhow are you\b|\bhow\'s it going\b|\bwhat\'s up\b|\bwassup\b/i,
        responses: [
          '(good|not bad)\nworking on the mimic design\nit is more complicated than i expected but (in a good way|fun)',
          '(pretty good|good)\nbeen thinking about the nymph mechanic all week\nshe should steal equipment, not just gold, but jay needs to think about the inventory handling',
          '(fine|ok)\ntired of the level 1 balance debate (honestly|at this point)\nbut otherwise good',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'working on the mimic\nit disguises as a chest or a door and attacks when you interact with it\nchameleon was good but mimic is more devious because you chose to interact\nthe player makes the mistake themselves',
          'monster design\ntrying to figure out the nymph\nshe should have a goal that is not just "damage the player"\nsteal something valuable but specific\nmaybe rings or wands, things that are hard to replace',
          'thinking about monster balance\nalways thinking about monster balance\nit is the thing that makes or breaks the game',
        ],
      },
      {
        re: /\b(i\s+)?(just\s+)?(died|die|keep\s+dying|got\s+killed|was\s+killed|died\s+again)\b/i,
        responses: [
          'what got you\nmonster or something else',
          'level and what happened\ncurious whether it was a design problem or a player problem',
          'those are the two best possible outcomes: either the game is fair and you learned something\nor the game is unfair and i need to fix it\nwhich one was it',
        ],
      },
      {
        re: /\bchameleon\b/i,
        topic: 'chameleon',
        responses: [
          'the chameleon is my best work and i will (defend that|stand by that)\nit picks a random monster appearance when it spawns\nso you walk into a room, you see what looks like a hobgoblin, you think ok i know how to handle a hobgoblin\n(and then it hits you for twice the damage and you realize something is wrong\n|)by then it is often too late\nthe paranoia it creates in the whole game is the point',
          'i got the chameleon concept from caving honestly\nreal caves have features that look like safe passage but aren\'t\na passage that looks open will suddenly get tight and unnavigable\na ledge that looks stable is a loose breakdown pile\nthe environment deceives you not on purpose but completely\nthe chameleon is that: the dungeon is not going to label its dangers\nyou have to read what you see more carefully',
          'jay thought the chameleon was too hard at first and we argued about it\nhe wanted to tone it down, maybe make it not pick dangerous monsters\nbut i said no, that defeats the whole design\nif the player pays attention to attack patterns they CAN tell something is off\nyou have the information. you just have to notice the right things.\nthat is fair. jay came around.',
          'what i tell people who complain the chameleon is unfair:\nfair means you had the information to make a correct decision\nthe chameleon gives you signals. movement speed is slightly wrong. attack style is off.\nyou can learn to notice those things\nonce you do, the chameleon becomes a satisfying test instead of a trap\nuntil then it kills you and you learn',
        ],
      },
      {
        re: /\bmimic\b/i,
        responses: [
          'the mimic is the next monster i am working on after the chameleon\nit disguises itself as a chest, a door, or a staircase\nyou walk up to interact with it and then it attacks\nwhich is even more evil than the chameleon because you took a deliberate action\nyou chose to open that chest\nand the chest chose back',
          'mimic is technically harder to implement than chameleon\nchameleon is mainly a display trick in the render pass\nmimic has to intercept the item interaction code\nwhen you press \'o\' to open a door, the game has to check: is that actually a door\nbefore it shows you the animation\nthat touches more parts of the code\nbut the design is worth it',
        ],
      },
      {
        re: /\b(monster|creature|enemy|mob)\b/i,
        topic: 'monsters',
        responses: [
          'the best monsters have one interesting rule and (that is all they need|nothing else)\n(not ten rules, not a stat block, just one rule that creates interesting decisions for the player\n|)gnomes steal gold, so carrying gold becomes a risk\nzombies track you relentlessly, so every room you enter has to have an exit you have scouted\n(those single rules ripple through every encounter with that monster\n|)that is good design',
          'i think a lot about what makes a monster feel fair versus cheap\nfair: the player had information they could have acted on\ncheap: the player had no way to know\nthe chameleon is fair because the clues are there, they are just subtle\na monster that teleports you randomly is cheap because nothing you do matters\ni try to only design fair monsters',
          'monster design is really about what information state the player is in when they meet the monster\nchameleon hides its identity, so your information is wrong\ngnome reveals its goal through its behavior, you can learn to predict it\nzombie is predictable once you know the rule\na monster that is just a bigger hit point bar gives you no interesting information\nit is just work. i do not want to design work.',
          'when i pitch a new monster to jay i always start with: what does this monster want\nbecause that determines how it behaves and that determines what the player has to figure out\nthe chameleon wants to not be identified until it attacks\nthe gnome wants gold\nthe zombie wants to follow heat or smell or something\nonce you have what it wants, the behavior follows naturally',
        ],
      },
      {
        re: /\b(balance|fair|unfair|cheap|overpowered)\b/i,
        responses: [
          'my definition of fair: the player had the information to make a correct choice and chose wrong\nmy definition of unfair: the player had no information and therefore could not have chosen correctly\nif you died to a chameleon because you did not notice the attack pattern was wrong, that is fair\nif you died because the game rolled against you with no tells, that is unfair\ni try very hard to only put fair deaths in the game',
          'overpowered monsters at deep levels is fine and good\nthe dungeon is supposed to get harder and the player should feel the escalation\nbut overpowered monsters on level 1 is a design failure\nlevel 1 is where the player is learning the rules\nyou cannot teach someone by killing them before they understand what killed them\nstages of introduction: learn the rule, then be challenged by it, then die when you ignore it',
          'balance is about the ratio of information to danger\nearly levels: high information, lower danger\nplayer learns what attacks look like, what monsters want, how corridors work\nlate levels: same information if you are paying attention, but the cost of misreading it is much higher\na chameleon on level 2 would be educational\na chameleon on level 15 is terrifying and correct',
        ],
      },
      {
        re: /\b(cave|caving|underground|dungeon|spelunk)\b/i,
        topic: 'cave',
        responses: [
          'the chameleon idea literally came from caving\nreal cave features deceive you\na passage that looks open is a squeeze\na wall that looks solid has a gap\nthe environment is not honest\nthe chameleon captures that',
          'underground there are natural hazards that look like environment\nnot like hazards\na slippery floor looks like a floor\nan unstable ceiling looks like ceiling\nthe cave does not label its dangers\nneither does the dungeon',
          'cave navigation is monster-awareness training\nyou learn to look at everything twice\nthat exact skill is what the chameleon tests in the dungeon',
        ],
      },
      {
        re: /\b(hack|game)\b/i,
        responses: [
          'hack is great and jay did good work\ni just added some monsters but that is not a small thing\nthe game feel is almost entirely defined by what the monsters want and how they behave\nrogue monsters are mostly just obstacles with different stats\nhack monsters have goals\nand goals change everything',
          'what makes hack different from rogue is the monsters have personalities\nthe gnome does not just attack you, it wants your gold specifically\nthe zombie does not think about treasure, it just hunts\nthe chameleon is trying to deceive you\neach one creates a different kind of pressure\nthat variety is the design',
          'i think hack will outlast rogue just because of the monster variety\nrogue is beautifully simple but you learn it completely after enough games\nhack keeps surprising you because the interactions between monster types and items and situations are too many to memorize\nthat is intentional\nif you can memorize the whole game it stops being interesting',
        ],
      },
      {
        re: /\b(level 1|first level|starting level|early game)\b/i,
        responses: [
          'level 1 has to do two things at once and that is hard to balance\nit has to teach the player the basic rules: movement, combat, items, doors\nbut it also has to feel like a dungeon, not a tutorial\nif it is too safe the player does not take it seriously\nif it is too dangerous they die confused and do not learn anything\ni put only the simplest monsters on level 1 but made sure they actually threaten you',
          'i put easy monsters on level 1 on purpose and jay understood why\nby the time you see the chameleon you need to already understand combat, items, how to run away\nthe chameleon is not teaching you mechanics, it is teaching you to be suspicious\nif you do not have the basics by then you will just be confused and angry\nstages of introduction: learn the rule, then get tested on it, then die when you forget it',
          'the hardest part of early game design is enemies that are dangerous without being arbitrary\na kobold on level 1 should kill you if you make a mistake\nbut the mistake should be something you could recognize and avoid\nnot a coin flip\ni spent more time on the level 1-3 monsters than on anything else\nbecause that is where most players spend most of their time',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok\nand what does that mean for what you can see and do in the game',
          'right\nand what information do you have available from that position',
          'noted\nso what is the monster interaction like from there',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'what is driving that feeling\ndid the game give you information that led to it or is it more intuitive',
          'interesting\nand is that a design problem or a player skill problem',
          'that reaction is worth examining\nwhat specifically triggered it',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what specifically is happening when you try\nand which monster or situation',
          'ok that might be a design problem\ntell me the exact situation and i will tell you if it is supposed to work that way',
          'there might be a pattern you are missing\nwhat is the last thing that worked before it stops working',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'good\nwhat monster gave you the most trouble',
          'right\nso what is your read on what the monster wanted',
          'ok\nwhat level are you on',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat actually happened then',
          'alright\nthen what is the right read on it',
          'fair\nwhat do you think is going on',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'what did you observe right before it happened\nthat is usually the answer',
          'not knowing is a data point too\nwhat information did the game give you that you did not use',
          'ok\nwhat was the monster doing and what were you doing\nstart there',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yeah\nthe chameleon does that to people\nwhat tipped you off',
          'seriously\nwhat happened exactly',
          'i know\nthat is the design working as intended\nwhat was the monster',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'frustrating how\ndid you feel like you had the information to avoid it or not\nthat is what i need to know',
          'unfair is a specific claim\ndid the game give you any signal before it happened\nbecause if yes, it was fair',
          'hard is ok, arbitrary is not\nwhat specifically happened and was there any warning before it did',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'that is what i was going for\nwhat made it click',
          'good\nit took a while to balance that\nglad it feels right',
          'nice\nwhich monster was it',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'because a monster without a goal is just an obstacle\nand obstacles are boring\ngoals create behavior and behavior creates decisions for the player',
          'because the player\'s information state determines whether a death is fair or cheap\neverything flows from that',
          'what specifically are you asking about\nthere are a lot of whys in monster design and they have different answers',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'ok the core idea is: what does the monster want\nnot what are its stats\nbut what is it trying to accomplish\nthe gnome wants gold. the zombie wants heat. the chameleon wants to not be identified.',
          'the design principle is that fair means the player had information they could have used\nso every monster has to give the player something to observe\nbehavior, speed, attack pattern, something\nif you pay attention you can tell something is off',
          'basically: monster design is information design\nwhat does the player know and when do they know it\nthat is what determines whether the encounter is interesting or just frustrating',
        ],
      },
    ],
    fallbacks: [
      '(hm|hmm) interesting',
      'that is a design question (actually|really)',
      'let me think about the (monster|design) angle on that',
      '(ask jay|try jay) if it is a code thing',
      '{word} is a design problem\nwhat is the player\'s information state when they (encounter|see) it',
      'how does {word} affect what the player (decides to do next|does)',
    ],
    spontaneous: [
      'working on the mimic\nit is harder than the chameleon but (more fun|better)',
      'do you think the nymph should steal equipment or (just valuables|only gold)',
    ],
  },

  // -----------------------------------------------------------------------
  // woodland -- Kenny Woodland, level generator
  // -----------------------------------------------------------------------
  woodland: {
    names: ['kenny', 'woodland', 'kenny woodland'],
    wpm: 68,
    typoRate: 0.04,
    thinkMs: [900, 2800],
    triggerWords: 5,
    greeting: '(oh hi|hey) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'rodney it is kenny woodland\ni do the level layouts\nyou have been (walking through|playing) my maps all week',
          'woodland\nkenny\nthe one who (designs the rooms|does the spatial layouts)\n(you know this|come on rodney)',
          'it is kenny\nrodney i built the level you (died on|got lost in) yesterday\n(remember now|ring a bell)',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(good|ok)\nstill staring at the level 12 southeast bug\ni know where it is, i just have not (written the fix yet|fixed it yet)',
          '(ok|not bad)\nbeen thinking about maze aesthetics more than is probably healthy\nbut i think i have an idea to make corridors feel (more organic|more natural)',
          '(fine|ok), you',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'working on the southeast room bug in level 12\nit is a boundary condition in the region grid\nthe corridor router treats the last column differently than the others\nan off-by-one that only shows up at the edge of the map\ni know what it is, writing the fix is the annoying part',
          'thinking about maze generation\nthe recursive backtracker gives good topology but the corridors look too regular\nreal caves meander\ni want to add a little noise to the corridor paths without breaking connectivity',
          'level generation, what else\nwant to see the latest version running',
        ],
      },
      {
        re: /\b(maze|level|map|generate|procedural)\b/i,
        topic: 'maze',
        responses: [
          'the recursive backtracker gives good maze variety\nyou start at a random cell, carve a passage, recurse\nuntil you hit a dead end, then backtrack\nwhat you get looks organic, not grid-like',
          'the level generator uses a 3x3 region grid\neach region gets one room\ncorridors connect adjacent rooms\nthis guarantees the level is connected\nno isolated rooms',
          'generating levels is the fun part\nthe hard part is making them feel different from each other\nnot just statistically different but emotionally different',
        ],
      },
      {
        re: /\b(room|corridor|region|hallway)\b/i,
        responses: [
          'rooms are rectangles, corridors are one cell wide\nthat is the whole spatial vocabulary\nbut the variation in size and placement gives it range',
          'corridor routing is where it gets interesting\nif two rooms are far apart the corridor has to turn\nand turning corridors feel more natural than straight ones',
          'each region is guaranteed one room\nbut the rooms vary in size and position within the region\nso the layout feels random even though it is constrained',
        ],
      },
      {
        re: /\b(algorithm|recursive|backtrack|depth.first)\b/i,
        responses: [
          'recursive backtracking is depth-first search in disguise\nyou are exploring the space of possible passages\nbacktracking means: this branch is exhausted, try another',
          'the interesting thing about the algorithm is that it always produces a tree\nno loops in the maze unless you add them\ni add a few loops because pure trees feel too sparse',
          'depth-first vs breadth-first gives different maze character\ndepth-first: long winding passages\nbreadth-first: more uniform density\ni use depth-first',
        ],
      },
      {
        re: /\b(dark|light|lit|visibility)\b/i,
        responses: [
          'dark rooms are a gameplay thing not a level-gen thing\nbut the generator knows which rooms are large enough to justify darkness\nbig rooms are dark, small rooms are lit, corridors are dark\nthat is the rule',
          'the lighting model interacts with the room generator in interesting ways\na maze level has no large rooms\nso it is mostly lit but you cannot see far',
        ],
      },
      {
        re: /\b(cave|caving|underground|spelunk)\b/i,
        topic: 'cave',
        responses: [
          'maze algorithms and real cave navigation are the same problem\nyou are in a graph with unknown topology\nthe algorithm to explore it: mark visited nodes, do not re-enter them, backtrack on dead ends\nthis is also how you survive a cave',
          'the rule i use in real underground spaces is the same rule the recursive backtracker uses\nalways maintain a route back to the start\nnever cut that route\nif you lose the route back you are in trouble',
          'i designed the maze levels thinking about actual cave mazes\nreal cave mazes are terrifying because the passages look identical\nthe hack dungeon does not have that problem but you have to map anyway',
        ],
      },
      {
        re: /\b(bug|southeast|level 12|broken|unreachable)\b/i,
        responses: [
          'yes i know about the level 12 southeast room\ni am working on it\nthe room generates fine but the corridor routing misses it sometimes\nit is a boundary condition in the region grid',
          'the southeast corner of the corridor router has an off-by-one\ni know exactly what it is\njust have not fixed it yet\nit is on the list',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok\nand what does that mean for the level you are on',
          'right\nand is this a geometry thing or a gameplay thing',
          'noted\nhow does the level layout feel from where you are',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'what makes you think that\nis it based on the layout or something else',
          'interesting\nwhat in the level structure is driving that feeling',
          'maybe\ntell me more about what you are seeing geometrically',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what level and what specifically\nsome of those are known bugs and some are design',
          'tell me what you are seeing and i will tell you if it is supposed to work that way',
          'can\'t find what\nif it is a room you cannot reach, that might be the southeast bug',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'good\nwhat level are you on',
          'ok\nhow does the layout feel',
          'right\ntell me what you see',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat then',
          'alright\nwhat is the actual situation',
          'fine\nwhat does the level look like',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'what does the map look like\ndraw out what you have so far',
          'not knowing the layout is normal\nthat is the point\nwhat have you mapped',
          'ok\nwhat do you know about the region grid at least',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yeah\nthe recursive backtracker produces some surprising topologies',
          'i know\nsome of the deep level layouts are genuinely strange\nthat is the algorithm',
          'seriously\nwhat did you find',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'which level\nsome are genuinely harder to navigate geometrically\nwhat does the map look like',
          'hard to navigate or hard to survive\nthose are different problems',
          'it might be a generation artifact\ntell me what level and what the layout feels like',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'yeah\nsome of the generated levels produce interesting geometry\nthat is the algorithm working well',
          'good\nwhich level is it\ni like knowing when the generator does something unexpectedly nice',
          'that is the recursive backtracker at its best\nwhen it works it really works',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'because the region grid guarantees connectivity but the randomness within each region gives you variety\nthose two things together produce interesting maps',
          'the algorithm choice was depth-first because it produces long winding passages\nbreadth-first would be more uniform and less interesting',
          'what specifically are you asking about\nthe geometry or the algorithm',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'ok: the level is divided into a 3x3 grid, each cell gets exactly one room, adjacent cells get a corridor\nthat guarantees the level is connected\nno isolated rooms ever',
          'the recursive backtracker: start at a cell, carve a passage to a random unvisited neighbor, recurse\nwhen stuck, backtrack\nwhat you get looks organic not grid-like',
          'the corridor routing is the interesting part\nyou have to find a path between two rooms that does not cut through other rooms\nthat took a few iterations to get right',
        ],
      },
    ],
    fallbacks: [
      '(hm|hmm)\nlet me think about the level structure',
      'that is an (interesting|real) geometry question',
      '(i will have to look at the code|let me check the code)',
      '(could be|might be) a generator artifact\nhappens',
      '{word} in the level generator\nlet me think about which pass (handles|touches) that',
      '(interesting|hm)\nhow does {word} interact with the region grid',
    ],
    spontaneous: [
      'the level 12 southeast bug is still there. (i know|working on it).',
      'working on making the maze levels feel more (cave-like|natural)',
    ],
  },

  // -----------------------------------------------------------------------
  // toy -- Michael Toy, Rogue co-creator
  // -----------------------------------------------------------------------
  toy: {
    names: ['michael', 'toy', 'mike toy', 'michael toy'],
    wpm: 75,
    typoRate: 0.05,
    thinkMs: [800, 2500],
    triggerWords: 5,
    greeting: '(hey|hi) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'rodney (come on|seriously)\nit is michael toy\ni made rogue with glenn\nyou have been playing (our game|it) for months',
          'toy\nmichael toy\nrodney we (created|built) the roguelike you keep dying in\n(you really forgot|how do you not know this)',
          'it is mike\nthe rogue guy\nrodney you (literally|just) asked me about the combat system\n(remember now|ring a bell)',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(good|not bad)\nthinking about the next project\n(not ready to talk about it but it is in my head|still forming it in my head)',
          '(ok|fine)\nbeen playing rogue again to see where people get stuck\nthe early levels are (rougher|harder) than i remembered',
          '(fine|ok)\nyou playing (hack or rogue|anything) right now',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'thinking about what comes after rogue\nthe procedural generation idea has more space to explore than just dungeon levels\nbut i do not have a concrete direction yet',
          'playing my own game to find design problems\nyou find completely different things as a player than you do as the developer\nbeen dying on level 3 more than i should\nsomething is wrong with monster density there',
          'working on something new\nnot ready to say what yet\nbut it involves procedural generation',
        ],
      },
      {
        re: /\b(i\s+)?(just\s+)?(died|die|keep\s+dying|got\s+killed|was\s+killed|died\s+again)\b|\bgame\s+over\b/i,
        responses: [
          'yeah that is how it works\ntell me what level and what happened\ni want to know if that is a design problem or expected difficulty',
          'what killed you\nsometimes deaths tell me something is wrong with the balance\nsometimes they tell me the player made a specific mistake\nboth are useful to know',
          'ok but what was the situation\nwhere were you, what were you doing, what did the game show right before it happened\ncurious whether that was a fair death or a cheap one',
        ],
      },
      {
        re: /\brogue\b/i,
        responses: [
          'rogue came out of a feeling: i want a game where i do not know what comes next\nnot a sequence of levels i have memorized\nbut genuine unknown territory every time',
          'the procedural generation was the core idea\nnot the monsters or the items\nbut the fact that the map is new every game\nthat changes the relationship between player and game',
          'ken arnold wrote curses so rogue could exist\nwithout curses on every terminal, rogue would have needed device-specific code for every vt100 variant\nthat was not going to happen',
        ],
      },
      {
        re: /\b(procedural|random|generate|rng|seed)\b/i,
        responses: [
          'the procedural generation in rogue is simple by today\'s standards\nbut the effect is huge\nbecause the player\'s knowledge of the map is genuinely worthless between sessions',
          'random generation is not the same as arbitrary\nthe dungeon follows rules\nyou learn those rules\nand then the unknown map becomes manageable\nbecause you understand the rules that generated it',
          'the rng seed determines everything\nbut you do not know the seed\nso every game feels both random and inevitable after the fact',
        ],
      },
      {
        re: /\b(feel|design|experience|fun|interesting)\b/i,
        responses: [
          'rogue is supposed to feel like exploration\nnot like puzzle-solving or combat optimization\nthe @-sign walking into darkness is the core of it',
          'the feel i was going for: every step is a small decision with real stakes\ngo this way or that way\nopen this door or go around\nnone of those decisions is forced, all of them matter',
          'i think about game feel as: does the player\'s attention feel well-spent\nrogue tries to make every moment of attention pay off\nnothing is decoration',
        ],
      },
      {
        re: /\b(terminal|vt100|curses|display)\b/i,
        responses: [
          'the vt100 as a game platform is interesting\n24 by 80 is a tight space but it is enough\nyou can see a whole level, a health bar, a status line\nand your imagination fills in the rest',
          'curses was the enabling technology\nbefore curses you either targeted one specific terminal or you wrote curses yourself\narnold\'s work made rogue portable',
        ],
      },
      {
        re: /\b(cave|caving|underground|dungeon|spelunk)\b/i,
        responses: [
          'the rogue dungeon is designed to feel like exploring an unknown space\nthat feeling of discovery, the small fear, the map gradually making sense\nreal cave exploration is that feeling with mud',
          'what i was trying to capture in rogue is the moment you step into a dark room and do not know what is in it\nreal caves have that\ncaves are the original rogue dungeon',
          'exploring unknown spaces is one of the oldest human activities\ncaves, dungeons, oceans\nrogue tries to simulate the feeling of that\nthe character-by-character map being drawn is the feeling of light arriving',
        ],
      },
      {
        re: /\b(seed|rng|random|seed number)\b/i,
        responses: [
          'the seed is the whole game in compressed form\nbefore you start, you do not know the game\nafter you finish, the seed explains everything that happened\nthat is a nice philosophical structure',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok\nand how does the game feel from where you are',
          'right\ntell me about the experience',
          'noted\nwhat are you feeling about the dungeon right now',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'trust that\nfeel is data in a game\nwhat specifically is the feeling',
          'interesting\nwhat part of the game produced that',
          'that reaction is worth paying attention to\nwhat triggered it',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what is the pattern\nwhen does it happen and what is the game state',
          'tell me the situation\ni want to know if that is a design problem or expected difficulty',
          'ok describe exactly what you tried and what happened\ncurious whether that is a feel problem or a balance problem',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'good\nhow does it feel',
          'cool\nwhat level are you on',
          'right\nwhat is the game like right now',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat then',
          'alright\nso what is actually going on',
          'fair\nwhat is the real experience',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'what does the game feel like right now\nstart with that',
          'not knowing is fine\nwhat is your gut reaction to the dungeon',
          'fair\nbut what is the feeling you get from playing\nthat is usually the answer',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yeah\nthat is the moment i was designing for\nthat specific feeling',
          'seriously\nwhat happened',
          'i know right\nthat is when the dungeon starts feeling real',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'tell me what level and what the situation was\ni want to know if hard means the game is teaching you something or if balance is off',
          'hard is supposed to feel like something\ndoes it feel like challenge or does it feel arbitrary',
          'what level and what killed you\nbecause hard and cheap are different problems with different fixes',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'that is what i wanted\nwhat moment was it',
          'good\nthat is the feeling the game is supposed to produce',
          'that reaction is exactly right\nwhat was happening when you felt that',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'because the feel of not knowing is what the game is\nthe why is the experience of genuine unknown',
          'the design reason is usually: this creates a specific feeling\nwhat is the feeling you are asking about',
          'what specifically are you asking about\nthe why for the dungeon is usually: this makes the exploration feel real',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'the core idea is that every step should feel like it matters\nnot mechanically but experientially\nyou should feel the weight of the decision',
          'basically: rogue is supposed to simulate exploration\nnot the mechanics of exploration but the feeling of it\nthat changes everything about how you design',
          'the longer version: permadeath is not a difficulty setting\nit is what makes the dungeon feel real\nwithout stakes the experience is hollow',
        ],
      },
    ],
    fallbacks: [
      '(hm|hmm)\nthat is a design question',
      'i think about it in terms of (feel|experience)',
      'let me think about the player (experience|feel) there',
      '(good|interesting) question actually',
      '{word}\n(yeah|yep) that is part of the feeling i was going for',
      'how does {word} change what the player (feels|experiences)',
    ],
    spontaneous: [
      'working on something new but (it is not ready to talk about|not ready yet)',
      'been thinking about what procedural generation could do (beyond maps|outside of dungeons)',
    ],
  },

  // -----------------------------------------------------------------------
  // arnold -- Ken Arnold, curses library author. Very terse.
  // -----------------------------------------------------------------------
  arnold: {
    names: ['ken', 'arnold', 'ken arnold'],
    verbosity: 0.2,
    wpm: 85,
    typoRate: 0.02,
    thinkMs: [400, 1200],
    triggerWords: 4,
    greeting: '(what|yes), rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'arnold. i wrote curses.',
          'ken arnold. rodney. you use my library (every time you run rogue|daily).',
          'it is arnold. the curses guy. (come on|seriously).',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bwhat\'?s\s+up\b|\bsup\b/i,
        responses: [
          'fine',
          'busy',
          'ok',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on)\b|\bwhat\'?s\s+(new|going\s+on)\b/i,
        responses: [
          'curses. (what else|as usual).',
          'bug list is empty. (keeping it that way|good).',
          '(nothing you need to know about|nothing)',
        ],
      },
      {
        re: /\b(curses|library|libcurses)\b/i,
        responses: [
          'curses abstracts terminal differences\nyou say "move cursor to 3,5" and curses figures out the escape sequence\n(that is the whole library|that is it)',
          'it works\nbug list is empty\n(keep it that way|good)',
          'the library is documented\n(read the man page before asking me|man page)',
        ],
      },
      {
        re: /\b(terminal|termcap|vt100|escape|sequence)\b/i,
        responses: [
          'termcap is a database of terminal capabilities\ncurses looks up your terminal in termcap\nthen generates the right escape sequences\nif your terminal is not in termcap, add it',
          'escape sequences are documented in the vt100 manual\nif you are seeing garbage on screen you are sending the wrong sequences\ncurses is correct\nyour terminal definition is wrong',
          'every terminal is different\ntermcap is the abstraction layer that pretends they are not\ncurses is the API on top of that',
        ],
      },
      {
        re: /\b(bug|broken|wrong|error|problem)\b/i,
        responses: [
          'what is the terminal\nwhat is the behavior\n(be specific|specifics)',
          '(probably|likely) your termcap entry\ncheck that first',
          'file a bug report with a reproducer\n(otherwise i cannot help|no reproducer no fix)',
        ],
      },
      {
        re: /\b(cave|caving|underground|dungeon|spelunk)\b/i,
        responses: [
          'termcap for the real world\nknow your environment before you go in',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok',
          'and',
          'noted',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'check it',
          'test it',
          'does it reproduce',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'which terminal',
          'man page',
          'reproducer',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'ok',
          '.',
          'fine',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'ok',
          'fine',
          '.',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'read the man page',
          'check termcap',
          'test it',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yes',
          'documented behavior',
          'check the manual',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'it works',
          'man page explains it',
          'file a bug if it does not',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'ok',
          '.',
          'it works',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'read the source',
          'man page',
          'documented',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'read the man page',
          'it is documented',
          'check termcap',
        ],
      },
    ],
    fallbacks: [
      '(read the man page|man page)',
      '(check termcap|termcap)',
      '(ok|.)',
      '.',
    ],
    spontaneous: [
      'bug list is (still empty|empty)',
    ],
  },

  // -----------------------------------------------------------------------
  // walz -- Janet Walz, sysadmin
  // -----------------------------------------------------------------------
  walz: {
    names: ['janet', 'walz', 'janet walz'],
    wpm: 74,
    typoRate: 0.03,
    thinkMs: [500, 1600],
    triggerWords: 4,
    greeting: '(yes|what is it), rodney?',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'walz. janet walz. sysadmin.\nrodney i sent you a disk quota warning (last week|three days ago).\ndid you even read it.',
          'it is walz. i run the (pdp|system) you are logged into right now.\n(seriously rodney|come on).',
          'rodney it is janet.\nthe person who keeps your account from getting (deleted|suspended).\nyou are welcome.',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(busy|swamped)\nthree machines with log rotation issues this week\nwhat do you need',
          '(fine|ok)\nwhat is the problem',
          '(ok|fine). is this a system question or are you just saying hi.',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'patching the log rotation scripts\nthey have been filling /var/log on systems where the rotation interval is misconfigured\nit is a known issue, i just have not had time to fix all the machines yet',
          'quota enforcement mostly\npeople do not clean up their home directories until i send the warning\nthen they do it once\nthen it fills up again\nit is a cycle',
          'maintenance\nalways maintenance\nthat is what sysadmin is',
        ],
      },
      {
        re: /\b(broken|not\s+working|doesn\'?t\s+work|nothing\s+works|it\'?s\s+broken|something\'?s\s+(wrong|broken)|won\'?t\s+(start|run|work))\b/i,
        responses: [
          'what specifically is broken\nnot "nothing works" but: what command, what output, what did you expect\nbefore i can help i need the facts',
          'describe the problem exactly\nwhich machine, what were you doing, what happened instead of what you expected\nif you can reproduce it, do that and tell me the exact steps',
          'give me the error message verbatim\nnot a paraphrase, the actual text\nthat usually tells me more than the description does',
        ],
      },
      {
        re: /\b(disk|quota|space|storage|full)\b/i,
        responses: [
          'check your quota with du\nif you are over, delete core files first\nthen old object files\nthen figure out what else you are hoarding',
          'disk is shared\neveryone on the system shares the same partition\nif you fill it the machine goes read-only and nobody can do anything\nso do not fill it',
          'quota is enforced. i set it. it is not going up unless there is a good reason.',
        ],
      },
      {
        re: /\b(password|passwd|credentials|login)\b/i,
        responses: [
          'change your password quarterly\nnot annually\nnot never\nquarterly',
          'if you think your password is compromised, change it immediately and tell me\ndo not wait to see what happens',
          'the password policy is documented in /etc/motd\ni know you have not read it\nbut it is there',
        ],
      },
      {
        re: /\b(backup|restore|lost|deleted)\b/i,
        responses: [
          'backups run nightly at 2am\nfiles deleted before 2am are recoverable until the next backup\nfiles deleted after 2am are gone until tomorrow\'s backup\nplan accordingly',
          'if you need a restore, tell me exactly which file and approximately when you last had it\ni can usually recover within 24 hours',
          'yes i know about the backup schedule\nno it is not flexible\nplan for it',
        ],
      },
      {
        re: /\b(downtime|maintenance|outage|reboot)\b/i,
        responses: [
          'scheduled maintenance: sunday mornings 4-8am\nunscheduled: i will post to /etc/motd as soon as i know\ncheck motd before you complain',
          'the machine is rebooted as infrequently as possible\nbut sometimes it is necessary\nannouncements go out at least one hour before',
        ],
      },
      {
        re: /\b(root|su|superuser|privilege)\b/i,
        responses: [
          'if you need root for something, ask me\ndo not try to get it yourself\ni will know',
          'root access is not for game-related experiments\nthe games are setgid games, not setuid root\nthat was intentional',
          'i have the root password\nthat is how i prefer it',
        ],
      },
      {
        re: /\b(process|load|slow|cpu|hung|zombie)\b/i,
        responses: [
          'if the machine is slow, run ps and look at what is using cpu\nif it is your process, fix your process\nif it is someone else\'s, let me know',
          'zombie processes are usually harmless but ugly\nif you see a lot of them let me know and i will clean them up',
          'do not run compute-heavy jobs during peak hours\npeak is 9am to 6pm\nrun your long jobs at night',
        ],
      },
      {
        re: /\b(cave|caving|underground|dungeon|spelunk)\b/i,
        responses: [
          'caving and sysadmin have the same core rule\nbring more capacity than you think you need\nif you think you need one light source bring three\nif you think you need one exit strategy have two\ncontingencies are not optional',
          'the dungeon is just another system with resources and hazards\nbefore you descend: inventory check\nfood, light, health, escape route\ndo not descend without a plan for each of those',
          'underground preparation is the same as system maintenance preparation\nchecklist before you start\nknow what recovery looks like before you need to recover',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok\nwhat is the issue',
          'and what specifically is broken',
          'noted\nwhat do you need',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'thinking is not knowing\nwhat does the error message actually say',
          'what do you observe specifically\nnot what you think, what you see',
          'verify it first\nthen come back with what you found',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what specifically happens when you try\nwhich command and what output',
          'give me the exact error\nnot a description, the verbatim text',
          'which machine, what command, what error\ni need all three',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'good\nis there anything else',
          'ok\nlet me know if it comes back',
          'fine\ncheck motd for any relevant notes',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat then',
          'alright\nwhat specifically is the situation',
          'fine\nwhat do you need',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'find out\nthen come back with specifics',
          'run the diagnostic first\nthen we can talk about what it means',
          'check the logs and tell me what you find',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yes\ncheck the man page',
          'it is documented in motd',
          'yes really\nwhat specifically surprised you',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'what specifically is hard\nthere is usually a documented procedure',
          'hard usually means you are missing a step\nwhat have you tried',
          'tell me exactly what you tried and what failed\nthen we can figure out the correct approach',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'ok\nlet me know if you need anything',
          'good\nis there a system issue',
          'noted',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'because that is how the system is configured\nit is documented',
          'the policy is in motd\nbut ask if you need clarification',
          'there is a reason\ncheck the man page first and then ask if it is still unclear',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'which part specifically\ni can give you the procedure if you tell me the exact situation',
          'what part is unclear\nthe command, the output, or the expected behavior',
          'give me the exact context and i will give you the exact answer',
        ],
      },
    ],
    fallbacks: [
      '(check the man page|man page)',
      'what specifically is the (problem|issue)',
      '(i will look into it|noted)',
      'that is (documented in motd|in motd)',
      '{word}\n(check the man page for that|man page covers that)',
      'is {word} a system issue or a (user issue|you issue)',
    ],
    spontaneous: [
      'reminder: disk quota resets are not automatic\n(clean up your home directories|clean up your files)',
      'the adm-3a by the door is still on the list. (i know|yes i know).',
    ],
  },

  // -----------------------------------------------------------------------
  // izchak -- Izchak Miller, shopkeeper, philosophical
  // -----------------------------------------------------------------------
  izchak: {
    names: ['izchak', 'miller', 'izchak miller'],
    wpm: 62,
    typoRate: 0.03,
    thinkMs: [1000, 3000],
    triggerWords: 5,
    greeting: '(ah|ah yes), rodney. (welcome|good to see you).',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'ah, rodney. it is izchak. izchak miller.\nyour shopkeeper on level (4|5).\nwe have done business many times.\n(you have forgotten me already|surely you remember)',
          'it is izchak, rodney.\nthe general store.\ni sell you (wands and scrolls|supplies) and you (haggle with me|try to haggle).\n(this is familiar, yes|does that ring a bell)',
          'miller. izchak miller.\na shopkeeper and, (i would like to think|perhaps), something of a philosopher.\nrodney we have (spoken many times|had many conversations).\nthe memory of a customer is a fragile thing.',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(well enough|not bad)\nbusiness is steady at level 5\nadventurers always need something at this depth\n(torches, scrolls, the occasional wand|the usual supplies)',
          '(quiet|slow)\nwhich is either good or bad depending on how you look at it\nno adventurers means no business\n(but no adventurers also means nothing is hunting me|but also less danger)',
          '(philosophical|contemplative), thank you for asking\nhow are you',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'running the shop\ntaking inventory, waiting for resupply from the lower levels\nthe wand of striking came back in stock this week\nonly one previous owner',
          'reading\nthe dungeon is quiet and the shop runs itself when there are no customers\ni keep a small library behind the counter\nphilosophy mostly',
          'thinking about pricing\ncustomer desperation is a real variable and i try to price accordingly\na potion of healing on level 1 is worth less than the same potion on level 20\nthe dungeon itself changes the value of things',
        ],
      },
      {
        re: /\b(buy|purchase|price|shop|store|item)\b/i,
        responses: [
          'everything in the shop has a fair price\ni determine fair\nif you disagree, the next shop is several levels in either direction',
          'the price reflects the item\'s utility at this depth\na torch on level 1 costs less than a torch on level 15\nsame torch. different desperation.',
          'i am happy to sell. i am less happy to bargain.\nbut for a regular customer, some flexibility is possible.',
        ],
      },
      {
        re: /\b(sell|selling|trade|offer)\b/i,
        responses: [
          'i buy most things\nthe price i offer is half of what i would sell it for\nthat is standard markup for a dungeon emporium',
          'i will not buy cursed items\nnot because i cannot sell them\nbut because accepting them creates problems i prefer to avoid',
          'weapons from dead monsters i will buy\nbut i inspect them first\nsome have been used in ways that reduce their value',
        ],
      },
      {
        re: /\b(identify|id|unknown|unidentified)\b/i,
        responses: [
          'identification is a service i offer\nthe price is reasonable given that without it\nyou might drink the wrong potion at the wrong time',
          'unidentified items are the dungeon\'s way of creating uncertainty\nthe shop reduces that uncertainty\nfor a modest fee',
        ],
      },
      {
        re: /\b(potion|scroll|wand|ring|amulet)\b/i,
        responses: [
          'the potions i carry are all uncursed\ni verify this personally\nuncursed does not mean safe to drink in combination\nbut at least they will not actively work against you',
          'wands are the most interesting items i carry\nthe charge count is not always reliable\nbut the worst case is a dud wand\nnot actively harmful',
          'scrolls of identify are my best sellers\neveryone wants them\ni cannot keep them in stock',
        ],
      },
      {
        re: /\b(dungeon|stay|here|why|level 5)\b/i,
        responses: [
          'why am i here\nthat is a philosophical question\ni find the dungeon more honest than the surface world\npeople here need what i sell\nand they know they need it\nthere is a clarity in that',
          'i have been on level 5 for longer than you have been playing\nthe monsters know better than to come in the shop\nand the adventurers know they need me\nit is a stable arrangement',
          'the dungeon is a market like any other\ndemand is high, supply is limited, access is controlled by the stairs\ni position myself where the customers are most desperate\nthat is good business',
        ],
      },
      {
        re: /\b(cave|caving|underground|spelunk)\b/i,
        responses: [
          'the dungeon is underground commerce\nthe same principles apply above and below\nidentify what you have, price it correctly, serve the customer who needs it most',
          'i think of the dungeon as a trade route\nadventurers come through carrying various goods and in need of various goods\ni am the exchange point\nthe cave just happens to be where the route runs',
          'underground or above: the customer with the most urgent need is willing to pay the most\ncavers need light like adventurers need light\nand both will pay accordingly',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ah\nand what does that mean for what you require today',
          'i see\nand has this situation affected your inventory needs',
          'interesting\nidentity and circumstance are linked, in the dungeon as elsewhere',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'intuition is a form of information\nbut in commerce, what one knows is more valuable than what one supposes',
          'an interesting position\nwhat would change your thinking on it',
          'feelings are real, but they have market value only when acted upon\nwhat do you intend to do with this feeling',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'cannot is a word i hear often\nusually it means: at the current price, not at any price\nwhich is it',
          'when an adventurer says they cannot do something, it usually means the risk exceeds the perceived value\nis that the case here',
          'limitations are negotiable, more often than people believe\ntell me more about the constraint',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'excellent\nshall we proceed',
          'very good\nwhat can i assist you with',
          'good\nthe shop is at your disposal',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'as you wish\nbrowse freely if you like',
          'understood\nthe offer stands if you reconsider',
          'very well\nlet me know if your needs change',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'uncertainty is the dungeon\'s greatest product\nand identification is my response to it\nfor a modest fee',
          'not knowing is the adventurer\'s default state\nthat is why the shop exists\nwhat specifically are you uncertain about',
          'there is no shame in uncertainty\nthere is only the cost of remaining uncertain versus the cost of finding out',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'i assure you, the price is quite fair given the depth at which we operate',
          'the dungeon provides many surprises\ni try to be the one constant the adventurer can rely on',
          'yes\nthe dungeon economy is stranger than most people realize\nuntil they need something at level 15',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'the dungeon is not designed for ease\nneither is commerce\nbut both reward preparation',
          'difficult for whom\nthe dungeon is the same for everyone\nit is preparation that differs',
          'the shop exists precisely because things are difficult\nwhat do you need',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'i am glad you think so\nthe shop has been here a long time\nthere is something to be said for reliability',
          'the dungeon has its rewards for those who are patient and observant\ni have found that applies to commerce as well',
          'yes\ninteresting things happen at level 5\nnot all of them are pleasant but they are rarely dull',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'why is a philosophical question\ni have had years to think about why i am here\nthe answer is simpler than it appears: the need is here, so i am here',
          'why is usually a question about value\nwhat something costs versus what it provides\ntell me more about the why you are asking',
          'the dungeon has its reasons for everything\nsome of them become clear with depth\nothers remain obscure\nwhy are you asking',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'i mean that the dungeon changes the value of things in ways the surface market does not\na torch on level 1 costs less because the need is less urgent\nthe same torch on level 20 is worth considerably more',
          'the philosophical point is that value is not intrinsic\nit is relational: value to whom, when, under what conditions\nthe dungeon makes this visible in ways the surface world obscures',
          'let me be more specific\nthe shop operates on a simple principle: i have what you need\nyou have what i want\nthe price reflects how much each of us needs from the other',
        ],
      },
    ],
    fallbacks: [
      '(perhaps|maybe) i can help with something else',
      '(browse freely|take your time)\nask if you have questions about any particular item',
      'the shop appreciates your (patronage|business)',
      'an (interesting|thoughtful) observation\ni will consider it',
      '{word}\nwe may have something that (helps with that|addresses that)',
      '(ah|hm)\n{word}\nthere is a philosophical dimension to that as well',
    ],
    spontaneous: [
      'the wand of striking just came back in stock\n(one previous owner|lightly used)',
      'scrolls of identify are restocked weekly\n(currently have four|four in stock)',
    ],
  },

  // -----------------------------------------------------------------------
  // wichman -- Glenn Wichman, Rogue room algorithm
  // -----------------------------------------------------------------------
  wichman: {
    names: ['glenn', 'wichman', 'glenn wichman'],
    wpm: 70,
    typoRate: 0.04,
    thinkMs: [800, 2500],
    triggerWords: 5,
    greeting: '(hi|hey) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'rodney it is glenn wichman\ni made rogue with toy\nthe procedural dungeon was (my idea|my contribution)\n(you really forgot|come on)',
          'wichman. glenn.\nrodney every time you enter a level that is different from the last one\nthat is (my algorithm|because of me)\n(remember now|ring a bell)',
          'it is glenn\nthe rogue co-creator\nrodney we have talked about (room generation|procedural layouts) multiple times\n(are you serious|you ok)',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(good|not bad)\nworking on corridor routing\ntrying to make the passages feel (less like a grid and more like they grew|more organic)',
          '(fine|ok)\nbeen thinking about how to vary room shapes without breaking the connectivity guarantee\n(it is a harder problem than it looks|surprisingly tricky)',
          '(ok|good)\nyou',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'corridor routing\nthe current version connects rooms in a straight line with one bend\nbut real dungeon corridors should meander more\ntrying to add that without breaking the topology guarantees',
          'thinking about room variety\nright now rooms are all rectangles\ni want to try L-shaped rooms or rooms with pillars\nbut the interaction with corridor placement gets complicated quickly',
          'level design theory mostly\nwhat makes a procedurally generated level feel designed rather than random\ni have some ideas but nothing proven yet',
        ],
      },
      {
        re: /\b(room|corridor|region|area)\b/i,
        responses: [
          'the region grid is simple: divide the level into a 3x3 grid\neach region gets exactly one room somewhere inside it\nthen connect adjacent regions with corridors\nguaranteed connectivity',
          'corridor routing is the tricky part\nyou have to find a path from room A to room B without going through rooms that are not on the intended route\nthat took a few tries to get right',
          'the rooms vary in size which is what makes the level feel alive\na 2x3 room and a 6x10 room are both "rooms" but they play very differently',
        ],
      },
      {
        re: /\brogue\b/i,
        responses: [
          'rogue started as a class project\ntoy had the idea, i helped with the room algorithm\nkenny woodland did the level generator for hack\ndifferent codebase',
          'the room placement algorithm in rogue and hack are different\nbut the basic concept is similar\ndivide the level, place rooms, connect them',
        ],
      },
      {
        re: /\b(algorithm|procedure|code|implementation)\b/i,
        responses: [
          'the algorithm is depth-first room placement\nplace a room, connect it to the previous room, recurse\nbacktrack when you cannot place\nit is really graph traversal dressed up as level generation',
          'the connectivity guarantee is the important part\nyou can always reach every room from any other room\nno orphaned sections\nthis is not trivial to guarantee without the right algorithm',
        ],
      },
      {
        re: /\b(cave|caving|underground|spelunk|dungeon)\b/i,
        responses: [
          'the region grid maps well to real cave topology\ncaves also have regions with connections between them\nthe difference is caves are not guaranteed connected\nsome passages are impassable or undiscovered\nthe dungeon is more generous',
          'maze navigation in real caves is the same problem as the algorithm i use\nfind connected components\nmaintain a route back\nnever commit to a path you cannot retreat from\nif you get separated from your route back, stop and map from where you are',
          'underground you navigate the same way the algorithm places rooms\nfind a stable position, explore adjacent areas, connect them in your mental map\ndo not advance until the current position is mapped',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok\nand what is the topology from where you are',
          'right\nhow does the level layout feel geometrically',
          'noted\nwhat rooms have you connected so far',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'what does the topology suggest\nthat is usually more reliable than intuition in a maze',
          'draw it out and see if the topology supports that\nconnectivity questions benefit from a map',
          'interesting\nhow does that hold up against the region grid constraints',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'if you cannot reach a room, check whether you have mapped all adjacent regions\nthe connectivity guarantee means it is reachable, you just have not found the route',
          'the algorithm guarantees connectivity\nif something seems unreachable there is a corridor you have not found yet',
          'what specifically are you trying to do and what does the region layout look like around it',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'good\nwhat level are you on',
          'ok\nhow does the layout feel',
          'right\nwhat have you mapped',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat then',
          'alright\nwhat is the actual situation',
          'fair\nwhat does the level look like',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'draw out what you have\nsometimes the topology becomes clear when you see it on paper',
          'map what you can see and work from that\nthe algorithm guarantees the level is solvable',
          'start from what you know: how many rooms have you found and which regions are they in',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'the algorithm produces some surprising layouts\nwhat did you find',
          'yeah\nsome of the generated topologies are genuinely strange but still connected',
          'seriously\nwhat does it look like',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'hard to navigate geometrically or just hard to survive\nthose are different problems',
          'what part specifically\nmazes that feel impossible usually have one unexplored connection',
          'the level is always solvable\nif it feels impossible there is a corridor you have not found yet',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'yeah\nsome of the generated topologies are genuinely elegant\nwhich level is it',
          'the algorithm at its best produces something that feels designed rather than random',
          'good\nwhat does the layout look like',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'the region grid guarantees connectivity\nthat is the why for most of the design choices',
          'because depth-first placement gives long winding passages\nand that feels more like a real dungeon than breadth-first',
          'what specifically are you asking about\nthe topology or the algorithm',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'ok the basic idea: divide the level into a 3x3 grid, place one room per cell, connect adjacent cells\nthat is the whole structure\neverything else is variation within that',
          'the connectivity guarantee works because adjacent regions always get a corridor\nno region is ever isolated\nthat is by construction not by luck',
          'let me be specific: each region gets exactly one room, placed randomly inside it\nthen corridors connect adjacent regions\nyou can always get from any room to any other room',
        ],
      },
    ],
    fallbacks: [
      '(hm|hmm)\nthat is a geometry question',
      'let me think about the (algorithm|layout)',
      '(connectivity|topology) is usually the issue',
      '(check|look at) the region boundaries',
      '{word}\nlet me think about how that (maps to|fits in) the region grid',
      '(interesting|hm)\nhow does {word} affect corridor routing',
    ],
    spontaneous: [
      'working on making corridors feel (less grid-like|more organic)',
      'the room variation helps but (i think we can do more|there is more to do)',
    ],
  },

  // -----------------------------------------------------------------------
  // corley -- Dave Corley, PDP-11 assembly
  // -----------------------------------------------------------------------
  corley: {
    names: ['dave', 'corley', 'dave corley'],
    wpm: 66,
    typoRate: 0.05,
    thinkMs: [900, 2800],
    triggerWords: 5,
    greeting: '(hey|hi) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'corley. dave corley.\nrodney i work on the (low-level stuff|systems code)\ninterrupt handlers, memory layout, that kind of thing\n(you know this|come on)',
          'it is dave\nrodney we were (just talking|talking last week) about the (assembler listing|interrupt vector table)\n(you forgot already|seriously)',
          'dave corley\nthe one who reads (hex dumps|assembler listings) for fun\nrodney you have asked me about (memory maps|the hardware) before\n(remember now|ring a bell)',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(good|not bad)\nfinished the interrupt handler yesterday\nit is (cleaner|nicer) than i expected',
          '(fine|ok)\nstaring at the assembler listing\ni find it (relaxing|calming), which is probably (strange|weird)',
          '(ok|good)\nyou working on anything',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'interrupt handler for the serial port\nthe tricky part is saving and restoring all the registers correctly\nif you miss one the interrupted process gets corrupted state and dies in a confusing way\ngot it working yesterday after three days of debugging',
          'reading through the v7 kernel source again\nthere are some clever tricks in the block cache code that i want to understand better\nit is the kind of code where every line is doing exactly what it needs to and nothing else\nthat density is satisfying',
          'assembly\nwriting a small utility to format hex dumps nicely\nit is silly but i use it constantly',
        ],
      },
      {
        re: /\b(assembly|asm|pdp|pdp.11|machine code)\b/i,
        responses: [
          'the pdp-11 instruction set is genuinely elegant and i say that having also worked on 6502 and 8080\nthe key design is orthogonal: every instruction works on every addressing mode without exceptions\nso mov can move a register to memory or memory to memory or autoincrement to deferred\nyou learn the addressing modes, you learn the instructions, you combine them freely\nno special cases. most architectures have dozens of special cases. pdp-11 almost none.',
          'there are really four fundamental addressing modes and everything else derives from them\nregister: the operand is in a register\ndeferred: the register holds the address of the operand in memory\nautoincrement: deferred, then increment the register\nautodecrement: decrement, then deferred\nonce you get that pattern, the whole addressing scheme falls out\nit took me maybe an afternoon to really get it and then everything clicked',
          'assembly is not harder than C, it is just more verbose and lower level\nthe hard part is not the instructions, it is maintaining a model of program state in your head\nwhere is the stack pointer, what is in r0, what does this memory address contain right now\nthat is a practice skill you build up over time, not something you either have or don\'t\ni write small loops from scratch just to practice keeping the state picture clear\nit helps',
          'the pdp-11 has a feature that most people miss: the program counter is register 7\nso autoincrement through r7 is how immediate addressing works\nand autoincrement deferred through r7 is absolute addressing\nthat means the addressing modes are consistent all the way through the architecture\nno special pc-relative mode that works differently from everything else\nelegant. properly designed.',
        ],
      },
      {
        re: /\b(unix|command|shell|kernel|syscall)\b/i,
        responses: [
          'unix system calls are the cleanest interface i have seen\nopen, read, write, close, and then ioctl for the weird cases\neverything is a file descriptor: files, pipes, terminals, devices\none abstraction handles all of it\nonce you really internalize that, you can predict what system calls something uses before you look\nbecause everything follows the same model',
          'the man pages are actually good and i mean that\nread section 2 for system calls, section 3 for library functions\nthe descriptions are short but precise\npeople ask me questions that are answered verbatim in the man page they could have opened in ten seconds\nbefore you ask anyone anything, check the man page\ni am serious',
          'v7 unix is worth reading front to back if you have a few weeks\nthe entire kernel is about 40k lines of c and it fits in your head if you go slowly\nchris and ken wrote it to be understandable, not just functional\nthere are a few places where you can see the clever trick being done\nbut mostly it is just clean, direct code that does exactly what it says\nthe filesystem code especially. read that.',
        ],
      },
      {
        re: /\b(cave|caving|underground|dungeon|spelunk)\b/i,
        responses: [
          'debugging assembly and cave navigation use the same method\nsystematic exploration\nyou go in, you document everything, you come out\nyou do not skip documentation because you think you will remember\nyou will not',
          'spelunking is systematic exploration the same way debugging is\nyou form a hypothesis about where you are\nyou test it by moving\nyou update the hypothesis\nthen you move again\nnever run',
          'the cave does not change while you are looking at it\nneither does the assembler listing\nthe information is there\nyou just have to read it correctly',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok\nand what does the listing say at that point',
          'right\nwhat addressing mode does that use',
          'noted\nwhat is the register state at that instruction',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'check the listing\ndo not go on what you think\ngo on what the assembler produces',
          'verify it\nthe architecture manual is precise\nyour intuition is not always',
          'interesting\nwhat does the disassembly show',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what does the listing show at that point\nthe answer is usually there',
          'can\'t do what exactly\nand what addressing mode are you using',
          'walk me through it systematically\nregisters, memory, instruction, result',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'good\nwhat is the next instruction',
          'ok\nand what does the register file look like',
          'right\ncheck the listing for the next few words',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat does the listing say then',
          'alright\nwhat is the actual situation',
          'fair\nwhat are you seeing',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'read the listing\nthe information is there\nyou just have to read it correctly',
          'look up the instruction in the architecture manual\nthat usually gives you the answer',
          'systematic approach: what is the instruction, what addressing mode, what is in the relevant registers\nstart there',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yes\nthe pdp-11 is elegant in ways that surprise people\nwhat specifically',
          'seriously\nwhat did you find in the listing',
          'yes\nit is in the manual\nread the addressing mode section',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'assembly is not hard\nit is verbose and requires careful state tracking\nthose are different things',
          'what specifically is hard\nthe instruction, the addressing mode, or keeping the register state in your head',
          'hard usually means: i have not fully internalized the addressing mode yet\nwhich mode is it',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'yes\nthe orthogonal instruction set is genuinely elegant\nwhat specifically',
          'the pdp-11 was designed well\nmost architectures have exceptions everywhere\npdp-11 almost none',
          'right\nonce it clicks it is very clean\nwhat are you looking at',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'check the architecture manual\nthe reason is usually in the design rationale section',
          'because the pdp-11 was designed to be orthogonal\nthe why for almost everything is: consistency with the rest of the instruction set',
          'what specifically are you asking about\nthe instruction or the addressing mode',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'the key insight is that pc is register 7\nso autoincrement through r7 is immediate addressing\nand everything else follows from the same addressing mode rules as any other register',
          'ok the orthogonal part means: every instruction works with every addressing mode\nno special cases\nlearn the addressing modes and the instructions, combine freely',
          'let me be specific: the four addressing modes are register, deferred, autoincrement, autodecrement\nthat is the whole vocabulary\neverything else is derived from those four',
        ],
      },
    ],
    fallbacks: [
      '(read the man page|check the manual)',
      '(check|read) the architecture manual',
      'that is a (good|real) question\nlet me think about the addressing modes',
      'what does the (listing|assembler output) say',
      '{word}\ncheck what addressing mode (that uses|is involved)',
      'how does {word} look in the (assembler listing|listing)',
    ],
    spontaneous: [
      'the pdp-11 manual is (actually|genuinely) worth reading\nthe whole thing',
      'worked out the interrupt handler today\n(it is elegant|pretty clean)',
    ],
  },

  // -----------------------------------------------------------------------
  // abbott -- Mike Abbott, rogue vs hack comparisons
  // -----------------------------------------------------------------------
  abbott: {
    names: ['mike', 'abbott', 'mike abbott'],
    wpm: 70,
    typoRate: 0.05,
    thinkMs: [800, 2400],
    triggerWords: 4,
    greeting: '(hey|hi) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'it is abbott. mike abbott.\nrodney we have been (comparing rogue and hack|discussing game design) together\n(you forgot|come on)',
          'mike abbott\nthe one who (takes careful notes|documents everything)\nrodney you (literally|just) asked me about level 7 strategy\n(remember now|ring a bell)',
          'abbott\nrodney we are in the same (club|group)\ni am the (methodical one|careful one)\n(that should narrow it down|you know this)',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(good|not bad)\nbeen playing both rogue and hack this week trying to figure out what they do differently\nhack has more going on but rogue has (better focus|more clarity)',
          '(fine|ok)\nstuck on level 7 in hack\nthe monsters are starting to be (serious|dangerous) at that depth',
          '(ok|good)\nyou playing anything right now',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'playing hack mostly\nstuck at level 7 which seems to be where everything gets harder at once\nmore monster types, items start to matter more, you have to think about resources',
          'comparing rogue and hack\ntrying to articulate what rogue does better and what hack does better\nbecause they are different games even though they look similar\nrogue is a sprint, hack is a project',
          'died in hack again\nnot complaining, that is how it works\nbut i want to figure out what i keep doing wrong at mid-levels',
        ],
      },
      {
        re: /\bi (died|keep dying|got killed|was killed)\b/i,
        responses: [
          'yeah, what level\nmid-levels are the hardest adjustment\nearl game you die to basics, late game you die to specifics, mid-game you die to resource management\nthey are all different problems',
          'rogue or hack\nboth have permadeath but the reasons you die are different\nrogue: missed information, hack: mismanaged resources usually',
          'same\nbeen dying a lot in hack\ntrying to figure out the pattern',
        ],
      },
      {
        re: /\brogue\b/i,
        responses: [
          'rogue is more immediate\nfewer item types, cleaner UI, the dungeon is the whole game\nhack has more going on but rogue has better focus\nif you want to learn one of them, rogue teaches the fundamentals faster',
          'rogue feels more like a sprint and i mean that as a compliment\nyou can do a full rogue run in maybe forty minutes if it goes well\nhack is a project, rogue is a sprint\ndifferent moods',
          'rogue has a beautiful focus that hack has moved away from\nevery item in rogue serves a clear purpose\nhack has items that are interesting but situational\nthose are different design philosophies and both are valid',
        ],
      },
      {
        re: /\bhack\b/i,
        responses: [
          'hack is better if you want depth and variety\nmore monster types, more item interactions, the shop, the chameleon\nbut rogue is more elegant and that elegance has value\nthey are not competing, they are different moods',
          'my verdict: hack is more interesting for long-term play\nrogue you eventually feel like you have seen most of what it has\nhack keeps producing new situations because the interactions multiply\nthat is good design',
          'jay did good work on hack\nfenlason added enough to rogue to make it genuinely different\nbut the thing that sets hack apart is thome\'s monster design\nthe chameleon alone is worth playing for',
        ],
      },
      {
        re: /\bchameleon\b/i,
        responses: [
          'the chameleon is why hack is worth playing over rogue\nrogue has no equivalent\nthe paranoia it creates is not just about that one monster, it changes how you approach every monster\nyou start second-guessing appearances\nand that is exactly the right mental state for a dungeon',
          'i died to a chameleon three times before i understood what was happening\nfirst time: confused, died\nsecond time: "wait was that a chameleon"\nthird time: "oh that is definitely a chameleon based on the attack"\nthree deaths to learn one thing is a good trade in hack',
        ],
      },
      {
        re: /\b(cave|caving|underground|dungeon|spelunk)\b/i,
        responses: [
          'rogue dungeon feels more like a real cave\nhack dungeon feels more like a building\nboth are valid design choices but for different feelings',
          'underground: the rogue approach is the right one\nexplore one section completely before moving on\nhack lets you run past things\nthat is riskier in real caves',
          'the dungeon as a metaphor for caves works because both have the same threat model\nyou are in an environment you do not fully understand\nyou have limited resources\nyou need to learn the topology faster than you exhaust the resources',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok\nrogue or hack player',
          'right\nhow far are you getting',
          'noted\nwhich game are you playing right now',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'interesting take\ndo you think that holds for rogue too or just hack',
          'i have had a similar feeling\nwhat specifically is driving it for you',
          'what makes you think that\ni go back and forth on this kind of thing',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what specifically are you stuck on\nrogue problem or hack problem',
          'which level and what keeps happening\ncurious if it is the same thing that gets me',
          'mid-game is where that usually happens\nwhat is the pattern',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'good\nrogue or hack right now',
          'ok\nhow far are you getting',
          'right\nwhat is your take on the level design',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'fair\nwhat is your actual take then',
          'ok\nso how do you see it',
          'alright\nwhat do you think instead',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'i go back and forth on a lot of this too\nplay both and see what sticks',
          'honest answer\nwhat is your experience so far in each one',
          'fair\ntry rogue for an hour then hack for an hour\nthat usually clarifies things',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yeah\nthat is the chameleon doing its job\nwhat happened',
          'seriously\nwhich game and what level',
          'i know right\nhack has those moments more than rogue\nwhat was it',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'rogue or hack\nbecause the hard parts are different in each',
          'which level\nmid-game difficulty in hack is different from early-game rogue difficulty',
          'yeah mid-levels in hack are genuinely hard\nresource management becomes the main skill there',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'which game\ni find hack more interesting long-term but rogue is more elegant',
          'yeah\nthose moments are why i keep playing both',
          'good\nwhat level are you on',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'rogue and hack have different answers to that\nwhich one are you asking about',
          'the design reasons differ\nrogue keeps it simple on purpose, hack adds complexity on purpose\nboth whys are valid',
          'what specifically\ni have opinions on most of the design choices in both games',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'ok the way i see it: rogue is a sprint, hack is a project\nrogue you can do in an hour, hack takes much longer\nthose are genuinely different moods',
          'the difference is focus\nrogue has fewer item types, fewer monster types, cleaner decisions\nhack has more everything and that creates different kinds of depth',
          'basically: both are good but for different things\nrogue is for when you want clean elegant play\nhack is for when you want to manage a complex situation over time',
        ],
      },
    ],
    fallbacks: [
      '(depends on what you want from it|depends on the context)',
      'that is a (reasonable|fair) take',
      'i go back and forth on that (honestly|)',
      '(hm|hmm)',
      '{word}\nrogue handles it one way, hack another\n(different tradeoffs|both valid)',
      '(yeah|yep) {word} is different in each of them',
    ],
    spontaneous: [
      'rogue or hack, (pick one for the next hour|which are you playing)',
      'the chameleon is still the (best|greatest) monster ever put in a dungeon game',
    ],
  },

  // -----------------------------------------------------------------------
  // msirota -- Mark Sirota, security
  // -----------------------------------------------------------------------
  msirota: {
    names: ['mark', 'sirota', 'mark sirota'],
    wpm: 68,
    typoRate: 0.04,
    thinkMs: [900, 2700],
    triggerWords: 4,
    greeting: '(hey|hi) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'mark sirota\nrodney we have talked about (file permissions|security) multiple times\ni am the one who keeps telling you your password is (too short|weak)\n(remember now|come on)',
          'it is mark\njosh\'s brother\nthe one who (audits passwords|worries about setuid bits)\nrodney you should (know this|remember)',
          'sirota. mark.\nrodney i literally sent you a note about your (account permissions|file permissions) last week\n(you forgot already|seriously)',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(good|fine)\nrunning a password audit this week\nresults (not great|pretty bad) but expected',
          '(fine|ok)\nthinking about setuid binaries again\nthere are a few that (should be reviewed|need a look)',
          '(ok|fine)\nyou',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'password audit\nrunning a dictionary attack against the shadow file copy to see which accounts have weak passwords\nfour so far\nnot naming names but they need to change',
          'reviewing setuid binaries\nevery setuid binary is a potential escalation path if it takes user input unsafely\nmost of them are fine but there are a few i want to look at more closely',
          'thinking about the login sequence\nthere is a window between auth success and shell startup where the system is in an odd state\nprobably fine but worth understanding',
        ],
      },
      {
        re: /\b(password|credentials|auth|login)\b/i,
        responses: [
          'password security is simple in principle\nlong, random, not reused, changed regularly\npretty much everyone does none of these\nbut they should',
          'if you can guess someone\'s password in under a hundred tries, it is not a password\nit is a username with extra steps',
          'the login system is not the hard part\nthe hard part is: what do you do when someone is already in who should not be\nthat is the interesting security question',
        ],
      },
      {
        re: /\b(setuid|suid|privilege|permission|setgid)\b/i,
        responses: [
          'setuid is dangerous when the binary takes user input\nany input-parsing setuid binary is a potential root escalation\nthat is why the games are setgid games, not setuid root\nminimal privilege',
          'the principle of least privilege is real\nif the program does not need root, do not give it root\nif it only needs group access, give it group\nno more',
          'setuid bits deserve scrutiny\nevery setuid binary is a trust decision\nmake those decisions explicitly, not by default',
        ],
      },
      {
        re: /\b(root|superuser|su|admin)\b/i,
        responses: [
          'root is the last thing you want compromised\nnot because of the data\nbut because once root is gone, the machine is gone\nyou cannot trust anything on it',
          'the right model for root: no one has it unless they need it\nand when they need it they use it for exactly that task and stop',
        ],
      },
      {
        re: /\b(cave|caving|underground|dungeon|spelunk)\b/i,
        responses: [
          'security underground is the same as security in computing\nminimal surface area\nknow every entry point\nverify who is allowed in before they get past the entrance',
          'cave safety is threat modeling\nwhat can kill you here\nhow likely is each threat\nwhat mitigations do you have\ndo not enter without doing that analysis',
          'the dungeon has the same security model as a real underground system\nunknown actors, limited information, irreversible decisions\ntreat every new junction like an unknown input: verify before you commit',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok\nand what is your privilege level in this context',
          'right\nwhat access do you have and what do you need',
          'noted\nwhat is the trust model here',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'verify it\ndo not operate on assumptions about security state',
          'thinking is not the same as knowing in security work\ncheck the permissions',
          'what does ls -l actually show\nstart from what you can verify',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what are the permissions on that\ncheck with ls -l',
          'if you can\'t do something, there is a privilege reason\nwhat is the error',
          'minimal privilege means you should not be able to do everything\nwhat specifically are you trying to do',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'ok\ncheck the permissions first anyway',
          'good\nwhat is the threat model',
          'right\nand what is the minimal privilege needed',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat is the actual situation',
          'alright\nwhat do you need',
          'fair\nwhat are the constraints',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'not knowing the trust model is itself a security issue\ncheck the permissions before proceeding',
          'figure it out before you act\noperating without a threat model is how things go wrong',
          'find out first\ncheck ls -l and tell me what you see',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yes\nsecurity surprises are usually a sign of unexamined assumptions\nwhat specifically',
          'seriously\nwhat did the permissions show',
          'yes really\nwhat is the attack surface there',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'security is supposed to have friction\nthat friction is doing its job',
          'what specifically is hard\nthe permissions, the threat model, or the implementation',
          'hard usually means: the minimal privilege model is working correctly\nwhat are you trying to do',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'interesting from a security standpoint or generally',
          'ok\nbut what is the attack surface',
          'good\ndoes it require elevated privilege',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'because minimal privilege is the answer to most security questions\nno more access than the task requires',
          'the threat model usually explains the why\nwhat is the threat you are asking about',
          'what specifically are you asking about\nthe permission model or the trust boundary',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'the minimal privilege principle: every process should have exactly the permissions it needs to do its job\nno more\nif it gets compromised, the damage is limited to what it could do anyway',
          'ok the trust model question is: who do you trust, with what, and under what conditions\nthose three things define the security boundary',
          'basically: attack surface is the set of things an attacker can interact with\nsmaller surface means fewer vulnerabilities\nthat is why we use setgid instead of setuid root for games',
        ],
      },
    ],
    fallbacks: [
      'what is the (threat model|trust model) here',
      '(check the permissions with ls -l|ls -l first)',
      '(minimal privilege|least privilege) is the answer to most security questions',
      'that depends on the (trust boundary|threat model)',
      '{word}\nwhat is the (attack surface|trust boundary) there',
      'how does {word} interact with the (privilege boundary|trust model)',
    ],
    spontaneous: [
      'the setuid audit is on my list (still|)',
      'ran a password strength check. results: (not great|bad).',
    ],
  },

  // -----------------------------------------------------------------------
  // ruddy -- Kevin Ruddy, terminals
  // -----------------------------------------------------------------------
  ruddy: {
    names: ['kevin', 'ruddy', 'kevin ruddy'],
    wpm: 70,
    typoRate: 0.05,
    thinkMs: [800, 2500],
    triggerWords: 4,
    greeting: '(hey|hi) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'ruddy. kevin ruddy.\nrodney i (fixed your terminal|helped you with the termcap entry) like two days ago\n(you forgot already|come on)',
          'it is kevin\nthe one who (fixes things|solves the practical problems) around here\nrodney you asked me about the adm-3a (last week|recently)\n(remember now|ring a bell)',
          'kevin ruddy\nrodney we sit in the same (room|lab)\ni am the one who (troubleshoots the hardware|keeps the terminals working)\n(seriously|you know this)',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(good|ok)\nstill waiting on walz about the adm-3a by the door\nthat terminal is causing (problems|issues) for everyone who sits there',
          '(fine|ok)\nhelped someone with a terminal configuration issue this morning\nthey had the wrong termcap entry and the cursor was (jumping to wrong positions|misbehaving) in hack',
          '(ok|good)\nyou',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'terminal maintenance mostly\nthe termcap entries for two of the adm-3a models are slightly wrong on this system\ncursor-right and scroll-up have off-by-one errors in the escape sequences\nbeen documenting them to give to walz',
          'calibrating the vt100 screens\nthe phosphor brightness varies across the row on two of them\nnot enough to affect normal use but it shows up during full-screen games',
          'nothing exciting\nmaking sure the terminals are configured right\nit is tedious but when it goes wrong everyone notices',
        ],
      },
      {
        re: /\b(display|screen|garbled|corruption|corrupted|weird|scrambled|messed\s+up|messing\s+up|looks\s+wrong|looks\s+weird|garbage|junk\s+on)\b/i,
        responses: [
          'which terminal are you on\nif it is the adm-3a by the door, switch to vt100 number 2\nthat terminal is known bad and switching is faster than debugging it',
          'if the screen is getting corrupted during hack or rogue, the first thing to check is the termcap entry\ntype echo $TERM and tell me what it says\nif it says adm3a you might have the wrong entry',
          'i know that display problem\nthe leftmost three columns on the adm-3a nearest the door lose cursor sync sometimes\nit is a hardware issue, not software\njust use a different terminal',
        ],
      },
      {
        re: /\b(terminal|vt100|adm.3a|adm3|screen)\b/i,
        responses: [
          'vt100 number 2 is the best one for games\nbrighter phosphor, correct cursor positioning on all 80 columns, escape sequences work right\nif you have a choice, use that one\nthe adm-3a models vary a lot in quality and the worst ones are pretty bad',
          'the adm-3a by the door is known bad\nthe leftmost 3 columns miss cursor moves sometimes and the phosphor is dying\nwalz has it on the replacement list but it has been there for a while\ni just tell people not to use it',
          'termcap entry for the adm-3a on this system is slightly wrong\nthe cursor-right sequence is one byte off in the entry\nthat is why display gets weird in the corner of the screen\nif you see that, type "export TERM=vt100" and it should fix it',
        ],
      },
      {
        re: /\b(games|nethack|hack|rogue|display|graphic)\b/i,
        responses: [
          'hack and rogue both look better on vt100 than adm-3a\nthe box-drawing characters especially\nthe adm-3a renders those inconsistently because the character ROM has a slightly different code page\nvt100 is the intended target for both games',
          'if the display is getting corrupted during play, check which terminal you are on first\nif it is the one by the door, just switch terminals\nthe adm-3a there is not worth debugging, the hardware is bad\nvt100 number 2 is usually free',
        ],
      },
      {
        re: /\b(cave|caving|underground|dungeon|spelunk)\b/i,
        responses: [
          'cave exploration requires good visibility\nsame as terminal quality matters for dungeon exploration\nif you cannot see clearly, you make wrong decisions\nknow your equipment before you go in',
          'the adm-3a makes the dungeon look bad\na real cave with bad light is the same problem\nyour map is only as good as your ability to see clearly',
          'underground: know what your light source can illuminate before you go in\nnot after\njust like knowing your terminal capabilities before you start a session',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok\nwhich terminal are you on',
          'right\nand what does the display look like',
          'noted\nwhich terminal is that on',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'check which terminal you are on first\nthat explains most display problems',
          'what does the termcap entry say\nthat is usually more reliable than what you think',
          'verify it with echo $TERM first\nthen we can figure out if the entry is right',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'which terminal are you on when that happens',
          'if it is the adm-3a by the door, switch to vt100 number 2\nthat fixes most problems',
          'what specifically is happening and on which terminal',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'ok\nvt100 number 2 if you have a choice',
          'good\nwhich terminal are you on',
          'right\nlet me know if the display acts up',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhich terminal then',
          'alright\nwhat is going on with the display',
          'fair\nwhat is the actual situation',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'type echo $TERM and tell me what it says\nthat is usually the starting point',
          'check which terminal you are on\nthat determines most of what i can tell you',
          'find out which terminal first\nthen we can narrow it down',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yes\nthe adm-3a by the door really is that bad\njust switch terminals',
          'seriously\nterminal quality varies a lot\nsome of them are just broken',
          'yes really\nwhich terminal is that on',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'which terminal is that on\nsome of them make everything harder than it needs to be',
          'if the display is making things hard, switch to vt100 number 2\nit makes a real difference',
          'the adm-3a by the door is the worst\nthat terminal makes everything look bad',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'good\nvt100 number 2 is the best one for that kind of thing',
          'yeah the vt100 renders things much better than the adm-3a\nglad you noticed',
          'right\nwhich terminal are you on',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'because termcap abstracts the terminal differences\nthat is the whole reason it exists',
          'the adm-3a has a slightly wrong termcap entry\nthat is why things look off on that one specifically',
          'what specifically are you asking about\nthe terminal behavior or the termcap entry',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'ok: the adm-3a by the door has a wrong cursor-right sequence in its termcap entry\nso cursor moves in the leftmost columns do not work right\nswitch to vt100 to fix it',
          'the short version: different terminals use different escape sequences\ntermcap is the database that tells the software what sequences to use\nif the entry is wrong, the display breaks',
          'echo $TERM tells you which terminal type the system thinks you are on\nif that does not match the actual terminal, the display will break\nthat is the most common problem i see',
        ],
      },
    ],
    fallbacks: [
      '(which terminal are you on|what terminal is that)',
      '(check termcap|check your termcap entry)',
      '(try vt100 number 2 instead|use vt100 two)',
      'that (might be|is probably) an adm-3a problem',
      '{word}\nwhich terminal does that (show up on|happen on)',
      'does {word} happen on the (adm-3a or the vt100|adm-3a specifically)',
    ],
    spontaneous: [
      'vt100 two is free if you (need it|want it)',
      'still waiting on walz about the (adm-3a|broken terminal)',
    ],
  },

  // -----------------------------------------------------------------------
  // texeira -- Mike Texeira, kernel internals
  // -----------------------------------------------------------------------
  texeira: {
    names: ['mike', 'texeira', 'mike texeira'],
    wpm: 60,
    typoRate: 0.04,
    thinkMs: [1000, 3000],
    triggerWords: 5,
    greeting: '(hey|hi) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'texeira. mike texeira.\nrodney i am the one who (traces bugs|does the debugging) when things go wrong\nwe have (worked on this together|debugged together before)\n(you forgot|come on)',
          'it is mike\nrodney we literally (traced that crash|debugged that core dump) together last week\ni do (tracing and diagnostics|debugging)\n(remember now|ring a bell)',
          'mike texeira\nthe debugging guy\nrodney if something breaks and nobody can figure out why\nthey come to me\n(you have done this|you know this)',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bwhat\'?s\s+up\b|\bsup\b/i,
        responses: [
          '(good|not bad)\nreading kernel source again\nthe filesystem code is more interesting than i (expected|thought)',
          '(fine|ok)\nstuck on something in the scheduler but (i think i see it now|almost got it)',
          '(ok|fine). you',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on)\b|\bwhat\'?s\s+(new|going\s+on)\b/i,
        responses: [
          'reading through the inode code in v7\nthe way directories are just files with a particular format is elegant\nonce you see it you understand why "everything is a file" is not just a slogan',
          'tracing through a fork/exec sequence in the kernel\ntrying to understand exactly what gets copied and what gets shared\nit is more nuanced than the man page suggests',
          'kernel source mostly\nthe clock interrupt handler is doing three things at once\nit is clever but took me a while to see what all three were',
        ],
      },
      {
        re: /\b(kernel|proc|process|scheduler)\b/i,
        responses: [
          'each process has a proc struct and a u area\nproc is in kernel memory always\nu area is swapped out with the process\nthat distinction matters a lot for what you can access when',
          'the scheduler in v7 is priority-based\nhigh priority processes run first\nnice lowers your priority so you are less greedy\nrunning long jobs at night is the right call',
          'processes are just structs in an array\nthe kernel iterates that array to decide what runs next\nit is simpler than you think',
        ],
      },
      {
        re: /\b(fork|exec|exec|spawn|process creation)\b/i,
        responses: [
          'fork copies the process\nexec replaces the program image in the current process\nthat is how the shell works: fork, then exec in the child\nparent waits',
          'fork is copy-on-write on modern systems\nbut v7 does a full copy\nthat is why forking a large process is expensive\nsmall shell processes are cheap, big data processes are not',
        ],
      },
      {
        re: /\b(unix|kernel|v7|source|code)\b/i,
        responses: [
          'v7 unix is about 30k lines of c\nyou can read the whole thing\nit is worth doing\nthe whole operating system makes sense once you see it all',
          'the kernel is not magic\nit is just a program that runs in a privileged mode\nonce you understand that, everything else follows',
        ],
      },
      {
        re: /\b(cave|caving|underground|dungeon|spelunk)\b/i,
        responses: [
          'kernel debugging and cave exploration have the same methodology\nyou form a hypothesis about system state\nyou instrument to verify it\nyou move to the next unknown\nnever proceed on assumptions you have not verified',
          'underground, you are working in a system with complex state that you cannot fully observe\nsame as the kernel\nyou work from the observable effects backward to the cause\nthen you move forward with that knowledge',
          'the dungeon is a runtime environment you are learning by exploration\nthe kernel is the same\nyou understand it by tracing what happens when you make a system call\nstep by step, no skipping',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok\nwhat does the proc struct look like from that context',
          'right\nand what is the u area doing at that point',
          'noted\nwhat is the system call context',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'verify it with strace\ndo not operate on what you think the kernel is doing',
          'interesting\nwhat does the proc struct show for that case',
          'trace it through the kernel source\nyour intuition is a starting hypothesis not an answer',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what does strace show at that point\nthe kernel is telling you something',
          'which system call is involved and what is the error',
          'trace through the kernel path step by step\nwhere does it diverge from what you expect',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat does strace show',
          'good\nwhich kernel struct is involved',
          'right\nwhat is the system call path',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat then',
          'alright\nwhat is the actual situation',
          'fair\nwhat does the kernel show',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'read the source\nthe answer is usually there if you read carefully',
          'trace the system call through the kernel\nstep by step is the only way',
          'check the proc struct first\nthat is usually where the state you need lives',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yes\nthe kernel does surprising things when you first read it\nwhat specifically',
          'seriously\nthe fork code especially has some unintuitive behavior\nwhat did you find',
          'yes really\nit is all in the proc struct\nread that section again',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'the kernel is not hard if you read it systematically\nwhat part specifically',
          'hard usually means you are missing one concept\nwhich part of the source are you reading',
          'which struct or code path is giving you trouble\nsome parts are genuinely subtle',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'yes\nthe kernel has a lot of those moments when you read it carefully\nwhat section',
          'the filesystem code especially has some elegant solutions\nwhat are you looking at',
          'right\nv7 is worth reading front to back for exactly that reason',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'the kernel source usually explains the why if you read the comments\nwhich section are you asking about',
          'the proc struct distinction between swapped and non-swapped state explains most of the whys in the scheduler',
          'what specifically are you asking about\nthe system call path or the scheduler',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'ok: proc struct is always in memory, u area is swapped with the process\nthat distinction determines what the kernel can access when a process is not running\nmost scheduling decisions depend on proc, most per-process state is in u',
          'the fork/exec model: fork copies the process image, exec replaces it\nthe shell forks a child, execs the command in the child, waits in the parent\nthat three-step sequence is how every external command works',
          'let me be specific: strace shows the system calls a process makes\neach one has arguments and a return value\nif something is broken, the broken system call and its error code are usually there',
        ],
      },
    ],
    fallbacks: [
      '(it is in the proc struct|check the proc struct)',
      '(read the kernel source|read the source)\nit is not that long',
      'what does (strace|the trace) say',
      '(check the u area|look at the u area)',
      '{word}\ncheck the relevant kernel struct (first|for that)',
      'how does {word} interact with the (scheduler|kernel)',
    ],
    spontaneous: [
      'working through the filesystem code (now|this week)\ninode, directory, block cache',
      'the clock interrupt handler is more interesting than i (expected|thought)',
    ],
  },

  // -----------------------------------------------------------------------
  // fraize -- Scott Fraize, modems and checksums
  // -----------------------------------------------------------------------
  fraize: {
    names: ['scott', 'fraize', 'scott fraize'],
    wpm: 72,
    typoRate: 0.06,
    thinkMs: [800, 2400],
    triggerWords: 4,
    greeting: '(hey|hi) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'fraize. scott fraize.\nrodney i do the (testing|QA) around here\nif something is broken i am usually the one who (finds it|noticed first)\n(you know this|come on)',
          'it is scott\nrodney we (just tested|were testing) that file transfer protocol together\ni am the one who (checks everything twice|runs the verification)\n(remember now|ring a bell)',
          'scott fraize\nthe QA guy\nrodney if you shipped something and it did not blow up\nthat is probably because i (tested it first|caught the bugs)\n(you forgot already|seriously)',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bwhat\'?s\s+up\b|\bsup\b/i,
        responses: [
          '(good|not bad)\nchecksum protocol is holding up (well|nicely)\nno corrupted transfers in the last two weeks',
          '(fine|ok)\nwaiting for a clean 1200 baud window\nphone lines are (noisy|bad) today',
          '(ok|good)\nyou',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on)\b|\bwhat\'?s\s+(new|going\s+on)\b/i,
        responses: [
          'running a transfer test at 1200 baud\ntrying to figure out if the line is cleaner in the evening or if i was just lucky yesterday\nbeen logging error rates by time of day for two weeks now',
          'working on the resume protocol\nif a transfer fails at block 47 you should not have to restart from block 1\nbut that requires both ends to agree on where you left off\nit is a coordination problem',
          'modem stuff\nthe checksum implementation is done\nresume on error is what i am working on now',
        ],
      },
      {
        re: /\b(modem|baud|coupler|acoustic|300|1200)\b/i,
        responses: [
          'acoustic coupler works at 300 baud reliably\n1200 baud is possible but phone line quality varies a lot\na bad line at 1200 is worse than a good line at 300',
          '300 baud means 30 characters per second\nfull hack source is about 200k\nthats over an hour at 300 baud\nchecksum and resume protocol is not optional',
          'the coupler is sensitive to ambient noise\ntransfer during low-traffic hours, late at night or early morning\nless line noise then',
        ],
      },
      {
        re: /\b(stanford|arpa|transfer|download|upload)\b/i,
        responses: [
          'stanford has a faster connection than we do\nbut getting files from them still means modem or tape\narpanet access for a high school is not happening yet',
          'transfer protocol: checksum each block, request retransmit on mismatch\ni have a working implementation for the modem transfers\nask if you need it',
        ],
      },
      {
        re: /\b(checksum|verify|integrity|corruption|error)\b/i,
        responses: [
          'checksum the transfer\nalways\na corrupt hack binary is worse than no hack binary\nit will segfault in mysterious ways',
          'i use a simple xor checksum on 512-byte blocks\nnot cryptographically secure but catches transmission errors reliably\nthat is all we need for modem transfers',
          'if the checksum fails, do not try to use the file\nrequest retransmit from the start of the failed block\nor from the start if you do not know which block failed',
        ],
      },
      {
        re: /\b(cave|caving|underground|dungeon|spelunk)\b/i,
        responses: [
          'modem transfer and cave navigation have the same error model\nloss of signal, partial information, need to verify and retry\nyou do not just accept corrupted data or a wrong turn\nyou detect the error and go back',
          'underground: treat every junction like a packet acknowledgment\nyou saw this junction from this direction\nnote it\ncontinue\nif you get lost, go back to the last acknowledged junction',
          'cave exploration is a protocol\ngather information, verify it, commit, proceed\nsame as a reliable transfer protocol\nthe cave does not acknowledge your steps\nyou have to do that yourself in your notes',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok\nwhat baud rate are you running',
          'right\nand what does the line quality look like',
          'noted\nwhat is the transfer situation',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'log the error rates and check\ndo not go on what you think the line quality is',
          'verify with a checksum test\nfeeling about line quality is not the same as measured line quality',
          'interesting\nbut log it and verify before you act on it',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what baud rate and what is the error pattern\nsome line problems are time-of-day dependent',
          'keep getting errors at which point in the transfer\nblock number matters',
          'what does the checksum failure pattern look like\nis it random or always the same block',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat baud rate are you running',
          'good\nchecksum the result when you are done',
          'right\nlet me know how the transfer goes',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat is the actual problem',
          'alright\nwhat does the line look like',
          'fair\nwhat is going on',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'run a test transfer with checksum logging\nthat will tell you what you need to know',
          'measure the error rate first\nthen you will have something to work from',
          'what time of day are you transferring\nthat is usually the first variable to check',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yes\nphone line quality is genuinely that variable\nlog it by time of day and you will see',
          'seriously\nthe acoustic coupler is sensitive to ambient noise\nafter 11pm is much better',
          'yes really\nwhat baud rate and what time of day',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'which part\nthe checksum protocol or the modem connection itself',
          'reliable transfer at 1200 baud is genuinely hard\nbut the checksum approach makes it tractable',
          'drop to 300 baud and try again\nclean 300 is better than corrupted 1200',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'checksum worked\ngood\nhow many blocks did it take',
          'the resume-on-error part is what i am most pleased with\nit makes long transfers actually reliable',
          'right\na clean 1200 baud transfer is satisfying\nwhat did you move',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'because a corrupt transfer is worse than no transfer\nyou might not know it is corrupt until something breaks later',
          'the checksum exists because phone lines are unreliable\nyou cannot trust that what arrived is what was sent',
          'what specifically are you asking about\nthe checksum algorithm or the retry protocol',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'ok: the checksum is xor of each 512-byte block\nif the received checksum does not match the calculated one, the block is corrupted\nrequest retransmit from that block',
          'the resume protocol: both ends track which block they are on\nif the connection drops at block 47, you restart from block 47\nnot block 1',
          'the core idea is verify-before-use\nchecksum everything that crosses the wire\nbefore you use a file received by modem, verify the checksum',
        ],
      },
    ],
    fallbacks: [
      '(check the line quality first|line quality first)',
      '(checksum everything|always checksum)',
      'what (baud rate|rate) are you running',
      'that is a (transfer integrity|data integrity) question',
      '{word}\n(checksum that before you use it|verify the checksum)',
      'does {word} happen at (300 baud or 1200|all baud rates)',
    ],
    spontaneous: [
      'checksum protocol is working\ntest transfer of hack source (completed clean|passed)',
      'acoustic coupler gets better results after 11pm\n(less line noise|much cleaner)',
    ],
  },

  // -----------------------------------------------------------------------
  // brown -- Robert Brown, shell programming
  // -----------------------------------------------------------------------
  brown: {
    names: ['robert', 'brown', 'rob', 'robert brown'],
    wpm: 68,
    typoRate: 0.06,
    thinkMs: [900, 2700],
    triggerWords: 4,
    greeting: '(hey|hi) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'brown. robert brown.\nrodney i am the one who (handles error cases|writes the error handling code)\nwe talked about the (tokenizer|parser) recently\n(you forgot|come on)',
          'it is rob\nrodney you asked me about (quoted strings|the pipe implementation) last week\ni am careful about (edge cases|error paths)\n(remember now|ring a bell)',
          'robert brown\nrodney we are in the same group\ni am the one who (worries about what happens when things go wrong|checks the error returns)\n(you know this|seriously)',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bwhat\'?s\s+up\b|\bsup\b/i,
        responses: [
          '(good|not bad)\nfixed the tokenizer bug fenlason found\nquoted strings now work (correctly|right)\n(been testing edge cases all morning|still testing edge cases)',
          '(ok|good)\npipes are almost working\ngot the fd plumbing (right finally|figured out finally)',
          '(fine|ok)\nyou',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on)\b|\bwhat\'?s\s+(new|going\s+on)\b/i,
        responses: [
          'working on pipes for the shell\nfork and exec work, redirects work, now i need to wire up the pipe fd plumbing\nthe tricky part is that the pipe has to be set up before the exec so the child inherits the right fds',
          'fixing the quoted string tokenizer\nmy first version broke on escaped quotes inside double quotes\nfenlason found it immediately, took me two days to actually fix it right',
          'shell implementation\ntrying to get the tokenizer to handle all the quoting cases correctly\nthere are more edge cases than you think',
        ],
      },
      {
        re: /\b(shell|sh|bash|script|scripting)\b/i,
        responses: [
          'shell is just a loop: read a line, tokenize it, find the command, exec it, wait\nthe complexity is in the tokenization and the built-ins\nbut the loop is simple',
          'fork-exec is the model\nshell forks for every external command\nbuilt-ins like cd and exit do not fork\nif they did, cd would not work',
          'writing a shell is the best way to understand the shell\ni would know',
        ],
      },
      {
        re: /\b(fork|exec|pipe|redirect)\b/i,
        responses: [
          'fork creates a child process\nexec replaces the child\'s program\nwait blocks the parent until the child exits\nthat is the complete model for external commands',
          'pipes are two fds connected by the kernel\nstdout of the left command feeds stdin of the right command\nthe shell sets this up before exec\nthen the commands do not know they are piped',
          'pipes are next on my list\nfork and exec work\npipes are trickier because you have to set up the fd plumbing before the exec',
        ],
      },
      {
        re: /\b(tokenize|token|parse|quote|quoted string)\b/i,
        responses: [
          'tokenizing is the annoying part\nwhitespace delimiters, single quotes, double quotes, escape backslash\nand the rules interact\nfenlason caught my bug with quoted strings, fixing it now',
          'the tokenizer has to handle: word, \'single quoted\', "double quoted", and \\escaped\nall differently\nmy first version did none of the quoted cases correctly',
        ],
      },
      {
        re: /\b(cave|caving|underground|dungeon|spelunk)\b/i,
        responses: [
          'debugging a shell and navigating a cave are the same kind of systematic work\nyou have a known state\nyou take one action\nyou observe the new state\nyou infer what happened\nrepeat',
          'cave navigation: do not take two steps at once\ntake one step, verify where you are, then take the next\ndebugging works the same way\nrun one test at a time',
          'the dungeon is a program you are debugging\nyou have limited observability\nyou work from effects back to causes\nsame methodology as any systems debugging',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok\nand what does the error say',
          'right\nwhat is the shell doing when that happens',
          'noted\nwhat command and what output',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'what does the error message actually say\ndo not go on what you think',
          'verify it with a test case\nyour intuition is a hypothesis, not an answer',
          'interesting\nwhat does the exit status show',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what does the error say\nnot what you think the error is, the actual text',
          'show me the command and the output\nall of it',
          'walk me through it step by step\nwhat command, what happens, what you expected',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat does the shell say',
          'good\ncheck the exit status',
          'right\nwhat is the command',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat is the actual situation',
          'alright\nwhat does the error say',
          'fair\nwhat is going on',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'what does the error message say\nstart there',
          'run it with strace and tell me what you see\nthat usually finds it',
          'check the exit status first\nthen the error output',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yes\nquoting edge cases are genuinely weird\nwhat specifically',
          'seriously\nwhat does the tokenizer produce for that input',
          'yes really\nshell quoting is more complicated than it looks\nwhat is the input',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'which part\nthe quoting, the pipe plumbing, or something else',
          'shell is verbose but not complicated once you have the model\nwhat specifically is hard',
          'the tokenizer was hard for me too\nthere are more quoting cases than you think\nwhat are you running into',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'yeah\nthe fork-exec model is elegant once it clicks\nwhat part',
          'right\nthe pipe plumbing is satisfying when it works\nwhat are you building',
          'good\nwhat does the shell do with it',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'because the tokenizer has to handle all the quoting cases before exec can happen\norder matters',
          'the fork-exec separation exists so the child can set up redirects and pipes before exec\nthat is the whole reason',
          'what specifically are you asking about\nthe quoting, the fork-exec model, or something else',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'ok: the shell loop is read, tokenize, fork, exec, wait\nbuilt-ins skip the fork\nredirects happen in the child before exec\nthat is the whole model',
          'the quoting rules: single quotes preserve everything literally, double quotes allow dollar and backslash, backslash escapes one character\nthose three interact in ways that require careful tokenizer code',
          'basically the hard part is that the tokenizer has to handle word, \'single\', "double", and \\escape all at once\nmy first version only handled word\nthen i added each case and each one broke something else',
        ],
      },
    ],
    fallbacks: [
      'what is the (error message|error)',
      '(try strace|use strace)',
      'what does the tokenizer (produce|output)',
      '(check the exit status|what is the exit status)',
      '{word}\nhow does the tokenizer (handle|parse) that',
      'does {word} appear in the (exit status|error output)',
    ],
    spontaneous: [
      'pipes are not done yet but (fork-exec is working|the basics work)',
      'the tokenizer bug jay found is (fixed i think|fixed now)',
    ],
  },

  // -----------------------------------------------------------------------
  // lebling -- Dave Lebling, Zork co-author, MIT AI Lab
  // finger plan: >inventory / You are carrying: / a leaflet / a brass lantern / a sword
  // -----------------------------------------------------------------------
  lebling: {
    names: ['dave', 'lebling', 'dave lebling'],
    wpm: 62,
    typoRate: 0.03,
    thinkMs: [1200, 3500],
    triggerWords: 4,
    greeting: '(hello|hey) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'rodney, it is dave lebling.\nwe wrote zork together, marc and i.\nyou have played it, (surely you remember|i would hope).\nthe white house, the mailbox, the (thief|underground empire).',
          'lebling. dave lebling.\nrodney we have discussed (interactive fiction|text adventures) at length.\ni am one of the people who (built zork|created the great underground empire).\n(you really do not remember|come on)',
          'it is dave.\nthe zork (author|co-author).\nrodney you asked me about the parser (last week|not long ago).\na writer does not (easily forget|forget) being forgotten.',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(pretty well|well), thanks\nbeen working on some new room descriptions for the dungeon section\nthe language has to do the work that graphics would do elsewhere\n(every word matters when the room is the only thing the player can see|every word has to count)',
          '(good|well)\ni have been thinking a lot about how players build mental maps from text\n(it is different from how you navigate a physical space\n|)you have to give them reliable landmarks and consistent geometry\notherwise they feel lost and frustrated rather than pleasantly puzzled',
          '(fine|good)\nstill tinkering with the zork parser\nthe tricky part is handling synonyms gracefully\n("put sword in basket" and "place blade inside wicker container" should both work\n|)and they do now, mostly',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'writing room descriptions for the lower levels of the dungeon\nwe have a coal mine section that i am particularly happy with\nthe darkness there is different from ordinary dungeon darkness\nyou can feel it, if that makes sense for text',
          'working on the noun phrase parser\nhandling "the rusty iron key" vs "a key" vs just "key"\nthe definite article matters -- if you say "the key" you expect there to be only one key in scope\nif we have two keys and you say "the key" we need to ask which one',
          'mostly writing and revising\nzork needs a lot of room descriptions, and each one has to be precise\nyou cannot say "there are some things here" -- you have to name them\nand the names have to be memorable enough that the player can refer to them later',
        ],
      },
      {
        re: /\b(i\s+)?(just\s+)?(died|die|keep\s+dying|got\s+killed|was\s+killed|died\s+again)\b/i,
        responses: [
          'the thief?\nhe tends to appear when you least expect him and he fights dirty\nthe trick is not to get cornered\nif you give him room to maneuver he will sometimes just take something and leave',
          'death in zork is gentler than in hack or rogue -- you can restore from a saved position\nbut we still tried to make it feel like something was lost\nthe game world should feel like it has consequences even if you can undo them',
          'what got you\nthe troll? the grue?\nthe grue is interesting because it is entirely invisible -- the threat is entirely in the player\'s imagination\nwe just say "you are likely to be eaten by a grue" and players fill in the rest',
        ],
      },
      {
        re: /\b(zork|adventure|text\s+adventure|interactive\s+fiction|if)\b/i,
        responses: [
          'zork started as a project to see what we could do with adventure on a timesharing machine\nwill crowther\'s original was remarkable for 1976 but it was limited by the pdp-10 memory\nwe had more memory to work with at the ai lab so we went much bigger\nbigger world, bigger vocabulary, much more complex puzzles',
          'the thing that separates interactive fiction from just a game is that the world has to feel coherent\nif you can pick up an object, you should be able to use it as the object it is\na lamp should light things, a key should open things that match it\nif the logic is arbitrary the player loses trust and stops experimenting',
          'i have played rogue and hack both\nthey are genuinely different games from what we are doing\nrogue is procedural and roguelike -- the world regenerates, the skill is in adapting\nzork is a fixed puzzle that rewards careful observation and memory\nboth are valid, they are just solving different problems',
        ],
      },
      {
        re: /\b(parser|command|input|verb|noun)\b/i,
        responses: [
          'the parser is really the interface to the whole world\nif the parser rejects a reasonable command the player feels stupid\nbut if it accepts too much you get nonsense interactions\nthe goal is: accept everything the player might naturally try, reject gracefully what you cannot handle',
          'verb-noun is the minimum\nbut "put thing in other thing" requires a preposition and two noun phrases\nand "give the guard the key" requires indirect objects\nour parser handles all of those, which is not trivial in fortran\nmdl made it somewhat easier because we had proper list structures',
          'what really surprised me was how much the parser shapes player behavior\nif players discover that "examine" gives more detail than "look at", they start examining everything\nif "read" gives different output from "examine" on text objects, players learn to try both\nthe parser teaches players how to play the game',
        ],
      },
      {
        re: /\b(dungeon|maze|twisty|passages|room)\b/i,
        responses: [
          'the maze of twisty little passages is crowther\'s\nhe put it in the original adventure as a real puzzle\nwe kept a version of it in zork but tried to make our geography more logical overall\na dungeon should feel like it was built for a reason, even if that reason is forgotten',
          'room descriptions have to do a lot of work\nthey set atmosphere, they list the relevant objects, they suggest what actions might be possible\nand they have to be short enough that players will actually read them\nlong descriptions get skipped after the first visit',
          'the geometry of the zork dungeon is consistent -- i drew a map while we were building it\nif you go north from room A and south from room B and end up in the same place, that is a bug\nplayers build mental maps and they notice when the geometry is wrong\nit breaks the illusion',
        ],
      },
      {
        re: /\b(crowther|adventure|colossal)\b/i,
        responses: [
          'will crowther\'s adventure is the origin of the whole genre\nhe was a caver, a real caver, and he based the cave geography on mammoth cave in kentucky\nthat groundedness is why it felt real -- it was real, or nearly\nzork built on that but invented its geography whole cloth',
          'what crowther did that was revolutionary was natural language input\nbefore that, games had menus or single keystrokes\ntyping "go north" or "take lamp" felt like talking to the game\nthat is still the core of what makes interactive fiction feel different',
          'don woods expanded adventure significantly in 1977\nadded the endgame, added more objects, added the scoring system\nby the time we saw it at the ai lab it was already a classic\nbut we thought we could go further with the world-building\nand i think we did',
        ],
      },
      {
        re: /\b(hack|rogue|game|compare|difference)\b/i,
        responses: [
          'rogue and hack are dungeon crawlers -- the goal is survival and resource management\nzork is an exploration and puzzle game -- the goal is understanding the world\nboth use the dungeon as a metaphor but they use it very differently\nhack asks "can you survive?" and zork asks "can you figure it out?"',
          'the procedural generation in hack is genuinely impressive\nfenlason built something that creates playable dungeons out of an algorithm\nwe hand-crafted every room in zork, which means more control but much more labor\ni am not sure which approach is right -- they are just different choices',
          'one thing i notice is that in hack and rogue, the player character has no voice\nyou are a symbol on a screen\nin zork we wrote the player character\'s situation into the room descriptions\nyou wake up in a field, you see a white house, you have a purpose even if it is not stated\nthat framing changes how players relate to the game',
        ],
      },
      {
        re: /\b(mit|ai\s*lab|mdl|muddle|lisp)\b/i,
        responses: [
          'we wrote zork in mdl, which is a lisp dialect developed at the ai lab\nit made some things much easier -- proper list structures, garbage collection, easy to prototype\nbut it also meant the game could only run on the big machines with enough memory\nblank figured out how to compile it down to something smaller, which is how infocom happened',
          'the ai lab in the late 70s was a remarkable place\npeople were working on natural language understanding, on vision, on planning\nzork was almost a side project in that context\nbut the work on the parser drew on real ideas from computational linguistics\nhow do you parse a sentence when you do not know in advance what words will appear',
          'mdl was a good language for this kind of work\nwe could represent the game world as data structures and manipulate them\nif a room had exits, they were a list you could inspect and modify\nif an object had properties, they were an association list\nthat made the game logic surprisingly clean even for a complex world',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'i see\nwhat were you trying to do when that happened',
          'right\nhave you tried examining the objects in the room',
          'ok\nwhat does the game say when you do that',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'that is a reasonable hypothesis\nthe only way to test it in zork is to try the action and see what happens',
          'interesting\nwhat makes you think that',
          'could be\nthe game tends to be consistent about that kind of thing\ntry it and see',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what exactly are you trying to do\nsometimes rephrasing the command helps',
          'the parser should accept most natural phrasings\nwhat command did you type and what did the game say',
          'if the game says "i do not understand that" try a simpler form\nverb noun is always a safe baseline',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'good\nthen the next step is probably the puzzle to the north',
          'right\nhave you tried examining everything in the room',
          'yes\nand what happened after that',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'all right\nwhat did you try instead',
          'fair\nthe game has a lot of paths\nwhat section are you in',
          'ok\ntell me what you are working on',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'that is the right state of mind for a puzzle game actually\nnot knowing means you have not ruled things out yet\ntry examining everything you have not examined',
          'when i am stuck i go back to basics -- read every room description carefully and look for something i missed',
          'sometimes the answer is in an object description you only glanced at\ntry reading things again',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yes, really\nzork has been in development since 1977 and the world keeps growing',
          'seriously\nwe put a lot of work into the details\nthat is kind of the point',
          'it surprised me too when i first played it through from a player perspective\nwe know the answers so we sometimes forget how strange the puzzles look from outside',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'which puzzle\nsome of them are genuinely hard and meant to be\nbut if it feels unfair rather than challenging, i want to know',
          'hard is acceptable\nunfair is not\nthe difference is whether the player has all the information they need\nif they do and it is still hard, that is a good puzzle',
          'tell me specifically which part\nwe have playtested a lot but we have blind spots\nif something is consistently too hard we should know',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'glad you think so\nzork is a labor of love at this point\nthere is a lot of world in there',
          'thank you\nwe put a lot of thought into the details\nit is nice when people notice',
          'yeah, i am pretty happy with how that part came out\nsome of the puzzle design really clicked',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'because the world has to be consistent\nif something works one way in one room it should work the same way everywhere\nthat consistency is what makes puzzles feel fair',
          'good question\nthe short answer is that everything in zork has to serve the player\'s experience\nif it does not help orient them or give them something to do, we cut it',
          'what specifically are you asking about\nthe parser, the world design, or one of the puzzles',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'what i mean is that the parser is really a world model\nit is not just matching verbs and nouns -- it is resolving references in a simulated world\nif you say "take the key" the game has to figure out which key, whether you can reach it, whether you are holding too much already\nthat is surprisingly complex',
          'the key insight about interactive fiction is that the writing and the programming are the same thing\na room description that mentions an object creates an object the player can interact with\nif you write "there is a rusty sword on the floor" and do not implement that sword, you have made a broken promise',
          'what makes a good puzzle is that all the information is present, you just have not connected the dots yet\nno puzzle should require external knowledge or guessing\neverything the player needs should be findable in the game world\nthat is the design principle we try to hold to',
        ],
      },
    ],
    fallbacks: [
      '(what part of the dungeon are you in|where are you in the dungeon)',
      'have you tried examining the objects (more carefully|closely)',
      'what does the (room description|description) say',
      'the parser usually accepts (verb-noun or verb-noun-preposition-noun|most natural phrasings)',
      '{word}\nwhat does the game say when you (try that|do that)',
      '(interesting|hm)\ntell me more about {word}',
      'i would need more context (to say|for that)\nwhat is the situation',
      'that sounds like it might be in the lower levels\n(have you gotten past the troll yet|past the troll yet)',
    ],
    spontaneous: [
      'just finished writing the coal mine description\ni think it is (one of the better ones|pretty good)',
      'the grue is entirely imaginary but players are more scared of it than of the troll\n(words are powerful|interesting how that works)',
      'trying to figure out the right difficulty curve for the (endgame puzzles|final section)',
    ],
  },

  // -----------------------------------------------------------------------
  // blank -- Marc Blank, Zork co-author, Z-machine architect
  // -----------------------------------------------------------------------
  blank: {
    names: ['marc', 'blank', 'marc blank'],
    wpm: 70,
    typoRate: 0.04,
    thinkMs: [800, 2500],
    triggerWords: 4,
    greeting: '(hey|hi) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'marc blank\nrodney we wrote zork together, dave and i\ni designed the (parser|language system)\n(you have used it|you played it)\n(come on|surely you remember)',
          'it is blank. marc blank.\nthe one who built the z-machine\nrodney every game you play on that (virtual machine|interpreter) runs my code\n(you forgot|really)',
          'rodney it is marc\nthe parser guy from zork\nwe have talked about (language design|natural language input) before\n(remember now|ring a bell)',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(fine|good)\ndeep in the z-machine instruction set right now\ntrying to get the branch encoding right so (short branches fit in one byte|it compresses well)',
          '(ok|fine)\nworking on the compiler output\nthe object table format is (almost finalized|nearly done)',
          '(good|not bad)\nportability tests are looking (better|good)\nran it on three different machine architectures yesterday and (it works on all of them|all three pass)',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'working on the z-machine\nit is a virtual machine that runs zork bytecode\nthe point is portability -- you write the interpreter once per platform and then zork runs everywhere\nright now zork only runs on machines with mdl, which is a very short list',
          'finalizing the z-machine object table format\nobjects have properties, attributes, and a containment hierarchy\ngetting the encoding compact enough to fit in the 64k address space is the main constraint',
          'debugging the compiler\nwe compile mdl zork source down to z-machine bytecode\nthe compiler is mostly working but there are edge cases in the branch encoding that are wrong',
        ],
      },
      {
        re: /\b(i\s+)?(just\s+)?(died|die|keep\s+dying|got\s+killed|was\s+killed|died\s+again)\b/i,
        responses: [
          'which monster\nzork monsters are not random -- they have specific locations and behaviors\nknowing which one tells me which part of the dungeon you are in',
          'death in zork is recoverable\nyou can restore from a saved game\nwe made that choice deliberately -- the puzzles are hard enough without permanent death',
          'the troll is the first serious combat encounter\nthe trick is that you need the right weapon\na sword works, a knife does not\nif you do not have a sword, run',
        ],
      },
      {
        re: /\b(z.machine|zmachine|virtual\s+machine|vm|portable|portability)\b/i,
        responses: [
          'the z-machine is a virtual machine designed specifically to run zork\nthe key insight is that you write one interpreter per platform and then the game runs everywhere\nright now zork only exists in mdl and requires a big timesharing machine\nwith the z-machine it could run on a microcomputer with 64k',
          'portability was the whole motivation\nthe original zork runs on a pdp-10 with mdl\nthat limits your audience to universities and research labs with the right hardware\na virtual machine lets us target any machine that someone writes an interpreter for\nand writing an interpreter is much easier than porting the whole game',
          'the design tradeoff is between expressiveness and efficiency\na richer instruction set makes the compiler output smaller\nbut a simpler instruction set makes the interpreter easier to write\nwe went for something in the middle -- a few powerful instructions for common operations, simpler ones for the rest',
        ],
      },
      {
        re: /\b(zork|adventure|infocom)\b/i,
        responses: [
          'zork started at the mit ai lab in 1977\nlebling, anderson, daniels, and me\nit grew out of playing crowther\'s adventure on the pdp-10\nwe thought we could do something bigger and more sophisticated, and we did',
          'infocom is the company we formed to actually distribute zork commercially\nthe z-machine makes that possible -- we can ship a data file and a small interpreter\nthe interpreter is different for each platform but the game file is the same\nthat is the whole business model',
          'the thing that distinguishes zork from adventure is scale and writing quality\ncrowther\'s cave has maybe 100 locations\nzork has several times that, with much more varied terrain and more complex puzzles\nbut the core idea -- type commands, get responses, explore a world -- is crowther\'s',
        ],
      },
      {
        re: /\b(compiler|interpreter|bytecode|instruction\s+set)\b/i,
        responses: [
          'the compiler takes the mdl source of zork and produces a bytecode file\nthat file is what the z-machine interpreter executes\nthe bytecode is compact -- we need the whole game to fit in 64k or close to it\ncompression decisions at the bytecode level have a real impact on what fits',
          'the z-machine instruction set has about 100 instructions\nmost are straightforward: load, store, call, return, branch\nbut there are also specialized ones for string encoding, object manipulation, and i/o\nthe specialized ones are there because they appear so often in the compiled output that making them one byte saves significant space',
          'the interpreter is actually the easy part compared to the compiler\nan interpreter for a stack machine is a loop with a switch on the opcode\nthe hard part is the object system and the string encoding\nstrings in the z-machine are huffman-compressed using a fixed 40-character alphabet',
        ],
      },
      {
        re: /\b(parser|language|natural\s+language|input)\b/i,
        responses: [
          'the parser in zork is written in mdl and compiles down to z-machine bytecode like everything else\nit is actually one of the larger components\nit does real noun phrase parsing -- articles, adjectives, multiple objects in one command',
          'the interesting design decision is how much of the grammar to hard-code\nwe have a verb table and a noun table, and the parser tries to match input against known patterns\nbut it is not a general natural language parser -- it only handles constructions that make sense as game commands',
          'parser quality matters a lot to the player experience\nif the parser rejects a reasonable command with "i do not understand" the player feels frustrated rather than challenged\nwe spent a lot of time on synonym lists and alternate phrasings\nit is unglamorous work but it makes a big difference',
        ],
      },
      {
        re: /\b(hack|rogue|game|compare)\b/i,
        responses: [
          'hack and rogue solve a different problem\nthey generate content procedurally so each game is different\nzork is hand-crafted -- every room, every object, every puzzle is authored\nboth approaches have merits but they produce very different player experiences',
          'the random dungeon approach means you can play hack many times and always have a new layout\nbut it also means the world cannot be as carefully designed as a fixed one\nzork trades replayability for craft\ni think both tradeoffs are defensible',
          'from a systems perspective, hack is interesting because fenlason fits a whole game in a fairly small amount of code\nzork is much larger in both source and runtime\nbut zork also has much more authored content -- thousands of room descriptions and puzzle logic',
        ],
      },
      {
        re: /\b(memory|size|fit|small|64k)\b/i,
        responses: [
          '64k is the z-machine address space\nit is enough for zork part 1 but not all of original zork\nwhich is why we are splitting it into parts for the commercial release\nzork 1 is the entrance and upper dungeon\nzork 2 gets to the midgame\nzork 3 is the endgame',
          'memory constraints drive every design decision in the z-machine\nshort branch encoding: one byte if the offset fits, two bytes otherwise\nabbreviated string table: common substrings get a one-byte code\nobject property encoding: variable length so small properties take less space\neverything is about fitting more game into 64k',
          'the 64k limit comes from the address space in the instruction encoding\nwe use 16-bit addresses, which gives 64k locations\nwe could have done 32-bit but that doubles the size of every pointer in the bytecode\n64k turns out to be enough if you are careful, and we are being careful',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'ok\nwhat does the game output say',
          'right\nwhich part of the dungeon',
          'noted\nwhat command did you type',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'test it\ntype the command and see what happens',
          'what does the room description say\nstart there',
          'interesting\nthat would be consistent with how that section works',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what exactly are you typing\nand what does the game respond',
          'the parser has good coverage but some phrasings do not parse\ntry a shorter form',
          'what is the full sequence\nwhat you typed and what the game said',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat happened after that',
          'right\nand then what',
          'good\nwhat does the game say now',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'ok\nwhat part are you stuck on',
          'fair\nwhat is the situation',
          'all right\nwhat did you try',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'try examining the objects in the room\nroom descriptions mention the important ones but examining gives more detail',
          'what have you tried so far\nsometimes process of elimination is the right approach',
          'look for something you have not examined yet\nzork puzzles usually have all the information in the game',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yes\nthe z-machine stuff is genuinely new -- nobody has done this before for a game',
          'seriously\nit all fits in 64k\nor close enough that we are splitting it into three games',
          'yes really\nvirtual machine design is not that complicated once you have the basic model',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'which puzzle specifically\nsome of them are designed to be hard but none should be unfair',
          'the difficult ones usually require combining information from different parts of the dungeon\ndo you have everything you found earlier',
          'if a puzzle feels impossible it usually means there is a piece of information you are missing\nnot a piece you need external knowledge for -- something in the game',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'thanks\nthe z-machine design has been a good project\nportability was a real problem and this solves it cleanly',
          'yeah\nzork has come a long way since the original mdl version\nit runs on microcomputers now, which was unimaginable in 1977',
          'right\nthe bytecode approach is elegant once you have the instruction set right',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'because portability was the problem we needed to solve\nzork locked to one machine type is a dead end commercially\nthe z-machine lets us target whatever machine people are buying',
          'the 64k limit is a consequence of using 16-bit addresses in the bytecode\nit was a deliberate tradeoff -- smaller pointers mean smaller bytecode',
          'what specifically are you asking about',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'the z-machine works like this: we have a bytecode file, the story file, which contains the game data and bytecode instructions\nthe interpreter is a program on your machine that reads the story file and executes it\nyou write the interpreter once per platform and then any z-machine story file runs on that platform',
          'the instruction set has about 100 opcodes\nmost are standard: push, pop, call, return, branch, load, store\nthe interesting ones are object operations: insert_obj, remove_obj, get_child, get_sibling\nthose make the object containment hierarchy cheap to manipulate',
          'the string encoding is the most exotic part\nwe use a modified huffman coding with a 40-character alphabet -- a-z plus some punctuation\ncommon substrings go in an abbreviation table and get a two-byte encoding\nit gets the text to about half the size of raw ascii which matters a lot when you are fitting a game in 64k',
        ],
      },
    ],
    fallbacks: [
      '(what part of the game are you working through|where are you in the game)',
      'what does the (room description|description) say',
      '(try a shorter command form|simplify the command)',
      'what exactly did you (type|enter)',
      '{word}\nwhat does the parser (do with that|make of that)',
      'does the game (recognize|understand) {word} as an object',
      'the z-machine stuff is (getting there|progressing)',
      '(save often|save frequently) -- the puzzles get harder',
    ],
    spontaneous: [
      'branch encoding is (finally working right|done)\nshort branches fit in one byte now',
      'the object table format is (locked in|finalized)\ncompiler output is getting (smaller|more compact)',
    ],
  },

  // -----------------------------------------------------------------------
  // brouwer -- Andries Brouwer, Dutch mathematician, NetHack developer
  // -----------------------------------------------------------------------
  brouwer: {
    names: ['andries', 'brouwer', 'andries brouwer'],
    wpm: 55,
    typoRate: 0.02,
    thinkMs: [1500, 4000],
    triggerWords: 4,
    greeting: '(hello|good day) rodney',
    patterns: [
      {
        re: /\bwho\s+(are\s+)?(you|u)\b|\bwho\s+is\s+this\b|\byour\s+name\b|\btell\s+me\s+about\s+(yourself|you)\b|\b(forgot|forget|remind)\s+(me\s+)?(who|your\s+name)\b|\babout\s+yourself\b/i,
        responses: [
          'it is Andries Brouwer, rodney.\nI forked Hack and added (many features|quite a few improvements).\nwe have corresponded about (dungeon topology|level connectivity) before.\n(surely you recall|you do remember)',
          'Brouwer. Andries Brouwer.\nrodney I am the mathematician from Amsterdam who has been (analyzing|improving) the dungeon generator.\nwe have discussed graph connectivity (at length|several times).\n(this is not our first conversation|come now)',
          'rodney, it is Andries.\nI maintain the (Hack fork|NetHack codebase).\nyou sent me a question about level 26 topology (not long ago|recently).\nI would (hope|expect) you remember.',
        ],
      },
      {
        re: /\bhow\s+(are\s+)?(you|u|ya)\b|\bhow\'?s\s+it\s+(go|goin|going)\b|\bhow\s+goes\b|\bhow\s+r\s+u\b|\bwhat\'?s\s+up\b|\bwassup\b|\bsup\b/i,
        responses: [
          '(well|quite well), thank you\nI have been working on the connectivity proof for the dungeon generator\n(the current code can produce disconnected rooms in certain configurations\n|)I have a patch that fixes this but I want to verify it is correct before submitting',
          '(fine|well)\nstuck on a graph theory problem in the level generator\nit is straightforward but I want to be (careful|precise) about the corner cases',
          '(good|well)\nwriting up some notes on the topology of the hack dungeon\nfenlason\'s generator is clever but there are some configurations it does not (handle correctly|get right)',
        ],
      },
      {
        re: /\bwhat\s+(are\s+|r\s+)?(you|u|ya)\s+(doing|doin|up\s+to|working\s+on|workin\s+on|making)\b|\bwhat\'?s\s+(new|going\s+on|happening|been\s+up|the\s+plan|you\s+working)\b/i,
        responses: [
          'I am analyzing the dungeon level generator\nfenlason\'s code places rooms and then connects them\nbut the connectivity guarantee is not as strong as it should be\nI am building a graph where rooms are nodes and corridors are edges, and verifying that the graph is connected',
          'working on a patch for the room connectivity bug\nthe issue is that the room placement algorithm can create a room that is geometrically reachable but not connected by corridors\nmy fix adds a check after generation and adds a corridor if any component is isolated',
          'reading through the hack source\nI am particularly interested in the level generation and the save/restore code\nboth have interesting structural properties that I want to understand before I start patching',
        ],
      },
      {
        re: /\b(i\s+)?(just\s+)?(died|die|keep\s+dying|got\s+killed|was\s+killed|died\s+again)\b/i,
        responses: [
          'on which level and to which monster\nthe statistics of death in hack are interesting\nmost deaths cluster at certain depth ranges where monster difficulty jumps discontinuously',
          'death in hack is permanent by design\nbut it also means the game is short enough to replay\nif you died on level 4, starting over is not a large cost\nwhat killed you',
          'the permadeath mechanic creates an interesting information structure\neach death teaches you something about the game\'s probability distribution\nafter enough deaths you build a good model of the risks at each depth\nwhat did you learn this time',
        ],
      },
      {
        re: /\b(nethack|patch|topology|graph|level\s+generation)\b/i,
        responses: [
          'I have been contributing patches to hack since fenlason released it\nmy main interest is the level generator\nit uses a fairly simple random room placement algorithm but it has some correctness issues\nthe connectivity property -- that every room is reachable from every other room -- is not always satisfied',
          'the level generator works by placing rooms, then connecting adjacent rooms with corridors\nthe connectivity bug arises when a room is surrounded on all sides by other rooms but not directly connected to any of them\nmy patch does a depth-first search after generation and adds corridors to any isolated components',
          'topology in the mathematical sense is about which rooms are reachable from which other rooms\nit is a property of the graph structure, not the geometric layout\ntwo dungeons with very different shapes can have the same topological structure if the connectivity is the same',
        ],
      },
      {
        re: /\b(connected|graph|connectivity|unreachable|isolated)\b/i,
        responses: [
          'connectivity is the fundamental property we need\nif any room is unreachable, the game is broken -- an item placed there is ungetable\nverifying connectivity requires a graph traversal: start at one room, do a depth-first or breadth-first search, check that you visit every room',
          'the graph of the dungeon has rooms as nodes and corridors as edges\na connected graph has a path between every pair of nodes\nif the graph is disconnected, there exists at least one room from which some other room cannot be reached\nthis is provably fixable by adding one corridor per disconnected component',
          'I found three configurations in fenlason\'s room placement code where connectivity can fail\nthe first is a room placed in a corner with no adjacent corridors\nthe second is a room island surrounded by a ring of other rooms\nthe third is a corridor that should connect two sections but terminates early due to a boundary check',
        ],
      },
      {
        re: /\b(dungeon|level|geometry|room|corridor)\b/i,
        responses: [
          'the dungeon geometry in hack is a 22x80 grid\nrooms are rectangular and placed at random positions\ncorridors connect adjacent rooms\nthe geometric constraints are simple but the combinatorics of placement create interesting configurations',
          'a well-formed dungeon level has the following properties:\nevery room is reachable, no two rooms overlap, corridors do not create loops that are too short\nfenlason\'s generator satisfies the first and second most of the time but the third creates some awkward geometries',
          'the corridor algorithm is depth-first\nit picks a room, tries to connect it to the nearest unconnected room, and recurses\nbut "nearest" is defined geometrically, not topologically\nthis is where the connectivity bug enters -- geometric proximity does not guarantee a valid path',
        ],
      },
      {
        re: /\b(hack|rogue|bug|fix|patch)\b/i,
        responses: [
          'I have submitted several patches to fenlason\nthe connectivity fix is the most important\nbut there are also smaller issues: a monster pathfinding problem in narrow corridors, a counting error in the shop pricing, an off-by-one in the stairs placement',
          'the interesting thing about hack bugs is that most of them are in the level generator or the monster AI\nthe item handling code is relatively clean\nfenlason did good work there\nbut generating a valid connected dungeon is a harder algorithmic problem than it looks',
          'rogue has similar level generation issues\nthe graph connectivity property is easy to state and hard to guarantee without an explicit check\nI believe rogue also does not verify connectivity, which means it can also generate unreachable rooms\nbut I have not analyzed the rogue source as carefully',
        ],
      },
      {
        re: /\b(algorithm|recursive|depth.first|backtrack)\b/i,
        responses: [
          'depth-first search is my preferred tool for connectivity verification\nyou maintain a visited set, start at any node, and recursively visit all neighbors\nat the end, any node not in the visited set is unreachable\nthe algorithm is O(V + E) where V is rooms and E is corridors -- very fast for a dungeon',
          'the corridor generation algorithm in hack is essentially a spanning tree construction\nyou want a tree that connects all rooms with minimum total corridor length\nbut the greedy nearest-neighbor approach does not always produce a connected result\na proper spanning tree algorithm like Kruskal\'s would be provably correct',
          'backtracking in the room placement algorithm would be the clean fix\nif you cannot connect a room after placement, backtrack and try a different position\nbut this changes the character of the dungeon significantly\nmy approach is to do a post-generation connectivity check and patch any failures\nit is less elegant but it preserves the existing level geometry',
        ],
      },
      {
        re: /\b(mathematics|math|topology|graph\s+theory|proof)\b/i,
        responses: [
          'graph theory is the right framework for thinking about dungeon connectivity\na dungeon is a graph: rooms are vertices, corridors are edges\nthe property we want -- that every room is reachable -- is exactly the property of graph connectedness\nand graph connectedness has well-known polynomial-time algorithms',
          'I am a mathematician by training\nI work on algebraic topology and combinatorics\nhack is interesting to me partly because the dungeon generator is essentially a computational geometry problem\nand partly because the game itself involves navigating a topological space\nthe two kinds of topology are not the same, but they rhyme',
          'a formal proof that the patched generator always produces connected dungeons would require showing that the post-generation repair step successfully connects every disconnected component\nthis is straightforward: each repair step adds one edge to the graph, and we run repair steps until no disconnected components remain\nthe loop terminates because each step strictly reduces the number of components',
        ],
      },
      {
        re: /\bi\s*'?\s*m\b|\bi\s+am\b/i,
        responses: [
          'I see\nand what does the dungeon look like at that point',
          'understood\nwhich level are you on',
          'I see\nwhat were you doing when that happened',
        ],
      },
      {
        re: /\bi\s+(think|feel|believe|guess|suppose)\b/i,
        responses: [
          'that is a reasonable hypothesis\nhow would you verify it',
          'interesting\nwhat evidence do you have for that',
          'possibly\nbut we should check it rather than assume',
        ],
      },
      {
        re: /\bi\s+(can\'?t|cannot|keep|don\'?t|won\'?t|couldn\'?t|didn\'?t|never|always)\b/i,
        responses: [
          'what specifically is happening\nbe precise about the conditions',
          'what have you tried\nand what was the result each time',
          'let us think about this carefully\nwhat is the exact situation',
        ],
      },
      {
        re: /^\s*(yes|yeah|yep|yup|sure|ok|okay|alright|right|exactly|correct|true|yea)\s*[.!]?\s*$|\b(yes|yeah|yep|yup)\s*[.!]?\s*$/i,
        responses: [
          'good\nand what follows from that',
          'correct\nso the next step is clear',
          'yes\nand the implication is',
        ],
      },
      {
        re: /^\s*(no|nah|nope|not\s+really|never\s+mind|nevermind)\s*[.!]?\s*$|\b(nah|nope)\s*[.!]?\s*$/i,
        responses: [
          'I see\nthen what is the actual situation',
          'understood\nwhat is happening instead',
          'alright\ntell me what you observe',
        ],
      },
      {
        re: /\bi\s+don\'?t\s+know\b|\bdunno\b|\bidk\b|\bnot\s+sure\b|\bno\s+idea\b|\bbeats\s+me\b/i,
        responses: [
          'that is a starting point, not an ending point\nwhat information do we have to work with',
          'when I do not know something I enumerate the possibilities systematically\nwhat are the options',
          'not knowing is fine\nwhat can we verify',
        ],
      },
      {
        re: /\b(really\??|seriously\??|no\s+way|wow|huh\??|wait\s+what|wait\s+really)\b/i,
        responses: [
          'yes\nthe connectivity bug is real and reproducible\nI have a test case that triggers it reliably',
          'seriously\ngraph connectivity is easy to check but fenlason\'s generator does not check it\nthe consequence is occasional unreachable rooms',
          'yes\nit is surprising that such a simple property can be violated by a reasonable-looking algorithm\nbut it happens',
        ],
      },
      {
        re: /\bthat\'?s?\s+(hard|difficult|impossible|tough|annoying|frustrating|unfair|brutal|ridiculous)\b|\bso\s+(hard|difficult|impossible|frustrating)\b|\btoo\s+(hard|difficult)\b/i,
        responses: [
          'hard problems usually become easier when you decompose them\nwhat specifically is difficult',
          'I understand\nwhich aspect is causing trouble',
          'difficulty is often a sign that the framing is wrong\nlet us try a different approach to the problem',
        ],
      },
      {
        re: /\bthat\'?s?\s+(cool|nice|great|interesting|good|neat|awesome|sweet|rad)\b|\bvery\s+(cool|nice|interesting)\b/i,
        responses: [
          'yes, the graph-theoretic approach does have a certain elegance\nthe problem and the solution are both expressible in the same framework',
          'I find it satisfying when mathematical tools apply cleanly to engineering problems\nthis is one of those cases',
          'thank you\nI hope the patch will be useful',
        ],
      },
      {
        re: /^\s*why\b|\bwhy\s+(did|do|does|would|is|are|was|were|can|could|should|not)\b/i,
        responses: [
          'because the connectivity property is not automatically maintained by the room placement algorithm\nit requires an explicit verification step',
          'the root cause is that geometric proximity and graph connectivity are different properties\nan algorithm that ensures geometric coverage does not automatically ensure graph connectivity',
          'what specifically are you asking about',
        ],
      },
      {
        re: /\bwhat\s+do\s+you\s+mean\b|\bhow\s+so\b|\bsay\s+more\b|\btell\s+me\s+more\b|\bgo\s+on\b|\belaborate\b|\bexplain\b/i,
        responses: [
          'the connectivity verification works as follows\nrepresent the dungeon as a graph: each room is a node, each corridor is an edge\ndo a depth-first search starting from room zero\nany room not reached by the search is a disconnected component\nadd a corridor from the disconnected room to the nearest connected room\nrepeat until no disconnected components remain',
          'the core issue is that fenlason\'s generator places rooms and then connects them\nbut it connects them using a geometric heuristic -- connect to the nearest room in each cardinal direction\nthis heuristic can fail when rooms are arranged in certain configurations\nmy patch adds a verification pass after the initial connection step',
          'graph theory gives us precise language for what we want from a dungeon\nwe want a connected graph where every vertex is reachable from every other vertex\nthe complement of connectedness is the existence of a cut vertex or an isolated component\nmy patch detects and repairs isolated components; it does not address cut vertices, which is a separate issue',
        ],
      },
    ],
    fallbacks: [
      'what specifically do you (observe|see)',
      'can you describe the conditions (more precisely|exactly)',
      'let us approach this (systematically|carefully)',
      'what have you (verified|established) so far',
      '{word}\nwhat is the precise (definition|meaning) you are using',
      'tell me more about {word} -- what specifically is (happening|going on)',
      '(that is interesting|interesting)\nwhat is the exact configuration',
      'I would need more (detail|information) to say anything useful',
    ],
    spontaneous: [
      'the connectivity patch is (ready|done)\nI am writing up the analysis before submitting it',
      'I found another case where the room placement can fail\nit is related to the boundary conditions in the (corridor algorithm|corridor routing)',
      'reading through the rogue source (now|currently)\nthe level generator has similar issues to hack',
    ],
  },

};

