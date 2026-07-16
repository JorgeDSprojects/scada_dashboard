import { expect, test } from "@playwright/test";

test("dashboard lifecycle smoke", async ({ page }) => {
  const baseUrl = process.env.SCADA_BASE_URL ?? "http://localhost:5173";
  const dashboardName = `Smoke Dashboard ${Date.now()}`;

  const createResponse = await page.request.post(`${baseUrl}/api/dashboards`, {
    data: {
      name: dashboardName,
      description: "Smoke test dashboard",
      pipeline: "realtime",
      status: "draft",
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  const created = (await createResponse.json()) as { id: number };
  const dashboardId = created.id;

  await page.goto(`${baseUrl}/editor/${dashboardId}`);
  await expect(page.getByRole("heading", { name: /dashboard editor/i })).toBeVisible();

  await page.getByLabel("name").fill(dashboardName);
  await page.getByLabel("signal").selectOption("Gen_RPM");
  await page.getByLabel("color").selectOption("navy");
  await page.getByRole("button", { name: "+ Add" }).click();
  await expect(page.getByText("Gen_RPM - navy")).toBeVisible();

  await page.getByRole("button", { name: "Launch widget" }).click();
  await expect(page.getByRole("status")).toContainText("Widget launched.");

  await page.getByRole("button", { name: "Publish dashboard" }).click();
  await expect(page.getByRole("status")).toContainText("Dashboard published.");

  await page.goto(`${baseUrl}/`);
  await page.getByRole("link", { name: `Open ${dashboardName}` }).click();
  await expect(page).toHaveURL(new RegExp(`/fixed/${dashboardId}$`));
  await expect(page.getByRole("heading", { name: /fixed dashboard/i })).toBeVisible();

  await page.goto(`${baseUrl}/`);
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: `Delete ${dashboardName}` }).click();
  await expect(page.getByRole("link", { name: `Open ${dashboardName}` })).toHaveCount(0);
});
