import { expect, test } from "@playwright/test";

/**
 * Happy path through the core multi-tenant flows. Requires AUTH_REQUIRE_EMAIL_VERIFICATION=false
 * (as in CI) so sign-up logs the user in directly.
 */
test.describe.configure({ mode: "serial" });

const id = Date.now();
const email = `e2e-${id}@example.com`;
const password = "Password123!";
const orgName = `E2E Org ${id}`;
const slug = `e2e-org-${id}`;

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("#pricing")).toContainText("Pro");
});

test("protected routes redirect to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?redirectTo=%2Fdashboard/);
});

test("sign up, create org, project and API key, then call the REST API", async ({ page, request }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create your account" }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Organization name").fill(orgName);
  await expect(page.getByLabel("URL slug")).toHaveValue(slug);
  await page.getByRole("button", { name: "Create organization" }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/${slug}$`));

  await page.goto(`/dashboard/${slug}/projects`);
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").fill("First project");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("cell", { name: /First project/ })).toBeVisible();

  await page.goto(`/dashboard/${slug}/settings/api-keys`);
  await page.getByRole("button", { name: "Create API key" }).click();
  await page.getByLabel("Name").fill("e2e");
  await page.getByLabel("projects:write").check();
  await page.getByRole("dialog").getByRole("button", { name: "Create API key" }).click();
  const key = await page.getByTestId("api-key-value").inputValue();
  expect(key).toMatch(/^sk_live_/);

  const list = await request.get("/api/v1/projects", { headers: { Authorization: `Bearer ${key}` } });
  expect(list.status()).toBe(200);
  expect((await list.json()).data.map((p: { name: string }) => p.name)).toContain("First project");

  const created = await request.post("/api/v1/projects", {
    headers: { Authorization: `Bearer ${key}` },
    data: { name: "From API" },
  });
  expect(created.status()).toBe(201);

  const unauthorized = await request.get("/api/v1/projects", { headers: { Authorization: "Bearer sk_live_nope" } });
  expect(unauthorized.status()).toBe(401);

  await page.goto(`/dashboard/${slug}/settings/audit-log`);
  await expect(page.getByText("project.created").first()).toBeVisible();
  await expect(page.getByText("api_key.created")).toBeVisible();
});
