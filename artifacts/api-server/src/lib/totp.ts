import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Time-based one-time passwords (RFC 6238, SHA-1, 6 digits, 30 s) compatible with Google Authenticator, 1Password, Authy... */

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.replace(/[\s=-]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error("Invalid base32 character");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpCode(secret: string, at: number = Date.now(), digits = 6): string {
  const counter = Math.floor(at / 1000 / 30);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secret)).update(message).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const binary = ((hmac[offset] & 127) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, "0");
}

/** Accepts the current 30-second step and one step either side (clock drift); compared in constant time. */
export function verifyTotp(secret: string, input: string, at: number = Date.now()): boolean {
  const code = input.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  let ok = false;
  for (const drift of [-1, 0, 1]) {
    const expected = Buffer.from(totpCode(secret, at + drift * 30000));
    if (timingSafeEqual(expected, Buffer.from(code))) ok = true;
  }
  return ok;
}

export function otpauthUrl(accountEmail: string, secret: string, issuer = "Panel Trenera"): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
}

/** Secrets are stored encrypted (AES-256-GCM, key derived from the server secret), so a database leak alone does not reveal them. */
export function sealSecret(plain: string, serverSecret: string): string {
  const key = createHash("sha256").update(`totp:${serverSecret}`).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64")).join(".");
}

export function openSecret(sealed: string, serverSecret: string): string {
  const [iv, tag, encrypted] = sealed.split(".").map((part) => Buffer.from(part, "base64"));
  const key = createHash("sha256").update(`totp:${serverSecret}`).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

/** Ten single-use recovery codes like "7QK2-9XMD"; only their hashes are stored. */
export function generateBackupCodes(count = 10): string[] {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I
  return Array.from({ length: count }, () => {
    const raw = Array.from(randomBytes(8), (byte) => alphabet[byte % alphabet.length]).join("");
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
}

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(code.replace(/[\s-]/g, "").toUpperCase()).digest("hex");
}
