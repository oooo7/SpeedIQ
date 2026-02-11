import { PageHeader } from "@/components/dashboard/page-header";
import { ProjectSelector } from "@/components/projects/project-selector";

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Select a project"
        description="Choose a project to continue, or create a new one."
      />
      <ProjectSelector />
    </div>
  );
}
