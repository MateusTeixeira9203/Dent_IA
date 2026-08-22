'use client';

import { useState, useTransition } from 'react';
import { motion } from 'motion/react';
import { Check, Sparkles, Loader2, AlertCircle, Stethoscope, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NeuralBackground } from '@/components/layout/NeuralBackground';
import { createCheckout } from '../actions';
import { PLANOS } from '@/lib/planos';
import Link from 'next/link';

interface PlanosClientProps {
  userId: string | null;
  trialUsed: boolean;
  statusAssinatura: 'trial' | 'ativo' | 'inativo';
  expired: boolean;
}

const plans = [
  {
    id: 'SOLO' as const,
    name: 'Consultório',
    tagline: 'Para o dentista e seu consultório',
    icon: Stethoscope,
    price: String(PLANOS.SOLO.preco),
    pricePeriod: '/mês',
    description: 'Sistema completo para atendimento clínico — IA, fichas estruturadas, planejamento visual, orçamentos, agenda e secretária. Tudo para atender mais em menos tempo.',
    features: [
      '1 dentista com assinatura própria',
      'Ficha clínica estruturada por IA',
      'Planejamento e orçamento visual',
      'Transcrição de voz por IA',
      'Agenda e financeiro completo',
      'Modo Consulta com Dex',
    ],
    popular: false,
    trial: false,
    accent: 'rgba(47,156,133,0.12)',
    accentBorder: 'rgba(47,156,133,0.25)',
  },
  {
    id: 'CLINICA' as const,
    name: 'Clínica',
    tagline: 'Para consultórios com múltiplos dentistas',
    icon: Building2,
    price: String(PLANOS.CLINICA.preco),
    pricePeriod: '/dentista/mês',
    description: 'Para equipes de 2 a 8 dentistas. Cada profissional paga e administra a própria assinatura, mantendo seus silos privados.',
    features: [
      'De 2 a 8 dentistas',
      'Pagamento individual por dentista',
      'Pacientes e fichas compartilhados',
      'Agenda, orçamento e financeiro privados',
      'Gestão colaborativa da clínica',
    ],
    popular: true,
    trial: true,
    accent: 'rgba(47,156,133,0.08)',
    accentBorder: 'rgba(47,156,133,0.35)',
  },
];

export function PlanosClient({
  userId,
  trialUsed,
  statusAssinatura,
  expired,
}: PlanosClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ciclo, setCiclo] = useState<'mensal' | 'anual'>('mensal');

  const handleCheckoutClick = (planId: 'SOLO' | 'CLINICA') => {
    if (!userId) { router.push('/cadastro?next=/planos'); return; }
    if (planId === 'CLINICA') {
      router.push('/dashboard/configuracoes?aba=plano&criar=clinica');
      return;
    }
    setErrorMsg(null);
    setLoadingPlan(planId);
    startTransition(async () => {
      const result = await createCheckout(planId, ciclo);
      if (result.error) { setErrorMsg(result.error); setLoadingPlan(null); return; }
      if (result.url) window.location.href = result.url;
    });
  };

  const isActive = statusAssinatura === 'ativo';

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-bg">
      <NeuralBackground />

      <div className="z-10 w-full">
        {/* Header */}
        <div className="text-center pt-24 pb-4 px-6">
          <Link href="/" className="inline-block mb-8">
            <span className="text-2xl font-heading font-medium text-text-primary">
              Odonto<span className="italic text-teal">.IA</span>
            </span>
          </Link>

          {expired && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coral/10 border border-coral/20 text-coral text-sm font-medium mb-6"
            >
              <AlertCircle className="w-4 h-4" />
              Seu período de trial expirou. Escolha um plano para continuar.
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-4xl md:text-5xl text-text-primary mb-4"
          >
            Simples assim.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-text-secondary max-w-xl mx-auto"
          >
            Dois planos. Nenhuma feature escondida. Pague pelo que você precisa.
          </motion.p>
        </div>

        {errorMsg && (
          <div className="max-w-md mx-auto mt-4 px-6">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-coral/10 border border-coral/20 text-coral text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          </div>
        )}

        <div className="mx-auto mt-6 grid w-full max-w-sm grid-cols-2 gap-1 rounded-xl border border-border bg-surface-alt p-1" role="radiogroup" aria-label="Ciclo de cobrança">
          {(['mensal', 'anual'] as const).map((opcao) => (
            <button key={opcao} type="button" role="radio" aria-checked={ciclo === opcao} onClick={() => setCiclo(opcao)}
              className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${ciclo === opcao ? 'bg-surface text-teal shadow-sm' : 'text-text-secondary'}`}>
              {opcao === 'mensal' ? 'Mensal' : 'Anual · 2 meses grátis'}
            </button>
          ))}
        </div>

        {/* Cards */}
        <section className="py-12 px-6 max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"
          >
            {plans.map(plan => {
              const Icon = plan.icon;
              const isLoading = loadingPlan === plan.id;
              const canTrial = !trialUsed && !isActive && !!userId;

              return (
                <motion.div
                  key={plan.id}
                  variants={{
                    hidden: { opacity: 0, y: 32 },
                    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 16 } },
                  }}
                  className={`relative flex flex-col p-8 rounded-2xl bg-surface border shadow-sm hover:shadow-lg transition-all duration-300 ${
                    plan.popular
                      ? 'border-teal/30 ring-1 ring-teal/20'
                      : 'border-border'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                      <span className="bg-teal text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                        Mais escolhido
                      </span>
                    </div>
                  )}

                  {canTrial && (
                    <div className="absolute -top-3.5 right-6">
                      <span className="inline-flex items-center gap-1 bg-surface border border-teal/25 text-teal text-[10px] font-bold px-3 py-1 rounded-full">
                        <Sparkles className="w-3 h-3" />
                        7 dias grátis
                      </span>
                    </div>
                  )}

                  {/* Ícone + nome */}
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: plan.accent, border: `1px solid ${plan.accentBorder}` }}
                    >
                      <Icon className="w-5 h-5 text-teal" />
                    </div>
                    <div>
                      <h3 className="font-heading text-2xl text-text-primary leading-tight">{plan.name}</h3>
                      <p className="text-[11px] text-text-secondary font-medium">{plan.tagline}</p>
                    </div>
                  </div>

                  {/* Preço */}
                  <div className="mb-5 flex items-baseline gap-1 text-text-primary">
                    <span className="font-mono text-sm text-text-secondary">R$</span>
                    <span className="font-mono text-5xl font-medium tracking-tight">{ciclo === 'mensal' ? plan.price : '2.000'}</span>
                    <span className="text-text-secondary text-sm">{ciclo === 'mensal' ? plan.pricePeriod : plan.id === 'SOLO' ? '/ano' : '/dentista/ano'}</span>
                  </div>

                  <p className="text-sm text-text-secondary leading-relaxed mb-6 min-h-[56px]">
                    {plan.description}
                  </p>

                  {/* Features */}
                  <ul className="flex-1 space-y-3 mb-8">
                    {plan.features.map(feature => (
                      <li key={feature} className="flex items-center gap-2.5">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(47,156,133,0.12)' }}
                        >
                          <Check className="w-2.5 h-2.5 text-teal stroke-[3]" />
                        </div>
                        <span className="text-sm text-text-primary">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                    <button
                      onClick={() => handleCheckoutClick(plan.id)}
                      disabled={isActive || isLoading || isPending}
                      className="w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      style={plan.popular ? {
                        background: 'linear-gradient(135deg, #2f9c85 0%, #1e7a67 100%)',
                        boxShadow: '0 4px 20px -4px rgba(47,156,133,0.45)',
                        color: '#fff',
                      } : {
                        background: 'rgba(47,156,133,0.10)',
                        border: '1px solid rgba(47,156,133,0.25)',
                        color: '#2f9c85',
                      }}
                    >
                      {isLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecionando…</>
                        : isActive ? 'Plano Ativo' : plan.id === 'CLINICA' ? 'Montar equipe' : canTrial ? 'Começar 7 dias grátis' : 'Assinar agora'
                      }
                    </button>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Nota plano Clínica */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-text-secondary mt-8"
          >
            Plano Clínica: mínimo 2 e máximo 8 dentistas. Cada pessoa paga a própria assinatura.
          </motion.p>
        </section>

        <p className="text-center text-sm text-text-secondary pb-12">
          Cancele quando quiser. Sem fidelidade.
        </p>
      </div>
    </div>
  );
}
