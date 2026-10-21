#!/usr/bin/env bash
# Read-only check of the live API after a publish: are the newest endpoints there, is the scheduler configured.
# Usage: scripts/check-production.sh [base-url]     (default: https://paneltrenera.pl)
BASE="${1:-https://paneltrenera.pl}"
fail=0
check() { # name, method, path, expected status
  local got; got=$(curl -s -m 20 -o /dev/null -w '%{http_code}' -X "$2" "$BASE$3")
  if [ "$got" = "$4" ]; then printf '  ok    %-44s %s\n' "$1" "$got"; else printf '  FAIL  %-44s got %s, expected %s\n' "$1" "$got" "$4"; fail=1; fi
}
echo "Checking $BASE"
check "health (database answers)"            GET  /api/health                         200
check "notification preferences exist"        GET  /api/notification-preferences       401
check "data export exists"                    GET  /api/account/export                 401
check "client record endpoint exists"         GET  /api/clients/x                      401
check "studio announcements exist"            GET  /api/trainer/gym/announcements      401
check "scheduler is protected by a token"     POST /api/cron/payment-notifications     401
echo
curl -s -m 20 "$BASE/api/health" | head -c 300; echo
[ $fail = 0 ] && echo "All good." || echo "Some checks failed: the API on this address is older than the repository, or the scheduler token is missing."
exit $fail
