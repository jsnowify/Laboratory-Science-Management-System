import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const id = "11111111-1111-4111-8111-111111111111";
const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const routes = {
  super_admin: ["/super-admin/", "/super-admin/requests/", `/super-admin/requests/${id}/`, `/super-admin/requests/${id.slice(0, -1)}2/`, `/super-admin/requests/${id.slice(0, -1)}3/`, `/super-admin/requests/${id.slice(0, -1)}4/`, "/super-admin/custody/", "/super-admin/overdue/", "/super-admin/accountability/", "/super-admin/iso/", "/super-admin/reports/", "/super-admin/organization/colleges/", "/super-admin/organization/courses/", "/super-admin/organization/departments/", "/super-admin/staff/new/", "/notifications/", "/account/password/", `/equipment/q/${id}/`],
  admin: ["/admin/", "/admin/users/", "/admin/equipment/", "/admin/equipment/categories/", "/admin/equipment/catalog/", "/admin/equipment/assets/", "/admin/analytics/", "/admin/reports/"],
  student_faculty: ["/portal/", "/portal/equipment/", "/portal/requests/", "/portal/requests/new/", `/portal/requests/${id}/`, `/portal/requests/new/?edit=${id.slice(0, -1)}5`, "/portal/custody/", "/portal/history/", "/portal/accountability/", "/portal/profile/"],
};

async function role(page: Page, value: string) {
  await page.context().addCookies([{ name: "lsms-ui-role", value, url: "http://127.0.0.1:3100" }]);
}
async function noOverflow(page: Page, name: string) {
  const measurements = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(measurements.body, name).toBeLessThanOrEqual(measurements.viewport + 1);
  expect(measurements.document, name).toBeLessThanOrEqual(measurements.viewport + 1);
}

for (const [accountRole, pages] of Object.entries(routes)) {
  test(`${accountRole}: screens fit all nine viewport widths`, async ({ page }, testInfo) => {
    await role(page, accountRole);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.getByText("This page could not be loaded")).toHaveCount(0);
      // Expand editors as well as checking the default list layout.
      for (const summary of await page.locator("summary").all()) await summary.click();
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await noOverflow(page, `${path} at ${width}px`);
        if ((width === 320 || width === 1440) && (path === pages[0] || path === "/admin/equipment/assets/" || path === "/portal/requests/new/" || path === `/super-admin/requests/${id}/`)) await page.screenshot({ path: testInfo.outputPath(`${path.replaceAll(/[^a-z0-9]/gi, "_")}-${width}.png`), fullPage: true });
      }
    }
    expect(errors).toEqual([]);
  });
}

test("public screens, pending account, and missing page fit all widths", async ({ page }) => {
  for (const path of ["/", "/login/", "/register/", "/setup/", "/forbidden/", "/not-a-page/"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    for (const width of widths) { await page.setViewportSize({ width, height: 900 }); await noOverflow(page, `${path} at ${width}`); }
  }
  await page.context().addCookies([{ name: "lsms-ui-pending", value: "1", url: "http://127.0.0.1:3100" }]);
  await page.goto("/pending/");
  await expect(page.getByRole("heading", { name: "Account awaiting activation" })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  await noOverflow(page, "pending account");
});

test("mobile navigation traps focus, closes with Escape, and follows links", async ({ page }) => {
  await role(page, "super_admin");
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/super-admin/");
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "LSMS navigation" });
  await expect(drawer).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    expect(await drawer.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await drawer.getByRole("link", { name: "Requests", exact: true }).click();
  await expect(page).toHaveURL(/\/super-admin\/requests\/$/);
  await expect(drawer).toHaveCount(0);
});

test("account confirmation cancels safely and restores focus", async ({ page }) => {
  await role(page, "admin");
  await page.goto("/admin/users/");
  const action = page.getByRole("button", { name: "Activate", exact: true });
  let writes = 0;
  page.on("request", (request) => { if (request.method() === "POST" && request.url().includes("/status/")) writes++; });
  await action.click();
  const dialog = page.getByRole("dialog", { name: "Activate Test Borrower?" });
  await expect(dialog.getByRole("button", { name: "Keep working" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(action).toBeFocused();
  expect(writes).toBe(0);
  await action.click();
  await dialog.getByRole("button", { name: "Activate account" }).click();
  await expect(page.getByRole("status")).toContainText("Account activated.");
  expect(writes).toBe(1);
});

test("return requires inspected condition and damage remarks", async ({ page }, testInfo) => {
  await role(page, "super_admin");
  await page.goto("/super-admin/custody/");
  await page.getByRole("button", { name: "Record return" }).click();
  await expect(page.getByLabel("Condition on return")).toBeFocused();
  await expect(page.getByRole("button", { name: "Confirm return" })).toBeDisabled();
  await page.getByLabel("Condition on return").selectOption("damaged");
  await expect(page.getByLabel("Return outcome")).toHaveValue("damaged");
  await expect(page.getByRole("button", { name: "Confirm return" })).toBeDisabled();
  await page.getByLabel("Remarks (required)").fill("Lens damaged; inspection required.");
  await page.getByRole("button", { name: "Confirm return" }).click();
  await expect(page.getByRole("dialog")).toContainText("Test Borrower");
  await page.setViewportSize({ width: 320, height: 700 });
  await noOverflow(page, "return confirmation");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("return-confirmation-320.png"), fullPage: true });
  await page.getByRole("button", { name: "Keep working" }).click();
  await expect(page.getByLabel("Remarks (required)")).toHaveValue("Lens damaged; inspection required.");
});

test("offline feedback and retrying submission preserve the saved draft", async ({ page }) => {
  await role(page, "student_faculty");
  await page.goto("/portal/requests/new/");
  await page.getByLabel("Borrowing purpose").fill("Laboratory sample observation");
  await page.getByLabel("Borrow date and time").fill("2026-10-01T09:00");
  await page.getByLabel("Due date and time").fill("2026-10-02T09:00");
  await page.getByLabel("Equipment item 1").selectOption(id);
  let creates = 0;
  let updates = 0;
  let submissions = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/v1/borrow-requests/" && request.method() === "POST") creates++;
    if (request.url().includes("/borrow-requests/") && request.method() === "PATCH") updates++;
  });
  await page.route("**/api/v1/borrow-requests/*/submit/", (route) => {
    submissions++;
    return submissions === 1 ? route.fulfill({ status: 503, json: { error: { message: "Submission unavailable. Your draft is saved; try again." } } }) : route.continue();
  });
  await page.getByRole("button", { name: "Submit request", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit request", exact: true }).click();
  await expect(page.getByText("Submission unavailable. Your draft is saved; try again.")).toBeVisible();
  await expect(page.getByLabel("Borrowing purpose")).toHaveValue("Laboratory sample observation");
  await page.context().setOffline(true);
  await expect(page.getByText(/You are offline/)).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.getByText(/You are offline/)).toHaveCount(0);
  await page.getByRole("button", { name: "Submit request", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit request", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/portal/requests/${id}/$`));
  expect({ creates, updates, submissions }).toEqual({ creates: 1, updates: 1, submissions: 2 });
});

test("dashboard filter links, review validation, and release confirmation", async ({ page }) => {
  await role(page, "super_admin");
  await page.goto("/super-admin/");
  await page.getByRole("link", { name: /Submitted requests/ }).click();
  await expect(page.getByLabel("Request status")).toHaveValue("submitted");
  await page.goto(`/super-admin/requests/${id}/`);
  await page.getByLabel("Approved quantity for Compound microscope").fill("0");
  await expect(page.getByRole("button", { name: "Approve quantities" })).toBeDisabled();
  await page.getByLabel("Approved quantity for Compound microscope").fill("1");
  await page.getByRole("button", { name: "Approve quantities" }).click();
  await expect(page.getByRole("dialog")).toContainText("1 unit(s)");
  await page.keyboard.press("Escape");
  await page.goto(`/super-admin/requests/${id.slice(0, -1)}3/`);
  await expect(page.getByRole("button", { name: "Confirm physical release" })).toBeDisabled();
  await page.getByLabel("MIC-003 condition").selectOption("good");
  await page.getByRole("button", { name: "Confirm physical release" }).click();
  await expect(page.getByRole("dialog")).toContainText("physical handover");
});

test("list failures offer retry and analytics fetches only the selected report", async ({ page }) => {
  await role(page, "admin");
  let failed = true;
  await page.route("**/api/v1/users/**", (route) => failed ? route.fulfill({ status: 503, json: { error: { message: "Temporarily unavailable. Try again." } } }) : route.continue());
  await page.goto("/admin/users/");
  await expect(page.getByRole("alert").filter({ hasText: "Temporarily unavailable" })).toBeVisible();
  failed = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("button", { name: "Activate", exact: true })).toBeVisible();
  const requests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/api/v1/analytics/")) requests.push(request.url()); });
  await page.goto("/admin/analytics/");
  await page.waitForLoadState("networkidle");
  expect(requests).toHaveLength(1);
  await page.getByLabel("Choose an analysis").selectOption("inventory-overview");
  await page.waitForLoadState("networkidle");
  expect(requests).toHaveLength(2);
});

test("automated accessibility checks on role workflows and auth", async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const findings: { path: string; width: number; issues: unknown[] }[] = [];
  for (const [accountRole, pages] of Object.entries(routes)) {
    await role(page, accountRole);
    for (const path of pages) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      for (const summary of await page.locator("summary").all()) await summary.click();
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      if (result.violations.length) findings.push({ path, width: 1440, issues: result.violations.map((item) => ({ id: item.id, impact: item.impact, targets: item.nodes.map((node) => node.target) })) });
    }
  }
  for (const path of ["/login/", "/register/", "/setup/"]) {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    if (result.violations.length) findings.push({ path, width: 320, issues: result.violations.map((item) => ({ id: item.id, impact: item.impact, targets: item.nodes.map((node) => node.target) })) });
  }
  await testInfo.attach("accessibility-findings", { body: JSON.stringify(findings, null, 2), contentType: "application/json" });
  expect(findings).toEqual([]);
});
