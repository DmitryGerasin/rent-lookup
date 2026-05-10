DROP DATABASE IF EXISTS realestate;
CREATE DATABASE realestate;
USE realestate;

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE _User (
   id                                  INT UNSIGNED      AUTO_INCREMENT,
   createdAt                           DATETIME          DEFAULT CURRENT_TIMESTAMP,
   firstName                           VARCHAR(50)       NOT NULL,
   lastName                            VARCHAR(50)       NOT NULL,
   email                               VARCHAR(100)      NOT NULL,
   password                            CHAR(82)          NOT NULL,
   category                            VARCHAR(10)       DEFAULT 'user', -- allowed: admin, user
   active                              BOOLEAN           NOT NULL DEFAULT 1,
   
   CONSTRAINT chk_User_category CHECK (category IN ('admin','user')),

   PRIMARY KEY (id),
   UNIQUE(email),
   UNIQUE(firstName, lastName)
);