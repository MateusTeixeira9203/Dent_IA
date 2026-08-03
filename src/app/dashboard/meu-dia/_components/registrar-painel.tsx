'use client';

// R-46b — "Registrar": procedimento → onde → status, num gesto só, mais odontograma +
// lista agrupada por dente (reuso de /consulta, ver spec R-46b §2/§6). Estado local:
// remonta do zero a cada paciente porque o pai passa `key={agendamentoId}` (nenhum
// useEffect de reset aqui — é o padrão mais simples que já resolve).
//
// R-46b §A3 (01/08) — busca única mesclando os 16 tipos estruturais (`TIPO_LABEL`, sempre
// visíveis) com o catálogo comercial do dentista (só aparece digitando — são 250+ linhas
// reais, listar tudo por padrão seria inútil). Escolher um tipo estrutural registra direto,
// igual sempre. Escolher um item do catálogo NÃO registra sozinho — não existe de-para
// confiável entre nome comercial e tipo estrutural (dado real checado: categoria "Geral"
// mistura de tudo, "Prevenção"/"Estética" têm tipos diferentes na mesma categoria) —
// inventar esse mapeamento seria adivinhar em cima de prontuário. Em vez disso, o nome vira
// `observação` pendente e pede o tipo estrutural em seguida (1 toque a mais, só nesse caso).
//
// C1 (contrato §5.4) — `eventosDraft`/`denteAberto`/`textoVisita` deixaram de ser estado
// local: o dono subiu pra `meu-dia-client` porque "Nesta sessão" (coluna direita) precisa
// ler o mesmo rascunho que este painel escreve. `key={agendamentoId}` continua protegendo
// o que sobrou de estado local aqui (onde/status/busca/etc.) — só os 3 campos lidos por
// fora saíram da proteção do key, e o reset deles agora é explícito no pai.
// "Registros de hoje" e as pílulas de pendência ("fazer hoje") saíram daqui — o artefato v2
// não duplica isso no centro; viraram nesta-sessao-bloco.tsx e a-fazer-bloco.tsx.
//
// 03/08 — ordem livre: escolher o procedimento antes do "onde" não descarta mais o que foi
// digitado (achado ao vivo: a ordem obrigatória era a causa real do "+dente não funciona").
// Fica pendente e registra sozinho assim que o "onde" chegar, em qualquer ordem. E o
// typeahead aceita o número do dente junto ("restauração 35") — reusa a mesma numeração
// FDI do popover, sem gramática nova.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, AlertTriangle, Loader2, X } from 'lucide-react';
import { Odontograma, TEETH_UPPER, TEETH_LOWER, TEETH_UPPER_DEC, TEETH_LOWER_DEC } from '@/components/odontograma/Odontograma';
import { ToothDetailPanel } from '@/components/odontograma/ToothDetailPanel';
import { getGruposAbertos, salvarEventosOdontograma } from '@/app/consulta/[agendamentoId]/actions';
import { Combobox, ComboboxInput, ComboboxContent, ComboboxItem } from '@/components/ui/combobox';
import { OndeSeletor, type OndeValor } from './onde-seletor';
import { hojeBRT } from '@/lib/hora-brt';
import { salvarVisitaMeuDia } from '../actions';
import {
  TIPO_LABEL,
  type OdontogramaEventoDraft,
  type StatusRegistro,
  type AncoraClinica,
  type TipoRegistroOdontograma,
} from '@/types/odontograma';
import type { GrupoAberto } from '@/lib/odontograma/grupos-abertos';
import type { MeuDiaPendencia, MeuDiaCatalogoProcedimento } from '@/server/dashboard/get-meu-dia';

const TIPOS = Object.entries(TIPO_LABEL) as Array<[TipoRegistroOdontograma, string]>;

const DENTES_VALIDOS = new Set([...TEETH_UPPER, ...TEETH_LOWER, ...TEETH_UPPER_DEC, ...TEETH_LOWER_DEC]);

/** 03/08 — "restauração 35" no campo de busca já entende o dente. Só o número — nada de
 *  gramática de região aqui, essa é a metade cara que ficou de fora de propósito. */
function extrairDenteDoTexto(texto: string): number | null {
  const numeros = texto.match(/\d{2}/g);
  if (!numeros) return null;
  for (const n of numeros) {
    const dente = Number(n);
    if (DENTES_VALIDOS.has(dente)) return dente;
  }
  return null;
}

/** Valor de 1 item da busca — ou um tipo estrutural (registra direto), ou um item do
 *  catálogo comercial (vira observação pendente, pede o tipo estrutural em seguida). */
type ComboboxValor = TipoRegistroOdontograma | MeuDiaCatalogoProcedimento;

function ehItemDoCatalogo(v: ComboboxValor): v is MeuDiaCatalogoProcedimento {
  return typeof v === 'object';
}

interface RegistrarPainelProps {
  pacienteId: string;
  agendamentoId: string;
  catalogoProcedimentos: MeuDiaCatalogoProcedimento[];
  /** C1 (§5.4) — dono é `meu-dia-client`; "Nesta sessão" (direita) lê o mesmo estado. */
  eventosDraft: OdontogramaEventoDraft[];
  onEventosDraftChange: (eventos: OdontogramaEventoDraft[]) => void;
  denteAberto: number | null;
  onDenteAbertoChange: (dente: number | null) => void;
  textoVisita: string;
  onTextoVisitaChange: (texto: string) => void;
  /** C2 (§5.6, trava 2) — slot já tem ficha hoje: CTA nasce desabilitado com
   *  "já registrado hoje" até o dentista rascunhar algo novo. */
  temFichaHoje: boolean;
  /** C2 (P7) — avisa o pai que a visita salvou (odontograma incluso, ver `eventosFalharam`
   *  abaixo). NÃO avança pro próximo paciente mais (decisão dele: auto-avanço saiu, o
   *  dentista troca de paciente clicando no rail). Nunca chamado enquanto o odontograma
   *  não gravou (I4) — o dentista precisa ver o aviso antes de seguir. */
  onSalvo: () => void;
}

/** Converte a pendência (já um evento real no banco, `status='indicado'`) num draft que
 *  PRESERVA o id — "fazer hoje" fecha o registro existente por upsert, nunca cria um novo
 *  ao lado dele (I3: nunca deixar a pendência original fantasma). Exportado — o gesto
 *  "fazer hoje" agora dispara do a-fazer-bloco.tsx (coluna direita), via meu-dia-client. */
export function pendenciaParaDraft(p: MeuDiaPendencia, dataPadrao: string): OdontogramaEventoDraft {
  const ancora: AncoraClinica = { nivel: p.nivel };
  if (p.dente != null) ancora.dente = p.dente;
  if (p.arcada != null) ancora.arcada = p.arcada;
  if (p.quadrante != null) ancora.quadrante = p.quadrante;
  if (p.faces.length > 0) ancora.faces = p.faces;
  return {
    id: p.id,
    tipo: p.tipo,
    status: 'realizado',
    origem: p.origem,
    ancora,
    grupo_id: p.grupoId,
    papel_no_grupo: p.papelNoGrupo,
    observacao: p.observacao ?? '',
    realizado_em: dataPadrao,
  };
}

function ancorasDoOnde(v: OndeValor): AncoraClinica[] {
  if (!v) return [];
  if (v.tipo === 'dentes') return v.dentes.map((dente): AncoraClinica => ({ nivel: 'dente', dente }));
  if (v.nivel === 'boca') return [{ nivel: 'boca' }];
  if (v.nivel === 'arcada') return [{ nivel: 'arcada', arcada: v.arcada }];
  return [{ nivel: 'quadrante', quadrante: v.quadrante }];
}

export function RegistrarPainel({
  pacienteId, agendamentoId, catalogoProcedimentos,
  eventosDraft, onEventosDraftChange: setEventosDraft,
  denteAberto, onDenteAbertoChange: setDenteAberto,
  textoVisita, onTextoVisitaChange: setTextoVisita,
  temFichaHoje,
  onSalvo,
}: RegistrarPainelProps) {
  const [gruposAbertos, setGruposAbertos] = useState<GrupoAberto[]>([]);
  const [textoAberto, setTextoAberto] = useState(false);

  const [onde, setOnde] = useState<OndeValor>(null);
  const [status, setStatus] = useState<StatusRegistro>('realizado');
  const [buscaTipo, setBuscaTipo] = useState('');
  const [catalogoPendente, setCatalogoPendente] = useState<MeuDiaCatalogoProcedimento | null>(null);
  /** 03/08 — procedimento escolhido antes de haver "onde". Some assim que o onde chegar. */
  const [tipoPendente, setTipoPendente] = useState<{ tipo: TipoRegistroOdontograma; observacao: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [savedFichaId, setSavedFichaId] = useState<string | null>(null);
  const [eventosPendentes, setEventosPendentes] = useState<OdontogramaEventoDraft[] | null>(null);
  const [isRegravando, setIsRegravando] = useState(false);

  const dataPadrao = hojeBRT();
  // C2 (§5.6) — as duas travas contra ficha duplicada colapsam numa condição só: nada pra
  // salvar. Trava 1 (limpar e desabilitar até rascunho novo) é local e imediata — não
  // espera o `router.refresh()` do pai, fecha a janela de corrida de um duplo clique rápido
  // pós-save. Trava 2 (slot já registrado hoje) é o MESMO estado vazio, só muda o rótulo.
  const semRascunho = eventosDraft.length === 0 && textoVisita.trim() === '';

  useEffect(() => {
    let cancelado = false;
    getGruposAbertos(pacienteId).then((g) => { if (!cancelado) setGruposAbertos(g); });
    return () => { cancelado = true; };
  }, [pacienteId]);

  function criarEventos(tipo: TipoRegistroOdontograma, observacao: string, ancoras: AncoraClinica[]): OdontogramaEventoDraft[] {
    return ancoras.map((ancora) => ({
      id: crypto.randomUUID(),
      tipo,
      status,
      origem: 'clinica',
      ancora,
      grupo_id: null,
      papel_no_grupo: null,
      observacao,
      realizado_em: status === 'realizado' ? dataPadrao : null,
    }));
  }

  function registrar(tipo: TipoRegistroOdontograma, observacao = '') {
    let ancoras = ancorasDoOnde(onde);
    // Número junto no texto ("restauração 35") resolve o "onde" sozinho, sem esperar o chip.
    if (ancoras.length === 0) {
      const dente = extrairDenteDoTexto(buscaTipo);
      if (dente != null) {
        setOnde({ tipo: 'dentes', dentes: [dente] });
        ancoras = [{ nivel: 'dente', dente }];
      }
    }
    if (ancoras.length === 0) {
      // Ordem livre: guarda o procedimento em vez de descartar. `handleOndeChange` completa
      // o registro assim que um "onde" for escolhido, em qualquer ordem.
      setTipoPendente({ tipo, observacao });
      setBuscaTipo('');
      setCatalogoPendente(null);
      return;
    }
    setEventosDraft([...eventosDraft, ...criarEventos(tipo, observacao, ancoras)]);
    setTipoPendente(null);
    setBuscaTipo('');
    setCatalogoPendente(null);
  }

  function handleOndeChange(novoOnde: OndeValor) {
    setOnde(novoOnde);
    if (!tipoPendente) return;
    const ancoras = ancorasDoOnde(novoOnde);
    if (ancoras.length === 0) return;
    setEventosDraft([...eventosDraft, ...criarEventos(tipoPendente.tipo, tipoPendente.observacao, ancoras)]);
    setTipoPendente(null);
  }

  /** Item do catálogo escolhido na busca — só o nome comercial, nunca o tipo estrutural
   *  (§A3: sem de-para confiável). Fica pendente até o dentista confirmar qual dos 16 tipos. */
  function escolherDoCatalogo(item: MeuDiaCatalogoProcedimento) {
    setCatalogoPendente(item);
    setBuscaTipo('');
  }

  // I1 — 1 clique = 1 ficha: `salvarFicha` não é idempotente por agendamentoId, o `disabled`
  // abaixo é a única proteção contra duplo clique/duplo submit (mesmo padrão de consulta-client).
  async function handleSalvar() {
    setIsSaving(true);
    const resultado = await salvarVisitaMeuDia({ pacienteId, agendamentoId, textoVisita, eventosDraft });
    setIsSaving(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setSavedFichaId(resultado.fichaId);
    if (resultado.eventosFalharam) {
      // I4 — a ficha salvou mas o desenho não; não avança sozinho até o dentista decidir.
      setEventosPendentes(eventosDraft);
      return;
    }
    toast.success('Visita registrada.');
    onSalvo();
  }

  async function handleRegravarEventos() {
    if (!savedFichaId || !eventosPendentes) return;
    setIsRegravando(true);
    let res: { ok: boolean; error?: string };
    try {
      res = await salvarEventosOdontograma({ fichaId: savedFichaId, pacienteId, eventos: eventosPendentes });
    } catch {
      res = { ok: false, error: 'Falha de conexão. Tente novamente.' };
    }
    setIsRegravando(false);
    if (res.ok) {
      setEventosPendentes(null);
      toast.success('Odontograma gravado.');
      onSalvo();
    } else {
      toast.error(res.error ?? 'Não foi possível regravar o odontograma.');
    }
  }

  const buscaNormalizada = buscaTipo.trim().toLowerCase();
  const tiposFiltrados = buscaNormalizada === ''
    ? TIPOS
    : TIPOS.filter(([, label]) => label.toLowerCase().includes(buscaNormalizada));
  // Catálogo só aparece digitando (250+ linhas reais — listar tudo por padrão seria ruído).
  // Limite de 8: é busca, não navegação — o dentista já sabe o nome, é achar rápido.
  const catalogoFiltrado = buscaNormalizada === ''
    ? []
    : catalogoProcedimentos.filter((p) => p.nome.toLowerCase().includes(buscaNormalizada)).slice(0, 8);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Registrar</p>

      <Combobox<ComboboxValor>
        inputValue={buscaTipo}
        onInputValueChange={setBuscaTipo}
        onValueChange={(v) => {
          if (!v) return;
          if (ehItemDoCatalogo(v)) escolherDoCatalogo(v);
          else registrar(v);
        }}
        itemToStringLabel={(v) => (ehItemDoCatalogo(v) ? v.nome : TIPO_LABEL[v])}
      >
        <ComboboxInput placeholder="Digite o procedimento…" />
        <ComboboxContent>
          {tiposFiltrados.map(([tipo, label]) => (
            <ComboboxItem key={tipo} value={tipo}>{label}</ComboboxItem>
          ))}
          {catalogoFiltrado.map((item) => (
            <ComboboxItem key={item.id} value={item}>
              <span className="flex-1">{item.nome}</span>
              <span className="text-[10px] text-text-secondary">{item.categoria}</span>
            </ComboboxItem>
          ))}
        </ComboboxContent>
      </Combobox>

      {catalogoPendente && (
        <div className="mt-2 rounded-lg border border-teal/30 bg-teal/5 px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-text-primary">
              &ldquo;{catalogoPendente.nome}&rdquo; — qual tipo clínico?
            </p>
            <button
              type="button"
              onClick={() => setCatalogoPendente(null)}
              aria-label="Cancelar"
              className="text-text-secondary hover:text-coral"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS.map(([tipo, label]) => (
              <button
                key={tipo}
                type="button"
                onClick={() => registrar(tipo, catalogoPendente.nome)}
                className="rounded-full border border-teal/30 bg-surface px-2.5 py-1 text-[11px] font-semibold text-teal hover:bg-teal/10"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <OndeSeletor valor={onde} onChange={handleOndeChange} />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Status</span>
          {([['indicado', 'a fazer'], ['realizado', 'feito']] as const).map(([s, label]) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                status === s
                  ? 'border-teal bg-teal/10 text-teal'
                  : 'border-border bg-surface-alt text-text-secondary hover:border-teal/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tipoPendente && (
        <p className="mt-1.5 text-[11px] font-semibold text-teal-ink">
          {TIPO_LABEL[tipoPendente.tipo]} aguardando onde — escolha o dente ou a região.
        </p>
      )}

      {/* C3 (§5.3) — painel do dente abre AO LADO do odontograma, não embaixo. A coluna
          direita colapsa (cockpit-grid.tsx, via meu-dia-client) e devolve o espaço pra cá —
          é isso que tira o dente de 22,8px (reprova WCAG 2.2) pra ~34px. */}
      <div className="mt-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Odontograma eventos={eventosDraft} selectedTeeth={[]} onToothToggle={setDenteAberto} compact hideFilters />
        </div>
        {denteAberto != null && (
          <div className="w-[290px] shrink-0">
            <ToothDetailPanel
              dente={denteAberto}
              eventos={eventosDraft}
              onChange={setEventosDraft}
              onClose={() => setDenteAberto(null)}
              dataPadrao={dataPadrao}
              gruposAbertos={gruposAbertos}
            />
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        {textoAberto ? (
          <textarea
            value={textoVisita}
            onChange={(e) => setTextoVisita(e.target.value)}
            placeholder="Anotação da visita (opcional)"
            rows={3}
            autoFocus
            className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-teal"
          />
        ) : (
          <button
            type="button"
            onClick={() => setTextoAberto(true)}
            className="text-[11px] font-semibold text-text-secondary hover:text-teal"
          >
            + texto da visita
          </button>
        )}
      </div>

      {eventosPendentes && (
        <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-pale px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-ink" aria-hidden />
          <div>
            <p className="text-sm text-text-primary">A visita foi salva, mas o desenho do odontograma não gravou.</p>
            <button
              type="button"
              onClick={() => void handleRegravarEventos()}
              disabled={isRegravando}
              className="mt-1 text-sm font-semibold text-warning-ink underline underline-offset-2 disabled:opacity-60"
            >
              {isRegravando ? 'Gravando...' : 'Tentar de novo'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => void handleSalvar()}
          disabled={isSaving || eventosPendentes != null || semRascunho}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isSaving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</>
            : temFichaHoje && semRascunho
              ? <>Já registrado hoje</>
              : <><Check className="h-4 w-4" /> Salvar</>
          }
        </button>
      </div>
    </div>
  );
}
