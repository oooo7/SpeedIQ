import { NextResponse } from "next/server";

import { CREDIT_PACKS, type BillingCurrency } from "@/lib/billing/config";
import { getProviderFor } from "@/lib/billing/providers/router";
import { BILLING_ENABLED } from "@/lib/features";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

interface TopUpRequestBody {
  pack_id?: string;
  currency?: BillingCurrency;
}

const VALID_CURRENCIES: BillingCurrency[] = ["inr", "usd"];

export async function POST(
  request: Request,
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
    return NextResponse.json({ error: "Only owners and admins can buy credits" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as TopUpRequestBody;
  const packId = body.pack_id;
  const currency = body.currency ?? "inr";

  if (!packId || !CREDIT_PACKS.some((p) => p.id === packId)) {
    return NextResponse.json({ error: "Invalid pack_id" }, { status: 400 });
  }
  if (!VALID_CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const provider = await getProviderFor(currency, projectId);
    const result = await provider.createTopUpCheckout({
      projectId,
      ownerEmail: user.email ?? "",
      projectName: project.name ?? "SpeedIQ Project",
      packId,
      currency,
    });
    if (result.kind === "redirect") {
      return NextResponse.json({ url: result.url, provider: provider.id });
    }
    return NextResponse.json({
      kind: "client_handler",
      provider: provider.id,
      sessionId: result.sessionId,
      publishableKey: result.publishableKey,
      clientPayload: result.clientPayload,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Top-up failed";
    console.error("[billing/topup]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
