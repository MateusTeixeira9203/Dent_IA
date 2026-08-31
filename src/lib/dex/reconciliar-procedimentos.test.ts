import assert from 'node:assert/strict';
import test from 'node:test';
import type { OdontogramaEventoInput } from '@/types/odontograma';
import { reconciliarProcedimentosDex } from './reconciliar-procedimentos';

function evento(tipo: OdontogramaEventoInput['tipo']): OdontogramaEventoInput {
  return {
    tipo,
    status: 'indicado',
    origem: 'clinica',
    momento_planejado: 'sessao_atual',
    ancora: { nivel: 'dente', dente: 26 },
    grupo_id: null,
    papel_no_grupo: null,
    observacao: '',
  };
}

test('mantém procedimento conhecido que já tem evento estrutural', () => {
  const resultado = reconciliarProcedimentosDex({
    procedimentos: ['Tratamento de canal'],
    eventos: [evento('endodontia')],
    dentesObservacoes: { '26': 'Tratamento de canal' },
    modo: 'consulta',
  });

  assert.equal(resultado.adicionadosComoOutro, 0);
  assert.equal(resultado.eventos.length, 1);
});

test('procedimento explícito sem tipo ganha fallback revisável nos dentes mencionados', () => {
  const resultado = reconciliarProcedimentosDex({
    procedimentos: ['Gengivoplastia'],
    eventos: [],
    dentesObservacoes: { '11': 'Gengivoplastia', '21': 'Gengivoplastia' },
    modo: 'consulta',
  });

  assert.equal(resultado.adicionadosComoOutro, 2);
  assert.deepEqual(resultado.eventos.map((item) => item.ancora.dente), [11, 21]);
  assert.ok(resultado.eventos.every((item) => (
    item.tipo === 'outro'
    && item.status === 'indicado'
    && item.revisar_status === true
    && item.procedimentoNome === 'Gengivoplastia'
  )));
  assert.equal(resultado.eventos[0]?.grupo_id, resultado.eventos[1]?.grupo_id);
});

test('sem localização explícita, fallback fica geral e não inventa anatomia', () => {
  const resultado = reconciliarProcedimentosDex({
    procedimentos: ['Moldagem para estudo'],
    eventos: [],
    dentesObservacoes: {},
    modo: 'consulta',
  });

  assert.deepEqual(resultado.eventos[0]?.ancora, { nivel: 'geral' });
  assert.equal(resultado.eventos[0]?.status, 'indicado');
});

test('não duplica procedimento repetido com variação de caixa ou acento', () => {
  const resultado = reconciliarProcedimentosDex({
    procedimentos: ['Gengivoplastia', 'gengivoplástia'],
    eventos: [],
    dentesObservacoes: {},
    modo: 'consulta',
  });

  assert.equal(resultado.adicionadosComoOutro, 1);
});
