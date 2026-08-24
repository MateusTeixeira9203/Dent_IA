/**
 * R-110 — regra pura do expediente clínico.
 *
 * Não consulta banco nem conhece permissões: recebe somente a grade do dia e o intervalo
 * que se pretende agendar. Isso mantém criar e editar sob exatamente a mesma regra.
 */

export type GradeDoDia = {
  horaInicio: string;
  horaFim: string;
  almocoInicio: string | null;
  almocoFim: string | null;
};

export type MotivoForaDoExpediente =
  | 'antes_de_abrir'
  | 'depois_de_fechar'
  | 'no_almoco'
  | 'dia_sem_grade';

export type ForaDoExpediente =
  | { fora: false }
  | { fora: true; motivo: MotivoForaDoExpediente };

export function horaParaMinutos(hora: string): number {
  const [horaParte = '0', minutoParte = '0'] = hora.split(':');
  return Number(horaParte) * 60 + Number(minutoParte);
}

/**
 * `grade` ausente significa que o dentista nunca configurou horário: não há restrição.
 * O caso "tem grade, mas não neste dia" é decidido pelo serviço e chega como
 * `dia_sem_grade`, pois este helper conhece apenas um dia.
 */
export function checarExpediente(
  grade: GradeDoDia | null,
  inicioMin: number,
  duracaoMin: number,
): ForaDoExpediente {
  if (!grade) return { fora: false };

  const fimMin = inicioMin + duracaoMin;
  const abertura = horaParaMinutos(grade.horaInicio);
  const fechamento = horaParaMinutos(grade.horaFim);

  if (inicioMin < abertura) return { fora: true, motivo: 'antes_de_abrir' };
  if (fimMin > fechamento) return { fora: true, motivo: 'depois_de_fechar' };

  if (grade.almocoInicio && grade.almocoFim) {
    const inicioAlmoco = horaParaMinutos(grade.almocoInicio);
    const fimAlmoco = horaParaMinutos(grade.almocoFim);
    if (inicioMin < fimAlmoco && fimMin > inicioAlmoco) {
      return { fora: true, motivo: 'no_almoco' };
    }
  }

  return { fora: false };
}
