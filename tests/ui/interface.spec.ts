import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const id = "11111111-1111-4111-8111-111111111111";
const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const routes = {
  super_admin: [
    "/super-admin/",
    "/super-admin/users/",
    "/super-admin/requests/",
    `/super-admin/requests/${id}/`,
    `/super-admin/requests/${id.slice(0, -1)}2/`,
    `/super-admin/requests/${id.slice(0, -1)}3/`,
    `/super-admin/requests/${id.slice(0, -1)}4/`,
    "/super-admin/custody/",
    "/super-admin/overdue/",
    "/super-admin/accountability/",
    "/super-admin/iso/",
    "/super-admin/analytics/",
    "/super-admin/reports/",
    "/super-admin/audit/",
    "/super-admin/organization/colleges/",
    "/super-admin/organization/courses/",
    "/super-admin/organization/departments/",
    "/super-admin/staff/new/",
    "/account/profile/",
    "/notifications/",
    "/account/password/",
    `/equipment/q/${id}/`,
  ],
  admin: [
    "/admin/",
    "/admin/users/",
    "/admin/equipment/",
    "/admin/equipment/categories/",
    "/admin/equipment/catalog/",
    "/admin/equipment/assets/",
    "/admin/analytics/",
    "/admin/reports/",
    "/admin/audit/",
    "/account/profile/",
  ],
  student_faculty: [
    "/portal/",
    "/portal/equipment/",
    "/portal/requests/",
    "/portal/requests/new/",
    `/portal/requests/${id}/`,
    `/portal/requests/new/?edit=${id.slice(0, -1)}5`,
    "/portal/custody/",
    "/portal/history/",
    "/portal/accountability/",
    "/portal/profile/",
  ],
};

async function role(page: Page, value: string) {
  await page
    .context()
    .addCookies([
      { name: "lsms-ui-role", value, url: "http://127.0.0.1:3100" },
    ]);
}
async function noOverflow(page: Page, name: string) {
  const measurements = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(measurements.body, name).toBeLessThanOrEqual(
    measurements.viewport + 1,
  );
  expect(measurements.document, name).toBeLessThanOrEqual(
    measurements.viewport + 1,
  );
}

for (const [accountRole, pages] of Object.entries(routes)) {
  test(`${accountRole}: screens fit all nine viewport widths`, async ({
    page,
  }, testInfo) => {
    await role(page, accountRole);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.getByText("This page could not be loaded")).toHaveCount(
        0,
      );
      // Expand editors as well as checking the default list layout.
      for (const summary of await page.locator("summary").all())
        await summary.click();
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await noOverflow(page, `${path} at ${width}px`);
        if (
          (width === 320 || width === 1440) &&
          (path === pages[0] ||
            path === "/admin/equipment/assets/" ||
            path === "/portal/requests/new/" ||
            path === `/super-admin/requests/${id}/`)
        )
          await page.screenshot({
            path: testInfo.outputPath(
              `${path.replaceAll(/[^a-z0-9]/gi, "_")}-${width}.png`,
            ),
            fullPage: true,
          });
      }
    }
    expect(errors).toEqual([]);
  });
}

test("public screens, pending account, and missing page fit all widths", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/login/",
    "/register/",
    "/setup/",
    "/forbidden/",
    "/not-a-page/",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await noOverflow(page, `${path} at ${width}`);
    }
  }
  await page
    .context()
    .addCookies([
      { name: "lsms-ui-pending", value: "1", url: "http://127.0.0.1:3100" },
    ]);
  await page.goto("/pending/");
  await expect(
    page.getByRole("heading", { name: "Account awaiting activation" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  await noOverflow(page, "pending account");
});

test("missing URLs show a clear recovery page", async ({ page }) => {
  await page.goto("/a-page-that-does-not-exist/");
  await expect(
    page.getByRole("heading", { name: "That page isn’t here." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Open your dashboard/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Back to home/ })).toBeVisible();
});

test("collapsed add panels stand out from surrounding cards", async ({
  page,
}) => {
  await role(page, "admin");
  await page.goto("/admin/equipment/categories/");
  const summary = page.locator("summary").filter({ hasText: "Add category" });
  await expect(summary).toBeVisible();
  expect(
    await summary.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  ).toBe("rgb(43, 80, 54)");
  await summary.click();
  await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
});

test("Admin audit shows student and faculty actions only", async ({ page }) => {
  await role(page, "admin");
  await page.goto("/admin/audit/");
  await expect(
    page.getByRole("link", { name: "Student activity" }),
  ).toHaveAttribute("aria-current", "page");
  const activity = page.getByRole("region", { name: /Audit activity/ });
  await expect(activity.getByText("Borrowing request submitted")).toBeVisible();
  await expect(activity).toContainText("Test Borrower");
  await expect(activity).not.toContainText("Physical asset added");
  await expect(page.getByRole("combobox", { name: "Actor role" })).toHaveCount(
    0,
  );
});

test("registration uses a custom options menu and shared button styles", async ({
  page,
}) => {
  await page.goto("/register/");
  const role = page.getByRole("combobox", { name: "I am a" });
  await role.click();
  await expect(page.getByRole("option", { name: "Student" })).toBeVisible();
  await page.getByRole("option", { name: "Faculty" }).click();
  await expect(role).toHaveText("Faculty");
  await expect(page.getByRole("combobox", { name: "Course" })).toHaveCount(0);
  await page.goto("/");
  const landingButton = page.getByRole("link", { name: "See the workspace" });
  expect(
    await landingButton.evaluate(
      (element) => getComputedStyle(element).borderRadius,
    ),
  ).toBe("12px");
  await landingButton.hover();
  expect(
    await landingButton.evaluate(
      (element) => getComputedStyle(element).transform,
    ),
  ).toBe("none");
});

test("landing preview and auth pages support scrolling", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "See the workspace" }).click();
  await expect(page).toHaveURL(/#dashboard-preview$/);
  await expect(
    page.getByText("Illustrative preview.", { exact: false }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 800 });
  for (const path of ["/login/", "/register/"]) {
    await page.goto(path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight > window.innerHeight,
      ),
    ).toBe(true);
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await expect(page.getByText("3. Manage requests")).toBeVisible();
  }
});

test("landing switches navigation when a session exists", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create account" }),
  ).toBeVisible();
  await role(page, "admin");
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Open dashboard" }),
  ).toHaveAttribute("href", "/admin/");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Create account" })).toHaveCount(
    0,
  );
});

test("sidebar keeps its scroll position across dashboard navigation", async ({
  page,
}) => {
  await role(page, "super_admin");
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("/super-admin/");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await navigation.evaluate((element) => {
    element.scrollTop = 260;
  });
  const before = await navigation.evaluate((element) => element.scrollTop);
  expect(before).toBeGreaterThan(0);
  await navigation.getByRole("link", { name: "Audit log" }).click();
  await expect(
    page.getByRole("heading", { name: "System audit log" }),
  ).toBeVisible();
  expect(
    await navigation.evaluate((element) => element.scrollTop),
  ).toBeGreaterThanOrEqual(before - 2);
});

test("Admin cannot suspend or archive accounts in the interface", async ({
  page,
}) => {
  await role(page, "admin");
  await page.goto("/admin/users/");
  await expect(
    page.getByRole("button", { name: "Activate", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Suspend|Archive/ }),
  ).toHaveCount(0);
  await page.getByRole("combobox", { name: "Account status" }).click();
  await page.getByRole("option", { name: "Active" }).click();
  await expect(
    page.getByRole("button", { name: /Suspend|Archive/ }),
  ).toHaveCount(0);
});

test("request date picker uses a custom accessible calendar", async ({
  page,
}) => {
  await role(page, "student_faculty");
  await page.goto("/portal/requests/new/");
  await page
    .getByRole("button", { name: "Choose borrow date and time" })
    .click();
  const calendar = page.getByRole("dialog", {
    name: "Borrow date and time calendar",
  });
  await expect(calendar).toBeVisible();
  await expect(
    calendar.getByRole("button", { name: "Previous month" }),
  ).toBeVisible();
  await calendar.getByRole("button", { name: "Set date and time" }).click();
  await expect(
    page.getByLabel("Borrow date and time", { exact: true }),
  ).not.toHaveValue("");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("mobile navigation traps focus, closes with Escape, and follows links", async ({
  page,
}) => {
  await role(page, "super_admin");
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/super-admin/");
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "LSMS navigation" });
  await expect(drawer).toBeVisible();
  expect(
    await page.evaluate(() => getComputedStyle(document.body).overflow),
  ).toBe("hidden");
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    expect(
      await drawer.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await drawer.getByRole("link", { name: "Requests", exact: true }).click();
  await expect(page).toHaveURL(/\/super-admin\/requests\/$/);
  await expect(drawer).toHaveCount(0);
});

test("account confirmation cancels safely and restores focus", async ({
  page,
}) => {
  await role(page, "admin");
  await page.goto("/admin/users/");
  const action = page.getByRole("button", { name: "Activate", exact: true });
  let writes = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/status/"))
      writes++;
  });
  await action.click();
  const dialog = page.getByRole("dialog", { name: "Activate Test Borrower?" });
  await expect(
    dialog.getByRole("button", { name: "Keep working" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(action).toBeFocused();
  expect(writes).toBe(0);
  await action.click();
  await dialog.getByRole("button", { name: "Activate account" }).click();
  await expect(page.getByRole("status")).toContainText("Account activated.");
  expect(writes).toBe(1);
});

test("super admin manages all account roles and keeps own access protected", async ({
  page,
}) => {
  await role(page, "super_admin");
  await page.goto("/super-admin/users/");
  await expect(
    page.getByRole("row").filter({ hasText: "TEST-001" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "ADMIN-001" }),
  ).toBeVisible();
  const ownRow = page.getByRole("row").filter({ hasText: "ROOT-001" });
  await expect(ownRow).toBeVisible();
  await expect(ownRow.getByRole("button", { name: "Suspend" })).toHaveCount(0);
  const adminRow = page.getByRole("row").filter({ hasText: "ADMIN-001" });
  await adminRow.getByRole("button", { name: "Suspend" }).click();
  await expect(page.getByRole("dialog")).toContainText("Test Administrator");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep working" })
    .click();
  await adminRow.getByRole("button", { name: "Edit details" }).click();
  const editor = page.getByRole("form", { name: "Edit Test Administrator" });
  await expect(editor).toContainText("affiliation");
  await expect(editor.getByRole("combobox")).toHaveCount(0);
  await editor.getByLabel("First name").fill("Updated");
  const update = page.waitForRequest(
    (request) =>
      request.method() === "PATCH" && request.url().includes("/api/v1/users/"),
  );
  await editor.getByRole("button", { name: "Save details" }).click();
  const body = (await update).postDataJSON();
  expect(body).toMatchObject({
    firstName: "Updated",
    email: "admin@example.invalid",
  });
  expect(body).not.toHaveProperty("role");
  expect(body).not.toHaveProperty("personType");
});

test("student profile edits only name and email; asset status uses custom options", async ({
  page,
}) => {
  await role(page, "student_faculty");
  await page.goto("/portal/profile/");
  await expect(
    page.locator("aside").getByRole("link", { name: /Test Borrower/ }),
  ).toContainText("student");
  await expect(page.getByText("Student", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit name and email" }).click();
  await page.getByLabel("First name").fill("Updated");
  const update = page.waitForRequest(
    (request) =>
      request.method() === "PATCH" && request.url().includes("/api/v1/me/"),
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  const body = (await update).postDataJSON();
  expect(body).toMatchObject({
    firstName: "Updated",
    email: "test.account@example.invalid",
  });
  expect(body).not.toHaveProperty("personType");
  expect(body).not.toHaveProperty("role");
  expect(body).not.toHaveProperty("institutionalId");

  await role(page, "admin");
  await page.goto("/admin/equipment/assets/");
  await page.getByText("Add physical asset", { exact: true }).first().click();
  await page.getByRole("combobox", { name: "Operational status" }).click();
  await expect(page.getByRole("option", { name: "Maintenance" })).toBeVisible();
  await page.getByRole("option", { name: "Maintenance" }).click();
  await expect(
    page.getByRole("combobox", { name: "Operational status" }),
  ).toContainText("Maintenance");
});

test("return requires inspected condition and damage remarks", async ({
  page,
}, testInfo) => {
  await role(page, "super_admin");
  await page.goto("/super-admin/custody/");
  await page.getByRole("button", { name: "Record return" }).click();
  await expect(page.getByLabel("Condition on return")).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Confirm return" }),
  ).toBeDisabled();
  await page.getByRole("combobox", { name: "Condition on return" }).click();
  await page.getByRole("option", { name: "Damaged" }).click();
  await expect(
    page.getByRole("combobox", { name: "Return outcome" }),
  ).toContainText("Damaged");
  await expect(
    page.getByRole("button", { name: "Confirm return" }),
  ).toBeDisabled();
  await page
    .getByLabel("Remarks (required)")
    .fill("Lens damaged; inspection required.");
  await page.getByRole("button", { name: "Confirm return" }).click();
  await expect(page.getByRole("dialog")).toContainText("Test Borrower");
  await page.setViewportSize({ width: 320, height: 700 });
  await noOverflow(page, "return confirmation");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("return-confirmation-320.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Keep working" }).click();
  await expect(page.getByLabel("Remarks (required)")).toHaveValue(
    "Lens damaged; inspection required.",
  );
});

test("offline feedback and retrying submission preserve the saved draft", async ({
  page,
}) => {
  await role(page, "student_faculty");
  await page.goto("/portal/requests/new/");
  await page
    .getByLabel("Borrowing purpose")
    .fill("Laboratory sample observation");
  await page
    .getByLabel("Borrow date and time", { exact: true })
    .fill("2026-10-01T09:00");
  await page
    .getByLabel("Due date and time", { exact: true })
    .fill("2026-10-02T09:00");
  await page.getByRole("combobox", { name: "Equipment item 1" }).click();
  await page.getByRole("option", { name: /Compound microscope/ }).click();
  let creates = 0;
  let updates = 0;
  let submissions = 0;
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname === "/api/v1/borrow-requests/" &&
      request.method() === "POST"
    )
      creates++;
    if (
      request.url().includes("/borrow-requests/") &&
      request.method() === "PATCH"
    )
      updates++;
  });
  await page.route("**/api/v1/borrow-requests/*/submit/", (route) => {
    submissions++;
    return submissions === 1
      ? route.fulfill({
          status: 503,
          json: {
            error: {
              message:
                "Submission unavailable. Your draft is saved; try again.",
            },
          },
        })
      : route.continue();
  });
  await page
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  await expect(
    page.getByText("Submission unavailable. Your draft is saved; try again."),
  ).toBeVisible();
  await expect(page.getByLabel("Borrowing purpose")).toHaveValue(
    "Laboratory sample observation",
  );
  await page.context().setOffline(true);
  await expect(page.getByText(/You are offline/)).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.getByText(/You are offline/)).toHaveCount(0);
  await page
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/portal/requests/${id}/$`));
  expect({ creates, updates, submissions }).toEqual({
    creates: 1,
    updates: 1,
    submissions: 2,
  });
});

test("dashboard filter links, review validation, and release confirmation", async ({
  page,
}) => {
  await role(page, "super_admin");
  await page.goto("/super-admin/");
  await page.getByRole("link", { name: /Submitted requests/ }).click();
  await expect(
    page.getByRole("combobox", { name: "Request status" }),
  ).toContainText("Submitted");
  await page.goto(`/super-admin/requests/${id}/`);
  await page.getByLabel("Approved quantity for Compound microscope").fill("0");
  await expect(
    page.getByRole("button", { name: "Approve quantities" }),
  ).toBeDisabled();
  await page.getByLabel("Approved quantity for Compound microscope").fill("1");
  await page.getByRole("button", { name: "Approve quantities" }).click();
  await expect(page.getByRole("dialog")).toContainText("1 unit(s)");
  await page.keyboard.press("Escape");
  await page.goto(`/super-admin/requests/${id.slice(0, -1)}3/`);
  await expect(
    page.getByRole("button", { name: "Confirm physical release" }),
  ).toBeDisabled();
  await page.getByRole("combobox", { name: "MIC-003 condition" }).click();
  await page.getByRole("option", { name: "Good" }).click();
  await page.getByRole("button", { name: "Confirm physical release" }).click();
  await expect(page.getByRole("dialog")).toContainText("physical handover");
});

test("list failures offer retry and analytics fetches only the selected report", async ({
  page,
}) => {
  await role(page, "admin");
  let failed = true;
  await page.route("**/api/v1/users/**", (route) =>
    failed
      ? route.fulfill({
          status: 503,
          json: { error: { message: "Temporarily unavailable. Try again." } },
        })
      : route.continue(),
  );
  await page.goto("/admin/users/");
  await expect(
    page.getByRole("alert").filter({ hasText: "Temporarily unavailable" }),
  ).toBeVisible();
  failed = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("button", { name: "Activate", exact: true }),
  ).toBeVisible();
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/analytics/"))
      requests.push(request.url());
  });
  await page.goto("/admin/analytics/");
  await page.waitForLoadState("networkidle");
  expect(requests).toHaveLength(1);
  await page.getByRole("combobox", { name: "Choose an analysis" }).click();
  await page.getByRole("option", { name: "Inventory overview" }).click();
  await page.waitForLoadState("networkidle");
  expect(requests).toHaveLength(2);
});

test("dropdowns are opaque and empty panels explain what happens next", async ({
  page,
}) => {
  await role(page, "admin");
  await page.goto("/admin/reports/");
  await page.getByRole("combobox", { name: "Report" }).click();
  const menu = page.locator(".custom-select-content");
  await expect(menu).toBeVisible();
  expect(
    await menu.evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe("rgb(255, 255, 255)");
  await expect(page.getByRole("option", { name: "Inventory" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/notifications/");
  await expect(page.getByText("Your updates")).toBeVisible();
  await expect(
    page.getByRole("list").filter({ hasText: "Request approved" }),
  ).toBeVisible();
});

test("empty notifications explain where future updates will appear", async ({
  page,
}) => {
  await role(page, "admin");
  await page.route("**/api/v1/notifications/**", (route) =>
    route.fulfill({ json: { data: [], total: 0, unreadCount: 0 } }),
  );
  await page.goto("/notifications/");
  await expect(
    page.getByRole("heading", { name: "No notifications yet" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Updates about your account and laboratory activity will appear here.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous" })).toHaveCount(0);
});

test("audit activity shows readable actions and record names without UUIDs", async ({
  page,
}) => {
  await role(page, "super_admin");
  await page.goto("/super-admin/audit/");
  const table = page.getByRole("region", { name: /Audit activity/ });
  await expect(table.getByText("Physical asset added")).toBeVisible();
  await expect(
    table.getByText("Physical asset: Compound microscope · MIC-003"),
  ).toBeVisible();
  await expect(table).not.toContainText(id);
});

test("empty equipment and department menus explain the missing setup", async ({
  page,
}) => {
  await role(page, "admin");
  await page.route("**/api/v1/equipment/catalog/**", (route) =>
    route.fulfill({ json: { data: [], total: 0 } }),
  );
  await page.goto("/admin/equipment/assets/");
  await page
    .locator("summary")
    .filter({ hasText: "Add physical asset" })
    .click();
  await page.getByRole("combobox", { name: "Equipment type" }).click();
  await expect(
    page.getByText(
      "No equipment types yet. Add an equipment category and type before recording an asset.",
    ),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await role(page, "super_admin");
  await page.route("**/api/v1/departments/**", (route) =>
    route.fulfill({ json: { data: [], total: 0 } }),
  );
  await page.goto("/super-admin/staff/new/");
  await page.getByRole("combobox", { name: "Department (optional)" }).click();
  await expect(
    page.getByText(
      "No departments have been added yet. You can create this Admin without assigning a department.",
    ),
  ).toBeVisible();
});

test("registration explains when a chosen college has no courses", async ({
  page,
}) => {
  await page.route("**/api/v1/courses/**", (route) =>
    route.fulfill({ json: { data: [], total: 0 } }),
  );
  await page.goto("/register/");
  await page.getByRole("combobox", { name: "I am a" }).click();
  await page.getByRole("option", { name: "Student" }).click();
  await page.getByRole("combobox", { name: "College" }).click();
  await page.getByRole("option", { name: /Test laboratory/ }).click();
  await expect(
    page.getByText(
      "No courses are available for this college. Choose another college or contact the laboratory administrator.",
    ),
  ).toBeVisible();
});

test("admin and super admin see graphs for every analysis", async ({
  page,
}) => {
  const analyses = [
    "Monthly borrowing trends",
    "Equipment usage",
    "Inventory utilization",
    "Borrowing frequency by user",
    "Borrowing frequency by college",
    "Borrowing frequency by course",
    "Peak borrowing periods",
    "Inventory overview",
  ];
  for (const accountRole of ["admin", "super_admin"]) {
    await role(page, accountRole);
    await page.goto(
      `/${accountRole === "admin" ? "admin" : "super-admin"}/analytics/`,
    );
    await expect(page.getByRole("link", { name: "Analytics" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    for (const title of analyses) {
      if (title !== analyses[0]) {
        await page
          .getByRole("combobox", { name: "Choose an analysis" })
          .click();
        await page.getByRole("option", { name: title }).click();
      }
      await expect(
        page.getByRole("img", {
          name: `${title} graph. Exact values are listed in the table below.`,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: "Analytics data" }),
      ).toBeVisible();
    }
  }
});

test("automated accessibility checks on role workflows and auth", async ({
  page,
}, testInfo) => {
  test.setTimeout(300_000);
  const findings: { path: string; width: number; issues: unknown[] }[] = [];
  for (const [accountRole, pages] of Object.entries(routes)) {
    await role(page, accountRole);
    for (const path of pages) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      for (const summary of await page.locator("summary").all())
        await summary.click();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      if (result.violations.length)
        findings.push({
          path,
          width: 1440,
          issues: result.violations.map((item) => ({
            id: item.id,
            impact: item.impact,
            targets: item.nodes.map((node) => node.target),
          })),
        });
    }
  }
  for (const path of ["/", "/login/", "/register/", "/setup/"]) {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    if (result.violations.length)
      findings.push({
        path,
        width: 320,
        issues: result.violations.map((item) => ({
          id: item.id,
          impact: item.impact,
          targets: item.nodes.map((node) => node.target),
        })),
      });
  }
  await testInfo.attach("accessibility-findings", {
    body: JSON.stringify(findings, null, 2),
    contentType: "application/json",
  });
  expect(findings).toEqual([]);
});
