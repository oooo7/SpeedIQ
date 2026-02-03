export interface Project {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
}

export type ProjectInsert = Pick<Project, "name">;
