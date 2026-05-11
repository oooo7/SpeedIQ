import { NextResponse } from "next/server";

import { buyTwilioNumber, fetchIncomingNumber, searchTwilioAvailableNumbers, attachTwilioNumberToMessagingService } from "@/lib/sms/numbers";
import { normalizeSmsPhone } from "@/lib/sms/phone";
import { requireProjectAccess } from "@/lib/sms/access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(projectId, { requireSmsEnabled: false });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  if (action === "search") {
    const country = (searchParams.get("country") || "US").toUpperCase();
    const areaCode = searchParams.get("areaCode") || undefined;
    const numbers = await searchTwilioAvailableNumbers(country, areaCode).catch((err: unknown) => {
      throw new Error(err instanceof Error ? err.message : "Failed to search available numbers");
    });
    return NextResponse.json({ numbers });
  }

  const { data, error } = await access.supabase
    .from("sms_numbers")
    .select("id, project_id, phone_number_e164, twilio_phone_number_sid, capabilities, status, is_default, created_at, updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ numbers: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(projectId, { requireSmsEnabled: false });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
  if (!["owner", "admin"].includes(access.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action ?? "");

  if (action === "buy") {
    const accountRow = await access.supabase
      .from("sms_accounts")
      .select("id, messaging_service_sid")
      .eq("project_id", projectId)
      .maybeSingle();
    if (!accountRow.data) return NextResponse.json({ error: "Configure SMS account first." }, { status: 400 });

    const purchased = await buyTwilioNumber({
      phoneNumber: body?.phone_number,
      messagingServiceSid: accountRow.data.messaging_service_sid || undefined,
      smsUrl: process.env.TWILIO_INBOUND_WEBHOOK_URL,
      statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL,
    });

    const { data, error } = await access.supabase
      .from("sms_numbers")
      .insert({
        project_id: projectId,
        sms_account_id: accountRow.data.id,
        phone_number_e164: normalizeSmsPhone(purchased.phoneNumber),
        twilio_phone_number_sid: purchased.sid,
        capabilities: purchased.capabilities,
        is_default: body?.is_default === true,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ number: data }, { status: 201 });
  }

  if (action === "attach") {
    const phoneNumberSid = String(body?.twilio_phone_number_sid ?? "").trim();
    if (!phoneNumberSid) return NextResponse.json({ error: "twilio_phone_number_sid is required" }, { status: 400 });

    const accountRow = await access.supabase
      .from("sms_accounts")
      .select("id, messaging_service_sid")
      .eq("project_id", projectId)
      .maybeSingle();
    if (!accountRow.data) return NextResponse.json({ error: "Configure SMS account first." }, { status: 400 });

    if (accountRow.data.messaging_service_sid) {
      await attachTwilioNumberToMessagingService(phoneNumberSid, accountRow.data.messaging_service_sid);
    }
    const incoming = await fetchIncomingNumber(phoneNumberSid);

    const { data, error } = await access.supabase
      .from("sms_numbers")
      .upsert(
        {
          project_id: projectId,
          sms_account_id: accountRow.data.id,
          phone_number_e164: normalizeSmsPhone(incoming.phoneNumber),
          twilio_phone_number_sid: incoming.sid,
          capabilities: incoming.capabilities,
          status: "active",
          is_default: body?.is_default === true,
        },
        { onConflict: "project_id,twilio_phone_number_sid" }
      )
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ number: data }, { status: 201 });
  }

  return NextResponse.json({ error: "Unsupported action. Use 'buy' or 'attach'." }, { status: 400 });
}
