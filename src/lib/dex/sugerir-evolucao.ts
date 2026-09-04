import type { OrtoManutencaoInfo, OdontogramaEventoDraft } from '@/types/odontograma';
import { TIPO_LABEL } from '@/types/odontograma';
import type { SugerirEvolucaoRequest } from '@/lib/dex/schemas';

function serializarDetalhe(detalhe: unknown): string | null {
  if (detalhe == null) return null;
  try {
    const texto = JSON.stringify(detalhe);
    return texto ? texto.slice(0, 4_000) : null;
  } catch {
    return null;
  }
}

function descreverLocalizacao(evento: OdontogramaEventoDraft): string {
  const { ancora } = evento;
  if (ancora.nivel === 'boca') return 'boca toda';
  if (ancora.nivel === 'arcada') return ancora.arcada ? `arcada ${ancora.arcada}` : 'arcada não especificada';
  if (ancora.nivel === 'quadrante') return ancora.quadrante ? `quadrante ${ancora.quadrante}` : 'quadrante não especificado';
  if (ancora.dente != null) {
    const faces = ancora.faces?.length ? `, faces ${ancora.faces.join('')}` : '';
    return `dente ${ancora.dente}${faces}`;
  }
  return 'sem localização específica';
}

export function montarPedidoSugestaoEvolucao(
  eventos: OdontogramaEventoDraft[],
  ortodontia: OrtoManutencaoInfo | null,
): SugerirEvolucaoRequest {
  return {
    itens: eventos.map((evento) => ({
      procedimento: evento.procedimentoNome?.trim() || TIPO_LABEL[evento.tipo],
      status: evento.status,
      origem: evento.origem,
      momentoPlanejado: evento.momento_planejado,
      localizacao: descreverLocalizacao(evento),
      observacao: evento.observacao.trim().slice(0, 2_000),
      detalhe: serializarDetalhe(evento.detalhe),
    })),
    ortodontia: ortodontia ? JSON.stringify(ortodontia).slice(0, 5_000) : null,
  };
}

export function montarPromptSugestaoEvolucao(entrada: SugerirEvolucaoRequest): string {
  return `Você redige um RASCUNHO de evolução clínica odontológica para revisão do dentista.

DADOS ESTRUTURADOS DESTA CONSULTA:
${JSON.stringify(entrada)}

Escreva de 2 a 4 frases objetivas, em português brasileiro e linguagem clínica clara.
Use SOMENTE os fatos fornecidos. Não invente diagnóstico, técnica, material, medicamento,
orientação, intercorrência ou resultado. Evento realizado só pode ser descrito como executado
quando status="realizado" e origem="clinica". Origem="preexistente" é condição histórica,
nunca execução desta consulta. Status="indicado" descreve planejamento; se
momentoPlanejado="proxima_sessao", diga que foi planejado para a próxima sessão.
Não cite o nome do paciente. Não acrescente recomendações. Não use listas.
Retorne somente JSON no formato {"texto":"..."}.`;
}
