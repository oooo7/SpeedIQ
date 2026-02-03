import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { loadProjectsForUser } from "@/lib/projects/server";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const cookieStore = await cookies();
  const { activeProject } = await loadProjectsForUser(supabase, user.id, cookieStore);

  if (activeProject) {
    redirect("/dashboard");
  } else {
    redirect("/projects");
  }
}
