#!/usr/bin/env bash
# Configure UFW for a Docker host: SSH only from chosen IPs, HTTP/HTTPS public, else deny inbound.
#
# Usage (recommended):
#   export SSH_ALLOW_IPS="203.0.113.10 198.51.100.20"
#   sudo -E ./ufw-docker-production.sh
#
# Or edit DEFAULT_SSH_IPS below. Example placeholders (1.1.1.1 / 2.2.2.2) are refused unless you set
#   ALLOW_UFW_PLACEHOLDER_SSH=1
set -euo pipefail

DEFAULT_SSH_IPS=(
   "1.1.1.1"
   "2.2.2.2"
)

if [[ "${EUID:-}" -ne 0 ]]; then
   echo "Run as root (this script uses ufw): sudo $0" >&2
   exit 1
fi

if [[ -n "${SSH_ALLOW_IPS:-}" ]]; then
   read -r -a ssh_ips <<< "${SSH_ALLOW_IPS}"
else
   ssh_ips=("${DEFAULT_SSH_IPS[@]}")
   if [[ "${ALLOW_UFW_PLACEHOLDER_SSH:-0}" != "1" ]] && [[ "${ssh_ips[*]}" == "1.1.1.1 2.2.2.2" ]]; then
      echo "Refusing to enable UFW with example IPs in DEFAULT_SSH_IPS." >&2
      echo "  Edit DEFAULT_SSH_IPS, or export SSH_ALLOW_IPS='your.ip.here ...', or set ALLOW_UFW_PLACEHOLDER_SSH=1." >&2
      exit 1
   fi
fi

ufw --force disable
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

for ip in "${ssh_ips[@]}"; do
   [[ -z "${ip}" ]] && continue
   ufw allow from "${ip}" to any port 22 proto tcp comment "SSH ${ip}"
done

# ufw allow 80/tcp
# ufw allow 443/tcp
ufw --force enable
ufw status verbose
