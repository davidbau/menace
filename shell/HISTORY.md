# A Short History of the Unix Shell

*The year is 1982. The machine is a VAX-11/780 running 4.2BSD or Unix System III.
This shell is modeled on the Bourne shell as it existed at that moment.*

---

## The Beginning: Ken Thompson's Shell (1971)

Unix was born at Bell Labs in 1969–1971 from a skunkworks project that Murray Hill
management had declined to fund.  Ken Thompson and Dennis Ritchie rewrote their
work from scratch in C, making Unix the first portable operating system.

The first Unix shell — written by Thompson himself — was deliberately minimal.
It could run commands, chain them with pipes, and redirect input and output.
That was nearly all.  No variables.  No if statements.  No loops.  Just commands
and the two great ideas: pipelines and redirection.

The pipeline concept had been pushed for years by Doug McIlroy, who ran the
computing research group at Bell Labs.  McIlroy's memo from 1964 described the
idea of connecting programs like a garden hose: screw in another segment and
off you go.  Thompson built it into the kernel and the shell together.

The philosophy that emerged — one program does one thing well, programs cooperate
through text streams — shaped Unix forever.

---

## The Programmer's Workbench: Mashey Shell (1975–1977)

Bell Labs ran Unix internally for its own software development.  John Mashey, at
the Programmer's Workbench (PWB) group, needed more from the shell: variables,
conditionals, a way to write reusable scripts.

The PWB shell added `$variable` syntax, `if`/`goto`, and the ability to use shell
scripts as commands.  For the first time you could write a real program in shell.

It was rough, but it worked.

---

## The Bourne Shell: sh (1979, Unix Version 7)

Stephen Bourne, also at Bell Labs, rewrote the shell completely for Version 7 Unix,
released in 1979.  The Bourne shell — simply called `sh` — is the direct ancestor
of this implementation.

Bourne was a fan of ALGOL 68.  The influence shows: keywords are closed with their
reverse (`if`...`fi`, `case`...`esac`, `do`...`done`).  The syntax is clean and
consistent.  More importantly, the semantics are carefully defined.

Version 7 Unix was enormously influential.  When it shipped, universities and
research labs across the country got tapes.  A generation of programmers learned
Unix on V7.

Key features Bourne introduced or codified:

- **Environment variables** — exported from parent to child process
- **Here documents** (`<<EOF`) — inline input to a command
- **Control flow** — `if`, `while`, `for`, `case` with POSIX-like syntax
- **`$?`** — exit status of the last command
- **`$1`, `$2`, `$@`** — positional parameters for scripts
- **I/O redirection** — `>`, `>>`, `<`, `>&`
- **Pipelines** — multiple commands connected by `|`
- **Quoting** — single quotes suppress everything; double quotes allow `$` and `` ` ``
- **Command substitution** — `` `command` `` replaces itself with command output

Bourne's shell source code was famously written using preprocessor macros to make
C look like ALGOL 68.  It was unusual enough that Dennis Ritchie once said it was
the most incredible use of the C preprocessor he had ever seen — and not entirely
as a compliment.

---

## The Berkeley Split: C Shell (1978–1979)

While Bourne was building sh at Bell Labs, Bill Joy at UC Berkeley was writing
the C shell (`csh`) for BSD Unix.  Joy later co-founded Sun Microsystems and
also wrote `vi`.

C shell added things that users loved:

- **Job control** — `&` for background, `fg` and `bg` to move jobs
- **History** — `!!` to repeat the last command, `!ls` to repeat the last `ls`
- **Aliases** — `alias ll='ls -l'`
- **Tilde expansion** — `~` for home directory

But csh had a different syntax from sh, and its scripting semantics were buggy
and inconsistent.  The essay *"Csh Programming Considered Harmful"* (Tom
Christiansen, 1994) documents dozens of cases where csh behaves unexpectedly.
The short version: csh is nice to type interactively, but write scripts in sh.

By 1982, most Unix sites ran one or the other.  Bell Labs and AT&T Unix: sh.
Berkeley BSD: csh as the default, sh available.

---

## What Came Next

David Korn at Bell Labs developed the Korn shell (`ksh`) starting around 1983,
combining Bourne shell compatibility with csh-style interactive features and
adding arithmetic expressions and arrays.  It became the AT&T standard.

The GNU project produced `bash` (Bourne-Again Shell) in 1989, which became the
default on Linux.  `bash` is what most people mean today when they say "shell script."

`zsh`, written by Paul Falstad in 1990, combined features from all of the above
and became fashionable again decades later when Apple made it the macOS default.

POSIX standardized a shell language in 1992, based on the Bourne shell.
Anything written for the Bourne shell in 1979 runs correctly today.

---

## Shell Scripting: A Practical Guide

This shell implements the core Bourne sh language as it existed in 1982.
The following constructs all work at the prompt or in scripts.

### Variables

```sh
name=rodney          # assign (no spaces around =)
echo $name           # use a variable
echo ${name}         # braces for disambiguation
echo "Hello, $name"  # double quotes allow expansion
echo 'Hello, $name'  # single quotes suppress expansion: prints literal $name
```

Default values:

```sh
echo ${EDITOR:-vi}   # use vi if EDITOR is unset or empty
echo ${PORT:=8080}   # set PORT to 8080 if unset, then use it
```

### Command Substitution

```sh
today=`date`         # capture output of date command
echo "It is $today"

lines=`cat file.txt | wc -l`
echo "File has $lines lines"
```

### Arithmetic (via expr)

```sh
x=5
y=`expr $x + 3`     # y = 8
echo $y

i=`expr $i + 1`     # increment i
```

### Conditionals

```sh
if [ "$x" -gt 0 ]; then
    echo "positive"
elif [ "$x" -lt 0 ]; then
    echo "negative"
else
    echo "zero"
fi
```

Test operators:

| Strings        | Numbers        | Files      |
|----------------|----------------|------------|
| `=`  equal     | `-eq` equal    | `-f` file  |
| `!=` not equal | `-ne` not equal| `-d` dir   |
| `-z` empty     | `-lt` less     | `-e` exists|
| `-n` not empty | `-gt` greater  | `-r` readable |

Compound conditions with `&&` and `||`:

```sh
[ -f ~/.profile ] && . ~/.profile    # source profile if it exists
[ -d /tmp ] || mkdir /tmp            # create /tmp if missing
```

### Loops

```sh
# for loop over a list
for name in alice bob carol; do
    echo "Hello, $name"
done

# for loop over positional parameters
for arg; do
    echo "got: $arg"
done

# while loop
i=1
while [ $i -le 5 ]; do
    echo $i
    i=`expr $i + 1`
done

# until loop (runs while condition is false)
until [ -f /tmp/lockfile ]; do
    echo "waiting..."
    sleep 1
done
```

### Case Statements

```sh
case "$1" in
    start)
        echo "Starting..."
        ;;
    stop|quit)
        echo "Stopping..."
        ;;
    *)
        echo "Usage: $0 start|stop"
        ;;
esac
```

### Functions

```sh
greet() {
    echo "Hello, $1!"
}

greet rodney    # prints: Hello, rodney!
```

Functions share the caller's environment.  Use unique variable names to avoid
collisions in recursive or deeply nested calls.

### Pipelines and Redirection

```sh
ls -l | more                    # page through ls output
cat /etc/passwd | grep rodney   # search a file
who | sort                      # list users, sorted

echo "hello" > /tmp/out.txt     # write to file (overwrite)
echo "world" >> /tmp/out.txt    # append to file
cat < /tmp/out.txt              # read from file

# Here document: inline input
cat <<EOF
This text
goes to cat's stdin
EOF

# Discard output
command > /dev/null 2>&1
```

### Exit Status and Error Handling

```sh
command && echo "succeeded"     # run echo only if command succeeded
command || echo "failed"        # run echo only if command failed

if grep -q pattern file; then
    echo "found"
fi

echo $?     # exit status of last command (0 = success)
```

### Scripts

A shell script is just a text file with commands, one per line.
The first line conventionally names the interpreter:

```sh
#!/bin/sh
# This is a comment.

echo "Arguments: $#"
echo "First: $1"
echo "All: $@"
```

Make it executable and run it:

```sh
chmod +x myscript
./myscript arg1 arg2
```

Or run it with sh directly:

```sh
sh myscript arg1 arg2
```

### Special Variables

| Variable | Meaning                              |
|----------|--------------------------------------|
| `$0`     | Name of the script                   |
| `$1`–`$9`| Positional parameters                |
| `$#`     | Number of arguments                  |
| `$@`     | All arguments as separate words      |
| `$*`     | All arguments joined by IFS          |
| `$?`     | Exit status of last command          |
| `$$`     | PID of current shell                 |
| `$!`     | PID of last background command       |

---

## A Note on This Implementation

This shell implements the 1982 Bourne sh language: lexer, parser, word expansion
(tilde, `$VAR`, `` `cmd` ``, IFS splitting, globbing), and the full control flow
syntax.  It runs in a simulated Unix filesystem inside a browser.

The implementation in `shell/sh/` consists of:

- `lexer.js` — tokenizes source text, handles quoting and here-docs
- `parser.js` — recursive-descent parser producing an AST
- `expand.js` — word expansion (parameters, command substitution, globbing)
- `interpreter.js` — AST executor with `ShEnv` for variable state
- `builtins.js` — built-in commands (`echo`, `test`, `read`, `expr`, etc.)

The `Shell` class in `shell/shell.js` uses the sh interpreter for all command
dispatch.  ShEnv is the authoritative environment; variable assignments persist
across commands.  The `sh` command drops into an interactive subshell with the
same set of built-in commands.

The games (`nethack`, `dungeon`, `hack`, `rogue`, etc.) are available as commands
from both the main shell and any subshell.

---

*"The shell is the glue of Unix.  It is what makes a collection of small tools
into something greater than the sum of its parts."*

— paraphrasing Doug McIlroy, 1978
