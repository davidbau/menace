/*
 * hack_main_rename.h — Rename hack.main.c's main() for harness build.
 * Included only when compiling hack.main.c.
 */
#define main game_main
