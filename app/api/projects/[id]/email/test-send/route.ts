import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import { sendEmailForProject } from "@/lib/email/client";
import { getPlatformEmailSettings } from "@/lib/email/platform-email-settings";
import {
  getEffectiveFromAddress,
  getProjectEmailSettingsForSend,
} from "@/lib/email/project-settings";

/**
 * Send a test email to confirm the project's email setup actually works.
 * Recipient: the caller's own email (or a user-supplied address they can verify).
 * POST body: { to?: string }   (defaults to the signed-in user's email)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const requestedTo = typeof body.to === "string" ? body.to.trim() : "";
  const to = requestedTo || user.email || "";
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "A valid recipient email is required" }, { status: 400 });
  }

  const settings = await getProjectEmailSettingsForSend(projectId);
  const fromAddress = getEffectiveFromAddress(settings, projectId);
  const platform = await getPlatformEmailSettings();

  const subject = `${platform.platformName} email test — ${new Date().toLocaleString()}`;
  const html = `
<!doctype html>
<html><body style="margin:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <h1 style="font-size:20px;font-weight:600;margin:0 0 16px">Your email setup is working</h1>
    <div style="font-size:14px;line-height:1.6;color:#374151">
      <p>This is a test email sent from <strong>${escapeHtml(fromAddress)}</strong> using your ${escapeHtml(platform.platformName)} project's configured sending settings.</p>
      <p>If you received this in your inbox (not spam), DNS records are propagated and authentication (SPF, DKIM, DMARC) is working.</p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px">Sent at ${new Date().toISOString()}</p>
    </div>
  </div>
</body></html>`;

  const result = await sendEmailForProject(projectId, {
    to,
    subject,
    html,
    audit: { kind: "test", refId: user.id },
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error ?? "Send failed", from: fromAddress, to },
      { status: 200 }
    );
  }

  return NextResponse.json({ success: true, from: fromAddress, to, messageId: result.messageId });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
