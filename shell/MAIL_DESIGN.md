# Shell Mail System — Design Document

## Overview

A simulated BSD-style mail system for the shell easter egg, integrated
with NetHack's in-game mail daemon. Players can read mail from famous
game authors and the Wizard of Yendor, and send mail that triggers
the NetHack mail daemon during gameplay.

## Reading Mail

### `mail` command (no args) — read inbox

Displays inbox in a simple list format:

```
Mail version 5.2 6/5/83.  Type ? for help.
"/var/mail/rodney": 4 messages 2 new
 U  1 izchak        Thu Mar 12  "About your lamp order"
 U  2 wizard        Thu Mar 12  "YOU WILL NEVER ESCAPE"
    3 toy           Wed Mar 11  "Re: rogue tips"
 N  4 fenlason      Thu Mar 12  "Hack 1.0 bugs"
?
```

Single-key commands at the `?` prompt:
- Number (1-9): read that message
- `d` + number: delete message
- `n`: next message
- `q`: quit
- `?`: help

### Pre-loaded messages

Flavor messages from `/etc/passwd` authors, themed to their games:

- **izchak**: About his lighting shop, tips on buying lamps
- **wizard**: Threatening messages ("I'll be back", "You cannot escape")
- **toy**: Stories about building Rogue on the PDP-11
- **fenlason**: Notes about Hack 1.0 development
- **lebling**: Musings about the Great Underground Empire
- **blank**: Puzzle design philosophy
- **crowther**: Caving and the original Adventure

Messages stored as static data in `shell/mail.js`.

## Sending Mail

### `mail <user>` — compose mode

```
Subject: hello
(type message, end with . on a line by itself)
Just wanted to say hi.
.
EOT
```

Line-by-line input (like real BSD mail):
- Each line read via shell's getch loop
- `.` on a line by itself ends the message
- Ctrl-C cancels

### Integration with NetHack mail daemon

When mail is sent from the shell to `rodney`, it is stored in the vfs
under a mail key. When the player returns to NetHack gameplay, the
mail daemon checks for pending mail and delivers it:

```
The strstrmail daemon strstrstrappears!
The mail daemon strstrstrdelivers a strstrstrscroll strstrstrof mail from rodney.
```

(This reuses the existing mail daemon code path in the C-faithful JS port.)

**VFS keys:**
- `mail-inbox`: JSON array of {from, subject, body, date, read} objects
- `mail-outbox`: JSON array of sent messages
- `mail-pending`: Messages waiting for NetHack delivery

## File System Additions

```
/var/
└── mail/
    └── rodney          (vfs-backed, user's mailbox)
/usr/bin/
    └── mail            (executable stub)
```

## Commands to Add

| Command | Behavior |
|---------|----------|
| `mail` | Read inbox |
| `mail <user>` | Compose message to user |
| `from` | Show message summary (like `mail` header only) |

## Implementation Order

1. Static inbox with pre-loaded author messages
2. Reading messages with simple ? prompt navigation
3. Composing messages with line editor
4. VFS persistence of read/unread state
5. NetHack mail daemon integration (send from shell → receive in game)
6. NetHack mail daemon integration (send from game NPCs → receive in shell)

## Era-Appropriate Details

- BSD Mail 5.2 header format
- `From` lines with timestamps
- No MIME, no attachments, no HTML — plain text only
- Messages wrap at 72 columns
- `/var/mail/rodney` is the mailbox file (mbox format)
