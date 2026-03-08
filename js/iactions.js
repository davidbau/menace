// iactions.js -- Item actions menu (context menu for inventory items)
// cf. iactions.c — item_naming_classification, item_reading_classification,
//                  ia_addmenu, itemactions_pushkeys, itemactions
//
// iactions.c provides the item actions context menu:
//   itemactions(otmp): displays an interactive menu of possible actions
//     for an inventory item and executes the selected action.
//   itemactions_pushkeys(): translates an action code into queued key presses.
//
// JS implementations:
//   (none yet — item actions menu not yet ported)

// cf. iactions.c:46 [static] — item_naming_classification(obj, onamebuf, ocallbuf): item naming menu text
// Constructs menu text for naming or calling an individual item and its type,
// based on whether names already exist.
// TODO: iactions.c:46 — item_naming_classification(): item name menu text

import { objectData, SCROLL_CLASS, SPBOOK_CLASS, FORTUNE_COOKIE,
         T_SHIRT, ALCHEMY_SMOCK, HAWAIIAN_SHIRT,
         SCR_BLANK_PAPER, SPE_NOVEL, SPE_BLANK_PAPER, SPE_BOOK_OF_THE_DEAD } from './objects.js';

// cf. iactions.c:85 [static] — item_reading_classification(obj, outbuf): item reading menu text
// Generates appropriate menu text for reading an item based on its type
// (scrolls, spellbooks, fortune cookies, etc.).
// TODO: iactions.c:85 — item_reading_classification(): item reading menu text

// cf. iactions.c:126 [static] — ia_addmenu(win, act, let, txt): add item action to menu
// Adds a single menu item to the item actions menu with an action code and letter selector.
// TODO: iactions.c:126 — ia_addmenu(): item action menu entry

// cf. iactions.c:139 [static] — itemactions_pushkeys(otmp, act): translate action to key presses
// Translates an item action code into the appropriate command sequence
// and queued key presses for execution.
// TODO: iactions.c:139 — itemactions_pushkeys(): item action key translation

// cf. iactions.c:277 — itemactions(otmp): item actions context menu
// Displays an interactive menu of possible actions for a given inventory item
// and executes the selected action.
// TODO: iactions.c:277 — itemactions(): item actions menu display and execution

// Autotranslated from iactions.c:85
export function item_reading_classification(obj, outbuf) {
  let otyp = obj.otyp, res = IA_READ_OBJ;
   outbuf = '\x00';
  if (otyp === FORTUNE_COOKIE) {
    outbuf = "Read the message inside this cookie";
  }
  else if (otyp === T_SHIRT) { outbuf = "Read the slogan on the shirt"; }
  else if (otyp === ALCHEMY_SMOCK) { outbuf = "Read the slogan on the apron"; }
  else if (otyp === HAWAIIAN_SHIRT) {
    outbuf = "Look at the pattern on the shirt";
  }
  else if (obj.oclass === SCROLL_CLASS) {
    let magic = ((obj.dknown    && (otyp !== SCR_BLANK_PAPER || !objectData[otyp].oc_name_known)) ? " to activate its magic" : "");
    outbuf = `Read this scroll${magic}`;
  }
  else if (obj.oclass === SPBOOK_CLASS) {
    let novel = (otyp === SPE_NOVEL), blank = (otyp === SPE_BLANK_PAPER && objectData[otyp].oc_name_known), tome = (otyp === SPE_BOOK_OF_THE_DEAD && objectData[otyp].oc_name_known);
    outbuf = `${(novel || blank) ? "Read" : tome ? "Examine" : "Study"} this ${novel ? simpleonames(obj)   : tome ? "tome" : "spellbook"}`;
  }
  else { res = IA_NONE; }
  return res;
}

// Autotranslated from iactions.c:126
export function ia_addmenu(win, act, let_, txt) {
  let any, clr = NO_COLOR;
  any = { a_int: 0 };
  any.a_int = act;
  add_menu(win, nul_glyphinfo, any, let_, 0, ATR_NONE, clr, txt, MENU_ITEMFLAGS_NONE);
}
