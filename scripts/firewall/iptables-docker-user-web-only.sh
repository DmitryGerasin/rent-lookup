#!/usr/bin/env bash
# Restrict traffic that reaches Docker-published ports: only new inbound TCP 80/443
# from the public interface may reach containers; other inbound container traffic is dropped.
# Established connections are allowed.
#
# Run after the Docker *daemon* has started and created iptables rules (e.g. `docker compose up -d`
# once). This script does NOT create DOCKER-USER: if the chain is missing, it exits with an error.
#
# Requires: iptables (IPv4). For IPv6, mirror rules with ip6tables if you publish ports on v6.
set -euo pipefail

if [[ "${EUID:-}" -ne 0 ]]; then
   echo "Run as root: sudo $0" >&2
   exit 1
fi

PUB_IF="$(ip route show default | awk '/default/ {print $5; exit}')"
if [[ -z "${PUB_IF}" ]]; then
   echo "Could not detect default route interface; set PUB_IF manually and re-run." >&2
   exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
   echo "docker: command not found. Install Docker, start the daemon, then re-run this script." >&2
   exit 1
fi

if ! docker info >/dev/null 2>&1; then
   echo "Docker daemon is not reachable (docker info failed). Start Docker, then re-run this script." >&2
   exit 1
fi

if ! iptables -S DOCKER-USER >/dev/null 2>&1; then
   echo "iptables chain DOCKER-USER does not exist. The daemon usually creates it on startup." >&2
   echo "Try: sudo systemctl start docker  then  docker run --rm hello-world  then re-run this script." >&2
   exit 1
fi

iptables -F DOCKER-USER

# Let established connections continue.
iptables -A DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN

# Allow inbound TCP 80/443 from the public interface.
iptables -A DOCKER-USER -i "${PUB_IF}" -p tcp -m multiport --dports 80,443 -j RETURN

# Drop other new inbound traffic on the public interface headed for containers.
iptables -A DOCKER-USER -i "${PUB_IF}" -j DROP

# Fall through to the rest of the FORWARD path (Docker’s own chains).
iptables -A DOCKER-USER -j RETURN

echo "DOCKER-USER rules applied (public interface: ${PUB_IF})."
echo "Verify: sudo iptables -L DOCKER-USER -n -v"
