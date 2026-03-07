# Makefile for Rogue 3.6 harness
# Builds rogue_harness — deterministic binary with seed control and JSON output

CC = gcc

# Suppress old-style C warnings (Rogue 3.6 is K&R C)
BASE_CFLAGS = -g -O0 \
    -Wno-implicit-function-declaration \
    -Wno-implicit-int \
    -Wno-return-type \
    -Wno-int-conversion \
    -Wno-incompatible-pointer-types \
    -Wno-deprecated-non-prototype \
    -Wno-builtin-redeclaration \
    -Wno-format \
    -Wno-unused-result \
    -Wno-pointer-sign

# Flags for game source files: inject rogue_patch.h (rand/srand/exit overrides)
# Also inject harness_rename.h to rename main->game_main and readchar->readchar_harness
GAME_CFLAGS = $(BASE_CFLAGS) \
    -DHARNESS \
    -include rogue_patch.h \
    -include harness_rename.h

# Harness infrastructure files (compiled WITHOUT game patch macros)
HARNESS_SRCS = harness_main.c hack_curses.c rng_log.c
HARNESS_OBJS = $(HARNESS_SRCS:.c=.o)

# Game source files
GAME_SRCS = vers.c armor.c chase.c command.c daemon.c daemons.c fight.c \
    init.c io.c list.c main.c misc.c monsters.c move.c newlevel.c \
    options.c pack.c passages.c potions.c rings.c rip.c rooms.c \
    save.c scrolls.c sticks.c things.c weapons.c wizard.c
GAME_OBJS = $(GAME_SRCS:.c=.o)

ALL_OBJS = $(HARNESS_OBJS) $(GAME_OBJS)

all: rogue_harness

rogue_harness: $(ALL_OBJS)
	$(CC) $(BASE_CFLAGS) -o $@ $^

# Harness files: no game patch macros
$(HARNESS_OBJS): %.o: %.c
	$(CC) $(BASE_CFLAGS) -c -o $@ $<

# Game files: inject rogue_patch.h + harness_rename.h
$(GAME_OBJS): %.o: %.c rogue_patch.h harness_rename.h curses.h
	$(CC) $(GAME_CFLAGS) -c -o $@ $<

clean:
	rm -f $(ALL_OBJS) rogue_harness

.PHONY: all clean
