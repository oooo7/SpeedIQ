# Meta App: Where to Add Your Domain for WhatsApp Embedded Signup

We use a **dedicated callback URL** for the WhatsApp OAuth flow: `/auth/whatsapp/connect`. That page is public (no auth required to load), so Meta can load it without hitting your protected dashboard. You only need **one** redirect URI in Meta.

If you see **"Can't load URL: The domain of this URL isn't included in the app's domains"**, add your domain and the single redirect URI in **all three** places below.

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
- **Add:** The **dedicated callback URL** (same for all environments):  
  `https://YOUR_DOMAIN/auth/whatsapp/connect`  
  Examples:  
  `https://www.speediq.ai/auth/whatsapp/connect`  
  `https://xxxx.ngrok-free.app/auth/whatsapp/connect`
- No query string or path suffix. One URL per domain (production, ngrok, Vercel, etc.).

---

## Quick reference

| What to add        | Where                                           | Example                                                |
|--------------------|--------------------------------------------------|--------------------------------------------------------|
| Domain only        | Settings → Basic → App domains                   | `www.speediq.ai`                                       |
| Domain only        | Facebook Login for Business → Allowed domains    | `www.speediq.ai`                                       |
| Single redirect URL| Facebook Login for Business → Valid OAuth redirect URIs | `https://www.speediq.ai/auth/whatsapp/connect` |

If you use a new domain (e.g. new ngrok subdomain), add that domain in steps 1 and 2 and add the corresponding `https://NEW_DOMAIN/auth/whatsapp/connect` in step 3.
