import nodemailer from "nodemailer";
import { Resend } from "resend";

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

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Override global EMAIL_FROM when set */
  from?: string;
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
    });
    return { success: true, messageId: info.messageId ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Send an email via the configured provider (Resend or SMTP).
 * Uses global config; optional options.from overrides EMAIL_FROM.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const fromAddress = options.from ?? EMAIL_FROM;
  if (provider === "smtp") return sendViaSmtp(smtpTransport, fromAddress, options);
  return sendViaResend(resend, fromAddress, options);
}

/**
 * Send email for a project. Uses platform Resend/SMTP only.
 * From address: project's verified from_email, or fallback {projectId}@EMAIL_FALLBACK_DOMAIN.
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
  return sendEmail({ ...options, from: fromAddress });
}
