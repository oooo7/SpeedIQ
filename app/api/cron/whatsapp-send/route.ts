import { NextResponse } from "next/server";

import { whatsappCost } from "@/lib/billing/cost";
import { deductCredits, grantCredits, recordUsageEvent } from "@/lib/billing/credits";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVariableValuesForContact, getWhatsAppAccountToken, sendTemplateMessage } from "@/lib/whatsapp/api";
import { isValidPhone } from "@/lib/whatsapp/phone";

const CRON_SECRET = process.env.CRON_SECRET;
const THROTTLE_MS = 15;
const BATCH_SIZE = 50;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!CRON_SECRET || bearer !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Start scheduled campaigns whose scheduled_at time has passed (same cron run, so no extra job needed)
  const { data: dueScheduled } = await supabase
    .from("whatsapp_campaigns")
    .select("id")
    .eq("status", "scheduled")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", now);
  if (dueScheduled?.length) {
    for (const c of dueScheduled) {
      await supabase
        .from("whatsapp_campaigns")
        .update({
          status: "sending",
          started_at: now,
          updated_at: now,
        })
        .eq("id", c.id);
    }
  }

  const { data: campaigns } = await supabase
    .from("whatsapp_campaigns")
    .select("id, project_id, template_id, use_hello_world")
    .eq("status", "sending");

  if (!campaigns?.length) {
    return NextResponse.json({
      processed: 0,
      message: dueScheduled?.length ? "Started scheduled campaigns; send batches run next cron cycle" : "No campaigns in sending state",
    });
  }

  let totalSent = 0;
  let totalFailed = 0;

  for (const campaign of campaigns) {
    const useHelloWorld = !!campaign.use_hello_world;
    if (!useHelloWorld && !campaign.template_id) {
      await supabase
        .from("whatsapp_campaigns")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", campaign.id);
      continue;
    }

    const creds = await getWhatsAppAccountToken(supabase, campaign.project_id);
    if (!creds) {
      await supabase
        .from("whatsapp_campaigns")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", campaign.id);
      continue;
    }

    let templateName: string;
    let templateLanguage: string;
    let templateCategory: string | null = null;
    let fallbackVariables: string[] = [];
    let mapping: string[] | null = null;
    let hasVariables = false;

    if (useHelloWorld) {
      templateName = "hello_world";
      templateLanguage = "en";
      templateCategory = "utility";
    } else {
      const { data: template } = await supabase
        .from("whatsapp_templates")
        .select("name, language, status, variables, variable_field_mapping, category")
        .eq("id", campaign.template_id)
        .single();

      if (!template?.name) {
        await supabase
          .from("whatsapp_campaigns")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", campaign.id);
        continue;
      }
      templateName = template.name;
      templateLanguage = template.language ?? "en";
      templateCategory = (template as { category?: string | null }).category ?? null;
      fallbackVariables =
        Array.isArray(template.variables) && template.variables.length > 0
          ? (template.variables as string[]).map(String)
          : [];
      mapping = Array.isArray(template.variable_field_mapping)
        ? (template.variable_field_mapping as string[])
        : null;
      hasVariables = fallbackVariables.length > 0 || !!(mapping && mapping.length > 0);
    }

    const { credits: waCredits, type: waMessageType } = whatsappCost({
      category: templateCategory,
      useHelloWorld,
    });

    const { data: recipients } = await supabase
      .from("whatsapp_campaign_recipients")
      .select("id, contact_id, retry_count")
      .eq("campaign_id", campaign.id)
      .eq("status", "pending")
      .limit(BATCH_SIZE);

    const list = recipients ?? [];

    for (const rec of list) {
      const { data: contact } = await supabase
        .from("whatsapp_contacts")
        .select("phone, name, email, custom_fields, opt_out")
        .eq("id", rec.contact_id)
        .single();
      const phone = contact?.phone;
      const nextRetryCount = (rec.retry_count ?? 0) + 1;
      if (!phone) {
        await supabase
          .from("whatsapp_campaign_recipients")
          .update({ status: "failed", error_code: "no_phone", retry_count: nextRetryCount })
          .eq("id", rec.id);
        totalFailed++;
        continue;
      }
      if (!isValidPhone(phone)) {
        await supabase
          .from("whatsapp_campaign_recipients")
          .update({ status: "failed", error_code: "invalid_phone", retry_count: nextRetryCount })
          .eq("id", rec.id);
        totalFailed++;
        continue;
      }
      if (contact?.opt_out) {
        await supabase
          .from("whatsapp_campaign_recipients")
          .update({ status: "failed", error_code: "opt_out", retry_count: nextRetryCount })
          .eq("id", rec.id);
        totalFailed++;
        continue;
      }

      const variableValues = hasVariables
        ? getVariableValuesForContact(
            { name: contact?.name, email: contact?.email, phone: contact?.phone, custom_fields: contact?.custom_fields },
            mapping,
            fallbackVariables
          )
        : undefined;

      const balanceAfter = await deductCredits({
        client: supabase,
        projectId: campaign.project_id,
        amount: waCredits,
        reason: "whatsapp_send",
        refType: "whatsapp_campaign_recipient",
        refId: rec.id,
        metadata: { campaign_id: campaign.id, message_type: waMessageType },
      });
      if (balanceAfter === null) {
        await supabase
          .from("whatsapp_campaign_recipients")
          .update({
            status: "failed",
            error_code: "insufficient_credits",
            retry_count: nextRetryCount,
          })
          .eq("id", rec.id);
        totalFailed++;
        continue;
      }

      const result = await sendTemplateMessage(
        creds.access_token,
        creds.phone_number_id,
        phone,
        templateName,
        templateLanguage,
        {
          ...(variableValues && variableValues.length > 0 ? { variableValues } : {}),
          wabaId: creds.waba_id,
        }
      );

      if ("error" in result) {
        await supabase
          .from("whatsapp_campaign_recipients")
          .update({
            status: "failed",
            error_code: String(result.error.code ?? result.error.message?.slice(0, 100)),
            retry_count: nextRetryCount,
          })
          .eq("id", rec.id);
        // Refund credits — user shouldn't pay for a provider-side failure.
        await grantCredits({
          client: supabase,
          projectId: campaign.project_id,
          amount: waCredits,
          reason: "refund",
          refType: "whatsapp_campaign_recipient",
          refId: rec.id,
          metadata: { reason: "send_failed" },
        });
        totalFailed++;
      } else {
        const nowIso = new Date().toISOString();
        await Promise.all([
          supabase
            .from("whatsapp_campaign_recipients")
            .update({
              status: "sent",
              sent_at: nowIso,
              meta_message_id: result.message_id,
              retry_count: nextRetryCount,
            })
            .eq("id", rec.id),
          // Record in chat history so the message appears in the live chat
          supabase.from("whatsapp_messages").insert({
            project_id: campaign.project_id,
            contact_id: rec.contact_id,
            direction: "out",
            type: "text",
            body: `Template: ${templateName}`,
            meta_message_id: result.message_id,
            status: "sent",
          }),
          // Ensure conversation record exists / update last_message_at
          supabase.from("whatsapp_conversations").upsert(
            {
              project_id: campaign.project_id,
              contact_id: rec.contact_id,
              last_message_at: nowIso,
              updated_at: nowIso,
              unread_count: 0,
            },
            { onConflict: "project_id,contact_id", ignoreDuplicates: false }
          ),
          recordUsageEvent({
            client: supabase,
            projectId: campaign.project_id,
            channel: "whatsapp",
            messageType: waMessageType,
            recipientId: rec.contact_id,
            campaignId: campaign.id,
            creditsCharged: waCredits,
            providerMessageId: result.message_id,
            status: "sent",
          }),
        ]);
        totalSent++;
      }

      await new Promise((r) => setTimeout(r, THROTTLE_MS));
    }

    const { count: pendingCount } = await supabase
      .from("whatsapp_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("status", "pending");
    if ((pendingCount ?? 0) === 0) {
      const [{ count: sentCount }, { count: failedCount }] = await Promise.all([
        supabase
          .from("whatsapp_campaign_recipients")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)
          .in("status", ["sent", "delivered", "read"]),
        supabase
          .from("whatsapp_campaign_recipients")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)
          .eq("status", "failed"),
      ]);
      // Only mark as "failed" if every single recipient failed (none sent)
      const finalStatus = (sentCount ?? 0) === 0 && (failedCount ?? 0) > 0 ? "failed" : "completed";
      await supabase
        .from("whatsapp_campaigns")
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);
    }
  }

  return NextResponse.json({
    processed: totalSent + totalFailed,
    sent: totalSent,
    failed: totalFailed,
  });
}
