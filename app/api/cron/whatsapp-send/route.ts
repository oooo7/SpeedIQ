import { NextResponse } from "next/server";

import { whatsappCost } from "@/lib/billing/cost";
import { deductCredits, grantCredits, recordUsageEvent } from "@/lib/billing/credits";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getVariableValuesForContact,
  getWhatsAppAccountToken,
  resolveHeaderMediaForSend,
  sendTemplateMessage,
  type TemplateHeaderMedia,
} from "@/lib/whatsapp/api";
import { isValidPhone } from "@/lib/whatsapp/phone";

const CRON_SECRET = process.env.CRON_SECRET;

// Tunable per deployment. Defaults chosen to safely fit inside Vercel's 60s
// function timeout while staying well under Meta's 80 sends/sec/phone limit:
//   BATCH_SIZE × ~latency / CONCURRENCY ≪ 60s
//   500 × 0.5s / 20 = 12.5s of API work per batch
const BATCH_SIZE = Number(process.env.WHATSAPP_SEND_BATCH_SIZE) || 500;
const CONCURRENCY = Number(process.env.WHATSAPP_SEND_CONCURRENCY) || 20;
// After this many attempts a stuck-pending row gets marked failed so the
// campaign can eventually complete. Caps the cost of consistent transient
// errors (e.g., bad phone normalizer, Meta-side outage on a single number).
const MAX_RETRIES = 5;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Run `worker` over `items` with at most `limit` running at once. Replaces a
 * strict sequential loop + sleep throttle — each worker pulls the next item
 * as soon as it's free, so the network/API is kept busy without ever
 * exceeding the concurrency cap.
 */
async function runInPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      try {
        await worker(items[idx]);
      } catch (err) {
        // Workers must never throw — that would kill the pool. Each worker
        // is responsible for catching its own errors and recording them on
        // the recipient row.
        console.error("[whatsapp-send] worker error", err);
      }
    }
  });
  await Promise.all(workers);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!CRON_SECRET || bearer !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Auto-fail campaigns stuck in "sending" for >30 minutes with no pending recipients
  // being processed — safety net for cron outages that have since recovered, so the
  // campaign doesn't sit at "sending" forever after the user has already given up on it.
  const stuckCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: stuckCampaigns } = await supabase
    .from("whatsapp_campaigns")
    .select("id")
    .eq("status", "sending")
    .lte("updated_at", stuckCutoff);
  if (stuckCampaigns?.length) {
    for (const c of stuckCampaigns) {
      const { count: pendingCount } = await supabase
        .from("whatsapp_campaign_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", c.id)
        .eq("status", "pending");
      if ((pendingCount ?? 0) === 0) {
        const [{ count: sentCount }, { count: failedCount }] = await Promise.all([
          supabase
            .from("whatsapp_campaign_recipients")
            .select("id", { count: "exact", head: true })
            .eq("campaign_id", c.id)
            .in("status", ["sent", "delivered", "read"]),
          supabase
            .from("whatsapp_campaign_recipients")
            .select("id", { count: "exact", head: true })
            .eq("campaign_id", c.id)
            .eq("status", "failed"),
        ]);
        const finalStatus = (sentCount ?? 0) === 0 && (failedCount ?? 0) > 0 ? "failed" : "completed";
        await supabase
          .from("whatsapp_campaigns")
          .update({ status: finalStatus, completed_at: now, updated_at: now })
          .eq("id", c.id);
      }
    }
  }

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
    const { data: projectSettings } = await supabase
      .from("whatsapp_account_settings")
      .select("respect_opt_out_for_campaigns")
      .eq("project_id", campaign.project_id)
      .maybeSingle();
    const respectOptOut = projectSettings?.respect_opt_out_for_campaigns !== false; // default true

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
    let headerMedia: TemplateHeaderMedia | null = null;

    if (useHelloWorld) {
      templateName = "hello_world";
      templateLanguage = "en";
      templateCategory = "utility";
    } else {
      const { data: template } = await supabase
        .from("whatsapp_templates")
        .select("name, language, status, variables, variable_field_mapping, category, header_format, header_media_url")
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
      headerMedia = await resolveHeaderMediaForSend(
        supabase,
        (template as { header_format?: string | null }).header_format,
        (template as { header_media_url?: string | null }).header_media_url
      );
    }

    const { credits: waCredits, type: waMessageType } = whatsappCost({
      category: templateCategory,
      useHelloWorld,
    });

    // Step 1: bulk-mark any pending rows that have exceeded MAX_RETRIES as
    // failed. Without this they sit pending forever and the campaign never
    // reaches "completed".
    await supabase
      .from("whatsapp_campaign_recipients")
      .update({ status: "failed", error_code: "max_retries_exceeded", updated_at: new Date().toISOString() })
      .eq("campaign_id", campaign.id)
      .eq("status", "pending")
      .gte("retry_count", MAX_RETRIES);

    // Step 2: pick the next batch. Only rows that haven't exhausted retries.
    // (Postgres `<` against NULL is NULL/false, so we have to OR in IS NULL.)
    const { data: recipients } = await supabase
      .from("whatsapp_campaign_recipients")
      .select("id, contact_id, retry_count")
      .eq("campaign_id", campaign.id)
      .eq("status", "pending")
      .or(`retry_count.is.null,retry_count.lt.${MAX_RETRIES}`)
      .limit(BATCH_SIZE);

    const list = recipients ?? [];

    if (list.length === 0) {
      // No work for this campaign; let the completion check below run.
    } else {
      // ----------------------------------------------------------------------
      // Bulk-fetch every contact in this batch up front. Replaces 500 sequential
      // SELECTs with 1, which alone saves ~10s per batch.
      // ----------------------------------------------------------------------
      const contactIds = list.map((r) => r.contact_id);
      const { data: contactRows } = await supabase
        .from("whatsapp_contacts")
        .select("id, phone, name, email, custom_fields, opt_out")
        .in("id", contactIds);
      const contactMap = new Map<
        string,
        { phone: string | null; name: string | null; email: string | null; custom_fields: Record<string, unknown> | null; opt_out: boolean | null }
      >();
      for (const c of contactRows ?? []) {
        if (typeof c.id === "string") {
          contactMap.set(c.id, {
            phone: (c as { phone?: string | null }).phone ?? null,
            name: (c as { name?: string | null }).name ?? null,
            email: (c as { email?: string | null }).email ?? null,
            custom_fields: (c as { custom_fields?: Record<string, unknown> | null }).custom_fields ?? null,
            opt_out: (c as { opt_out?: boolean | null }).opt_out ?? null,
          });
        }
      }

      let batchSent = 0;
      let batchFailed = 0;

      await runInPool(list, CONCURRENCY, async (rec) => {
        const contact = contactMap.get(rec.contact_id) ?? null;
        const phone = contact?.phone ?? null;
        const prevRetryCount = rec.retry_count ?? 0;
        const nextRetryCount = prevRetryCount + 1;

        // Atomic claim: bump retry_count only if the row is still pending and
        // retry_count is still what we read. If 0 rows match, another worker
        // or an overlapping cron tick already grabbed this row — skip.
        // This also guarantees retry_count is incremented even if the worker
        // crashes mid-flight, so consistent transient errors can't loop.
        const claimQuery = supabase
          .from("whatsapp_campaign_recipients")
          .update({ retry_count: nextRetryCount, updated_at: new Date().toISOString() })
          .eq("id", rec.id)
          .eq("status", "pending");
        const { data: claimed } =
          prevRetryCount === 0
            ? await claimQuery.is("retry_count", null).select("id")
            : await claimQuery.eq("retry_count", prevRetryCount).select("id");
        if (!claimed || claimed.length === 0) return;

        if (!phone) {
          await supabase
            .from("whatsapp_campaign_recipients")
            .update({ status: "failed", error_code: "no_phone", retry_count: nextRetryCount })
            .eq("id", rec.id);
          batchFailed++;
          return;
        }
        if (!isValidPhone(phone)) {
          await supabase
            .from("whatsapp_campaign_recipients")
            .update({ status: "failed", error_code: "invalid_phone", retry_count: nextRetryCount })
            .eq("id", rec.id);
          batchFailed++;
          return;
        }
        if (contact?.opt_out && respectOptOut) {
          await supabase
            .from("whatsapp_campaign_recipients")
            .update({ status: "failed", error_code: "opt_out", retry_count: nextRetryCount })
            .eq("id", rec.id);
          batchFailed++;
          return;
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
          batchFailed++;
          return;
        }

        const result = await sendTemplateMessage(
          creds.access_token,
          creds.phone_number_id,
          phone,
          templateName,
          templateLanguage,
          {
            ...(variableValues && variableValues.length > 0 ? { variableValues } : {}),
            ...(headerMedia ? { headerMedia } : {}),
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
          batchFailed++;
          return;
        }

        const nowIso = new Date().toISOString();
        const { error: recipientUpdateError } = await supabase
          .from("whatsapp_campaign_recipients")
          .update({
            status: "sent",
            sent_at: nowIso,
            meta_message_id: result.message_id,
            retry_count: nextRetryCount,
          })
          .eq("id", rec.id);
        if (recipientUpdateError) {
          console.error("[whatsapp-send] recipient status update failed", { recipientId: rec.id, error: recipientUpdateError.message });
        }

        // Auxiliary writes — log errors but don't block other recipients.
        const auxResults = await Promise.allSettled([
          supabase.from("whatsapp_messages").insert({
            project_id: campaign.project_id,
            contact_id: rec.contact_id,
            direction: "out",
            type: "text",
            body: `Template: ${templateName}`,
            meta_message_id: result.message_id,
            status: "sent",
            template_id: campaign.template_id ?? null,
          }),
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
        for (const r of auxResults) {
          if (r.status === "rejected") {
            console.error("[whatsapp-send] auxiliary write failed", { recipientId: rec.id, reason: r.reason });
          }
        }
        batchSent++;
      });

      totalSent += batchSent;
      totalFailed += batchFailed;
    }

    // Only run the (somewhat expensive) completion-check COUNT queries when
    // the batch wasn't full — a full batch means there's almost certainly
    // more pending work, no need to ask the DB.
    if (list.length < BATCH_SIZE) {
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
  }

  return NextResponse.json({
    processed: totalSent + totalFailed,
    sent: totalSent,
    failed: totalFailed,
    batch_size: BATCH_SIZE,
    concurrency: CONCURRENCY,
  });
}
