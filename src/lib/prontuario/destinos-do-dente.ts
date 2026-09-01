export type EventoDestinoDente = {
  id: string;
  fichaId: string | null;
  dente: number | null;
};

export type AtendimentoDestinoDente = {
  id: string;
  eventoIds: string[];
};

export function destinosDoDente({
  dente,
  eventos,
  atendimentos,
}: {
  dente: number;
  eventos: EventoDestinoDente[];
  atendimentos: AtendimentoDestinoDente[];
}): Array<{ atendimentoId: string | null; fichaId: string | null; eventoIds: string[] }> {
  const eventosDoDente = eventos.filter((evento) => evento.dente === dente);
  const destinos = new Map<string, { atendimentoId: string | null; fichaId: string | null; eventoIds: string[] }>();

  for (const evento of eventosDoDente) {
    const visitas = atendimentos.filter((atendimento) => atendimento.eventoIds.includes(evento.id));
    const chaves = visitas.length > 0
      ? visitas.map((visita) => ({ atendimentoId: visita.id, chave: `${visita.id}:${evento.fichaId ?? ''}` }))
      : [{ atendimentoId: null, chave: `sem-visita:${evento.fichaId ?? evento.id}` }];
    for (const { atendimentoId, chave } of chaves) {
      const atual = destinos.get(chave);
      destinos.set(chave, {
        atendimentoId,
        fichaId: evento.fichaId,
        eventoIds: [...new Set([...(atual?.eventoIds ?? []), evento.id])],
      });
    }
  }

  return [...destinos.values()];
}
