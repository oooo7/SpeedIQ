import { sendEmail } from "@/lib/email/client";
import { createAdminClient } from "@/lib/supabase/admin";

import type { BillingCurrency } from "./config";

/**
 * Billing email lifecycle. All sends are funneled through here so they:
 *   1. share a consistent visual style (simple, readable, no marketing fluff)
 *   2. are de-duped via billing_email_log (kind + project_id + ref_id)
 *   3. resolve the from/platform name from platform_settings centrally
 */

export type BillingEmailKind =
  | "trial_ending"
  | "trial_expired"
  | "low_balance"
  | "plan_grant_receipt"
  | "top_up_receipt"
  | "subscription_canceled"
  | "payment_failed";

export interface SendBillingEmailArgs {
  kind: BillingEmailKind;
  projectId: string;
  to: string;
  refId?: string;
  data: Record<string, unknown>;
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000/").replace(/\/$/, "");
}

async function getPlatformName(): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", "platform_name")
    .maybeSingle();
  const raw = data?.value;
  if (typeof raw === "string") return raw;
  return "SpeedIQ";
}

function fmtMoney(amount: number, currency: BillingCurrency): string {
  if (currency === "inr") return `₹${amount.toLocaleString("en-IN")}`;
  return `$${amount.toLocaleString("en-US")}`;
}

function shell(title: string, body: string, ctaUrl?: string, ctaLabel?: string): string {
  const button = ctaUrl
    ? `<p style="margin:24px 0"><a href="${ctaUrl}" style="display:inline-block;background:#111827;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:500;font-size:14px">${ctaLabel ?? "Open"}</a></p>`
    : "";
  return `
<!doctype html>
<html><body style="margin:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <h1 style="font-size:20px;font-weight:600;margin:0 0 16px">${title}</h1>
    <div style="font-size:14px;line-height:1.6;color:#374151">${body}</div>
    ${button}
    <hr style="margin:32px 0 16px;border:0;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#6b7280;margin:0">You're receiving this because you're an owner or admin of this project.</p>
  </div>
</body></html>
`;
}

function buildEmail(args: SendBillingEmailArgs, platformName: string): { subject: string; html: string } {
  const { kind, data } = args;
  const billingUrl = `${appUrl()}/dashboard/billing`;

  switch (kind) {
    case "trial_ending": {
      const days = (data.daysLeft as number | undefined) ?? 0;
      const subject = `Your ${platformName} trial ends ${days <= 1 ? "tomorrow" : `in ${days} days`}`;
      return {
        subject,
        html: shell(
          subject,
          `<p>Your free trial wraps up soon. Once it ends, your subscription's monthly credits kick in and you'll be charged on the cycle you picked.</p>
           <p>Nothing to do if you're happy — you'll be auto-renewed. If you'd like to switch plans or cancel, you can do it from the billing page.</p>`,
          billingUrl,
          "Manage billing",
        ),
      };
    }
    case "trial_expired": {
      const subject = `Your ${platformName} trial has ended`;
      return {
        subject,
        html: shell(
          subject,
          `<p>Your trial period is over. You can pick a plan any time to keep sending; until then, sends will be paused.</p>`,
          billingUrl,
          "Choose a plan",
        ),
      };
    }
    case "low_balance": {
      const balance = (data.balance as number | undefined) ?? 0;
      const threshold = (data.threshold as number | undefined) ?? 0;
      const packName = (data.packName as string | undefined) ?? "credit pack";
      const packCredits = (data.packCredits as number | undefined) ?? 0;
      const url = (data.url as string | null | undefined) ?? billingUrl;
      const subject = `Your credit balance is low (${balance.toLocaleString()} left)`;
      return {
        subject,
        html: shell(
          subject,
          `<p>You're at <strong>${balance.toLocaleString()} credits</strong>, below your auto-recharge threshold of ${threshold.toLocaleString()}.</p>
           <p>We've started a top-up for the <strong>${packName}</strong> (${packCredits.toLocaleString()} credits). Click below to complete payment so your sends don't pause.</p>`,
          url,
          "Complete top-up",
        ),
      };
    }
    case "plan_grant_receipt": {
      const planName = (data.planName as string | undefined) ?? "your plan";
      const credits = (data.credits as number | undefined) ?? 0;
      const amount = data.amount as number | undefined;
      const currency = ((data.currency as string | undefined) ?? "inr") as BillingCurrency;
      const subject = `Your ${planName} renewed`;
      return {
        subject,
        html: shell(
          subject,
          `<p>We've granted you <strong>${credits.toLocaleString()} credits</strong> for the new billing cycle${amount != null ? ` and charged ${fmtMoney(amount, currency)}` : ""}.</p>
           <p>You can review the invoice and balance any time from billing.</p>`,
          billingUrl,
          "View billing",
        ),
      };
    }
    case "top_up_receipt": {
      const packName = (data.packName as string | undefined) ?? "credit pack";
      const credits = (data.credits as number | undefined) ?? 0;
      const amount = data.amount as number | undefined;
      const currency = ((data.currency as string | undefined) ?? "inr") as BillingCurrency;
      const subject = `${credits.toLocaleString()} credits added`;
      return {
        subject,
        html: shell(
          subject,
          `<p>Thanks for the top-up. We've added <strong>${credits.toLocaleString()} credits</strong> from your <strong>${packName}</strong> purchase${amount != null ? ` (${fmtMoney(amount, currency)})` : ""}.</p>`,
          billingUrl,
          "View balance",
        ),
      };
    }
    case "subscription_canceled": {
      const endDate = (data.endDate as string | undefined) ?? "the end of your billing cycle";
      const subject = `Your ${platformName} subscription was canceled`;
      return {
        subject,
        html: shell(
          subject,
          `<p>Your subscription has been canceled. You'll continue to have access until ${endDate}, after which sends will pause until you pick a new plan.</p>`,
          billingUrl,
          "Reactivate",
        ),
      };
    }
    case "payment_failed": {
      const subject = `Payment failed — please update your card`;
      return {
        subject,
        html: shell(
          subject,
          `<p>We couldn't charge your card for the latest billing cycle. To keep sending, please update your payment method.</p>`,
          billingUrl,
          "Update payment",
        ),
      };
    }
  }
}

/**
 * Send a billing email, idempotently. Returns true if sent, false if it was
 * a duplicate (already sent for the same kind/project/ref_id) or send failed.
 */
export async function sendBillingEmail(args: SendBillingEmailArgs): Promise<boolean> {
  const admin = createAdminClient();

  // Dedupe: same kind+ref_id (or same kind within last 24h if no ref) means skip.
  if (args.refId) {
    const { data: existing } = await admin
      .from("billing_email_log")
      .select("id")
      .eq("project_id", args.projectId)
      .eq("kind", args.kind)
      .eq("ref_id", args.refId)
      .limit(1)
      .maybeSingle();
    if (existing) return false;
  } else {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from("billing_email_log")
      .select("id")
      .eq("project_id", args.projectId)
      .eq("kind", args.kind)
      .gte("sent_at", since)
      .limit(1)
      .maybeSingle();
    if (recent) return false;
  }

  const platformName = await getPlatformName();
  const { subject, html } = buildEmail(args, platformName);

  const result = await sendEmail({ to: args.to, subject, html });
  if (!result.success) {
    console.error("[billing-emails] send failed", { kind: args.kind, projectId: args.projectId, error: result.error });
    return false;
  }

  await admin.from("billing_email_log").insert({
    project_id: args.projectId,
    kind: args.kind,
    recipient_email: args.to,
    ref_id: args.refId ?? null,
    metadata: args.data,
  });
  return true;
}
