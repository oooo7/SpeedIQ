import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

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
