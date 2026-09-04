import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { clinicaIsentaDeCobranca } from '@/lib/billing/exemptions';
import { resolverEstadoComercial, type EstadoComercial } from '@/lib/billing/estado-comercial';
import { PlanosClient } from './_components/planos-client';

interface PlanosPageProps {
  searchParams: Promise<{ expired?: string; onboarding?: string; cancelado?: string }>;
}

export default async function PlanosPage({ searchParams }: PlanosPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const expired = params.expired === '1';

  // Valores padrão para usuário não autenticado
  let trialDisponivel = true;
  let estadoComercial: EstadoComercial = 'inativo';
  const billingAtivo = process.env.STRIPE_BILLING_ENABLED === 'true';

  if (user) {
    const service = createServiceClient();

    const { data: perfil } = await service
      .from('users')
      .select('active_clinica_id')
      .eq('id', user.id)
      .maybeSingle<{ active_clinica_id: string | null }>();

    if (perfil?.active_clinica_id) {
      const [{ data: clinica }, { data: assinatura }, { data: politicaTrial }] = await Promise.all([
        service
        .from('clinicas')
        .select('status_assinatura, trial_ends_at')
        .eq('id', perfil.active_clinica_id)
        .maybeSingle<{ status_assinatura: string; trial_ends_at: string | null }>(),
        service
          .from('assinaturas_dentista')
          .select('status')
          .eq('usuario_id', user.id)
          .eq('clinica_id', perfil.active_clinica_id)
          .maybeSingle<{ status: string }>(),
        service
          .from('politicas_trial_assinatura')
          .select('dias_trial')
          .eq('usuario_id', user.id)
          .eq('clinica_id', perfil.active_clinica_id)
          .maybeSingle<{ dias_trial: number }>(),
      ]);

      if (clinica) {
        trialDisponivel = politicaTrial?.dias_trial !== 0;
        estadoComercial = resolverEstadoComercial({
          isento: clinicaIsentaDeCobranca(perfil.active_clinica_id),
          statusAssinatura: billingAtivo ? assinatura?.status : assinatura?.status ?? clinica.status_assinatura,
        });
        if (!billingAtivo) trialDisponivel = !clinica.trial_ends_at;
        if (estadoComercial === 'isento') redirect('/dashboard/configuracoes?aba=plano');
      }
    }
  }

  return (
    <PlanosClient
      userId={user?.id ?? null}
      trialDisponivel={trialDisponivel}
      estadoComercial={estadoComercial}
      expired={expired}
      onboarding={params.onboarding === '1'}
      cancelado={params.cancelado === '1'}
    />
  );
}
