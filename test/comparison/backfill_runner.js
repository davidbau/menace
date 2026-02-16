// Compatibility shim: backfill runner has moved to session_test_runner.js CLI.
import { runSessionCli } from './session_test_runner.js';

runSessionCli().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
