-- The application must connect with a role that is NOT a superuser and does NOT have BYPASSRLS,
-- otherwise Postgres Row-Level Security policies are silently skipped.
CREATE ROLE app WITH LOGIN PASSWORD 'app' NOSUPERUSER NOBYPASSRLS NOCREATEROLE;
CREATE DATABASE saas OWNER app;
CREATE DATABASE saas_test OWNER app;
