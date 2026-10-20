
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  initAnalytics,
  identify,
  trackEvent,
} from "../dist/index.js";

test("initAnalytics rejects an empty API URL", () => {
  assert.throws(
    () => initAnalytics({ apiUrl: "" }),
    /apiUrl/,
  );
});

test("identify rejects an empty user ID", () => {
  assert.throws(
    () => identify("   "),
    /userId/,
  );
});

test("trackEvent requires SDK initialization", async () => {
  await assert.rejects(
    trackEvent("button_click"),
    /Initialize the Analytics SDK first/,
  );
});
