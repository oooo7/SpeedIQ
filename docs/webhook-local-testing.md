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

## 5. Test

- Send a message to your WhatsApp Business number from your phone.
- You should see the request in the ngrok terminal and the message in your app (e.g. Live Chat).

**Note:** The free ngrok URL changes each time you restart ngrok. After restarting, update the Callback URL in Meta and verify again.
