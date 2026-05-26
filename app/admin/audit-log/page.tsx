"use client";

import { useCallback, useEffect, useState } from "react";

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface AuditRow {
  id: number;
  actor_id: string;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  before: unknown;
  after: unknown;
  notes: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

export default function AdminAuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterTargetType, setFilterTargetType] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`${window.location.origin}/api/admin/audit-log`);
      url.searchParams.set("page", String(page));
      if (filterAction) url.searchParams.set("action", filterAction);
      if (filterTargetType) url.searchParams.set("target_type", filterTargetType);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { rows: AuditRow[]; total: number };
      setRows(json.rows);
      setTotal(json.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterTargetType]);

  useEffect(() => {
    load();
  }, [load]);

  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-medium tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every change made by a platform admin. Append-only.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <Label className="text-xs">Action contains</Label>
            <Input
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(0);
              }}
              placeholder="plan.update"
            />
          </div>
          <div>
            <Label className="text-xs">Target type</Label>
            <select
              value={filterTargetType}
              onChange={(e) => {
                setFilterTargetType(e.target.value);
                setPage(0);
              }}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="plan">Plan</option>
              <option value="credit_pack">Credit pack</option>
              <option value="credit_weight">Credit weight</option>
              <option value="platform_setting">Platform setting</option>
              <option value="user">User</option>
              <option value="wallet">Wallet</option>
              <option value="subscription">Subscription</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No entries.</p>
          ) : (
            <div className="flex flex-col">
              {rows.map((r) => {
                const isOpen = expanded === r.id;
                return (
                  <div key={r.id} className="border-b border-muted/60 last:border-0">
                    <button
                      className="grid w-full grid-cols-12 items-center gap-3 py-3 text-left text-sm hover:bg-muted/40"
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                    >
                      <span className="col-span-2 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="col-span-3 truncate text-xs">{r.actor_email ?? r.actor_id.slice(0, 8)}</span>
                      <span className="col-span-3">
                        <Badge variant="outline" className="font-mono text-xs font-normal">
                          {r.action}
                        </Badge>
                      </span>
                      <span className="col-span-2 truncate text-xs text-muted-foreground">
                        {r.target_type}
                        {r.target_id && ` · ${r.target_id.slice(0, 12)}`}
                      </span>
                      <span className="col-span-2 truncate text-xs text-muted-foreground">{r.notes ?? ""}</span>
                    </button>
                    {isOpen && (
                      <div className="grid grid-cols-1 gap-3 border-t border-muted/40 bg-muted/30 px-4 py-3 md:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Before</p>
                          <pre className="overflow-x-auto rounded-md bg-card p-3 text-xs">{JSON.stringify(r.before, null, 2)}</pre>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">After</p>
                          <pre className="overflow-x-auto rounded-md bg-card p-3 text-xs">{JSON.stringify(r.after, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Separator />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {rows.length} of {total.toLocaleString()} · Page {page + 1} of {maxPage + 1}
            </span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" disabled={page >= maxPage} onClick={() => setPage((p) => p + 1)}>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
