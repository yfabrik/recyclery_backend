-- Read-only MariaDB user for Chartbrew dashboards against the recyclerie DB.
-- Applied automatically on first MariaDB volume init (docker-entrypoint-initdb.d).
-- If the volume already exists, run:
--   docker compose exec -T mariadb mariadb -u root -precyclerie_root < scripts/chartbrew-user.sql

CREATE USER IF NOT EXISTS 'chartbrew'@'%' IDENTIFIED BY 'change-me-chartbrew-password';
GRANT SELECT ON recyclerie.* TO 'chartbrew'@'%';
FLUSH PRIVILEGES;
