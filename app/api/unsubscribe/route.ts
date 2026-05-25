import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

export const dynamic = "force-dynamic";

async function unsubscribeByToken(token: string): Promise<{ ok: boolean; error?: string }> {
  const payload = verifyUnsubscribeToken(token);
  if (!payload) return { ok: false, error: "invalid" };

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("email_subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: now,
      updated_at: now,
    })
    .eq("id", payload.subscriberId)
    .eq("project_id", payload.projectId);

  if (error) return { ok: false, error: "error" };
  return { ok: true };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/unsubscribe/thank-you?error=missing", request.url));
  }

  const result = await unsubscribeByToken(token);
  const dest = result.ok
    ? "/unsubscribe/thank-you"
    : `/unsubscribe/thank-you?error=${result.error ?? "error"}`;
  return NextResponse.redirect(new URL(dest, request.url));
}

/**
 * RFC 8058 one-click unsubscribe. Gmail/Yahoo POST here with body
 * `List-Unsubscribe=One-Click` (or just an empty body) when the user
 * clicks the inbox-level Unsubscribe button.
 *
 * Token can come from either the ?token=… query string (our standard
 * format) or a `token` form field, depending on how the mail client
 * decided to construct the request.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get("token");

  if (!token) {
    const contentType = request.headers.get("content-type") ?? "";
    try {
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const form = await request.formData();
        const fromForm = form.get("token");
        if (typeof fromForm === "string") token = fromForm;
      } else if (contentType.includes("application/json")) {
        const body = await request.json().catch(() => ({}));
        if (typeof body?.token === "string") token = body.token;
      }
    } catch {
      // ignore — fall through to empty token check
    }
  }

  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }

  const result = await unsubscribeByToken(token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "error" }, { status: 400 });
  }
  return NextResponse.json({ unsubscribed: true });
}
