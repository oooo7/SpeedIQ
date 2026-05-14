import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Health check for the WhatsApp send cron pipeline.
 * Surfaces whether pg_cron is scheduled, app_cron_config is populated,
 * and pg_net is actually reaching the Next.js endpoint.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_cron_health", { p_job_id: "whatsapp_send" });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        hint:
          "Run the migration supabase/migrations/20260514_cron_health.sql and confirm pg_cron + pg_net are enabled in the Supabase Dashboard (Database → Extensions).",
      },
      { status: 500 }
    );
  }

  const h = (data ?? {}) as {
    job_scheduled?: boolean;
    job_active?: boolean;
    job_schedule?: string | null;
    config_present?: boolean;
    endpoint_url?: string | null;
    config_updated_at?: string | null;
    last_response_status?: number | null;
    last_response_at?: string | null;
    last_response_body?: string | null;
    last_success_at?: string | null;
    checked_at?: string;
  };

  const checks = [
    {
      id: "extension",
      label: "pg_cron extension reachable",
      ok: h.job_scheduled !== undefined,
      hint: "Enable pg_cron and pg_net in Supabase Dashboard → Database → Extensions.",
    },
    {
      id: "schedule",
      label: "Cron job 'whatsapp-send' scheduled",
      ok: !!h.job_scheduled && !!h.job_active,
      hint:
        "Apply migration supabase/migrations/20250204_cron_whatsapp_send.sql, or run: SELECT cron.schedule('whatsapp-send','* * * * *',$$select public.invoke_whatsapp_send_cron()$$);",
    },
    {
      id: "config",
      label: "app_cron_config row for 'whatsapp_send' present",
      ok: !!h.config_present && !!h.endpoint_url,
      hint:
        "Insert your app URL + CRON_SECRET into app_cron_config — see docs/cron-supabase.md.",
    },
    {
      id: "response",
      label: "Most recent cron call to the app",
      ok: typeof h.last_response_status === "number" && h.last_response_status >= 200 && h.last_response_status < 300,
      hint:
        h.last_response_status === 401
          ? "Last call returned 401 — bearer_token in app_cron_config doesn't match CRON_SECRET env var in Next.js."
          : h.last_response_status == null
            ? "No pg_net response logged yet. Wait one minute, or check pg_net is enabled."
            : `Last call returned HTTP ${h.last_response_status}. See response body below.`,
    },
  ];

  const healthy = checks.every((c) => c.ok);

  return NextResponse.json({
    ok: healthy,
    checks,
    raw: h,
  });
}
