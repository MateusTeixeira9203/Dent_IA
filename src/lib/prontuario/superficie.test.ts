import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONTEXTO_TIMELINE_INICIAL,
  contextoDaSuperficie,
  voltarParaTimeline,
  type SuperficieProntuario,
} from './superficie';

test('cada destino clínico é uma única superfície com intenção explícita', () => {
  const destinos: SuperficieProntuario[] = [
    { tipo: 'registro', atendimentoId: 'atendimento-1', retorno: CONTEXTO_TIMELINE_INICIAL },
    { tipo: 'tratamento', fichaId: 'ficha-1', retorno: CONTEXTO_TIMELINE_INICIAL },
    {
      tipo: 'editor',
      modo: 'editar',
      fichaId: 'ficha-1',
      atendimentoOrigemId: 'atendimento-1',
      retorno: CONTEXTO_TIMELINE_INICIAL,
    },
  ];

  assert.deepEqual(destinos.map((destino) => destino.tipo), ['registro', 'tratamento', 'editor']);
  assert.equal(destinos[2]?.tipo === 'editor' ? destinos[2].modo : null, 'editar');
});

test('voltar restaura filtro, dente e scroll da timeline', () => {
  const contexto = { filtro: 'indicado' as const, dente: 46, scrollY: 840 };
  const registro: SuperficieProntuario = {
    tipo: 'registro',
    atendimentoId: 'atendimento-1',
    retorno: contexto,
  };

  assert.deepEqual(contextoDaSuperficie(registro), contexto);
  assert.deepEqual(voltarParaTimeline(registro), { tipo: 'timeline', contexto });
});
