import { NextResponse } from "next/server";

import { createSubscriptionCheckout } from "@/lib/billing/checkout";
import type { BillingCurrency, BillingCycle, PlanId } from "@/lib/billing/config";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

interface CheckoutRequestBody {
  plan?: PlanId;
  cycle?: BillingCycle;
  currency?: BillingCurrency;
}

const VALID_PLANS: PlanId[] = ["starter", "pro", "business"];
const VALID_CYCLES: BillingCycle[] = ["monthly", "yearly"];
const VALID_CURRENCIES: BillingCurrency[] = ["inr", "usd"];

export async function POST(
  request: Request,
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
    return NextResponse.json({ error: "Only owners and admins can manage billing" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as CheckoutRequestBody;
  const plan = body.plan;
  const cycle = body.cycle ?? "monthly";
  const currency = body.currency ?? "inr";

  if (!plan || !VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!VALID_CYCLES.includes(cycle)) {
    return NextResponse.json({ error: "Invalid cycle" }, { status: 400 });
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
    const session = await createSubscriptionCheckout({
      projectId,
      ownerEmail: user.email ?? "",
      projectName: project.name ?? "SpeedIQ Project",
      plan,
      cycle,
      currency,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error("[billing/checkout]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
