'use client';

// R-46d D1 (D7-D9) — o campo mágico é a entrada única do painel "Registrar", substituindo a
// barra de procedimento inteira (Combobox + OndeSeletor + Status), que migrou pra dentro da
// disclosure "Registrar sem IA" em `registrar-painel.tsx` (D1.2). `CapturaLivreCard` é reusado
// tal qual (D1 original) — só ganha a prop `anexarTexto` (D8) e o fix de token (D5).
//
// R-50 (05/08) — orto detectado deixa de virar TEXTO. Antes o campo mágico recebia
// `orto_manutencao` estruturado e o degradava pra uma linha no texto da visita ("Orto (a
// estruturar…)") com um toast avisando — o dado chegava e era jogado fora. Agora ele sobe pro
// dono do estado (`registrar-painel.tsx`), que abre o chip "Manutenção ortodôntica" já
// preenchido. A I2 ("nunca descarta em silêncio") continua valendo por construção: ou o orto
// vira estado editável, ou a rota devolveu null (arcada não dita, F2) e não há o que descartar.

import { useState } from 'react';
import { Bot, ChevronUp } from 'lucide-react';
import { CapturaLivreCard } from '@/components/fichas/captura-livre-card';
import { mesclarEventosSemPerda } from '@/lib/odontograma/dedup-eventos-draft';
import { hojeBRT } from '@/lib/hora-brt';
import type { OdontogramaEventoDraft, OrtoManutencaoInfo } from '@/types/odontograma';
import type { EvolucaoFormatada } from '@/app/api/dex/formatar-evolucao/route';
import type { SugestaoLocal } from '@/lib/odontograma/casar-procedimento-local';
import type { MeuDiaCatalogoProcedimento } from '@/server/dashboard/get-meu-dia';

export interface CampoMagicoMeuDiaProps {
  pacienteNome: string;
  eventosDraft: OdontogramaEventoDraft[];
  onEventosDraftChange: (eventos: OdontogramaEventoDraft[]) => void;
  textoVisita: string;
  onTextoVisitaChange: (texto: string) => void;
  /** Só escrita — quem lê é `handleSalvar` em `registrar-painel.tsx`, dono do estado local. */
  onAlertaNovoChange: (alerta: string | null) => void;
  /** R-50 — manutenção ortodôntica extraída pela IA. Mesmo padrão de `onAlertaNovoChange`: só
   *  escrita, o dono do estado é `registrar-painel.tsx` (que abre o chip já preenchido). */
  onOrtoDetectado: (orto: OrtoManutencaoInfo) => void;
  /** R-46d D8 — "usar este documento de base" (anexar-documentos-bloco.tsx), repassado direto
   *  pro CapturaLivreCard. */
  anexarTexto?: { texto: string; nonce: number; origem: 'audio' | 'documento' };
  /** R-62 — catálogo pro match local, repassado direto pro CapturaLivreCard. */
  catalogoProcedimentos: MeuDiaCatalogoProcedimento[];
  /** R-62 — clique num chip de sugestão local. Dono da lógica é `registrar-painel.tsx`
   *  (mesma função `registrar`/`escolherDoCatalogo` que a antiga "Registrar sem IA" usava). */
  onAplicarSugestao: (sugestao: SugestaoLocal) => void;
}

export function CampoMagicoMeuDia({
  pacienteNome, eventosDraft, onEventosDraftChange, textoVisita, onTextoVisitaChange,
  onAlertaNovoChange, onOrtoDetectado, anexarTexto, catalogoProcedimentos, onAplicarSugestao,
}: CampoMagicoMeuDiaProps) {
  const [aberto, setAberto] = useState(false);

  function aplicar(data: EvolucaoFormatada) {
    onEventosDraftChange(mesclarEventosSemPerda(eventosDraft, data.odontograma_eventos, hojeBRT()));

    const partes = [
      textoVisita,
      data.anotacoes,
      data.conduta && `Conduta: ${data.conduta}`,
    ].filter((s): s is string => Boolean(s));
    onTextoVisitaChange(partes.join('\n\n'));

    if (data.alerta_novo) onAlertaNovoChange(data.alerta_novo); // I3
    if (data.orto_manutencao) onOrtoDetectado(data.orto_manutencao); // R-50 — vira estado, não texto
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex w-full items-center gap-2 rounded-2xl border border-teal/30 bg-surface-alt/40 px-4 py-3.5 text-left transition-colors hover:border-teal/50"
      >
        <Bot className="h-4 w-4 shrink-0 text-teal-ink" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-teal-ink">Campo mágico</span>
        <span className="text-xs text-text-secondary">Fale, cole, anexe ou digite — o Dex monta a ficha</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setAberto(false)}
        className="flex w-fit items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-teal-ink"
      >
        <ChevronUp className="h-3 w-3" />
        Recolher
      </button>
      {/* 04/08 (achado ao vivo) — min-h-[520px] era do container "tela cheia" original (R-46c,
          revisar texto extraído longo); aqui o campo mágico é inline no painel Registrar, e a
          altura fixa deixava um vão vazio enorme entre os controles do CapturaLivreCard (que
          tem ~200px de conteúdo real) e o resto do painel. Tamanho segue o conteúdo. */}
      <div className="mx-auto w-full max-w-[90ch]">
        <CapturaLivreCard
          pacienteNome={pacienteNome}
          formDirty={eventosDraft.length > 0 || textoVisita.trim() !== ''}
          onOrganizado={aplicar}
          anexarTexto={anexarTexto}
          catalogoProcedimentos={catalogoProcedimentos}
          onAplicarSugestao={onAplicarSugestao}
        />
      </div>
    </div>
  );
}
