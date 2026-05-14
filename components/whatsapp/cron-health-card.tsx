"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Check {
  id: string;
  label: string;
  ok: boolean;
  hint: string;
}

interface HealthPayload {
  ok: boolean;
  checks: Check[];
  raw: {
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
  error?: string;
  hint?: string;
}

export function CronHealthCard() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cron/whatsapp-health", { cache: "no-store" });
      const json = (await res.json()) as HealthPayload;
      if (!res.ok) {
        setError(json.error ?? "Failed to load");
        setData(json);
      } else {
        setData(json);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const raw = data?.raw;

  return (
    <Card className="bg-white dark:bg-gray-900">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Campaign send cron</CardTitle>
          <CardDescription>
            Campaign sending runs every minute via Supabase pg_cron. If this is broken, campaigns get stuck at &quot;sending&quot; with recipients pinned at &quot;pending&quot;.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1 shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !data ? (
          <p className="text-sm text-muted-foreground">Checking…</p>
        ) : error && !data?.checks ? (
          <div className="border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-sm">
            <p className="font-medium text-red-700 dark:text-red-300">{error}</p>
            {data?.hint && <p className="text-xs text-red-700 dark:text-red-300 mt-1">{data.hint}</p>}
          </div>
        ) : data?.checks ? (
          <>
            <div
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
                data.ok
                  ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-900"
                  : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
              }`}
            >
              {data.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {data.ok ? "Cron is healthy. Campaigns will send within ~1 minute." : "Cron has issues. Campaigns may not send until fixed."}
            </div>

            <ul className="space-y-2">
              {data.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-3 text-sm">
                  {c.ok ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 dark:text-green-400 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium">{c.label}</p>
                    {!c.ok && <p className="text-xs text-muted-foreground mt-0.5">{c.hint}</p>}
                  </div>
                </li>
              ))}
            </ul>

            {raw && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-3 text-xs text-muted-foreground space-y-1 font-mono">
                {raw.endpoint_url && (
                  <p>
                    <span className="text-foreground">Endpoint:</span> {raw.endpoint_url}
                  </p>
                )}
                {raw.job_schedule && (
                  <p>
                    <span className="text-foreground">Schedule:</span> {raw.job_schedule}
                  </p>
                )}
                {raw.last_response_at && (
                  <p>
                    <span className="text-foreground">Last call:</span>{" "}
                    {new Date(raw.last_response_at).toLocaleString()} → HTTP {raw.last_response_status ?? "—"}
                  </p>
                )}
                {raw.last_success_at && (
                  <p>
                    <span className="text-foreground">Last 2xx:</span> {new Date(raw.last_success_at).toLocaleString()}
                  </p>
                )}
                {raw.last_response_body && raw.last_response_status !== null && raw.last_response_status !== undefined && raw.last_response_status >= 400 && (
                  <pre className="mt-1 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 whitespace-pre-wrap break-all">
                    {raw.last_response_body}
                  </pre>
                )}
              </div>
            )}

            {!data.ok && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Show setup SQL (run in Supabase SQL Editor)
                </summary>
                <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-auto whitespace-pre">
{`-- 1. Enable extensions (Dashboard → Database → Extensions): pg_cron, pg_net

-- 2. Apply migrations (Dashboard → SQL Editor or supabase db push):
--    supabase/migrations/20250204_cron_whatsapp_send.sql
--    supabase/migrations/20260514_cron_health.sql

-- 3. Configure the endpoint — replace YOUR_APP_URL and YOUR_CRON_SECRET:
INSERT INTO public.app_cron_config (id, endpoint_url, bearer_token)
VALUES (
  'whatsapp_send',
  'https://YOUR_APP_URL/api/cron/whatsapp-send',
  'YOUR_CRON_SECRET'
)
ON CONFLICT (id) DO UPDATE SET
  endpoint_url = EXCLUDED.endpoint_url,
  bearer_token = EXCLUDED.bearer_token,
  updated_at = now();

-- 4. Verify:
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'whatsapp-send';
SELECT * FROM public.app_cron_config WHERE id = 'whatsapp_send';
SELECT status_code, content, created FROM net._http_response ORDER BY created DESC LIMIT 5;`}
                </pre>
              </details>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
