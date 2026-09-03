'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { criarEventosContextuais } from '@/lib/odontograma/criar-eventos-contextuais';
import {
  ESCOPOS_REGIONAIS,
  ancoraDoEscopoRegional,
  buscarProcedimentosRegionais,
  labelDoEscopoRegional,
  type EscopoRegional,
  type OpcaoProcedimentoRegional,
} from '@/lib/odontograma/escopo-regional';
import type { MeuDiaCatalogoProcedimento } from '@/server/dashboard/get-meu-dia';
import type {
  ModoLancamento,
  OdontogramaEventoDraft,
  TipoRegistroOdontograma,
} from '@/types/odontograma';

const MODOS: Array<{ id: ModoLancamento; label: string }> = [
  { id: 'a_fazer', label: 'A fazer' },
  { id: 'realizado_hoje', label: 'Realizado hoje' },
  { id: 'proxima_sessao', label: 'Próxima sessão' },
  { id: 'preexistente', label: 'Pré-existente' },
];

interface FaixaEscopoRegionalProps {
  escopo: EscopoRegional | null;
  onEscopoChange: (escopo: EscopoRegional | null) => void;
  eventosDraft: OdontogramaEventoDraft[];
  onEventosDraftChange: (eventos: OdontogramaEventoDraft[]) => void;
  catalogoProcedimentos: MeuDiaCatalogoProcedimento[];
  dataPadrao: string;
  modoLancamento: ModoLancamento;
  onModoLancamentoChange: (modo: ModoLancamento) => void;
  manutencaoOrtodonticaAtiva: boolean;
  onManutencaoOrtodontica: () => void;
  /** Meu Dia usa uma grade sem rolagem; a ficha completa mantém a faixa horizontal atual. */
  layout?: 'linha' | 'grade';
}

export function FaixaEscopoRegional({
  escopo,
  onEscopoChange,
  eventosDraft,
  onEventosDraftChange,
  catalogoProcedimentos,
  dataPadrao,
  modoLancamento,
  onModoLancamentoChange,
  manutencaoOrtodonticaAtiva,
  onManutencaoOrtodontica,
  layout = 'linha',
}: FaixaEscopoRegionalProps) {
  const [busca, setBusca] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const sugestoes = useMemo(
    () => buscarProcedimentosRegionais(busca, catalogoProcedimentos),
    [busca, catalogoProcedimentos],
  );

  useEffect(() => {
    if (escopo) inputRef.current?.focus();
  }, [escopo]);

  function selecionarEscopo(novoEscopo: EscopoRegional) {
    setBusca('');
    onEscopoChange(escopo === novoEscopo ? null : novoEscopo);
  }

  function adicionar(
    label: string,
    tipo: TipoRegistroOdontograma | null,
    procedimentoId: string | null = null,
  ) {
    if (!escopo) return;
    const novos = criarEventosContextuais({
      tipo: tipo ?? 'outro',
      procedimentoId,
      procedimentoNome: label,
      ancoras: [ancoraDoEscopoRegional(escopo)],
      contexto: { capturaId: crypto.randomUUID(), modo: modoLancamento },
      dataPadrao,
      observacao: '',
    });
    onEventosDraftChange([...eventosDraft, ...novos]);
    setBusca('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function adicionarOpcao(opcao: OpcaoProcedimentoRegional) {
    adicionar(opcao.label, opcao.tipo, opcao.procedimentoId);
  }

  function adicionarTextoLivre() {
    const texto = busca.trim();
    if (texto) adicionar(texto, null);
  }

  function botaoEscopo(item: typeof ESCOPOS_REGIONAIS[number], className?: string) {
    return (
      <button
        key={item.id}
        type="button"
        aria-pressed={escopo === item.id}
        onClick={() => selecionarEscopo(item.id)}
        className={cn(
          'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
          escopo === item.id
            ? 'border-teal bg-teal/15 text-teal-ink'
            : 'border-border bg-surface-alt text-text-secondary hover:border-teal/40 hover:text-teal-ink',
          className,
        )}
      >
        {item.label}
      </button>
    );
  }

  const escoposPrincipais = ESCOPOS_REGIONAIS.filter((item) => item.id === 'geral' || item.id === 'boca');
  const escoposPorArcada = ESCOPOS_REGIONAIS.filter((item) => item.id !== 'geral' && item.id !== 'boca');

  return (
    <div className="flex flex-col gap-2">
      {layout === 'grade' ? (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            {botaoEscopo(escoposPrincipais[0], 'min-h-9 whitespace-normal leading-tight')}
            <button
              type="button"
              aria-pressed={manutencaoOrtodonticaAtiva}
              onClick={onManutencaoOrtodontica}
              className={cn(
                'min-h-9 rounded-full border px-2.5 text-[11px] font-semibold leading-tight transition-colors',
                manutencaoOrtodonticaAtiva
                  ? 'border-teal bg-teal/10 text-teal-ink'
                  : 'border-border bg-surface-alt text-text-secondary hover:border-teal/40 hover:text-teal-ink',
              )}
            >
              Manutenção ortodôntica
            </button>
            {botaoEscopo(escoposPrincipais[1], 'min-h-9 whitespace-normal leading-tight')}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {escoposPorArcada.map((item) => botaoEscopo(item, 'min-h-9 whitespace-normal px-1.5 text-[10px] leading-tight'))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ESCOPOS_REGIONAIS.map((item) => botaoEscopo(item, 'shrink-0'))}
          <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />
          <button
            type="button"
            aria-pressed={manutencaoOrtodonticaAtiva}
            onClick={onManutencaoOrtodontica}
            className={cn(
              'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
              manutencaoOrtodonticaAtiva
                ? 'border-teal bg-teal/10 text-teal-ink'
                : 'border-border bg-surface-alt text-text-secondary hover:border-teal/40 hover:text-teal-ink',
            )}
          >
            Manutenção ortodôntica
          </button>
        </div>
      )}

      {escopo && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-teal/30 bg-teal/5 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-text-primary">
              {labelDoEscopoRegional(escopo)} selecionada
            </p>
            <button
              type="button"
              onClick={() => onEscopoChange(null)}
              aria-label="Limpar região"
              className="rounded p-0.5 text-text-secondary hover:bg-coral/10 hover:text-coral"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="mr-0.5 shrink-0 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Registrar como
            </span>
            {MODOS.map((modo) => (
              <button
                key={modo.id}
                type="button"
                aria-pressed={modoLancamento === modo.id}
                onClick={() => onModoLancamentoChange(modo.id)}
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  modoLancamento === modo.id
                    ? 'border-teal bg-teal/15 text-teal-ink'
                    : 'border-border bg-surface text-text-secondary hover:border-teal/40 hover:text-teal-ink'
                }`}
              >
                {modo.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Search className="h-3 w-3 shrink-0 text-text-muted" strokeWidth={2.4} aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setBusca('');
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (sugestoes[0]) adicionarOpcao(sugestoes[0]);
                  else adicionarTextoLivre();
                }
              }}
              placeholder={`Procedimento em ${labelDoEscopoRegional(escopo).toLowerCase()}`}
              aria-label={`Buscar ou digitar procedimento em ${labelDoEscopoRegional(escopo).toLowerCase()}`}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface-alt px-2 py-1 text-[11px] text-text-primary outline-none focus:border-teal"
            />
          </div>

          {busca.trim() && (
            <div className="flex flex-wrap gap-1">
              {sugestoes.map((opcao) => (
                <button
                  key={opcao.id}
                  type="button"
                  onClick={() => adicionarOpcao(opcao)}
                  className="rounded-full border border-teal/30 bg-surface px-2 py-0.5 text-[10px] font-semibold text-teal-ink"
                >
                  {opcao.label}
                </button>
              ))}
              {sugestoes.length === 0 && (
                <button
                  type="button"
                  onClick={adicionarTextoLivre}
                  className="rounded-full bg-teal px-2 py-0.5 text-[10px] font-bold text-white"
                >
                  Adicionar &ldquo;{busca.trim()}&rdquo;
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
