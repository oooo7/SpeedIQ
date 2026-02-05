# Meta App: Where to Add Your Domain for WhatsApp Embedded Signup

If you see **"Can't load URL: The domain of this URL isn't included in the app's domains"**, add your domain and redirect URI in **all three** places below. Meta checks each one separately.

---

## 1. Basic Settings → App Domains

- **Path:** [App Dashboard](https://developers.facebook.com/apps) → your app → **Settings** (left sidebar) → **Basic**
- **Field:** **App domains**
- **Add:** Domain only, **no** `https://` and **no** path.
  - Examples: `www.speediq.ai`, `speediq.vercel.app`, `xxxx.ngrok-free.app`
- Remove any entry that looks like `https://speediq.vercel.app/` (invalid).

---

## 2. Facebook Login for Business → Allowed domains

- **Path:** App Dashboard → **Use cases** (or **Products**) → **Customize** (next to “Facebook Login for Business”) → **Facebook Login for Business** → **Settings** → **Client OAuth settings**
- **Field:** **Allowed domains**
- **Add:** The same **domain only** as in step 1 (e.g. `www.speediq.ai`, `speediq.vercel.app`, or your ngrok domain).

Also in **Client OAuth settings**, set these to **Yes**:

- Client OAuth login  
- Web OAuth login  
- Enforce HTTPS  
- Embedded Browser OAuth Login  
- Use Strict Mode for redirect URIs  
- Login with the JavaScript SDK  

---

## 3. Facebook Login for Business → Valid OAuth redirect URIs

- **Path:** Same as step 2: **Facebook Login for Business** → **Settings** → **Client OAuth settings**
- **Field:** **Valid OAuth redirect URIs**
- **Add:** The **dedicated callback URL** only (one URL per environment):
  - Production: `https://www.speediq.ai/api/whatsapp/callback` or `https://speediq.vercel.app/api/whatsapp/callback`
  - Local/ngrok: `https://xxxx.ngrok-free.app/api/whatsapp/callback`
- The app uses a **redirect flow**: user clicks “Connect with WhatsApp” → goes to Facebook → returns to this callback URL. No need to add the dashboard page URL here.

---

## Quick reference

| What to add        | Where                                           | Example                                    |
|--------------------|--------------------------------------------------|--------------------------------------------|
| Domain only        | Settings → Basic → App domains                   | `www.speediq.ai`                           |
| Domain only        | Facebook Login for Business → Allowed domains   | `www.speediq.ai`                           |
| Callback URL only  | Facebook Login for Business → Valid OAuth redirect URIs | `https://www.speediq.ai/api/whatsapp/callback` |

If you change URL (e.g. new ngrok subdomain or new Vercel preview), add the new domain and new callback URL in **all three** places and save.
