import { ProjectSelector } from "@/components/projects/project-selector";

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Projects
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-1">
          Select a project
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a project to continue, or create a new one.
        </p>
      </header>
      <ProjectSelector />
    </div>
  );
}
