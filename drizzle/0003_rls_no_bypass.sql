-- The app role could set app.bypass_rls itself. Cross-tenant access now requires connecting as
-- a BYPASSRLS role (DATABASE_SYSTEM_URL), which tenant-scoped SQL cannot assume.
CREATE OR REPLACE FUNCTION app_tenant_visible(org_id text) RETURNS boolean
  LANGUAGE sql STABLE AS $$
    SELECT org_id = nullif(current_setting('app.current_org_id', true), '')
$$;
