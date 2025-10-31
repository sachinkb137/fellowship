@echo off
echo Creating database...

SET PGPASSWORD=postgres
SET PGUSER=postgres
SET PGHOST=localhost
SET PGPORT=5432
SET DBNAME=mgnrega_tracker

REM Create database
psql -c "DROP DATABASE IF EXISTS %DBNAME%;"
psql -c "CREATE DATABASE %DBNAME%;"

REM Connect to the database and create schema
psql -d %DBNAME% -f "./server/src/db/schema.sql"

REM Insert sample data
psql -d %DBNAME% -f "./server/src/db/sample-data.sql"

echo Database initialization complete!