# WhatsApp API Error (#133010) Account not registered

This error means **the business phone number is not registered for the WhatsApp Cloud API**. You can’t send or receive messages until the number is registered.

---

## What it means

- Meta returned `(#133010) Account not registered` (or similar).
- The **Phone Number ID** you’re using (in manual connection or after Embedded Signup) is not yet registered for the Cloud API.
- Common when:
  - The number was set up in the developer app / Quickstart but never went through Cloud API registration.
  - The number was added to the WABA but registration (with PIN) wasn’t completed.

---

## How to fix it

### Option 1: Register via Meta (WhatsApp Manager)

1. Go to [Meta Business Suite](https://business.facebook.com) → **WhatsApp Manager** (or [developers.facebook.com](https://developers.facebook.com) → your app → **WhatsApp**).
2. Open the **WhatsApp Business Account** that owns the number.
3. Open the **phone number** you’re using.
4. Complete **registration for the Cloud API** if prompted (e.g. set or confirm a 6-digit two-step verification PIN and ensure the number is “Registered” for Cloud API).

If the UI doesn’t show a clear “Register” step, use the API below.

### Option 2: Register via API

Register the number by calling Meta’s Phone Number Registration endpoint with the same **access token** you use for sending (and `whatsapp_business_management` permission).

**Request:**

```http
POST https://graph.facebook.com/v22.0/{PHONE_NUMBER_ID}/register
Content-Type: application/json
Authorization: Bearer {ACCESS_TOKEN}

{
  "messaging_product": "whatsapp",
  "pin": "123456"
}
```

- **`{PHONE_NUMBER_ID}`** — The Phone Number ID from your app (Settings → WhatsApp account).
- **`{ACCESS_TOKEN}`** — The access token for that account (from manual connection or Embedded Signup).
- **`pin`** — A **6-digit PIN** you choose (two-step verification). You must remember it; Meta doesn’t send it. Only 0–9 allowed.

**Success:** Meta returns `{"success": true}`. After that, the number is registered and error 133010 should stop.

**Common errors:**

- **133005** — Wrong PIN (e.g. number was already registered with a different PIN). Use the correct PIN or reset two-step verification in WhatsApp Manager if possible.
- **133006** — Phone number re-verification needed (follow Meta’s flow).
- **133015** — Too many registration attempts. Meta allows a limited number of attempts per number in a 72-hour window; wait and try again later.

---

## Limit: 10 attempts per 72 hours

Meta allows **only a limited number of registration attempts per phone number in a 72-hour window** (e.g. 10). Failed attempts (wrong PIN, errors) count. If you hit the limit, you must wait before trying again.

---

## After registration

Once the number is registered:

- Sending messages (test message, campaigns, replies) should work.
- If you still see 133010, confirm you’re using the same **Phone Number ID** and **access token** that have `whatsapp_business_management` (and optionally `whatsapp_business_messaging`) and that the number is shown as “Registered” in WhatsApp Manager.

For general WhatsApp setup, see [whatsapp-setup-checklist.md](./whatsapp-setup-checklist.md).
