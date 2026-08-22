"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Mail, CheckCircle2, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { AuthEntryShell } from "@/components/auth/auth-entry-shell";
import { authCallbackUrl, safeReturnPath } from "@/lib/auth/return-path";

function VerifiqueEmailContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const next = safeReturnPath(searchParams.get("next"), "/onboarding");
  const [isResending, setIsResending] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  async function handleReenviar(): Promise<void> {
    if (!email) {
      toast.error("Email não informado. Volte ao cadastro e tente novamente.");
      return;
    }

    setIsResending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: authCallbackUrl(window.location.origin, next) },
      });

      if (error) {
        toast.error("Erro ao reenviar. Tente novamente em alguns minutos.");
        return;
      }

      setReenviado(true);
      toast.success("Link reenviado! Verifique sua caixa de entrada.");
    } catch {
      toast.error("Erro ao reenviar. Tente novamente.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthEntryShell
      eyebrow="Confirmação de email"
      title="Verifique sua caixa de entrada."
      description="O link confirma sua identidade e devolve você ao ponto certo do fluxo."
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-surface/90 p-6 sm:p-8 rounded-2xl border border-border shadow-sm backdrop-blur-sm">
          {/* Ícone de email */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-teal-pale flex items-center justify-center">
              <Mail className="w-10 h-10 text-teal" />
            </div>
          </div>

          {/* Mensagem principal */}
          <div className="text-center mb-6">
            <p className="text-text-primary font-medium mb-2">
              Enviamos um link de verificação para:
            </p>
            {email ? (
              <p className="font-mono text-sm text-teal font-bold break-all">
                {email}
              </p>
            ) : (
              <p className="text-sm text-text-secondary">
                o email informado no cadastro
              </p>
            )}
          </div>

          {/* Instruções */}
          <div className="bg-surface-alt rounded-2xl p-4 mb-6 space-y-2">
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">1.</span>{" "}
              Abra o email que enviamos
            </p>
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">2.</span>{" "}
              Clique em <strong className="text-text-primary">&quot;Confirmar email&quot;</strong>
            </p>
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">3.</span>{" "}
              Você volta para continuar de onde parou
            </p>
            <p className="text-xs text-text-secondary pt-1 border-t border-border">
              Não encontrou? Verifique a pasta de spam ou lixo eletrônico.
            </p>
          </div>

          {/* Botão reenviar */}
          {reenviado ? (
            <div className="flex items-center justify-center gap-2 py-3 text-teal font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Email reenviado com sucesso!
            </div>
          ) : (
            <button
              onClick={handleReenviar}
              disabled={isResending || !email}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-teal/30 text-teal font-semibold text-sm hover:bg-teal/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Reenviando...</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> Reenviar email de verificação</>
              )}
            </button>
          )}

          <div className="mt-6 text-center">
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="inline-flex items-center gap-2 text-sm text-text-secondary font-semibold hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para o login
            </Link>
          </div>
        </div>
      </motion.div>
    </AuthEntryShell>
  );
}

export default function VerifiqueEmailPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal" />
        </div>
      }
    >
      <VerifiqueEmailContent />
    </Suspense>
  );
}
