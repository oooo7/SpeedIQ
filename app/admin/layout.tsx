import { ReactNode } from "react";

import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { isCallerPlatformAdmin } from "@/lib/billing/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?next=/admin");
  }

  const isAdmin = await isCallerPlatformAdmin();
  if (!isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <header className="border-b border-[rgba(10,10,10,0.07)] dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-gray-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-6 h-14">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Platform Admin</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              · Signed in as {user.email}
            </span>
          </div>
          <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to app
          </a>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 md:px-6 py-6">
        <AdminNav />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
