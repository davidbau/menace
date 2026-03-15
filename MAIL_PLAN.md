# Plan: Shell Mail System + NetHack Mail Daemon

## Overview

Implement a period-faithful 1980s Unix mail system in the shell, backed by
localStorage, with a corpus of ~100 pre-written emails across all living users,
an Eliza-style auto-reply engine, and a NetHack mail daemon that visits Rodney
in-game after 2–5 hours to deliver a randomly chosen message from the corpus.
When Rodney uses `#shell`, the shell prints "You have mail." if there is unread
mail. Replying to any message triggers a contextual auto-reply 5–30 minutes later.

---

## Part A: Mail Storage

### Format

All mail stored in the VFS (`menace-fs` localStorage key) under the prefix
`mail/`. Each message is a JSON object stored as a string.

```
mail/inbox/0001.json    — received messages (Rodney's inbox)
mail/sent/0001.json     — messages Rodney has sent
mail/state.json         — global metadata
```

### Message schema

```json
{
  "id": "0001",
  "from": "izchak",
  "to": "rodney",
  "subject": "Re: your order",
  "date": 1710000000000,
  "body": "...",
  "read": false,
  "deleted": false
}
```

### `mail/state.json` schema

```json
{
  "nextId": 9,
  "corpusDelivered": { "izchak/3": true, "walz/0": true },
  "pendingReplies": [
    { "sendAt": 1710001800000, "from": "izchak", "subject": "Re: wands",
      "body": "...", "replyToId": "0003" }
  ],
  "daemonVisitAfter": 1710010000000
}
```

- `corpusDelivered`: tracks which corpus entries have been delivered so they
  are not sent twice across the lifetime of the game
- `pendingReplies`: scheduled replies with full message content, delivered
  when `Date.now() >= sendAt`
- `daemonVisitAfter`: earliest time the in-game mail daemon may next appear

---

## Part B: `mail` Command UI (BSD mail, circa 1980)

### Invocation

```
mail              — read mode: open inbox, deliver any pending messages first
mail <user>       — compose mode: write to user
```

### Startup behavior

On `mail` (read mode), before showing headers:
1. Call `deliverPending()` to flush any scheduled replies whose time has passed
2. If any new messages were just delivered, note them

### Read mode header display

```
Mail version 2.9 5/31/85.  Type ? for help.
"/var/mail/rodney": 3 messages 2 unread
>U 1 izchak@pdp11     Mon Mar 10 08:14  19/312  "Re: your order"
 U 2 walz@pdp11       Mon Mar 10 14:32  12/198  "disk quota warning"
   3 crowther@pdp11   Tue Mar 11 09:05   8/141  "the caves"
& _
```

Flags: `>` current message, `U` unread, `D` deleted, ` ` read.
Columns: lines/chars, subject in quotes.
Prompt is `& ` (classic Berkeley mail prompt).

### Interactive commands (read mode)

| Command | Action |
|---------|--------|
| `<Enter>` | Print current message, advance to next |
| `<number>` | Jump to and print that message |
| `p` | Print current message again |
| `n` | Next message (without printing current) |
| `d` | Delete current message |
| `d <number>` | Delete numbered message |
| `u` | Undelete current message |
| `r` | Reply to sender of current message |
| `h` | Show header list |
| `q` | Quit (apply deletions, update read status) |
| `x` | Exit without changes |
| `?` | Show help summary |

### Message display format

```
Message 1:
From izchak@pdp11  Mon Mar 10 08:14:22 2026
From: izchak@pdp11 (Izchak Miller)
To: rodney@pdp11
Subject: Re: your order
Date: Mon, 10 Mar 2026 08:14:22 -0500

Rodney,

I'm afraid the wand of death is on backorder...
```

### Compose mode (opened by `mail <user>` or `r` reply)

```
To: izchak
Subject: wand of death
(enter body, end with . on a line by itself or ^D)

Rodney,

Do you have any wands of death in stock?
.
Cc:
Message sent.
```

Steps:
1. Show `To: <user>` (pre-filled for reply)
2. Prompt `Subject: ` (pre-filled with `Re: ...` for reply)
3. Show compose hint line
4. Read body lines until `.` alone or Ctrl-D
5. Optionally prompt `Cc: ` (user can leave blank)
6. Write to `mail/sent/`, call `scheduleReply(user, subject, body)`
7. Print "Message sent."

---

## Part C: Email Corpus (~100 messages total)

The corpus is a static JS array in `js/mailcorpus.js`. Each entry:

```js
{ from: 'izchak', subject: '...', body: '...' }
```

No timestamps — those are assigned at delivery time (recent past, randomized).

### Distribution (~10–12 per user)

**izchak** (~12) — shopkeeper, mercantile, NetHack in-jokes
- Shop inventory announcements
- Price adjustment notices
- Complaints about adventurers
- Requests for Rodney to stop "testing" his wares
- Philosophical musings about shop ownership in a dungeon

**walz** (~10) — sysadmin, dry humor, patch-focused
- Disk quota warnings
- Scheduled downtime notices
- Bug reports filed against Rodney's code
- Passive-aggressive backup reminders
- System performance observations

**toy** (~10) — Rogue creator, energetic, BSD-flavored
- Rogue version updates
- Design philosophy rants
- Random number generator discussions
- Terminal compatibility notes
- Competitive observations about Hack

**arnold** (~10) — curses author, terse, technical
- curses(3) API clarifications
- Terminal compatibility complaints
- VT100 escape sequence notes
- Minimal replies to Rodney's questions

**fenlason** (~10) — Hack author, pragmatic, slightly harried
- Hack 1.x release notes
- Monster AI design notes
- Item balance discussions
- Dungeon generation musings
- Requests for Rodney to stop haunting level 26

**brouwer** (~12) — NetHack dev, methodical, European
- NetHack patch announcements
- Parity bug discussions
- Level generation questions
- Design document fragments
- Polite but firm disagreements with Rodney

**lebling** (~10) — Zork/Infocom, literary, verbose
- Zork world-building notes
- Parser philosophy
- Friendly competition with rogue-likes
- Complaints about the lack of narrative in dungeon crawlers
- Infocom event invitations

**harvey** (~10) — Brian Harvey, CS educator, Logo/Scheme/Snap!, patient and encouraging
- Programming pedagogy observations
- Logo turtle graphics musings
- Why Scheme is the right way to teach recursion
- Gentle corrections of Rodney's use of goto
- Snap!/visual programming enthusiasm
- Topics: logo, scheme, lisp, recursion, programming, teach, student, snap, turtle, functional

**blank** (~8) — Infocom business, businesslike but geeky
- Infocom licensing inquiries
- Sales figures
- Product strategy memos
- Brief, businesslike notes

**crowther** (~8) — Colossal Cave, modest, outdoorsy
- Caving trip updates
- Notes about Adventure/Colossal Cave
- Humble reflections on having invented the genre
- Cave system descriptions that sound like room descriptions

### Fictional character correspondents (~8 each)

These users are not in `/etc/passwd` but can email Rodney and receive replies.
They appear only in the mail corpus and auto-reply rules.

**oracle** (`oracle@delphi`) — the NetHack Oracle, cryptic and verbose
- Unsolicited prophecies about Rodney's dungeon runs
- Answers to questions (always technically correct, never useful)
- Invoices for consultation services
- Topics: future, prophecy, fate, amulet, yendor, question, advice, help

**thief** (`thief@zork`) — the Zork thief, roguish, boastful
- Brags about recent scores (the platinum bar, the jeweled egg)
- Offers to fence items
- Asks Rodney if the dungeon has anything worth stealing
- Occasionally apologizes for having taken something
- Topics: steal, take, item, treasure, score, jewel, gold, lamp

**shopkeeper** (`shop@nethack`) — generic NetHack shopkeeper, offended and litigious
- Bills Rodney for items damaged or stolen by adventurers
- Demands compensation for shop damage
- Threatens legal action
- Topics: damage, stolen, bill, pay, owe, shop, merchandise, adventurer

**xorn** (`xorn@nethack`) — the Xorn, philosophical, passes through walls
- Musings on the nature of stone
- Questions about why everyone keeps trying to kill him
- Observations about dungeon architecture from inside the walls
- Topics: stone, wall, mineral, pass, phase, dungeon, architecture

**oracle** and **thief** are the richest correspondents; the others are
primarily for received corpus messages (not expected to reply as often).

### 8 pre-seeded inbox messages

Written out fully (not drawn from corpus), with dates 2–14 days in the past.
These give the inbox a lived-in feel on first launch.

1. **izchak** — "Re: last month's order" (wand of death backorder)
2. **walz** — "disk quota warning" (Rodney is at 94%)
3. **fenlason** — "Hack 1.0.3 released" (patch announcement)
4. **brouwer** — "level 26 layout question" (parity query)
5. **crowther** — "Mammoth Cave trip" (caving plans)
6. **arnold** — "curses bold attribute" (VT100 question)
7. **lebling** — "narrative vs. mechanics" (Zork vs. NetHack essay)
8. **toy** — "RE: RNG seeding" (RNG philosophy discussion)

---

## Part D: Auto-Reply Engine (Eliza-style)

### Mechanism

When Rodney sends a message to user X, `scheduleReply(user, subject, body)`:

1. Tokenize subject + body into lowercase words
2. Walk the user's `replyRules` array in order; first rule whose keywords
   all appear in the token set wins → use that rule's `responses[]` array
3. If no rule matches, fall through to the user's `genericResponses[]`
4. Pick a random response from the winning list
5. Schedule delivery: `sendAt = Date.now() + random(5min, 30min)`
6. Store in `pendingReplies` with full message content

### Rule structure (per user in `mailcorpus.js`)

```js
{
  from: 'izchak',
  replyRules: [
    {
      keywords: ['wand', 'staff'],
      responses: [
        { subject: 'Re: wands', body: 'Ah, wands!  I have a fine selection...' },
        { subject: 'Re: your inquiry', body: 'Wands are 500 zorkmids each, uncursed...' },
      ]
    },
    {
      keywords: ['potion'],
      responses: [
        { subject: 'Re: potions', body: 'Potions!  Yes, I have a few...' },
      ]
    },
    // ...
  ],
  genericResponses: [
    { subject: 'Re: your message', body: 'Thank you for writing.  The shop is very busy...' },
    { subject: 'Re: hello', body: 'Good day to you.  Is there something I can help you with?' },
  ]
}
```

### Keyword topics per user

| User | Topic keywords |
|------|---------------|
| izchak | wand, staff, potion, scroll, ring, amulet, armor, shop, buy, sell, price, stock, cursed, blessed, identification |
| walz | bug, crash, error, quota, disk, space, backup, patch, release, test, system |
| toy | rogue, random, level, seed, terminal, vt100, bsd, dungeon, design |
| arnold | curses, terminal, vt100, attribute, bold, color, escape, ncurses, display |
| fenlason | hack, monster, item, balance, dungeon, level, ai, design, feature |
| brouwer | nethack, patch, parity, bug, level, design, feature, release, branch |
| lebling | zork, infocom, parser, narrative, story, text, adventure, maze |
| blank | infocom, license, sales, business, product, contract, rights |
| crowther | cave, adventure, colossal, spelunk, mammoth, passage, room |
| harvey | logo, scheme, lisp, recursion, programming, teach, snap, turtle, functional, goto |

Each user also responds generically to: hello, hi, thanks, question, help, rodney

### Social forwarding / off-topic routing

When Rodney's message to user X has **no keyword match** (complete miss), there
is a chance (~40%) that instead of (or in addition to) X's generic reply, a
*different* user Y who **is** the expert on a topic found in the message reaches
out — as if X mentioned it at lunch or forwarded the email.

#### Topic → expert routing table

| Topic keywords found in message | Expert who may chime in |
|---------------------------------|------------------------|
| wand, shop, buy, sell, potion, scroll, ring, armor | izchak |
| bug, crash, quota, disk, backup, system | walz |
| rogue, bsd, random seed, terminal | toy |
| curses, vt100, display, attribute | arnold |
| hack, monster, item, balance | fenlason |
| nethack, patch, parity, branch | brouwer |
| zork, parser, infocom, narrative | lebling |
| infocom, license, sales, rights | blank |
| cave, adventure, colossal, spelunk | crowther |
| logo, scheme, lisp, recursion, goto | harvey |
| prophecy, fate, future, oracle | oracle |
| steal, treasure, jewel, fence | thief |

#### Social reply templates

Each social reply picks one of these framing templates, filled in with
`[via]` (the user Rodney originally emailed) and `[topic]` (paraphrase of
the matched keyword cluster):

```
"[via] forwarded me your note about [topic] — thought I should weigh in."

"I ran into [via] at lunch and he mentioned you'd asked about [topic].
 That's actually more my area, so..."

"[via] CC'd me on your message.  On the subject of [topic], I can tell you..."

"Word travels fast around here.  [via] said you were asking about [topic].
 Let me just say..."

"[via] thought you might want to hear from me directly about [topic]."

"I happened to see your mail to [via] about [topic] — hope you don't mind
 if I jump in."
```

The body of the social reply is drawn from the expert's own `replyRules`
matching the topic keywords, or their `genericResponses` if nothing matches.
The subject line is prefixed: `"Re: [via] fwd: [original subject]"` or
`"Re: [original subject] (via [via])"`.

Social replies are scheduled with a slightly longer delay: 10–45 minutes,
to feel like the message had time to circulate before the expert saw it.

---

## Part E: NetHack Mail Daemon

### Daemon delivery flow

1. On first NetHack launch, set `daemonVisitAfter = Date.now() + rand(2h, 5h)`
2. Each game turn, check: `Date.now() >= daemonVisitAfter`
3. If triggered:
   a. Pick a random undelivered corpus entry (any user, any message)
   b. Deliver it to `mail/inbox/` with timestamp = now
   c. Mark it in `corpusDelivered`
   d. Spawn the mail daemon monster
   e. Reset `daemonVisitAfter = Date.now() + rand(2h, 5h)`

### Daemon behavior (faithful to NetHack)

1. Spawns at a random passable location, not adjacent to player, not in a room
   with the player if possible (approach feels deliberate)
2. Moves toward player each turn at normal speed, ignores walls (phases?)
   — actually in NetHack the mail daemon just walks normally
3. On reaching adjacent square, prints:
   `"Hello rodney, you have mail."`
   then on next turn (or same turn):
   `"  From <from>@pdp11: <subject>"`
4. Daemon disappears immediately after delivering (removed from mon list)
5. If player attacks: daemon dodges, says "I'm just the messenger!" and vanishes
6. Daemon is displayed as `d` (daemon) in bright white

### `#shell` notification

In `cmd.js`, when `#shell` is handled, before launching the shell:
- Call `deliverPending()` (flush any overdue replies)
- If `getUnreadCount() > 0`, print `"You have mail."` in the message area
  before the shell takes over the screen

---

## Part F: Filesystem Integration

### `/var/mail/`

Add to `buildTree()`:

```
/var
  /mail
    /rodney   — virtual file; cat blocked, size = unread count * ~400
  /spool
    /mail     — symlink → /var/mail
```

`cat /var/mail/rodney` → "This mailbox is in binary format. Use mail(1)."

### `/usr/bin/mail`

Add to `/usr/bin/` as an exec-type node with no game (it's a builtin command,
so the shell dispatcher finds it before trying to exec it).

### `finger` unread count

`finger rodney` currently shows hardcoded mail string. Update to call
`getUnreadCount()` and show:
- `"No mail."` if 0
- `"1 unread message."` if 1
- `"3 messages, 2 unread."` etc.

---

## Part G: Shell `#shell` Entry Notice

In `cmd.js` where `#shell` is handled:

```js
case 'shell':
    deliverPending();  // flush overdue replies
    const unread = getUnreadCount();
    if (unread > 0) {
        await display.putstr_message(`You have mail.`);
        // wait for keypress or just show briefly
    }
    await runShell(display, nhgetch, game.lifecycle);
```

---

## Implementation Order

1. **`js/mail.js`** — storage API: `loadState`, `saveState`, `deliverPending`,
   `getUnreadCount`, `getMessages`, `markRead`, `markDeleted`, `sendMessage`,
   `scheduleReply`, `seedInbox`, `pickAndDeliverCorpusMessage`
2. **`js/mailcorpus.js`** — 8 seed messages, ~100 corpus entries, reply rules
   per user, generic fallback responses per user
3. **`shell/commands.js`** — `mail` builtin: read mode + compose mode
4. **`shell/filesystem.js`** — `/var/mail/rodney`, `/var/spool/mail` symlink,
   `/usr/bin/mail`; `finger` reads live unread count for rodney
5. **`js/cmd.js`** — `#shell` shows "You have mail." if unread
6. **`js/main.js` or turn loop** — daemon trigger check each turn;
   `pickAndDeliverCorpusMessage()` when triggered
7. **`js/mon.js`** — mail daemon monster type, behavior, delivery message

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `js/mail.js` | Create: mail storage + delivery API |
| `js/mailcorpus.js` | Create: corpus (~100 msgs), seed inbox (8), reply rules |
| `shell/commands.js` | Modify: add `mail` builtin command |
| `shell/filesystem.js` | Modify: `/var/mail/`, `/var/spool/mail`, `/usr/bin/mail` |
| `js/cmd.js` | Modify: `#shell` shows unread notice |
| `js/main.js` | Modify: mail daemon trigger per turn |
| `js/mon.js` | Modify: mail daemon monster type + behavior |
| `shell/filesystem.js` | Modify: add `harvey` to `/etc/passwd`, home dir, `FINGER_DB`, `USER_SESSIONS` |
