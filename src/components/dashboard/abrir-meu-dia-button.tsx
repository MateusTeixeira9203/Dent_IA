'use client';

// R-46g — era o "Entrar no Modo Consulta" (consulta-cta-button.tsx). Renomeado porque o
// destino mudou: agora abre o Meu dia, que ganhou a saída pro atendimento por slot (D3).
// R-72 (07/08) aposentou `/consulta/{agendamentoId}` de vez — este já era o único destino.

import { useRouter } from 'next/navigation';
import { CalendarClock } from 'lucide-react';

interface AbrirMeuDiaButtonProps {
  agendamentoId: string;
  pacienteNome: string;
  horario: string;
}

export function AbrirMeuDiaButton({ agendamentoId, pacienteNome, horario }: AbrirMeuDiaButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/dashboard/meu-dia?ag=${agendamentoId}`)}
      className="btn-glow inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.98]"
      style={{
        background: 'linear-gradient(135deg, #2f9c85 0%, #258872 50%, #1d7a65 100%)',
        boxShadow:
          '0 8px 32px rgba(47,156,133,0.45), 0 2px 8px rgba(47,156,133,0.2), inset 0 1px 0 rgba(255,255,255,0.16)',
      }}
    >
      <CalendarClock className="w-5 h-5 shrink-0" />
      Abrir meu dia → {pacienteNome}, {horario}
    </button>
  );
}
