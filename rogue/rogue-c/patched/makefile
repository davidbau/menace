# Makefile for Rogue 3.6 harness
# Source: RoguelikeRestorationProject/rogue3.6 (upstream submodule)
# Builds rogue_harness — deterministic binary with seed control and JSON output

UPSTREAM = ../upstream

CC = gcc

# Suppress old-style C warnings (Rogue 3.6 source uses K&R patterns)
BASE_CFLAGS = -g -O0 \
    -Wno-implicit-function-declaration \
    -Wno-implicit-int \
    -Wno-return-type \
    -Wno-int-conversion \
    -Wno-incompatible-pointer-types \
    -Wno-deprecated-non-prototype \
    -Wno-format \
    -Wno-unused-result \
    -Wno-pointer-sign

# Game source files: inject rogue_patch.h + harness_rename.h
# -I. ensures our curses.h and config.h are found before system headers
GAME_CFLAGS = $(BASE_CFLAGS) \
    -DHARNESS \
    -I. \
    -include rogue_patch.h \
    -include harness_rename.h

# Harness infrastructure files (compiled WITHOUT game patch macros)
HARNESS_SRCS = harness_main.c hack_curses.c rng_log.c
HARNESS_OBJS = $(HARNESS_SRCS:.c=.o)

# Game source files (copied from upstream via 'make setup')
GAME_SRCS = vers.c armor.c chase.c command.c daemon.c daemons.c fight.c \
    init.c io.c list.c main.c mdport.c misc.c monsters.c move.c \
    newlevel.c options.c pack.c passages.c potions.c rings.c rip.c \
    rooms.c save.c scrolls.c state.c sticks.c things.c weapons.c \
    wizard.c xcrypt.c
GAME_OBJS = $(GAME_SRCS:.c=.o)

ALL_OBJS = $(HARNESS_OBJS) $(GAME_OBJS)

all: rogue_harness

# Copy upstream source files into patched/ for building
setup:
	@echo "Copying upstream source from $(UPSTREAM)..."
	@for f in $(GAME_SRCS); do \
	    if [ -f $(UPSTREAM)/$$f ]; then cp $(UPSTREAM)/$$f .; fi; \
	done
	@for f in rogue.h machdep.h mdport.h; do \
	    if [ -f $(UPSTREAM)/$$f ]; then cp $(UPSTREAM)/$$f .; fi; \
	done
	@echo "Applying harness patches..."
	@# Guard game's rnd/roll definitions so harness_rnd prevails.
	@# Wrap "int\nrnd(...)" and "int\nroll(...)" with #ifndef HARNESS.
	@python3 -c "\
import re; \
t = open('main.c').read(); \
t = re.sub(r'(int\nrnd\(int range\)\n\{[^}]*\})', r'#ifndef HARNESS\n\1\n#endif', t); \
t = re.sub(r'(int\nroll\(int number, int sides\)\n\{[^}]*\})', r'#ifndef HARNESS\n\1\n#endif', t); \
open('main.c','w').write(t)"
	@# Fix missing semicolon in mdport.c (upstream bug)
	@sed -i.bak 's/return(1)$$/return(1);/' mdport.c && rm -f mdport.c.bak
	@# Add parity trace logging to command.c (after readchar, log no_command/after state)
	@python3 -c "\
t = open('command.c').read(); \
t = t.replace(\
    'if (no_command)',\
    '{ extern void harness_log_event(const char*); extern int harness_rng_call_count; char _buf[80]; snprintf(_buf,sizeof(_buf),\"^cmd[ch=%d no_cmd=%d after=%d]\",ch,no_command,after); harness_log_event(_buf); }\n\tif (no_command)',\
    1); \
open('command.c','w').write(t)"
	@# Rename md_readchar in mdport.c so harness can override it
	@sed -i.bak 's/md_readchar/md_readchar_original/g' mdport.c && rm -f mdport.c.bak
	@echo "Done. Run 'make' to build."

rogue_harness: $(ALL_OBJS)
	$(CC) $(BASE_CFLAGS) -o $@ $^

# Harness files: no game patch macros, but -I. for our headers
$(HARNESS_OBJS): %.o: %.c
	$(CC) $(BASE_CFLAGS) -I. -c -o $@ $<

# Game files: inject rogue_patch.h + harness_rename.h
$(GAME_OBJS): %.o: %.c rogue_patch.h harness_rename.h config.h curses.h
	$(CC) $(GAME_CFLAGS) -c -o $@ $<

clean:
	rm -f $(ALL_OBJS) rogue_harness

.PHONY: all clean setup
