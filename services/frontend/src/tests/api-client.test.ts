import { expect, it } from "vitest";

import { buildWebSocketUrl } from "../api/client";

it("builds an absolute websocket url from a relative path", () => {
  const url = buildWebSocketUrl("/ws/realtime?dashboard_id=7");
  const parsed = new URL(url);

  expect(["ws:", "wss:"]).toContain(parsed.protocol);
  expect(parsed.pathname).toBe("/ws/realtime");
  expect(parsed.searchParams.get("dashboard_id")).toBe("7");
});

it("converts absolute https urls to wss urls", () => {
  const url = buildWebSocketUrl("https://api.example.test/ws/realtime?dashboard_id=3");
  expect(url).toBe("wss://api.example.test/ws/realtime?dashboard_id=3");
});
