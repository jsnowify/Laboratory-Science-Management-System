import { expect, test } from "@playwright/test";

test("page routes use trailing slashes while Better Auth keeps its exact path", async ({ request }) => {
  const pageRedirect = await request.get("/login", { maxRedirects: 0 });
  expect(pageRedirect.status()).toBe(308);
  expect(new URL(pageRedirect.headers().location, "http://127.0.0.1:3001").pathname).toBe("/login/");

  const login = await request.get("/login/");
  expect(login.status()).toBe(200);

  const auth = await request.get("/api/auth/get-session", { maxRedirects: 0 });
  expect(auth.status()).toBe(200);
  expect(await auth.json()).toBeNull();

  const setup = await request.get("/api/v1/setup/status/");
  expect(setup.status()).toBe(200);
  expect(typeof (await setup.json()).available).toBe("boolean");
});
