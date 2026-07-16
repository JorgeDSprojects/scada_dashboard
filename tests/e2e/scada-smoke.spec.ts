import { expect, test } from "../playwright-fixtures";

test("dashboard lifecycle smoke", async ({ page }) => {
  const baseUrl = process.env.SCADA_BASE_URL ?? "http://localhost:5173";
  const dashboardName = `Smoke Dashboard ${Date.now()}`;

  await page.goto(`${baseUrl}/`);
  await page.getByRole("button", { name: "New dashboard" }).click();
  await expect(page.getByRole("heading", { name: /dashboard editor/i })).toBeVisible();

  const urlAfterCreate = page.url();
  const dashboardId = Number(urlAfterCreate.split("/").pop());
  expect(Number.isNaN(dashboardId)).toBeFalsy();

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
  await expect(page).toHaveURL(new RegExp(`/dashboards/${dashboardId}$`));
  await expect(page.getByRole("heading", { name: /fixed dashboard/i })).toBeVisible();

  await page.goto(`${baseUrl}/`);
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: `Delete ${dashboardName}` }).click();
  await expect(page.getByRole("link", { name: `Open ${dashboardName}` })).toHaveCount(0);
});
