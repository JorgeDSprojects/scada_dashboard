import "@testing-library/jest-dom/vitest";

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
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
