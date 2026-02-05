import { NextResponse } from "next/server";

/**
 * Public endpoint to get WhatsApp OAuth configuration.
 * Only returns non-sensitive config needed for the frontend SDK.
 */
export async function GET() {
  const appId = process.env.FACEBOOK_APP_ID;
  const configId = process.env.WHATSAPP_CONFIG_ID;
  const solutionId = process.env.WHATSAPP_SOLUTION_ID;

  if (!appId || !configId) {
    return NextResponse.json(
      { error: "WhatsApp Embedded Signup not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    appId,
    configId,
    solutionId: solutionId || null,
  });
}
