import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import { getPhoneNumberInfo, getWhatsAppAccountToken } from "@/lib/whatsapp/api";

export async function POST(
  _request: Request,
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
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const creds = await getWhatsAppAccountToken(supabase, projectId);
  if (!creds) {
    return NextResponse.json({ error: "WhatsApp account not connected" }, { status: 400 });
  }

  const result = await getPhoneNumberInfo(creds.access_token, creds.phone_number_id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  const healthStatus = result.health_status ?? null;
  const canSendMessage = healthStatus?.can_send_message ?? null;
  const paymentError = healthStatus?.entities
    ?.flatMap((e) => e.errors ?? [])
    .find((e) => e.error_code === 131042) ?? null;

  const healthData = {
    display_phone_number: result.display_phone_number,
    quality_rating: result.quality_rating,
    platform_type: result.platform_type,
    verified_name: result.verified_name,
    code_verification_status: result.code_verification_status,
    status: result.status,
    health_status: healthStatus,
    can_send_message: canSendMessage,
    refreshed_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("whatsapp_accounts")
    .update({
      phone_number: result.display_phone_number ?? undefined,
      quality_rating: result.quality_rating ?? undefined,
      health_data: healthData,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    ...healthData,
    payment_issue: paymentError ? true : false,
    payment_error_description: paymentError?.error_description ?? null,
  });
}
