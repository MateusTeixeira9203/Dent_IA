'use client';

// R-78 F4 — "ler grande" (spec §1.4/G4b): texto de evolução longo lido no slot direito,
// fora da coluna estreita da gaveta de Histórico. Mesmo padrão do DenteHistoricoCard —
// leitura, não edição (o texto da visita não tem caminho de escrita a partir do Meu dia).

import type { MeuDiaVisita } from '@/server/dashboard/get-meu-dia';
import { OrtoCard } from '@/components/fichas/orto-card';
import { fmtData } from './meu-dia-format';

export interface VisitaLeituraCardProps {
  visita: MeuDiaVisita;
  onFechar: () => void;
}

export function VisitaLeituraCard({ visita, onFechar }: VisitaLeituraCardProps) {
  const texto = visita.texto || visita.resumo; // mesmo fallback de VisitaEntry (historico-bloco.tsx)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[15px] font-bold text-text-primary">{fmtData(visita.data)}</span>
        <span className="text-[12px] font-semibold text-text-secondary">
          {visita.importado ? 'Histórico importado' : visita.dentistaNome}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onFechar}
          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary"
        >
          ✕ voltar à boca
        </button>
      </div>

      <p className="whitespace-pre-line text-sm text-text-primary">{texto}</p>
      {visita.ortoManutencao && (
        <div className="rounded-xl border border-border bg-surface-alt/40 px-3 py-2.5">
          <OrtoCard valor={visita.ortoManutencao} />
        </div>
      )}
    </div>
  );
}
