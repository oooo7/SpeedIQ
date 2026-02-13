# Test WhatsApp webhook locally with ngrok

Meta’s servers need a **public HTTPS URL** to call your webhook. To test from your machine, use **ngrok** to expose your local dev server.

## 1. Install ngrok

- **macOS (Homebrew):** `brew install ngrok`
- **Or:** [ngrok.com/download](https://ngrok.com/download)

Sign up at [ngrok.com](https://ngrok.com) (free tier is enough) and run `ngrok config add-authtoken <your-token>` once.

## 2. Run your app locally

```bash
npm run dev
```

Your app will be at `http://localhost:3000` (or the port Next.js prints).

## 3. Start ngrok

In a **second terminal**:

```bash
ngrok http 3000
```

(Use the port from step 2 if different, e.g. `ngrok http 3001`.)

ngrok will show something like:

```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:3000
```

Copy the **https** URL (e.g. `https://abc123.ngrok-free.app`).

## 4. Configure Meta webhook

1. Open [Meta App Dashboard](https://developers.facebook.com/apps) → your app → **WhatsApp** → **Configuration** → **Webhook**.
2. **Callback URL:** `https://YOUR-NGROK-URL/api/webhooks/whatsapp`  
   Example: `https://abc123.ngrok-free.app/api/webhooks/whatsapp`
3. **Verify token:** Same value as in your `.env.local`:  
   `WHATSAPP_VERIFY_TOKEN=your-verify-token`
4. Click **Verify and save**.
5. Subscribe to **messages** (and **message_template_status_update** if needed).

## 5. Test live chat (end-to-end)

### Prerequisites

- **Terminal 1:** `npm run dev` (app on http://localhost:3000)
- **Terminal 2:** `ngrok http 3000` (tunnel running; Callback URL in Meta points to this ngrok URL)
- **In the app:** A project with WhatsApp account connected (Settings → WhatsApp account: Phone Number ID, WABA ID, Access Token saved)

### Steps

1. **Send a message to your Business number**
   - From your **personal WhatsApp** (phone), send any text (e.g. "Hi") to your **WhatsApp Business** number (the one linked in Meta / your app).
   - Meta will send a webhook POST to your ngrok URL → your local app stores the message and creates/updates the conversation.

2. **Open Chats in the app**
   - In the browser: http://localhost:3000 (log in if needed).
   - Go to **Dashboard → WhatsApp → Chats**.
   - Select the same **project** that has the WhatsApp account connected.
   - You should see a **new conversation** (or an existing one) with your phone number / name and an **unread** badge.
   - Click the conversation to open the thread; your incoming message ("Hi") should appear.

3. **Reply (within 24h window)**
   - While the conversation is open, type a message in the input at the bottom and click **Send**.
   - Your reply is sent via the WhatsApp Cloud API and appears in the thread (and in WhatsApp on your phone).
   - **Note:** You can only send **free-form text** if the contact messaged you in the last **24 hours**. After that, only **approved templates** can be sent (use the template buttons shown when "Template only" is displayed).

4. **Optional: watch the webhook**
   - Open **http://127.0.0.1:4040** (ngrok Inspect) to see the GET (verification) and POST (incoming message) requests from Meta.

**Note:** The free ngrok URL changes each time you restart ngrok. After restarting, update the Callback URL in Meta and verify again.
