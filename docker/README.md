# Docker deployment (RealEstate)

This folder holds configuration that is bind-mounted into the **MySQL**, **nginx**, and **certbot webroot** paths used by `docker-compose.yml` at the repository root.

## Layout


| Path                          | Mounted in container as / Purpose                                |
| ----------------------------- | ---------------------------------------------------------------- |
| `mysql/conf.d/realestate.cnf` | `/etc/mysql/conf.d/realestate.cnf`                               |
| `mysql/02-app-user.sh`        | `/docker-entrypoint-initdb.d/02-app-user.sh` (MySQL init script) |
| `mysql/examples/`             | Reference only (not mounted)                                     |
| `nginx/nginx.conf`            | `/etc/nginx/nginx.conf`                                          |
| `nginx/vhost/realestate.in`   | Mounted as `/etc/nginx/realestate.in`; `sed` replaces `@DOMAIN@` / `@APP_PORT@` from compose (`HOSTNAME`, `NODE_PORT`) into `/etc/nginx/conf.d/realestate.conf` before nginx starts |
| `nginx/sites-enabled/*.conf`  | `/etc/nginx/sites-enabled/` (e.g. `reject-ip-requests.conf`; no domain-specific files here) |
| `nginx/snippets/*.conf`       | `/etc/nginx/snippets/`                                           |
| `nginx/nginx-errors/`         | `/var/www/nginx-errors/` (custom 50x pages)                      |
| `certbot/www/`                | `/var/www/certbot/` (Let's Encrypt HTTP-01 challenge webroot)    |
| `env.example`                 | Copy to repo root as `.env` (reference only, not mounted)        |
| `../scripts/firewall/*.sh`    | Optional production host firewall (UFW + `DOCKER-USER`); see below |


Nginx uses the **Alpine** official image (`nginx:1.27-alpine`): `user nginx`, no `headers-more` module, and no Debian `modules-enabled` tree. The main config in this repo is written for that image.

---

## 1) First-time setup on a fresh server

### Prerequisites

- Docker Engine and Docker Compose v2 (`docker compose`).
- DNS **A** (and **AAAA** if you use IPv6) records for your public hostname(s) pointing at this server.
- Ports **80** and **443** open to the internet (for Let’s Encrypt HTTP-01 and HTTPS).

### Step 0 — Host firewall (production, Ubuntu/Debian with UFW)

Run **before** you rely on this machine being exposed, and **from a session you know keeps SSH working** (console or correct allowlist). Wrong SSH rules can lock you out.

From the repo root:

```bash
chmod +x scripts/firewall/ufw-docker-production.sh scripts/firewall/iptables-docker-user-web-only.sh
```

**UFW** — deny inbound by default, allow SSH only from your admin IPs.

   Edit `DEFAULT_SSH_IPS` in `scripts/firewall/ufw-docker-production.sh`, or pass addresses in the environment (preserved with `sudo -E`):

   ```bash
   export SSH_ALLOW_IPS="YOUR.IP.V4.HERE YOUR.OTHER.IP.HERE"
   sudo -E ./scripts/firewall/ufw-docker-production.sh
   ```

   The script uses `set -euo pipefail`: any failing `ufw` command stops the rest.

### Step 1 — Clone and environment

```bash
git clone <your-repo-url> RealEstate
cd RealEstate
cp docker/env.example .env
```

Edit `.env`: set strong secrets (`MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, session/CSRF keys, API keys, etc.). 
```bash
openssl rand -hex 16 | pbcopy
```
Set **`HOSTNAME`** to the public FQDN (no `https://`; used by the Node app for `PUBLIC_BASE_URL` and by nginx for `server_name` and `/etc/letsencrypt/live/$HOSTNAME/`).  
Set **`NODE_PORT`** to the port the app listens on inside the stack (default `3000`); nginx’s upstream uses the same value.  
Ensure **`NODE_ENV=production`** for a public deployment.

### Step 2 — Nginx / TLS paths

You do **not** commit a per-domain vhost: `docker/nginx/vhost/realestate.in` is generic; at container start, `docker-compose` passes `HOSTNAME` and `NODE_PORT` into `sed`, which writes `/etc/nginx/conf.d/realestate.conf`.

Certbot on the host must issue a certificate for that same **`HOSTNAME`** so paths match:

- TLS files: `/etc/letsencrypt/live/<HOSTNAME>/` (bind-mounted read-only).
- ACME webroot: `/var/www/certbot` (mapped from `docker/certbot/www` on the host).

### Step 3 — Let’s Encrypt (before nginx can load TLS)

Your vhost expects certificate files under `/etc/letsencrypt/` on the host. On a **new** machine those paths do not exist until certbot runs.

**Option A — Standalone certbot (simplest when nothing listens on 80 yet)**

Stop anything using ports 80/443, then:

```bash
cd ~
sudo apt install snapd
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot certonly --standalone -d your.domain.example -d www.your.domain.example
```

**Option B — Webroot (nginx will serve `/.well-known/acme-challenge/` from `docker/certbot/www`)**

1. Create the webroot and ensure nginx can read it:
  ```bash
   mkdir -p docker/certbot/www
  ```
2. Temporarily bring up **only** nginx (or a minimal HTTP server) so port 80 answers for the challenge — or run certbot on the host with `--webroot -w /full/path/to/RealEstate/docker/certbot/www`.
3. After certificates exist, ensure the host has:
  ```bash
   sudo ls /etc/letsencrypt/live/your.domain.example/
  ```

Certbot’s `**options-ssl-nginx.conf**` and `**ssl-dhparams.pem**` are normally created by certbot under `/etc/letsencrypt/`; your site config includes them. If a fresh certbot install omitted them, run `sudo certbot --nginx` once on the host or install the recommended snippet files per [Certbot nginx docs](https://eff-certbot.readthedocs.io/).

### Step 4 — Build and start the stack

#### 4.1 Installing docker
Update your existing list of packages:
```bash
sudo apt update
```

Install a few prerequisite packages which let `apt` use packages over HTTPS:
```bash
sudo apt install ca-certificates curl gnupg
```

Add the GPG key for the official Docker repository to your system:
```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

Add the Docker repository to APT sources:
```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Update your existing list of packages again for the addition to be recognized:
```bash
sudo apt update
```

Make sure you are about to install from the Docker repo instead of the default Ubuntu repo:
```bash
apt-cache policy docker-ce

# You’ll see output like this, although the version number for Docker may be different:

docker-ce:
  Installed: (none)
  Candidate: 5:20.10.14~3-0~ubuntu-jammy
  Version table:
     5:20.10.14~3-0~ubuntu-jammy 500
        500 https://download.docker.com/linux/ubuntu jammy/stable amd64 Packages
     5:20.10.13~3-0~ubuntu-jammy 500
        500 https://download.docker.com/linux/ubuntu jammy/stable amd64 Packages
```

Install docker:
```bash
sudo apt install docker-ce
```

To avoid typing sudo whenever you run the docker command, add your username to the docker group:
```bash
sudo usermod -aG docker ${USER}
su - ${USER}
```

#### 4.2. Build
From the **repository root** (where `docker-compose.yml` lives):

```bash
docker compose build --no-cache
docker compose up -d
```

Check containers:

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f nginx
```

#### 4.3. iptables
**Docker `DOCKER-USER`** — after the **Docker daemon** is running and has created the **`DOCKER-USER`** iptables chain (normally on daemon start; `docker compose up -d` is enough to confirm). The script **exits with an error** if `docker info` fails or the chain is missing, so it will not silently add rules before Docker has initialized networking.

   It restricts what reaches published container ports: only new inbound TCP **80** and **443** on the default-route interface are allowed through to Docker; other inbound traffic to containers from that interface is dropped.

   ```bash
   sudo ./scripts/firewall/iptables-docker-user-web-only.sh
   ```

   Re-run this script after reboot if your setup does not persist `iptables` rules (consider `iptables-persistent`, `netfilter-persistent`, or a systemd oneshot).

If you use **IPv6** for public web, add matching rules (UFW IPv6 and/or `ip6tables` on `DOCKER-USER`) yourself; the iptables script is **IPv4-only**.

### Step 5 — MySQL initialization (first run only)

On the **first** start with an empty `mysql_data` volume, the image runs:

1. `config/mysql/schema.sql`
2. `docker/mysql/02-app-user.sh` (creates `app` and grants on `_User`)

If you need to change schema or grants **after** data already exists, apply migrations or SQL manually; re-creating the volume wipes the database:

```bash
docker compose down -v   # removes the mysql_data volume — destructive
docker compose up -d
```

To find the exact volume name if you removed the stack without `-v`:

```bash
docker volume ls
```

---

## 2) Day-to-day maintenance and common commands

### Lifecycle

```bash
docker compose up -d              # start in background
docker compose stop               # stop without removing containers
docker compose down             # stop and remove containers (volumes kept)
docker compose down -v          # also remove named volumes (deletes DB data)
docker compose restart nginx app
```

### Logs and debugging

```bash
docker compose logs -f --tail=200 nginx
docker compose logs -f --tail=200 app
docker compose logs -f --tail=200 mysql
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
```

### App updates (new code)

```bash
git pull
docker compose build app
docker compose up -d app
```

If you change only nginx or static site configs:

```bash
docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload
```

### MySQL shell (from host)

```bash
docker compose exec mysql mysql -u root -p
# or app user:
docker compose exec mysql mysql -u app -p realestate
```

### Certificate renewal

Renewal is usually handled on the **host** (certbot timer/cron), not inside the app containers. Typical command:

```bash
sudo certbot renew --dry-run    # test
sudo certbot renew
```

After renewal, reload nginx so it picks up new files (if certbot hook does not already):

```bash
docker compose exec nginx nginx -s reload
```

If you use **webroot** renewal, keep port 80 reachable and the `docker/certbot/www` → `/var/www/certbot` mapping in place for the challenge.

### Security notes

- Never commit `.env` or real passwords.
- Restrict `MYSQL_ROOT_PASSWORD` to admin use; the app uses the `app` user from init scripts.
- Review `docker/nginx/sites-enabled/reject-ip-requests.conf` — it drops direct IP access on 80/443.

---

## Troubleshooting


| Symptom                     | Things to check                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| nginx exits immediately     | `docker compose logs nginx`; run `nginx -t` in container; host `/etc/letsencrypt` paths must exist and match `ssl_certificate` lines. |
| 502 from nginx              | `docker compose logs app`; ensure `app` service is healthy and `upstream` points to `app:3000`.                                       |
| App cannot connect to MySQL | `MYSQL_HOST=mysql` in compose; DB user/password; `realestate.cnf` must keep `bind-address = 0.0.0.0` for container networking.        |
| Certbot challenge fails     | `docker/certbot/www` writable; vhost `location ^~ /.well-known/acme-challenge/`; DNS points to this server; port 80 open.             |


