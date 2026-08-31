/** R-140a — uma visita clínica; nunca substitui Ficha (tratamento) nem Evento. */
export type AtendimentoEstado = 'preparando' | 'finalizado' | 'falhou';
export type AtendimentoOrigem = 'meu_dia' | 'ficha' | 'importado' | 'legado';
export type PapelEventoAtendimento = 'registrado' | 'realizado';

export interface AtendimentoClinico {
  id: string;
  clinicaId: string;
  pacienteId: string;
  dentistaId: string;
  agendamentoId: string | null;
  chaveIdempotencia: string;
  dataAtendimento: string;
  origem: AtendimentoOrigem;
  estado: AtendimentoEstado;
  criadoPor: string | null;
  finalizadoEm: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AtendimentoEvento {
  atendimentoId: string;
  eventoId: string;
  papel: PapelEventoAtendimento;
  createdAt: string;
}
