import { NextResponse } from "next/server";

import { createBillingPortalSession } from "@/lib/billing/checkout";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Only owners and admins can open the billing portal" }, { status: 403 });
  }

  try {
    const { url } = await createBillingPortalSession({ projectId });
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to open portal";
    console.error("[billing/portal]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
