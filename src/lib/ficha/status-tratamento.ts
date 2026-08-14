import type { StatusRegistro } from '@/types/odontograma';

/**
 * R-108b — o estado do tratamento sai do conteúdo dele: sobrou procedimento `indicado`, está
 * aberto; saiu tudo `realizado`, fechou. `fichas.status` é o estado do tratamento (R-108 §2),
 * e a ficha é o tratamento (1↔1) — não há 3º estado nem gesto novo pra encerrar.
 *
 * Mora aqui, e não dentro de `salvar-ficha.ts`, porque os DOIS caminhos de escrita precisam da
 * mesma régua: o que cria/edita a ficha da sessão (`salvarFicha`) e o que acrescenta numa ficha
 * que já existe (`acrescentarEventosNaFicha`, R-108b). A régua em dois lugares divergiria.
 *
 * O tipo do parâmetro é estrutural de propósito: serve tanto ao draft do cliente quanto às
 * linhas cruas de `odontograma_eventos`, sem mapper no meio.
 */
export function statusDoTratamento(
  eventos: readonly { status: StatusRegistro }[],
): 'aberta' | 'concluida' {
  return eventos.some((e) => e.status === 'indicado') ? 'aberta' : 'concluida';
}
