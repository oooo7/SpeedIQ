"use client";

import Link from "next/link";

import { Command, ShieldCheck } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { useProjectContext } from "@/lib/projects/project-context";
import { sidebarItems } from "@/navigation/sidebar-items";
import { cn } from "@/lib/utils";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

export function AppSidebar({
  user,
  isPlatformAdmin,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  readonly user: {
    readonly name: string;
    readonly email: string;
    readonly avatar: string;
  };
  readonly isPlatformAdmin?: boolean;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { activeProject } = useProjectContext();

  return (
    <Sidebar {...props}>
      <SidebarHeader className="h-12 border-b border-[rgba(10,10,10,0.07)] dark:border-[rgba(255,255,255,0.08)] p-0">
        <Link
          href={activeProject ? "/projects" : "/projects"}
          className={cn(
            "flex items-center h-full hover:opacity-80 transition-opacity",
            isCollapsed ? "justify-center px-2" : "gap-2 px-4"
          )}
        >
          <Command className="size-5 shrink-0" />
          <span
            className={cn(
              "text-base font-medium transition-opacity",
              isCollapsed && "hidden"
            )}
          >
            {APP_CONFIG.name}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={sidebarItems}
          isProjectSelected={Boolean(activeProject)}
        />
        {isPlatformAdmin && (
          <Link
            href="/admin"
            className={cn(
              "mx-2 mt-2 flex items-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors",
              isCollapsed && "justify-center px-1.5"
            )}
            title="Platform admin"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            {!isCollapsed && <span>Platform admin</span>}
          </Link>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} isPlatformAdmin={isPlatformAdmin} />
      </SidebarFooter>
    </Sidebar>
  );
}
