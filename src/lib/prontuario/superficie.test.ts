import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONTEXTO_TIMELINE_INICIAL,
  contextoDaSuperficie,
  podeEditarProcedimentosDaSuperficie,
  voltarParaTimeline,
  type SuperficieProntuario,
} from './superficie';

test('cada destino clínico é uma única superfície com intenção explícita', () => {
  const destinos: SuperficieProntuario[] = [
    { tipo: 'ficha', fichaId: 'ficha-1', atendimentoId: 'atendimento-1', retorno: CONTEXTO_TIMELINE_INICIAL },
    { tipo: 'legado', atendimentoId: 'atendimento-legado', retorno: CONTEXTO_TIMELINE_INICIAL },
    {
      tipo: 'editor',
      modo: 'complementar',
      fichaId: 'ficha-1',
      atendimentoOrigemId: 'atendimento-1',
      retorno: CONTEXTO_TIMELINE_INICIAL,
    },
  ];

  assert.deepEqual(destinos.map((destino) => destino.tipo), ['ficha', 'legado', 'editor']);
  assert.equal(destinos[2]?.tipo === 'editor' ? destinos[2].modo : null, 'complementar');
});

test('voltar restaura filtro, dente, concluídos e scroll do resumo', () => {
  const contexto = { filtro: 'indicado' as const, dente: 46, concluidos: true, scrollY: 840 };
  const registro: SuperficieProntuario = {
    tipo: 'ficha',
    fichaId: 'ficha-1',
    atendimentoId: 'atendimento-1',
    retorno: contexto,
  };

  assert.deepEqual(contextoDaSuperficie(registro), contexto);
  assert.deepEqual(voltarParaTimeline(registro), { tipo: 'resumo', contexto });
});

test('registro legado é estritamente somente leitura', () => {
  const legado: SuperficieProntuario = {
    tipo: 'legado',
    atendimentoId: 'atendimento-legado',
    retorno: CONTEXTO_TIMELINE_INICIAL,
  };
  const ficha: SuperficieProntuario = {
    tipo: 'ficha',
    fichaId: 'ficha-1',
    atendimentoId: null,
    retorno: CONTEXTO_TIMELINE_INICIAL,
  };

  assert.equal(podeEditarProcedimentosDaSuperficie(legado, true), false);
  assert.equal(podeEditarProcedimentosDaSuperficie(ficha, true), true);
  assert.equal(podeEditarProcedimentosDaSuperficie(ficha, false), false);
});
