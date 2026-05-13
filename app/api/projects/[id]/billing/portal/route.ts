import { NextResponse } from "next/server";

import { getProviderById } from "@/lib/billing/providers/router";
import { BILLING_ENABLED } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

import type { ProviderId } from "@/lib/billing/providers/types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!BILLING_ENABLED) {
    return NextResponse.json({ error: "Billing is disabled" }, { status: 404 });
  }
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

  // Portal availability depends on the project's current provider. Stripe has
  // a hosted portal; Razorpay does not — that path returns a structured error
  // so the client can render an in-app cancel/manage UI instead.
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("project_subscriptions")
    .select("provider")
    .eq("project_id", projectId)
    .maybeSingle();
  const providerId = (sub?.provider as ProviderId | null) ?? "stripe";

  if (providerId === "razorpay") {
    return NextResponse.json(
      {
        error: "Razorpay has no hosted portal. Use the in-app cancel/manage controls.",
        provider: providerId,
        code: "portal_not_supported",
      },
      { status: 400 },
    );
  }

  try {
    const provider = getProviderById(providerId);
    const { url } = await provider.createBillingPortalSession({ projectId });
    return NextResponse.json({ url, provider: providerId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to open portal";
    console.error("[billing/portal]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
