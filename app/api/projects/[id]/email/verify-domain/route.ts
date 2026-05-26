import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectRole } from "@/lib/team";
import {
  addDomain,
  getDomain,
  verifyDomain,
  extractDomainFromEmail,
} from "@/lib/email/resend-domains";

/**
 * GET: Return current verification status and DNS records if pending.
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
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: row } = await supabase
    .from("project_email_settings")
    .select("from_email, domain_verified, resend_domain_id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (!row?.from_email) {
    return NextResponse.json({
      verification_status: "none",
      message: "Set a from email address first",
    });
  }

  if (row.domain_verified) {
    return NextResponse.json({
      verification_status: "verified",
      from_email: row.from_email,
    });
  }

  if (!row.resend_domain_id) {
    return NextResponse.json({
      verification_status: "pending",
      from_email: row.from_email,
      message: "Click Verify domain to register and get DNS records",
    });
  }

  const result = await getDomain(row.resend_domain_id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const isVerified = result.status === "verified";

  if (isVerified) {
    const admin = createAdminClient();
    await admin
      .from("project_email_settings")
      .update({
        domain_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", projectId);
  }

  return NextResponse.json({
    verification_status: isVerified ? "verified" : "pending",
    from_email: row.from_email,
    status: result.status,
    records: result.records ?? [],
  });
}

/**
 * POST: Register domain in Resend if not done, or check verification status.
 * Returns DNS records when pending.
 */
export async function POST(
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
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: row } = await supabase
    .from("project_email_settings")
    .select("from_email, domain_verified, resend_domain_id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (!row?.from_email) {
    return NextResponse.json(
      { error: "Set a from email address in Settings first" },
      { status: 400 }
    );
  }

  const domain = extractDomainFromEmail(row.from_email);
  if (!domain) {
    return NextResponse.json(
      { error: "Invalid from email address" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // If we've already registered with Resend, just refresh status. Also kick
  // off an explicit verify so Resend re-checks DNS instead of waiting for
  // its background poll.
  if (row.resend_domain_id) {
    await verifyDomain(row.resend_domain_id).catch(() => undefined);
    const result = await getDomain(row.resend_domain_id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    const isVerified = result.status === "verified";
    if (isVerified) {
      await admin
        .from("project_email_settings")
        .update({
          domain_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId);
    }
    return NextResponse.json({
      verification_status: isVerified ? "verified" : "pending",
      status: result.status,
      records: result.records ?? [],
    });
  }

  // Prevent the same domain from being registered for two projects: Resend
  // rejects duplicates, and even when it wouldn't, two projects sharing a
  // sending domain would have surprising bounce/complaint routing.
  const { data: existingDomainOwner } = await admin
    .from("project_email_settings")
    .select("project_id, from_email")
    .neq("project_id", projectId)
    .ilike("from_email", `%@${domain}`)
    .not("resend_domain_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (existingDomainOwner) {
    return NextResponse.json(
      {
        error: `Domain "${domain}" is already registered to another project. Each domain can only be verified in one project.`,
      },
      { status: 409 }
    );
  }

  const addResult = await addDomain(domain);
  if ("error" in addResult) {
    return NextResponse.json({ error: addResult.error }, { status: 500 });
  }

  await admin
    .from("project_email_settings")
    .update({
      resend_domain_id: addResult.id,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId);

  // Immediately ask Resend to verify. If user pre-added DNS, this can flip
  // to "verified" right away; otherwise it stays "pending".
  await verifyDomain(addResult.id).catch(() => undefined);

  const isVerified = addResult.status === "verified";
  if (isVerified) {
    await admin
      .from("project_email_settings")
      .update({
        domain_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", projectId);
  }

  return NextResponse.json({
    verification_status: isVerified ? "verified" : "pending",
    status: addResult.status,
    records: addResult.records,
  });
}
