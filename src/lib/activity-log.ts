// Fire-and-forget audit logging — never blocks the main operation.
// Event names come from EVENTS in src/lib/events.ts — single source of truth.

import type { OdontoEvent } from './events';
import type { SupabaseClient } from '@supabase/supabase-js';

type LogData = {
  clinicaId:   string;
  actorId:     string;
  actorNome?:  string;
  pacienteId?: string;
  entityType:  string;
  entityId?:   string;
  action:      OdontoEvent;
  metadata?:   Record<string, unknown>;
};

export function registrarLog(supabase: SupabaseClient, data: LogData): void {
  void supabase
    .from('activity_logs')
    .insert({
      clinica_id:  data.clinicaId,
      actor_id:    data.actorId,
      actor_nome:  data.actorNome ?? null,
      paciente_id: data.pacienteId ?? null,
      entity_type: data.entityType,
      entity_id:   data.entityId ?? null,
      action:      data.action,
      metadata:    data.metadata ?? null,
    })
    .then(({ error }: { error: { message: string } | null }) => {
      // R-30 Parte 6 — console.error, não warn: fire-and-forget não pode virar "morre em
      // silêncio" também no log. error (não warn) é o que costuma disparar alerta/monitoramento.
      if (error) console.error('[activity-log] insert failed:', error.message);
    });
}
