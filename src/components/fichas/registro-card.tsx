'use client';

// Card de registro §11 (Roadmap A — Fatia A0, camada 2 da ficha).
// DESIGN: plans/specs/DESIGN-ficha-a0.md §4 (espelha o card do artefato §11).
//
// Card genérico de UM registro (ou de um GRUPO multi-dente do mesmo procedimento).
// Fiscalização legível: tipo · âncora · estado · data clínica · retroativo · autor+CRO
// · assinatura. Texto tingido usa os tokens -ink (nunca cor cheia — §2 do DESIGN, o
// bug de contraste recorrente da casa). O corpo de especialidade (camada 3: tabela de
// endo, chips de orto) entra como `children`, colapsável.

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronRight, Maximize2, Forward, Check, X, Clock } from 'lucide-react';
import { TextoExpansivel } from './texto-expansivel';
import {
  rotuloProcedimento,
  corDoRegistro,
  faceAbreviacao,
  type TipoRegistroOdontograma,
  type StatusRegistro,
  type OrigemRegistro,
  type MomentoPlanejado,
  type AncoraClinica,
} from '@/types/odontograma';

/** View-model do card — a ficha (Fase 4) mapeia os eventos crus pra cá. */
export interface RegistroCardData {
  tipo: TipoRegistroOdontograma;
  /** R-140b — snapshot do nome escolhido/digitado; vence o rótulo estrutural. */
  procedimentoNome?: string | null;
  status: StatusRegistro;
  origem: OrigemRegistro;
  /** R-101 — ver corDoRegistro. Default 'sessao_atual'. */
  momentoPlanejado: MomentoPlanejado;
  /** 1 âncora (registro único) ou N (grupo multi-dente do mesmo procedimento). */
  ancoras: AncoraClinica[];
  /** Data clínica (YYYY-MM-DD) — null em indicado/pré-existente sem data. */
  realizadoEm: string | null;
  /** Timestamp ISO em que o registro entrou no prontuário. */
  registradoEm: string;
  autorNome: string;
  autorCro: string | null;
  /** Ficha assinada pelo paciente. */
  assinada: boolean;
  /** Observação do procedimento (material, técnica, intercorrência) — itálico sob o título. */
  observacao: string | null;
  /** Dado clínico da especialidade (migration 106) — cru, ainda não validado por schema. */
  detalhe: unknown | null;
  /** Destino do encaminhamento (R-04) — null = não encaminhado. Leitura é aberta pra
   *  clínica inteira (migration 099); quem AGE é decidido por quem chama o card. */
  encaminhadoPara: { id: string; nome: string } | null;
  /** R-106 — proposta ambígua do campo mágico; só existe no rascunho editável. */
  revisarStatus?: boolean;
  /** Grupo contém eventos com status diferentes; não pode herdar o status do primeiro. */
  statusMisto?: boolean;
}

export interface RegistroCardProps {
  data: RegistroCardData;
  /** Corpo de especialidade (camada 3) — só passe quando há dado (I2). Torna o card colapsável. */
  children?: React.ReactNode;
  defaultOpen?: boolean;
  /**
   * Alterna planejado ⇄ realizado. Só passe quando o usuário PODE escrever (autor,
   * ficha não assinada) — sem isso o pill é só leitura. Bug 21/07: na ficha salva
   * não havia caminho pra marcar o que foi feito, tudo ficava "Planejado".
   */
  onToggleStatus?: () => void;
  /**
   * R-101 — liga/desliga "próxima seção" (só faz sentido com status='indicado'; a
   * constraint do banco não aceita em realizado). Só passe quando o usuário PODE
   * escrever — mesmo gate de onToggleStatus. Ausente = sem controle, só o pill de
   * status mostra a cor/rótulo (leitura sempre funciona via corDoRegistro).
   */
  onToggleMomento?: () => void;
  /**
   * Variante B — modo seleção (R-04 Fase 3): quando true, o card mostra um checkbox
   * à esquerda e o clique SELECIONA em vez de expandir. Só é passado pros encamináveis
   * (indicado · autor = eu · ficha não assinada · ainda não encaminhado). Card
   * já-encaminhado/inelegível nunca recebe isto — o esmaecimento dele é do FichasTab.
   */
  selecionavel?: boolean;
  selecionado?: boolean;
  onToggleSelecao?: () => void;
  /**
   * Decisão #7 (des-encaminhar): quando presente (autor · registro dele · indicado ·
   * não assinado · JÁ encaminhado), o badge "Encaminhado a {nome}" ganha um × que
   * remove o encaminhamento (dentistaDestinoId=null, silencioso). Ausente = só-leitura.
   */
  onRemoverEncaminhamento?: () => void;
  /**
   * R-02 Fase 1 — card em modo de edição (rascunho, ainda não salvo). Troca o parágrafo
   * de observação por um input e mostra um botão remover no header. O mesmo componente-
   * fonte desenha criação E leitura (I1) — só o corpo (children) muda entre
   * EndoForm/ImplanteForm editável e EndoCard/ImplanteCard só-leitura.
   */
  editavel?: boolean;
  /** Só relevante com editavel=true. */
  onObservacaoChange?: (valor: string) => void;
  /** Só relevante com editavel=true — remove o registro do rascunho. */
  onRemover?: () => void;
  /**
   * R-78 (achado dele 08/08, testando o Meu dia) — quando presente, o card NÃO expande
   * inline: o clique chama isto em vez de abrir `children` aqui dentro, e o ícone vira
   * "expandir" (⤢) em vez de "›". Pro chamador redirecionar conteúdo denso (tabela de
   * endo/implante) pra uma área com mais espaço — ex. o perfil do dente no Meu dia — em
   * vez de espremer numa coluna estreita (mesmo problema que motivou o redesign do R-78,
   * §1.4/§1.5 da spec). `children` é ignorado nesse modo.
   */
  onAbrirGrande?: () => void;
  /** Variante enxuta usada na bancada do Meu Dia. A ficha salva mantém o desenho atual. */
  compacto?: boolean;
  /** Controle externo do acordeão compacto — permite ao chamador manter só um card aberto. */
  aberto?: boolean;
  onAbertoChange?: (aberto: boolean) => void;
}

const PILL: Record<'coral' | 'teal' | 'slate' | 'warning' | 'misto', { label: string; wrap: string; dot: string }> = {
  teal:    { label: 'Realizado',      wrap: 'bg-teal-pale text-teal-ink',       dot: 'bg-teal' },
  coral:   { label: 'Planejado',      wrap: 'bg-coral-pale text-coral-ink',     dot: 'bg-coral' },
  slate:   { label: 'Pré-existente',  wrap: 'bg-slate-pale text-slate-ink',     dot: 'bg-slate' },
  warning: { label: 'Próxima seção',  wrap: 'bg-warning-pale text-warning-ink', dot: 'bg-warning' },
  misto:   { label: 'Status misto',   wrap: 'bg-surface-alt text-text-secondary border border-border', dot: 'bg-text-secondary' },
};

/** DD/MM/AAAA de um 'YYYY-MM-DD' SEM new Date() — evita o shift de fuso (UTC) que a casa já corrigiu. */
function fmtData(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Data BRT (YYYY-MM-DD) de um timestamp — pra comparar com a data clínica sem shift. */
function dataBRT(ts: string): string {
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/** Mantém a anotação clínica legível durante a digitação sem criar um editor paralelo. */
function ajustarAlturaObservacao(textarea: HTMLTextAreaElement, expandirVazio = false) {
  textarea.style.height = 'auto';
  const alturaMinima = expandirVazio ? 72 : 0;
  textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, alturaMinima), 160)}px`;
}

/**
 * Letras das faces unidas de todas as âncoras (M·O·D → "MOD"); '' se não houver.
 * União porque um card pode representar N eventos de face MESCLADOS do mesmo dente
 * (o Dex emite 1 evento por face; a UI junta — feedback 21/07).
 */
function facesTitulo(ancoras: AncoraClinica[]): string {
  return [...new Set(ancoras.flatMap((a) => (
    (a.faces ?? []).map((face) => a.dente == null ? face : faceAbreviacao(face, a.dente))
  )))].join('');
}

/** Resumo da âncora pro título: "dente 36" · "dentes 31 · 41 · 42" · "arcada superior" · "quadrante 3" · "boca toda". */
function resumoAncora(ancoras: AncoraClinica[]): string {
  const primeiro = ancoras[0];
  if (!primeiro) return '';
  if (primeiro.nivel === 'geral') return 'sem localização';
  if (primeiro.nivel === 'boca') return 'boca toda'; // R-07: rotina sem dente âncora
  if (primeiro.nivel === 'arcada') return `arcada ${primeiro.arcada ?? ''}`.trim();
  if (primeiro.nivel === 'quadrante') return `quadrante ${primeiro.quadrante ?? ''}`.trim();
  const dentes = [...new Set(ancoras.map((a) => a.dente).filter((d): d is number => d != null))];
  if (dentes.length === 0) return '';
  return dentes.length === 1 ? `dente ${dentes[0]}` : `dentes ${dentes.join(' · ')}`;
}

export function RegistroCard({
  data, children, defaultOpen = false, onToggleStatus, onToggleMomento,
  selecionavel = false, selecionado = false, onToggleSelecao, onRemoverEncaminhamento,
  editavel = false, onObservacaoChange, onRemover, onAbrirGrande,
  compacto = false, aberto: abertoControlado, onAbertoChange,
}: RegistroCardProps) {
  const [abertoInterno, setAbertoInterno] = useState(defaultOpen);
  const aberto = abertoControlado ?? abertoInterno;
  const setAberto = (proximo: boolean) => {
    if (abertoControlado == null) setAbertoInterno(proximo);
    onAbertoChange?.(proximo);
  };
  const cor = corDoRegistro(data.status, data.origem, data.momentoPlanejado);
  const pill = data.statusMisto ? PILL.misto : PILL[cor];

  const faces = facesTitulo(data.ancoras);
  const rotulo = rotuloProcedimento(data);
  const titulo = `${rotulo}${faces ? ` ${faces}` : ''} · ${resumoAncora(data.ancoras)}`;

  const retroativo = data.realizadoEm != null && dataBRT(data.registradoEm) > data.realizadoEm;
  // Fora do modo compacto, `onAbrirGrande` redireciona o card inteiro. Na bancada compacta,
  // o card abre a observação e o detalhe dental conserva um botão próprio.
  const abreFora = onAbrirGrande != null;
  const temCorpo = (compacto && editavel) || (!abreFora && children != null);

  // Modo seleção (variante B): o clique no card marca/desmarca em vez de expandir; o
  // pill e o × ficam inertes (a ação da vez é escolher o que encaminhar).
  const emSelecao = selecionavel;
  const pillClicavel = !emSelecao && !data.statusMisto && onToggleStatus;
  const containerInterativo = emSelecao || temCorpo || abreFora;
  const aoClicar = emSelecao
    ? onToggleSelecao
    : compacto && editavel
      ? () => setAberto(!aberto)
      : abreFora
        ? onAbrirGrande
        : temCorpo
          ? () => setAberto(!aberto)
          : undefined;

  return (
    <motion.article
      layout="position"
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`bg-surface border rounded-xl overflow-hidden transition-colors ${
        emSelecao && selecionado ? 'border-teal ring-1 ring-teal/40' : 'border-border'
      }`}
    >
      <div
        role={emSelecao ? 'checkbox' : 'button'}
        aria-checked={emSelecao ? selecionado : undefined}
        tabIndex={containerInterativo ? 0 : -1}
        onClick={aoClicar}
        onKeyDown={
          containerInterativo
            ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoClicar?.(); } }
            : undefined
        }
        aria-expanded={!emSelecao && temCorpo ? aberto : undefined}
        // Acessibilidade (achado dele 08/08): sem isto o modo "abre fora" lia igual a um
        // simples expandir/colapsar pro leitor de tela — o rótulo deixa explícito que o
        // clique LEVA a outro lugar, não revela conteúdo aqui mesmo.
        aria-label={abreFora && !compacto ? `${titulo} — abrir tabela no perfil do dente` : undefined}
        // div (não <button>): no modo seleção o checkbox interativo fica aninhado aqui,
        // e o × do badge (fora do modo) também — elemento interativo dentro de <button>
        // é HTML inválido. Por isso role/tabIndex/teclado manuais.
        className={`${compacto ? 'min-h-[72px] flex-wrap px-4 py-3 sm:flex-nowrap' : 'min-h-[104px] flex-wrap items-start px-4 py-4 sm:flex-nowrap sm:items-center sm:px-5'} flex w-full gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-teal ${containerInterativo ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {emSelecao && (
          <span
            aria-hidden
            className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              selecionado ? 'bg-teal border-teal' : 'border-border bg-surface-alt'
            }`}
          >
            {selecionado && <Check className="w-3.5 h-3.5 text-white" />}
          </span>
        )}

        <div className={`min-w-0 flex-1 ${compacto && !emSelecao ? 'basis-full sm:basis-auto' : !compacto ? 'basis-full sm:basis-auto' : ''}`}>
          <p className="font-semibold text-sm text-text-primary truncate">{titulo}</p>
          {data.revisarStatus && (
            <p className="mt-0.5 text-xs font-semibold text-warning-ink">Confira o status</p>
          )}
          {editavel && !compacto ? (
            <textarea
              rows={1}
              value={data.observacao ?? ''}
              onChange={(e) => onObservacaoChange?.(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => { e.stopPropagation(); ajustarAlturaObservacao(e.currentTarget, true); }}
              onInput={(e) => ajustarAlturaObservacao(e.currentTarget)}
              onBlur={(e) => {
                if (!e.currentTarget.value.trim()) e.currentTarget.style.height = '';
              }}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="material, técnica, intercorrência…"
              className="mt-0.5 min-h-6 max-h-40 w-full resize-y overflow-y-auto bg-transparent border-b border-dashed border-border text-xs italic leading-relaxed text-text-primary outline-none focus:border-teal transition-colors placeholder:text-text-secondary/60"
            />
          ) : data.observacao && (
            <TextoExpansivel
              texto={`“${data.observacao}”`}
              clampLines={compacto ? 1 : 2}
              className="mt-0.5 text-xs italic text-text-secondary"
            />
          )}
          <p className={`${compacto ? 'hidden' : 'mt-0.5'} text-xs text-text-secondary`}>
            {data.realizadoEm && (
              <span>
                Realizado em <span className="font-mono tabular-nums">{fmtData(data.realizadoEm)}</span>
                {retroativo && <span className="text-warning-ink font-medium"> (retroativo)</span>}
                {' · '}
              </span>
            )}
            <span>
              {data.autorNome}
              {data.autorCro && <span className="font-mono"> · {data.autorCro}</span>}
            </span>
            {data.assinada && <span className="text-teal-ink"> · Assinatura coletada ✓</span>}
          </p>
        </div>

        {/* Badge de destino — só-leitura pra todo mundo; com × só pro autor (fora do modo). */}
        {data.encaminhadoPara && (
          <span
            className="inline-flex items-center gap-1 shrink-0 text-[11px] font-medium pl-2 pr-1 py-1 rounded-full bg-surface-alt text-text-secondary border border-border"
            title={`Encaminhado a ${data.encaminhadoPara.nome}`}
          >
            <Forward className="w-3 h-3" />
            <span className="max-w-[110px] truncate">{data.encaminhadoPara.nome}</span>
            {!emSelecao && onRemoverEncaminhamento && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemoverEncaminhamento(); }}
                // Enter/Space nativo do <button> já dispara o clique — sem isto, o keydown
                // ainda sobe pro card pai e expande/colapsa como efeito colateral (o
                // stopPropagation do onClick acima não freia um evento separado de teclado).
                onKeyDown={(e) => e.stopPropagation()}
                title="Remover encaminhamento"
                aria-label={`Remover encaminhamento a ${data.encaminhadoPara.nome}`}
                className="ml-0.5 rounded-full p-0.5 text-text-secondary hover:text-coral-ink hover:bg-coral-pale outline-none focus-visible:ring-2 focus-visible:ring-teal transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        )}

        {pillClicavel ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggleStatus(); }
            }}
            title={data.status === 'realizado' ? 'Marcar como planejado' : 'Marcar como realizado'}
            className={`inline-flex items-center gap-1.5 shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-teal ${pill.wrap}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} />
            {pill.label}
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1.5 shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${pill.wrap}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} />
            {pill.label}
          </span>
        )}

        {/* R-101 — só faz sentido enquanto indicado; a constraint do banco não aceita
            momento_planejado='proxima_sessao' com status='realizado'. */}
        {data.status === 'indicado' && onToggleMomento && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onToggleMomento(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggleMomento(); }
            }}
            title={data.momentoPlanejado === 'proxima_sessao' ? 'Marcar pra sessão atual' : 'Marcar pra próxima seção'}
            className={`inline-flex items-center gap-1 shrink-0 text-[11px] font-bold px-2 py-1 rounded-full cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal ${
              data.momentoPlanejado === 'proxima_sessao'
                ? 'bg-warning-pale text-warning-ink'
                : 'border border-border text-text-secondary hover:bg-surface-alt'
            }`}
          >
            <Clock className="w-3 h-3" />
            Próxima seção
          </span>
        )}

        {editavel && onRemover && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemover(); }}
            onKeyDown={(e) => e.stopPropagation()}
            title="Remover registro"
            aria-label="Remover registro"
            className="shrink-0 p-1.5 rounded-md text-text-secondary hover:text-coral-ink hover:bg-coral-pale outline-none focus-visible:ring-2 focus-visible:ring-teal transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {!emSelecao && abreFora && (
          compacto ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAbrirGrande(); }}
              onKeyDown={(e) => e.stopPropagation()}
              title="Abrir detalhe dental"
              aria-label={`${titulo} — abrir detalhe dental`}
              className="shrink-0 rounded-md p-1.5 text-text-secondary outline-none transition-colors hover:bg-surface-alt hover:text-teal-ink focus-visible:ring-2 focus-visible:ring-teal"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Maximize2 className="w-3.5 h-3.5 shrink-0 text-text-secondary" aria-hidden />
          )
        )}
        {!emSelecao && temCorpo && (
          compacto
            ? <ChevronDown className={`h-4 w-4 shrink-0 text-text-secondary transition-transform ${aberto ? 'rotate-180' : ''}`} />
            : <ChevronRight className={`h-4 w-4 shrink-0 text-text-secondary transition-transform ${aberto ? 'rotate-90' : ''}`} />
        )}
      </div>

      {/* `layout` no <article> pai + só opacity aqui — Motion anima a mudança de altura via
          transform (FLIP, GPU), não via `height` (força reflow a cada frame, causa flick). */}
      <AnimatePresence initial={false}>
        {!emSelecao && temCorpo && aberto && (
          <motion.div
            key="corpo"
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="border-t border-border bg-surface-alt/40 px-4 py-3">
              {compacto && editavel && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                    Material, técnica e intercorrência
                  </label>
                  <textarea
                    rows={2}
                    value={data.observacao ?? ''}
                    onChange={(e) => onObservacaoChange?.(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onInput={(e) => ajustarAlturaObservacao(e.currentTarget, true)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Ex.: resina Z350, isolamento absoluto, sem intercorrências…"
                    className="max-h-40 min-h-[72px] w-full resize-y overflow-y-auto rounded-lg border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-text-primary outline-none transition-colors placeholder:text-text-secondary/60 focus:border-teal"
                  />
                  <p className="text-[11px] text-text-secondary">
                    {data.autorNome}{data.autorCro ? ` · ${data.autorCro}` : ''}
                  </p>
                </div>
              )}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
