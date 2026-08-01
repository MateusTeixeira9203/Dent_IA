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

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import { Odontograma } from '@/components/odontograma/Odontograma';
import { ToothDetailPanel } from '@/components/odontograma/ToothDetailPanel';
import { ToothGroupList } from '@/app/consulta/[agendamentoId]/_components/tooth-group-list';
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

/** Valor de 1 item da busca — ou um tipo estrutural (registra direto), ou um item do
 *  catálogo comercial (vira observação pendente, pede o tipo estrutural em seguida). */
type ComboboxValor = TipoRegistroOdontograma | MeuDiaCatalogoProcedimento;

function ehItemDoCatalogo(v: ComboboxValor): v is MeuDiaCatalogoProcedimento {
  return typeof v === 'object';
}

interface RegistrarPainelProps {
  pacienteId: string;
  agendamentoId: string;
  pendencias: MeuDiaPendencia[];
  catalogoProcedimentos: MeuDiaCatalogoProcedimento[];
  /** R-46b2 — avisa o pai que a visita salvou (odontograma incluso, ver `eventosFalharam`
   *  abaixo) pra ele avançar pro próximo slot do rail. Nunca chamado enquanto o odontograma
   *  não gravou (I4) — o dentista precisa ver o aviso antes de seguir. */
  onSalvo: () => void;
}

/** Converte a pendência (já um evento real no banco, `status='indicado'`) num draft que
 *  PRESERVA o id — "fazer hoje" fecha o registro existente por upsert, nunca cria um novo
 *  ao lado dele (I3: nunca deixar a pendência original fantasma). */
function pendenciaParaDraft(p: MeuDiaPendencia, dataPadrao: string): OdontogramaEventoDraft {
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

export function RegistrarPainel({ pacienteId, agendamentoId, pendencias, catalogoProcedimentos, onSalvo }: RegistrarPainelProps) {
  const [eventosDraft, setEventosDraft] = useState<OdontogramaEventoDraft[]>([]);
  const [denteAberto, setDenteAberto] = useState<number | null>(null);
  const [gruposAbertos, setGruposAbertos] = useState<GrupoAberto[]>([]);
  const [textoVisita, setTextoVisita] = useState('');
  const [textoAberto, setTextoAberto] = useState(false);

  const [onde, setOnde] = useState<OndeValor>(null);
  const [status, setStatus] = useState<StatusRegistro>('realizado');
  const [buscaTipo, setBuscaTipo] = useState('');
  const [avisoOnde, setAvisoOnde] = useState(false);
  const [catalogoPendente, setCatalogoPendente] = useState<MeuDiaCatalogoProcedimento | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [savedFichaId, setSavedFichaId] = useState<string | null>(null);
  const [eventosPendentes, setEventosPendentes] = useState<OdontogramaEventoDraft[] | null>(null);
  const [isRegravando, setIsRegravando] = useState(false);

  const dataPadrao = hojeBRT();

  useEffect(() => {
    let cancelado = false;
    getGruposAbertos(pacienteId).then((g) => { if (!cancelado) setGruposAbertos(g); });
    return () => { cancelado = true; };
  }, [pacienteId]);

  function registrar(tipo: TipoRegistroOdontograma, observacao = '') {
    const ancoras = ancorasDoOnde(onde);
    if (ancoras.length === 0) {
      setAvisoOnde(true);
      return;
    }
    setAvisoOnde(false);
    const novos: OdontogramaEventoDraft[] = ancoras.map((ancora) => ({
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
    setEventosDraft([...eventosDraft, ...novos]);
    setBuscaTipo('');
    setCatalogoPendente(null);
  }

  function fazerHoje(p: MeuDiaPendencia) {
    setEventosDraft([...eventosDraft, pendenciaParaDraft(p, dataPadrao)]);
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

      {pendencias.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {pendencias.map((p) => {
            const jaFeito = eventosDraft.some((e) => e.id === p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => fazerHoje(p)}
                disabled={jaFeito}
                className="rounded-full border border-teal/30 bg-teal/5 px-2.5 py-1 text-[11px] font-semibold text-teal transition-opacity hover:bg-teal/10 disabled:opacity-40"
              >
                {TIPO_LABEL[p.tipo]} {jaFeito ? '✓' : '· fazer hoje →'}
              </button>
            );
          })}
        </div>
      )}

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
        <OndeSeletor valor={onde} onChange={setOnde} />
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

      {avisoOnde && (
        <p className="mt-1.5 text-[11px] font-semibold text-coral">Escolha onde antes de registrar.</p>
      )}

      {eventosDraft.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            Registros de hoje · {eventosDraft.length}
          </p>
          <ToothGroupList eventos={eventosDraft} onDenteClick={setDenteAberto} />
        </div>
      )}

      <div className="mt-4">
        <Odontograma eventos={eventosDraft} selectedTeeth={[]} onToothToggle={setDenteAberto} compact hideFilters />
      </div>

      {denteAberto != null && (
        <ToothDetailPanel
          dente={denteAberto}
          eventos={eventosDraft}
          onChange={setEventosDraft}
          onClose={() => setDenteAberto(null)}
          dataPadrao={dataPadrao}
          gruposAbertos={gruposAbertos}
        />
      )}

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
          disabled={isSaving || eventosPendentes != null}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isSaving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</>
            : <><Check className="h-4 w-4" /> Salvar e chamar próximo</>
          }
        </button>
      </div>
    </div>
  );
}
