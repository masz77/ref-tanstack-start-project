#!/usr/bin/env bash
# Static file assertions for BE-9, BE-10, FE-6. Exit 1 on any FAIL.
# Run from anywhere; resolves the repo root from this script's location.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../../.." && pwd)"   # tests/ -> response-caching -> dev-verification -> tmp -> repo root
BE_WRANGLER="$ROOT/apps/backend/wrangler.jsonc"
FE_WRANGLER="$ROOT/apps/frontend/wrangler.jsonc"
BE_SRC="$ROOT/apps/backend/src"

fail=0
printf '%-6s %-10s %s\n' "ID" "RESULT" "DETAIL"
printf '%s\n' "----------------------------------------------------------------------"
row() { printf '%-6s %-10s %s\n' "$1" "$2" "$3"; [ "$2" = "FAIL" ] && fail=1; return 0; }

# strip // line comments so JSONC parses as text; returns file body with comments removed
strip_comments() { perl -pe 's{//.*$}{}' "$1" 2>/dev/null; }

# has_cache_block <file> : true if a "cache" object with "enabled": true exists
has_cache_block() {
  strip_comments "$1" | perl -0777 -ne 'exit(!(/"cache"\s*:\s*\{[^}]*"enabled"\s*:\s*true/s))'
}

# Compat-date floor dropped per Revision log R2 (no minimum compat date for Workers Cache).
check_wrangler() { # id file
  local id="$1" file="$2"
  if [ ! -f "$file" ]; then row "$id" "FAIL" "missing $file"; return; fi
  if has_cache_block "$file"; then
    row "$id" "PASS" '"cache": { "enabled": true } block present'
  else
    row "$id" "FAIL" 'no {"cache":{"enabled":true}} block'
  fi
}

# BE-9 backend wrangler
check_wrangler BE-9 "$BE_WRANGLER"

# BE-10 central toggle constant exported anywhere in backend src
if grep -rEq 'export[[:space:]]+const[[:space:]]+CACHE_ENABLED' "$BE_SRC" 2>/dev/null; then
  loc="$(grep -rElE 'export[[:space:]]+const[[:space:]]+CACHE_ENABLED' "$BE_SRC" 2>/dev/null | head -1)"
  row "BE-10" "PASS" "export const CACHE_ENABLED found: ${loc#$ROOT/}"
else
  row "BE-10" "FAIL" "no 'export const CACHE_ENABLED' in apps/backend/src"
fi

# FE-6 frontend wrangler
check_wrangler FE-6 "$FE_WRANGLER"

printf '%s\n' "----------------------------------------------------------------------"
if [ "$fail" -eq 0 ]; then echo "RESULT: no FAIL rows"; else echo "RESULT: at least one FAIL"; fi
exit "$fail"
