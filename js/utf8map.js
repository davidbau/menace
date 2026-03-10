// Translator target module placeholder for utf8map.c exports.


// Autotranslated from utf8map.c:147
export function add_custom_urep_entry(customization_name, glyphidx, utf32ch, utf8str, which_set, player) {
  let gdc =  gs.sym_customizations[which_set][custom_ureps];
  let details, newdetails = 0;
  if (!gdc.details) {
    gdc.customization_name = customization_name;
    gdc.custtype = custom_ureps;
    gdc.details = 0;
    gdc.details_end = 0;
  }
  details = find_matching_customization(customization_name, custom_ureps, which_set);
  if (details) {
    while (details) {
      if (details.content.urep.glyphidx === glyphidx) {
        if (utf32ch) {
          details.content.urep.player.utf8str = utf8str;
          details.content.urep.player.utf32ch = utf32ch;
        }
        else {
          details.content.urep.player.utf8str =  0;
          details.content.urep.player.utf32ch = 0;
        }
        return 1;
      }
      details = details.next;
    }
  }
  newdetails = { content: { urep: { glyphidx: glyphidx, player: {} } }, next: null };
  // glyphidx already set above
  if (utf8str && utf8str) {
    newdetails.content.urep.player.utf8str = utf8str;
  }
  else { newdetails.content.urep.player.utf8str =  0; }
  newdetails.content.urep.player.utf32ch = utf32ch;
  newdetails.next =  0;
  if (gdc.details === null) { gdc.details = newdetails; }
  else { gdc.details_end.next = newdetails; }
  gdc.details_end = newdetails;
  gdc.count++;
  return 1;
}
