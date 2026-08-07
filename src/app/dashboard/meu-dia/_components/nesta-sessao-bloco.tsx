'use client';

// C1 — coluna direita, base. Era "Registros de hoje · N" dentro do RegistrarPainel (centro);
// sai de lá pra cá (Z2 da spec, resolvida pelo artefato v2: separa o gesto de registrar do
// de conferir). Reusa ToothGroupList — contrato §4 proíbe recriar.
//
// 03/08 — vira dois blocos, um por `status` do rascunho: "Concluídos hoje" (realizado) e
// "Novos procedimentos" (indicado — base do orçamento depois de salvar). O chip Status já
// existia no registro; isso só dá pra ele um lugar visível em vez de decidir uma lista
// invisível. Nascem fechados; título ganha destaque teal quando há rascunho.

import { ToothGroupList } from '@/app/consulta/[agendamentoId]/_components/tooth-group-list';
import type { OdontogramaEventoDraft } from '@/types/odontograma';

export interface NestaSessaoBlocoProps {
  vazio: string;
  eventos: OdontogramaEventoDraft[];
  onDenteClick: (dente: number) => void;
}

export function NestaSessaoBloco({ vazio, eventos, onDenteClick }: NestaSessaoBlocoProps) {
  return eventos.length === 0 ? (
    <p className="text-sm text-text-secondary">{vazio}</p>
  ) : (
    <div className="max-h-[420px] overflow-y-auto pr-2">
      <ToothGroupList eventos={eventos} onDenteClick={onDenteClick} />
    </div>
  );
}
