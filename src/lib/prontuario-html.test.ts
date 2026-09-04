import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProntuarioHTML, type PacienteExport } from './prontuario-html';

const paciente: PacienteExport = {
  nome: 'Paciente Teste',
  cpf: null,
  email: null,
  telefone: null,
  data_nascimento: null,
  endereco: null,
  cidade: null,
  estado: null,
  created_at: '2026-01-01T00:00:00Z',
};

test('exportação acrescenta Atendimentos e preserva Fichas Clínicas', () => {
  const html = buildProntuarioHTML(paciente, [], [], [], [{
    data: '2026-08-31',
    fonte: 'moderna',
    profissionalNome: 'Dra. Ana',
    evolucoes: [{ fichaNome: 'Reabilitação', texto: 'Evolução revisada' }],
    procedimentos: [{ nome: 'Restauração', localizacao: 'Dente 46', status: 'realizado' }],
  }]);

  assert.match(html, /Atendimentos/);
  assert.match(html, /Evolução revisada/);
  assert.match(html, /Fichas Clínicas/);
});
