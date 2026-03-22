# About BASIC

At four in the morning on May 1, 1964, a Dartmouth College student typed RUN on a teletype connected to a [General Electric GE-225](https://en.wikipedia.org/wiki/GE-200_series) computer, and a program executed. It was the first BASIC program ever run. The language had been designed by two Dartmouth mathematicians, [John Kemeny](https://en.wikipedia.org/wiki/John_G._Kemeny) and [Thomas Kurtz](https://en.wikipedia.org/wiki/Thomas_E._Kurtz), with a radical idea: that computing should be accessible to everyone, not just specialists.

Kemeny was a Hungarian immigrant who had worked on the Manhattan Project and served as Albert Einstein's mathematical assistant at Princeton. Kurtz was a statistician who believed that every student at Dartmouth, English majors and history majors included, should be able to use a computer. Together they created BASIC: Beginner's All-purpose Symbolic Instruction Code. The language was deliberately simple. You typed a line number, a command, and pressed RETURN. The computer did what you said.

```
10 PRINT "HELLO, WORLD!"
RUN
```

The [Dartmouth Time-Sharing System](https://en.wikipedia.org/wiki/Dartmouth_Time-Sharing_System) was as important as the language itself. Before Dartmouth, using a computer meant submitting a deck of punched cards and waiting hours or days for output. Kemeny and Kurtz gave students teletypes connected to a shared computer, where twenty people could write and run programs simultaneously, each getting immediate feedback. The combination of an easy language and instant response was electric.

BASIC spread fast. GE licensed it for its commercial timesharing systems. Other universities adapted it. By the early 1970s, [Digital Equipment Corporation](https://en.wikipedia.org/wiki/Digital_Equipment_Corporation) had created [BASIC-PLUS](https://en.wikipedia.org/wiki/BASIC-PLUS) for the PDP-11 running under [RSTS/E](https://en.wikipedia.org/wiki/RSTS/E), adding string handling, matrix operations, and file I/O to the original Dartmouth design. BASIC-PLUS was the language that thousands of students and engineers encountered on DEC minicomputers throughout the 1970s and into the 1980s.

Then came the microcomputer revolution. In 1975, a young [Bill Gates](https://en.wikipedia.org/wiki/Bill_Gates) and [Paul Allen](https://en.wikipedia.org/wiki/Paul_Allen) wrote [Altair BASIC](https://en.wikipedia.org/wiki/Altair_BASIC) for the MITS Altair 8800, the first personal computer. It was Microsoft's first product. Gates and Allen understood what Kemeny and Kurtz had understood a decade earlier: that the first thing people want to do with a computer is make it do something, and BASIC was the fastest path from zero to something.

By 1982, BASIC was everywhere. Every personal computer shipped with it: [Applesoft BASIC](https://en.wikipedia.org/wiki/Applesoft_BASIC) on the Apple II, [Atari BASIC](https://en.wikipedia.org/wiki/Atari_BASIC) on the Atari 800, [Commodore BASIC](https://en.wikipedia.org/wiki/Commodore_BASIC) on the VIC-20 and C64, [GW-BASIC](https://en.wikipedia.org/wiki/GW-BASIC) on the IBM PC. You turned on the machine and BASIC was there, waiting. The blinking cursor was an invitation: type something. The entire generation of programmers who built the software industry learned to program by typing line numbers into BASIC.

## How to Program in BASIC

BASIC programs are made of numbered lines. You type them in any order; the computer sorts them by number. Type `RUN` to execute. Type `LIST` to see your program. Type `NEW` to start over.

### Hello World

```
10 PRINT "HELLO, WORLD!"
```

Type `RUN` to execute it.

### Variables and Input

Variables hold values. String variables end with `$`. Use `INPUT` to ask the user for a value:

```
10 INPUT "WHAT IS YOUR NAME"; N$
20 PRINT "HELLO, "; N$; "!"
```

Assign values with `LET` (or just `=`):

`X = 42` — set X to 42

`N$ = "WORLD"` — set N$ to "WORLD"

### Loops

`FOR`/`NEXT` loops repeat a block of code:

```
10 FOR I = 1 TO 10
20 PRINT I * I
30 NEXT I
```

Use `STEP` for counting by a different amount:

```
10 FOR I = 10 TO 1 STEP -1
20 PRINT I
30 NEXT I
40 PRINT "BLASTOFF!"
```

### Decisions

`IF`/`THEN` tests a condition:

```
10 INPUT "GUESS A NUMBER 1-10"; G
20 IF G = 7 THEN PRINT "YOU GOT IT!" \ GOTO 50
30 IF G < 7 THEN PRINT "TOO LOW"
40 IF G > 7 THEN PRINT "TOO HIGH"
50 END
```

Notice the `\` backslash: in BASIC-PLUS, it separates multiple statements on one line.

### GOTO and GOSUB

`GOTO` jumps to a line number. `GOSUB` jumps to a subroutine and `RETURN` comes back:

```
10 PRINT "MAIN PROGRAM"
20 GOSUB 100
30 PRINT "BACK IN MAIN"
40 END
100 PRINT "IN SUBROUTINE"
110 RETURN
```

### Data

`DATA` stores values inline. `READ` retrieves them:

```
10 FOR I = 1 TO 4
20 READ N$
30 PRINT N$
40 NEXT I
50 DATA "SPRING", "SUMMER", "FALL", "WINTER"
```

### String Functions

`LEFT$(s$,n)` — first n characters

`RIGHT$(s$,n)` — last n characters

`MID$(s$,start,len)` — substring

`LEN(s$)` — length

`ASC(s$)` — ASCII value of first character

`CHR$(n)` — character from ASCII value

`VAL(s$)` — convert string to number

`STR$(n)` — convert number to string

### Math

`ABS(x)` `INT(x)` `SGN(x)` `SQR(x)` — absolute value, integer, sign, square root

`SIN(x)` `COS(x)` `TAN(x)` `ATN(x)` — trigonometry (radians)

`LOG(x)` `EXP(x)` — natural log and exponential

`RND(x)` — random number between 0 and 1

`PI` — 3.14159...

### PRINT USING

Format output with a template:

```
10 PRINT USING "THE ANSWER IS ##.##", PI
```

`#` marks a digit position, `.` marks the decimal point.

### The Famous One-Liner

This program prints a random maze that fills the screen:

```
10 PRINT CHR$(47 + INT(RND(1) * 2) * 45);
20 GOTO 10
```

Press Ctrl-C to stop it.

### Matrix Operations

BASIC-PLUS can do linear algebra. Declare a matrix with `DIM`, then use `MAT` commands:

```
10 DIM A(3,3)
20 MAT A = CON
30 MAT PRINT A
```

`MAT A = ZER` — fill with zeros

`MAT A = CON` — fill with ones

`MAT A = IDN` — identity matrix

`MAT C = A + B` — matrix addition

`MAT C = A * B` — matrix multiplication

`MAT C = TRN(A)` — transpose

### File I/O

Save data to a file and read it back:

```
10 OPEN "MYDATA" FOR OUTPUT AS #1
20 PRINT #1, "HELLO"
30 PRINT #1, 42
40 CLOSE #1
```

```
10 OPEN "MYDATA" FOR INPUT AS #1
20 INPUT #1, A$
30 INPUT #1, N
40 CLOSE #1
50 PRINT A$; " "; N
```

### SLEEP

Pause execution for a number of seconds:

```
10 FOR I = 3 TO 1 STEP -1
20 PRINT I; "..."
30 SLEEP 1
40 NEXT I
50 PRINT "GO!"
```

### Quick Reference

Type `HELP` at the prompt for a full list of commands. `SAVE` saves your program, `LOAD` restores it. `BYE` or Ctrl-C exits to the shell.

## The Impact of BASIC

An entire generation learned to program by typing BASIC into their home computers. BASIC taught them that programming was not something that happened in a lab. It was something you did at your kitchen table, on a Saturday, because you wanted to make the computer do something new. The line numbers, the GOTO statements, the blinking cursor: these were the raw materials of a generation's introduction to computational thinking.

BASIC's influence is hard to overstate. It was the first programming language for millions of people. It ran on every platform. It was free, it was immediate, it was forgiving. Professional programmers sometimes looked down on it. Edsger Dijkstra [famously wrote](https://en.wikiquote.org/wiki/Edsger_W._Dijkstra) that "it is practically impossible to teach good programming to students that have had a prior exposure to BASIC." But Dijkstra was wrong about what mattered. What mattered was that BASIC got people started. From BASIC they went to Pascal, C, Lisp, whatever they needed. The important thing was that they had started.

It has been a long time since BASIC was taught in college. The language has fallen out of favor, replaced by Python and JavaScript and languages that do not require line numbers. But the simplicity that made it revolutionary has not gone anywhere. As soon as you type something, the computer does it. You can try it here.
