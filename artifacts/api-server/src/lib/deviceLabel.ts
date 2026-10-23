/** A readable name for the device behind a login, from its User-Agent: "Chrome, macOS" for a browser, "Aplikacja na Androidzie" for the app. */

export type DeviceKind = "browser" | "app";

export interface DeviceInfo {
  kind: DeviceKind;
  label: string;
}

function operatingSystem(ua: string): string | null {
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux|X11/i.test(ua)) return "Linux";
  return null;
}

function browserName(ua: string): string | null {
  if (/Edg(e|A|iOS)?\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
  if (/Chrome|CriOS|Chromium/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  return null;
}

export function deviceInfo(userAgent: string | undefined | null): DeviceInfo {
  const ua = (userAgent ?? "").slice(0, 400);
  if (!ua.trim()) return { kind: "app", label: "Nieznane urządzenie" };

  const browser = /Mozilla\//.test(ua) ? browserName(ua) : null;
  if (browser) {
    const os = operatingSystem(ua);
    return { kind: "browser", label: os ? `${browser}, ${os}` : browser };
  }
  // the mobile app: React Native's network layer identifies itself as okhttp (Android) or CFNetwork/Darwin (iOS)
  if (/okhttp/i.test(ua)) return { kind: "app", label: "Aplikacja na Androidzie" };
  if (/CFNetwork|Darwin|iOS/i.test(ua)) return { kind: "app", label: "Aplikacja na iPhonie lub iPadzie" };
  return { kind: "app", label: "Aplikacja mobilna" };
}
