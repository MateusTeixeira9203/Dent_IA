import assert from 'node:assert/strict';
import test from 'node:test';
import type { OdontogramaEventoInput } from '@/types/odontograma';
import {
  aplicarAusenciasExplicitamenteNarradas,
  extrairDentesExplicitamenteAusentes,
} from './estado-ausencia';

test('extrai somente ausências dentárias explicitamente narradas', () => {
  const relato = 'O dente 23 está ausente e o dente 37 também é ausente. O 18 não está ausente.';
  assert.deepEqual(extrairDentesExplicitamenteAusentes(relato), [23, 37]);
});

test('normaliza ausência explícita sem apagar implante indicado no mesmo dente', () => {
  const eventos: OdontogramaEventoInput[] = [
    {
      tipo: 'exodontia', status: 'indicado', origem: 'clinica', momento_planejado: 'sessao_atual',
      ancora: { nivel: 'dente', dente: 23 }, grupo_id: null, papel_no_grupo: null,
      observacao: '', evidencia_status: 'ambiguo', revisar_status: true,
    },
    {
      tipo: 'implante', status: 'indicado', origem: 'clinica', momento_planejado: 'sessao_atual',
      ancora: { nivel: 'dente', dente: 23 }, grupo_id: null, papel_no_grupo: null,
      observacao: '', evidencia_status: 'indicacao_explicita', revisar_status: false,
    },
  ];

  const resultado = aplicarAusenciasExplicitamenteNarradas('O dente 23 está ausente e vou usar implante nele.', eventos);
  const ausencia = resultado.find((evento) => evento.tipo === 'exodontia');
  const implante = resultado.find((evento) => evento.tipo === 'implante');

  assert.deepEqual(ausencia && {
    status: ausencia.status,
    origem: ausencia.origem,
    dente: ausencia.ancora.dente,
    revisar: ausencia.revisar_status,
  }, { status: 'realizado', origem: 'preexistente', dente: 23, revisar: false });
  assert.equal(implante?.ancora.dente, 23);
  assert.equal(implante?.status, 'indicado');
});

test('cria estado pré-existente quando o modelo não emitiu exodontia', () => {
  const resultado = aplicarAusenciasExplicitamenteNarradas('Dente 37 ausente.', []);
  assert.deepEqual(resultado, [{
    tipo: 'exodontia', status: 'realizado', origem: 'preexistente', momento_planejado: 'sessao_atual',
    ancora: { nivel: 'dente', dente: 37 }, grupo_id: null, papel_no_grupo: null,
    observacao: 'Dente ausente (pré-existente).', evidencia_status: 'historico', revisar_status: false,
  }]);
});
