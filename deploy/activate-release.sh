#!/usr/bin/env bash
set -euo pipefail

usage() {
    echo "usage: activate-release.sh <revision> <slug>..." >&2
    exit 2
}

REV="${1:-}"
[ -n "$REV" ] || usage
shift
[ "$#" -gt 0 ] || usage
PROMO_SLUGS=("$@")

[[ "$REV" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "invalid revision: $REV" >&2; exit 2; }
[[ "$REV" != *".."* ]] || { echo "invalid revision: $REV" >&2; exit 2; }
for slug in "${PROMO_SLUGS[@]}"; do
    [[ "$slug" =~ ^[a-z0-9-]+$ ]] || { echo "invalid slug: $slug" >&2; exit 2; }
done

MAIN_RELEASE="/srv/site/releases/${REV}"
PROMO_RELEASES="/srv/www/releases/promo"

test -f "${MAIN_RELEASE}/dist/server/entry.mjs"
test -f "${MAIN_RELEASE}/package.json"
test -d "${MAIN_RELEASE}/node_modules"

for slug in "${PROMO_SLUGS[@]}"; do
    test -f "${PROMO_RELEASES}/${slug}/${REV}/index.html"
done

umask 022
chmod -R a+rX "$MAIN_RELEASE"
for slug in "${PROMO_SLUGS[@]}"; do
    chmod -R a+rX "${PROMO_RELEASES}/${slug}/${REV}"
done

PREV_MAIN="$(readlink -f /srv/site/current 2>/dev/null || true)"
declare -A PREV_PROMO=()
for slug in "${PROMO_SLUGS[@]}"; do
    PREV_PROMO["$slug"]="$(readlink -f "/srv/www/promo/${slug}" 2>/dev/null || true)"
done

atomic_link() {
    local target="$1"
    local link="$2"
    local tmp="${link}.tmp.$$"
    rm -f "$tmp"
    ln -s "$target" "$tmp"
    mv -T "$tmp" "$link"
}

cleanup_releases() {
    local dir="$1"
    find "$dir" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' 2>/dev/null |
        sort -rn |
        tail -n +6 |
        cut -d' ' -f2- |
        xargs -r rm -rf
}

rollback() {
    local status=$?
    if [ "$status" -eq 0 ]; then
        return
    fi
    trap - EXIT
    echo "activation failed, rolling back" >&2
    if [ -n "$PREV_MAIN" ]; then
        atomic_link "$PREV_MAIN" /srv/site/current
    else
        rm -f /srv/site/current
    fi
    for slug in "${PROMO_SLUGS[@]}"; do
        if [ -n "${PREV_PROMO[$slug]}" ]; then
            atomic_link "${PREV_PROMO[$slug]}" "/srv/www/promo/${slug}"
        else
            rm -f "/srv/www/promo/${slug}"
        fi
    done
    sudo /usr/bin/systemctl restart style-logic || true
    sudo /usr/bin/systemctl reload nginx || true
    exit "$status"
}
trap rollback EXIT

atomic_link "$MAIN_RELEASE" /srv/site/current
sudo /usr/bin/systemctl restart style-logic

for slug in "${PROMO_SLUGS[@]}"; do
    atomic_link "${PROMO_RELEASES}/${slug}/${REV}" "/srv/www/promo/${slug}"
done

sudo /usr/sbin/nginx -t
sudo /usr/bin/systemctl reload nginx

for _ in $(seq 1 10); do
    if curl -fsS --max-time 5 -o /dev/null http://127.0.0.1:4321/; then
        break
    fi
    sleep 2
done
curl -fsS --max-time 5 -o /dev/null http://127.0.0.1:4321/

STATUS="$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4321/api/send-lead)"
[ "$STATUS" = "400" ]

cleanup_releases /srv/site/releases || true
for slug in "${PROMO_SLUGS[@]}"; do
    cleanup_releases "${PROMO_RELEASES}/${slug}" || true
done

trap - EXIT
echo "activated ${REV}"
