# WhatsApp App Review – Steps to follow

Clear steps for recording and submitting the screencast. Tick off as you go.

---

## Part 1: Before recording (prep)

- [ ] **1.** App is deployed and reachable at the URL you’ll show (e.g. production or stable ngrok). Not localhost.
- [ ] **2.** Env vars set (see `whatsapp-setup-checklist.md`). WhatsApp account can send messages.
- [ ] **3.** In the app: **Settings → WhatsApp account** – one WhatsApp Business number is **connected**. Phone number and verified name are visible.
- [ ] **4.** If you use Embedded Signup: in Meta’s app add your domain and callback URL (App domains + Client OAuth Allowed domains + Valid OAuth redirect URIs).
- [ ] **5.** Pick a **test phone number** (e.g. your own). Have **native WhatsApp** open on that number (phone or WhatsApp Web).
- [ ] **6.** **Dry run:** In app go to **Settings → WhatsApp account** → Send test message: choose **hello_world**, enter test number (e.g. `917470915225`), click **Send test message**. Confirm the **same message** appears in the native WhatsApp app. If not, fix config and repeat.
- [ ] **7.** Set app UI to **English** (if you have a language switcher).
- [ ] **8.** Use a project that already has WhatsApp connected so you don’t connect mid-recording (unless you want to show the connect flow).

---

## Part 2: Recording the screencast (in order)

Record in **one continuous flow**. Meta must see all of this.

- [ ] **Step 1.** Open your app. Go to **Dashboard → Settings → WhatsApp account**.
- [ ] **Step 2.** Show the **connected** state: **Phone number** and **Verified name** clearly visible (asset selection).
- [ ] **Step 3.** (Optional) If you use Meta login/Embedded Signup, show the connect flow; otherwise add a note in submission that you use server-to-server / system user (no frontend Meta login).
- [ ] **Step 4.** Scroll to **Send test message**. Show **To (phone number)** and **Template** (select **hello_world**).
- [ ] **Step 5.** Enter your test phone number (country code, no + or spaces). Click **Send test message** (live send from app).
- [ ] **Step 6.** Switch to the **native WhatsApp app** (phone or WhatsApp Web) and show the **same message** delivered in the chat.
- [ ] **Step 7.** (Recommended) Add **captions or short labels** in the video for key steps (e.g. “Connected WhatsApp number”, “Send from app”, “Message in WhatsApp app”). Or use English voiceover explaining the buttons and flow.
- [ ] **Step 8.** Keep the recording **short and clear**: asset → send from app → message in WhatsApp. No long pauses or unrelated screens.

---

## Part 3: Submitting for review

- [ ] **1.** Upload the screencast in the App Review submission for `whatsapp_business_messaging`.
- [ ] **2.** In the submission notes, you can paste:  
  *“Screencast shows: (1) asset selection (WhatsApp Business account/number), (2) live send from app UI, (3) delivered message in native WhatsApp client.”*
- [ ] **3.** If your app has **no** frontend Meta login (e.g. server-to-server or system user token), add:  
  *“App uses server-to-server / system user token; frontend Meta login flow is not visible.”*
- [ ] **4.** Submit and wait for review.

---

## Quick reference

| Meta wants to see | Where in your app |
|-------------------|-------------------|
| Asset (number/account) | Settings → WhatsApp account → Connected card (phone number, verified name) |
| Live send | Settings → WhatsApp account → Send test message (hello_world → your number) |
| Message in native client | Show your phone or WhatsApp Web with the same message |

For more detail, see `whatsapp-app-review-screencast.md`.
