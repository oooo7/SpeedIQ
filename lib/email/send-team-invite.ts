import { sendEmail } from "@/lib/email/client";
import { getPlatformEmailSettings } from "@/lib/email/platform-email-settings";

interface SendTeamInviteArgs {
  to: string;
  inviteUrl: string;
  projectName: string;
  inviterName: string | null;
  role: string;
}

/**
 * Send a team invitation email. Best-effort: failures are logged but do not
 * block the invite creation flow (the caller still returns the invite URL so
 * the inviter can share it manually if email bounces).
 */
export async function sendTeamInviteEmail(
  args: SendTeamInviteArgs
): Promise<{ success: boolean; error?: string }> {
  const platform = await getPlatformEmailSettings();
  const safeUrl = escapeHtml(args.inviteUrl);
  const safeProject = escapeHtml(args.projectName);
  const inviter = args.inviterName?.trim() || "A teammate";
  const safeInviter = escapeHtml(inviter);
  const safeRole = escapeHtml(args.role);
  const safePlatform = escapeHtml(platform.platformName);

  const subject = `${inviter} invited you to ${args.projectName} on ${platform.platformName}`;
  const html = `
<!doctype html>
<html><body style="margin:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <h1 style="font-size:20px;font-weight:600;margin:0 0 16px">You've been invited</h1>
    <div style="font-size:14px;line-height:1.6;color:#374151">
      <p><strong>${safeInviter}</strong> has invited you to join <strong>${safeProject}</strong> on ${safePlatform} as a <strong>${safeRole}</strong>.</p>
    </div>
    <p style="margin:24px 0">
      <a href="${safeUrl}" style="display:inline-block;background:#111827;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:500;font-size:14px">Accept invitation</a>
    </p>
    <p style="font-size:12px;color:#6b7280;margin:16px 0 0">
      If the button doesn't work, paste this link into your browser:<br/>
      <span style="word-break:break-all">${safeUrl}</span>
    </p>
    <hr style="margin:32px 0 16px;border:0;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#6b7280;margin:0">If you didn't expect this invitation, you can safely ignore this email.</p>
  </div>
</body></html>`;

  const result = await sendEmail({
    to: args.to,
    subject,
    html,
    audit: { kind: "invite" },
  });

  if (!result.success) {
    console.error("[email/team-invite] failed to send", {
      to: args.to,
      error: result.error,
    });
  }
  return result;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
