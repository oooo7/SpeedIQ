# WhatsApp Business Messaging – App Review screencast guide

Meta rejected the `whatsapp_business_messaging` permission because the screencast did **not** show the full end-to-end flow: sending a message from your app and that same message appearing in the native WhatsApp client.

Use this guide when re-recording and re-submitting for App Review.

---

## App features and modifications before the video

**You do not need new features.** The app already has everything reviewers need:

- **Asset (number) visible:** Settings → WhatsApp account shows the connected phone number and verified name.
- **Connect / grant access:** Embedded Signup or manual connect is already there.
- **Live send from app:** Settings → “Send test message”, or WhatsApp → Chats, or WhatsApp → Campaigns.
- **Same message in native client:** You show that in the video on your phone/WhatsApp Web; no app change.

**Optional copy tweaks (already done):** To make the flow obvious in the recording, we added:
- On the **Connected** card: a line that this number is used when sending from the app (test message, Chats, Campaigns).
- On **Send test message**: a description that the message is delivered to the recipient’s WhatsApp app, plus a clearer placeholder for the phone number (country code, no + or spaces).

No other app features or modifications are required before making the video.

---

## Before you record – app readiness

Do these **in the app and Meta** so the recording shows a real, working flow. If anything fails during the screencast, reviewers may reject again.

### 1. App is reachable and configured

- **Deploy** the app at the URL you’ll show in the video (e.g. production or a stable ngrok URL). Don’t record localhost unless you expose it; reviewers expect a real app.
- **Environment variables** are set for the deploy (see [whatsapp-setup-checklist.md](./whatsapp-setup-checklist.md)): at least WhatsApp account credentials (or Embedded Signup env so connect works), and any vars needed for sending.
- **Webhook** (optional for the send demo): required for inbound messages; for “Send test message” or campaign send you only need a valid access token and phone number ID.

### 2. WhatsApp Business number connected

- In **Dashboard → Settings → WhatsApp account**, a WhatsApp Business number is **connected** (via Embedded Signup or manual credentials).
- The **connected number and account** are visible on that page (phone number, verified name, etc.) so you can show “asset selection” in the video.
- If you use **Embedded Signup**, ensure in Meta’s app:
  - **Settings → Basic → App domains**: your app’s domain is added (no `https://`, no path).
  - **Facebook Login for Business → Client OAuth settings**: same domain in **Allowed domains**, and the exact callback URL (e.g. `https://yourdomain.com/dashboard/settings/whatsapp-account`) in **Valid OAuth redirect URIs**.  
  Otherwise the connect flow can fail during recording.

### 3. You can send a real message from the app

- **Easiest for the video:** **Settings → WhatsApp account** → “Send test message”:
  - Use template **hello_world** (Meta’s default for testing; no template approval needed).
  - Enter a **test recipient phone number** (e.g. your own) in E.164 without `+` (e.g. `917470915225`).
  - Click **Send test message** and confirm the message is delivered.
- **Alternative:** **Dashboard → WhatsApp → Chats**: open a conversation and send a text or template so the message appears in the native WhatsApp client.
- **Alternative:** **Dashboard → WhatsApp → Campaigns**: create a campaign with **hello_world** (or an approved template), add your number as the only recipient, send now, then show the message in WhatsApp.

### 4. Test recipient and native WhatsApp

- Have the **native WhatsApp app** (phone or WhatsApp Web) open and logged in for the **same number** you use as the test recipient.
- Do a **dry run** once: from your app send a message to that number, then check that the **exact same message** appears in the native client. If it doesn’t, fix token/number/config before recording.

### 5. UI language

- Meta expects the **app UI in English** during the screencast. If your app has a language switcher, set it to English before you start recording.

### 6. No surprises during the recording

- Avoid recording during token expiry or right after changing credentials; use a stable token (e.g. long-lived or system user) so “Send test message” or campaign send doesn’t fail on camera.
- If your app shows a **project selector**, pick one project that already has the WhatsApp account connected so you don’t have to connect mid-recording unless you want to show the connect flow.

---

## What Meta must see in the screencast

The reviewer needs to see **all** of the following in one continuous flow.

### 1. Asset selection (Page, account, or number visible)

- Show **which** WhatsApp Business account/number the user is using.
- In Habiv: go to **Dashboard → Settings → WhatsApp account** and show the connected number/account (or the selection step if connecting).
- Make it clear this is the asset (WABA/phone number) that will send messages.

### 2. Meta login flow (if applicable)

- If your app uses **Meta login** (e.g. Embedded Signup), show the complete login/connect flow.
- If your app is **server-to-server** or uses a **system user token** and there is **no** frontend Meta login, state this clearly in your submission notes so reviewers don’t expect a login screen.

### 3. User granting app access to the permission/feature

- Show the user consenting to or enabling WhatsApp Business Messaging (e.g. connecting the WhatsApp Business account, granting access).
- This can be the same as “asset selection” if that’s where the user connects the number.

### 4. Live send from your app

- In your app UI, **compose and send** a real message (e.g. from **Dashboard → WhatsApp → Chats** or **Campaigns**).
- The action must be a **live send** from the app, not a mock or placeholder.

### 5. Delivered message in the native WhatsApp client

- **On the same recording**, show the **native WhatsApp app** (phone or WhatsApp Web) where the **same message** appears as delivered.
- Timeline: User sends from Habiv → cut or show WhatsApp client → same message visible there.

---

## Checklist for the new screencast

- [ ] **Asset visible:** Page/account/number selection or connection is shown.
- [ ] **Meta login** shown (or note in submission: “server-to-server / system user, no frontend Meta login”).
- [ ] **User grants access** to the WhatsApp feature/number.
- [ ] **Live send** from Habiv UI (chats or campaigns).
- [ ] **Same message** visible in native WhatsApp (Messenger/Instagram/WhatsApp as applicable).
- [ ] **English** as the app UI language in the recording.
- [ ] **Captions and/or tooltips** explaining important steps, buttons, and UI elements.
- [ ] **End-to-end** in one flow: connect → send from app → see message in client.

---

## References from Meta

- **Screencast / screen recording guide:**  
  [Screen Recordings](https://developers.facebook.com/docs/app-review/submission-guide/screen-recordings/)
- **Permissions reference:**  
  [Permissions](https://developers.facebook.com/docs/permissions/)
- In your submission notes, you can add:  
  *“Screencast shows: (1) asset selection (WhatsApp Business account/number), (2) live send from app UI, (3) delivered message in native WhatsApp client.”*

---

## Habiv flows you can use for the recording

1. **Settings → WhatsApp account**  
   Show connected number (or connect flow). Then go to WhatsApp → Chats or Campaigns, send a message, then show WhatsApp app with that message.

2. **Dashboard → WhatsApp → Chats**  
   Pick a conversation, send a message from Habiv, then show the same thread in the native WhatsApp client with the message delivered.

3. **Dashboard → WhatsApp → Campaigns**  
   Create or use a campaign, add a test recipient (your own number), send, then show your WhatsApp app with the delivered message.

Keep the recording focused and short: connect/select asset → one clear send from app → same message in native client.
