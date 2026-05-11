import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resend webhook — handles bounce events delivered via Svix.
 * Verifies the Svix HMAC-SHA256 signature before processing.
 *
 * Configure in Resend dashboard:
 *   Endpoint: https://<your-domain>/api/webhooks/resend
 *   Events:   email.bounced
 *
 * Required env var: RESEND_WEBHOOK_SECRET (from Resend → Webhooks → signing secret)
 */

const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET ?? "";

/**
 * Verify a Svix webhook signature.
 * Svix signs the payload as: `${msgId}.${msgTimestamp}.${rawBody}`
 * The secret is base64-encoded and prefixed with "whsec_".
 */
function verifySvixSignature(
  rawBody: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string
): boolean {
  try {
    // Strip the "whsec_" prefix and decode
    const strippedSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const keyBytes = Buffer.from(strippedSecret, "base64");

    const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
    const hmac = createHmac("sha256", keyBytes);
    hmac.update(toSign);
    const computed = hmac.digest("base64");

    // svixSignature may be a comma-separated list of "v1,<base64>" entries
    const signatures = svixSignature.split(" ");
    for (const sig of signatures) {
      const b64 = sig.startsWith("v1,") ? sig.slice(3) : sig;
      try {
        if (timingSafeEqual(Buffer.from(computed), Buffer.from(b64))) {
          return true;
        }
      } catch {
        // length mismatch — not a match
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!RESEND_WEBHOOK_SECRET) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const svixId = request.headers.get("svix-id") ?? "";
  const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
  const svixSignature = request.headers.get("svix-signature") ?? "";

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  // Reject stale webhooks (> 5 minutes)
  const tsSeconds = parseInt(svixTimestamp, 10);
  if (isNaN(tsSeconds) || Math.abs(Date.now() / 1000 - tsSeconds) > 300) {
    return NextResponse.json({ error: "Timestamp out of tolerance" }, { status: 400 });
  }

  const rawBody = await request.text();

  if (!verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, RESEND_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.type as string | undefined;

  // Only handle bounce events; acknowledge everything else
  if (eventType !== "email.bounced") {
    return NextResponse.json({ received: true });
  }

  const data = payload.data as Record<string, unknown> | undefined;
  // Resend puts the recipient address in data.to (array) or data.email_id
  const toField = data?.to;
  const bouncedEmail: string | null = Array.isArray(toField)
    ? (toField[0] as string) ?? null
    : typeof toField === "string"
    ? toField
    : null;

  if (!bouncedEmail) {
    console.warn("[resend-webhook] email.bounced missing recipient address", payload);
    return NextResponse.json({ received: true });
  }

  const email = bouncedEmail.toLowerCase().trim();
  const now = new Date().toISOString();

  const supabase = createAdminClient();

  // Find the subscriber by email
  const { data: subscriber } = await supabase
    .from("email_subscribers")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!subscriber) {
    // Unknown email — nothing to update, still acknowledge
    return NextResponse.json({ received: true });
  }

  // Mark subscriber as bounced
  await supabase
    .from("email_subscribers")
    .update({ status: "bounced", unsubscribed_at: now, updated_at: now })
    .eq("id", subscriber.id);

  // Mark any pending/sent campaign recipient rows for this subscriber as bounced
  await supabase
    .from("email_campaign_recipients")
    .update({ status: "bounced", error_message: "bounced" })
    .eq("subscriber_id", subscriber.id)
    .in("status", ["pending", "sent"]);

  return NextResponse.json({ received: true });
}
