import crypto from "crypto";
import QRCode from "qrcode";

// Standard RFC 4648 Base32 alphabet (A-Z and 2-7, strictly NO 0, 1, 8, 9)
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Standard RFC 4648 Base32 Decoder
 */
function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.toUpperCase().replace(/=+$/, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Derives a deterministic, 100% valid RFC 4648 Base32 secret for any email account
 */
export function getAccountBase32Secret(email: string): string {
  if (!process.env.TOTP_SECRET_SALT) {
    console.warn("[SECURITY] TOTP_SECRET_SALT not set — using unsafe fallback salt. Set TOTP_SECRET_SALT in .env.local");
  }
  const cleanEmail = email.trim().toLowerCase();
  const salt = process.env.TOTP_SECRET_SALT || "FALLBACK_INSECURE_SALT_FOR_DEV";
  const hash = crypto.createHmac("sha256", salt).update(cleanEmail).digest();
  let base32 = "";
  // Generate a standard 24-character Base32 secret
  for (let i = 0; i < 24; i++) {
    base32 += BASE32_CHARS[hash[i] % 32];
  }
  return base32;
}

/**
 * Generate 6-digit TOTP code for a given timestamp and secret (RFC 6238)
 */
export function generateTOTP(secret: string, timeStepWindow = 0): string {
  const key = base32Decode(secret);
  const timeStep = 30; // 30-second standard step for Google Authenticator
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep) + timeStepWindow;

  // Buffer of 8 bytes for counter (Big-Endian uint64)
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();

  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = codeInt % 1000000;
  return otp.toString().padStart(6, "0");
}

/**
 * Verify a 6-digit Google Authenticator code against a base32 secret.
 * Allows ±2 step window (covers ±60 seconds of clock drift between phone and server).
 */
export function verifyGoogleAuthTOTP(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  const cleanToken = token.trim().replace(/\s+/g, "");
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) return false;

  // Check windows: -2, -1, 0, +1, +2
  for (let window = -2; window <= 2; window++) {
    const expected = generateTOTP(secret, window);
    if (cleanToken === expected) {
      return true;
    }
  }

  return false;
}

/**
 * Generate standard Google Authenticator URI
 * e.g., otpauth://totp/KushalsMart:admin@kushalsmart.com?secret=...&issuer=KushalsMart
 */
export function getGoogleAuthUri(
  accountName: string,
  secret: string,
  issuer = "KushalsMart"
): string {
  const cleanAccount = accountName.trim();
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(cleanAccount)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate a scannable Base64 Data URL QR Code image for Google Authenticator
 */
export async function generateTOTPQRCodeDataUrl(
  accountName: string,
  secret: string,
  issuer = "KushalsMart"
): Promise<string> {
  const uri = getGoogleAuthUri(accountName, secret, issuer);
  return await QRCode.toDataURL(uri, {
    width: 260,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

