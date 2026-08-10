import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export type MiddlewareSession = {
  id: string;
  email?: string;
} | null;

export interface UpdateSessionResult {
  response: NextResponse;
  session: MiddlewareSession;
}

export async function updateSession(
  request: NextRequest
): Promise<UpdateSessionResult> {
  // R-94 — propaga o pathname pro REQUEST (não pra response, que só o browser vê).
  // headers() em Server Component lê os headers do request que o Next.js processa
  // internamente; setar em response.headers não tem efeito nenhum ali. Sem isto,
  // dashboard/layout.tsx sempre lia pathname='', a condição do gate do protético
  // era sempre verdadeira, e todo load de /dashboard/protetico virava um redirect
  // pra /dashboard/protetico — loop infinito (derrubou o servidor de memória).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { response, session: null };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const session: MiddlewareSession = user
    ? { id: user.id, email: user.email ?? undefined }
    : null;

  return { response, session };
}
