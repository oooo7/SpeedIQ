import { NextResponse } from "next/server";

/**
 * Transient network errors thrown by `fetch` / supabase-js / pg connection drops.
 * The user can retry; the underlying cause is upstream flakiness, not bad input.
 */
export function isTransientNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("fetch failed") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ENETUNREACH") ||
    msg.includes("socket hang up")
  );
}

/**
 * Wrap a Next.js App Router handler so transient network errors return a
 * friendly 503 instead of leaking raw `TypeError: fetch failed` JSON to the
 * browser (which used to appear as `{"error":"TypeError: fetch failed"}` on
 * any route that talked to Supabase without its own try/catch).
 *
 * Usage:
 *   export const GET = (req, ctx) =>
 *     withRouteErrorHandler(() => handleGet(req, ctx));
 */
export async function withRouteErrorHandler(
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    console.error("[api] uncaught route error:", err);
    if (isTransientNetworkError(err)) {
      return NextResponse.json(
        {
          error: "Network error talking to the database. Please try again in a moment.",
        },
        { status: 503 }
      );
    }
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
