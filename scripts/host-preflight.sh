#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\n' '=== NEXORA CLOUD HOST PREFLIGHT ==='
printf '\n-- Operating system --\n'
cat /etc/os-release 2>/dev/null | sed -n '1,8p' || true
printf '\n-- CPU --\n'
getconf _NPROCESSORS_ONLN 2>/dev/null || nproc 2>/dev/null || true
printf '\n-- RAM --\n'
free -h 2>/dev/null || true
printf '\n-- Storage --\n'
df -h / 2>/dev/null || true
printf '\n-- Virtualization / architecture --\n'
uname -m 2>/dev/null || true
printf '\n-- Runtime tools --\n'
for bin in docker docker-compose git node npm; do
  if command -v "$bin" >/dev/null 2>&1; then printf '%-14s %s\n' "$bin" "$(command -v "$bin")"; else printf '%-14s MISSING\n' "$bin"; fi
done
printf '\nThis is a read-only inventory. It does not install or change anything.\n'
