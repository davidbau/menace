# The History of Hack

*You see here a USENIX tape. It is dated 1982.*

In the summer of 1982, a high school junior from Sudbury, Massachusetts put his game on a USENIX conference tape and sent it out into the world. He included his home phone number and apologized in advance about his modem and his teenage sister. He called the game "my first semester programming project." He called it "my silly game."

That game was Hack. Its direct descendant, NetHack, is still under active development. The dungeon turned out to go deeper than anyone expected.

---

## Lincoln-Sudbury

The story of the high school computer users society began when [Brian Harvey](https://en.wikipedia.org/wiki/Brian_Harvey_(lecturer)) was hired as Computer Director at [Lincoln-Sudbury Regional High School](https://en.wikipedia.org/wiki/Lincoln-Sudbury_Regional_High_School) in Sudbury, Massachusetts in 1979. The school had a [PDP-8](https://en.wikipedia.org/wiki/PDP-8) run by the math department. Harvey had grander ambitions. He wanted to create an environment "as similar as possible" to the MIT and Stanford AI labs: a powerful computer system, lots of software tools, an informal community spirit.

He obtained a [PDP-11/70](https://en.wikipedia.org/wiki/PDP-11) running [Version 7 Unix](https://en.wikipedia.org/wiki/Version_7_Unix), funded 75% by a grant from [Digital Equipment Corporation](https://en.wikipedia.org/wiki/Digital_Equipment_Corporation) and 25% by a school bond issue. DEC's headquarters was in Maynard, Massachusetts, a few miles down the road, and its co-founder [Ken Olsen](https://en.wikipedia.org/wiki/Ken_Olsen) had come out of MIT Lincoln Laboratory. The geography helped.

The PDP-11/70 was one of the most powerful minicomputers of its era. Lincoln-Sudbury became a Unix source licensee and an alpha test site for [2.9BSD](https://en.wikipedia.org/wiki/History_of_the_Berkeley_Software_Distribution), the PDP-11 version of Berkeley Unix. The installation, testing, and debugging was handled entirely by students.

Harvey deliberately modeled the culture on the MIT AI Lab ethos. About 50 students and teachers ran the facility through the Computer Users Society. Members had keys to the machine room and could use it evenings and weekends without adult supervision. Courses weren't graded. Students connected from home by modem. Membership was open to anyone who used the computer, the yearbook explained, "be it for typing out English papers, playing Star Trek, or remembering friends' birthdays." The yearbook added: "or even 'Dungeons and Dragons'."

![Computer Users Society, Lincoln-Sudbury, 1981. Jay Fenlason is in the middle row (fourth from right); Kenny Woodland is in the top row (far right). The caption mentions Dungeons and Dragons.](images/dyadlincolnsudbu1981linc_0242-computer-users-society.jpg)

Most American high schools had no computers in 1980. Lincoln-Sudbury had a multi-user Unix system running the same operating system used at Bell Labs and UC Berkeley, maintained by students who were alpha-testing the latest BSD release.

![The Lincoln-Sudbury computer community, 1982 — the year Hack was distributed at USENIX. Brian Harvey, Jon Payne, Kenny Woodland, and Jay Fenlason are all pictured.](images/dyadlincolnsudbu1982linc_0205-payne-woodland-fenalson-harvey.jpg)

It was, by the standards of 1980, an extraordinary place. It was about to produce something extraordinary. Lincoln-Sudbury had a multi-user Unix system running the same operating system used at Bell Labs and UC Berkeley, maintained by students who were alpha-testing the latest BSD release.

---

## The Game

[Seymour Papert](https://en.wikipedia.org/wiki/Seymour_Papert) at MIT had built [Logo](https://en.wikipedia.org/wiki/Logo_(programming_language)) and the movement around it. Brian Harvey was a committed participant, connected with Logo communities around the country, including the SFSU Logo Workshop at San Francisco State University, where Lincoln-Sudbury students participated.

It was through this SFSU connection that [Jay Fenlason](https://nethackwiki.com/wiki/Jay_Fenlason) first encountered [Rogue](https://en.wikipedia.org/wiki/Rogue_(video_game)).

Rogue had been created in 1980 by [Michael Toy](https://en.wikipedia.org/wiki/Michael_Toy) and [Glenn Wichman](https://en.wikipedia.org/wiki/Glenn_Wichman) at UC Santa Cruz. It was a dungeon-crawling game where the computer generated a new dungeon each time you played, which meant even its creators could be surprised by it. Fenlason was a junior at Lincoln-Sudbury when he found it. He asked for the source code. The authors said no.

So he wrote his own.

The result was approximately 6,200 lines of C across ten source files: 56 monster types, procedurally generated levels, items, combat, and a persistent dungeon with multiple floors. The game had a sense of character that Rogue lacked. Monsters had names. The chameleon could change its form. Wands shot beams.

Three classmates contributed. **Kenny Woodland** wrote the original `BUZZ()` function, which handles the beam weapons fired by wands. **Mike Thome** wrote the chameleon monster. **[Jon Payne](https://en.wikipedia.org/wiki/JOVE)** wrote the cursor-positioning display code, which Fenlason credited as "the massive CURS()" and appears to have regarded with some reverence.

![Computer Users Society, Lincoln-Sudbury, 1983. Mike Thome (fourth from left) and Jay Fenlason (sixth from left). Harvey had already left for Berkeley by this point.](images/dyadlincolnsudbu1983linc_0205-thome-fenlason.jpg)

By the first half of 1982, Hack was ready to go. Brian Harvey submitted it to USENIX. It went out on the USENIX 82-1 tape at the Summer 1982 conference in Boston. Fenlason later described it as "my silly game."

Within two years it was rewritten and distributed across Usenet. Within five, it had become NetHack.

---

## The Original README

The `READ_ME` distributed with Hack is preserved here because no description of what Hack was, or what the era was, captures it half as well as the author's own words.

```
This is export hack, my first semester programming project.
It's just like rogue (Sort of).

To set it up for your system, you will have to do the following:
	1: create a hack uid, to own the top ten list, etc.
	2: create a hack directory "/usr/lib/game/hack" is the default.
	3: make the subdirectory save.
	4: make the directory 700 mode.	/* sav files go in there...*/
	5: create perm (0 length regular file)
	6: modify hack.main.c to use the new directory.
	7: make other changes (like default terminal now vt100)
	7: If you don't have a hack gid (Create one..) remove all
           refrences to getgid()==42 or compile it -UMAGIC to get
           rid of magic mode.
	8: recompile hack.
	9: put it in games after making it set-uid hack.
	10: fix the bugs I undobtedly left in it.
	11: tell me what you think of it.

	Hack uses the UCB file /etc/termcap to get your terminal
escape codes.  If you only have one kind of terminal you can change
the escape codes in hack.pri.c and cm(), then recompile everything
-DVTONL.

If you find any bugs (That you think I don't know about), or have
any awesome new changes (Like a better save (One that works!)), or
have ANY questions, write me
		Jay Fenlason
		29 East St.
		Sudbury Mass.
			01776

or call me at (617) 443-5036.  Since I have both a modem and a
teen-age sister, Good Luck.


Hack is split (roughly) into several source files that do different
things.  I have tried to fit all the procedures having to do with a
certain segment of the game into a single file, but the job is not
the best in the world.  The rough splits are:

hack.c		General random stuff and things I never got around
		to moving.
hack.main.c	main() and other random procedures, also the lock
		file stuff.
hack.mon.c	Monsters, moving, attacking, etc.
hack.do.c	drink, eat, read, wield, save, etc.
hack.do1.c	zap, wear, remove, etc...
hack.pri.c	stuff having to do with the screen, most of the
		terminal independant stuff is in here.
hack.lev.c	temp files and calling of mklev.

Because of the peculiar restraints on our system, I make mklev
(create a level) a separate procedure execd by hack when needed.
The source for mklev is (Naturaly) mklev.c.  You may want to put
mklev back into hack.  Good luck.

Most of hack was written by me, with help from
		Kenny Woodland (KW)	(general random things
			including the original BUZZ())
		Mike Thome	(MT)	(The original chamelian)
	and	Jon Payne	(JP)	(The original lock file
			kludge and the massive CURS())

This entire program would not have been possible without the SFSU
Logo Workshop.  I am eternally grateful to all of our students
(Especially K.L.), without whom I would never have seen Rogue.  I
am especially grateful to Mike Clancy, without whose generous help
I would never have gotten to play ROGUE.

	To make hack fit on a non split I/D machine.  #define SMALL
	and VTONL, modify the escape sequences in hack.pri.c, and
	re-copmile it.  Note that you lose a lot by doing this,
	including the top ten list, save, two wands, and several
	commands.


			Good Luck...
```

The misspellings are original. The numbered list skips from 7 to 7. The parenthetical "(One that works!)" suggests Fenlason already knew the save function was broken. The author was seventeen.

---

## After Hack

### Hack's Descendants

In December 1984, [Andries Brouwer](https://en.wikipedia.org/wiki/Andries_Brouwer), a Dutch mathematician at [CWI Amsterdam](https://en.wikipedia.org/wiki/Centrum_Wiskunde_%26_Informatica), obtained Fenlason's source code, substantially rewrote it, and posted [Hack 1.0](https://nethackwiki.com/wiki/Hack_1.0) to the Usenet newsgroup `net.sources`. Brouwer added player roles, the Amulet of Yendor, a pet system, and shops.
([Brouwer's Hack page](https://homepages.cwi.nl/~aeb/games/hack/hack.html))

The response was overwhelming. Variants proliferated: Don Kneller's PC Hack for MS-DOS, R. Black's ST Hack for the Atari ST, and others.
([NetHack Wiki](https://nethackwiki.com/wiki/Game_history))

Mike Stephenson merged the variants, collaborating with Izchak Miller and Janet Walz over the Internet, and published [NetHack](https://en.wikipedia.org/wiki/NetHack) version 1.4 on July 28, 1987. They called themselves the [DevTeam](https://nethackwiki.com/wiki/DevTeam). The name "NetHack" reflected their collaboration over the nascent Internet. Nearly four decades later, NetHack remains under active development, with the 3.7 branch still unreleased as of 2026. You can play our JavaScript port of NetHack 3.7 in your browser [here](../).

### Jay Fenlason

After Lincoln-Sudbury, Fenlason attended UC Berkeley.
([Linux.com](https://www.linux.com/news/train-life-nethacks-papa/))
He worked at the [Free Software Foundation](https://en.wikipedia.org/wiki/Free_Software_Foundation) for five years. He is the original author of the [GNU implementation of gprof](https://sourceware.org/binutils/docs/gprof/) (with [Richard Stallman](https://en.wikipedia.org/wiki/Richard_Stallman), 1988), co-authored [gawk](https://www.gnu.org/software/gawk/) (with Paul Rubin, 1986), drafted the first [GNU tar](https://www.gnu.org/software/tar/manual/html_node/Authors.html) manual, and served as maintainer of both GNU tar and GNU sed. He left the FSF over disagreements about the Hurd kernel project versus building on BSD.
([Linux.com](https://www.linux.com/news/train-life-nethacks-papa/))
As of a 2000 interview, he was working as a software engineer in the Boston area.

### Jonathan Payne

Jon Payne, credited for "the massive CURS()", went on during his senior year at Lincoln-Sudbury to write [JOVE](https://en.wikipedia.org/wiki/JOVE) (Jonathan's Own Version of Emacs), also on the PDP-11. JOVE was distributed with several BSD releases and brought Payne recognition from around the world while he was still a teenager.

After Lincoln-Sudbury, Payne worked at Bolt, Beranek and Newman, then the University of Rochester, then [Sun Microsystems](https://en.wikipedia.org/wiki/Sun_Microsystems), where in 1992 he joined the secret ["Green" project](https://en.wikipedia.org/wiki/Java_(programming_language)#History), the team led by [James Gosling](https://en.wikipedia.org/wiki/James_Gosling) that produced the [Java programming language](https://en.wikipedia.org/wiki/Java_(programming_language)). In 1996 he co-founded [Marimba](https://en.wikipedia.org/wiki/Marimba_(software)), one of the first Internet software management companies, which went public in 1999. He later worked at TiVo and Flipboard.

From a high school game's cursor routine to the Java programming language. Not bad.

### Brian Harvey

Harvey left Lincoln-Sudbury in the early 1980s for his PhD at UC Berkeley, where he remained for the rest of his career as a Teaching Professor in EECS. He wrote [*Computer Science Logo Style*](https://people.eecs.berkeley.edu/~bh/logo.html) (MIT Press, three volumes), developed [Berkeley Logo](https://people.eecs.berkeley.edu/~bh/logo.html), co-created the [Snap!](https://en.wikipedia.org/wiki/Snap!_(programming_language)) visual programming language, and co-developed [The Beauty and Joy of Computing](https://bjc.edc.org/). In 2025, ACM recognized him as a [Person of ACM](https://www.acm.org/articles/people-of-acm/2025/brian-harvey). His proudest achievement, he has said, remains the computer center he built at Lincoln-Sudbury: "where courses weren't graded and kids had keys to the room."

### Kenny Woodland and Mike Thome

Less is known about the subsequent careers of Kenny Woodland and Mike Thome. Their contributions to Hack — the beam-zapping code and the chameleon monster — are preserved in the [source code](https://github.com/Sustainable-Games/fenlason-hack) and in Fenlason's acknowledgment. If you know more about their stories, the dungeon would welcome an update.

---

## Sources

### Primary Sources

- Jay Fenlason, `READ_ME`, Hack source distribution (USENIX 82-1 tape, 1982) —
  preserved in [`hack-c/upstream/READ_ME`](hack-c/upstream/READ_ME)
- Brian Harvey,
  ["Case Study: LSRHS"](https://people.eecs.berkeley.edu/~bh/lsrhs.html) —
  Harvey's own account of the Lincoln-Sudbury computer center
- ["On the Train of Life with NetHack's Papa"](https://www.linux.com/news/train-life-nethacks-papa/),
  Linux.com, 2000 — the only known published interview with Jay Fenlason
- Lincoln-Sudbury Alumni Association,
  ["Computer Pioneers of Lincoln-Sudbury"](http://www.lincolnsudburyalumni.org/lsrhs/publications/bitsnpieces/computerpioneers.html)
- [Andries Brouwer, Hack 1.0.3 page](https://homepages.cwi.nl/~aeb/games/hack/hack.html)

### Source Code

- [Sustainable-Games/fenlason-hack](https://github.com/Sustainable-Games/fenlason-hack) —
  GitHub mirror of the original USENIX 82-1 tape source
- [Critlist/protoHack](https://github.com/Critlist/protoHack) —
  restoration of Fenlason's Hack to run on modern Linux
- [Hack v1.03 on Internet Archive](https://archive.org/details/HACK103) —
  Andries Brouwer's expanded version

### Wiki and Encyclopedia

- [NetHack Wiki: Jay Fenlason](https://nethackwiki.com/wiki/Jay_Fenlason)
- [NetHack Wiki: Jay Fenlason's Hack](https://nethackwiki.com/wiki/Jay_Fenlason%27s_Hack)
- [NetHack Wiki: Hack 1.0](https://nethackwiki.com/wiki/Hack_1.0)
- [NetHack Wiki: Game history](https://nethackwiki.com/wiki/Game_history)
- [Wikipedia: Hack (video game)](https://en.wikipedia.org/wiki/Hack_(video_game))
- [Wikipedia: NetHack](https://en.wikipedia.org/wiki/NetHack)
- [Wikipedia: Rogue (video game)](https://en.wikipedia.org/wiki/Rogue_(video_game))
- [Wikipedia: JOVE](https://en.wikipedia.org/wiki/JOVE)
- [Wikipedia: Brian Harvey (lecturer)](https://en.wikipedia.org/wiki/Brian_Harvey_(lecturer))
- [Wikipedia: Java (programming language)](https://en.wikipedia.org/wiki/Java_(programming_language))
- [Wikipedia: Arthur van Hoff](https://en.wikipedia.org/wiki/Arthur_van_Hoff)

### Biographical

- [ACM People of ACM: Brian Harvey](https://www.acm.org/articles/people-of-acm/2025/brian-harvey) (2025)
- [Brian Harvey, UC Berkeley EECS](https://www2.eecs.berkeley.edu/Faculty/Homepages/harvey.html)
- [JOVE on GitHub](https://github.com/jonmacs/jove)
- [GNU gprof manual](https://sourceware.org/binutils/docs/gprof/)
- [GNU tar Authors](https://www.gnu.org/software/tar/manual/html_node/Authors.html)
- [Jay Fenlason on GitHub](https://github.com/dajt)

### Historical Context

- [History of the Berkeley Software Distribution](https://en.wikipedia.org/wiki/History_of_the_Berkeley_Software_Distribution)
- [NetHack license history](https://www.nethack.org/download/LICENSE_HISTORY.html)
- [Hack on RogueBasin](https://www.roguebasin.com/index.php/Hack)
- [The CRPG Addict: Game 186: Hack (1984)](http://crpgaddict.blogspot.com/2015/04/game-186-hack-1984.html)

---

Part of the [Mazes of Menace](../#readme) project.
