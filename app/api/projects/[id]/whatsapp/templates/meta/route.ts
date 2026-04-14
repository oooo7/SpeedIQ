import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import {
  fetchMessageTemplatesFromMeta,
  getWhatsAppAccountToken,
} from "@/lib/whatsapp/api";

export const dynamic = "force-dynamic";

/**
 * GET: fetch approved templates directly from Meta for this project's WABA.
 * Used by the test-message picker so users see what actually works.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const creds = await getWhatsAppAccountToken(supabase, projectId);
  if (!creds) {
    return NextResponse.json({ error: "WhatsApp account not connected." }, { status: 400 });
  }

  const result = await fetchMessageTemplatesFromMeta(creds.access_token, creds.waba_id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  const approved = result.templates
    .filter((t) => t.status.toLowerCase() === "approved")
    .map((t) => {
      const bodyComp = t.components?.find((c) => c.type === "BODY");
      const variableCount = (bodyComp?.text?.match(/\{\{\d+\}\}/g) || []).length;
      return {
        name: t.name,
        language: t.language,
        category: t.category,
        id: t.id,
        hasVariables: variableCount > 0,
        variableCount,
      };
    });

  // Deduplicate by name — keep first occurrence per template name
  const uniqueByName = new Map<string, typeof approved[number]>();
  for (const t of approved) {
    if (!uniqueByName.has(t.name)) {
      uniqueByName.set(t.name, t);
    }
  }

  const templates = [...uniqueByName.values()];

  return NextResponse.json({
    templates,
    total_approved: approved.length,
    test_safe_count: approved.filter((t) => !t.hasVariables).length,
    has_templates_with_variables: approved.some((t) => t.hasVariables),
  });
}
