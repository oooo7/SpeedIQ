import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export interface DnsRecord {
  record: string;
  name: string;
  type: string;
  value: string;
  ttl?: string;
  status?: string;
  priority?: number;
}

export interface AddDomainResult {
  id: string;
  name: string;
  status: string;
  records: DnsRecord[];
}

export interface DomainStatusResult {
  id: string;
  name: string;
  status: string;
  records?: DnsRecord[];
}

/**
 * Add a domain to Resend. Returns domain id and DNS records for the user to add.
 */
export async function addDomain(domain: string): Promise<AddDomainResult | { error: string }> {
  if (!resend) return { error: "Resend is not configured" };
  const { data, error } = await resend.domains.create({ name: domain });
  if (error) return { error: error.message };
  if (!data?.id) return { error: "Failed to create domain" };
  const records = (data.records ?? []).map((r: { record?: string; name?: string; type?: string; value?: string; ttl?: string; status?: string; priority?: number }) => ({
    record: r.record ?? "",
    name: r.name ?? "",
    type: r.type ?? "",
    value: r.value ?? "",
    ttl: r.ttl,
    status: r.status,
    priority: r.priority,
  }));
  return {
    id: data.id,
    name: data.name ?? domain,
    status: data.status ?? "not_started",
    records,
  };
}

/**
 * Verify a domain. Triggers Resend to check DNS records.
 */
export async function verifyDomain(domainId: string): Promise<{ status: string } | { error: string }> {
  if (!resend) return { error: "Resend is not configured" };
  const { data, error } = await resend.domains.verify(domainId);
  if (error) return { error: error.message };
  return { status: "verified" };
}

/**
 * Get domain status and records from Resend.
 */
export async function getDomain(domainId: string): Promise<DomainStatusResult | { error: string }> {
  if (!resend) return { error: "Resend is not configured" };
  const { data, error } = await resend.domains.get(domainId);
  if (error) return { error: error.message };
  if (!data?.id) return { error: "Domain not found" };
  const records = (data.records ?? []).map((r: { record?: string; name?: string; type?: string; value?: string; ttl?: string; status?: string; priority?: number }) => ({
    record: r.record ?? "",
    name: r.name ?? "",
    type: r.type ?? "",
    value: r.value ?? "",
    ttl: r.ttl,
    status: r.status,
    priority: r.priority,
  }));
  return {
    id: data.id,
    name: data.name ?? "",
    status: data.status ?? "not_started",
    records,
  };
}

/**
 * Extract domain from email address (e.g. campaigns@clientcompany.com -> clientcompany.com).
 */
export function extractDomainFromEmail(email: string): string | null {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  const domain = trimmed.slice(at + 1).toLowerCase();
  if (!domain || domain.includes("@")) return null;
  return domain;
}
