/*
 * harness_rename.h — Rename game entry points for harness integration.
 * Injected via -include during compilation of game source files.
 */

#ifndef HARNESS_RENAME_H
#define HARNESS_RENAME_H

/* Rename main() so harness_main.c can provide its own main() */
#define main game_main

/* Rename readchar() so harness can inject keystrokes */
#define readchar readchar_original

#endif /* HARNESS_RENAME_H */
