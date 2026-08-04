'use client';

// R-58 — extraído de FichasTab.tsx (`corpoEspecialidade`, Roadmap A) pra ser reusado pelo
// histórico do Meu dia. Behavior-preserving: mesma lógica, mesmo comportamento — só muda de
// casa. Fica em components/ (não lib/) porque retorna JSX — mesma fronteira que o resto da
// casa já respeita.

import { endoDetalheSchema } from '@/lib/especialidades/endo';
import { EndoCard } from '@/components/fichas/endo-card';
import { implanteDetalheSchema } from '@/lib/especialidades/implante';
import { ImplanteCard } from '@/components/fichas/implante-card';
import { psrDetalheSchema } from '@/lib/especialidades/perio';
import { PsrCard } from '@/components/fichas/psr-card';
import type { TipoRegistroOdontograma } from '@/types/odontograma';

/**
 * Resolve o corpo de camada 3 (tabela de endo, campos de implante) pra um card §11 —
 * só monta quando há dado (I2). `detalhe` é lido SEMPRE por safeParse (migration 106,
 * spec-106 §5): dado corrompido degrada pra "sem tabela", nunca quebra a ficha.
 */
export function corpoEspecialidade(tipo: TipoRegistroOdontograma, detalhe: unknown): React.ReactNode {
  if (tipo === 'endodontia') {
    const r = endoDetalheSchema.safeParse(detalhe);
    return r.success ? <EndoCard valor={r.data} /> : null;
  }
  if (tipo === 'implante') {
    const r = implanteDetalheSchema.safeParse(detalhe);
    return r.success ? <ImplanteCard valor={r.data} /> : null;
  }
  if (tipo === 'exame_periodontal') {
    const r = psrDetalheSchema.safeParse(detalhe);
    return r.success ? <PsrCard valor={r.data} /> : null;
  }
  return null;
}
