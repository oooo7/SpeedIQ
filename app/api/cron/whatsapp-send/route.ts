import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getVariableValuesForContact, getWhatsAppAccountToken, sendTemplateMessage } from "@/lib/whatsapp/api";

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
    let fallbackVariables: string[] = [];
    let mapping: string[] | null = null;
    let hasVariables = false;

    if (useHelloWorld) {
      templateName = "hello_world";
      templateLanguage = "en";
    } else {
      const { data: template } = await supabase
        .from("whatsapp_templates")
        .select("name, language, status, variables, variable_field_mapping")
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
      fallbackVariables =
        Array.isArray(template.variables) && template.variables.length > 0
          ? (template.variables as string[]).map(String)
          : [];
      mapping = Array.isArray(template.variable_field_mapping)
        ? (template.variable_field_mapping as string[])
        : null;
      hasVariables = fallbackVariables.length > 0 || !!(mapping && mapping.length > 0);
    }

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
        totalFailed++;
      } else {
        await supabase
          .from("whatsapp_campaign_recipients")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            meta_message_id: result.message_id,
            retry_count: nextRetryCount,
          })
          .eq("id", rec.id);
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
      const { count: failedCount } = await supabase
        .from("whatsapp_campaign_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .eq("status", "failed");
      const finalStatus = (failedCount ?? 0) > 0 ? "failed" : "completed";
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
