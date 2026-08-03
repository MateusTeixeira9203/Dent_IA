'use client';

// R-46a — dono do estado de seleção (qual atendimento do rail está com o contexto aberto
// embaixo). R-46g (D5): a chave é agendamentoId, não pacienteId — 2 atendimentos do mesmo
// paciente no mesmo dia (retorno) ficariam indistinguíveis por pacienteId. Precedência do
// default: agendamentoInicialId (veio de ?ag=, se casar com um slot) > em atendimento
// (in_progress/checked_in) > 1º slot.
// C2 (P7, 03/08) — `onSalvo` NÃO avança mais pro próximo slot: decisão dele, o dentista já
// troca de paciente clicando no rail. `onSalvo` só limpa o rascunho (trava §5.6.1) e refaz
// `router.refresh()` pra puxar `slots`/`contextoPorPaciente` frescos do servidor (✓
// registrado, pendências fechadas) sem sair da rota (G3/G9).
//
// C1 (contrato §5.4) — dono de `eventosDraft`/`denteAberto`/`textoVisita` sobe pra cá: a
// coluna direita ("Nesta sessão") precisa ler o mesmo rascunho que o centro escreve, e o
// `key={agendamentoId}` do RegistrarPainel não alcança mais esses 3 campos. O reset ao
// trocar de paciente vira explícito (comparação de id abaixo) — sem isso, rascunho de um
// paciente vaza pro próximo (perda/contaminação de dado clínico).
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Rail } from './rail';
import { CockpitGrid } from './cockpit-grid';
import { HistoricoBloco } from './historico-bloco';
import { AFazerBloco } from './a-fazer-bloco';
import { JaFeitoBloco } from './ja-feito-bloco';
import { NestaSessaoBloco } from './nesta-sessao-bloco';
import { RegistrarPainel, pendenciaParaDraft } from './registrar-painel';
import { hojeBRT } from '@/lib/hora-brt';
import type { MeuDiaData, MeuDiaPendencia } from '@/server/dashboard/get-meu-dia';
import type { OdontogramaEventoDraft } from '@/types/odontograma';

interface MeuDiaClientProps extends MeuDiaData {
  agendamentoInicialId?: string;
}

type AbertoDireita = 'aFazer' | 'jaFeito' | 'concluidosHoje' | 'novosProcedimentos' | null;

export function MeuDiaClient({ slots, contextoPorPaciente, agendamentoInicialId, catalogoProcedimentos }: MeuDiaClientProps) {
  const router = useRouter();

  const defaultAgendamentoId = useMemo(() => {
    if (agendamentoInicialId && slots.some((s) => s.agendamentoId === agendamentoInicialId)) {
      return agendamentoInicialId;
    }
    const emAtendimento = slots.find(
      (s) => s.statusAgendamento === 'in_progress' || s.statusAgendamento === 'checked_in',
    );
    return (emAtendimento ?? slots[0])?.agendamentoId ?? null;
  }, [slots, agendamentoInicialId]);

  const [selecionadoId, setSelecionadoId] = useState<string | null>(defaultAgendamentoId);

  const [eventosDraft, setEventosDraft] = useState<OdontogramaEventoDraft[]>([]);
  const [denteAberto, setDenteAberto] = useState<number | null>(null);
  const [textoVisita, setTextoVisita] = useState('');

  // Reset explícito ao trocar de paciente (contrato §5.4) — o `key={agendamentoId}` do
  // RegistrarPainel não alcança mais estes 3 campos, que agora moram aqui. Ajuste durante o
  // render (comparando o id anterior), não `useEffect`: é o padrão que o React recomenda pra
  // "resetar estado quando uma prop muda" — evita o passe de render extra do efeito, e o lint
  // do projeto (`react-hooks/set-state-in-effect`) bloqueia a versão com efeito.
  const [idAoResetar, setIdAoResetar] = useState(selecionadoId);
  if (selecionadoId !== idAoResetar) {
    setIdAoResetar(selecionadoId);
    setEventosDraft([]);
    setDenteAberto(null);
    setTextoVisita('');
  }

  const [abertoEsquerda, setAbertoEsquerda] = useState<'historico' | null>('historico');
  const [abertoDireita, setAbertoDireita] = useState<AbertoDireita>('aFazer');

  const slotSelecionado = selecionadoId ? (slots.find((s) => s.agendamentoId === selecionadoId) ?? null) : null;
  const contexto = slotSelecionado ? contextoPorPaciente[slotSelecionado.pacienteId] : null;

  // C2 (§5.6) — trava 1: limpa o rascunho AGORA, local e síncrono, não espera o refresh do
  // servidor. Fecha a janela de corrida de um duplo clique rápido logo após salvar (o
  // `router.refresh()` sozinho não seria rápido o bastante pra proteger o 2º clique).
  function handleSalvo() {
    setEventosDraft([]);
    setDenteAberto(null);
    setTextoVisita('');
    router.refresh();
  }

  function fazerHoje(p: MeuDiaPendencia) {
    setEventosDraft([...eventosDraft, pendenciaParaDraft(p, hojeBRT())]);
  }

  // 03/08 — o rascunho da sessão vira 2 blocos pelo mesmo `status` que o chip Registrar já
  // decide: 'realizado' fica visível em "Concluídos hoje", 'indicado' em "Novos
  // procedimentos" (é o que sobra pendente depois de salvar e vira base do orçamento).
  const concluidosHoje = eventosDraft.filter((e) => e.status === 'realizado');
  const novosProcedimentos = eventosDraft.filter((e) => e.status === 'indicado');

  return (
    <div className="flex flex-col gap-4">
      <Rail slots={slots} selecionadoId={selecionadoId} onSelecionar={setSelecionadoId} />
      {slotSelecionado && contexto ? (
        <>
          {/* C1 — migrado de contexto-coluna.tsx (SAI): nome + "ver perfil" + alertas de
              cadastro (alergia etc.) não têm mais um bloco próprio nesta fatia (o phead
              completo — avatar, idade, badges de orto/endo — fica pra fatia posterior),
              mas não podiam simplesmente sumir da tela. */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-text-primary">{slotSelecionado.pacienteNome}</h2>
              {contexto.alertas.map((alerta, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning-pale px-3 py-1.5 text-xs font-semibold text-warning-ink"
                >
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {alerta}
                </span>
              ))}
            </div>
            <Link
              href={`/dashboard/pacientes/${slotSelecionado.pacienteId}`}
              className="shrink-0 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary"
            >
              Ver perfil completo →
            </Link>
          </div>
          <CockpitGrid
            colapsarDireita={denteAberto != null}
            esquerda={
              <HistoricoBloco
                visitas={contexto.visitas}
                aberto={abertoEsquerda === 'historico'}
                onToggle={() => setAbertoEsquerda((a) => (a === 'historico' ? null : 'historico'))}
              />
            }
            centro={
              <RegistrarPainel
                key={slotSelecionado.agendamentoId}
                pacienteId={slotSelecionado.pacienteId}
                agendamentoId={slotSelecionado.agendamentoId}
                catalogoProcedimentos={catalogoProcedimentos}
                eventosDraft={eventosDraft}
                onEventosDraftChange={setEventosDraft}
                denteAberto={denteAberto}
                onDenteAbertoChange={setDenteAberto}
                textoVisita={textoVisita}
                onTextoVisitaChange={setTextoVisita}
                temFichaHoje={slotSelecionado.temFichaHoje}
                onSalvo={handleSalvo}
              />
            }
            direita={
              <>
                <AFazerBloco
                  pendencias={contexto.pendencias}
                  eventosDraft={eventosDraft}
                  onFazerHoje={fazerHoje}
                  aberto={abertoDireita === 'aFazer'}
                  onToggle={() => setAbertoDireita((a) => (a === 'aFazer' ? null : 'aFazer'))}
                />
                <JaFeitoBloco
                  jaFeito={contexto.jaFeito}
                  aberto={abertoDireita === 'jaFeito'}
                  onToggle={() => setAbertoDireita((a) => (a === 'jaFeito' ? null : 'jaFeito'))}
                />
                <NestaSessaoBloco
                  id="concluidos-hoje"
                  titulo="Concluídos hoje"
                  vazio="Nada concluído ainda nesta consulta."
                  eventos={concluidosHoje}
                  onDenteClick={setDenteAberto}
                  aberto={abertoDireita === 'concluidosHoje'}
                  onToggle={() => setAbertoDireita((a) => (a === 'concluidosHoje' ? null : 'concluidosHoje'))}
                />
                <NestaSessaoBloco
                  id="novos-procedimentos"
                  titulo="Novos procedimentos"
                  vazio="Nenhum procedimento novo indicado ainda."
                  eventos={novosProcedimentos}
                  onDenteClick={setDenteAberto}
                  aberto={abertoDireita === 'novosProcedimentos'}
                  onToggle={() => setAbertoDireita((a) => (a === 'novosProcedimentos' ? null : 'novosProcedimentos'))}
                />
              </>
            }
          />
        </>
      ) : slots.length > 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-5 py-10 text-center">
          <p className="text-sm font-semibold text-text-primary">Todos os atendimentos de hoje foram registrados.</p>
          <p className="mt-1 text-xs text-text-secondary">Bom trabalho — o dia terminou por aqui.</p>
        </div>
      ) : null}
    </div>
  );
}
