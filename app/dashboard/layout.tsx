import { ReactNode } from "react";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { BreadcrumbOverrideProvider } from "@/lib/breadcrumb-override-context";
import { ProjectProvider } from "@/lib/projects/project-context";
import { loadProjectsForUser } from "@/lib/projects/server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { headers } from "next/headers";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login if not authenticated
    return null;
  }

  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarState !== "false";

  const { projects, activeProject } = await loadProjectsForUser(supabase, user.id, cookieStore);

  if (!activeProject) {
    redirect("/projects");
  }

  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const isWhatsAppLiveChat = pathname.startsWith("/dashboard/whatsapp/live-chat");

  // Transform user data for the sidebar
  const userData = {
    id: user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatar: user.user_metadata?.avatar_url || '',
    role: user.user_metadata?.role || 'user'
  };

  return (
    <ProjectProvider initialProjects={projects} initialActiveProject={activeProject}>
      <BreadcrumbOverrideProvider>
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
          <div
            className={cn(
              "h-full w-full",
              isWhatsAppLiveChat ? "max-w-none p-0" : "max-w-7xl mx-auto p-4 md:p-6",
            )}
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
      </BreadcrumbOverrideProvider>
    </ProjectProvider>
  );
}
