'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useEmCena } from '@/hooks/use-em-cena';
import { DexAvatar } from '@/components/ui/dex-avatar';

// Rail do Meu dia — portado de meu-dia/_components/rail.tsx
interface Slot {
  hora: string;
  pac: string;
  st: 'st-ok' | 'st-vivo' | 'st-conf' | 'st-esp';
  stRot: string;
  sel?: boolean;
  reg?: string;
  semReg?: string;
}

const SLOTS: Slot[] = [
  { hora: '08:30', pac: 'Ana Beatriz', st: 'st-ok', stRot: 'Concluído', reg: '✓ registrado' },
  { hora: '09:15', pac: 'Maria S.', st: 'st-vivo', stRot: 'Atendendo', sel: true },
  { hora: '10:00', pac: 'Carlos M.', st: 'st-conf', stRot: 'Confirmado' },
  { hora: '10:45', pac: 'Júlia R.', st: 'st-esp', stRot: 'Aguardando' },
  { hora: '11:30', pac: 'Roberto L.', st: 'st-ok', stRot: 'Concluído', semReg: '⚠ sem registro' },
];

const RELATO =
  'Paciente relatou dor no dente 16, fiz restauração oclusal com resina composta. O 46 a gente fecha na próxima sessão.';
const CHIPS = ['Restauração · 16 oclusal', 'Pendência · 46'];

const MS_POR_LETRA = 22;
const MS_ATE_CHIPS = 340;
const MS_ENTRE_CHIPS = 380;

/**
 * Passo 1 — o relato sendo ditado, e os chips aparecendo depois.
 * A encenação só roda quando o passo entra em cena, e uma vez só.
 */
export function PassoFale() {
  const raiz = useRef<HTMLDivElement>(null);
  const [, visivel] = useEmCena<HTMLDivElement>({ threshold: 0.05, rootMargin: '0px 0px -12% 0px' }, raiz);
  const [, emCena] = useEmCena<HTMLDivElement>({ threshold: 0.35, redeMs: 6000 }, raiz);

  const [digitado, setDigitado] = useState('');
  const [chipsDentro, setChipsDentro] = useState(0);

  useEffect(() => {
    if (!emCena) return;

    const relogios: number[] = [];
    const soltarChips = () => {
      CHIPS.forEach((_, i) => {
        relogios.push(window.setTimeout(() => setChipsDentro((n) => Math.max(n, i + 1)), i * MS_ENTRE_CHIPS));
      });
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDigitado(RELATO);
      setChipsDentro(CHIPS.length);
      return;
    }

    let i = 0;
    const passo = () => {
      setDigitado(RELATO.slice(0, i));
      if (i++ < RELATO.length) relogios.push(window.setTimeout(passo, MS_POR_LETRA));
      else relogios.push(window.setTimeout(soltarChips, MS_ATE_CHIPS));
    };
    passo();

    return () => relogios.forEach(window.clearTimeout);
  }, [emCena]);

  return (
    <div ref={raiz} id="passo1" className={cn('passo largo revelar', visivel && 'visivel')}>
      <div className="texto">
        <div className="ord">Primeiro</div>
        <h3>Fale enquanto atende</h3>
        <p>Sem formulário, sem digitar, sem tirar o olho do paciente.</p>
      </div>
      <div>
        <div className="rail">
          {SLOTS.map((s) => (
            <div key={s.hora} className={cn('slot', s.sel && 'sel', s.semReg && 'alerta')}>
              <span className="hora">{s.hora}</span>
              <p className="pac">{s.pac}</p>
              <span className={cn('st', s.st)}>{s.stRot}</span>
              {s.reg && <p className="reg">{s.reg}</p>}
              {s.semReg && <p className="semreg">{s.semReg}</p>}
            </div>
          ))}
          <button type="button" className="encaixe" aria-label="Encaixar paciente" tabIndex={-1}>
            +
          </button>
        </div>

        <div className="magico">
          <div className="magico-topo">
            {/* O MESMO Dex da tela real: captura-livre-card.tsx usa <DexAvatar>.
                A cena é de captura em andamento, então ele anima, como no produto. */}
            <DexAvatar size={30} />
            <span className="magico-rot">Campo mágico</span>
            <span className="magico-dica">Fale, cole ou anexe — o Dex monta a ficha</span>
          </div>
          <div className="magico-chips">
            {CHIPS.map((c, i) => (
              <span key={c} className={cn('chip-ia', i < chipsDentro && 'dentro')}>
                {c}
              </span>
            ))}
          </div>
          <p className="magico-texto">
            <span>{digitado}</span>
            <span className="cursor" />
          </p>
          <div className="magico-barra">
            <div className="magico-esq">
              <button type="button" className="mini gravar" tabIndex={-1}>
                <span className="bolinha" />
                Parar
              </button>
              <button type="button" className="mini" tabIndex={-1}>
                Anexar
              </button>
            </div>
            <button type="button" className="organizar" tabIndex={-1}>
              Organizar com Dex
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
