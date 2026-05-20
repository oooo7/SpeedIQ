"use client";

import { useCallback, useEffect, useState } from "react";

import { ArrowLeft, ArrowRight, Loader2, Search, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface UserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_platform_admin: boolean;
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`${window.location.origin}/api/admin/users`);
      url.searchParams.set("page", String(page));
      if (search.trim()) url.searchParams.set("q", search.trim());
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { users: UserRow[] };
      setRows(json.users);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleAdmin = useCallback(
    async (row: UserRow) => {
      setTogglingId(row.id);
      try {
        const res = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            user_id: row.id,
            is_platform_admin: !row.is_platform_admin,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Update failed");
        toast.success(row.is_platform_admin ? "Removed admin role" : "Promoted to admin");
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      } finally {
        setTogglingId(null);
      }
    },
    [load],
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-medium tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide user list. Promote or demote platform admins here.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email…"
                value={search}
                className="pl-8"
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)}>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Separator />
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-normal">Email</th>
                    <th className="py-2 pr-3 font-normal">Created</th>
                    <th className="py-2 pr-3 font-normal">Last sign-in</th>
                    <th className="py-2 pr-3 font-normal">Role</th>
                    <th className="py-2 pr-3 font-normal text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id} className="border-t border-muted/60">
                      <td className="py-2 pr-3">
                        <p className="font-medium">{u.email ?? "—"}</p>
                        <p className="font-mono text-xs text-muted-foreground">{u.id.slice(0, 8)}…</p>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}
                      </td>
                      <td className="py-2 pr-3">
                        {u.is_platform_admin ? (
                          <Badge variant="default" className="gap-1">
                            <ShieldCheck className="h-3 w-3" /> Platform admin
                          </Badge>
                        ) : (
                          <Badge variant="outline">User</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <Button
                          size="sm"
                          variant={u.is_platform_admin ? "outline" : "default"}
                          onClick={() => toggleAdmin(u)}
                          disabled={togglingId === u.id}
                        >
                          {togglingId === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : u.is_platform_admin ? (
                            <>
                              <ShieldOff className="h-3.5 w-3.5" /> Demote
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-3.5 w-3.5" /> Promote
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
