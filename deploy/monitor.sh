#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/site/site.env}"
STATE_DIR="${STATE_DIR:-/var/lib/style-logic-monitor}"
STATE_FILE="${STATE_DIR}/state"
BASE_URL="${BASE_URL:-https://style-logic.ru}"

if [ ! -r "$ENV_FILE" ]; then
    echo "monitor: cannot read ${ENV_FILE}" >&2
    exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${TELEGRAM_BOT_TOKEN:?monitor: TELEGRAM_BOT_TOKEN is not set}"
: "${TELEGRAM_CHAT_ID:?monitor: TELEGRAM_CHAT_ID is not set}"

mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"

failures=()

check_status() {
    local name="$1"
    local url="$2"
    local expected="$3"
    local code
    code=$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' "$url" || true)
    if [ "$code" != "$expected" ]; then
        failures+=("${name}: HTTP ${code:-000}")
    fi
}

check_status "main" "${BASE_URL}/" "200"
check_status "promo" "${BASE_URL}/promo/pekarnya/" "200"

api_code=$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' \
    -X POST "${BASE_URL}/api/send-lead" \
    -H 'Content-Type: application/json' \
    -d '{}' || true)
if [ "$api_code" != "400" ]; then
    failures+=("api: HTTP ${api_code:-000}")
fi

if [ "${#failures[@]}" -eq 0 ]; then
    printf 'ok\n' > "$STATE_FILE"
    exit 0
fi

message="style-logic monitor: ${failures[*]}"
echo "$message" >&2

if [ "$(cat "$STATE_FILE" 2>/dev/null || true)" != "fail" ]; then
    response=$(curl -sS --max-time 10 -X POST \
        "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
        --data-urlencode "text=${message}" || true)
    if printf '%s' "$response" | grep -q '"ok":true'; then
        printf 'fail\n' > "$STATE_FILE"
    else
        echo "monitor: telegram alert failed" >&2
    fi
fi

exit 1
