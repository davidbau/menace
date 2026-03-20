import fs from 'fs';
import path from 'path';

// Known NetHack functions that should always be imported, never local
const KNOWN_FUNCTIONS = new Set([
  // pline.js
  'pline', 'You', 'Your', 'You_feel', 'You_hear', 'You_see', 'You_cant',
  'pline_The', 'There', 'Norep', 'impossible', 'verbalize', 'livelog_printf',
  'set_msg_xy', 'pline_mon',
  // display.js
  'canspotmon', 'sensemon', 'newsym', 'flush_screen', 'glyph_at',
  'see_with_infrared', 'canSpotMonsterForMap',
  // vision.js
  'cansee', 'couldsee',
  // hacklib.js
  'distu', 'dist2', 'distmin', 'sgn', 's_suffix', 'upstart',
  // mon.js
  'wakeup', 'wake_nearto', 'wake_nearby', 'setmangry', 'mondead',
  'mongone', 'xkilled', 'seemimic', 'angry_guards', 'onscary',
  'corpse_chance', 'helpless',
  // monmove.js
  'monflee',
  // mondata.js
  'canseemon', 'DEADMONSTER', 'M_AP_TYPE', 'ismnum',
  'bigmonst', 'verysmall', 'nonliving', 'nohands', 'haseyes',
  'is_rider', 'is_flyer', 'is_swimmer', 'is_floater',
  'flesh_petrifies', 'touch_petrifies', 'poly_when_stoned',
  // invent.js
  'carried', 'useup', 'useupf', 'delobj', 'stackobj', 'freeinv', 'addinv',
  'g_at', 'sobj_at',
  // objnam.js
  'makeplural', 'an', 'the', 'doname', 'xname', 'corpse_xname',
  'singular', 'obj_is_pname', 'Has_contents',
  // mkobj.js
  'mksobj', 'mkobj', 'place_object', 'weight', 'obj_extract_self',
  // do_name.js
  'mon_nam', 'Monnam', 'x_monnam', 'y_monnam', 'pmname', 'Mgender',
  // hack.js
  'u_at', 'nomul', 'near_capacity', 'in_town',
  // shk.js
  'costly_spot', 'obfree',
  // trap.js
  'm_at', 't_at',
  // dungeon.js
  'In_endgame', 'In_hell', 'In_mines', 'In_sokoban', 'Is_astralevel',
  'Is_rogue_level', 'Is_waterlevel', 'level_difficulty', 'surface', 'deltrap',
  // rng.js
  'rn2', 'rnd', 'rn1', 'd',
  // attrib.js
  'acurr', 'exercise',
  // polyself.js
  'body_part', 'rehumanize',
  // role.js
  'Role_if',
  // zap.js
  'resist',
  // artifact.js
  'touch_artifact',
  // steal.js
  'mpickobj',
  // worn.js
  'find_mac', 'which_armor',
  // makemon.js
  'makemon', 'mkclass',
  // teleport.js
  'rloc', 'goodpos',
  // do.js
  'set_wounded_legs',
  // eat.js
  'morehungry',
  // exper.js
  'losexp',
  // calendar.js
  'night',
  // steed.js
  'place_monster',
]);

const dir = 'js';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const lines = content.split('\n');

  // Find all imported names
  const imports = new Set();
  const importRe = /import\s*\{([^}]+)\}/g;
  let m;
  while ((m = importRe.exec(content)) !== null) {
    m[1].split(',').forEach(s => {
      const trimmed = s.trim();
      const asMatch = trimmed.match(/^(\w+)\s+as\s+(\w+)$/);
      if (asMatch) {
        imports.add(asMatch[2]);
      } else {
        const name = trimmed.replace(/\s+as\s+\w+$/, '').trim();
        if (name && /^\w+$/.test(name)) imports.add(name);
      }
    });
  }

  // Find all local definitions
  const localDefs = new Set();
  const funcRe = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
  while ((m = funcRe.exec(content)) !== null) localDefs.add(m[1]);
  const constRe = /(?:const|let|var)\s+(\w+)\s*=/g;
  while ((m = constRe.exec(content)) !== null) localDefs.add(m[1]);

  // Find calls to KNOWN_FUNCTIONS that are missing
  const missing = new Map();
  const callRe = /\b([A-Za-z_$]\w*)\s*\(/g;
  while ((m = callRe.exec(content)) !== null) {
    const name = m[1];
    if (!KNOWN_FUNCTIONS.has(name)) continue;
    if (imports.has(name) || localDefs.has(name)) continue;
    // Skip method calls
    if (m.index > 0 && content[m.index - 1] === '.') continue;
    // Skip comments
    const lineStart = content.lastIndexOf('\n', m.index) + 1;
    const lineContent = content.substring(lineStart, content.indexOf('\n', m.index));
    if (lineContent.trimStart().startsWith('//') || lineContent.trimStart().startsWith('*')) continue;
    // Skip strings (rough: check if inside quotes on same line)
    const beforeOnLine = content.substring(lineStart, m.index);
    const singleQuotes = (beforeOnLine.match(/'/g) || []).length;
    const doubleQuotes = (beforeOnLine.match(/"/g) || []).length;
    const backticks = (beforeOnLine.match(/`/g) || []).length;
    if (singleQuotes % 2 === 1 || doubleQuotes % 2 === 1 || backticks % 2 === 1) continue;

    if (!missing.has(name)) missing.set(name, []);
    const lineNum = content.substring(0, m.index).split('\n').length;
    missing.get(name).push(lineNum);
  }

  if (missing.size > 0) {
    for (const [name, lineNums] of missing) {
      console.log(`${file}: ${name} (lines: ${lineNums.slice(0, 3).join(',')}${lineNums.length > 3 ? '...' : ''})`);
    }
  }
}
