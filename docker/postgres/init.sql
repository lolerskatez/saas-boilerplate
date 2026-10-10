-- The application must connect with a role that is NOT a superuser and does NOT have BYPASSRLS,
-- otherwise Postgres Row-Level Security policies are silently skipped.
CREATE ROLE app WITH LOGIN PASSWORD 'app' NOSUPERUSER NOBYPASSRLS NOCREATEROLE;
-- Trusted role for cross-tenant system code (withSystem). It inherits app's table privileges and
-- bypasses RLS; the app role cannot assume it.
CREATE ROLE app_system WITH LOGIN PASSWORD 'app_system' NOSUPERUSER BYPASSRLS NOCREATEROLE;
GRANT app TO app_system;
CREATE DATABASE saas OWNER app;
CREATE DATABASE saas_test OWNER app;
