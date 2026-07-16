import "@testing-library/jest-dom/vitest";

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { App } from "../App";
import {
  createWidget,
  deleteWidget,
  getDashboard,
  updateDashboard,
  updateWidget,
} from "../api/client";
import { EditorPage } from "../pages/EditorPage";

vi.mock("../api/client", () => ({
  createWidget: vi.fn(),
  deleteWidget: vi.fn(),
  getDashboard: vi.fn(),
  updateDashboard: vi.fn(),
  updateWidget: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getDashboard).mockResolvedValue({
    id: 7,
    name: "Existing dashboard",
    description: "Existing description",
    pipeline: "realtime",
    status: "draft",
    widgets: [
      {
        id: 41,
        dashboard_id: 7,
        name: "Existing widget",
        widget_type: "line",
        settings: {
          chart_type: "line",
          pipeline: "realtime",
          signals: ["Gen_RPM"],
          colors: ["navy"],
          layout: { x: 0, y: 0, w: 4, h: 6 },
        },
      },
    ],
  });
  vi.mocked(createWidget).mockResolvedValue({
    id: 101,
    dashboard_id: 7,
    name: "New dashboard",
    widget_type: "line",
    settings: {},
  });
  vi.mocked(updateDashboard).mockResolvedValue({
    id: 7,
    name: "New dashboard",
    description: "",
    pipeline: "realtime",
    status: "draft",
  });
  vi.mocked(updateWidget).mockResolvedValue({
    id: 41,
    dashboard_id: 7,
    name: "Existing widget",
    widget_type: "line",
    settings: {
      chart_type: "line",
      pipeline: "realtime",
      signals: ["Gen_RPM"],
      colors: ["navy"],
      layout: { x: 1, y: 0, w: 4, h: 6 },
    },
  });
  vi.mocked(deleteWidget).mockResolvedValue();
});

afterEach(() => {
  cleanup();
});

it("allows adding a signal with color", async () => {
  render(<EditorPage />);

  await userEvent.selectOptions(screen.getByLabelText(/signal/i), "Gen_RPM");
  await userEvent.selectOptions(screen.getByLabelText(/color/i), "navy");
  await userEvent.click(screen.getByRole("button", { name: /add/i }));

  expect(screen.getByText(/Gen_RPM - navy/i)).toBeInTheDocument();
});

it("shows historian from/to controls when pipeline is historian", async () => {
  render(<EditorPage />);

  await userEvent.selectOptions(screen.getByLabelText(/pipeline/i), "historian");

  expect(screen.getByLabelText(/from/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/to/i)).toBeInTheDocument();
});

it("shows the full six-signal catalog in the signal selector", async () => {
  render(<EditorPage />);

  const signalSelect = screen.getByLabelText(/signal/i);
  const signalOptions = Array.from(signalSelect.querySelectorAll("option")).map(
    (option) => option.textContent,
  );

  expect(signalOptions).toEqual([
    "Gen_RPM",
    "hydrolic_temp",
    "Gear_oil_temp",
    "Blades_PitchAngle",
    "Windspeed",
    "Prod_pwr",
  ]);
});

it("launches widget and displays it in the widget grid", async () => {
  render(<EditorPage dashboardId={7} />);

  await screen.findByDisplayValue("Existing dashboard");

  const nameInput = screen.getByLabelText(/name/i);
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, "Generator dashboard");
  await userEvent.selectOptions(screen.getByLabelText(/chart_type/i), "line");
  await userEvent.selectOptions(screen.getByLabelText(/signal/i), "Gen_RPM");
  await userEvent.selectOptions(screen.getByLabelText(/color/i), "navy");
  await userEvent.click(screen.getByRole("button", { name: /add/i }));
  await userEvent.click(screen.getByRole("button", { name: /launch widget/i }));

  expect(createWidget).toHaveBeenCalledWith(
    7,
    expect.objectContaining({
      name: "Generator dashboard",
      widget_type: "line",
    }),
  );
  expect(await screen.findByText(/Widget launched/i)).toBeInTheDocument();
  expect(screen.getAllByText(/line - realtime - Gen_RPM \(navy\)/i).length).toBeGreaterThan(0);
});

it("loads existing dashboard metadata and widgets", async () => {
  render(<EditorPage dashboardId={7} />);

  expect(await screen.findByDisplayValue("Existing dashboard")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Existing description")).toBeInTheDocument();
  expect(screen.getByText(/existing widget/i)).toBeInTheDocument();
});

it("deletes widgets through the backend api", async () => {
  render(<EditorPage dashboardId={7} />);

  await screen.findByText(/existing widget/i);
  await userEvent.click(screen.getByRole("button", { name: /delete widget/i }));

  expect(deleteWidget).toHaveBeenCalledWith(41);
  expect(screen.queryByText(/existing widget/i)).not.toBeInTheDocument();
});

it("saves draft and publishes dashboard", async () => {
  render(<EditorPage dashboardId={7} />);

  await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
  await userEvent.click(screen.getByRole("button", { name: /publish dashboard/i }));

  expect(updateDashboard).toHaveBeenCalledWith(
    7,
    expect.objectContaining({ status: "draft" }),
  );
  expect(updateDashboard).toHaveBeenCalledWith(
    7,
    expect.objectContaining({ status: "published" }),
  );
});

it("renders editor route in app for /editor/:id", async () => {
  window.history.pushState({}, "Editor", "/editor/7");

  render(<App />);

  expect(await screen.findByRole("heading", { name: /dashboard editor/i })).toBeInTheDocument();
});
