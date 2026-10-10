-- Row-Level Security for tenant-scoped tables.
-- Rows are visible only when `app.current_org_id` (set by withTenant()) matches organization_id,
-- or when `app.bypass_rls` is 'on' (set by withSystem() for trusted cross-tenant code paths).
-- FORCE makes policies apply to the table owner too, which is the role the app connects as.
CREATE OR REPLACE FUNCTION app_tenant_visible(org_id text) RETURNS boolean
  LANGUAGE sql STABLE AS $$
    SELECT coalesce(current_setting('app.bypass_rls', true), '') = 'on'
        OR org_id = nullif(current_setting('app.current_org_id', true), '')
$$;
--> statement-breakpoint
ALTER TABLE "project" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "project" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "project" USING (app_tenant_visible(organization_id)) WITH CHECK (app_tenant_visible(organization_id));
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "audit_log" USING (app_tenant_visible(organization_id)) WITH CHECK (app_tenant_visible(organization_id));
--> statement-breakpoint
ALTER TABLE "api_key" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "api_key" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "api_key" USING (app_tenant_visible(organization_id)) WITH CHECK (app_tenant_visible(organization_id));
--> statement-breakpoint
ALTER TABLE "file" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "file" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "file" USING (app_tenant_visible(organization_id)) WITH CHECK (app_tenant_visible(organization_id));
