#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

function parseArgs(argv) {
    const out = {
        session: '',
        timeoutMs: 12000,
        outDir: '',
        top: 25,
        extraEnv: {},
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--session' && argv[i + 1]) {
            out.session = String(argv[++i]);
        } else if (arg.startsWith('--session=')) {
            out.session = arg.slice('--session='.length);
        } else if (arg === '--timeout-ms' && argv[i + 1]) {
            out.timeoutMs = Math.max(1000, parseInt(argv[++i], 10) || out.timeoutMs);
        } else if (arg.startsWith('--timeout-ms=')) {
            out.timeoutMs = Math.max(1000, parseInt(arg.slice('--timeout-ms='.length), 10) || out.timeoutMs);
        } else if (arg === '--out-dir' && argv[i + 1]) {
            out.outDir = String(argv[++i]);
        } else if (arg.startsWith('--out-dir=')) {
            out.outDir = arg.slice('--out-dir='.length);
        } else if (arg === '--top' && argv[i + 1]) {
            out.top = Math.max(5, parseInt(argv[++i], 10) || out.top);
        } else if (arg.startsWith('--top=')) {
            out.top = Math.max(5, parseInt(arg.slice('--top='.length), 10) || out.top);
        } else if (arg === '--env' && argv[i + 1]) {
            const pair = String(argv[++i]);
            const eq = pair.indexOf('=');
            if (eq > 0) out.extraEnv[pair.slice(0, eq)] = pair.slice(eq + 1);
        } else if (arg === '--help' || arg === '-h') {
            out.help = true;
        }
    }
    return out;
}

function usage() {
    console.log('Usage: node scripts/replay_stall_diagnose.mjs --session <name-or-path> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --timeout-ms <n>      Session timeout (default: 12000)');
    console.log('  --out-dir <dir>       Artifact dir (default: tmp/stall-diagnose/<timestamp>)');
    console.log('  --top <n>             Top entries in summary (default: 25)');
    console.log('  --env KEY=VALUE       Extra env var for runner (repeatable)');
}

function timestampDir() {
    const iso = new Date().toISOString().replace(/[:.]/g, '-');
    return join('tmp', 'stall-diagnose', iso);
}

function canonicalSessionArg(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (s.endsWith('.session.json')) return s;
    return `${s}.session.json`;
}

function listCpuProfiles(dir) {
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
        .filter((f) => f.endsWith('.cpuprofile'))
        .map((f) => join(dir, f));
}

function newestFile(paths) {
    if (!paths.length) return null;
    // Node's CPU profile names include timestamp-like suffixes; lexicographic sort is sufficient.
    return paths.slice().sort().at(-1) || null;
}

function frameLabel(node) {
    const cf = node?.callFrame || {};
    const fn = (cf.functionName && cf.functionName.length > 0) ? cf.functionName : '(anonymous)';
    const url = cf.url ? basename(cf.url) : '(native)';
    const line = Number.isInteger(cf.lineNumber) ? (cf.lineNumber + 1) : 0;
    return `${fn} @ ${url}${line > 0 ? `:${line}` : ''}`;
}

function summarizeCpuProfile(profile, topN) {
    const nodes = Array.isArray(profile?.nodes) ? profile.nodes : [];
    const selfRows = [];
    const fileAgg = new Map();
    let totalSelfSamples = 0;

    for (const n of nodes) {
        const hits = Number.isFinite(n?.hitCount) ? n.hitCount : 0;
        if (!hits) continue;
        totalSelfSamples += hits;
        selfRows.push({
            id: n.id,
            hits,
            label: frameLabel(n),
            url: n?.callFrame?.url || '',
        });
        const file = n?.callFrame?.url ? basename(n.callFrame.url) : '(native)';
        fileAgg.set(file, (fileAgg.get(file) || 0) + hits);
    }

    selfRows.sort((a, b) => b.hits - a.hits);
    const topSelf = selfRows.slice(0, topN).map((r) => ({
        ...r,
        pct: totalSelfSamples > 0 ? (100 * r.hits / totalSelfSamples) : 0,
    }));

    const topFiles = [...fileAgg.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([file, hits]) => ({
            file,
            hits,
            pct: totalSelfSamples > 0 ? (100 * hits / totalSelfSamples) : 0,
        }));

    return {
        totalSelfSamples,
        topSelf,
        topFiles,
    };
}

function formatSummary(run, profilePath, summary) {
    const lines = [];
    lines.push(`session: ${run.session}`);
    lines.push(`timeout_ms: ${run.timeoutMs}`);
    lines.push(`exit_code: ${run.exitCode}`);
    lines.push(`profile: ${profilePath || 'none'}`);
    if (run.timeoutLine) lines.push(`timeout_line: ${run.timeoutLine}`);
    lines.push(`total_self_samples: ${summary.totalSelfSamples}`);
    lines.push('');
    lines.push('Top Self Functions:');
    for (const row of summary.topSelf) {
        lines.push(`  ${String(row.hits).padStart(8)}  ${row.pct.toFixed(1).padStart(5)}%  ${row.label}`);
    }
    lines.push('');
    lines.push('Top Files (self sample aggregate):');
    for (const row of summary.topFiles) {
        lines.push(`  ${String(row.hits).padStart(8)}  ${row.pct.toFixed(1).padStart(5)}%  ${row.file}`);
    }
    return lines.join('\n') + '\n';
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help || !args.session) {
        usage();
        process.exit(args.help ? 0 : 2);
    }

    const outDir = resolve(args.outDir || timestampDir());
    mkdirSync(outDir, { recursive: true });

    const sessionArg = canonicalSessionArg(args.session);
    const cmdArgs = [
        '--cpu-prof',
        '--cpu-prof-dir',
        outDir,
        'test/comparison/session_test_runner.js',
        '--verbose',
        `--session-timeout-ms=${args.timeoutMs}`,
        `--sessions=${sessionArg}`,
    ];

    console.log(`[stall-diagnose] running: node ${cmdArgs.join(' ')}`);
    console.log(`[stall-diagnose] artifacts: ${outDir}`);

    const child = spawnSync('node', cmdArgs, {
        encoding: 'utf8',
        env: { ...process.env, ...args.extraEnv },
    });

    const logText = `${child.stdout || ''}${child.stderr || ''}`;
    writeFileSync(join(outDir, 'run.log'), logText, 'utf8');
    process.stdout.write(logText);

    const profiles = listCpuProfiles(outDir);
    const profilePath = newestFile(profiles);
    if (!profilePath) {
        console.error('[stall-diagnose] no .cpuprofile produced');
        process.exit(1);
    }

    const profileJson = JSON.parse(readFileSync(profilePath, 'utf8'));
    const summary = summarizeCpuProfile(profileJson, args.top);

    const timeoutLine = logText.split('\n').find((line) => line.includes('Session timed out after')) || '';
    const runInfo = {
        session: sessionArg,
        timeoutMs: args.timeoutMs,
        exitCode: Number.isInteger(child.status) ? child.status : 1,
        timeoutLine,
    };
    const summaryText = formatSummary(runInfo, profilePath, summary);

    writeFileSync(join(outDir, 'summary.txt'), summaryText, 'utf8');
    writeFileSync(join(outDir, 'summary.json'), JSON.stringify({
        run: runInfo,
        profilePath,
        summary,
    }, null, 2), 'utf8');

    console.log('\n[stall-diagnose] wrote:');
    console.log(`  ${join(outDir, 'run.log')}`);
    console.log(`  ${join(outDir, 'summary.txt')}`);
    console.log(`  ${join(outDir, 'summary.json')}`);
}

main().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
});
