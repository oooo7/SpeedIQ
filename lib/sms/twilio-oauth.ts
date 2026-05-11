let tokenCache: { token: string; expiresAtMs: number } | null = null;

export function getTwilioAccountSid(): string {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  if (!accountSid) {
    throw new Error("Missing TWILIO_ACCOUNT_SID");
  }
  return accountSid;
}

export async function getTwilioOAuthAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs > now + 60_000) {
    return tokenCache.token;
  }

  const clientId = process.env.TWILIO_OAUTH_CLIENT_ID;
  const clientSecret = process.env.TWILIO_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing TWILIO_OAUTH_CLIENT_ID or TWILIO_OAUTH_CLIENT_SECRET");
  }

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  const scope = process.env.TWILIO_OAUTH_SCOPE?.trim();
  if (scope) body.set("scope", scope);

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://oauth.twilio.com/v2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Failed to obtain Twilio OAuth access token");
  }

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  tokenCache = {
    token: data.access_token,
    expiresAtMs: now + expiresIn * 1000,
  };
  return data.access_token;
}

export async function twilioApiRequest(params: {
  url: string;
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  form?: Record<string, string | number | boolean | undefined>;
}) {
  const token = await getTwilioOAuthAccessToken();
  const method = params.method ?? "GET";
  const query = new URLSearchParams();
  if (params.query) {
    for (const [key, value] of Object.entries(params.query)) {
      if (value === undefined || value === null) continue;
      query.set(key, String(value));
    }
  }
  const requestUrl = query.size > 0 ? `${params.url}?${query.toString()}` : params.url;

  let body: string | undefined;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (method === "POST" && params.form) {
    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(params.form)) {
      if (value === undefined || value === null) continue;
      form.set(key, String(value));
    }
    body = form.toString();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const response = await fetch(requestUrl, { method, headers, body });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, status: response.status, data: json };
}
