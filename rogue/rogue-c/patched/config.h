/*
 * config.h — Harness build configuration for Rogue 3.6
 *
 * Defines HAVE_* macros for mdport.h.  Designed to work on both
 * macOS and Linux without system-specific crypt or curses headers.
 */

#ifndef CONFIG_H
#define CONFIG_H

/* Standard headers available on both macOS and Linux */
#define HAVE_SYS_TYPES_H 1
#define HAVE_UNISTD_H 1
#define HAVE_LIMITS_H 1
#define HAVE_STRING_H 1
#define HAVE_MEMORY_H 1
#define HAVE_TERMIOS_H 1

/* Process/user functions */
#define HAVE_PWD_H 1
#define HAVE_SETGID 1
#define HAVE_GETGID 1
#define HAVE_SETUID 1
#define HAVE_GETUID 1
#define HAVE_GETPASS 1
#define HAVE_FORK 1
#define HAVE_ALARM 1

/* We use our own curses.h — don't look for system curses */
#define HAVE_CURSES_H 1

/* errno — mdport.c needs it */
#define HAVE_ERRNO_H 1

/* Do NOT define HAVE_CRYPT or HAVE_CRYPT_H — harness doesn't need
 * password hashing.  xcrypt.c provides a fallback crypt() if needed. */

/* Terminal functions — stub in harness */
#define HAVE_ERASECHAR 1
#define HAVE_KILLCHAR 1

#endif /* CONFIG_H */
