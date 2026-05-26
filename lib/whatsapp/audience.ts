import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Helpers for resolving large WhatsApp campaign audiences.
 *
 * Two issues bite at scale (>1000 contacts) that these helpers fix:
 *   1. Supabase Cloud caps SELECT responses at 1000 rows unless you page.
 *      A tag with 30k contacts would silently return only 1000 without this.
 *   2. `.in("id", [30k uuids])` URL-encodes to ~1MB which may fail at the
 *      URL / Postgres query-length limits. Chunk the filter instead.
 */

const PAGE_SIZE = 1000;
const IN_FILTER_CHUNK = 500;

/**
 * Retry a Supabase operation on transient network failures. The Supabase JS
 * client throws `TypeError: fetch failed` on connection resets, DNS hiccups,
 * etc. — these are recoverable with backoff.
 */
export async function withFetchRetry<T>(
  op: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await op();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes("fetch failed") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("ENETUNREACH") ||
        msg.includes("ENOTFOUND") ||
        msg.includes("socket hang up");
      if (!isTransient || attempt === maxRetries) throw err;
      const delay = 500 * Math.pow(2, attempt);
      console.warn(`[supabase-retry] transient error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, msg);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/**
 * Get every unique contact_id linked to any of the given tags. Pages
 * through results so a 30k-contact tag isn't silently truncated to 1000.
 */
export async function getContactIdsForTags(
  supabase: SupabaseClient,
  tagIds: string[]
): Promise<string[]> {
  if (tagIds.length === 0) return [];
  const ids = new Set<string>();
  let from = 0;
  // Hard ceiling to avoid an infinite loop in case the cursor never advances.
  const MAX_PAGES = 200;
  for (let page = 0; page < MAX_PAGES; page++) {
    // Stable order is required — without it PostgreSQL may return rows in
    // different orders across requests and pagination can skip or repeat.
    // (Set handles repeats, but skipping = data loss.)
    const { data, error } = await withFetchRetry(async () =>
      supabase
        .from("whatsapp_contact_tags")
        .select("contact_id")
        .in("tag_id", tagIds)
        .order("contact_id")
        .range(from, from + PAGE_SIZE - 1)
    );
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{ contact_id: string }>;
    if (rows.length === 0) break;
    for (const r of rows) ids.add(r.contact_id);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return [...ids];
}

/**
 * Return the subset of contact_ids that are NOT opted out (or have no
 * opt_out value set), filtered to a single project. Chunks the IN clause
 * so a 30k-uuid filter doesn't blow past URL / query size limits.
 */
export async function filterOptedInContacts(
  supabase: SupabaseClient,
  projectId: string,
  contactIds: string[]
): Promise<string[]> {
  if (contactIds.length === 0) return [];
  const allowed: string[] = [];
  for (let i = 0; i < contactIds.length; i += IN_FILTER_CHUNK) {
    const chunk = contactIds.slice(i, i + IN_FILTER_CHUNK);
    const { data, error } = await withFetchRetry(async () =>
      supabase
        .from("whatsapp_contacts")
        .select("id")
        .eq("project_id", projectId)
        .in("id", chunk)
        .or("opt_out.eq.false,opt_out.is.null")
    );
    if (error) throw new Error(error.message);
    for (const r of (data ?? []) as Array<{ id: string }>) allowed.push(r.id);
  }
  return allowed;
}
