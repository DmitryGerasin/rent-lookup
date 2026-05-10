-- Application user privileges on `_User`.
--
-- Host notes:
--   Connections from the Node app container are seen by MySQL as remote clients, so `app`@`%` is required.
--   `app`@`localhost` covers clients that connect from inside the MySQL container (e.g. mysql CLI on loopback).
--
-- Privileges: Passport verifies passwords (SELECT including `password`); user routes use INSERT/UPDATE.
-- SELECT-only would break authentication and account updates.

USE realestate;

CREATE USER IF NOT EXISTS 'app'@'%' IDENTIFIED BY 'REPLACE_WITH_STRONG_PASSWORD';
CREATE USER IF NOT EXISTS 'app'@'localhost' IDENTIFIED BY 'REPLACE_WITH_STRONG_PASSWORD';

GRANT SELECT, INSERT, UPDATE ON realestate._User TO 'app'@'%';
GRANT SELECT, INSERT, UPDATE ON realestate._User TO 'app'@'localhost';

FLUSH PRIVILEGES;
