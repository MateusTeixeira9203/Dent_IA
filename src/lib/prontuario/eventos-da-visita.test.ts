import assert from 'node:assert/strict';
import test from 'node:test';
import { eventosDaVisita, type EventoComFicha } from './eventos-da-visita';

const evento: EventoComFicha = { id: 'evento-1', fichaId: 'ficha-1' };

test('relação explícita vence e elimina links duplicados', () => {
  const resultado = eventosDaVisita({
    links: [{ evento_id: evento.id }, { evento_id: evento.id }],
    eventosPorId: new Map([[evento.id, evento]]),
    fichaIds: ['ficha-1'],
    fichasComFallbackConsumido: new Set(),
    eventosPorFicha: new Map([['ficha-1', [evento]]]),
  });

  assert.deepEqual(resultado, [evento]);
});

test('fallback de uma Ficha é anexado a somente uma visita antiga', () => {
  const consumidas = new Set<string>();
  const entrada = {
    links: [],
    eventosPorId: new Map([[evento.id, evento]]),
    fichaIds: ['ficha-1'],
    fichasComFallbackConsumido: consumidas,
    eventosPorFicha: new Map([['ficha-1', [evento]]]),
  };

  assert.deepEqual(eventosDaVisita(entrada), [evento]);
  assert.deepEqual(eventosDaVisita(entrada), []);
});
