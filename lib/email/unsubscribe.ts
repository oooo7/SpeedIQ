import crypto from "crypto";

const SECRET = process.env.UNSUBSCRIBE_SECRET ?? process.env.CRON_SECRET ?? "";
const ALGO = "sha256";

function base64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Buffer {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  return Buffer.from(b64, "base64");
}

/**
 * Generate a signed token for unsubscribe link. Payload: projectId:subscriberId.
 */
export function generateUnsubscribeToken(projectId: string, subscriberId: string): string {
  if (!SECRET) return "";
  const payload = `${projectId}:${subscriberId}`;
  const hmac = crypto.createHmac(ALGO, SECRET);
  hmac.update(payload);
  const sig = base64urlEncode(hmac.digest());
  const payloadB64 = base64urlEncode(Buffer.from(payload, "utf8"));
  return `${payloadB64}.${sig}`;
}

/**
 * Verify token and return { projectId, subscriberId } or null.
 */
export function verifyUnsubscribeToken(token: string): { projectId: string; subscriberId: string } | null {
  if (!SECRET || !token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  try {
    const payload = base64urlDecode(payloadB64).toString("utf8");
    const [projectId, subscriberId] = payload.split(":");
    if (!projectId || !subscriberId) return null;
    const expectedSig = base64urlEncode(crypto.createHmac(ALGO, SECRET).update(payload).digest());
    if (expectedSig !== sig) return null;
    return { projectId, subscriberId };
  } catch {
    return null;
  }
}

/**
 * Build full unsubscribe URL for a subscriber. Uses NEXT_PUBLIC_APP_URL or empty (relative).
 */
export function getUnsubscribeUrl(projectId: string, subscriberId: string): string {
  const t = generateUnsubscribeToken(projectId, subscriberId);
  if (!t) return "";
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return `${base}/api/unsubscribe?token=${encodeURIComponent(t)}`;
}
