#!/bin/bash
set -euo pipefail

# Creates `app` and applies grants from config/mysql/permissions.sql logic.
# MYSQL_PASSWORD is supplied by docker-compose (same value the Node app uses).

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
USE realestate;

CREATE USER IF NOT EXISTS 'app'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
CREATE USER IF NOT EXISTS 'app'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';

GRANT SELECT, INSERT, UPDATE ON realestate._User TO 'app'@'%';
GRANT SELECT, INSERT, UPDATE ON realestate._User TO 'app'@'localhost';

FLUSH PRIVILEGES;
EOSQL
