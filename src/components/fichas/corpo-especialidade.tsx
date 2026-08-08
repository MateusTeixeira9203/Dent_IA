'use client';

// R-58 — extraído de FichasTab.tsx (`corpoEspecialidade`, Roadmap A) pra ser reusado pelo
// histórico do Meu dia. Behavior-preserving: mesma lógica, mesmo comportamento — só muda de
// casa. Fica em components/ (não lib/) porque retorna JSX — mesma fronteira que o resto da
// casa já respeita.

import { endoDetalheSchema, type EndoDetalhe } from '@/lib/especialidades/endo';
import { EndoCard } from '@/components/fichas/endo-card';
import { EndoForm } from '@/components/fichas/endo-form';
import { implanteDetalheSchema, type ImplanteDetalhe } from '@/lib/especialidades/implante';
import { ImplanteCard } from '@/components/fichas/implante-card';
import { ImplanteForm } from '@/components/fichas/implante-form';
import { psrDetalheSchema, PSR_VAZIO, type PsrDetalhe } from '@/lib/especialidades/perio';
import { PsrCard } from '@/components/fichas/psr-card';
import { PsrForm } from '@/components/fichas/psr-form';
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

/**
 * R-02 Fase 1 (extraído de FichasTab.tsx pro R-78 F1 reusar) — corpo de especialidade
 * EDITÁVEL (rascunho): mesmo tipo que `corpoEspecialidade`, mas com EndoForm/ImplanteForm/
 * PsrForm em vez dos cards só-leitura. Cast direto (`?? null`/`?? PSR_VAZIO`), não
 * safeParse: um form em branco é um estado válido de edição — I3 (degradar em silêncio)
 * não se aplica aqui, o card só aparece quando o chamador já sabe que há tabela pra este tipo.
 */
export function corpoEspecialidadeEditavel(
  tipo: TipoRegistroOdontograma, detalhe: unknown, onChange: (v: unknown) => void,
): React.ReactNode {
  if (tipo === 'endodontia') {
    return <EndoForm valor={(detalhe ?? null) as EndoDetalhe | null} onChange={onChange} />;
  }
  if (tipo === 'implante') {
    return <ImplanteForm valor={(detalhe ?? null) as ImplanteDetalhe | null} onChange={onChange} />;
  }
  if (tipo === 'exame_periodontal') {
    return <PsrForm valor={(detalhe ?? PSR_VAZIO) as PsrDetalhe} onChange={onChange} />;
  }
  return null;
}
