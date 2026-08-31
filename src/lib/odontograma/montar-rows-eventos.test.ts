import assert from 'node:assert/strict';
import test from 'node:test';
import { montarRowsEventos } from './montar-rows-eventos';
import type { OdontogramaEventoDraft } from '@/types/odontograma';

test('serializa procedimento flexível sem inventar anatomia', () => {
  const evento: OdontogramaEventoDraft = {
    id: '10000000-0000-4000-8000-000000000001',
    tipo: 'outro',
    procedimentoId: '20000000-0000-4000-8000-000000000001',
    procedimentoNome: 'Troca de curativo',
    status: 'realizado',
    origem: 'clinica',
    momento_planejado: 'sessao_atual',
    ancora: { nivel: 'geral' },
    grupo_id: null,
    papel_no_grupo: null,
    observacao: 'Sem intercorrências',
    realizado_em: '2026-08-30',
  };

  const [row] = montarRowsEventos([evento], {
    clinicId: '30000000-0000-4000-8000-000000000001',
    pacienteId: '40000000-0000-4000-8000-000000000001',
    dentistaId: '50000000-0000-4000-8000-000000000001',
    fichaId: '60000000-0000-4000-8000-000000000001',
  });

  assert.equal(row.procedimento_id, evento.procedimentoId);
  assert.equal(row.procedimento_nome, evento.procedimentoNome);
  assert.equal(row.nivel, 'geral');
  assert.equal(row.arcada, null);
  assert.equal(row.quadrante, null);
  assert.equal(row.dente, null);
  assert.deepEqual(row.faces, []);
});
