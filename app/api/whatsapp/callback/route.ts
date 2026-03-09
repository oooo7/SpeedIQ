import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import { fetchProjectById } from "@/lib/projects";
import {
  exchangeCodeForToken,
  fetchConnectedWABA,
  fetchPhoneNumbers,
  subscribeAppToWebhooks,
} from "@/lib/whatsapp/oauth";

/**
 * Dedicated OAuth callback for WhatsApp Embedded Signup (redirect flow).
 * Facebook redirects here with ?code=...&state=projectId.
 * This URL is public (no auth wall) so the redirect works; we require session inside.
 * Add this exact URL to Meta → Valid OAuth redirect URIs (e.g. https://speediq.vercel.app/api/whatsapp/callback).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const code = request.nextUrl.searchParams.get("code")?.trim();
  const state = request.nextUrl.searchParams.get("state")?.trim();
  const metaError = request.nextUrl.searchParams.get("error")?.trim();

  const dashboardPath = "/dashboard/settings/whatsapp-account";
  const loginPath = "/auth/login";

  // No authorization code: user cancelled, Meta error (e.g. "Failed to share WABA"), or invalid callback.
  // Redirect to dashboard with a WhatsApp error so the user stays logged in; only send to login if session is missing.
  if (!code) {
    if (user && state) {
      const url = new URL(dashboardPath, request.url);
      url.searchParams.set("error", metaError === "access_denied" ? "whatsapp_cancelled" : "whatsapp_denied");
      if (metaError) url.searchParams.set("meta_error", metaError);
      return NextResponse.redirect(url);
    }
    if (!user) {
      const url = new URL(loginPath, request.url);
      url.searchParams.set("error", "whatsapp_callback_session");
      url.searchParams.set("next", dashboardPath);
      return NextResponse.redirect(url);
    }
    const url = new URL(dashboardPath, request.url);
    url.searchParams.set("error", "whatsapp_denied");
    return NextResponse.redirect(url);
  }

  if (!state) {
    const url = new URL(user ? dashboardPath : loginPath, request.url);
    if (user) url.searchParams.set("error", "whatsapp_denied");
    else url.searchParams.set("error", "whatsapp_callback_missing_params");
    if (!user) url.searchParams.set("next", dashboardPath);
    return NextResponse.redirect(url);
  }

  if (!user) {
    const url = new URL(loginPath, request.url);
    url.searchParams.set("error", "whatsapp_callback_session");
    url.searchParams.set("next", dashboardPath);
    return NextResponse.redirect(url);
  }

  const projectId = state;
  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role || (role !== "owner" && role !== "admin")) {
    const url = new URL(dashboardPath, request.url);
    url.searchParams.set("error", "forbidden");
    return NextResponse.redirect(url);
  }

  const { data: project } = await fetchProjectById(supabase, projectId);
  if (!project) {
    const url = new URL(dashboardPath, request.url);
    url.searchParams.set("error", "project_not_found");
    return NextResponse.redirect(url);
  }

  // redirect_uri must match exactly what we sent to Facebook (this callback URL)
  const callbackUrl = request.nextUrl.origin + request.nextUrl.pathname;

  try {
    const tokenResult = await exchangeCodeForToken(code, callbackUrl);
    if ("error" in tokenResult) {
      const url = new URL(dashboardPath, request.url);
      url.searchParams.set("error", "token_exchange");
      url.searchParams.set("message", encodeURIComponent(tokenResult.error));
      return NextResponse.redirect(url);
    }

    const { access_token, expires_in } = tokenResult;
    const wabaResult = await fetchConnectedWABA(access_token);
    if ("error" in wabaResult) {
      const url = new URL(dashboardPath, request.url);
      url.searchParams.set("error", "waba");
      url.searchParams.set("message", encodeURIComponent(wabaResult.error));
      return NextResponse.redirect(url);
    }

    const { waba_id, business_id } = wabaResult;
    const phoneResult = await fetchPhoneNumbers(access_token, waba_id);
    if ("error" in phoneResult) {
      const url = new URL(dashboardPath, request.url);
      url.searchParams.set("error", "phone_numbers");
      url.searchParams.set("message", encodeURIComponent(phoneResult.error));
      return NextResponse.redirect(url);
    }

    const phoneNumber = phoneResult.phone_numbers[0];
    if (!phoneNumber) {
      const url = new URL(dashboardPath, request.url);
      url.searchParams.set("error", "no_phone_number");
      return NextResponse.redirect(url);
    }

    await subscribeAppToWebhooks(access_token, waba_id);

    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null;

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

    const { error } = await supabase
      .from("whatsapp_accounts")
      .upsert(payload, { onConflict: "project_id", ignoreDuplicates: false });

    if (error) {
      const url = new URL(dashboardPath, request.url);
      url.searchParams.set("error", "save_failed");
      return NextResponse.redirect(url);
    }

    const url = new URL(dashboardPath, request.url);
    url.searchParams.set("connected", "1");
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("WhatsApp OAuth callback error:", err);
    const url = new URL(dashboardPath, request.url);
    url.searchParams.set("error", "server_error");
    return NextResponse.redirect(url);
  }
}
