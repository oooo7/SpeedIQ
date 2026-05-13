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
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Webhooks (e.g. WhatsApp) are called by external services without a user session
  if (pathname.startsWith("/api/webhooks")) {
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
  if (user && typeof user.sub === "string") {
    await bootstrapPlatformAdminIfNeeded(supabase, {
      id: user.sub,
      email: typeof user.email === "string" ? user.email : undefined,
    });
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
