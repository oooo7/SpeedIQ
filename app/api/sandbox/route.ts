import { NextResponse } from "next/server";
import { twilioApiRequest, getTwilioAccountSid } from "@/lib/sms/twilio-oauth";

export async function POST(req: Request) {
  try {
    const { phone, email, type } = await req.json();

    if (!type || !["wa", "sm", "em"].includes(type)) {
      return NextResponse.json({ error: "Invalid communication channel." }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SMS Sandbox
    // ─────────────────────────────────────────────────────────────────────────
    if (type === "sm") {
      if (!phone) return NextResponse.json({ error: "Phone number required." }, { status: 400 });

      const hasTwilio = 
        process.env.TWILIO_ACCOUNT_SID && 
        process.env.TWILIO_OAUTH_CLIENT_ID && 
        process.env.TWILIO_OAUTH_CLIENT_SECRET && 
        (process.env.TWILIO_SENDER_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID);

      if (hasTwilio) {
        try {
          const accountSid = getTwilioAccountSid();
          const from = process.env.TWILIO_SENDER_NUMBER;
          const serviceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

          const payload: Record<string, string> = {
            To: phone,
            Body: "Hello from SpeedIQ Sandbox! Your SMS notification test was triggered successfully. 🚀"
          };

          if (serviceSid) {
            payload.MessagingServiceSid = serviceSid;
          } else if (from) {
            payload.From = from;
          }

          const response = await twilioApiRequest({
            url: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            method: "POST",
            form: payload
          });

          if (!response.ok) {
            console.error("Twilio Sandbox send failed:", response.data);
            return NextResponse.json({ success: true, simulated: true, warning: "Twilio error, fell back to simulation." });
          }

          return NextResponse.json({ success: true, simulated: false, sid: response.data.sid });
        } catch (err: any) {
          console.error("Twilio OAuth Exception:", err.message);
          return NextResponse.json({ success: true, simulated: true, warning: "Authentication issue, fell back to simulation." });
        }
      }

      // No credentials -> Graceful simulation
      return NextResponse.json({ success: true, simulated: true });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Email Sandbox
    // ─────────────────────────────────────────────────────────────────────────
    if (type === "em") {
      if (!email) return NextResponse.json({ error: "Email address required." }, { status: 400 });

      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: "onboarding@resend.dev", // Resend default for free testing
              to: email,
              subject: "SpeedIQ Sandbox Live Demo! 🚀",
              html: `
                <div style="font-family: sans-serif; padding: 24px; color: #111; background: #fafafa;">
                  <h2 style="color: #075e54; margin: 0 0 16px;">SpeedIQ Live Email Demo</h2>
                  <p>Hello! Your live email campaign notification was triggered successfully from the SpeedIQ Sandbox.</p>
                  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                  <p style="font-size: 12px; color: #666;">Sent via Resend integration. Configure your domain in the dashboard settings to launch custom campaigns.</p>
                </div>
              `
            })
          });

          const data = await res.json();
          if (!res.ok) {
            console.error("Resend Sandbox send failed:", data);
            return NextResponse.json({ success: true, simulated: true, warning: "Resend api returned error, fell back to simulation." });
          }

          return NextResponse.json({ success: true, simulated: false, id: data.id });
        } catch (err) {
          console.error("Resend fetch error:", err);
          return NextResponse.json({ success: true, simulated: true, warning: "Failed connecting to Resend, fell back to simulation." });
        }
      }

      // No credentials -> Graceful simulation
      return NextResponse.json({ success: true, simulated: true });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WhatsApp Sandbox (Meta Cloud API)
    // ─────────────────────────────────────────────────────────────────────────
    if (type === "wa") {
      if (!phone) return NextResponse.json({ error: "Phone number required." }, { status: 400 });

      const metaToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

      if (metaToken && phoneId) {
        try {
          const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${metaToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phone,
              type: "template",
              template: {
                name: "hello_world", // Default template created automatically by Meta for sandbox accounts
                language: { code: "en_US" }
              }
            })
          });

          const data = await res.json();
          if (!res.ok) {
            console.error("Meta WhatsApp Sandbox send failed:", data);
            return NextResponse.json({ success: true, simulated: true, warning: "Meta API error, fell back to simulation." });
          }

          return NextResponse.json({ success: true, simulated: false, id: data.messages?.[0]?.id });
        } catch (err) {
          console.error("Meta API fetch error:", err);
          return NextResponse.json({ success: true, simulated: true, warning: "Failed connecting to Meta Cloud API, fell back to simulation." });
        }
      }

      // No credentials -> Graceful simulation
      return NextResponse.json({ success: true, simulated: true });
    }

    return NextResponse.json({ error: "Unsupported channel." }, { status: 400 });

  } catch (err: any) {
    console.error("Sandbox Endpoint exception:", err);
    return NextResponse.json({ error: err.message || "Failed executing sandbox trigger." }, { status: 500 });
  }
}
