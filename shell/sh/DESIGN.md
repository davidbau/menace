# sh — 1982 Bourne Shell Implementation

A faithful subset of the Bourne shell (Unix Version 7 / System III vintage,
circa 1982), implemented in JavaScript for the Mazes of Menace wave shell.
The goal is enough shell to run `.profile` startup files and simple user
scripts — the kind of thing a student at a Unix terminal in 1982 would write.

## Source files

| File | Purpose |
|------|---------|
| `lexer.js` | Tokenizer: quoting, operators, heredocs |
| `parser.js` | Recursive-descent parser → AST |
| `expand.js` | Word expansion: `$VAR`, backtick, quote removal, IFS splitting |
| `interpreter.js` | AST executor, environment, redirections, pipelines |
| `builtins.js` | Built-in commands: `echo`, `read`, `cd`, `export`, etc. |
| `index.js` | `Sh` class — public API used by the wave shell |

---

## Grammar

The implemented grammar follows the Bourne shell as documented in the
Unix Version 7 manual (1979) and the System III shell manual (1981).

```
program      ::= list EOF

list         ::= pipeline { (';' | NEWLINE) pipeline }
                 -- trailing ';' or NEWLINE allowed

pipeline     ::= command { '|' command }

command      ::= simple_cmd
               | compound_cmd  redirect*
               | funcdef

simple_cmd   ::= word+ redirect*          -- at least one word (the command name)
               | redirect+               -- redirections with no command (rare but valid)

redirect     ::= '>'  word               -- stdout to file (truncate)
               | '>>' word               -- stdout to file (append)
               | '<'  word               -- stdin from file
               | '<<' WORD              -- here-document (delimiter = literal WORD)
               | '>&' DIGIT             -- redirect stdout to fd N (fd 1 and 2 only)

compound_cmd ::= IF list THEN list
                   { ELIF list THEN list }
                   [ ELSE list ]
                 FI

               | WHILE list DO list DONE

               | FOR NAME [ IN word* ] DO list DONE
                 -- if IN clause omitted, iterates over "$@"

               | CASE word IN
                   { pattern { '|' pattern } ')' list ';;' }
                 ESAC

               | '{' list '}'            -- group in current shell
               | '(' list ')'           -- subshell (new variable scope)

               | UNTIL list DO list DONE

funcdef      ::= NAME '(' ')' compound_cmd
```

### Tokens and quoting

- **`#`** begins a comment to end of line (only when not inside a word).
- **`'...'`** single quotes: literal, no expansion at all.
- **`"..."`** double quotes: `$VAR`, `` `cmd` ``, and `\` escapes are
  expanded; word splitting and pathname expansion do NOT happen inside.
- **`\`** outside quotes: escapes the next character (including newline →
  line continuation).
- **`` `cmd` ``** command substitution (backtick). `$(cmd)` is NOT
  implemented — it arrived with POSIX in 1988.
- A word boundary is created by whitespace (per IFS) or an unquoted operator.

---

## Word expansion

Applied to every unquoted word in a simple command, in this exact order:

1. **Tilde expansion** — leading `~` expands to `/home/rodney`.
   `~name` is not implemented.

2. **Parameter expansion** — `$NAME`, `${NAME}`, and modifiers:
   - `${NAME:-word}` — use `word` if NAME is unset or empty
   - `${NAME:=word}` — assign `word` to NAME if unset or empty, then use it
   - `${NAME:?word}` — error with `word` if NAME is unset or empty
   - `${NAME:+word}` — use `word` if NAME is set and non-empty
   - `${#NAME}` — length of NAME
   - Variants without `:` (e.g. `${NAME-word}`) test only for unset,
     not for empty.

3. **Special parameters**:
   - `$0` — script name or `sh`
   - `$1`…`$9` — positional parameters
   - `$#` — count of positional parameters
   - `$*` — all positional params as one word (IFS-joined in double quotes)
   - `$@` — all positional params as separate words (correct in double quotes)
   - `$?` — exit status of last command
   - `$$` — PID (returns a fixed plausible integer, e.g. 1234)
   - `$!` — PID of last background job (always empty; no background)

4. **Command substitution** — `` `cmd` `` runs cmd, captures stdout,
   strips trailing newlines, substitutes the result.

5. **Arithmetic** — not done by the shell. Use `expr` instead.

6. **Word splitting** — the result of steps 2–4 is split on characters in
   `$IFS` (default: space, tab, newline). Splitting does NOT happen inside
   double quotes.

7. **Pathname expansion (globbing)** — `*`, `?`, `[…]` expanded against the
   virtual filesystem. Skipped if no match (unlike bash's `nullglob`; like
   1982 sh, the literal pattern is kept). Not expanded inside quotes.

8. **Quote removal** — unquoted `\`, `'`, `"` removed after all other
   expansions.

---

## Pipelines and I/O

### Pipelines

```
cmd1 | cmd2 | cmd3
```

Each stage is run sequentially (left to right). The left stage's stdout is
captured into a string buffer; that buffer is presented as the right stage's
stdin. This is correct for non-interactive pipeline use.

Interactive commands inside a pipeline (e.g. `nethack | cat`) will not work
sensibly, but that was also true on real 1982 hardware.

### Redirections

```
cmd > file          # truncate/create file, write stdout
cmd >> file         # append stdout
cmd < file          # read stdin from file
cmd << DELIM        # here-document: lines until DELIM is stdin
cmd 2> file         # redirect stderr
cmd > file 2>&1     # merge stderr into stdout
```

Redirections apply to the whole simple command. Multiple redirections are
processed left to right.

**In the browser context**, stdin/stdout/stderr are:

- **stdin** — string buffer (filled by `<`, `<<`, or pipeline); if empty,
  `read` prompts the display and awaits `getch()`.
- **stdout** — string buffer (used by `>`, `>>`, pipeline) or the shell's
  `println()` if no redirection.
- **stderr** — always goes to `println()` (display), never captured.

### Background jobs (`&`)

Not implemented. Attempting `cmd &` prints:
```
sh: background jobs not supported
```

---

## Built-in commands

These run inside the interpreter without spawning a child process. They are
the only commands that can affect the current shell's environment.

| Built-in | Description |
|----------|-------------|
| `:` | No-op, returns 0 |
| `.` file | Source (execute) file in current environment |
| `cd [dir]` | Change directory; no arg → `/home/rodney` |
| `echo [-n] [args…]` | Print args space-joined; `-n` suppresses newline |
| `eval [args…]` | Concatenate args, parse and execute as sh |
| `exec cmd [args…]` | Replace shell with command (navigates to game) |
| `exit [n]` | Exit shell with status n (default `$?`) |
| `export [NAME[=val]…]` | Mark variable for export; `export` alone lists |
| `false` | Return status 1 |
| `getopts` | Not implemented |
| `pwd` | Print current directory |
| `read [NAME…]` | Read one line from stdin; assign fields to names |
| `readonly [NAME…]` | Mark variable read-only |
| `return [n]` | Return from function with status n |
| `set [opts] [args…]` | Set positional params or shell options |
| `shift [n]` | Shift positional params left by n (default 1) |
| `test` / `[` | Evaluate condition (see below) |
| `trap` | Not implemented (no signals) |
| `true` | Return status 0 |
| `type NAME` | Show how NAME would be interpreted |
| `ulimit` | Not implemented |
| `umask` | Not implemented |
| `unset NAME…` | Remove variable or function |
| `wait` | No-op (no background jobs) |

### Shell options (`set`)

| Flag | Meaning |
|------|---------|
| `-e` | Exit on any non-zero command status |
| `-u` | Treat unset variables as error |
| `-v` | Print each line before executing |
| `-x` | Print each command with expanded words before executing |
| `-n` | Parse but do not execute |
| `-f` | Disable pathname expansion |
| `--` | End of options; remaining are positional params |

### `test` / `[`

String tests:
- `-z str` — true if str is empty
- `-n str` — true if str is non-empty
- `str1 = str2` — string equality
- `str1 != str2` — string inequality

Numeric tests (both operands must be decimal integers):
- `n1 -eq n2`, `-ne`, `-lt`, `-le`, `-gt`, `-ge`

File tests:
- `-e file` — exists
- `-f file` — exists and is regular file
- `-d file` — exists and is directory
- `-r file` — readable (always true for accessible files)
- `-w file` — writable (true for non-readonly files)
- `-x file` — executable
- `-s file` — exists and size > 0

Compound (Bourne-era, not POSIX `[[`):
- `! expr`
- `expr1 -a expr2` — and
- `expr1 -o expr2` — or
- `( expr )` — grouping (inside `test`, not shell grouping)

---

## `expr` command

`expr` is an external command (not a built-in), implemented in `builtins.js`
alongside the other built-ins for convenience.

Arithmetic: `+` `-` `*` `/` `%`
Comparison: `=` `!=` `<` `>` `<=` `>=` (return 0/1 as string)
String: `length str`, `substr str pos len`, `index str chars`, `match str regex`
Logical: `expr1 \| expr2`, `expr1 \& expr2`

---

## Variable scoping

- **Global** — all variables live in a single flat environment (the Env object).
- **Functions** — calling a function pushes a new positional-parameter frame
  (`$1`…`$9`, `$#`, `$0`) but does NOT create a new variable scope. Variables
  set inside a function are visible after it returns. This matches 1982 sh
  exactly (`local` was added in ksh/bash later).
- **Subshells** `(…)` — create a copy of the environment; changes inside do
  not propagate out. Used mainly for grouping with redirections.
- **Export** — variables marked `export` are passed to child commands. Since
  all commands share the JS runtime, "export" is tracked as a flag on the
  variable entry.

---

## Integration with the wave shell

The `Sh` class is instantiated by the wave shell in two ways:

### 1. As the `sh` command

```
sh [script] [arg…]
```

If `script` is given, the file is read from the virtual filesystem and
executed. Remaining args become `$1`…`$N`. Exit status sets `$?` in
the outer shell. Stdout/stderr go to the shell's `println()`.

If no arguments, `sh` drops into an interactive subshell loop. The prompt
is `$ ` (not the shell's usual green prompt — this is a nested shell).

### 2. As the `.profile` executor

When the shell starts (or after login), it looks for `/home/rodney/.profile`
and runs it via `Sh` if found. This allows the user to set aliases,
`PATH`-like variables, and print a custom MOTD.

### 3. As the script executor for `#!` files

When the shell's `_execute` encounters a file in the virtual FS whose first
line is `#!/bin/sh` (or `#!sh`), it runs it through `Sh` instead of
looking for a game launcher.

### I/O bridge

The `Sh` class receives an `io` object:

```javascript
{
  println(text),          // write a line to display (stdout when not redirected)
  print(text),            // write without newline (for echo -n, prompts)
  getch(),                // async: returns next keypress for interactive read
  fs,                     // VirtualFS instance
  env,                    // initial environment (copy of shell's exported vars)
  shell,                  // Shell instance (for launching games via exec)
}
```

Stdout redirection captures `println` calls into a string buffer. The buffer
is flushed at the end of the command or pipeline stage.

---

## What is explicitly NOT implemented

| Feature | Reason |
|---------|--------|
| `$(...)` process substitution | Added in ksh/POSIX (1988+) |
| Arithmetic `$(( ))` | Same era |
| Arrays | bash extension |
| `local` variables | ksh/bash extension |
| `select` | ksh extension |
| `[[` `]]` extended test | ksh/bash extension |
| `&` background jobs | No async processes in browser |
| `fg` / `bg` / `jobs` | No job control |
| `trap` | No Unix signals |
| `ulimit` / `umask` | No OS primitives |
| Named pipes / FIFOs | No OS support |
| `>&2` beyond fd 1 and 2 | Sufficient for real scripts |
| Coprocesses | Never in 1982 sh |
| Signal handling (`kill`) | No processes |
| `/dev/null` redirection | Supported via VFS (discards writes) |

---

## Example scripts

### `.profile`
```sh
# Set a greeting
echo "Welcome back, $LOGNAME."
echo ""

# Useful aliases would need alias support; instead use functions:
ll() { ls -l "$@"; }

# Set a variable
EDITOR=vi
export EDITOR
```

### Count files
```sh
#!/bin/sh
count=0
for f in *; do
    count=`expr $count + 1`
done
echo "$count files."
```

### Confirm before delete
```sh
#!/bin/sh
echo "Delete $1? [y/n]"
read ans
if [ "$ans" = "y" ]; then
    rm "$1"
    echo "Deleted."
else
    echo "Cancelled."
fi
```

### Fibonacci
```sh
#!/bin/sh
a=0; b=1
i=0
while [ $i -lt 10 ]; do
    echo $a
    c=`expr $a + $b`
    a=$b
    b=$c
    i=`expr $i + 1`
done
```
