# The History of Rogue

*You see here a +1 history scroll.*

Rogue is the game that named a genre. Created in 1980 by two UC Santa Cruz undergraduates, it introduced the idea that the computer itself should build the dungeon, giving players a new adventure every time and making it possible for even the creators to be surprised by their own game. Four decades later, the word "roguelike" appears on hundreds of Steam titles, and the @ sign is still descending.

This document tells the story of how Rogue came to be, who made it, and where they went afterward. It draws primarily on Glenn Wichman's own [account](https://web.archive.org/web/20070622153327/http://www.wichman.org/roguehistory.html), supplemented by interviews and historical sources cited throughout.

---

## The Scene: 1978

For those who weren't involved with computers in 1980, a little background is necessary. The main home computers were the [Atari 400/800](https://en.wikipedia.org/wiki/Atari_8-bit_family), the [Commodore 64](https://en.wikipedia.org/wiki/Commodore_64), and the [Apple II](https://en.wikipedia.org/wiki/Apple_II). No Macintosh, and hardly any IBM PCs. At university computer labs, students used "dumb terminals" connected to minicomputers or mainframes. These terminals had no graphics capabilities; programs just output text, which scrolled off the screen and disappeared.

> Even though the terminals had a screen like a TV screen, they were based on the earlier technology of paper printers, so you did not treat the screen as an integrated output device, you treated it as if it were a printer, you would just send text to the output and it would appear at the bottom of the screen and everything else would scroll up; once it scrolled off the top of the screen it was gone forever.
>
> — Glenn Wichman, [Spillhistorie.no interview (2024)](https://spillhistorie.no/2024/07/14/the-story-of-rogue/)

A popular game on college computers was [Adventure](https://en.wikipedia.org/wiki/Colossal_Cave_Adventure) (also known as Colossal Cave): a text-only role-playing game where the computer printed descriptions of your surroundings and you responded by typing commands like "go west" or "pick up bird."

---

## Two Freshmen in Santa Cruz

Glenn Wichman and Michael Toy met as freshmen at the [University of California, Santa Cruz](https://en.wikipedia.org/wiki/University_of_California,_Santa_Cruz) in 1978. Wichman wanted to be a game designer. When he got to college, he discovered Adventure and decided he wanted to make games like that, so he taught himself BASIC and began working on a text-based adventure game.

> One day while struggling with getting it to work, a tall stranger came up and asked me what I was working on, and that turned out to be Michael Toy. He knew much more about computers and programming than I did, and had also made several games, so he helped me debug my game.
>
> — Glenn Wichman, [Spillhistorie.no interview (2024)](https://spillhistorie.no/2024/07/14/the-story-of-rogue/)

From then on they played each other's games. Of course it was never any fun to play your own text adventure game, because you already knew the answers to all the puzzles.

The university had a [DEC VAX 11/780](https://en.wikipedia.org/wiki/VAX-11) minicomputer that all users shared. Wichman [never even saw the machine](https://spillhistorie.no/2024/07/14/the-story-of-rogue/) — it was underground, a kilometer away. Everyone worked on terminals: a screen and keyboard sharing time on a single minicomputer. Toy and Wichman set up an [ADM-3a terminal](https://en.wikipedia.org/wiki/ADM-3A) in their apartment and used a 300-baud modem to dial into the VAX. The vast majority of Rogue was written from the comfort of that apartment.

![Michael Toy in the apartment he shared with Glenn Wichman during their time at UCSC, posing with the ADM-3a terminal and 300-baud modem they used to dial in to the VAX 11/780.](images/mtoy1-adm3a-apartment.jpg)

![Toy and Wichman entertain friends in the apartment kitchen. From left to right: Wichman (bottom), Toy, Ken Hickman, and Kipp Hickman.](images/mtoy2-wichman-toy-hickmans.jpg)

---

## Curses: The Key Innovation

While Wichman and Toy were creating text adventures at UC Santa Cruz, 120 kilometers away at [UC Berkeley](https://en.wikipedia.org/wiki/University_of_California,_Berkeley), [Bill Joy](https://en.wikipedia.org/wiki/Bill_Joy) had created an editor called [vi](https://en.wikipedia.org/wiki/Vi_(text_editor)) that worked as a visual editor on any terminal, because it included a database of how each terminal handled cursor addressing.

A student at Berkeley named [Ken Arnold](https://en.wikipedia.org/wiki/Ken_Arnold) took the cursor-handling code from vi, refined and improved it, and created a library that could be used by any C program to treat terminals as an addressable graphical space. The library was called [curses](https://en.wikipedia.org/wiki/Curses_(programming_library)).

> Michael got ahold of this library and we both started using it to make simple graphical games, and then Michael asked me if I thought it would be possible to use this to make a graphical Adventure game. I didn't think it would be possible but as we began to talk about it more we realized that not only could we make an adventure game with this, but we could make one where the computer itself created the environment you were exploring, we could create a game that could surprise even its creators, and that was the beginning of Rogue.
>
> — Glenn Wichman, [Spillhistorie.no interview (2024)](https://spillhistorie.no/2024/07/14/the-story-of-rogue/)

---

## Making Rogue

The first version was written in the fall of 1980. Wichman was still a novice C programmer, so Toy did most of the actual coding. Wichman [pretty much learned C by looking over his shoulder](https://web.archive.org/web/20070622153327/http://www.wichman.org/roguehistory.html) as Toy wrote. The ideas came from both of them. The name "Rogue" was [Wichman's idea](https://web.archive.org/web/20070622153327/http://www.wichman.org/roguehistory.html).

Their main inspiration was [Dungeons & Dragons](https://en.wikipedia.org/wiki/Dungeons_%26_Dragons). Very early versions had monster stats copied directly from D&D, though they came up with more original material as the game was refined. The player character was named Rodney, envisioned as [kind of a goofy loser, not a brave warrior](https://en.wikipedia.org/wiki/Rogue_(video_game)). The Amulet of Yendor — the goal of the game — is simply "Rodney" spelled backward.

The game had 26 monster types (one for each capital letter of the alphabet), 26 dungeon levels, and permadeath: when you died, you were dead. The dungeon was procedurally generated, different every time.

> We knew that our game was more fun, imaginative, and engaging than anything else running on the college computers. We saw our friends scream and pound the keyboard when killed by a troll, or stand up and dance when they found the amulet. And we had those same reactions ourselves, playing our own game.
>
> — Glenn Wichman, [Spillhistorie.no interview (2024)](https://spillhistorie.no/2024/07/14/the-story-of-rogue/)

Still, they had no idea how big it would become:

> I think we knew we had something special from the start. But also we didn't have an idea of what "big" was at that time. We were creating a game to play with our friends and didn't really think beyond the 20 or so people we knew who would play it with us.
>
> — Glenn Wichman, [Spillhistorie.no interview (2024)](https://spillhistorie.no/2024/07/14/the-story-of-rogue/)

---

## The Move to Berkeley

They had a playable game, without all the features yet (no armor, for instance), when Toy transferred to UC Berkeley. Around 1982, Toy's attention to Rogue and computer games [caused him to suffer poor academic performance](https://en.wikipedia.org/wiki/Rogue_(video_game)), and he was kicked out of school, shortly finding employment at Berkeley's computer lab. He took the Rogue code with him.

For a while, Wichman and Toy each maintained their own versions. This proved too difficult logistically, so Wichman let Toy take over development. At Berkeley, Toy met Ken Arnold, the creator of curses, who had become a fan of the game. Arnold's system was so closely associated with Rogue that [many thought curses had been created for the game](https://spillhistorie.no/2024/07/14/the-story-of-rogue/) in the first place.

> Michael and I worked on it for months and then Michael moved to U.C. Berkeley and then I was out of the picture for a while, but Ken Arnold joined in and the game was completed by the two of them.
>
> — Glenn Wichman, [Spillhistorie.no interview (2024)](https://spillhistorie.no/2024/07/14/the-story-of-rogue/)

---

## BSD Unix: How Rogue Conquered the World

Rogue's move to Berkeley was fortuitous. UC Berkeley was home to [BSD Unix](https://en.wikipedia.org/wiki/Berkeley_Software_Distribution), the most widely used version of Unix in academia. Rogue was included in the [4.2 BSD](https://en.wikipedia.org/wiki/History_of_the_Berkeley_Software_Distribution) distribution. Suddenly the game was on university computers all over the world.

> Rogue became widely known when it was included as part of the Berkeley UNIX standard distribution... most of the games included with the distribution were mild diversions, and none of them were graphical in nature. Rogue was among the very first games to treat a text-based terminal as a graphic canvas by using ASCII "art," which made the game much more visually interesting.
>
> — Glenn Wichman, [Spillhistorie.no interview (2024)](https://spillhistorie.no/2024/07/14/the-story-of-rogue/)

Rogue also had something more than novelty going for it:

> Rogue was also a very well balanced game. It was notoriously hard to beat, but you did not have to beat it to enjoy it. It was easy to learn and understand. The world was rich enough to surprise you, but it was not overwhelming... a single explorer, no classes or races or other complexities to set up your character, you could just start playing. 26 monster types total, large enough to keep the game fresh and interesting but small enough that you could keep it all in your head without having to refer to a monster manual.
>
> — Glenn Wichman, [Spillhistorie.no interview (2024)](https://spillhistorie.no/2024/07/14/the-story-of-rogue/)

Over the next three years, Rogue became the [undisputed most popular game on college campuses](https://web.archive.org/web/20070622153327/http://www.wichman.org/roguehistory.html).

---

## Rogue 3.6: The Ancestor

[Version 3.6](https://rlgallery.org/about/rogue3.html), released in April 1981, ran under early BSD Unix on the [DEC PDP-11](https://en.wikipedia.org/wiki/PDP-11) minicomputer. Early in 1981, copies began to be included in the [2BSD](https://en.wikipedia.org/wiki/History_of_the_Berkeley_Software_Distribution#2BSD_(PDP-11)) software collection.

The original authors controlled access to Rogue's source code, mostly to make cheating harder. But sometime around June 1981, an unidentified outsider got hold of a copy. Rogue 3.6 became the ancestor of [Super-Rogue](https://en.wikipedia.org/wiki/Super-Rogue), [Advanced Rogue](https://en.wikipedia.org/wiki/Advanced_Rogue), and all the other early roguelikes, including Jay Fenlason's [Hack](../hack/HISTORY.md) (1982), which would eventually become [NetHack](https://en.wikipedia.org/wiki/NetHack).

---

## The Commercial Era

After leaving school, Toy got a job at [Olivetti](https://en.wikipedia.org/wiki/Olivetti) in Italy, where he met **Jon Lane**, a system administrator who was both a fan of Rogue and convinced it could succeed in the home market. They founded **A.I. Design** and ported Rogue to the [IBM PC](https://en.wikipedia.org/wiki/IBM_Personal_Computer).

Lane took advantage of the PC's [Code page 437](https://en.wikipedia.org/wiki/Code_page_437) character set to expand the visual symbols, using a happy face for the player character. They initially funded publishing themselves, but could only break even without a larger distributor.

The established game company [Epyx](https://en.wikipedia.org/wiki/Epyx) took over marketing. A.I. Design produced versions for multiple platforms: Toy wrote the [Amiga](https://en.wikipedia.org/wiki/Amiga) version, Wichman wrote the [Atari ST](https://en.wikipedia.org/wiki/Atari_ST) version (with graphics by Epyx's Michael Kosaka), and Wichman did the graphic design for the [Macintosh](https://en.wikipedia.org/wiki/Macintosh) version in exchange for a used Mac.

Despite Rogue's wild popularity on college mainframes, commercial success eluded them. Epyx went bankrupt. The Atari ST and Amiga faded. Wichman was [paid $15,000 for the Atari ST work](https://spillhistorie.no/2024/07/14/the-story-of-rogue/), the only money he ever made from Rogue.

> Even though Rogue was way ahead of its time in 1980, by the time we did the commercial version in 1984, the expectations of what a computer game should do had changed drastically, and we really never sat down and said, "What does Rogue need to be in order to compete in today's marketplace?"
>
> — Glenn Wichman, [Spillhistorie.no interview (2024)](https://spillhistorie.no/2024/07/14/the-story-of-rogue/)

---

## The Name That Named a Genre

The term "roguelike" became [official around 1993](https://en.wikipedia.org/wiki/Roguelike) via Usenet newsgroups. A category name was needed for the `rec.games.roguelike.*` hierarchy. After significant discussion, the term was chosen.

> I just feel incredibly lucky that it happened to catch on. Most genres don't get named after the first major example of the genre, and if the name had not been "Roguelike," I don't know if Rogue would be remembered nearly as well as it has been.
>
> — Glenn Wichman, [Spillhistorie.no interview (2024)](https://spillhistorie.no/2024/07/14/the-story-of-rogue/)

---

## Rogue's Wisdom

Wichman has never managed to complete the game himself, despite having unique insight into its mechanics. He has observed a pattern among those who do:

> The people who do beat Rogue never ever hit a key twice in a row without waiting to see the consequences of the previous move, reevaluate, and calculate. You need a good strategy of course but you need to treat it as a turn-based puzzle game to survive. I always got lost in the feeling of being in that world and I never had the patience to stop and think after every move.
>
> — Glenn Wichman, [Spillhistorie.no interview (2024)](https://spillhistorie.no/2024/07/14/the-story-of-rogue/)

And a final word of wisdom:

> Hitting the keys harder will not do more damage.

---

## After Rogue

### Glenn Wichman

After A.I. Design, Wichman got a job at [Software Toolworks](https://en.wikipedia.org/wiki/The_Learning_Company#Mindscape) in LA, working on several games. The best known is [Mavis Beacon Teaches Typing](https://en.wikipedia.org/wiki/Mavis_Beacon_Teaches_Typing). He later worked at [Intuit](https://en.wikipedia.org/wiki/Intuit) for five years managing the Macintosh team for [Quicken](https://en.wikipedia.org/wiki/Quicken), and created Mac shareware games [Toxic Ravine and Mombasa](https://web.archive.org/web/20070622153327/http://www.wichman.org/roguehistory.html). In 2010 he joined [Zynga](https://en.wikipedia.org/wiki/Zynga) as a principal developer of the Zynga.com games portal. He reconnected with the roguelike community around 2011 and has been a beloved presence at events like the [Roguelike Celebration](https://roguelike.club/) ever since.

### Michael Toy

After Rogue and A.I. Design, Toy worked at [SGI](https://en.wikipedia.org/wiki/Silicon_Graphics) and followed its founder [Jim Clark](https://en.wikipedia.org/wiki/James_H._Clark) when Clark left to found [Netscape](https://en.wikipedia.org/wiki/Netscape). Toy served as launch lead for the Netscape browser and appears in [*Code Rush*](https://en.wikipedia.org/wiki/Code_Rush), the documentary about the release of the Mozilla source code. After retiring from Netscape, he joined [Mitch Kapor](https://en.wikipedia.org/wiki/Mitch_Kapor)'s [OSAF](https://en.wikipedia.org/wiki/Open_Source_Applications_Foundation) in 2003 as the first software development manager for the [Chandler](https://en.wikipedia.org/wiki/Chandler_(software)) project.

### Ken Arnold

[Kenneth C. R. C. Arnold](https://en.wikipedia.org/wiki/Ken_Arnold) (born 1958) received his BA in computer science from UC Berkeley in 1985. At Berkeley he was president of the Berkeley Computer Club and made major contributions to 2BSD and 4BSD. Beyond curses and Rogue, Arnold became known for his work on the [Java](https://en.wikipedia.org/wiki/Java_(programming_language)) platform at [Sun Microsystems](https://en.wikipedia.org/wiki/Sun_Microsystems): he was one of the architects of [Jini](https://en.wikipedia.org/wiki/Jini), the main implementer of [JavaSpaces](https://en.wikipedia.org/wiki/JavaSpaces), and co-author (with [James Gosling](https://en.wikipedia.org/wiki/James_Gosling)) of [*The Java Programming Language*](https://en.wikipedia.org/wiki/The_Java_Programming_Language).

### Jon Lane

Jon Lane continued to run his own small company, [The Code Dogs](https://web.archive.org/web/20070622153327/http://www.wichman.org/roguehistory.html).

---

## From Rogue to Hack to NetHack

Rogue's source code leak around June 1981 set off a chain reaction. At [Lincoln-Sudbury Regional High School](https://en.wikipedia.org/wiki/Lincoln-Sudbury_Regional_High_School) in Massachusetts, a student named [Jay Fenlason](../hack/HISTORY.md) wrote [Hack](https://en.wikipedia.org/wiki/Hack_(video_game)) in 1982: a Rogue-inspired dungeon crawler with more monsters, more items, and a persistent dungeon. Hack spread through Usenet, was substantially rewritten by [Andries Brouwer](https://en.wikipedia.org/wiki/Andries_Brouwer) in the Netherlands, and was released as Hack 1.0 in December 1984. The response was so overwhelming that [Gene Spafford](https://en.wikipedia.org/wiki/Gene_Spafford) had to create a dedicated newsgroup just to handle the traffic.

[Mike Stephenson](https://nethackwiki.com/wiki/Mike_Stephenson) merged several Hack variants and published [NetHack](https://en.wikipedia.org/wiki/NetHack) in July 1987. Nearly four decades later, the dungeon is still accepting visitors.

The lineage is direct: **Rogue (1980) → Hack (1982) → NetHack (1987)**. This project, [Mazes of Menace](https://mazesofmenace.net/), is a JavaScript port of NetHack, Rogue's grandchild. It sits alongside a [browser port of the original 1982 Hack](../hack/), bringing the full family tree into the browser.

---

## Sources

### Primary Accounts
- Glenn Wichman, ["A Brief History of Rogue"](https://web.archive.org/web/20070622153327/http://www.wichman.org/roguehistory.html) (1997, via Wayback Machine)
- Glenn Wichman, ["Rogue Stories"](https://web.archive.org/web/20070622153512/http://www.wichman.org/roguestories.html) (fan letters collected on wichman.org, via Wayback Machine)
- Joachim Froholt, ["The Story of Rogue"](https://spillhistorie.no/2024/07/14/the-story-of-rogue/) — interview with Glenn Wichman (Spillhistorie.no, 2024)
- Gamereactor, ["40 Years On: The Making of Rogue with Glenn Wichman"](https://www.gamereactor.eu/40-years-on-the-making-of-rogue-with-glenn-wichman/)

### Technical History
- Roguelike Gallery, ["Rogue V3: Development History"](https://rlgallery.org/about/rogue3.html)
- Wikipedia, ["Rogue (video game)"](https://en.wikipedia.org/wiki/Rogue_(video_game))
- Wikipedia, ["Curses (programming library)"](https://en.wikipedia.org/wiki/Curses_(programming_library))
- IEEE-USA InSight, ["Going Rogue: A Brief History of the Computerized Dungeon Crawl"](https://insight.ieeeusa.org/articles/going-rogue-a-brief-history-of-the-computerized-dungeon-crawl/)

### Biographical
- Wikipedia, ["Ken Arnold"](https://en.wikipedia.org/wiki/Ken_Arnold)
- Wikipedia, ["Glenn Wichman"](https://en.wikipedia.org/wiki/Glenn_Wichman)
- en-academic.com, ["Michael Toy"](https://en-academic.com/dic.nsf/enwiki/2832054)
- Wikipedia, ["Code Rush"](https://en.wikipedia.org/wiki/Code_Rush)
- Roguelike Celebration, ["Rogue Panel" (2016)](https://www.youtube.com/watch?v=4IkrZkUV01I) — Toy, Wichman, and Arnold together on stage

### The Descendants
- [Hack HISTORY.md](../hack/HISTORY.md) — Jay Fenlason's 1982 Hack
- Wikipedia, ["NetHack"](https://en.wikipedia.org/wiki/NetHack)
- The Rogue Archive, [britzl.github.io/roguearchive](https://britzl.github.io/roguearchive/)
