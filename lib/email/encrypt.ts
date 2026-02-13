import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 16;
const TAG_LEN = 16;
const KEY_LEN = 32;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw?.length) throw new Error("ENCRYPTION_KEY is not set");
  if (raw.length >= 32) return Buffer.from(raw.slice(0, 32), "utf8");
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

/**
 * Encrypt a string for storage. Returns "iv:tag:encrypted" in base64.
 */
export function encrypt(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/**
 * Decrypt a string from storage. Input format "iv:tag:encrypted" as base64.
 */
export function decrypt(encoded: string): string {
  const key = getKey();
  const buf = Buffer.from(encoded, "base64");
  if (buf.length < IV_LEN + TAG_LEN) throw new Error("Invalid encrypted value");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final("utf8");
}
