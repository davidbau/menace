// do_name.js -- Naming objects, monsters, and features
// cf. do_name.c — nextmbuf, free_mgivenname, free_oname, safe_oname,
//                 christen_monst, alreadynamed, do_mgivenname, do_oname,
//                 objtyp_is_callable, name_ok, call_ok, docallcmd, docall_xname,
//                 docall, namefloorobj, x_monnam, l_monnam, mon_nam,
//                 noit_mon_nam, some_mon_nam, Monnam, noit_Monnam,
//                 Some_Monnam, noname_monnam, m_monnam, y_monnam, YMonnam,
//                 Adjmonnam, a_monnam, Amonnam, distant_monnam, mon_nam_too,
//                 monverbself, minimal_monnam, Mgender, pmname, mon_pmname,
//                 obj_pmname, rndmonnam, bogon_is_pname, roguename,
//                 rndcolor, rndorcname, christen_orc, lookup_novel
//
// do_name.c handles the naming of objects and monsters, plus all monster
//   name formatting functions:
//   docallcmd/docall: player command to name objects or monsters.
//   x_monnam/mon_nam/Monnam: core monster name formatters.
//   rndmonnam/rndorcname: random name generators.
//   christen_monst/christen_orc: assign names to monsters.
//
// JS implementations: none — all naming logic is runtime gameplay.

// cf. do_name.c:19 [static] — nextmbuf(void): next monster name buffer
// Returns next available buffer from rotating monster name buffer pool.
// TODO: do_name.c:19 — nextmbuf(): monster name buffer allocation

// cf. do_name.c:50 — free_mgivenname(mon): free monster given name
// Deallocates memory used for a monster's custom given name.
// TODO: do_name.c:50 — free_mgivenname(): monster name deallocation

// cf. do_name.c:80 — free_oname(obj): free object custom name
// Deallocates memory for an object's custom name.
// TODO: do_name.c:80 — free_oname(): object name deallocation

// cf. do_name.c:94 — safe_oname(obj): safe object name pointer
// Returns pointer to object's name, or safe default if none.
// TODO: do_name.c:94 — safe_oname(): safe object name

// cf. do_name.c:132 — christen_monst(mtmp, name): assign monster name
// Sets a custom name on a monster.
// TODO: do_name.c:132 — christen_monst(): monster name assignment

// cf. do_name.c:157 [static] — alreadynamed(mtmp, monnambuf, usrbuf): already named?
// Checks if a monster already has a name matching user input.
// TODO: do_name.c:157 — alreadynamed(): monster already-named check

// cf. do_name.c:198 [static] — do_mgivenname(void): name a monster command
// Handles the player command to give a monster a custom name.
// TODO: do_name.c:198 — do_mgivenname(): monster naming command

// cf. do_name.c:289 [static] — do_oname(obj): name an object
// Handles the player command to give an object a custom name.
// TODO: do_name.c:289 — do_oname(): object naming command

// cf. do_name.c:428 — objtyp_is_callable(i): object type can be named?
// Returns TRUE if the object type supports custom naming.
// TODO: do_name.c:428 — objtyp_is_callable(): object type nameable check

// cf. do_name.c:466 — name_ok(obj): naming permitted?
// Returns TRUE if naming this object is currently permitted.
// TODO: do_name.c:466 — name_ok(): naming permission check

// cf. do_name.c:479 — call_ok(obj): calling/naming eligible?
// Returns TRUE if calling (naming) this object is allowed.
// TODO: do_name.c:479 — call_ok(): call eligibility check

// cf. do_name.c:498 — docallcmd(void): #name command dispatcher
// Processes the player command to name something; dispatches to do_mgivenname or docall.
// TODO: do_name.c:498 — docallcmd(): name command handler

// cf. do_name.c:604 [static] — docall_xname(obj): extract object name from user
// Gets the exact name string for an object from user input.
// TODO: do_name.c:604 — docall_xname(): object name extraction

// cf. do_name.c:635 — docall(obj): assign object name
// Assigns or updates a custom name for an object.
// TODO: do_name.c:635 — docall(): object name assignment

// cf. do_name.c:678 [static] — namefloorobj(void): name floor object
// Handles naming an object currently on the floor.
// TODO: do_name.c:678 — namefloorobj(): floor object naming

// cf. do_name.c:826 — x_monnam(mtmp, article, adjective, suppress, called): format monster name
// Core monster name formatter with article, adjective, and visibility options.
// TODO: do_name.c:826 — x_monnam(): core monster name formatter

// cf. do_name.c:1034 — l_monnam(mtmp): possessive monster name
// Returns possessive form of a monster's name.
// TODO: do_name.c:1034 — l_monnam(): possessive monster name

// cf. do_name.c:1041 — mon_nam(mtmp): standard monster name
// Returns the standard name of a monster.
// TODO: do_name.c:1041 — mon_nam(): monster name

// cf. do_name.c:1053 — noit_mon_nam(mtmp): monster name without "it"
// Returns monster name without replacing with "it" for visibility.
// TODO: do_name.c:1053 — noit_mon_nam(): non-"it" monster name

// cf. do_name.c:1064 — some_mon_nam(mtmp): vague monster reference
// Returns vague reference to monster ("something" if unseen).
// TODO: do_name.c:1064 — some_mon_nam(): vague monster name

// cf. do_name.c:1073 — Monnam(mtmp): capitalized monster name
// Returns capitalized monster name for sentence-start use.
// TODO: do_name.c:1073 — Monnam(): capitalized monster name

// cf. do_name.c:1082 — noit_Monnam(mtmp): capitalized non-"it" name
// Returns capitalized monster name without "it" replacement.
// TODO: do_name.c:1082 — noit_Monnam(): capitalized non-"it" name

// cf. do_name.c:1091 — Some_Monnam(mtmp): capitalized vague reference
// Returns capitalized vague reference to a monster.
// TODO: do_name.c:1091 — Some_Monnam(): capitalized vague reference

// cf. do_name.c:1101 — noname_monnam(mtmp, article): article-specified name
// Returns monster name with explicitly specified article style.
// TODO: do_name.c:1101 — noname_monnam(): article-controlled monster name

// cf. do_name.c:1109 — m_monnam(mtmp): possessive-marker name
// Returns monster name with possessive marker appended.
// TODO: do_name.c:1109 — m_monnam(): possessive-marker monster name

// cf. do_name.c:1116 — y_monnam(mtmp): "your" monster reference
// Returns "your <monster>" for pets and similar references.
// TODO: do_name.c:1116 — y_monnam(): "your" monster reference

// cf. do_name.c:1132 — YMonnam(mtmp): capitalized "your" reference
// Returns capitalized "Your <monster>" form.
// TODO: do_name.c:1132 — YMonnam(): capitalized "your" reference

// cf. do_name.c:1141 — Adjmonnam(mtmp, adj): adjective-prefixed name
// Prefixes an adjective to monster's name.
// TODO: do_name.c:1141 — Adjmonnam(): adjective-prefixed monster name

// cf. do_name.c:1151 — a_monnam(mtmp): indefinite article monster name
// Returns monster name with indefinite article.
// TODO: do_name.c:1151 — a_monnam(): indefinite article monster name

// cf. do_name.c:1158 — Amonnam(mtmp): capitalized indefinite article name
// Returns capitalized "A/An <monster>" form.
// TODO: do_name.c:1158 — Amonnam(): capitalized indefinite article name

// cf. do_name.c:1169 — distant_monnam(mon, article, outbuf): distant reference
// Formats a distant/indirect monster reference based on visibility.
// TODO: do_name.c:1169 — distant_monnam(): distant monster reference

// cf. do_name.c:1190 — mon_nam_too(mon, other_mon): relative monster name
// Generates name for monster relative to another monster's perspective.
// TODO: do_name.c:1190 — mon_nam_too(): relative monster name

// cf. do_name.c:1220 — monverbself(mon, monnamtext, verb, othertext): monster phrase
// Constructs phrase with monster, verb, and additional text.
// TODO: do_name.c:1220 — monverbself(): monster verb phrase

// cf. do_name.c:1253 — minimal_monnam(mon, ckloc): minimal monster ID
// Returns minimal monster identification for debugging or compact display.
// TODO: do_name.c:1253 — minimal_monnam(): minimal monster name

// cf. do_name.c:1288 — Mgender(mtmp): monster grammatical gender
// Returns grammatical gender of a monster.
// TODO: do_name.c:1288 — Mgender(): monster gender

// cf. do_name.c:1302 — pmname(pm, mgender): monster type name with gender
// Returns creature type name with gender inflection.
// TODO: do_name.c:1302 — pmname(): gender-inflected type name

// cf. do_name.c:1312 — mon_pmname(mon): monster creature type name
// Returns creature type name for a specific monster instance.
// TODO: do_name.c:1312 — mon_pmname(): instance type name

// cf. do_name.c:1320 — obj_pmname(obj): object creature type name
// Returns creature type name if object represents a creature (statue, etc.).
// TODO: do_name.c:1320 — obj_pmname(): object creature type name

// cf. do_name.c:1388 — rndmonnam(code): random monster name
// Generates a random monster name based on code character.
// TODO: do_name.c:1388 — rndmonnam(): random monster name generation

// cf. do_name.c:1414 — bogon_is_pname(code): bogon proper name check
// Returns TRUE if bogon code character represents a proper name.
// TODO: do_name.c:1414 — bogon_is_pname(): bogon proper name check

// cf. do_name.c:1423 — roguename(void): random rogue name
// Generates a random rogue-themed character name.
// TODO: do_name.c:1423 — roguename(): rogue name generation

// cf. do_name.c:1469 — rndcolor(void): random color name
// Returns a random color name from available color list.
// TODO: do_name.c:1469 — rndcolor(): random color name

// cf. do_name.c:1537 — rndorcname(s): random orc clan name
// Generates a random orc clan name and stores it in buffer.
// TODO: do_name.c:1537 — rndorcname(): orc name generation

// cf. do_name.c:1556 — christen_orc(mtmp, gang, other): name an orc
// Assigns a name to an orc based on gang affiliation.
// TODO: do_name.c:1556 — christen_orc(): orc naming

// cf. do_name.c:1626 — lookup_novel(lookname, idx): find novel by title
// Searches for a novel title matching user input.
// TODO: do_name.c:1626 — lookup_novel(): novel title search
