"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { Project } from "@/types/project";

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  isSwitching: boolean;
  refreshProjects: () => Promise<void>;
  selectProject: (projectId: string | null) => Promise<void>;
  createProject: (name: string) => Promise<Project | null>;
  deleteProject: (projectId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

interface ProjectProviderProps {
  readonly children: React.ReactNode;
  readonly initialProjects?: Project[];
  readonly initialActiveProject?: Project | null;
}

async function fetchJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Request failed");
  }
  return response.json() as Promise<T>;
}

export function ProjectProvider({
  children,
  initialProjects = [],
  initialActiveProject = null,
}: ProjectProviderProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeProject, setActiveProject] = useState<Project | null>(initialActiveProject);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const refreshProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchJSON<{
        projects: Project[];
        activeProjectId: string | null;
      }>("/api/projects");

      setProjects(data.projects);

      if (data.activeProjectId) {
        const match = data.projects.find((project) => project.id === data.activeProjectId) ?? null;
        setActiveProject(match);
      } else {
        setActiveProject(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectProject = useCallback(async (projectId: string | null) => {
    setIsSwitching(true);
    try {
      await fetchJSON<{ success: true }>("/api/projects/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      if (projectId) {
        const match = projects.find((project) => project.id === projectId) ?? null;
        setActiveProject(match);
      } else {
        setActiveProject(null);
      }
    } finally {
      setIsSwitching(false);
    }
  }, [projects]);

  const createProject = useCallback(async (name: string) => {
    setIsLoading(true);
    try {
      const data = await fetchJSON<{ project: Project }>("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      setProjects((prev) => [...prev, data.project]);
      setActiveProject(data.project);
      return data.project;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    await fetchJSON(`/api/projects/${projectId}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setActiveProject((prev) => (prev?.id === projectId ? null : prev));
  }, []);

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      activeProject,
      isLoading,
      isSwitching,
      refreshProjects,
      selectProject,
      createProject,
      deleteProject,
    }),
    [projects, activeProject, isLoading, isSwitching, refreshProjects, selectProject, createProject, deleteProject],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
}
