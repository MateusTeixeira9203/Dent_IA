'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CircleDashed, Loader2, RefreshCw } from 'lucide-react';
import { conferirRetornoCheckout, type EstadoRetornoCheckout } from '../actions';

type Tela = 'verificando' | 'aguardando' | 'erro';

export function CheckoutRetornoClient() {
  const [tela, setTela] = useState<Tela>('verificando');
  const [mensagem, setMensagem] = useState('Confirmando seu cadastro com segurança…');

  const conferir = useCallback(async (): Promise<EstadoRetornoCheckout> => {
    const resultado = await conferirRetornoCheckout();
    if (resultado.estado === 'confirmado') {
      window.location.assign(resultado.onboardingCompleto
        ? '/dashboard'
        : '/onboarding?step=dex&checkout=confirmed');
      return resultado;
    }
    if (resultado.estado === 'erro') {
      setTela('erro');
      setMensagem(resultado.mensagem);
      return resultado;
    }
    setTela('aguardando');
    setMensagem('A Stripe confirmou o retorno. Estamos aguardando a sincronização segura da assinatura.');
    return resultado;
  }, []);

  useEffect(() => {
    let cancelado = false;
    let tentativas = 0;
    const verificar = async () => {
      const resultado = await conferir();
      if (cancelado || resultado.estado !== 'aguardando') return;
      tentativas += 1;
      if (tentativas < 12) {
        window.setTimeout(() => { void verificar(); }, 2_500);
      } else {
        setTela('erro');
        setMensagem('A confirmação ainda não chegou ao sistema. Nenhuma cobrança será repetida: aguarde alguns minutos ou confira novamente.');
      }
    };
    void verificar();
    return () => { cancelado = true; };
  }, [conferir]);

  const carregando = tela === 'verificando';
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/10 text-teal">
          {carregando ? <Loader2 className="h-6 w-6 animate-spin" /> : tela === 'aguardando' ? <CircleDashed className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">Odonto.IA</p>
        <h1 className="mt-2 font-heading text-2xl text-text-primary">
          {tela === 'erro' ? 'Vamos tentar de novo' : 'Preparando seu acesso'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">{mensagem}</p>
        {tela !== 'verificando' && (
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => { setTela('verificando'); setMensagem('Confirmando seu cadastro com segurança…'); void conferir(); }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal px-4 text-sm font-bold text-white"
            >
              <RefreshCw className="h-4 w-4" /> Conferir novamente
            </button>
            <a href="/planos?onboarding=1" className="py-2 text-sm font-semibold text-teal">Voltar aos planos</a>
          </div>
        )}
      </section>
    </main>
  );
}
