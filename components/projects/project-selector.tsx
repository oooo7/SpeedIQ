"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { FolderOpen, LayoutGrid, List, Loader2, MoreVertical, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useProjectContext } from "@/lib/projects/project-context";
import type { Project } from "@/types/project";

type ViewMode = "grid" | "list";

function ProjectCard({
  project,
  isSwitching,
  onSelect,
  onOpenDashboard,
  onDelete,
}: {
  project: Project;
  isSwitching: boolean;
  onSelect: (id: string) => Promise<void>;
  onOpenDashboard: () => void;
  onDelete: (id: string, name: string) => void;
}) {
  const handleSelect = useCallback(async () => {
    await onSelect(project.id);
  }, [project.id, onSelect]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(project.id, project.name);
    },
    [project.id, project.name, onDelete]
  );

  return (
    <div className="group relative flex flex-col bg-white dark:bg-gray-900 overflow-hidden transition hover:bg-gray-50/80 dark:hover:bg-gray-800/30">
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpenDashboard}>
              Open project
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={handleDelete}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="size-4" />
              Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <button
        type="button"
        onClick={handleSelect}
        disabled={isSwitching}
        className="flex flex-1 flex-col items-start gap-3 p-4 text-left"
      >
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-gray-900 dark:text-gray-50">{project.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400" suppressHydrationWarning>
            Created {new Date(project.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium">
            ACTIVE
          </Badge>
        </div>
      </button>
    </div>
  );
}

function ProjectCardList({
  project,
  isSwitching,
  onSelect,
  onOpenDashboard,
  onDelete,
}: {
  project: Project;
  isSwitching: boolean;
  onSelect: (id: string) => Promise<void>;
  onOpenDashboard: () => void;
  onDelete: (id: string, name: string) => void;
}) {
  const handleSelect = useCallback(async () => {
    await onSelect(project.id);
  }, [project.id, onSelect]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(project.id, project.name);
    },
    [project.id, project.name, onDelete]
  );

  return (
    <div className="group flex items-center justify-between gap-4 bg-white dark:bg-gray-900 px-4 py-3 transition hover:bg-gray-50/80 dark:hover:bg-gray-800/30">
      <button
        type="button"
        onClick={handleSelect}
        disabled={isSwitching}
        className="flex flex-1 items-center justify-between gap-4 text-left"
      >
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-gray-900 dark:text-gray-50">{project.name}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400" suppressHydrationWarning>
          Created {new Date(project.created_at).toLocaleDateString()}
        </span>
      </div>
      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium">
        ACTIVE
      </Badge>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onOpenDashboard}>
            Open project
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={handleDelete}
            className="text-red-600 dark:text-red-400"
          >
            <Trash2 className="size-4" />
            Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ProjectSelector() {
  const router = useRouter();
  const {
    projects,
    activeProject,
    selectProject,
    createProject,
    deleteProject,
    isLoading,
    isSwitching,
  } = useProjectContext();
  const [projectName, setProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isOpeningDashboard, setIsOpeningDashboard] = useState(false);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, searchQuery]);

  const sortedProjects = useMemo(
    () =>
      [...filteredProjects].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    [filteredProjects]
  );

  const handleOpenDashboard = useCallback(() => {
    setIsOpeningDashboard(true);
    router.push("/dashboard");
  }, [router]);

  const handleSelectProject = useCallback(
    async (projectId: string) => {
      setIsOpeningDashboard(true);

      if (projectId === activeProject?.id) {
        router.push("/dashboard");
        return;
      }

      try {
        await selectProject(projectId);
        router.push("/dashboard");
      } catch (error) {
        setIsOpeningDashboard(false);
        toast.error("Unable to switch project", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      }
    },
    [activeProject?.id, router, selectProject]
  );

  const handleDeleteProject = useCallback(
    async (projectId: string, projectName: string) => {
      if (!window.confirm(`Are you sure you want to delete "${projectName}"? This cannot be undone.`)) {
        return;
      }
      try {
        await deleteProject(projectId);
        toast.success("Project deleted", {
          description: `"${projectName}" has been removed.`,
        });
      } catch (error) {
        toast.error("Unable to delete project", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      }
    },
    [deleteProject]
  );

  const handleCreateProject = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!projectName.trim()) {
        toast.error("Project name is required");
        return;
      }
      setIsCreating(true);
      try {
        const project = await createProject(projectName.trim());
        if (project) {
          setProjectName("");
          setShowCreateForm(false);
          router.push("/dashboard");
          toast.success("Project created", {
            description: `"${project.name}" is now active.`,
          });
        }
      } catch (error) {
        toast.error("Unable to create project", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setIsCreating(false);
      }
    },
    [projectName, createProject, router]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-50">Projects</h1>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Search for a project"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center ">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-9  px-3"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-9  px-3"
              onClick={() => setViewMode("list")}
            >
              <List className="size-4" />
            </Button>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="gap-2 bg-primary text-primary-foreground hover:opacity-90"
          >
            <Plus className="size-4" />
            New project
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleCreateProject}
          className="flex flex-col gap-3 bg-white dark:bg-gray-900 p-4 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label
              htmlFor="project-name"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Project name
            </label>
            <Input
              id="project-name"
              placeholder="e.g. SpeedIQ Campaigns"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={isCreating || isLoading}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateForm(false);
                setProjectName("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || isLoading || !projectName.trim()}
              className="gap-2"
            >
              {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Create project
            </Button>
          </div>
        </form>
      )}

      {sortedProjects.length === 0 && (
        <EmptyState
          icon={<FolderOpen className="h-6 w-6" />}
          title={searchQuery ? "No projects match your search" : "No projects yet"}
          description={searchQuery ? "Try a different search term." : "Create a project to get started."}
          actions={
            !searchQuery ? (
              <Button onClick={() => setShowCreateForm(true)} className="gap-1">
                <Plus className="h-4 w-4" />
                New project
              </Button>
            ) : undefined
          }
        />
      )}

      {isOpeningDashboard && (
        <div className="flex min-h-[240px] items-center justify-center bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Loader2 className="size-4 animate-spin" />
            Opening dashboard...
          </div>
        </div>
      )}

      {!isOpeningDashboard && sortedProjects.length > 0 && (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-2"
          }
        >
          {sortedProjects.map((project) =>
            viewMode === "grid" ? (
              <ProjectCard
                key={project.id}
                project={project}
                isSwitching={isSwitching}
                onSelect={handleSelectProject}
                onOpenDashboard={handleOpenDashboard}
                onDelete={handleDeleteProject}
              />
            ) : (
              <ProjectCardList
                key={project.id}
                project={project}
                isSwitching={isSwitching}
                onSelect={handleSelectProject}
                onOpenDashboard={handleOpenDashboard}
                onDelete={handleDeleteProject}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
