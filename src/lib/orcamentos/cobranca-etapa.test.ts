import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveEstadoCobrancaEtapa } from './cobranca-etapa';

test('cobrança por etapa deriva pendente, parcial, paga e cancelada dos fatos', () => {
  assert.deepEqual(
    deriveEstadoCobrancaEtapa({ valorFinal: 900, situacao: 'aberta', pagamentos: [] }),
    { valorPago: 0, saldo: 900, estado: 'pendente' },
  );
  assert.deepEqual(
    deriveEstadoCobrancaEtapa({
      valorFinal: 900,
      situacao: 'aberta',
      pagamentos: [{ valor: 500, status: 'pago' }, { valor: 400, status: 'pendente' }],
    }),
    { valorPago: 500, saldo: 400, estado: 'parcial' },
  );
  assert.deepEqual(
    deriveEstadoCobrancaEtapa({
      valorFinal: 900,
      situacao: 'aberta',
      pagamentos: [{ valor: 900, status: 'pago' }],
    }),
    { valorPago: 900, saldo: 0, estado: 'paga' },
  );
  assert.equal(
    deriveEstadoCobrancaEtapa({ valorFinal: 900, situacao: 'cancelada', pagamentos: [] }).estado,
    'cancelada',
  );
});
