import type { DexNovidade } from '@/lib/dex/tipos';

// A fonte é o ROADMAP.md; entrada nova é ~5 linhas num commit (D8). Não vai ao banco —
// zero infra, zero schema. "Visto" fica em localStorage, por entrada (coluna-novidades.tsx).
export const NOVIDADES: DexNovidade[] = [
  {
    id: 'r-102-compromisso-pessoal',
    titulo: 'Compromisso pessoal na agenda',
    data: '2026-08-11',
    resumo: 'bloqueie manhã, tarde ou o dia inteiro sem paciente',
    detalhe: 'Marque um horário como ocupado (consulta médica, resolver algo pessoal) direto na agenda — ele bloqueia o encaixe sem precisar criar um agendamento de mentira.',
  },
  {
    id: 'r-99-anotar-radiografia',
    titulo: 'Anotar direto na radiografia',
    data: '2026-08-10',
    resumo: '5 símbolos e desenho livre sobre a imagem',
    detalhe: 'Marque achados direto em cima da imagem da radiografia, com símbolos prontos ou desenho livre — sem sair da ficha do paciente.',
  },
  {
    id: 'r-101-odontograma-3-estados',
    titulo: 'Odontograma com 3 estados',
    data: '2026-08-11',
    resumo: '"a fazer", "próxima sessão" e "concluído"',
    detalhe: 'O odontograma agora acompanha o andamento de cada dente — dá pra ver de longe o que ainda falta fazer, o que é a próxima sessão e o que já foi concluído.',
  },
];
