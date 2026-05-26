import { ReactNode } from "react";

import { cookies } from "next/headers";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ProjectProvider } from "@/lib/projects/project-context";
import { loadProjectsForUser } from "@/lib/projects/server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function InvitationsLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const { projects, activeProject } = await loadProjectsForUser(supabase, user.id, cookieStore);

  const userData = {
    id: user.id,
    name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "User",
    email: user.email || "",
    avatar: user.user_metadata?.avatar_url || "",
  };

  return (
    <ProjectProvider initialProjects={projects} initialActiveProject={activeProject ?? null}>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar
          variant="sidebar"
          collapsible="icon"
          user={{
            name: userData.name,
            email: userData.email,
            avatar: userData.avatar,
          }}
        />
        <SidebarInset className={cn("max-w-full bg-gray-100 dark:bg-gray-900")}>
          <DashboardHeader />
          <div className="h-full w-full max-w-7xl mx-auto p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </ProjectProvider>
  );
}
