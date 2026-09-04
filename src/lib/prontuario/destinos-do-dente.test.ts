import assert from 'node:assert/strict';
import test from 'node:test';
import { destinosDoDente } from './destinos-do-dente';

test('preserva visitas distintas da mesma Ficha como destinos exatos', () => {
  const resultado = destinosDoDente({
    dente: 46,
    eventos: [
      { id: 'evento-1', fichaId: 'ficha-1', dente: 46 },
      { id: 'evento-2', fichaId: 'ficha-1', dente: 46 },
    ],
    atendimentos: [
      { id: 'atendimento-1', eventoIds: ['evento-1'] },
      { id: 'atendimento-2', eventoIds: ['evento-2'] },
    ],
  });

  assert.deepEqual(resultado.map((destino) => destino.atendimentoId), ['atendimento-1', 'atendimento-2']);
});

test('evento legado sem visita continua acessível pelo tratamento', () => {
  assert.deepEqual(destinosDoDente({
    dente: 11,
    eventos: [{ id: 'evento-legado', fichaId: 'ficha-legada', dente: 11 }],
    atendimentos: [],
  }), [{ atendimentoId: null, fichaId: 'ficha-legada', eventoIds: ['evento-legado'] }]);
});
