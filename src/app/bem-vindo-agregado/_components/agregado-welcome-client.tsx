'use client';

import { useState, useTransition } from 'react';
import { motion } from 'motion/react';
import { Stethoscope, Building2, Check, Loader2, CreditCard } from 'lucide-react';
import { createCheckoutAgregado, createPortalAgregado } from '../actions';

interface Props {
  clinicaNome: string;
  nomeDentista: string;
  checkout?: 'sucesso' | 'cancelado';
  statusAssinatura: string;
  emFormacao: boolean;
}

/** Extrai o primeiro nome (sem "Dr." ou "Dra.") para usar no cumprimento. */
function primeiroNome(nome: string): string {
  const limpo = nome.replace(/^(dr\.?|dra\.?)\s*/i, '').trim();
  return limpo.split(' ')[0] ?? limpo;
}

export function AgregadoWelcomeClient({ clinicaNome, nomeDentista, checkout, statusAssinatura, emFormacao }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ciclo, setCiclo] = useState<'mensal' | 'anual'>('mensal');

  const handlePagar = () => {
    setErrorMsg(null);
    setIsRedirecting(true);
    startTransition(async () => {
      const result = await createCheckoutAgregado(ciclo);
      if (result.error) {
        setErrorMsg(result.error);
        setIsRedirecting(false);
        return;
      }
      if (result.url) {
        window.location.href = result.url;
      }
    });
  };

  const handleRegularizar = () => {
    setErrorMsg(null);
    setIsRedirecting(true);
    startTransition(async () => {
      const result = await createPortalAgregado();
      if (result.error) {
        setErrorMsg(result.error);
        setIsRedirecting(false);
        return;
      }
      if (result.url) window.location.href = result.url;
    });
  };

  const precisaRegularizar = statusAssinatura === 'past_due' || statusAssinatura === 'suspended' || statusAssinatura === 'unpaid';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface rounded-3xl border border-border shadow-sm p-8 space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal/10 border border-teal/20 mb-2">
          <Stethoscope className="w-8 h-8 text-teal" />
        </div>
        <h1 className="font-heading font-semibold text-2xl text-text-primary">
          {nomeDentista
            ? <>Bem-vindo, Dr. {primeiroNome(nomeDentista)}!</>
            : 'Bem-vindo ao Odonto.IA!'}
        </h1>
        <p className="text-text-secondary text-sm leading-relaxed">
          Você agora faz parte da equipe de{' '}
          <strong className="text-text-primary">{clinicaNome}</strong>.
          <br />
          Os pacientes e as fichas são compartilhados com a equipe; cada dentista mantém seu fluxo financeiro privado.
        </p>
      </div>

      {/* O que é Dentista Agregado */}
      <div className="bg-surface-alt rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-teal" />
          <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">
            Como funciona
          </span>
        </div>
        {[
          'Você usa a estrutura da clínica para atender',
          'Pacientes e fichas ficam acessíveis à equipe, com edição protegida pelo responsável',
          'Sua agenda, seus orçamentos e seu financeiro permanecem no seu silo',
          'O acesso é liberado após a confirmação segura do pagamento',
        ].map((item) => (
          <div key={item} className="flex items-start gap-2.5">
            <div className="w-4 h-4 rounded-full bg-teal/10 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-2.5 h-2.5 text-teal stroke-[3]" />
            </div>
            <span className="text-sm text-text-primary">{item}</span>
          </div>
        ))}
      </div>

      {/* Taxa */}
      <div className="rounded-2xl border border-teal/25 bg-teal/5 p-5">
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-surface-alt p-1" role="radiogroup" aria-label="Ciclo de cobrança">
          {(['mensal', 'anual'] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              role="radio"
              aria-checked={ciclo === opcao}
              onClick={() => setCiclo(opcao)}
              className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${
                ciclo === opcao ? 'bg-surface text-teal shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {opcao === 'mensal' ? 'Mensal' : 'Anual · 2 meses grátis'}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">Plano Fundador</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {emFormacao ? 'Cartão salvo sem cobrança · 7 dias após formar a equipe' : '7 dias grátis começam após a confirmação'}
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono text-2xl font-semibold text-teal">{ciclo === 'mensal' ? 'R$200' : 'R$2.000'}</span>
            <span className="text-xs text-text-secondary">/{ciclo === 'mensal' ? 'mês' : 'ano'}</span>
          </div>
        </div>
      </div>

      {checkout === 'sucesso' && (
        <p className="text-sm text-teal bg-teal/10 rounded-xl px-4 py-2.5 text-center">
          {emFormacao ? 'Cartão confirmado. A equipe será ativada quando o segundo dentista concluir.' : 'Checkout concluído. Estamos confirmando sua assinatura com segurança.'}
        </p>
      )}

      {checkout === 'cancelado' && (
        <p className="text-sm text-amber-700 bg-amber-500/10 rounded-xl px-4 py-2.5 text-center">
          Checkout cancelado. Você pode retomar quando quiser.
        </p>
      )}

      {errorMsg && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5 text-center">
          {errorMsg}
        </p>
      )}

      {/* CTAs */}
      <div className="space-y-3">
        <button
          onClick={precisaRegularizar ? handleRegularizar : handlePagar}
          disabled={isPending || isRedirecting}
          className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #2f9c85 0%, #1e7a67 100%)',
            boxShadow: '0 4px 20px -4px rgba(47,156,133,0.45)',
          }}
        >
          {isPending || isRedirecting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecionando…</>
            : precisaRegularizar
              ? <><CreditCard className="w-4 h-4" /> Atualizar pagamento</>
              : <><CreditCard className="w-4 h-4" /> Adicionar cartão · {ciclo === 'mensal' ? 'R$200/mês' : 'R$2.000/ano'}</>
          }
        </button>

        <p className="text-center text-xs text-text-secondary">
          {emFormacao
            ? 'Nada é cobrado agora. O teste começa somente quando 2 dentistas concluírem.'
            : 'Seu teste de 7 dias começa após a confirmação da Stripe. A primeira cobrança ocorre ao final do período.'}
        </p>
      </div>
    </motion.div>
  );
}
