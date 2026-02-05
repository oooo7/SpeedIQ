import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import { fetchProjectById } from "@/lib/projects";
import {
  exchangeCodeForToken,
  fetchConnectedWABA,
  fetchPhoneNumbers,
  subscribeAppToWebhooks,
} from "@/lib/whatsapp/oauth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 }
    );
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role || (role !== "owner" && role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: project } = await fetchProjectById(supabase, projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const code = body?.code?.trim();

  if (!code) {
    return NextResponse.json(
      { error: "Authorization code is required" },
      { status: 400 }
    );
  }

  try {
    // Step 1: Exchange code for access token
    const tokenResult = await exchangeCodeForToken(code);
    if ("error" in tokenResult) {
      return NextResponse.json({ error: tokenResult.error }, { status: 400 });
    }

    const { access_token, expires_in } = tokenResult;

    // Step 2: Fetch connected WABA
    const wabaResult = await fetchConnectedWABA(access_token);
    if ("error" in wabaResult) {
      return NextResponse.json({ error: wabaResult.error }, { status: 400 });
    }

    const { waba_id, business_id } = wabaResult;

    // Step 3: Fetch phone numbers for the WABA
    const phoneResult = await fetchPhoneNumbers(access_token, waba_id);
    if ("error" in phoneResult) {
      return NextResponse.json({ error: phoneResult.error }, { status: 400 });
    }

    const phoneNumber = phoneResult.phone_numbers[0];
    if (!phoneNumber) {
      return NextResponse.json(
        { error: "No phone numbers found in the connected account. Please add a phone number in the WhatsApp Business settings." },
        { status: 400 }
      );
    }

    // Step 4: Subscribe app to webhooks for this WABA
    const webhookResult = await subscribeAppToWebhooks(access_token, waba_id);
    if ("error" in webhookResult) {
      console.warn("Webhook subscription warning:", webhookResult.error);
      // Don't fail the whole flow for webhook issues
    }

    // Step 5: Calculate token expiration
    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null;

    // Step 6: Store credentials in database
    const payload = {
      project_id: projectId,
      phone_number_id: phoneNumber.id,
      waba_id,
      access_token,
      phone_number: phoneNumber.display_phone_number,
      display_name: phoneNumber.verified_name,
      quality_rating: phoneNumber.quality_rating,
      connection_type: "embedded_signup",
      business_id,
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    };

    const { data: account, error } = await supabase
      .from("whatsapp_accounts")
      .upsert(payload, { onConflict: "project_id", ignoreDuplicates: false })
      .select(
        "id, project_id, phone_number_id, waba_id, phone_number, display_name, quality_rating, connection_type"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      account: { ...account, connected: true },
    });
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.json(
      { error: "Failed to complete WhatsApp connection" },
      { status: 500 }
    );
  }
}
