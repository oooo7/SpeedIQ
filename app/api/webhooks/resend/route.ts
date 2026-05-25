import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resend webhook — handles delivery lifecycle events via Svix.
 * Verifies the Svix HMAC-SHA256 signature before processing.
 *
 * Configure in Resend dashboard:
 *   Endpoint: https://<your-domain>/api/webhooks/resend
 *   Events:
 *     email.delivered           → mark email_sends as delivered
 *     email.delivery_delayed    → record soft-fail for visibility
 *     email.bounced             → on HARD bounce, suppress subscriber
 *     email.complained          → spam complaint, unsubscribe subscriber
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
    const strippedSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const keyBytes = Buffer.from(strippedSecret, "base64");

    const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
    const hmac = createHmac("sha256", keyBytes);
    hmac.update(toSign);
    const computed = hmac.digest("base64");

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

interface ResendEventPayload {
  type?: string;
  data?: Record<string, unknown>;
}

function extractRecipient(data: Record<string, unknown> | undefined): string | null {
  const toField = data?.to;
  if (Array.isArray(toField) && typeof toField[0] === "string") return toField[0];
  if (typeof toField === "string") return toField;
  return null;
}

function extractMessageId(data: Record<string, unknown> | undefined): string | null {
  const id = data?.email_id ?? data?.id;
  return typeof id === "string" ? id : null;
}

/**
 * Bounce types from Resend webhook payload:
 *   "hard" / "permanent" → invalid address, suppress permanently
 *   "soft" / "transient" → temporary issue, do NOT suppress
 *   Unknown / undefined  → treat as soft to be safe (avoid mass-suppressing)
 */
function isHardBounce(data: Record<string, unknown> | undefined): boolean {
  const bounce = data?.bounce as Record<string, unknown> | undefined;
  const type = (bounce?.type ?? data?.bounce_type ?? data?.type) as string | undefined;
  if (!type) return false;
  const t = type.toLowerCase();
  return t === "hard" || t === "permanent" || t.includes("hard");
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

  const tsSeconds = parseInt(svixTimestamp, 10);
  if (isNaN(tsSeconds) || Math.abs(Date.now() / 1000 - tsSeconds) > 300) {
    return NextResponse.json({ error: "Timestamp out of tolerance" }, { status: 400 });
  }

  const rawBody = await request.text();

  if (!verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, RESEND_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: ResendEventPayload;
  try {
    payload = JSON.parse(rawBody) as ResendEventPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.type;
  const data = payload.data;
  const recipient = extractRecipient(data);
  const messageId = extractMessageId(data);
  const now = new Date().toISOString();
  const supabase = createAdminClient();

  switch (eventType) {
    case "email.delivered": {
      if (messageId) {
        await supabase
          .from("email_sends")
          .update({ status: "delivered", delivered_at: now })
          .eq("provider_message_id", messageId);
      }
      return NextResponse.json({ received: true });
    }

    case "email.delivery_delayed": {
      if (messageId) {
        await supabase
          .from("email_sends")
          .update({ status: "delivery_delayed" })
          .eq("provider_message_id", messageId);
      }
      return NextResponse.json({ received: true });
    }

    case "email.bounced": {
      if (!recipient) {
        console.warn("[resend-webhook] email.bounced missing recipient", payload);
        return NextResponse.json({ received: true });
      }

      const email = recipient.toLowerCase().trim();
      const hard = isHardBounce(data);

      // Always log the bounce on the audit row.
      if (messageId) {
        await supabase
          .from("email_sends")
          .update({
            status: "bounced",
            bounced_at: now,
            error_message: hard ? "hard_bounce" : "soft_bounce",
          })
          .eq("provider_message_id", messageId);
      }

      // Soft bounce → don't suppress the subscriber; let them retry next time.
      if (!hard) return NextResponse.json({ received: true });

      const { data: subscriber } = await supabase
        .from("email_subscribers")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (!subscriber) return NextResponse.json({ received: true });

      await supabase
        .from("email_subscribers")
        .update({ status: "bounced", unsubscribed_at: now, updated_at: now })
        .eq("id", subscriber.id);

      await supabase
        .from("email_campaign_recipients")
        .update({ status: "bounced", error_message: "bounced" })
        .eq("subscriber_id", subscriber.id)
        .in("status", ["pending", "sent"]);

      return NextResponse.json({ received: true });
    }

    case "email.complained": {
      if (!recipient) return NextResponse.json({ received: true });
      const email = recipient.toLowerCase().trim();

      if (messageId) {
        await supabase
          .from("email_sends")
          .update({ status: "complained", complained_at: now })
          .eq("provider_message_id", messageId);
      }

      // Spam complaint → unsubscribe immediately. Sender reputation is at stake.
      const { data: subscriber } = await supabase
        .from("email_subscribers")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (!subscriber) return NextResponse.json({ received: true });

      await supabase
        .from("email_subscribers")
        .update({ status: "unsubscribed", unsubscribed_at: now, updated_at: now })
        .eq("id", subscriber.id);

      return NextResponse.json({ received: true });
    }

    default:
      return NextResponse.json({ received: true });
  }
}
