// node --test scripts/device-label.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { deviceInfo } from "../src/lib/deviceLabel.ts";

test("browsers are named with their system", () => {
  assert.deepEqual(deviceInfo("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"), { kind: "browser", label: "Chrome, macOS" });
  assert.equal(deviceInfo("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0").label, "Firefox, Windows");
  assert.equal(deviceInfo("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0").label, "Edge, Windows");
  assert.equal(deviceInfo("Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1").label, "Safari, iOS");
  assert.equal(deviceInfo("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36").label, "Chrome, Android");
  assert.equal(deviceInfo("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36").kind, "browser");
});

test("the mobile app is recognised by its network layer", () => {
  assert.deepEqual(deviceInfo("okhttp/4.12.0"), { kind: "app", label: "Aplikacja na Androidzie" });
  assert.deepEqual(deviceInfo("PanelTrenera/1 CFNetwork/1485 Darwin/23.1.0"), { kind: "app", label: "Aplikacja na iPhonie lub iPadzie" });
  assert.equal(deviceInfo("curl/8.4.0").kind, "app");
  assert.equal(deviceInfo("node").label, "Aplikacja mobilna");
});

test("a missing or empty agent is an unknown device, and a very long one is cut", () => {
  assert.deepEqual(deviceInfo(undefined), { kind: "app", label: "Nieznane urządzenie" });
  assert.deepEqual(deviceInfo("   "), { kind: "app", label: "Nieznane urządzenie" });
  assert.ok(deviceInfo("Mozilla/5.0 " + "x".repeat(5000)).label.length < 60);
});
