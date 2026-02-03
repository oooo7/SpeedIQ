"use client";

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { ProjectSwitcher } from "@/components/dashboard/project-switcher";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function Separator() {
  return <span className="text-gray-300 dark:text-gray-600" aria-hidden>/</span>;
}

export function DashboardHeader() {
  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center gap-2 border-b border-gray-200 dark:border-gray-800 transition-[width,height] ease-linear",
        "sticky top-0 z-50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md",
      )}
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
