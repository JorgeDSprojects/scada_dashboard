import "@testing-library/jest-dom/vitest";

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { createDashboard, deleteDashboard, listDashboards } from "../api/client";
import { MainPage } from "../pages/MainPage";

vi.mock("../api/client", () => ({
  listDashboards: vi.fn(),
  createDashboard: vi.fn(),
  deleteDashboard: vi.fn(),
}));

const dashboardsFixture = [
  {
    id: 1,
    name: "Turbine Realtime",
    description: "Main turbine dashboard",
    pipeline: "realtime" as const,
    status: "draft" as const,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Historian KPIs",
    description: "Historical trends",
    pipeline: "historian" as const,
    status: "published" as const,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listDashboards).mockResolvedValue(dashboardsFixture);
  vi.mocked(createDashboard).mockResolvedValue({
    id: 99,
    name: "New dashboard",
    description: "",
    pipeline: "realtime",
    status: "draft",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  });
});

afterEach(() => {
  cleanup();
});

it("renders dashboards table columns", async () => {
  render(<MainPage />);

  expect(await screen.findByRole("columnheader", { name: "Name" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Description" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Pipeline" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
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
    "/dashboards/2",
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

it("creates a dashboard from the main page", async () => {
  render(<MainPage />);

  await screen.findByText("Turbine Realtime");
  await userEvent.click(screen.getByRole("button", { name: /new dashboard/i }));

  expect(createDashboard).toHaveBeenCalledWith({
    name: "New dashboard",
    description: "",
    pipeline: "realtime",
    status: "draft",
  });
});
