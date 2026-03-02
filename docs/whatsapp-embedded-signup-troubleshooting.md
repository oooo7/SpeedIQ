# WhatsApp Embedded Signup: Accounts Not Showing

If Embedded Signup completes but no WhatsApp account appears, or the Meta popup doesn’t show any WhatsApp Business Accounts to select, check the following.

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

## 2. Existing WABAs from the developer app cannot be used

From Meta’s docs:

> **Existing WhatsApp Business Accounts (WABAs) that were originally created via the developer app cannot be selected or onboarded directly through the Embedded Signup flow.**

So:

- If the WABA was created in **WhatsApp → Quickstart** or via the **developer app**, it **will not** appear in the Embedded Signup account list.
- **Options:**  
  - Use Embedded Signup to **create a new WABA** in the flow and connect that, or  
  - Use **manual connection** (Settings → WhatsApp account → enter Phone Number ID, WABA ID, and Access Token from Meta).

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
