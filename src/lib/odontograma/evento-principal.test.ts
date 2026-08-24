/**
 * Execute com: node --test src/lib/odontograma/evento-principal.test.ts
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { OdontogramaEventoDraft, TipoRegistroOdontograma } from '../../types/odontograma';
import { eventoPrincipalPorDente } from './evento-principal.ts';

function evento(
  id: string,
  tipo: TipoRegistroOdontograma,
  createdAt?: string,
): OdontogramaEventoDraft {
  return {
    id,
    tipo,
    status: 'realizado',
    origem: 'profissional',
    momento_planejado: 'sessao_atual',
    ancora: { nivel: 'dente', dente: 46 },
    grupo_id: null,
    papel_no_grupo: null,
    observacao: '',
    realizado_em: '2026-08-24',
    created_at: createdAt,
  };
}

test('evento persistido mais recente vence no mesmo dente', () => {
  const ausente = evento('ausente', 'exodontia', '2026-08-20T10:00:00Z');
  const implante = evento('implante', 'implante', '2026-08-24T10:00:00Z');

  assert.equal(eventoPrincipalPorDente([], [implante, ausente]).get(46)?.tipo, 'implante');
});

test('rascunho novo vence o histórico persistido', () => {
  const ausente = evento('ausente', 'exodontia', '2026-08-24T10:00:00Z');
  const implante = evento('implante', 'implante');

  assert.equal(eventoPrincipalPorDente([implante], [ausente]).get(46)?.tipo, 'implante');
});

test('rascunho editado substitui o persistido com o mesmo id', () => {
  const persistido = evento('mesmo-id', 'exodontia', '2026-08-24T10:00:00Z');
  const editado = evento('mesmo-id', 'implante', '2026-08-24T10:00:00Z');

  assert.equal(eventoPrincipalPorDente([editado], [persistido]).get(46)?.tipo, 'implante');
});
