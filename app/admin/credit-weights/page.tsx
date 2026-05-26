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

interface Weight {
  id: number;
  channel: "email" | "whatsapp" | "sms" | "ai" | string;
  message_type: string;
  credits: number;
  description: string | null;
}

const CHANNELS = ["email", "whatsapp", "sms", "ai"];

export default function AdminCreditWeightsPage() {
  const [weights, setWeights] = useState<Weight[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Weight>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newWeight, setNewWeight] = useState<Partial<Weight>>({ channel: "email" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/credit-weights", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { weights: Weight[] };
      setWeights(json.weights);
      setDrafts(Object.fromEntries(json.weights.map((w) => [w.id, structuredClone(w)])));
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
    async (id: number) => {
      const d = drafts[id];
      if (!d) return;
      setSavingId(id);
      try {
        const res = await fetch("/api/admin/credit-weights", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id, credits: d.credits, description: d.description }),
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
    async (id: number) => {
      if (!confirm("Delete this weight? Sends matching this type will fall back to defaults.")) return;
      try {
        const res = await fetch(`/api/admin/credit-weights?id=${id}`, {
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

  const createWeight = useCallback(async () => {
    if (!newWeight.channel || !newWeight.message_type || !newWeight.credits) {
      toast.error("channel, message_type and credits required");
      return;
    }
    try {
      const res = await fetch("/api/admin/credit-weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newWeight),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Create failed");
      toast.success("Created");
      setCreating(false);
      setNewWeight({ channel: "email" });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    }
  }, [newWeight, load]);

  const isDirty = (id: number) => JSON.stringify(weights.find((w) => w.id === id)) !== JSON.stringify(drafts[id]);

  const updateDraft = (id: number, mut: (w: Weight) => Weight) =>
    setDrafts((prev) => ({ ...prev, [id]: mut(prev[id]) }));

  // Group by channel for display
  const byChannel = CHANNELS.map((ch) => ({
    channel: ch,
    rows: Object.values(drafts).filter((w) => w.channel === ch),
  }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Credit weights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How many credits each send deducts. Higher number = more expensive for the user.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New weight
        </Button>
      </header>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Channel / message type pairs</p>
            <p className="text-muted-foreground mt-1">
              Each channel has multiple message types (WhatsApp marketing vs utility, SMS domestic vs international).
              The send pipeline matches the type at send time and deducts the configured number of credits.
              Changes apply to <strong>future sends only</strong>.
            </p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {byChannel.map((group) => (
            <Card key={group.channel}>
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{group.channel}</Badge>
                  <p className="text-sm text-muted-foreground">{group.rows.length} type(s)</p>
                </div>
                <Separator />
                {group.rows.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No weights for this channel.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {group.rows.map((w) => (
                      <div key={w.id} className="grid grid-cols-12 items-end gap-3 rounded-md border bg-card p-3">
                        <div className="col-span-12 md:col-span-4">
                          <Label className="text-xs">Message type</Label>
                          <Input value={w.message_type} disabled className="font-mono text-xs" />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">Credits</Label>
                          <Input
                            type="number"
                            value={w.credits}
                            onChange={(e) => updateDraft(w.id, (d) => ({ ...d, credits: Number(e.target.value) || 0 }))}
                          />
                        </div>
                        <div className="col-span-8 md:col-span-4">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={w.description ?? ""}
                            onChange={(e) => updateDraft(w.id, (d) => ({ ...d, description: e.target.value }))}
                          />
                        </div>
                        <div className="col-span-12 flex items-center justify-end gap-2 md:col-span-2">
                          <Button size="sm" variant="ghost" onClick={() => remove(w.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" onClick={() => save(w.id)} disabled={!isDirty(w.id) || savingId === w.id}>
                            {savingId === w.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New credit weight</DialogTitle>
            <DialogDescription>Add a new channel + message-type → credits row.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Channel</Label>
              <select
                value={newWeight.channel}
                onChange={(e) => setNewWeight((p) => ({ ...p, channel: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Credits</Label>
              <Input
                type="number"
                value={newWeight.credits ?? ""}
                onChange={(e) => setNewWeight((p) => ({ ...p, credits: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Message type (e.g. campaign, template_marketing, domestic)</Label>
              <Input
                value={newWeight.message_type ?? ""}
                onChange={(e) => setNewWeight((p) => ({ ...p, message_type: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Description</Label>
              <Input
                value={newWeight.description ?? ""}
                onChange={(e) => setNewWeight((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={createWeight}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
