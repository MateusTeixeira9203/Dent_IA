'use client';

// R-58 — hierarquia invertida: o texto da visita em evidência, procedimentos como suporte.
// C1 permanece: acordeão, nasce aberto, mostra só a ÚLTIMA visita por padrão (decisão dele
// 03/08: "a última evolução é a mais importante"), "ver mais" expande pra lista inteira sem
// sair da aba (profundidade 1). Cada `RegistroCard` tem sua PRÓPRIA expansão pro detalhe de
// especialidade (profundidade 2) — mesmo componente que a ficha do paciente usa (§4.3 do
// R-58: reusar, não recriar).
//
// R-46c — botão de colar histórico do Word mora no estado vazio (visitas.length === 0).
// Independente de pendência/orto por construção do cockpit (blocos separados).

import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { RegistroCard } from '@/components/fichas/registro-card';
import { corpoEspecialidade } from '@/components/fichas/corpo-especialidade';
import { eventosParaCards, type EventoParaCard } from '@/lib/odontograma/eventos-para-cards';
import type { MeuDiaVisita, MeuDiaEventoVisita } from '@/server/dashboard/get-meu-dia';
import { BlocoMoldavel } from './bloco-moldavel';
import { fmtData } from './meu-dia-format';
import { ColarDoWordDialog } from '@/components/pacientes/colar-do-word-dialog';

export interface HistoricoBlocoProps {
  visitas: MeuDiaVisita[];
  pacienteId: string;
  pacienteNome: string;
  onImportado: () => void;
  aberto: boolean;
  onToggle: () => void;
}

const PREVIA = 1;

/** Adapta o view-model do Meu dia pro shape que `eventosParaCards`/`RegistroCard` esperam —
 *  mesmo padrão de `draftsParaCards` em FichasTab.tsx (cada chamador adapta seu tipo real).
 *  Assinatura/encaminhamento entram `null`: fora de escopo do histórico do Meu dia (R-58 §8
 *  — o prontuário oficial já cobre os dois). */
function paraCard(e: MeuDiaEventoVisita): EventoParaCard {
  return {
    id: e.id,
    grupoId: e.grupoId,
    tipo: e.tipo,
    status: e.status,
    ancora: {
      nivel: e.nivel,
      arcada: e.arcada ?? undefined,
      quadrante: e.quadrante ?? undefined,
      dente: e.dente ?? undefined,
      faces: e.faces,
    },
    origem: e.origem,
    observacao: e.observacao,
    detalhe: e.detalhe,
    realizadoEm: e.realizadoEm,
    registradoEm: e.registradoEm,
    assinaturaId: null,
    encaminhadoPara: null,
  };
}

/** G7 — corta em 4 linhas com "ver mais", só quando o texto REALMENTE transborda (mede
 *  scrollHeight vs clientHeight do próprio parágrafo clampado, não um chute por tamanho
 *  de string). */
function TextoVisita({ texto }: { texto: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [transbordou, setTransbordou] = useState(false);
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) setTransbordou(el.scrollHeight > el.clientHeight + 1);
  }, [texto]);

  return (
    <div className="flex flex-col gap-1">
      <p
        ref={ref}
        className={`whitespace-pre-line text-sm text-text-primary ${expandido ? '' : 'line-clamp-4'}`}
      >
        {texto}
      </p>
      {(transbordou || expandido) && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="w-fit text-[11px] font-semibold text-text-secondary hover:text-teal-ink"
        >
          {expandido ? 'mostrar menos ↑' : 'ver mais ↓'}
        </button>
      )}
    </div>
  );
}

function VisitaEntry({ v }: { v: MeuDiaVisita }) {
  const texto = v.texto || v.resumo; // G9 — resumo sempre não-vazio (cai em 'Evolução' no pior caso)
  const abertos = v.eventos.filter((e) => e.status === 'indicado').length;

  const cardsFeito = eventosParaCards(
    [...v.eventos.filter((e) => e.status === 'realizado'), ...v.feitosAqui].map(paraCard),
    v.dentistaNome, null,
  );
  const cardsIdentificado = eventosParaCards(
    v.eventos.filter((e) => e.status === 'indicado').map(paraCard),
    v.dentistaNome, null,
  );
  // R-58 §2 — "indicada em DD/MM": só os cards com ao menos 1 evento de `feitosAqui`
  // (indicado numa ficha DIFERENTE desta) ganham a legenda.
  const indicadoEmPorId = new Map(v.feitosAqui.map((e) => [e.id, e.indicadoEm]));

  return (
    <div className="flex flex-col gap-2.5 py-2.5 first:pt-0">
      {/* 1. Cabeçalho */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold text-text-primary">{fmtData(v.data)}</span>
        <div className="flex items-center gap-1.5">
          {/* §4.4 — "nada" quando semPendencia: o silêncio é o estado bom, sem badge. */}
          {!v.semPendencia && (
            <span className="text-[10px] font-bold text-coral-ink">{abertos} em aberto</span>
          )}
          {/* R-46c (I3) — nunca se apresenta como atendimento: rótulo próprio, nunca o
              nome do dentista como se ele tivesse feito a consulta. */}
          {v.importado ? (
            <span className="rounded border border-border bg-surface-alt px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
              Histórico importado
            </span>
          ) : (
            <span className="text-[11px] text-text-secondary">{v.dentistaNome}</span>
          )}
        </div>
      </div>

      {/* 2. Texto — o elemento de maior peso da entrada (hierarquia invertida, §1a) */}
      <TextoVisita texto={texto} />

      {/* 3. Feito nesta consulta — realizados desta ficha + fechados aqui, indicados alhures */}
      {cardsFeito.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="px-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            Feito nesta consulta
          </p>
          {cardsFeito.map((card) => {
            const indicadoEm = card.ids.map((id) => indicadoEmPorId.get(id)).find(Boolean);
            return (
              <div key={card.key} className="flex flex-col gap-0.5">
                <RegistroCard data={card.data}>
                  {corpoEspecialidade(card.data.tipo, card.data.detalhe)}
                </RegistroCard>
                {indicadoEm && (
                  <p className="px-1 text-[11px] text-text-secondary">indicada em {fmtData(indicadoEm)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Identificado nesta consulta — indicados desta ficha, ainda abertos por construção */}
      {cardsIdentificado.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="px-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            Identificado nesta consulta
          </p>
          {cardsIdentificado.map((card) => (
            <RegistroCard key={card.key} data={card.data}>
              {corpoEspecialidade(card.data.tipo, card.data.detalhe)}
            </RegistroCard>
          ))}
        </div>
      )}
    </div>
  );
}

export function HistoricoBloco({ visitas, pacienteId, pacienteNome, onImportado, aberto, onToggle }: HistoricoBlocoProps) {
  const [expandido, setExpandido] = useState(false);
  const [colarAberto, setColarAberto] = useState(false);
  const ultima = visitas[0] ?? null;
  const temMais = visitas.length > PREVIA;
  const visiveis = expandido ? visitas : visitas.slice(0, PREVIA);

  return (
    <>
      <BlocoMoldavel
        id="historico"
        titulo="Histórico"
        contador={visitas.length}
        resumo={
          ultima ? (
            <span className="text-xs text-text-secondary">
              {fmtData(ultima.data)} · {ultima.importado ? 'Histórico importado' : ultima.dentistaNome}
            </span>
          ) : undefined
        }
        aberto={aberto}
        onToggle={onToggle}
      >
        {visitas.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-secondary">
              Sem histórico no sistema ainda — o contexto nasce nesta consulta.
            </p>
            <button
              type="button"
              onClick={() => setColarAberto(true)}
              className="flex w-fit items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-teal/40 hover:text-teal-ink"
            >
              <FileText className="h-3.5 w-3.5" />
              Colar histórico do Word
            </button>
          </div>
        ) : (
          <>
            <div
              className={
                expandido
                  ? 'flex max-h-[420px] flex-col divide-y divide-border overflow-y-auto pr-2'
                  : 'flex flex-col divide-y divide-border'
              }
            >
              {visiveis.map((v) => (
                <VisitaEntry key={v.fichaId} v={v} />
              ))}
            </div>
            {temMais && (
              <button
                type="button"
                onClick={() => setExpandido((e) => !e)}
                className="mt-1 w-full text-center text-[11px] font-semibold text-text-secondary hover:text-teal-ink"
              >
                {expandido ? 'mostrar menos ↑' : `ver as ${visitas.length} visitas aqui mesmo ↓`}
              </button>
            )}
          </>
        )}
      </BlocoMoldavel>

      <ColarDoWordDialog
        pacienteId={pacienteId}
        pacienteNome={pacienteNome}
        open={colarAberto}
        onOpenChange={setColarAberto}
        onImportado={onImportado}
      />
    </>
  );
}
