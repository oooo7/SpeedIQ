import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";
import { bootstrapPlatformAdminIfNeeded } from "@/lib/billing/platform-admin";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/projects/constants";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const withPathnameHeaders = () => {
    const h = new Headers(request.headers);
    h.set("x-pathname", pathname);
    return h;
  };

  let supabaseResponse = NextResponse.next({
    request: {
      headers: withPathnameHeaders(),
    },
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: {
              headers: withPathnameHeaders(),
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  //
  // Wrap with retry: this is the first network call of every request, and if
  // it throws (TypeError: fetch failed on a transient Supabase blip), the
  // middleware error surfaces as `{"error":"TypeError: fetch failed"}` to the
  // browser BEFORE any route handler's try/catch can run.
  let user: Record<string, unknown> | undefined;
  try {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data } = await supabase.auth.getClaims();
        user = data?.claims;
        break;
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        const transient =
          msg.includes("fetch failed") ||
          msg.includes("ECONNRESET") ||
          msg.includes("ETIMEDOUT") ||
          msg.includes("socket hang up");
        if (!transient || attempt === 2) throw err;
        await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
      }
    }
    if (user === undefined && lastErr) throw lastErr;
  } catch (err) {
    // Auth-check fetch is unrecoverable — let the request through with no
    // session so the route handler can return its own clean error instead of
    // the framework surfacing raw "TypeError: fetch failed" JSON.
    console.error("[middleware] auth getClaims failed after retries:", err);
    user = undefined;
  }

  // Webhooks (e.g. WhatsApp) are called by external services without a user session
  if (pathname.startsWith("/api/webhooks")) {
    return supabaseResponse;
  }

  // Cron endpoints are invoked by Supabase pg_cron with a Bearer token — no user session.
  // The route handlers validate CRON_SECRET themselves. Without this bypass, pg_net follows
  // the login redirect and the cron call appears to succeed (200) while never running.
  if (pathname.startsWith("/api/cron")) {
    return supabaseResponse;
  }

  // WhatsApp OAuth callback: allow through so we can read code/state and redirect to login if no session
  if (pathname === "/api/whatsapp/callback") {
    return supabaseResponse;
  }

  const PUBLIC_PREFIXES = [
    "/auth",
    "/login",
    "/features",
    "/pricing",
    "/compare",
    "/use-cases",
    "/legal",
    "/invite",
    "/unsubscribe",
    "/api/unsubscribe",
    "/sitemap.xml",
    "/robots.txt",
  ];

  const isPublicPath =
    pathname === "/" ||
    PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!user && !isPublicPath) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  const isDashboardRoute = pathname.startsWith("/dashboard");
  if (isDashboardRoute) {
    const activeProjectId = request.cookies.get(ACTIVE_PROJECT_COOKIE)?.value;
    if (!activeProjectId) {
      const url = request.nextUrl.clone();
      url.pathname = "/projects";
      return NextResponse.redirect(url);
    }
  }

  // Auto-promote to platform_admin if the user's email matches PLATFORM_ADMIN_EMAILS.
  // Cheap for non-admins (just an env-list string check); idempotent on repeat hits.
  // Best-effort: a transient fetch failure here shouldn't kill the request.
  if (user && typeof user.sub === "string") {
    try {
      await bootstrapPlatformAdminIfNeeded(supabase, {
        id: user.sub,
        email: typeof user.email === "string" ? user.email : undefined,
      });
    } catch (err) {
      console.error("[middleware] bootstrapPlatformAdminIfNeeded failed:", err);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
