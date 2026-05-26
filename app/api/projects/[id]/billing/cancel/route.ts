import { NextResponse } from "next/server";

import { getProviderById } from "@/lib/billing/providers/router";
import { upsertProjectSubscription } from "@/lib/billing/subscription";
import { BILLING_ENABLED } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

import type { ProviderId } from "@/lib/billing/providers/types";

interface CancelBody {
  cancel_at_period_end?: boolean;
}

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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  if (!projectId) return NextResponse.json({ error: "Project ID required" }, { status: 400 });

  const role = await getProjectRole(supabase, projectId, user.id);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Only owners and admins can cancel" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as CancelBody;
  const cancelAtPeriodEnd = body.cancel_at_period_end !== false;

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("project_subscriptions")
    .select("provider, stripe_subscription_id, razorpay_subscription_id, current_period_end")
    .eq("project_id", projectId)
    .maybeSingle();
  if (!sub) return NextResponse.json({ error: "No subscription" }, { status: 404 });
  const providerId = (sub.provider as ProviderId | null) ?? null;
  if (!providerId) {
    return NextResponse.json({ error: "No active provider" }, { status: 400 });
  }

  const subscriptionId =
    providerId === "stripe" ? sub.stripe_subscription_id : sub.razorpay_subscription_id;
  if (!subscriptionId) {
    return NextResponse.json({ error: "No subscription id stored" }, { status: 400 });
  }

  try {
    const provider = getProviderById(providerId);
    await provider.cancelSubscription({
      subscriptionId,
      cancelAtCycleEnd: cancelAtPeriodEnd,
    });

    // For Razorpay we won't always get an immediate webhook reflecting the
    // cancel — so optimistically update local state.
    await upsertProjectSubscription(projectId, {
      cancel_at_period_end: cancelAtPeriodEnd,
      canceled_at: new Date().toISOString(),
      ...(cancelAtPeriodEnd ? {} : { status: "canceled" as const }),
    });

    return NextResponse.json({ ok: true, cancel_at_period_end: cancelAtPeriodEnd });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cancel failed";
    console.error("[billing/cancel]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
