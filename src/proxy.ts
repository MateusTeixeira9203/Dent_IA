import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ROTAS_PUBLICAS = ["/", "/login", "/cadastro", "/esqueci-senha", "/redefinir-senha"];

function isRotaPublica(pathname: string): boolean {
  return ROTAS_PUBLICAS.some((r) => r === pathname);
}

export async function proxy(request: NextRequest) {
  const { response, session, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Rotas públicas: se autenticado, redireciona para dashboard ou onboarding
  // Exceto /redefinir-senha, que precisa permanecer acessível para o fluxo de recovery
  if (isRotaPublica(pathname)) {
    if (session && supabase && pathname !== "/redefinir-senha") {
      const { data } = await supabase
        .from("dentistas")
        .select("id")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();

      return Response.redirect(
        new URL(data ? "/dashboard" : "/onboarding", request.url)
      );
    }
    return response;
  }

  // /onboarding: só autenticado
  if (pathname === "/onboarding") {
    if (!session) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirectTo", "/onboarding");
      return Response.redirect(redirectUrl);
    }
    // Se já tem dentista, vai para dashboard
    if (supabase) {
      const { data } = await supabase
        .from("dentistas")
        .select("id")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();

      if (data) {
        return Response.redirect(new URL("/dashboard", request.url));
      }
    }
    return response;
  }

  // /dashboard/*: autenticado + deve ter dentista
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirectTo", pathname);
      return Response.redirect(redirectUrl);
    }
    if (supabase) {
      const { data } = await supabase
        .from("dentistas")
        .select("id")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();

      if (!data) {
        return Response.redirect(new URL("/onboarding", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
