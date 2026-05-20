"use client";

import { useCallback, useEffect, useState } from "react";

import { ArrowLeft, ArrowRight, Info, Loader2, Search, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface LedgerRow {
  id: number;
  project_id: string;
  project_name: string | null;
  delta: number;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  balance_after: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ProjectRow {
  id: string;
  name: string;
  owner_email: string | null;
  wallet: { balance: number } | null;
}

const REASON_OPTIONS = [
  "", // all
  "plan_grant",
  "trial_grant",
  "top_up",
  "auto_recharge",
  "manual_adjustment",
  "refund",
  "email_send",
  "whatsapp_send",
  "sms_send",
  "ai_generation",
];

const REASON_LABEL: Record<string, string> = {
  plan_grant: "Plan grant",
  trial_grant: "Trial grant",
  top_up: "Top-up",
  auto_recharge: "Auto-recharge",
  manual_adjustment: "Manual adj.",
  refund: "Refund",
  email_send: "Email",
  whatsapp_send: "WhatsApp",
  sms_send: "SMS",
  ai_generation: "AI",
};

export default function AdminTransactionsPage() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<ProjectRow | null>(null);
  const [filterReason, setFilterReason] = useState("");

  // Project search
  const [projectSearch, setProjectSearch] = useState("");
  const [projectResults, setProjectResults] = useState<ProjectRow[]>([]);
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const [projectSearchLoading, setProjectSearchLoading] = useState(false);

  // Refund/adjust dialogs
  const [refundOpen, setRefundOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [actionProject, setActionProject] = useState<{ id: string; name: string | null } | null>(null);
  const [actionAmount, setActionAmount] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`${window.location.origin}/api/admin/transactions`);
      url.searchParams.set("page", String(page));
      if (filterProject) url.searchParams.set("project_id", filterProject.id);
      if (filterReason) url.searchParams.set("reason", filterReason);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { rows: LedgerRow[]; total: number; page_size: number };
      setRows(json.rows);
      setTotal(json.total);
      setPageSize(json.page_size);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [page, filterProject, filterReason]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced project search
  useEffect(() => {
    if (!projectSearchOpen) return;
    const t = setTimeout(async () => {
      setProjectSearchLoading(true);
      try {
        const url = new URL(`${window.location.origin}/api/admin/projects`);
        if (projectSearch.trim()) url.searchParams.set("q", projectSearch.trim());
        const res = await fetch(url.toString(), { credentials: "include" });
        if (res.ok) {
          const j = (await res.json()) as { projects: ProjectRow[] };
          setProjectResults(j.projects);
        }
      } finally {
        setProjectSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [projectSearch, projectSearchOpen]);

  const openRefund = (row: LedgerRow) => {
    setActionProject({ id: row.project_id, name: row.project_name });
    setActionAmount(String(Math.abs(row.delta)));
    setActionNotes(`Refund of ${REASON_LABEL[row.reason] ?? row.reason} (ledger #${row.id})`);
    setRefundOpen(true);
  };

  const openAdjust = (projectId: string, projectName: string | null) => {
    setActionProject({ id: projectId, name: projectName });
    setActionAmount("");
    setActionNotes("");
    setAdjustOpen(true);
  };

  const submitRefund = async () => {
    if (!actionProject || !actionAmount) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/credits/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          project_id: actionProject.id,
          amount: Number(actionAmount),
          notes: actionNotes,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Refund failed");
      toast.success("Refunded");
      setRefundOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setSubmitting(false);
    }
  };

  const submitAdjust = async () => {
    if (!actionProject || !actionAmount) return;
    const delta = Number(actionAmount);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error("Delta must be a non-zero number");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/credits/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          project_id: actionProject.id,
          delta,
          notes: actionNotes,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Adjust failed");
      toast.success("Adjusted");
      setAdjustOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adjust failed");
    } finally {
      setSubmitting(false);
    }
  };

  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-medium tracking-tight">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every credit movement across all projects. Issue refunds or manual adjustments inline.
        </p>
      </header>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <strong>Refunds vs adjustments.</strong> Refund → grants credits back with reason{" "}
            <code className="rounded bg-primary/10 px-1">refund</code> (use for failed sends or paid top-ups).
            Manual adjustment → grant or deduct with reason{" "}
            <code className="rounded bg-primary/10 px-1">manual_adjustment</code> (use for goodwill credits
            or correcting bad data). Both write to the audit log.
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Project</Label>
            {filterProject ? (
              <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{filterProject.name}</span>
                <span className="text-xs text-muted-foreground">{filterProject.owner_email ?? ""}</span>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setFilterProject(null)}>
                  Clear
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by project name…"
                  value={projectSearch}
                  className="pl-8"
                  onFocus={() => setProjectSearchOpen(true)}
                  onChange={(e) => {
                    setProjectSearch(e.target.value);
                    setProjectSearchOpen(true);
                  }}
                />
                {projectSearchOpen && (
                  <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                    {projectSearchLoading ? (
                      <div className="p-3 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>
                    ) : projectResults.length === 0 ? (
                      <p className="p-3 text-center text-sm text-muted-foreground">No matches</p>
                    ) : (
                      <ul className="max-h-72 overflow-y-auto">
                        {projectResults.map((p) => (
                          <li key={p.id}>
                            <button
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                              onClick={() => {
                                setFilterProject(p);
                                setProjectSearch("");
                                setProjectSearchOpen(false);
                              }}
                            >
                              <div>
                                <p className="font-medium">{p.name}</p>
                                <p className="text-xs text-muted-foreground">{p.owner_email ?? "—"}</p>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {(p.wallet?.balance ?? 0).toLocaleString()} cr
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Reason</Label>
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              {REASON_OPTIONS.map((r) => (
                <option key={r || "all"} value={r}>
                  {r === "" ? "All reasons" : REASON_LABEL[r] ?? r}
                </option>
              ))}
            </select>
          </div>

          {filterProject && (
            <Button variant="outline" size="sm" onClick={() => openAdjust(filterProject.id, filterProject.name)}>
              Adjust credits
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No transactions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-normal">When</th>
                    <th className="py-2 pr-3 font-normal">Project</th>
                    <th className="py-2 pr-3 font-normal">Reason</th>
                    <th className="py-2 pr-3 font-normal">Reference</th>
                    <th className="py-2 pr-3 font-normal text-right">Delta</th>
                    <th className="py-2 pr-3 font-normal text-right">Balance</th>
                    <th className="py-2 pr-3 font-normal text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-muted/60">
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 pr-3">
                        <p className="font-medium">{r.project_name ?? "—"}</p>
                        <p className="font-mono text-xs text-muted-foreground">{r.project_id.slice(0, 8)}…</p>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="font-normal">
                          {REASON_LABEL[r.reason] ?? r.reason}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {r.ref_type && (
                          <>
                            <span className="font-mono">{r.ref_type}</span>
                            {r.ref_id && <span className="font-mono"> · {r.ref_id.slice(0, 12)}</span>}
                          </>
                        )}
                      </td>
                      <td className={`py-2 pr-3 text-right font-medium ${r.delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {r.delta >= 0 ? `+${r.delta}` : r.delta}
                      </td>
                      <td className="py-2 pr-3 text-right">{r.balance_after.toLocaleString()}</td>
                      <td className="py-2 pr-3 text-right">
                        {r.delta < 0 && r.reason !== "manual_adjustment" && (
                          <Button size="sm" variant="ghost" onClick={() => openRefund(r)}>
                            Refund
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {rows.length} of {total.toLocaleString()} · Page {page + 1} of {maxPage + 1}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= maxPage}
                onClick={() => setPage((p) => p + 1)}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund credits</DialogTitle>
            <DialogDescription>
              Grants credits back to{" "}
              <strong>{actionProject?.name ?? actionProject?.id}</strong>. Recorded as a refund in the ledger.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs">Amount (credits)</Label>
              <Input
                type="number"
                value={actionAmount}
                onChange={(e) => setActionAmount(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Notes (visible in audit log)</Label>
              <Input value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>Cancel</Button>
            <Button onClick={submitRefund} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual adjustment</DialogTitle>
            <DialogDescription>
              Positive delta = grant; negative = deduct. <strong>{actionProject?.name ?? actionProject?.id}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs">Delta (use minus to deduct)</Label>
              <Input
                type="number"
                value={actionAmount}
                onChange={(e) => setActionAmount(e.target.value)}
                placeholder="e.g. 500 or -200"
              />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button onClick={submitAdjust} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
