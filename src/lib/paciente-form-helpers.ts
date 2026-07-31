/**
 * R-41 — portado de `novo-paciente-form.tsx` pra ser a mesma definição nas duas telas
 * (criar e editar). "É menor" e a lista de parentesco não podem divergir entre elas.
 */

export function calcularIdade(dataNasc: string): number | null {
  if (!dataNasc) return null;
  const nasc = new Date(dataNasc);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

export const PARENTESCO_OPTIONS = [
  { value: 'mae',   label: 'Mãe' },
  { value: 'pai',   label: 'Pai' },
  { value: 'avo',   label: 'Avó / Avô' },
  { value: 'tutor', label: 'Tutor Legal' },
  { value: 'outro', label: 'Outro' },
];

export function formatCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
