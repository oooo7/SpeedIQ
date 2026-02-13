import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/unsubscribe/thank-you?error=missing", request.url));
  }

  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/unsubscribe/thank-you?error=invalid", request.url));
  }

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

  if (error) {
    return NextResponse.redirect(new URL("/unsubscribe/thank-you?error=error", request.url));
  }

  return NextResponse.redirect(new URL("/unsubscribe/thank-you", request.url));
}
