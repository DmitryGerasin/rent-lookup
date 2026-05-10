#!/bin/bash
set -euo pipefail

# Table-level grants for the app DB user (must match MYSQL_USER / MYSQL_PASSWORD in compose).
# The official image may already have created MYSQL_USER; GRANT still applies least-privilege on _User.

APP_USER="${MYSQL_USER:-app}"

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
USE ${MYSQL_DATABASE};

CREATE USER IF NOT EXISTS '${APP_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
CREATE USER IF NOT EXISTS '${APP_USER}'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';

GRANT SELECT, INSERT, UPDATE ON ${MYSQL_DATABASE}._User TO '${APP_USER}'@'%';
GRANT SELECT, INSERT, UPDATE ON ${MYSQL_DATABASE}._User TO '${APP_USER}'@'localhost';

FLUSH PRIVILEGES;
EOSQL
