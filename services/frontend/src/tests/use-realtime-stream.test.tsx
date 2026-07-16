import "@testing-library/jest-dom/vitest";

import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { useRealtimeStream } from "../hooks/useRealtimeStream";

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  close() {
    this.onclose?.(new CloseEvent("close"));
  }
}

function HookHarness() {
  const { status } = useRealtimeStream(99);
  return <p>{status}</p>;
}

function WindowHarness() {
  const { events } = useRealtimeStream(99);
  return (
    <>
      <p data-testid="event-count">{events.length}</p>
      <p data-testid="event-values">{events.map((event) => event.value).join(",")}</p>
    </>
  );
}

function sendRealtimeEvent(socket: MockWebSocket, payload: { signal: string; value: number; ts_utc: string }) {
  socket.onmessage?.(
    new MessageEvent("message", {
      data: JSON.stringify(payload),
    }),
  );
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("uses exponential reconnect backoff with cap", () => {
  const setTimeoutSpy = vi.spyOn(window, "setTimeout");

  render(<HookHarness />);

  expect(MockWebSocket.instances).toHaveLength(1);
  expect(screen.getByText("reconnecting")).toBeInTheDocument();

  const expectedDelaysMs = [1000, 2000, 4000, 8000, 16000, 30000, 30000];

  expectedDelaysMs.forEach((expectedDelay, index) => {
    const socket = MockWebSocket.instances[index];
    socket.close();

    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), expectedDelay);

    vi.advanceTimersByTime(expectedDelay);
    expect(MockWebSocket.instances).toHaveLength(index + 2);
  });
});

it("retains events by 15-minute timestamp window instead of a fixed count", async () => {
  render(<WindowHarness />);

  const socket = MockWebSocket.instances[0];
  act(() => {
    socket.onopen?.(new Event("open"));
  });

  const baseTimestamp = Date.parse("2026-07-12T00:00:00Z");
  act(() => {
    for (let index = 0; index < 120; index += 1) {
      sendRealtimeEvent(socket, {
        signal: "Gen_RPM",
        value: index,
        ts_utc: new Date(baseTimestamp + index * 5000).toISOString(),
      });
    }
  });

  expect(screen.getByTestId("event-count")).toHaveTextContent("120");
  expect(screen.getByTestId("event-values")).toHaveTextContent("0,1,2");

  act(() => {
    sendRealtimeEvent(socket, {
      signal: "Gen_RPM",
      value: 999,
      ts_utc: "2026-07-12T00:30:00Z",
    });
  });

  expect(screen.getByTestId("event-count")).toHaveTextContent("1");
  expect(screen.getByTestId("event-values")).toHaveTextContent("999");
});
