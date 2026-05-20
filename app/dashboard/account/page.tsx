"use client";

import { useCallback, useEffect, useState } from "react";

import { CheckCircle2, Loader2, LogOut, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";

interface ProfileDTO {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  company: string | null;
  created_at: string;
  updated_at: string;
}

interface AccountInfo {
  email: string | null;
  provider: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
}

export default function AccountPage() {
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  // Sign-out everywhere
  const [signingOutAll, setSigningOutAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Not signed in");

      setAccount({
        email: user.email ?? null,
        provider: user.app_metadata?.provider ?? null,
        created_at: user.created_at ?? null,
        last_sign_in_at: user.last_sign_in_at ?? null,
      });

      const res = await fetch("/api/profile", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load profile");
      const data = (await res.json()) as ProfileDTO;
      setProfile(data);
      setFullName(data.full_name ?? "");
      setPhone(data.phone ?? "");
      setCompany(data.company ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveProfile = useCallback(async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          company: company.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      const data = (await res.json()) as ProfileDTO;
      setProfile(data);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingProfile(false);
    }
  }, [fullName, phone, company]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPwd) return toast.error("Enter your current password");
    if (newPwd.length < 8) return toast.error("New password must be 8+ characters");
    if (newPwd !== confirmPwd) return toast.error("Passwords don't match");

    setSavingPwd(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Change failed");
      toast.success("Password updated");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Change failed");
    } finally {
      setSavingPwd(false);
    }
  }, [currentPwd, newPwd, confirmPwd]);

  const handleSignOutEverywhere = useCallback(async () => {
    if (!confirm("Sign out of all devices and browsers?")) return;
    setSigningOutAll(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw new Error(error.message);
      toast.success("Signed out of all sessions");
      window.location.href = "/auth/login";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-out failed");
      setSigningOutAll(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Account" description="Profile, password, and sign-in." />
        <LoadingState />
      </div>
    );
  }

  const dirty =
    (profile?.full_name ?? "") !== fullName.trim() ||
    (profile?.phone ?? "") !== phone.trim() ||
    (profile?.company ?? "") !== company.trim();

  const providerLabel = account?.provider ? account.provider.toLowerCase() : "email";
  const isOAuth = providerLabel !== "email";

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title="Account" description="Profile, password, and sign-in." />

      <Card className="bg-white dark:bg-gray-900">
        <CardContent className="flex flex-col gap-5 p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback>{getInitials(profile?.full_name ?? account?.email ?? "?")}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-base font-medium">{profile?.full_name ?? account?.email ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{account?.email ?? ""}</p>
            </div>
            <Badge variant="outline" className="gap-1 capitalize">
              {providerLabel === "email" ? "Email & password" : `${providerLabel} sign-in`}
            </Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs">Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Company</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc." />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Email</Label>
              <Input value={account?.email ?? ""} disabled />
              <p className="mt-1 text-xs text-muted-foreground">
                To change your email, contact support.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={!dirty || savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-900">
        <CardContent className="flex flex-col gap-4 p-6">
          <div>
            <p className="text-base font-medium">Password</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isOAuth
                ? `You sign in with ${providerLabel}. Password changes happen on the provider's side.`
                : "Use at least 8 characters. Pick something you don't reuse elsewhere."}
            </p>
          </div>

          {isOAuth ? (
            <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              Managed by {providerLabel}. Visit your provider account to change it.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <Label className="text-xs">Current password</Label>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">New password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Confirm new password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={savingPwd}>
                  {savingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Update password
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-900">
        <CardContent className="flex flex-col gap-4 p-6">
          <div>
            <p className="text-base font-medium">Sessions</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in {account?.last_sign_in_at ? `at ${new Date(account.last_sign_in_at).toLocaleString()}` : "recently"}.
            </p>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Sign out of every device and browser you&apos;re currently logged in on.
            </div>
            <Button
              variant="outline"
              onClick={handleSignOutEverywhere}
              disabled={signingOutAll}
            >
              {signingOutAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Sign out everywhere
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-900">
        <CardContent className="grid grid-cols-2 gap-4 p-6 text-sm md:grid-cols-4">
          <Field label="User ID" value={<span className="font-mono text-xs">{profile?.id?.slice(0, 8) ?? "—"}…</span>} />
          <Field label="Joined" value={account?.created_at ? new Date(account.created_at).toLocaleDateString() : "—"} />
          <Field
            label="Last sign-in"
            value={account?.last_sign_in_at ? new Date(account.last_sign_in_at).toLocaleDateString() : "Never"}
          />
          <Field label="Sign-in method" value={<span className="capitalize">{providerLabel}</span>} />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
