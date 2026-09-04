export type EventoComFicha = { id: string; fichaId: string | null };
export type VinculoDeEvento = { evento_id: string };

export function eventosDaVisita<T extends EventoComFicha>({
  links,
  eventosPorId,
  fichaIds,
  fichasComFallbackConsumido,
  eventosPorFicha,
}: {
  links: VinculoDeEvento[];
  eventosPorId: ReadonlyMap<string, T>;
  fichaIds: string[];
  fichasComFallbackConsumido: Set<string>;
  eventosPorFicha: ReadonlyMap<string, T[]>;
}): T[] {
  if (links.length > 0) {
    return [...new Map(
      links.flatMap((link) => {
        const evento = eventosPorId.get(link.evento_id);
        return evento ? [[evento.id, evento] as const] : [];
      }),
    ).values()];
  }

  return fichaIds.flatMap((fichaId) => {
    if (fichasComFallbackConsumido.has(fichaId)) return [];
    fichasComFallbackConsumido.add(fichaId);
    return eventosPorFicha.get(fichaId) ?? [];
  });
}
