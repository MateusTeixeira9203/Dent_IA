import type { DexRetencaoData, DexRetencaoPaciente } from './tipos';

const MS_DIA = 24 * 60 * 60 * 1000;

const JANELA_FALTOU_MIN_DIAS = 7;
const JANELA_FALTOU_MAX_DIAS = 180;
const JANELA_CANCELOU_DIAS = 30;
const SUBLINHA_PAROU_DIAS = 30;
const LIMIAR_PAROU_DIAS = 60;

const STATUS_NAO_VOLTOU = new Set(['cancelled', 'no_show']);

export interface AgendamentoRetencao {
  pacienteId: string;
  pacienteNome: string;
  status: string;
  dataHora: string; // ISO
}

export interface FichaRetencao {
  pacienteId: string;
  pacienteNome: string;
  dataAtendimento: string; // ISO
}

/** Dias de `antes` até `agora` — negativo quando `antes` está no futuro (D9). */
function diasAte(agora: Date, antes: Date): number {
  return Math.floor((agora.getTime() - antes.getTime()) / MS_DIA);
}

function porDiasAtrasDesc(a: DexRetencaoPaciente, b: DexRetencaoPaciente): number {
  return b.diasAtras - a.diasAtras;
}

/**
 * (AgendamentoRetencao[], FichaRetencao[], agora) -> DexRetencaoData. Função PURA, sem
 * fetch, sem React (molde de pendencias.ts) — R-103b §4.2. Classifica cada paciente em no
 * máximo 1 dos 3 buckets, precedência faltou > cancelou > parou (A2/D7). `agora` é parâmetro
 * explícito: determinística, testável sem mockar Date.
 */
export function classificarRetencao(
  agendamentos: AgendamentoRetencao[],
  fichas: FichaRetencao[],
  agora: Date,
): DexRetencaoData {
  const agendamentosPorPaciente = new Map<string, AgendamentoRetencao[]>();
  const nomePorPaciente = new Map<string, string>();
  for (const ag of agendamentos) {
    nomePorPaciente.set(ag.pacienteId, ag.pacienteNome);
    const lista = agendamentosPorPaciente.get(ag.pacienteId);
    if (lista) lista.push(ag);
    else agendamentosPorPaciente.set(ag.pacienteId, [ag]);
  }

  const ultimaFichaPorPaciente = new Map<string, { nome: string; data: Date }>();
  for (const f of fichas) {
    const data = new Date(f.dataAtendimento);
    const atual = ultimaFichaPorPaciente.get(f.pacienteId);
    if (!atual || data > atual.data) {
      ultimaFichaPorPaciente.set(f.pacienteId, { nome: f.pacienteNome, data });
    }
  }

  const faltouNaoVoltou: DexRetencaoPaciente[] = [];
  const cancelouNaoRemarcou: DexRetencaoPaciente[] = [];
  const parou60: DexRetencaoPaciente[] = [];
  let parouTotal30 = 0;
  let parouTotal60 = 0;

  const pacienteIds = new Set([...agendamentosPorPaciente.keys(), ...ultimaFichaPorPaciente.keys()]);

  for (const pacienteId of pacienteIds) {
    const ags = agendamentosPorPaciente.get(pacienteId) ?? [];
    const temFuturoNaoCancelado = ags.some(
      (a) => new Date(a.dataHora) > agora && a.status !== 'cancelled',
    );

    // ── Faltou e não voltou: no_show entre 7 e 180 dias atrás, sem retorno depois ──
    const noShowsNaJanela = ags
      .filter((a) => a.status === 'no_show')
      .filter((a) => {
        const dias = diasAte(agora, new Date(a.dataHora));
        return dias >= JANELA_FALTOU_MIN_DIAS && dias <= JANELA_FALTOU_MAX_DIAS;
      })
      .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());

    if (noShowsNaJanela.length > 0) {
      const dataNoShow = new Date(noShowsNaJanela[0].dataHora);
      const semRetorno = !ags.some(
        (a) => new Date(a.dataHora) > dataNoShow && !STATUS_NAO_VOLTOU.has(a.status),
      );
      if (semRetorno) {
        faltouNaoVoltou.push({
          id: pacienteId,
          nome: nomePorPaciente.get(pacienteId) ?? 'Paciente',
          diasAtras: diasAte(agora, dataNoShow),
        });
        continue;
      }
    }

    // ── Cancelou e não remarcou: cancelamento com data_hora >= agora-30d, sem teto (D9) ──
    const canceladosNaJanela = ags
      .filter((a) => a.status === 'cancelled')
      .filter((a) => diasAte(agora, new Date(a.dataHora)) <= JANELA_CANCELOU_DIAS)
      .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());

    if (canceladosNaJanela.length > 0 && !temFuturoNaoCancelado) {
      const dataCancelamento = new Date(canceladosNaJanela[0].dataHora);
      cancelouNaoRemarcou.push({
        id: pacienteId,
        nome: nomePorPaciente.get(pacienteId) ?? 'Paciente',
        diasAtras: diasAte(agora, dataCancelamento),
      });
      continue;
    }

    // ── Parou de vir: veio, foi atendido, não remarcou, +30 dias (D6: futuro não-cancelado exclui) ──
    const ultimaFicha = ultimaFichaPorPaciente.get(pacienteId);
    if (!ultimaFicha) continue; // nunca teve ficha = "nunca veio" (A3), nunca entra
    if (temFuturoNaoCancelado) continue;

    const gap = diasAte(agora, ultimaFicha.data);
    if (gap < SUBLINHA_PAROU_DIAS) continue;

    parouTotal30++;
    if (gap >= LIMIAR_PAROU_DIAS) {
      parouTotal60++;
      parou60.push({ id: pacienteId, nome: ultimaFicha.nome, diasAtras: gap });
    }
  }

  return {
    faltouNaoVoltou: {
      total: faltouNaoVoltou.length,
      pacientes: faltouNaoVoltou.sort(porDiasAtrasDesc).slice(0, 5),
    },
    cancelouNaoRemarcou: {
      total: cancelouNaoRemarcou.length,
      pacientes: cancelouNaoRemarcou.sort(porDiasAtrasDesc).slice(0, 5),
    },
    parouDeVir: {
      total60: parouTotal60,
      total30: parouTotal30,
      pacientes: parou60.sort(porDiasAtrasDesc).slice(0, 5),
    },
  };
}
