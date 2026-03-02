# WhatsApp Embedded Signup: Accounts Not Showing

If Embedded Signup completes but no WhatsApp account appears, or the Meta popup doesn’t show any WhatsApp Business Accounts to select, check the following.

---

## “I only see ‘Create a WhatsApp Business account’ in the dropdown”

If the Embedded Signup screen shows **“Create or select your WhatsApp Business account”** but the dropdown only has **“Create a WhatsApp Business account”** (no existing accounts listed), this is **expected** when the business has no *Embedded-Signup-eligible* WABAs.

**Meta’s rule:** Only WABAs that were **created through Embedded Signup** (or certain partner flows) can appear in that list. **WABAs created in the Meta developer app** (e.g. WhatsApp → Quickstart, or your app’s WhatsApp setup in the dashboard) **never appear** there—Meta does not allow selecting them in this flow.

So even with both permissions approved, your users will only see “Create a WhatsApp Business account” if:

- They only have WABAs that were set up via the developer app / Quickstart, or  
- They have no WABAs yet.

**What to do:**

1. **Use manual connection**  
   For existing numbers set up in the developer app: in your app go to **Settings → WhatsApp account**, skip “Connect with WhatsApp”, and use **manual connection** with **Phone Number ID**, **WABA ID**, and **Access token** from [Meta Business Suite](https://business.facebook.com) → WhatsApp Manager (or the developer app).

2. **Or create a new WABA in the flow**  
   Users can choose “Create a WhatsApp Business account” in Embedded Signup, complete the flow, and then add/register a phone number. That new WABA will work with Embedded Signup.

There is no Meta setting or permission that makes developer-app WABAs show in the Embedded Signup dropdown; the only way to use those accounts in your app is **manual connection**.

---

## 1. Meta permissions (required for accounts to show)

Embedded Signup needs these permissions on your Meta app:

- **whatsapp_business_management** — access to WABA settings and message templates  
- **whatsapp_business_messaging** — send and receive messages  

**Where to set them:**

1. [Meta for Developers](https://developers.facebook.com/apps) → your app → **WhatsApp** → **Embedded Signup** (or **Embedded Signup Builder**).
2. Ensure your Embedded Signup **config** requests both permissions.
3. In **App Dashboard** → **App Review** → **Permissions and features**, request **Advanced access** for both.  
   - In **Development** mode, only admins/developers/testers see the flow; in **Live** mode, permissions must be **approved** via App Review or the flow will not show/grant access.

Without these (or without App Review when live), the popup may not list WABAs or the token may not have access to them.

---

## 2. Why existing WABAs don’t appear in the dropdown (Meta limitation)

From Meta’s docs:

> **Existing WhatsApp Business Accounts (WABAs) that were originally created via the developer app cannot be selected or onboarded directly through the Embedded Signup flow.**

So:

- Any WABA created in **WhatsApp → Quickstart** or in the **developer app dashboard** will **never** appear in the “Choose a WhatsApp Business account” dropdown. The dropdown only lists WABAs that are eligible for Embedded Signup (e.g. created via Embedded Signup or partner flows).
- **Options for your users:**  
  - **Manual connection:** Use **Settings → WhatsApp account** → manual section with Phone Number ID, WABA ID, and Access Token (from Meta Business Suite / developer app).  
  - **New WABA via Embedded Signup:** Choose “Create a WhatsApp Business account” in the flow and complete signup; then that new account is connected.

---

## 3. Domain and redirect URI (required for OAuth)

If the domain/redirect isn’t set correctly, the popup may not load or may redirect with errors.

Follow [meta-whatsapp-domains.md](./meta-whatsapp-domains.md) and set:

1. **Settings → Basic → App domains** — your domain only (e.g. `www.speediq.ai`).
2. **Facebook Login for Business → Client OAuth settings**  
   - **Allowed domains** — same domain  
   - **Valid OAuth redirect URIs** — your callback URL, e.g. `https://www.speediq.ai/api/whatsapp/callback`  
   - Enable **Client OAuth login**, **Web OAuth login**, **Embedded Browser OAuth Login**, **Use Strict Mode for redirect URIs**, **Login with the JavaScript SDK**.

Use **one** callback URL per environment (production, staging, ngrok). The redirect flow sends users to this URL after they authorize.

---

## 4. After connecting: “No WhatsApp Business Account found”

If the user completes the flow but our app shows an error like “No WhatsApp Business Account found” or “No business or WhatsApp account found”:

- The token may not include a WABA (e.g. user cancelled before selecting one, or no WABA was created).
- The app may not have the permissions above, or (in Live mode) they may not be approved.
- The WABA might be an “existing” one from the developer app (see §2).

The app will suggest: create a new WABA through the Connect flow or connect **manually** with Phone Number ID, WABA ID, and Access Token.

---

## 5. Quick checklist

| Check | Where |
|------|--------|
| Permissions requested in Embedded Signup config | WhatsApp → Embedded Signup |
| Advanced access for `whatsapp_business_management` and `whatsapp_business_messaging` | App Review → Permissions and features |
| App domains and Valid OAuth redirect URIs | Settings → Basic; Facebook Login for Business → Client OAuth |
| Use a **new** WABA from the flow, or manual credentials | N/A (user choice) |
| Env vars: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `WHATSAPP_CONFIG_ID` | `.env` / host |

For full setup steps, see [whatsapp-setup-checklist.md](./whatsapp-setup-checklist.md).

---

## 6. Error (#133010) Account not registered

If you see **(#133010) Account not registered** when sending messages, the business phone number is **not registered for the WhatsApp Cloud API**. Fix it by registering the number (e.g. in WhatsApp Manager or via the [Phone Number Registration API](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/registration/) with a 6-digit PIN). See [whatsapp-error-133010.md](./whatsapp-error-133010.md) for step-by-step instructions and API details.
