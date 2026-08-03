// R-46a — "/dashboard/meu-dia": rail do dia + coluna de contexto, só leitura.
// Spec: plans/specs/R-46-meu-dia.md. Porta: CTA no hero do dashboard (next-appointment-hero.tsx).
// R-46g — aceita ?ag= pra pré-selecionar o slot que a porta clicada já sabia qual era
// (spec R-46g-porta-modo-consulta.md §6.1). Nunca busca agendamento por esse id — só
// pré-seleciona um slot que já veio do fetch escopado por clínica+dentista; se não casar
// com nada, cai no default de sempre (in_progress/checked_in, senão o 1º).

import { redirect } from 'next/navigation';
import { getDentistaCached } from '@/lib/get-dentista';
import { getMeuDiaData } from '@/server/dashboard/get-meu-dia';
import { dataExtensaBRT } from '@/lib/hora-brt';
import { PageContainer } from '@/components/layout/page-container';
import { MeuDiaClient } from './_components/meu-dia-client';

interface MeuDiaPageProps {
  searchParams: Promise<{ ag?: string }>;
}

export default async function MeuDiaPage({ searchParams }: MeuDiaPageProps) {
  const dentista = await getDentistaCached();
  if (!dentista) redirect('/login');
  // Meu dia é o dia do dentista em atendimento (D2 da spec) — agendamentos são silo por
  // dentista_id (RLS, migration 099); pra secretaria isso seria sempre vazio.
  if (dentista.role === 'secretaria') redirect('/dashboard');

  const { ag } = await searchParams;
  const now = new Date();
  const { slots, contextoPorPaciente, catalogoProcedimentos } = await getMeuDiaData({
    clinicId: dentista.clinica_id,
    dentistaId: dentista.id,
    now,
  });

  const agendamentoInicialId = ag && slots.some((s) => s.agendamentoId === ag) ? ag : undefined;

  return (
    <PageContainer variant="wide">
      <header className="mb-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-text-secondary/60">
          Meu dia
        </p>
        <h1 className="font-heading text-3xl font-bold capitalize text-text-primary">
          {dataExtensaBRT(now)}
        </h1>
      </header>

      <MeuDiaClient
        slots={slots}
        contextoPorPaciente={contextoPorPaciente}
        agendamentoInicialId={agendamentoInicialId}
        catalogoProcedimentos={catalogoProcedimentos}
      />
    </PageContainer>
  );
}
