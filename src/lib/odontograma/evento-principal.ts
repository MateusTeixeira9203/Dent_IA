import type { OdontogramaEventoDraft } from '../../types/odontograma';

type EventoOrdenado = {
  evento: OdontogramaEventoDraft;
  fonte: 'persistido' | 'rascunho';
  indice: number;
};

function instante(evento: OdontogramaEventoDraft): number | null {
  const valor = evento.created_at ?? evento.registrado_em;
  if (!valor) return null;
  const timestamp = Date.parse(valor);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function vemDepois(candidato: EventoOrdenado, atual: EventoOrdenado): boolean {
  // O rascunho representa a decisão ainda não salva desta consulta e vence o histórico.
  if (candidato.fonte !== atual.fonte) return candidato.fonte === 'rascunho';

  const candidatoEm = instante(candidato.evento);
  const atualEm = instante(atual.evento);
  if (candidatoEm != null && atualEm != null && candidatoEm !== atualEm) {
    return candidatoEm > atualEm;
  }

  // Evento sem timestamp é novo; entre empates, o último inserido vence.
  if (candidatoEm == null && atualEm != null) return true;
  if (candidatoEm != null && atualEm == null) return false;
  return candidato.indice > atual.indice;
}

/**
 * R-127 — retorna o último evento visível de cada dente. O merge por id preserva a regra
 * existente: a versão editada no rascunho substitui a linha persistida correspondente.
 */
export function eventoPrincipalPorDente(
  eventos: OdontogramaEventoDraft[],
  eventosPersistidos: OdontogramaEventoDraft[] = [],
): Map<number, OdontogramaEventoDraft> {
  const porId = new Map<string, EventoOrdenado>();
  eventosPersistidos.forEach((evento, indice) => {
    porId.set(evento.id, { evento, fonte: 'persistido', indice });
  });
  eventos.forEach((evento, indice) => {
    porId.set(evento.id, { evento, fonte: 'rascunho', indice });
  });

  const principal = new Map<number, EventoOrdenado>();
  for (const candidato of porId.values()) {
    const dente = candidato.evento.ancora.dente;
    if (dente == null) continue;
    const atual = principal.get(dente);
    if (!atual || vemDepois(candidato, atual)) principal.set(dente, candidato);
  }

  return new Map([...principal].map(([dente, entrada]) => [dente, entrada.evento]));
}
