import { createHash } from 'crypto';

export const TERMOS_USO_VERSAO = '1.0-draft';
export const TEMPLATE_ACEITE_VERSAO = '1.0-draft';

export type DadosParte = {
  nome: string;
  cpf?: string | null;
};

export function hashConteudo(conteudo: string): string {
  return createHash('sha256').update(conteudo, 'utf8').digest('hex');
}

export function termosUsoOdontoIA(): string {
  return `TERMOS DE USO DA PLATAFORMA ODONTO.IA

VERSÃO ${TERMOS_USO_VERSAO} — RASCUNHO SUJEITO À REVISÃO JURÍDICA ANTES DA ATIVAÇÃO.

1. A Odonto.IA é uma plataforma SaaS de gestão e registro para profissionais e clínicas odontológicas. O serviço é licenciado, não vendido, durante a vigência do plano contratado.

2. A Odonto.IA não presta atendimento de saúde, não diagnostica, não indica tratamentos e não substitui o juízo clínico. Todo conteúdo clínico, inclusive conteúdo estruturado por inteligência artificial, deve ser revisado e validado pelo profissional responsável antes de integrar o prontuário.

3. A clínica ou profissional contratante responde pela legitimidade dos dados inseridos, pela obtenção das bases legais e informações devidas aos pacientes e pelo uso das credenciais de sua equipe. Logins são pessoais e intransferíveis.

4. Para dados pessoais de pacientes, a clínica ou profissional é controlador e a Odonto.IA atua como operadora, tratando dados apenas para prestar, proteger e manter o serviço. Dados de saúde exigem tratamento cuidadoso e medidas de segurança adequadas.

5. O plano, a cobrança, o período de teste, as limitações e as regras de suspensão constam da contratação eletrônica. A eventual inadimplência não elimina obrigações legais da contratante sobre o prontuário.

6. Estes termos não afastam responsabilidades que a legislação brasileira não permita limitar. A versão efetivamente ativada, com identificação empresarial, política de privacidade, subprocessadores e canais de suporte, substituirá este rascunho após revisão jurídica.`;
}

export function renderAceiteOrcamento(input: {
  clinicaNome: string;
  paciente: DadosParte;
  dentistaNome: string;
  cro: string | null;
  itens: Array<{ descricao: string; quantidade: number; precoTotal: number }>;
  total: number;
  condicoesPagamento: string | null;
}): string {
  const itens = input.itens
    .map((item, index) => `${index + 1}. ${item.quantidade}× ${item.descricao} — R$ ${item.precoTotal.toFixed(2).replace('.', ',')}`)
    .join('\n');
  return `TERMO DE ACEITE DE ORÇAMENTO E PLANO DE TRATAMENTO ODONTOLÓGICO

Clínica: ${input.clinicaNome}
Paciente: ${input.paciente.nome}${input.paciente.cpf ? ` — CPF ${input.paciente.cpf}` : ''}
Profissional responsável: ${input.dentistaNome}${input.cro ? ` — CRO ${input.cro}` : ''}

PROCEDIMENTOS APROVADOS
${itens}

VALOR TOTAL APROVADO: R$ ${input.total.toFixed(2).replace('.', ',')}
Condições de pagamento: ${input.condicoesPagamento?.trim() || 'A definir com a clínica.'}

Declaro que recebi explicação em linguagem acessível sobre o plano aprovado, suas alternativas, limites e condições financeiras. Aceito exclusivamente os procedimentos acima, ciente de que qualquer alteração relevante ou novo valor depende de novo orçamento e novo aceite.

O presente documento registra manifestação de vontade eletrônica do paciente ou responsável no ato da assinatura.`;
}

export function renderTCLE(input: {
  clinicaNome: string;
  paciente: DadosParte;
  representante?: DadosParte | null;
  dentistaNome: string;
  cro: string | null;
  procedimento: string;
  regiao: string;
  justificativa: string;
  explicacao: string;
  alternativas: string;
  riscos: string;
  consequencias: string;
  orientacoes: string;
}): string {
  return `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO — PROCEDIMENTO ODONTOLÓGICO

Clínica: ${input.clinicaNome}
Paciente: ${input.paciente.nome}${input.paciente.cpf ? ` — CPF ${input.paciente.cpf}` : ''}
${input.representante ? `Representante legal: ${input.representante.nome}${input.representante.cpf ? ` — CPF ${input.representante.cpf}` : ''}` : ''}
Cirurgião-dentista: ${input.dentistaNome}${input.cro ? ` — CRO ${input.cro}` : ''}

PROCEDIMENTO: ${input.procedimento}
REGIÃO: ${input.regiao}

POR QUE FOI INDICADO
${input.justificativa}

COMO SERÁ REALIZADO
${input.explicacao}

ALTERNATIVAS APRESENTADAS
${input.alternativas}

CONSEQUÊNCIAS DE NÃO REALIZAR
${input.consequencias}

RISCOS E COMPLICAÇÕES POSSÍVEIS
${input.riscos}

ORIENTAÇÕES E CUIDADOS
${input.orientacoes}

Declaro que recebi explicações compreensíveis, pude tirar dúvidas e consinto livremente com a realização do procedimento descrito. Estou ciente de que posso revogar este consentimento antes do início do procedimento, observado o registro clínico e eventuais custos comprovadamente já incorridos.`;
}

export function renderConclusao(input: {
  clinicaNome: string;
  paciente: DadosParte;
  representante?: DadosParte | null;
  dentistaNome: string;
  cro: string | null;
  procedimentos: string[];
  orientacoes: string;
  intercorrencia?: string;
  retorno?: string;
}): string {
  return `TERMO DE CONCLUSÃO E ACEITE DE PROCEDIMENTO REALIZADO

Clínica: ${input.clinicaNome}
Paciente: ${input.paciente.nome}${input.paciente.cpf ? ` — CPF ${input.paciente.cpf}` : ''}
${input.representante ? `Representante legal: ${input.representante.nome}${input.representante.cpf ? ` — CPF ${input.representante.cpf}` : ''}` : ''}
Cirurgião-dentista executor: ${input.dentistaNome}${input.cro ? ` — CRO ${input.cro}` : ''}

PROCEDIMENTOS REALIZADOS NESTA SESSÃO
${input.procedimentos.map((procedimento, index) => `${index + 1}. ${procedimento}`).join('\n')}

ORIENTAÇÕES ENTREGUES
${input.orientacoes}

INTERCORRÊNCIAS
${input.intercorrencia?.trim() || 'Não houve intercorrência registrada.'}

RETORNO
${input.retorno?.trim() || 'Conforme orientação clínica.'}

Declaro que os procedimentos acima foram realizados nesta sessão, que recebi as orientações descritas e que pude esclarecer dúvidas. Este aceite comprova a execução e a entrega das orientações, sem limitar garantias ou direitos legais aplicáveis.`;
}
