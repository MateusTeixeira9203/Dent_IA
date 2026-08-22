import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { NeuralBackground } from '@/components/layout/NeuralBackground';
import { OdontoIALogo } from '@/components/ui/dent-ia-logo';
import { AgregadoWelcomeClient } from './_components/agregado-welcome-client';

interface Props {
  searchParams: Promise<{ checkout?: 'sucesso' | 'cancelado' }>;
}

export default async function BemVindoAgregadoPage({ searchParams }: Props) {
  const { checkout } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // A página fica fora do dashboard justamente porque o dentista ainda não
  // possui membership ativa. O service client confere o vínculo pendente pelo
  // usuário autenticado, sem confiar em clinicId da URL.
  const db = createServiceClient();
  const { data: membership } = await db
    .from('clinica_usuarios')
    .select('clinica_id, role, status')
    .eq('usuario_id', user.id)
    .in('role', ['admin', 'dentista'])
    .in('status', ['pendente', 'suspenso'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ clinica_id: string; role: string; status: string }>();

  if (!membership) redirect('/dashboard');

  const clinicId = membership.clinica_id;
  const [{ data: clinicaData }, { data: dentistaData }, { data: assinaturaData }, { data: formacaoData }] = await Promise.all([
    db
      .from('clinicas')
      .select('nome')
      .eq('id', clinicId)
      .maybeSingle<{ nome: string }>(),
    db
      .from('dentistas')
      .select('nome')
      .eq('user_id', user.id)
      .eq('clinica_id', clinicId)
      .maybeSingle<{ nome: string }>(),
    process.env.STRIPE_BILLING_ENABLED === 'true'
      ? db.from('assinaturas_dentista').select('status')
          .eq('usuario_id', user.id).eq('clinica_id', clinicId)
          .maybeSingle<{ status: string }>()
      : Promise.resolve({ data: null }),
    process.env.STRIPE_BILLING_ENABLED === 'true'
      ? db.from('formacoes_clinica').select('id')
          .eq('clinica_id', clinicId)
          .in('status', ['aguardando_equipe', 'coletando_pagamento', 'ativando'])
          .maybeSingle<{ id: string }>()
      : Promise.resolve({ data: null }),
  ]);

  // Nome do dentista: perfil clínico > metadata auth > fallback genérico
  const nomeDentista =
    dentistaData?.nome ??
    (user.user_metadata?.nome as string | undefined) ??
    '';

  return (
    <div
      className="relative min-h-screen bg-bg flex flex-col items-center justify-center p-4"
      style={{
        '--color-bg': '#f5f3ef',
        '--color-surface': '#ffffff',
        '--color-surface-alt': '#eceae4',
        '--color-border': '#d4d1ca',
        '--color-text-primary': '#0d0d0d',
        '--color-text-secondary': '#8a8a8a',
      } as React.CSSProperties}
    >
      <NeuralBackground />

      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal text-white mb-4 shadow-lg">
            <OdontoIALogo className="w-7 h-7" />
          </div>
          <p className="text-text-secondary text-sm font-medium font-mono uppercase tracking-widest">
            Odonto.IA
          </p>
        </div>

        <AgregadoWelcomeClient
          clinicaNome={clinicaData?.nome ?? 'a clínica'}
          nomeDentista={nomeDentista}
          checkout={checkout}
          statusAssinatura={assinaturaData?.status ?? 'checkout_pendente'}
          emFormacao={Boolean(formacaoData)}
        />
      </div>
    </div>
  );
}
