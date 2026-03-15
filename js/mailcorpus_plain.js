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

your home directory is at 94% of your 10MB quota.  if you go over
the limit i will have to suspend write access to your account until
you clean up.

largest files in /home/rodney:
  3.2M  core
  1.8M  nethack.save
  1.1M  .hack_sessions/
  890K  old_source_trees/hack-0.2/

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

  used: ${'>'}8MB of 10MB

the core files are the main problem.  please delete:
  /home/rodney/core (3.2MB)
  /home/rodney/core.1 (2.1MB)

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
];

export const SOCIAL_TEMPLATES = [
  '{via} forwarded me your note about {topic} — thought I should weigh in.',
  "I ran into {via} at lunch and he mentioned you'd asked about {topic}.\nThat's actually more my area, so I wanted to jump in.",
  "{via} CC'd me on your message.  On the subject of {topic}, let me just say:",
  "Word travels fast around here.  {via} mentioned you were asking about {topic}.",
  '{via} thought you might want to hear from me directly about {topic}.',
  "I happened to see your mail to {via} about {topic} — hope you don't mind if I jump in.",
];
