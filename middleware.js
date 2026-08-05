import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "@/lib/supabase/config";

export async function middleware(request) {
  // Local mode: no Supabase configured → no auth, app runs open.
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/auth");

  // Not signed in and not on an auth page → send to login.
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Already signed in but sitting on /login → send to the desk.
  if (user && path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on everything except Next internals, static assets, and the cron news
  // endpoint (which has no user session and guards itself with CRON_SECRET).
  // Excludes Next internals, the cron endpoint, and public assets — including
  // the OneSignal service workers and PWA manifest, which must be reachable
  // WITHOUT auth or the browser can't register push / install the app.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/news|OneSignalSDKWorker.js|OneSignalSDKUpdaterWorker.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js)$).*)",
  ],
};
