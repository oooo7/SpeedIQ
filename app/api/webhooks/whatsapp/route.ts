import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureCannedMessageBucket } from "@/lib/supabase/canned-messages-storage";
import { getWhatsAppAccountToken, sendMediaMessage, sendTextMessage } from "@/lib/whatsapp/api";
import type { MediaMessageType } from "@/lib/whatsapp/api";

const WHATSAPP_SETTINGS_BUCKET = "canned-message-attachments";
const SIGNED_URL_EXPIRY = 3600;

type WorkingHoursDay = { enabled: boolean; from?: string; to?: string };
type WorkingHoursMap = Record<string, WorkingHoursDay>;

/** Check if current time in given timezone is within working hours. */
function isWithinWorkingHours(timezone: string, workingHours: WorkingHoursMap): boolean {
  if (!timezone || typeof workingHours !== "object" || Object.keys(workingHours).length === 0) {
    return true;
  }
  try {
    const dayName = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long" })
      .format(new Date())
      .toLowerCase();
    const day = workingHours[dayName];
    if (!day || !day.enabled || !day.from || !day.to) return false;
    const time = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(new Date())
      .replace(/\D/g, "")
      .slice(0, 4)
      .padStart(4, "0");
    const from = (day.from ?? "").replace(/\D/g, "").slice(0, 4).padStart(4, "0");
    const to = (day.to ?? "").replace(/\D/g, "").slice(0, 4).padStart(4, "0");
    if (!from || !to) return false;
    return time >= from && time <= to;
  } catch {
    return true;
  }
}

// Must match the "Verify token" value you set in Meta App Dashboard → WhatsApp → Configuration → Webhook.
// Set this in Vercel: Project → Settings → Environment Variables → WHATSAPP_VERIFY_TOKEN
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Meta sends GET with hub.mode=subscribe, hub.verify_token=<your token>, hub.challenge=<string to echo>
  if (mode === "subscribe" && typeof challenge === "string" && challenge.length > 0) {
    if (VERIFY_TOKEN && token === VERIFY_TOKEN) {
      return new NextResponse(challenge, {
        headers: { "Content-Type": "text/plain" },
      });
    }
    // Token missing or mismatch: verification fails (e.g. WHATSAPP_VERIFY_TOKEN not set in Vercel)
  }

  // No query params = e.g. opening URL in browser; 403 is expected
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ error: "Invalid object" }, { status: 400 });
  }

  const entries = (body.entry ?? []) as Array<{
    id: string;
    changes?: Array<{
      value?: {
        messaging_product?: string;
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          id: string;
          from: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          image?: { id: string; caption?: string };
          document?: { id: string; caption?: string };
          audio?: { id: string };
          video?: { id: string; caption?: string };
        }>;
        statuses?: Array<{
          id: string;
          recipient_id: string;
          status: string;
          timestamp: string;
        }>;
        errors?: Array<{ code: number; title: string }>;
      };
      field?: string;
    }>;
  }>;

  const supabase = createAdminClient();

  for (const entry of entries) {
    const changes = entry.changes ?? [];
    for (const change of changes) {
      if (change.field === "message_template_status_update") {
        const value = change.value as {
          event?: string;
          message_template_id?: number | string;
          reason?: string;
          rejection_info?: { reason?: string; recommendation?: string };
        } | undefined;
        if (!value?.message_template_id) continue;
        const metaId = String(value.message_template_id);
        const event = (value.event ?? "").toLowerCase();
        const status =
          event === "approved"
            ? "approved"
            : event === "rejected"
              ? "rejected"
              : event === "pending"
                ? "pending"
                : event === "disabled" || event === "paused"
                  ? "disabled"
                  : null;
        if (status) {
          const rejectionReason =
            status === "rejected"
              ? value.rejection_info?.reason ?? value.reason ?? "Rejected by Meta"
              : null;
          await supabase
            .from("whatsapp_templates")
            .update({
              status,
              rejection_reason: status === "approved" ? null : rejectionReason,
              updated_at: new Date().toISOString(),
            })
            .eq("meta_template_id", metaId);
        }
        continue;
      }
      if (change.field !== "messages") continue;
      const value = change.value;
      if (!value || value.messaging_product !== "whatsapp") continue;

      const phone_number_id = value.metadata?.phone_number_id;
      if (!phone_number_id) continue;

      const { data: account } = await supabase
        .from("whatsapp_accounts")
        .select("project_id")
        .eq("phone_number_id", phone_number_id)
        .maybeSingle();

      if (!account?.project_id) continue;

      const project_id = account.project_id;

      const contactsList = (value.contacts ?? []) as Array<{ profile?: { name?: string }; wa_id?: string }>;
      const contactNameByWaId: Record<string, string> = {};
      for (const c of contactsList) {
        if (c.wa_id && c.profile?.name?.trim()) {
          contactNameByWaId[c.wa_id] = c.profile.name.trim().slice(0, 255);
        }
      }

      const { data: settingsRow } = await supabase
        .from("whatsapp_account_settings")
        .select("*")
        .eq("project_id", project_id)
        .maybeSingle();
      const settings = settingsRow ?? null;
      const creds = await getWhatsAppAccountToken(supabase, project_id);

      if (value.messages) {
        for (const msg of value.messages) {
          const meta_message_id = msg.id;
          const { data: existing } = await supabase
            .from("whatsapp_messages")
            .select("id")
            .eq("meta_message_id", meta_message_id)
            .maybeSingle();
          if (existing) continue;

          const from_wa = msg.from;
          const incomingName = contactNameByWaId[from_wa] ?? null;
          const { data: contact } = await supabase
            .from("whatsapp_contacts")
            .select("id")
            .eq("project_id", project_id)
            .eq("phone", from_wa)
            .maybeSingle();

          let contact_id: string;
          if (contact?.id) {
            contact_id = contact.id;
            await supabase
              .from("whatsapp_contacts")
              .update({
                ...(incomingName ? { name: incomingName } : {}),
                last_inbound_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", contact_id);
          } else {
            const { data: newContact } = await supabase
              .from("whatsapp_contacts")
              .insert({
                project_id,
                phone: from_wa,
                name: incomingName,
                source: "campaign",
                last_inbound_at: new Date().toISOString(),
              })
              .select("id")
              .single();
            contact_id = newContact?.id;
            if (!contact_id) continue;
          }

          const type = msg.type ?? "text";
          const body =
            msg.text?.body ??
            (msg.image?.caption || msg.document?.caption || msg.video?.caption) ??
            null;

          await supabase.from("whatsapp_messages").insert({
            project_id,
            contact_id,
            direction: "in",
            type,
            body,
            meta_message_id,
            meta_timestamp: msg.timestamp,
            status: "sent",
          });

          const ts = new Date().toISOString();
          const { data: existingConv } = await supabase
            .from("whatsapp_conversations")
            .select("id, unread_count")
            .eq("project_id", project_id)
            .eq("contact_id", contact_id)
            .maybeSingle();
          if (existingConv) {
            await supabase
              .from("whatsapp_conversations")
              .update({
                last_message_at: ts,
                updated_at: ts,
                unread_count: (existingConv.unread_count ?? 0) + 1,
              })
              .eq("id", existingConv.id);
          } else {
            await supabase.from("whatsapp_conversations").insert({
              project_id,
              contact_id,
              last_message_at: ts,
              updated_at: ts,
              unread_count: 1,
            });
          }

          if (settings && creds && type === "text" && typeof body === "string" && body.trim()) {
            const normalized = body.trim().toLowerCase();
            const optOutKeywords = (settings.opt_out_keywords ?? []) as string[];
            const optInKeywords = (settings.opt_in_keywords ?? []) as string[];
            const optOutMatch = optOutKeywords.some((k) => String(k).trim().toLowerCase() === normalized);
            const optInMatch = optInKeywords.some((k) => String(k).trim().toLowerCase() === normalized);

            type ResponseMessage = {
              type: string;
              text?: string | null;
              attachment_path?: string | null;
              attachment_filename?: string | null;
            };
            const maybeSendResponse = async (msg: ResponseMessage): Promise<void> => {
              const mType = (msg.type ?? "text") as string;
              const isText = mType === "text";
              const hasContent = isText
                ? !!msg.text?.trim()
                : !!msg.attachment_path?.trim();
              if (!hasContent) return;
              let result: { message_id: string } | { error: { message: string } };
              let outType = "text";
              let outBody: string | null = null;
              if (isText) {
                result = await sendTextMessage(creds.access_token, creds.phone_number_id, from_wa, msg.text!.trim());
                outBody = msg.text!.trim();
              } else {
                try {
                  await ensureCannedMessageBucket(supabase);
                  const { data: signed } = await supabase.storage
                    .from(WHATSAPP_SETTINGS_BUCKET)
                    .createSignedUrl(msg.attachment_path!.trim(), SIGNED_URL_EXPIRY);
                  if (!signed?.signedUrl) return;
                  const metaType: MediaMessageType = mType === "file" ? "document" : (mType as MediaMessageType);
                  result = await sendMediaMessage(
                    creds.access_token,
                    creds.phone_number_id,
                    from_wa,
                    metaType,
                    signed.signedUrl,
                    {
                      caption: msg.text?.trim() || undefined,
                      filename: mType === "file" ? (msg.attachment_filename ?? undefined) : undefined,
                    }
                  );
                  outType = mType;
                  outBody = msg.text?.trim() ?? null;
                } catch {
                  return;
                }
              }
              if (result && "message_id" in result) {
                await supabase.from("whatsapp_messages").insert({
                  project_id,
                  contact_id,
                  direction: "out",
                  type: outType,
                  body: outBody,
                  meta_message_id: result.message_id,
                  meta_timestamp: String(Date.now()),
                  status: "sent",
                });
              }
            };

            const optOutMsg: ResponseMessage = {
              type: (settings.opt_out_response_type as string) ?? "text",
              text: settings.opt_out_response_text,
              attachment_path: (settings as { opt_out_response_attachment_path?: string }).opt_out_response_attachment_path,
              attachment_filename: (settings as { opt_out_response_attachment_filename?: string }).opt_out_response_attachment_filename,
            };
            const optInMsg: ResponseMessage = {
              type: (settings.opt_in_response_type as string) ?? "text",
              text: settings.opt_in_response_text,
              attachment_path: (settings as { opt_in_response_attachment_path?: string }).opt_in_response_attachment_path,
              attachment_filename: (settings as { opt_in_response_attachment_filename?: string }).opt_in_response_attachment_filename,
            };
            const welcomeMsg: ResponseMessage = {
              type: (settings.welcome_message_type as string) ?? "text",
              text: settings.welcome_message_text,
              attachment_path: (settings as { welcome_message_attachment_path?: string }).welcome_message_attachment_path,
              attachment_filename: (settings as { welcome_message_attachment_filename?: string }).welcome_message_attachment_filename,
            };
            const offHoursMsg: ResponseMessage = {
              type: (settings.off_hours_message_type as string) ?? "text",
              text: settings.off_hours_message_text,
              attachment_path: (settings as { off_hours_message_attachment_path?: string }).off_hours_message_attachment_path,
              attachment_filename: (settings as { off_hours_message_attachment_filename?: string }).off_hours_message_attachment_filename,
            };

            if (optOutMatch) {
              await supabase
                .from("whatsapp_contacts")
                .update({ opt_out: true, updated_at: new Date().toISOString() })
                .eq("id", contact_id);
              if (settings.opt_out_response_enabled) await maybeSendResponse(optOutMsg);
            } else if (optInMatch) {
              await supabase
                .from("whatsapp_contacts")
                .update({ opt_out: false, updated_at: new Date().toISOString() })
                .eq("id", contact_id);
              if (settings.opt_in_response_enabled) await maybeSendResponse(optInMsg);
            }
            const { count: inboundCount } = await supabase
              .from("whatsapp_messages")
              .select("id", { count: "exact", head: true })
              .eq("project_id", project_id)
              .eq("contact_id", contact_id)
              .eq("direction", "in");
            const isFirstInbound = inboundCount === 1;
            if (isFirstInbound) {
              const workingHours = (settings.working_hours as WorkingHoursMap) ?? {};
              const within = isWithinWorkingHours(settings.timezone ?? "UTC", workingHours);
              if (within && settings.welcome_message_enabled) await maybeSendResponse(welcomeMsg);
              else if (!within && settings.off_hours_message_enabled) await maybeSendResponse(offHoursMsg);
            }
          }
        }
      }

      if (value.statuses) {
        for (const status of value.statuses) {
          await supabase
            .from("whatsapp_messages")
            .update({ status: status.status })
            .eq("meta_message_id", status.id);
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}
