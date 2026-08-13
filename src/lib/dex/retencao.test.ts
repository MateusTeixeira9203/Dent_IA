/**
 * R-103b (fase 1, gates G1/G2/G5/G9/G10) — testes de classificarRetencao. Roda sem
 * framework: node --test src/lib/dex/retencao.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificarRetencao, type AgendamentoRetencao, type FichaRetencao } from './retencao.ts';

const MS_DIA = 24 * 60 * 60 * 1000;
const AGORA = new Date('2026-08-12T12:00:00.000Z');

/** ISO da data `dias` atrás de AGORA (negativo = no futuro). Offset em múltiplo exato de
 *  MS_DIA a partir do mesmo horário, então diasAte() bate exato — sem flakiness de fração. */
function iso(dias: number): string {
  return new Date(AGORA.getTime() - dias * MS_DIA).toISOString();
}

function ag(pacienteId: string, status: string, dias: number, nome = 'Paciente'): AgendamentoRetencao {
  return { pacienteId, pacienteNome: nome, status, dataHora: iso(dias) };
}

function ficha(pacienteId: string, dias: number, nome = 'Paciente'): FichaRetencao {
  return { pacienteId, pacienteNome: nome, dataAtendimento: iso(dias) };
}

test('G1 — faltou E parou-de-vir simultâneo: aparece só em faltou (precedência)', () => {
  const r = classificarRetencao(
    [ag('p1', 'no_show', 20)],
    [ficha('p1', 90)],
    AGORA,
  );
  assert.equal(r.faltouNaoVoltou.total, 1);
  assert.equal(r.cancelouNaoRemarcou.total, 0);
  assert.equal(r.parouDeVir.total30, 0);
});

test('G2 — no-show fora da janela (200 dias) e sem ficha nenhuma: não aparece em card nenhum', () => {
  const r = classificarRetencao([ag('p2', 'no_show', 200)], [], AGORA);
  assert.equal(r.faltouNaoVoltou.total, 0);
  assert.equal(r.cancelouNaoRemarcou.total, 0);
  assert.equal(r.parouDeVir.total30, 0);
});

test('G9 — cancela a consulta de amanhã, sem remarcar: entra em cancelou (D9)', () => {
  const r = classificarRetencao([ag('p3', 'cancelled', -1)], [], AGORA);
  assert.equal(r.cancelouNaoRemarcou.total, 1);
  assert.equal(r.cancelouNaoRemarcou.pacientes[0].diasAtras, -1);
});

test('G10 — sem vir há 90 dias E com consulta futura cancelada: só cancelou, nunca parou (D6+D9)', () => {
  const r = classificarRetencao(
    [ag('p4', 'cancelled', -21)],
    [ficha('p4', 90)],
    AGORA,
  );
  assert.equal(r.cancelouNaoRemarcou.total, 1);
  assert.equal(r.parouDeVir.total30, 0);
  assert.equal(r.parouDeVir.total60, 0);
});

test('cancelou há 10 dias mas já remarcou pra semana que vem: não entra (existe futuro não-cancelado)', () => {
  const r = classificarRetencao(
    [ag('p5', 'cancelled', 10), ag('p5', 'scheduled', -7)],
    [],
    AGORA,
  );
  assert.equal(r.cancelouNaoRemarcou.total, 0);
});

test('D6 — agendamento futuro não-cancelado (sem nenhum cancelamento) exclui de parou de vir', () => {
  const r = classificarRetencao(
    [ag('p6', 'scheduled', -10)],
    [ficha('p6', 90)],
    AGORA,
  );
  assert.equal(r.parouDeVir.total30, 0);
  assert.equal(r.cancelouNaoRemarcou.total, 0);
  assert.equal(r.faltouNaoVoltou.total, 0);
});

test('parou de vir há 40 dias: conta só na sublinha (total30), não no card (total60)', () => {
  const r = classificarRetencao([], [ficha('p7', 40)], AGORA);
  assert.equal(r.parouDeVir.total30, 1);
  assert.equal(r.parouDeVir.total60, 0);
  assert.deepEqual(r.parouDeVir.pacientes, []); // chips só vêm do bucket de 60d
});

test('G5 — parou de vir há 75 dias: conta nos 2 números, total30 >= total60', () => {
  const r = classificarRetencao([], [ficha('p8', 75)], AGORA);
  assert.equal(r.parouDeVir.total60, 1);
  assert.equal(r.parouDeVir.total30, 1);
  assert.ok(r.parouDeVir.total30 >= r.parouDeVir.total60);
  assert.equal(r.parouDeVir.pacientes.length, 1);
});

test('faltou há 3 dias: não entra ainda (carência de 7 dias)', () => {
  const r = classificarRetencao([ag('p9', 'no_show', 3)], [], AGORA);
  assert.equal(r.faltouNaoVoltou.total, 0);
});

test('A3 — nunca teve ficha, mesmo sem nenhum agendamento: nunca aparece em parou de vir', () => {
  const r = classificarRetencao([], [], AGORA);
  assert.equal(r.parouDeVir.total30, 0);
  assert.equal(r.parouDeVir.total60, 0);
});

test('faltou seguido de retorno agendado: sai de faltou (achou alguém depois do no-show)', () => {
  const r = classificarRetencao(
    [ag('p10', 'no_show', 20), ag('p10', 'scheduled', -5)],
    [],
    AGORA,
  );
  assert.equal(r.faltouNaoVoltou.total, 0);
});

test('agregado: 3 pacientes independentes cada um só no seu bucket, sem contaminação cruzada', () => {
  const r = classificarRetencao(
    [ag('a', 'no_show', 30), ag('b', 'cancelled', 5)],
    [ficha('c', 65)],
    AGORA,
  );
  assert.equal(r.faltouNaoVoltou.total, 1);
  assert.equal(r.faltouNaoVoltou.pacientes[0].id, 'a');
  assert.equal(r.cancelouNaoRemarcou.total, 1);
  assert.equal(r.cancelouNaoRemarcou.pacientes[0].id, 'b');
  assert.equal(r.parouDeVir.total60, 1);
  assert.equal(r.parouDeVir.pacientes[0].id, 'c');
});
