/**
 * Camada de negócio WhatsApp — uso exclusivo server-side.
 * Toda lógica de negócio (listas interativas, agendamento, etc.) passa por aqui.
 * O envio usa o provider abstrato — nunca importar evolution.ts diretamente.
 */

import { sendText, sendInteractiveList, type ListSection } from '@/lib/whatsapp/provider';
import { getBotMensagens, parseTemplate, type TemplateVars } from '@/lib/whatsapp/template';
import { createServiceClient } from '@/lib/supabase/service';
import { formatEspecialidades, type Especialidade } from '@/lib/especialidades';
import { buildClinicDatetime } from '@/app/dashboard/agendamentos/_components/date-helpers';
import { getDisponibilidadeSemana, slotEstaLivre, formatHora } from '@/lib/agenda/disponibilidade';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type WhatsAppStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface WhatsAppInstanceInfo {
  phoneNumberId: string;
  status: WhatsAppStatus;
}

export interface DentistListItem {
  id: string;
  nome: string;
  especialidade: Especialidade[];
}

export interface SlotInfo {
  /** ISO 8601 com offset BRT explícito (`buildClinicDatetime`) — `new Date(iso)` continua
   *  dando o instante certo, é só string diferente de antes (era `.toISOString()`, sufixo Z). */
  iso: string;
  /** Formatted label "14:00" */
  label: string;
}

export interface HoraListResult {
  slots: SlotInfo[];
  duracaoMinutos: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

export const ROW_HUMANO = '__humano__';

const BRT_OFFSET_H = 3;

// ─── Funções de instância (compatibilidade multi-tenant) ──────────────────────

/**
 * Busca o phone_number_id configurado para a clínica.
 * Usado pelo dashboard de configurações para exibir status.
 */
export async function getInstanceForClinica(
  clinicaId: string,
): Promise<WhatsAppInstanceInfo | null> {
  const db = createServiceClient();
  const { data } = await db
    .from('clinicas')
    .select('whatsapp_phone_number_id')
    .eq('id', clinicaId)
    .maybeSingle();

  const phoneNumberId =
    (data?.whatsapp_phone_number_id as string | null) ??
    process.env.WHATSAPP_PHONE_NUMBER_ID ??
    null;

  if (!phoneNumberId) return null;

  // TODO: chamar Graph API para verificar status real da conexão quando credenciais estiverem prontas
  return { phoneNumberId, status: 'disconnected' };
}

// ─── Funções de envio ─────────────────────────────────────────────────────────

export async function sendMessage(
  phoneNumberId: string,
  to: string,
  text: string,
): Promise<void> {
  await sendText(phoneNumberId, to, text);
}

// ─── Funções de List Messages ─────────────────────────────────────────────────

export async function sendDentistList(
  phoneNumberId: string,
  to: string,
  clinicaId: string,
  pacienteNome: string,
  isNovoPaciente = false,
): Promise<DentistListItem[]> {
  const db = createServiceClient();

  const [{ data: dentistasRaw }, { data: clinicaRaw }, mensagens] = await Promise.all([
    db.from('dentistas')
      .select('id, nome, especialidade')
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)
      .in('role', ['admin', 'dentista'])
      .order('nome'),
    db.from('clinicas').select('nome').eq('id', clinicaId).maybeSingle(),
    getBotMensagens(clinicaId),
  ]);

  const dentistas   = (dentistasRaw ?? []) as DentistListItem[];
  const clinicaNome = (clinicaRaw?.nome as string | null) ?? 'Clínica';
  const primeiroNome = pacienteNome.split(' ')[0];

  if (!dentistas.length) {
    await sendText(
      phoneNumberId,
      to,
      'No momento não há dentistas disponíveis para agendamento.\n' +
      'Por favor, entre em contato diretamente conosco.',
    );
    return [];
  }

  const vars: TemplateVars = { nome: primeiroNome, clinica: clinicaNome };

  const titulo    = parseTemplate(mensagens.titulo_menu_principal, vars);
  const descricao = parseTemplate(
    isNovoPaciente ? mensagens.msg_novo_paciente : mensagens.msg_paciente_antigo,
    vars,
  );

  const sections: ListSection[] = [
    {
      title: 'Dentistas Disponíveis',
      rows: dentistas.map(d => ({
        rowId:       d.id,
        title:       d.nome,
        description: formatEspecialidades(d.especialidade),
      })),
    },
    {
      title: 'Outras Opções',
      rows: [{
        rowId:       ROW_HUMANO,
        title:       'Falar com Atendente',
        description: 'Transferir para um humano',
      }],
    },
  ];

  await sendInteractiveList(phoneNumberId, to, {
    title:       `Olá, ${primeiroNome}! 👋`,
    description: descricao,
    buttonText:  titulo,
    sections,
    footer:      'Odonto.IA — Assistente Virtual',
  });

  return dentistas;
}

export async function sendDateList(
  phoneNumberId: string,
  to: string,
  clinicaId: string,
  dentistaId: string,
  dentistaNome: string,
): Promise<string[]> {
  const db = createServiceClient();

  const { data: grade } = await db
    .from('horarios_disponiveis')
    .select('dia_semana')
    .eq('dentista_id', dentistaId)
    .eq('clinica_id', clinicaId)
    .eq('ativo', true);

  const diasAtivos = new Set((grade ?? []).map(g => g.dia_semana as number));

  if (!diasAtivos.size) {
    await sendText(
      phoneNumberId,
      to,
      `${dentistaNome} não tem horários cadastrados no momento.\n` +
      'Por favor, entre em contato diretamente com nossa equipe.',
    );
    return [];
  }

  const DIAS_PT = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const hoje    = utcToBRT(new Date());
  const amanha  = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(0, 0, 0, 0);

  const datas: { iso: string; label: string }[] = [];
  const cursor = new Date(amanha);

  for (let i = 0; i < 30 && datas.length < 5; i++) {
    const diaSemana = cursor.getDay();
    if (diasAtivos.has(diaSemana)) {
      const d = String(cursor.getDate()).padStart(2, '0');
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const y = cursor.getFullYear();
      datas.push({ iso: `${y}-${m}-${d}`, label: `${DIAS_PT[diaSemana]}, ${d}/${m}` });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (!datas.length) {
    await sendText(
      phoneNumberId,
      to,
      `Não encontrei datas disponíveis para ${dentistaNome} nos próximos 30 dias.\n` +
      'Por favor, entre em contato com nossa equipe.',
    );
    return [];
  }

  await sendInteractiveList(phoneNumberId, to, {
    title:       '📅 Escolha uma Data',
    description: `Quais datas estão disponíveis para consultar com ${dentistaNome}?`,
    buttonText:  'Ver Datas',
    sections: [{
      title: 'Próximas Datas Disponíveis',
      rows:  datas.map(d => ({ rowId: d.iso, title: d.label })),
    }],
    footer: 'Odonto.IA — Assistente Virtual',
  });

  return datas.map(d => d.iso);
}

export async function sendHoraList(
  phoneNumberId: string,
  to: string,
  clinicaId: string,
  dentistaId: string,
  dateISO: string,
): Promise<HoraListResult> {
  const [year, month, day] = dateISO.split('-').map(Number);
  const diaSemana = new Date(year, month - 1, day).getDay();

  // getDisponibilidadeSemana trabalha por semana (domingo a sábado) — acha o domingo que
  // contém dateISO. Meio-dia UTC como base, mesmo truque do date-helpers.ts: nenhum fuso
  // empurra a data pro dia vizinho.
  const domingo = new Date(Date.UTC(year, month - 1, day - diaSemana, 12));
  const semanaInicioISO = domingo.toISOString().slice(0, 10);

  let semana;
  try {
    semana = await getDisponibilidadeSemana({ dentistaId, clinicaId, semanaInicioISO });
  } catch (err) {
    console.error('[sendHoraList] getDisponibilidadeSemana falhou:', err);
    await sendText(phoneNumberId, to, 'Não encontrei horários para essa data. Por favor, escolha outra data.');
    return { slots: [], duracaoMinutos: 30 };
  }
  const dia = semana.find((d) => d.data === dateISO);

  if (!dia || dia.livres.length === 0) {
    await sendText(phoneNumberId, to, 'Não encontrei horários para essa data. Por favor, escolha outra data.');
    return { slots: [], duracaoMinutos: 30 };
  }

  // R-64 (I2) — mesmo critério de "livre" da grade do dashboard (slotEstaLivre): sem almoço
  // configurado dá o MESMO resultado de antes; com almoço, exclui o intervalo (fix de graça).
  const duracaoMinutos = dia.intervaloMinutos;
  const agora = new Date();
  const slots: SlotInfo[] = [];

  for (const bloco of dia.livres) {
    for (let m = bloco.inicioMin; m + duracaoMinutos <= bloco.fimMin && slots.length < 10; m += duracaoMinutos) {
      if (!slotEstaLivre(m, duracaoMinutos, dia, agora)) continue;
      slots.push({ iso: buildClinicDatetime(dateISO, formatHora(m)), label: formatHora(m) });
    }
  }

  if (!slots.length) {
    await sendText(phoneNumberId, to, 'Não há horários disponíveis para essa data. Por favor, escolha outra data.');
    return { slots: [], duracaoMinutos };
  }

  const DIAS_PT  = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const dLabel   = String(day).padStart(2, '0');
  const mLabel   = String(month).padStart(2, '0');
  const diaLabel = DIAS_PT[diaSemana];

  await sendInteractiveList(phoneNumberId, to, {
    title:       `⏰ Horários — ${diaLabel}, ${dLabel}/${mLabel}`,
    description: 'Qual horário você prefere?',
    buttonText:  'Ver Horários',
    sections: [{
      title: 'Horários Disponíveis',
      rows:  slots.map(s => ({ rowId: s.iso, title: s.label })),
    }],
    footer: 'Odonto.IA — Assistente Virtual',
  });

  return { slots, duracaoMinutos };
}

// ─── Helper interno ───────────────────────────────────────────────────────────

function utcToBRT(d: Date): Date {
  return new Date(d.getTime() - BRT_OFFSET_H * 3_600_000);
}
