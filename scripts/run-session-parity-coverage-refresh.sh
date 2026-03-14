#!/bin/bash
# Refresh parity-session coverage artifacts in one pass:
# 1) run session-parity coverage (writes coverage/*)
# 2) update docs/metrics/session_parity_coverage_latest.json
# 3) emit diff vs previous snapshot (if present)
#
# Usage:
#   bash scripts/run-session-parity-coverage-refresh.sh [args passed to run-session-parity-coverage.sh]

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

LATEST="docs/metrics/session_parity_coverage_latest.json"
TMP_BASE=""
cleanup() {
  if [[ -n "${TMP_BASE}" && -f "${TMP_BASE}" ]]; then
    rm -f "${TMP_BASE}"
  fi
}
trap cleanup EXIT

if [[ -f "${LATEST}" ]]; then
  TMP_BASE="$(mktemp)"
  cp "${LATEST}" "${TMP_BASE}"
fi

echo "=== Step 1: parity-session coverage run ==="
coverage_status=0
set +e
bash scripts/run-session-parity-coverage.sh "$@"
coverage_status=$?
set -e

echo ""
echo "=== Step 2: update latest snapshot ==="
node scripts/session-parity-coverage-snapshot.mjs

echo ""
echo "=== Step 3: actionable lowest-coverage report ==="
node scripts/session-parity-coverage-report.mjs

if [[ -n "${TMP_BASE}" && -f "${TMP_BASE}" ]]; then
  echo ""
  echo "=== Step 4: diff vs previous snapshot ==="
  node scripts/session-parity-coverage-diff.mjs --base "${TMP_BASE}" --head "${LATEST}" | tee coverage/session-parity-diff.txt
  echo ""
  echo "Wrote diff report: coverage/session-parity-diff.txt"
fi

echo ""
echo "Parity-session coverage refresh complete."

if [[ $coverage_status -ne 0 ]]; then
  echo "Parity-session coverage refresh completed with failing sessions (exit ${coverage_status}); artifacts and snapshots were still updated." >&2
fi

exit $coverage_status
