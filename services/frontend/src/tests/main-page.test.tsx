import "@testing-library/jest-dom/vitest";

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { deleteDashboard, listDashboards } from "../api/client";
import { MainPage } from "../pages/MainPage";

vi.mock("../api/client", () => ({
  listDashboards: vi.fn(),
  deleteDashboard: vi.fn(),
}));

const dashboardsFixture = [
  {
    id: 1,
    name: "Turbine Realtime",
    description: "Main turbine dashboard",
    pipeline: "realtime" as const,
    status: "draft" as const,
  },
  {
    id: 2,
    name: "Historian KPIs",
    description: "Historical trends",
    pipeline: "historian" as const,
    status: "published" as const,
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listDashboards).mockResolvedValue(dashboardsFixture);
});

afterEach(() => {
  cleanup();
});

it("renders dashboards table columns", async () => {
  render(<MainPage />);

  expect(await screen.findByText("Name")).toBeInTheDocument();
  expect(screen.getByText("Pipeline")).toBeInTheDocument();
  expect(screen.getByText("Status")).toBeInTheDocument();
});

it("renders dashboard rows and expected actions", async () => {
  render(<MainPage />);

  expect(await screen.findByText("Turbine Realtime")).toBeInTheDocument();
  expect(screen.getByText("Historian KPIs")).toBeInTheDocument();

  expect(screen.getByRole("link", { name: "Open Turbine Realtime" })).toHaveAttribute(
    "href",
    "/editor/1",
  );
  expect(screen.getByRole("link", { name: "Open Historian KPIs" })).toHaveAttribute(
    "href",
    "/fixed/2",
  );
  expect(screen.getByRole("link", { name: "Edit Turbine Realtime" })).toHaveAttribute(
    "href",
    "/editor/1",
  );
  expect(screen.getByRole("button", { name: "Delete Turbine Realtime" })).toBeInTheDocument();
});

it("confirms and deletes a dashboard row", async () => {
  vi.mocked(deleteDashboard).mockResolvedValue(undefined);
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

  render(<MainPage />);

  await screen.findByText("Turbine Realtime");
  await userEvent.click(screen.getByRole("button", { name: "Delete Turbine Realtime" }));

  expect(confirmSpy).toHaveBeenCalled();
  expect(deleteDashboard).toHaveBeenCalledWith(1);
  expect(screen.queryByText("Turbine Realtime")).not.toBeInTheDocument();
});
