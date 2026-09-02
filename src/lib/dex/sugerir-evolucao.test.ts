import assert from 'node:assert/strict';
import test from 'node:test';
import { montarPedidoSugestaoEvolucao, montarPromptSugestaoEvolucao } from './sugerir-evolucao';
import { sugerirEvolucaoRequestSchema, sugerirEvolucaoResponseSchema } from './schemas';

test('monta contexto mínimo sem dados pessoais e preserva status e localização', () => {
  const pedido = montarPedidoSugestaoEvolucao([{
    id: 'evento-1',
    tipo: 'carie_restauracao',
    procedimentoId: null,
    procedimentoNome: 'Restauração em resina',
    status: 'realizado',
    origem: 'clinica',
    momento_planejado: 'sessao_atual',
    ancora: { nivel: 'face', dente: 16, faces: ['M', 'O', 'D'] },
    grupo_id: null,
    papel_no_grupo: null,
    observacao: 'Sem intercorrências',
    detalhe: null,
    realizado_em: '2026-09-01',
  }], null);

  assert.deepEqual(pedido, {
    itens: [{
      procedimento: 'Restauração em resina',
      status: 'realizado',
      origem: 'clinica',
      momentoPlanejado: 'sessao_atual',
      localizacao: 'dente 16, faces MOD',
      observacao: 'Sem intercorrências',
      detalhe: null,
    }],
    ortodontia: null,
  });
  assert.doesNotMatch(montarPromptSugestaoEvolucao(pedido), /pacienteNome/);
});

test('entrada exige conteúdo clínico e saída recusa texto vazio', () => {
  assert.equal(sugerirEvolucaoRequestSchema.safeParse({ itens: [], ortodontia: null }).success, false);
  assert.equal(sugerirEvolucaoResponseSchema.safeParse({ texto: '  ' }).success, false);
  assert.equal(sugerirEvolucaoResponseSchema.safeParse({ texto: 'Restauração realizada no dente 16.' }).success, true);
});

test('prompt impede transformar indicado ou preexistente em execução atual', () => {
  const prompt = montarPromptSugestaoEvolucao({
    itens: [{
      procedimento: 'Endodontia',
      status: 'indicado',
      origem: 'preexistente',
      momentoPlanejado: 'proxima_sessao',
      localizacao: 'dente 26',
      observacao: '',
      detalhe: null,
    }],
    ortodontia: null,
  });

  assert.match(prompt, /Origem="preexistente" é condição histórica/);
  assert.match(prompt, /planejado para a próxima sessão/);
});
