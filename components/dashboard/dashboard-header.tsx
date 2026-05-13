"use client";

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { ProjectSwitcher } from "@/components/dashboard/project-switcher";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function Separator() {
  return <span className="text-[var(--fg-4)]" aria-hidden>/</span>;
}

export function DashboardHeader() {
  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center gap-2 border-b border-[var(--line)] transition-[width,height] ease-linear",
        "sticky top-0 z-50",
      )}
      style={{
        background: "color-mix(in srgb, var(--bg) 82%, transparent)",
        backdropFilter: "blur(12px) saturate(140%)",
        WebkitBackdropFilter: "blur(12px) saturate(140%)",
      }}
    >
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator />
        <ProjectSwitcher />
        <Separator />
        <Breadcrumbs />
      </div>
    </header>
  );
}
