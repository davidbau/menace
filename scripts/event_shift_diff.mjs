#!/usr/bin/env node
import { loadAllSessions } from '../test/comparison/session_loader.js';
import { recordGameplaySessionFromInputs } from '../test/comparison/session_recorder.js';

function usage() {
  console.log('Usage: node scripts/event_shift_diff.mjs <session-path> [--lookahead N] [--limit N] [--with-test-move|--no-test-move]');
}

function parseArgs(argv) {
  const out = { sessionPath: null, lookahead: 24, limit: 30, testMoveMode: 'auto' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!out.sessionPath && !a.startsWith('--')) {
      out.sessionPath = a;
      continue;
    }
    if (a === '--lookahead' && i + 1 < argv.length) {
      out.lookahead = Number.parseInt(argv[++i], 10) || out.lookahead;
      continue;
    }
    if (a === '--limit' && i + 1 < argv.length) {
      out.limit = Number.parseInt(argv[++i], 10) || out.limit;
      continue;
    }
    if (a === '--with-test-move') {
      out.testMoveMode = 'on';
      continue;
    }
    if (a === '--no-test-move') {
      out.testMoveMode = 'off';
      continue;
    }
  }
  return out;
}

function isEvent(entry) {
  return typeof entry === 'string' && entry.startsWith('^')
    && !entry.startsWith('^trick[')
    && !entry.startsWith('^mapdump[');
}

function stripContext(entry) {
  if (typeof entry !== 'string') return '';
  const at = entry.indexOf('] @');
  return at >= 0 ? entry.slice(0, at + 1) : entry;
}

function collectEvents(trace) {
  const out = [];
  const pushStep = (step, rng) => {
    for (const e of (rng || [])) {
      if (!isEvent(e)) continue;
      out.push({ step, raw: e, norm: stripContext(e) });
    }
  };
  pushStep(0, trace?.startup?.rng || []);
  const steps = Array.isArray(trace?.steps) ? trace.steps : [];
  for (let i = 0; i < steps.length; i++) pushStep(i + 1, steps[i]?.rng || []);
  return out;
}

function hasTestMoveEvents(events) {
  return events.some((row) => row?.norm?.startsWith('^test_move['));
}

function shouldEnableJsTestMove(mode, cEvents) {
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return hasTestMoveEvents(cEvents);
}

async function withJsTestMove(enabled, fn) {
  const prev = process.env.WEBHACK_EVENT_TEST_MOVE;
  if (enabled) process.env.WEBHACK_EVENT_TEST_MOVE = '1';
  else delete process.env.WEBHACK_EVENT_TEST_MOVE;
  try {
    return await fn();
  } finally {
    if (prev == null) delete process.env.WEBHACK_EVENT_TEST_MOVE;
    else process.env.WEBHACK_EVENT_TEST_MOVE = prev;
  }
}

function alignEvents(js, c, lookahead = 24) {
  let i = 0;
  let j = 0;
  let matched = 0;
  const shifts = [];
  const diffs = [];

  while (i < js.length && j < c.length) {
    if (js[i].norm === c[j].norm) {
      matched++;
      i++;
      j++;
      continue;
    }

    let best = null;
    for (let skip = 1; skip <= lookahead && i + skip < js.length; skip++) {
      if (js[i + skip].norm === c[j].norm) {
        best = { side: 'js', skip };
        break;
      }
    }
    for (let skip = 1; skip <= lookahead && j + skip < c.length; skip++) {
      if (js[i].norm === c[j + skip].norm) {
        if (!best || skip < best.skip) best = { side: 'c', skip };
        break;
      }
    }

    if (!best) {
      diffs.push({ js: js[i], c: c[j] });
      i++;
      j++;
      continue;
    }

    if (best.side === 'js') {
      for (let k = 0; k < best.skip; k++) shifts.push({ type: 'js_extra', event: js[i + k] });
      i += best.skip;
    } else {
      for (let k = 0; k < best.skip; k++) shifts.push({ type: 'c_extra', event: c[j + k] });
      j += best.skip;
    }
  }

  while (i < js.length) shifts.push({ type: 'js_extra', event: js[i++] });
  while (j < c.length) shifts.push({ type: 'c_extra', event: c[j++] });

  return { matched, jsTotal: js.length, cTotal: c.length, shifts, diffs };
}

function printEvent(prefix, row) {
  console.log(`${prefix} step=${String(row.step).padStart(4)} ${row.norm}`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.sessionPath) {
    usage();
    process.exit(2);
  }

  const [session] = loadAllSessions({ sessionPath: args.sessionPath });
  if (!session) {
    console.error('session not found:', args.sessionPath);
    process.exit(2);
  }

  const cEvents = collectEvents(session);
  const enableJsTestMove = shouldEnableJsTestMove(args.testMoveMode, cEvents);
  const replay = await withJsTestMove(enableJsTestMove, async () => (
    await recordGameplaySessionFromInputs(session)
  ));
  const jsEvents = collectEvents(replay);
  const out = alignEvents(jsEvents, cEvents, args.lookahead);

  console.log(`Session: ${session.file}`);
  console.log(`test_move mode=${args.testMoveMode} js_test_move=${enableJsTestMove ? 'on' : 'off'} c_has_test_move=${hasTestMoveEvents(cEvents) ? 'yes' : 'no'}`);
  console.log(`Events JS=${out.jsTotal} C=${out.cTotal} matched(aligned)=${out.matched}`);
  console.log(`Shifts=${out.shifts.length} hardDiffs=${out.diffs.length}`);

  const byType = out.shifts.reduce((m, s) => (m[s.type] = (m[s.type] || 0) + 1, m), {});
  console.log(`Shift breakdown: c_extra=${byType.c_extra || 0} js_extra=${byType.js_extra || 0}`);

  const show = out.shifts.slice(0, args.limit);
  if (show.length) {
    console.log('\nFirst shifts:');
    for (const s of show) {
      printEvent(s.type === 'c_extra' ? ' C+' : 'JS+', s.event);
    }
  }

  if (out.diffs.length) {
    const d = out.diffs[0];
    console.log('\nFirst hard diff:');
    printEvent('JS*', d.js);
    printEvent(' C*', d.c);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
