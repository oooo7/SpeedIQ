"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface HealthPayload {
  ok: boolean;
}

export function CronHealthCard() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cron/whatsapp-health", { cache: "no-store" });
      const json = (await res.json()) as HealthPayload;
      setData(json);
    } catch {
      setData({ ok: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="bg-white dark:bg-gray-900">
      <CardContent className="py-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking campaign sending…
          </div>
        ) : data?.ok ? (
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            Campaign sending is working. New campaigns are delivered within ~1 minute.
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            Campaign sending is currently unavailable. Please contact support if this persists.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
