import nodemailer from "nodemailer";
import { Resend } from "resend";

import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_FROM = process.env.EMAIL_FROM ?? "notifications@resend.dev";

// Provider: "smtp" if EMAIL_PROVIDER=smtp or SMTP_HOST is set; otherwise "resend"
function getProvider(): "smtp" | "resend" {
  const explicit = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (explicit === "smtp" || process.env.SMTP_HOST) return "smtp";
  return "resend";
}

const provider = getProvider();

const resend =
  provider === "resend" && process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

const smtpTransport =
  provider === "smtp" && process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? "587", 10),
        secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
      })
    : null;

export type EmailKind =
  | "campaign"
  | "transactional"
  | "billing"
  | "test"
  | "invite"
  | "auth"
  | "other";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Override global EMAIL_FROM when set */
  from?: string;
  /**
   * If set, RFC 8058 List-Unsubscribe + List-Unsubscribe-Post headers are
   * added so Gmail/Yahoo show a one-click unsubscribe link.
   */
  listUnsubscribeUrl?: string;
  /** Extra raw headers (e.g. for special tracking). */
  headers?: Record<string, string>;
  /**
   * Categorization for the email_sends audit log. Skip the audit log
   * entirely with audit=false (used for the audit-log-fallback path itself).
   */
  audit?:
    | false
    | {
        kind: EmailKind;
        projectId?: string | null;
        refId?: string | null;
      };
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/** Shown when Resend returns domain-not-verified. Used so UI can show link to settings. */
export const DOMAIN_NOT_VERIFIED_MESSAGE =
  "Your sending domain is not verified yet. Go to Email settings, copy the DNS records, add them to your domain DNS, then click Verify again.";

function isDomainNotVerifiedError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    (lower.includes("domain") && lower.includes("not verified")) ||
    (lower.includes("not verified") && lower.includes("resend.com"))
  );
}

function buildHeaders(opts: SendEmailOptions): Record<string, string> | undefined {
  const headers: Record<string, string> = {};
  if (opts.listUnsubscribeUrl) {
    // RFC 8058 — one-click unsubscribe. Gmail/Yahoo bulk-sender requirement.
    headers["List-Unsubscribe"] = `<${opts.listUnsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  if (opts.headers) {
    for (const [k, v] of Object.entries(opts.headers)) headers[k] = v;
  }
  return Object.keys(headers).length ? headers : undefined;
}

async function sendViaResend(
  client: Resend | null,
  fromAddress: string,
  opts: SendEmailOptions
): Promise<SendEmailResult> {
  const { to, subject, html, text, replyTo } = opts;
  if (!client) {
    return { success: false, error: "Resend is not configured" };
  }
  try {
    const { data, error } = await client.emails.send({
      from: fromAddress,
      to: [to],
      subject,
      html,
      text: text ?? undefined,
      replyTo: replyTo ?? undefined,
      headers: buildHeaders(opts),
    });
    if (error) {
      const msg = error.message ?? "";
      return {
        success: false,
        error: isDomainNotVerifiedError(msg) ? DOMAIN_NOT_VERIFIED_MESSAGE : msg,
      };
    }
    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: isDomainNotVerifiedError(message) ? DOMAIN_NOT_VERIFIED_MESSAGE : message,
    };
  }
}

async function sendViaSmtp(
  transport: nodemailer.Transporter | null,
  fromAddress: string,
  opts: SendEmailOptions
): Promise<SendEmailResult> {
  const { to, subject, html, text, replyTo } = opts;
  if (!transport) {
    return { success: false, error: "SMTP is not configured" };
  }
  try {
    const info = await transport.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text: text ?? undefined,
      replyTo: replyTo ?? undefined,
      headers: buildHeaders(opts),
    });
    return { success: true, messageId: info.messageId ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

async function logEmailSend(
  opts: SendEmailOptions,
  fromAddress: string,
  result: SendEmailResult
): Promise<void> {
  if (opts.audit === false) return;
  const audit = opts.audit ?? { kind: "other" as EmailKind };
  try {
    const admin = createAdminClient();
    await admin.from("email_sends").insert({
      project_id: audit.projectId ?? null,
      kind: audit.kind,
      ref_id: audit.refId ?? null,
      recipient_email: opts.to,
      from_email: fromAddress,
      subject: opts.subject,
      provider,
      provider_message_id: result.messageId ?? null,
      status: result.success ? "sent" : "failed",
      error_message: result.success ? null : (result.error ?? "").slice(0, 500),
    });
  } catch (err) {
    // Audit logging must never break the actual send.
    console.error("[email/audit] failed to write email_sends", err);
  }
}

/**
 * Send an email via the configured provider (Resend or SMTP).
 * Uses global config; optional options.from overrides EMAIL_FROM.
 * Every send (including failures) is logged to email_sends unless audit=false.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const fromAddress = options.from ?? EMAIL_FROM;
  const result =
    provider === "smtp"
      ? await sendViaSmtp(smtpTransport, fromAddress, options)
      : await sendViaResend(resend, fromAddress, options);
  await logEmailSend(options, fromAddress, result);
  return result;
}

/**
 * Send email for a project. Uses platform Resend/SMTP only.
 * From address: project's verified from_email, or fallback {projectId}@EMAIL_FALLBACK_DOMAIN.
 * Audit log gets the projectId attached automatically.
 */
export async function sendEmailForProject(
  projectId: string,
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const {
    getProjectEmailSettingsForSend,
    getEffectiveFromAddress,
  } = await import("@/lib/email/project-settings");
  const settings = await getProjectEmailSettingsForSend(projectId);
  const fromAddress = getEffectiveFromAddress(settings, projectId);

  const audit = options.audit === false
    ? false
    : { ...(options.audit ?? { kind: "other" as EmailKind }), projectId };

  return sendEmail({ ...options, from: fromAddress, audit });
}
