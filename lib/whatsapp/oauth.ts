/**
 * WhatsApp Embedded Signup OAuth helpers.
 * Handles token exchange and WABA/phone number retrieval after OAuth flow.
 * See https://developers.facebook.com/docs/whatsapp/embedded-signup
 */

const META_GRAPH_BASE = "https://graph.facebook.com";
const API_VERSION = "v22.0";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface TokenError {
  error: string;
}

/**
 * Exchange authorization code for access token.
 * redirect_uri must match EXACTLY the page that spawned the OAuth dialog (required by Meta).
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri?: string
): Promise<TokenResponse | TokenError> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    return { error: "Facebook App credentials not configured" };
  }

  if (!redirectUri || !redirectUri.startsWith("https://")) {
    return {
      error:
        "redirect_uri is required and must be the exact URL of the page where you clicked Connect (HTTPS). Add this URL in Meta → Valid OAuth redirect URIs.",
    };
  }

  const url = new URL(`${META_GRAPH_BASE}/${API_VERSION}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);
  url.searchParams.set("redirect_uri", redirectUri);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error?.message || data.error?.error_message || "Token exchange failed";
    return { error: errorMsg };
  }

  return {
    access_token: data.access_token,
    token_type: data.token_type || "bearer",
    expires_in: data.expires_in,
  };
}

interface WABAResponse {
  waba_id: string;
  business_id: string;
  name?: string;
}

interface WABAError {
  error: string;
}

/**
 * Get app access token (required for debug_token and other server-side Graph calls).
 * Format: app_id|app_secret
 */
function getAppAccessToken(): string | null {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) return null;
  return `${appId}|${appSecret}`;
}

/**
 * Fetch the WhatsApp Business Account connected via Embedded Signup.
 * Tries multiple methods to find the WABA ID from the token's scopes.
 */
export async function fetchConnectedWABA(
  accessToken: string
): Promise<WABAResponse | WABAError> {
  const appAccessToken = getAppAccessToken();
  if (!appAccessToken) {
    return { error: "Facebook App credentials not configured" };
  }

  // debug_token requires an app access token (or app owner token), not the user token
  const debugUrl = `${META_GRAPH_BASE}/${API_VERSION}/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appAccessToken)}`;

  const debugResponse = await fetch(debugUrl);
  const debugData = await debugResponse.json();

  if (!debugResponse.ok) {
    return { error: debugData.error?.message || "Failed to debug token" };
  }

  // Check granular scopes for WABA ID
  const granularScopes = debugData.data?.granular_scopes || [];
  const wabaScope = granularScopes.find(
    (scope: { scope: string; target_ids?: string[] }) =>
      scope.scope === "whatsapp_business_management" ||
      scope.scope === "whatsapp_business_messaging"
  );

  if (wabaScope?.target_ids?.[0]) {
    const wabaId = wabaScope.target_ids[0];

    // Get business ID from WABA
    const wabaDetailsUrl = `${META_GRAPH_BASE}/${API_VERSION}/${wabaId}?fields=id,name,owner_business_info&access_token=${encodeURIComponent(accessToken)}`;
    const wabaDetailsResponse = await fetch(wabaDetailsUrl);
    const wabaDetails = await wabaDetailsResponse.json();

    return {
      waba_id: wabaId,
      business_id: wabaDetails.owner_business_info?.id || "",
      name: wabaDetails.name,
    };
  }

  // Fallback: fetch from /me/businesses
  const businessUrl = `${META_GRAPH_BASE}/${API_VERSION}/me/businesses?access_token=${encodeURIComponent(accessToken)}`;
  const businessResponse = await fetch(businessUrl);
  const businessData = await businessResponse.json();

  if (!businessResponse.ok || !businessData.data?.[0]) {
    return {
      error: "No WhatsApp Business Account found. Please complete the signup process in the popup.",
    };
  }

  const businessId = businessData.data[0].id;

  // Get WABAs for this business
  const wabaUrl = `${META_GRAPH_BASE}/${API_VERSION}/${businessId}/owned_whatsapp_business_accounts?access_token=${encodeURIComponent(accessToken)}`;
  const wabaResponse = await fetch(wabaUrl);
  const wabaData = await wabaResponse.json();

  if (!wabaResponse.ok || !wabaData.data?.[0]) {
    return { error: "No WhatsApp Business Account found for this business" };
  }

  return {
    waba_id: wabaData.data[0].id,
    business_id: businessId,
    name: wabaData.data[0].name,
  };
}

interface PhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
  code_verification_status?: string;
}

interface PhoneNumbersResponse {
  phone_numbers: PhoneNumber[];
}

interface PhoneNumbersError {
  error: string;
}

/**
 * Fetch phone numbers for a WhatsApp Business Account.
 */
export async function fetchPhoneNumbers(
  accessToken: string,
  wabaId: string
): Promise<PhoneNumbersResponse | PhoneNumbersError> {
  const url = `${META_GRAPH_BASE}/${API_VERSION}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status&access_token=${encodeURIComponent(accessToken)}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    return { error: data.error?.message || "Failed to fetch phone numbers" };
  }

  return {
    phone_numbers: data.data || [],
  };
}

interface WebhookSubscriptionResult {
  success: boolean;
}

interface WebhookSubscriptionError {
  error: string;
}

/**
 * Subscribe the app to webhooks for the WABA.
 * This ensures the app receives message notifications.
 */
export async function subscribeAppToWebhooks(
  accessToken: string,
  wabaId: string
): Promise<WebhookSubscriptionResult | WebhookSubscriptionError> {
  const url = `${META_GRAPH_BASE}/${API_VERSION}/${wabaId}/subscribed_apps`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      error: data.error?.message || "Failed to subscribe to webhooks",
    };
  }

  return { success: true };
}

/**
 * Validate if an access token is still valid.
 */
export async function validateAccessToken(
  accessToken: string
): Promise<{ valid: boolean; expires_at?: number; error?: string }> {
  const appAccessToken = getAppAccessToken();
  if (!appAccessToken) {
    return { valid: false, error: "Facebook App credentials not configured" };
  }
  const url = `${META_GRAPH_BASE}/${API_VERSION}/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appAccessToken)}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.data?.error) {
    return { valid: false, error: data.data?.error?.message || "Token invalid" };
  }

  return {
    valid: true,
    expires_at: data.data?.expires_at,
  };
}
