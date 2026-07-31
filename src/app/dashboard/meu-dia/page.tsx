// R-46a — "/dashboard/meu-dia": rail do dia + coluna de contexto, só leitura.
// Spec: plans/specs/R-46-meu-dia.md. Porta: CTA no hero do dashboard (next-appointment-hero.tsx).

import { redirect } from 'next/navigation';
import { getDentistaCached } from '@/lib/get-dentista';
import { getMeuDiaData } from '@/server/dashboard/get-meu-dia';
import { dataExtensaBRT } from '@/lib/hora-brt';
import { MeuDiaClient } from './_components/meu-dia-client';

export default async function MeuDiaPage() {
  const dentista = await getDentistaCached();
  if (!dentista) redirect('/login');
  // Meu dia é o dia do dentista em atendimento (D2 da spec) — agendamentos são silo por
  // dentista_id (RLS, migration 099); pra secretaria isso seria sempre vazio.
  if (dentista.role === 'secretaria') redirect('/dashboard');

  const now = new Date();
  const { slots, contextoPorPaciente } = await getMeuDiaData({
    clinicId: dentista.clinica_id,
    dentistaId: dentista.id,
    now,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-text-secondary/60">
          Meu dia
        </p>
        <h1 className="font-heading text-3xl font-bold capitalize text-text-primary">
          {dataExtensaBRT(now)}
        </h1>
      </header>

      <MeuDiaClient slots={slots} contextoPorPaciente={contextoPorPaciente} />
    </div>
  );
}
