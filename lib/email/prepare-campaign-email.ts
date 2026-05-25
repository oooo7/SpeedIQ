import {
  appendCanSpamFooter,
  buildSubscriberVariables,
  renderEmailBody,
  sanitizeEmailHtml,
} from "@/lib/email/template";
import { getUnsubscribeUrl } from "@/lib/email/unsubscribe";
import { getPlatformEmailSettings } from "@/lib/email/platform-email-settings";

interface PreparedEmail {
  subject: string;
  html: string;
  text?: string;
  unsubscribeUrl: string;
}

interface PrepareArgs {
  projectId: string;
  subscriberId: string;
  subscriberEmail: string;
  subscriberName: string | null;
  templateSubject: string;
  templateHtml: string | null;
  templateText: string | null;
}

/**
 * Render a campaign email body end-to-end: variable substitution, HTML
 * sanitization (server-side, prevents stored XSS from preview pages), and
 * a CAN-SPAM footer with unsubscribe link + physical address.
 *
 * Used by both the cron batch processor and the manual single-send endpoint
 * so they produce identical output.
 */
export async function prepareCampaignEmail(args: PrepareArgs): Promise<PreparedEmail> {
  const unsubscribeUrl = getUnsubscribeUrl(args.projectId, args.subscriberId);
  const variables = buildSubscriberVariables(
    args.subscriberName,
    args.subscriberEmail,
    unsubscribeUrl
  );

  const renderedSubject = renderEmailBody(args.templateSubject, variables);
  const renderedHtml = renderEmailBody(args.templateHtml ?? "", variables);
  const renderedText = args.templateText
    ? renderEmailBody(args.templateText, variables)
    : undefined;

  const sanitizedHtml = sanitizeEmailHtml(renderedHtml);

  const platform = await getPlatformEmailSettings();
  const finalHtml = appendCanSpamFooter(sanitizedHtml, {
    unsubscribeUrl,
    physicalAddress: platform.physicalAddress,
    platformName: platform.platformName,
    supportEmail: platform.supportEmail,
  });

  return {
    subject: renderedSubject,
    html: finalHtml,
    text: renderedText,
    unsubscribeUrl,
  };
}
