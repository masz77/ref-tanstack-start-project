#!/usr/bin/env bash
# Live cache-control verification against ALREADY-RUNNING dev servers.
# Starts nothing. Backend expected on :8787, frontend on :3000.
# Prints a PASS/FAIL table; exits 1 if any case FAILs (BLOCKED does not fail the run
# on its own, but is surfaced — a server that is down blocks its cases).
#
# Usage: bash live-check.sh
set -uo pipefail

BE="http://localhost:8787"
FE="http://localhost:3000"
CACHEABLE_BE="public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
CACHEABLE_FE="public, max-age=0, s-maxage=600"
NO_STORE="private, no-store"

fail=0
printf '%-6s %-40s %-8s %s\n' "ID" "URL" "RESULT" "DETAIL"
printf '%s\n' "--------------------------------------------------------------------------------"

# up <base> -> 0 if server responds at all
up() { curl -s -o /dev/null --max-time 5 "$1/" >/dev/null 2>&1; }

# header_value_raw <header-name-lowercase> <curl-args...> -> trimmed value, empty if absent
header_value_raw() {
  local h="$1"; shift
  curl -s -o /dev/null -D - --max-time 10 "$@" 2>/dev/null \
    | tr -d '\r' \
    | awk -v h="$h" 'BEGIN{IGNORECASE=1} tolower($0) ~ "^" h ":" { sub(/^[^:]*:[ \t]*/,""); print; exit }'
}

# header_value <url> <header-name-lowercase> -> prints trimmed value, empty if absent
header_value() { header_value_raw "$2" "$1"; }

row() { # id url result detail
  printf '%-6s %-40s %-8s %s\n' "$1" "$2" "$3" "$4"
  [ "$3" = "FAIL" ] && fail=1
  return 0
}

# check exact cache-control value
check_cc() { # id url expected
  local id="$1" url="$2" expected="$3" got
  got="$(header_value "$url" "cache-control")"
  if [ "$got" = "$expected" ]; then row "$id" "$url" "PASS" "cache-control=$got"
  else row "$id" "$url" "FAIL" "want [$expected] got [${got:-<absent>}]"; fi
}

# Differential absence: target must LACK cache-control AND a cacheable control
# route must HAVE the expected header. Absence alone is not enough — pre-feature the
# whole app lacks caching, so a bare absent-check would falsely pass. Tying it to the
# sibling makes the exclusion meaningful (RED until the feature adds caching elsewhere).
check_cc_absent_diff() { # id target_url control_url control_expected
  local id="$1" url="$2" ctrl="$3" expected="$4" got ctrl_got
  got="$(header_value "$url" "cache-control")"
  ctrl_got="$(header_value "$ctrl" "cache-control")"
  if [ -z "$got" ] && [ "$ctrl_got" = "$expected" ]; then
    row "$id" "$url" "PASS" "absent here; control $ctrl cacheable"
  elif [ -n "$got" ]; then
    row "$id" "$url" "FAIL" "expected absent, got [$got]"
  else
    row "$id" "$url" "FAIL" "absent here but control $ctrl not yet cacheable (got [${ctrl_got:-<absent>}])"
  fi
}

# BE-8 (single case): cache-tag present+non-empty on all cacheable routes AND absent on /health.
check_be8() { # base
  local base="$1" t_root t_doc t_ref t_health detail=""
  t_root="$(header_value "$base/" "cache-tag")"
  t_doc="$(header_value "$base/doc" "cache-tag")"
  t_ref="$(header_value "$base/reference" "cache-tag")"
  t_health="$(header_value "$base/health" "cache-tag")"
  if [ -n "$t_root" ] && [ -n "$t_doc" ] && [ -n "$t_ref" ] && [ -z "$t_health" ]; then
    row "BE-8" "$base/{,doc,reference,health}" "PASS" "tags on cacheable, absent on /health"
  else
    detail="root=[${t_root:-<absent>}] doc=[${t_doc:-<absent>}] ref=[${t_ref:-<absent>}] health=[${t_health:-<absent>}]"
    row "BE-8" "$base/{,doc,reference,health}" "FAIL" "$detail"
  fi
}

# BE-11: a CORS preflight must NOT carry the public shared-cacheable header.
# Differential: also require the plain GET / control to BE cacheable, so absence
# pre-feature (nothing sets public anywhere) reads as FAIL, not a false PASS.
check_be11() { # base
  local base="$1" pre ctrl
  pre="$(header_value_raw "cache-control" -X OPTIONS "$base/" -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET")"
  ctrl="$(header_value "$base/" "cache-control")"
  case "$pre" in
    *public,*) row "BE-11" "$base/ OPTIONS preflight" "FAIL" "preflight leaked public header: [$pre]" ;;
    *)
      case "$ctrl" in
        *public,*) row "BE-11" "$base/ OPTIONS preflight" "PASS" "preflight not public; control GET / is cacheable" ;;
        *) row "BE-11" "$base/ OPTIONS preflight" "FAIL" "preflight not public but control GET / not yet cacheable (got [${ctrl:-<absent>}])" ;;
      esac ;;
  esac
}

# BE-12: an Origin-tainted GET must be private, no-store (never enters shared caches).
check_be12() { # base
  local base="$1" got
  got="$(header_value_raw "cache-control" "$base/" -H "Origin: http://localhost:3000")"
  if [ "$got" = "$NO_STORE" ]; then row "BE-12" "$base/ GET +Origin" "PASS" "cache-control=$got"
  else row "BE-12" "$base/ GET +Origin" "FAIL" "want [$NO_STORE] got [${got:-<absent>}]"; fi
}

blocked() { row "$1" "$2" "BLOCKED" "$3"; }

# ---- Backend ----
if up "$BE"; then
  check_cc        BE-1 "$BE/"            "$CACHEABLE_BE"
  check_cc        BE-2 "$BE/doc"         "$CACHEABLE_BE"
  check_cc        BE-3 "$BE/reference"   "$CACHEABLE_BE"
  check_cc        BE-4 "$BE/health"      "$NO_STORE"
  check_cc        BE-5 "$BE/test"        "$NO_STORE"
  check_cc        BE-6 "$BE/api/session" "$NO_STORE"
  check_cc        BE-7 "$BE/api/auth/ok" "$NO_STORE"
  check_be8       "$BE"
  check_be11      "$BE"
  check_be12      "$BE"
else
  for id in BE-1 BE-2 BE-3 BE-4 BE-5 BE-6 BE-7 BE-8 BE-11 BE-12; do blocked "$id" "$BE" "backend down on :8787"; done
fi

# ---- Frontend ----
if up "$FE"; then
  check_cc        FE-1 "$FE/"            "$CACHEABLE_FE"
  check_cc        FE-2 "$FE/login"       "$CACHEABLE_FE"
  check_cc            FE-3 "$FE/signup"      "$CACHEABLE_FE"
  check_cc_absent_diff FE-4 "$FE/template"     "$FE/" "$CACHEABLE_FE"
  check_cc_absent_diff FE-5 "$FE/health-demo"  "$FE/" "$CACHEABLE_FE"
else
  for id in FE-1 FE-2 FE-3 FE-4 FE-5; do blocked "$id" "$FE" "frontend down on :3000"; done
fi

printf '%s\n' "--------------------------------------------------------------------------------"
if [ "$fail" -eq 0 ]; then echo "RESULT: no FAIL rows"; else echo "RESULT: at least one FAIL"; fi
exit "$fail"
