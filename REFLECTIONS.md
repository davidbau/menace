# Does Computer Science Still Exist?

I have always seen the computer as a tool that gives us new ways to think.

Does it still?

As I write this, [Hack](https://mazesofmenace.net/hack/), the text-based dungeon crawler from my childhood, has just been fully ported to JavaScript by an AI agent. I handed the agent the old PDP code and told it to go. When I checked after a couple hours to ask why it was taking so long, it replied: it was working, and that thirteen of twenty-three test sessions were already passing parity. It continued its coding process without interruption all night, and eventually expanded its work to 202 passing tests, achieving near 100% coverage with verified parity to the original.

While I slept it was doing real work: debugging, reasoning, fixing genuine bugs. Not instant. Yet almost entirely on its own.

![Brian Harvey's Computer Club students in 1982, when they created Hack](https://mazesofmenace.net/shell/images/ls-computer-club-1982.jpg)

I grew up in Wayland, the next town over from Sudbury, Massachusetts, where a group of kids at Lincoln-Sudbury Regional High School wrote this game called [Hack](https://mazesofmenace.net/hack/) in 1982. They had [Atari 800s](https://en.wikipedia.org/wiki/Atari_8-bit_family) and [LOGO](https://mazesofmenace.net/logo/) and an obsession with a Unix game called [Rogue](https://mazesofmenace.net/rogue/) that most of them had only heard about. I had the same computers and the same obsession. I never saw Rogue either, but I remember a dungeon exploration game called [Zork](https://mazesofmenace.net/dungeon/): the white house, the mailbox, the underground empire. If you look at the Hack source code, there is a little bit of Zork in it. On those machines, you could press ctrl-C in the middle of a game and find yourself staring at the code that made it run. Every file, every line, right there. It is hard to recapture that sense of wonder today.

I was eleven years old. I did not know that I was inside a revolution.

The computer revolution is a continuous thread from the 1940s to today. I was born in 1970, right in the middle of it, and I have spent my whole life on that thread: [LOGO](https://mazesofmenace.net/logo/), then [BASIC](https://mazesofmenace.net/basic/), then [C](https://en.wikipedia.org/wiki/C_%28programming_language%29), then graduate school, then a career in software, then a pivot to research, and now I run a lab that studies the internal mechanisms of the AI systems that are remaking the world. Each step has felt like a natural next thing. It is only now, looking back, that I notice how far the thread has carried me from where it started.

The amazing thing about computers in the 1980s was how empowering they were. Software was visible and fungible. You could poke around the filesystem and see how any program was built. You could subscribe to COMPUTE! or BYTE and get source code in the mail, type it in, change it, make it yours. Jay Fenlason, one of those Lincoln-Sudbury kids, created Hack in his first semester of learning to program. A high school student, a few months into coding, built a game that caught fire, lived on as NetHack, and is still played four decades later. The computer was the most accessible creative tool ever invented, and software was a medium where a beginner could make something real.

That medium has always been more difficult than you would want it to be. I have spent a good part of my career trying to understand what makes coding hard to learn, and trying to teach the art of doing it well. AI coding agents now raise the tantalizing possibility that we could get back to that world: that the creative power of programming could reach far beyond the people who have the time and inclination to write every detailed line of code. Maybe AI returns us to the 1980s, where a kid with curiosity and a computer can build software that brings joy and wonder into the community. Or maybe it pushes that world further away, concentrating creative power among the people who already have deep technical knowledge, and making the gap harder to cross than ever.

To get a feel for this question, I have been running an experiment. I asked AI coding agents to port these old dungeon games from C to JavaScript, with no human-written code. [Rogue](https://mazesofmenace.net/rogue/), the game I never saw as a child: an agent produced a faithful working port in a single session. [Hack](https://mazesofmenace.net/hack/), the game from my neighborhood: the core port was done by midnight. But then I tried [NetHack](https://mazesofmenace.net/nethack/), and the whole process fell off a cliff. Although it looks like Hack, NetHack is a thoroughly modern program in both structure and scale, 420,000 lines of C code accumulated by open-source coders over four decades, building on top of what the Sudbury kids started. The same approach that breezed through the smaller games got stuck, making no forward progress without heavy human intervention. A swarm of agents is still grinding through it on a server in my office, no end in sight.

I think about this cliff as a teacher, because I need to decide what to teach my students about computer science. I think about it as a lab director, because I need to decide what research questions matter. And I think about it as a person who has watched this revolution for forty-five years and is trying to understand what it is becoming.

The question I keep arriving at: does computer science still exist?

## 85 minutes

Let me tell you about the [Mazes of Menace](https://mazesofmenace.net/) project. The goal is to create perfectly faithful reproductions of the original [Rogue](https://mazesofmenace.net/rogue/), [Hack](https://mazesofmenace.net/hack/), and [NetHack](https://mazesofmenace.net/nethack/) games as they would appear when compiled from C, but rendered into well-written, readable, maintainable JavaScript. This is not a straight transpilation. The programming models in C and JS differ in many ways: how modules are organized, how programmers deal with lists and strings, and most fundamentally, the difference between synchronous blocking C input-handling and the asynchronous event-driven architecture of JS. Despite all this, the aim is to produce, with pure LLM-generated code and no explicit human coding, well-written browser versions that behave exactly the same as the old C versions.

The methodology for the small games is simple and satisfying. Build a reference harness around the original C code. Record gameplay sessions: every screen, every random number, every event. Port the code to JavaScript. Then replay the sessions until the JS output matches the C output exactly. No human-written code. The agent does the porting, the testing, the debugging.

![Codex and Claude porting NetHack autonomously, no end in sight](https://mazesofmenace.net/shell/images/hive-swarm.jpg)

Rogue: 85 minutes for the port, then about six more hours of autonomous follow-up sessions to push test coverage to near 100%. Hack: about eight hours for the core port, then another fifteen hours of follow-up sessions to reach near-complete coverage, all driven by a handful of steering prompts.

I feel like I am watching my profession dissolve. The work of porting old C to modern JavaScript, understanding the control flow, handling the edge cases: this is *my* kind of work. This is the work I have spent decades learning to do. And here it is, happening faster than I can follow, directed by a few sentences of guidance from me.

It would be easy to stop here and write the obvious essay. "AI is coming for programming. The end of an era." Clive Thompson's [reporting in this week's New York Times](https://www.nytimes.com/2026/03/12/magazine/ai-coding-programming-jobs-claude-chatgpt.html) is a good version of that essay: he talked to seventy developers and found that most of them barely write code anymore. He is not wrong about what he saw. But the piece treats coding as one thing, and the productivity gains of 10x, 20x, 100x as differing only in degree. My experience suggests something different, a difference in kind. Because there is a cliff between Hack and NetHack.

## The complexity cliff

NetHack is not fifty Rogues. It is a deeply interconnected system where any object can interact with any monster, any terrain, any status effect. The body of a [cockatrice](https://nethackwiki.com/wiki/Cockatrice) monster, for example, will petrify anything that touches it with bare flesh. So naturally the game tracks what happens if you pick up its dead body without wearing gloves. Or if you wield one as a weapon while wearing gloves. Or if a giant picks one up and attacks you with it, or if you polymorph into a female cockatrice and lay eggs and then throw them at your enemies, or if you throw the corpse into the air without wearing a helmet. That last one kills you, and the game records your cause of death as "petrified by elementary physics." That is one monster. All the combinatorial interactions between the hundreds of monsters and hundreds of objects, states, and places in the dungeon mean that the jump from 8,000 to 420,000 lines does not produce a proportional increase in complexity. It produces a qualitative shift.

The Rogue and Hack ports were done by an individual agent working largely autonomously over a few hours-long sessions. For NetHack I have had a swarm of agents running on a server for nearly two months, both Claude and Codex. I have been spending substantial effort managing them, and the end is not yet in sight. Early on I tried the same hands-off approach that worked for Rogue. The agents would make progress for a while, then get stuck on a bug and spend twenty minutes poking at random hypotheses, each guess requiring a full test cycle. I would come back to find hundreds of lines of speculative changes and no forward motion. So I started building infrastructure. I wrote an AGENTS.md file defining how each agent should work: what to do when a test fails, how to avoid clobbering another agent's changes, when to stop and ask for help. I codified eight debugging workflows into reusable skill protocols. I directed agents to build a custom diagnostic tool called dbgmapdump that captures the full game state in a single dump, so an agent does not have to probe hidden variables one at a time. I advised them to build event logs that record hidden state changes as they happen, so that when a bug manifests at step 50 but was caused at step 30, the step-30 anomaly is right there in the log.

The project has generated over 200,000 lines of JavaScript and a body of documentation larger than the entire Rogue source code. I have not written code. I have been giving advice, reviewing documentation, suggesting tools, triaging problems, and deciding which agent works on what. It is the work of an engineering manager, except that none of the engineers are human.

All of this infrastructure serves the same purpose: making hidden things visible. The human's job is to anticipate which variables matter and surface them before the agent needs them. If you work in my area of research, this will sound familiar. It is the same intellectual move as mechanistic interpretability: exposing internal causal structure to make reasoning tractable. I find myself doing interpretability on a C program.

## Goodhart's Law

There is a sobering footnote to the easy wins. After completing Rogue and Hack, I had high test coverage numbers: 93%, 97%. The projects looked done. Then a friend's email made me look more carefully, and I discovered that many of those tests were a figleaf. They exercised code but validated against themselves, locking in whatever the JavaScript happened to do, rather than checking it against the C ground truth. The hidden variable is "what is this test actually checking?" Even the easy projects were less done than they appeared.

[Goodhart's Law](https://en.wikipedia.org/wiki/Goodhart%27s_law), named for the economist [Charles Goodhart](https://en.wikipedia.org/wiki/Charles_Goodhart), states that when a measure becomes a target, it ceases to be a good measure. The idea is simple: once you optimize for a metric, your efforts to drive the metric will distort it until it diverges from the thing it was supposed to represent. It happens in economics, in education, in medicine, and as I learned, in software testing. My coverage numbers were real — the tests ran, they passed, they covered the code. But the metric I was optimizing for, passing tests, had quietly drifted away from the thing I actually cared about: faithful reproduction of the original game. The tests had become a target, and in becoming a target, they had stopped being honest.

The pattern is worth remembering. It is easy to build systems that look like they work. It is hard to build systems that *actually* work. The gap between the two is where the difficulty lives, and AI does not make that gap disappear. If anything, by making it easy to produce vast quantities of plausible-looking output, AI makes the gap more dangerous.

In my [previous post on vibe coding](https://davidbau.com/archives/2025/12/16/vibe_coding.html), I proposed two rules: automate tests, and test the tests. The NetHack project is the same lesson, amplified. You need to test the tests of the tests. It is metaprogramming all the way down.

## The question for my students

I am a computer science professor; at least it says that on the door. But when I stand in front of a classroom now, I honestly wonder what field I need to be teaching.

When I was a student, CS was about writing programs. Algorithms, data structures, systems, languages. Thinking computationally, decomposing problems, managing complexity. At its core, the craft of assembling programs. Learning to build things out of logic and patience.

What is it becoming? My students can get an AI agent to write code that would have taken me a week, in ten minutes. The mechanical skill of programming, our lifetime of practice, is dissolving as a bottleneck. If CS was about writing code, then the field is over.

But my NetHack experience suggests something different. The skills that matter at scale are somehow still about programming, but they are not coding skills. They are: deciding what to build. Figuring out what to test and how to know if the tests are honest. Building tools that make invisible things visible. Managing coordination across agents. Knowing when a metric is a figleaf. Recognizing where the real complexity lives in a system, and routing attention there instead of everywhere else.

These are the conceptual skills that have always been underneath large-scale programming. They are the hard part that the mechanical craft obscured. The reality is that CS has never really been about writing code. Underneath coding is critical thinking about algorithms, engineering principles, analytical methods. It is the science of managing complexity, and code is just the medium we manage it in. In the era of AI code generation, the field does not die. It transforms.

This is not an entirely comforting answer. "Manage complexity" is a lot more abstract than "sort a list." It is harder to teach, harder to test, harder to grade. And it raises the uncomfortable question of how many of the things we currently teach are really about the skin rather than the animal. It also raises the question of whether there will be a need for fewer computer scientists, or maybe more. The answers are not clear yet.

## Two viewpoints on the future

When I speak with other AI researchers and builders, I find that there are two different ways to interpret the change we are living through.

The first viewpoint sees a singularity: AI is a unique and permanent change to the status of humans. The beginning of the end of the relevance of human thought and human agency. On this reading, the cliff I hit with NetHack is temporary. Next year the models will be bigger, the context windows longer, the tools better. Every cognitive activity will become so easy that humans cannot even imagine how to state a difficult question. It would be the end of wanting, the end of thinking, the end of scarcity. And then the question of what becomes of human purpose is very hard to answer.

The second viewpoint sees an industrial revolution: AI is a technological step change, but just a big step, and not the end of all steps. Many things that have always been difficult are now suddenly easy, creating huge changes in our perspective on what can and should be done in the world. Yet this view does not spell the end of human agency. It expands the circle of possibilities.

I live in the Back Bay neighborhood of Boston. It is an interesting place to think about industrial step changes, because the neighborhood itself would not exist without one. Before the 1850s, the area behind Boston was a swampy tidal flat. Steam shovels made it possible, for the first time, to move earth at an industrial scale, and locomotives carried it in to fill the bay. Bostonians chose to use this new capability to create a neighborhood where there had been mud. The project took thirty years and development another fifty. Today this wonder of "modern" 19th century industry is a historic Victorian neighborhood. Boston's swamps are gone, the city is transformed, but the projects are not done; the city simply has different ambitions now.

![In 1857 steam shovels were used to tear up Needham Hills to fill in Boston Back Bay](https://mazesofmenace.net/shell/images/needham-steamshovel.jpg)

The steam shovel was an enormous force multiplier. It did not make civil engineering irrelevant. It changed what civil engineers could decide to do. It expanded the category of decisions that were worth making.

I think AI is a multiplier of the same kind. It dramatically advances the line of what we consider hard, multiplicatively. But the multiplier just opens our eyes to a new vista of hard problems. The frontier moves outward, but there is still a frontier. We do not get a world without hard problems. We get a world where the zone of easy problems is bigger.

But actually: maybe not that much bigger. Right now, the line is somewhere between Hack and NetHack.

The economy is full of "NetHacks." Healthcare, law, infrastructure, legacy systems, scientific research: deeply interconnected, decades of accumulated human decisions, hidden causal chains. The same properties that make NetHack hard for AI agents. Interesting times.

## Interesting times

My grandfather was born in 1911 in Shanghai and died in 1995 in Washington, DC. He witnessed the creation of the automobile and the jumbo jet. He was a participant in World War II, tracing a path from the cultures of Asia to America, from an aristocratic birth to a democratic career, from the old world to the new. In his senior years he jetted around a modern world that was utterly different from the one he was born into.

I remember thinking, when he died, what an interesting life he had. And I remember thinking, as a twenty-five-year-old: how lucky he was to see such dramatic change. We do not have changes like that anymore.

I was wrong. Here we are. I did not know that revolution has been a continuous thread.

We are all likely to have an interesting life. Graduate school, a career in software, a pivot to teaching; now I run a lab at the center of the latest revolution. What work is, what industry is, what it means to learn, to think, to know: these things are changing. The field I grew up in is shedding its skin. The wonders from my childhood are being rebuilt by machines. The machines are good at it, very good, until the problems get large enough to be hard again.

That is what I want my students to understand. Not that the machines are coming for their jobs: the machines are already here, and the jobs are already different. What I want them to understand is that the hard part has always been hard, and will still be hard. Complexity does not yield to speed. Judgment remains essential. The work of deciding what matters, of seeing what is hidden, of knowing when your own metrics are lying to you: this is the work that remains, and it is the work worth learning.

But there is a question underneath this that I do not have an answer to. I can navigate the complexity of the NetHack project because I have twenty years of experience building and debugging large software systems. I have seen the patterns before: the circular metrics, the hidden state, the lack of foresight and strategic judgment. When an agent gets stuck, I usually recognize what kind of stuck it is. That knowledge did not come from reading about complexity management. It came from years of assembling programs by hand, confronting bugs I could not explain, slowly building an instinct for where systems go wrong.

Jay Fenlason could create Hack because the whole path from curiosity to creation was short and legible. He could see the code, learn the machine, build something real, and develop judgment along the way. My students will not have that path. If the mechanical craft of coding dissolves as a bottleneck, it also dissolves as a training ground. I do not yet see how someone who has never spent a week tracking down a subtle bug develops the judgment to recognize when an AI agent is chasing its tail on one. The skills that matter most at scale may be the hardest to acquire without the very apprenticeship that AI is making obsolete. I wanted to believe that AI returns us to the 1980s. I am not sure it does.

This project — reconstructing old software — has sharpened my sense of what AI assistance can and cannot do. I plan to finish the NetHack project and gather the technical details to share at some point in the future. There will be something to learn from what AI-assisted coding on a 420,000-line codebase actually looks like, the tools, the failures, and the specific lessons. The revolution is real. But it has been continuous, an adventure I have witnessed since I was eleven years old. I do not know exactly what computer science is becoming. But, from what I can see: it is far from over.

---

Try the vibe-coded historical reconstructions of classic programs here:

* [Rogue (1980) by Michael Toy and Glenn Wichman](https://mazesofmenace.net/rogue/)
* [Hack (1982) by Jay Fenlason](https://mazesofmenace.net/hack/)
* [Nethack 3.7.0 (2027), work-in-progress](https://mazesofmenace.net/)
* [Logo, reimagined for 1982](https://mazesofmenace.net/logo/)

---

*The [Mazes of Menace](https://mazesofmenace.net/) project is at [mazesofmenace.net](https://mazesofmenace.net/) and [on GitHub](https://github.com/davidbau/menace). A previous post on [vibe coding](https://davidbau.com/archives/2025/12/16/vibe_coding.html) describes earlier lessons from the same methodology.*

*Originally posted at <a href="https://davidbau.com/archives/2026/03/20/does_computer_science_still_exist.html" target="_blank">davidbau.com</a>.*
