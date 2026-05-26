import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const FIELDS = [
  "email_billing",
  "email_low_balance",
  "email_product_updates",
  "email_team_invites",
  "email_campaign_completed",
  "email_weekly_digest",
  "inapp_team_activity",
  "inapp_campaign_status",
  "inapp_credit_alerts",
  "marketing_emails",
] as const;

type Field = (typeof FIELDS)[number];

const DEFAULTS: Record<Field, boolean> = {
  email_billing: true,
  email_low_balance: true,
  email_product_updates: true,
  email_team_invites: true,
  email_campaign_completed: false,
  email_weekly_digest: false,
  inapp_team_activity: true,
  inapp_campaign_status: true,
  inapp_credit_alerts: true,
  marketing_emails: false,
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // Hydrate with defaults if the row doesn't exist yet.
  const merged: Record<Field, boolean> = { ...DEFAULTS };
  if (data) {
    for (const f of FIELDS) {
      if (typeof (data as Record<string, unknown>)[f] === "boolean") {
        merged[f] = (data as Record<string, boolean>)[f];
      }
    }
  }

  return NextResponse.json({ preferences: merged });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const patch: Record<string, boolean> = {};
  for (const f of FIELDS) {
    if (typeof body[f] === "boolean") patch[f] = body[f] as boolean;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      { user_id: user.id, ...patch },
      { onConflict: "user_id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
