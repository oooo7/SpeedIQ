"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_CONFIG } from "@/config/app-config";
import { useProjectContext } from "@/lib/projects/project-context";
import { Folder } from "lucide-react";

export function ProjectSwitcher() {
  const router = useRouter();
  const {
    projects,
    activeProject,
    selectProject,
    isLoading,
    isSwitching,
  } = useProjectContext();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback(
    async (projectId: string) => {
      if (projectId === activeProject?.id) {
        return;
      }
      await selectProject(projectId);
      window.location.reload();
    },
    [activeProject?.id, selectProject],
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const handleNewProject = useCallback(() => {
    router.push("/projects");
  }, [router]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 truncate"
          disabled={isSwitching}
        >
          {isSwitching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ChevronsUpDown className="size-4 text-gray-500 dark:text-gray-400" />
          )}
          <span className="max-w-[160px] truncate text-sm font-medium">
            {activeProject ? activeProject.name : "Select a project"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
       
        <DropdownMenuSeparator />
        {isLoading && (
          <DropdownMenuItem disabled className="gap-2">
            <Loader2 className="size-4 animate-spin" />
            Loading...
          </DropdownMenuItem>
        )}
        {!isLoading &&
          projects.map((project) => {
            const isActive = project.id === activeProject?.id;
            return (
              <DropdownMenuItem
                key={project.id}
                onClick={() => handleSelect(project.id)}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{project.name}</span>
                {isActive && <Check className="size-4 shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleNewProject} className="gap-2">
          <Folder className="size-4 shrink-0" />
          Manage projects
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
