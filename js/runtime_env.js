// runtime_env.js -- runtime-safe environment access helpers

function processEnv() {
    return (typeof process !== 'undefined' && process?.env) ? process.env : null;
}

export function getEnv(name, fallback = undefined) {
    const env = processEnv();
    if (!env) return fallback;
    const value = env[name];
    return value === undefined ? fallback : value;
}

export function envFlag(name) {
    return getEnv(name) === '1';
}

export function hasEnv(name) {
    const value = getEnv(name);
    return value !== undefined && value !== null && value !== '';
}

