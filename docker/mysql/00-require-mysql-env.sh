#!/bin/sh
# Runs before other /docker-entrypoint-initdb.d files (fresh datadir only).
# Failing here aborts container startup so you fix .env before a half-initialized DB appears.
set -eu

err() {
   echo "mysql init: $*" >&2
   exit 1
}

if [ -z "${MYSQL_ROOT_PASSWORD:-}" ]; then
   err "MYSQL_ROOT_PASSWORD is empty. Set a strong password in .env (see docker/env.example). Empty values yield insecure root and broken tooling."
fi

if [ -z "${MYSQL_USER:-}" ]; then
   err "MYSQL_USER is empty. Set it in .env (e.g. real-estate-app)."
fi

if [ -z "${MYSQL_PASSWORD:-}" ]; then
   err "MYSQL_PASSWORD is empty. Set an app DB password in .env."
fi

if [ "${MYSQL_DATABASE:-}" != "realestate" ]; then
   err "MYSQL_DATABASE must be \"realestate\" (config/mysql/schema.sql creates that database name only)."
fi
