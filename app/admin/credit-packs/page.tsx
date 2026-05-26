"use client";

import { useCallback, useEffect, useState } from "react";

import { Info, Loader2, Plus, Save, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";

interface Pack {
  id: string;
  name: string;
  credits: number;
  price_inr: number | null;
  price_usd: number | null;
  provider_ids: Record<string, Record<string, string>>;
  active: boolean;
  sort_order: number;
}

function numOrNull(value: string): number | null {
  const t = value.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function AdminCreditPacksPage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Pack>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newPack, setNewPack] = useState<Partial<Pack>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/credit-packs", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { packs: Pack[] };
      setPacks(json.packs);
      setDrafts(Object.fromEntries(json.packs.map((p) => [p.id, structuredClone(p)])));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (id: string) => {
      const draft = drafts[id];
      if (!draft) return;
      setSavingId(id);
      try {
        const res = await fetch("/api/admin/credit-packs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(draft),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
        toast.success("Saved");
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSavingId(null);
      }
    },
    [drafts, load],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!confirm(`Delete pack "${id}"? This cannot be undone.`)) return;
      try {
        const res = await fetch(`/api/admin/credit-packs?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
        toast.success("Deleted");
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [load],
  );

  const createPack = useCallback(async () => {
    if (!newPack.id || !newPack.name || !newPack.credits) {
      toast.error("id, name and credits are required");
      return;
    }
    try {
      const res = await fetch("/api/admin/credit-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newPack),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Create failed");
      toast.success("Pack created");
      setCreating(false);
      setNewPack({});
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    }
  }, [newPack, load]);

  const isDirty = (id: string) => JSON.stringify(packs.find((p) => p.id === id)) !== JSON.stringify(drafts[id]);

  const updateDraft = (id: string, mut: (p: Pack) => Pack) =>
    setDrafts((prev) => ({ ...prev, [id]: mut(prev[id]) }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Credit packs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One-time top-up purchases users can buy. Set the credit amount and prices per currency.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New pack
        </Button>
      </header>

      <Card className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/20">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-amber-900 dark:text-amber-200">
            Stripe top-ups require a matching <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/30">STRIPE_PRICE_*</code> env var
            (e.g. <code>STRIPE_PRICE_CREDITS_5K_INR</code>). Razorpay top-ups read{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/30">price_inr</code> directly and create a payment link.
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.values(drafts).map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-medium">{p.name}</h2>
                    <Badge variant={p.active ? "default" : "outline"}>
                      {p.active ? "Active" : "Off"}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">{p.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={p.active}
                      onCheckedChange={(v) => updateDraft(p.id, (d) => ({ ...d, active: v }))}
                    />
                    <Button size="sm" variant="ghost" onClick={() => remove(p.id)} disabled={savingId === p.id}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={() => save(p.id)} disabled={!isDirty(p.id) || savingId === p.id}>
                      {savingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={p.name} onChange={(e) => updateDraft(p.id, (d) => ({ ...d, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Credits</Label>
                    <Input
                      type="number"
                      value={p.credits}
                      onChange={(e) => updateDraft(p.id, (d) => ({ ...d, credits: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">INR price (₹)</Label>
                    <Input
                      type="number"
                      value={p.price_inr ?? ""}
                      onChange={(e) => updateDraft(p.id, (d) => ({ ...d, price_inr: numOrNull(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">USD price ($)</Label>
                    <Input
                      type="number"
                      value={p.price_usd ?? ""}
                      onChange={(e) => updateDraft(p.id, (d) => ({ ...d, price_usd: numOrNull(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Sort order</Label>
                    <Input
                      type="number"
                      value={p.sort_order}
                      onChange={(e) => updateDraft(p.id, (d) => ({ ...d, sort_order: Number(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    Per 1k INR:{" "}
                    <strong className="font-medium text-foreground">
                      {p.price_inr != null ? `₹${((p.price_inr / p.credits) * 1000).toFixed(2)}` : "—"}
                    </strong>
                  </div>
                  <div>
                    Per 1k USD:{" "}
                    <strong className="font-medium text-foreground">
                      {p.price_usd != null ? `$${((p.price_usd / p.credits) * 1000).toFixed(3)}` : "—"}
                    </strong>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New credit pack</DialogTitle>
            <DialogDescription>Create a new top-up pack users can buy.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">ID (e.g. credits_10k)</Label>
              <Input
                value={newPack.id ?? ""}
                onChange={(e) => setNewPack((p) => ({ ...p, id: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Display name</Label>
              <Input value={newPack.name ?? ""} onChange={(e) => setNewPack((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Credits</Label>
              <Input
                type="number"
                value={newPack.credits ?? ""}
                onChange={(e) => setNewPack((p) => ({ ...p, credits: Number(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label className="text-xs">Sort order</Label>
              <Input
                type="number"
                value={newPack.sort_order ?? 99}
                onChange={(e) => setNewPack((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label className="text-xs">INR price</Label>
              <Input
                type="number"
                value={newPack.price_inr ?? ""}
                onChange={(e) => setNewPack((p) => ({ ...p, price_inr: numOrNull(e.target.value) }))}
              />
            </div>
            <div>
              <Label className="text-xs">USD price</Label>
              <Input
                type="number"
                value={newPack.price_usd ?? ""}
                onChange={(e) => setNewPack((p) => ({ ...p, price_usd: numOrNull(e.target.value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={createPack}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
