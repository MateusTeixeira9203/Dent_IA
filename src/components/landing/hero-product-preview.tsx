import { Bot, Mic, Paperclip } from 'lucide-react';

import { DexAvatar } from '@/components/ui/dex-avatar';

/**
 * Recorte estático do fluxo real: Campo Mágico como entrada, seguido pela revisão.
 * É uma demonstração visual — não coleta nem envia nenhum dado da landing.
 */
export function HeroProductPreview(): React.JSX.Element {
  return (
    <aside className="hero-product" aria-label="Demonstração da ficha clínica estruturada">
      <div className="hero-product__window" aria-hidden="true">
        <span />
        <span />
        <span />
        <p>ODONTO.IA · FICHA DA CONSULTA</p>
      </div>

      <div className="hero-product__magic">
        <div className="hero-product__magic-head">
          <DexAvatar size={22} />
          <strong>Campo mágico</strong>
          <span>Fale, cole ou anexe — o Dex monta a ficha</span>
        </div>
        <div className="hero-product__chips">
          <span className="hero-product__chip-local">⚡ Restauração · dente 16</span>
          <span>Próxima sessão · dente 46</span>
        </div>
        <p className="hero-product__text">
          Paciente relatou dor no dente 16. Fiz restauração com resina composta. O 46 fica para a próxima sessão.
        </p>
        <div className="hero-product__magic-actions" aria-hidden="true">
          <div>
            <span className="hero-product__voice"><Mic /> Gravar voz</span>
            <span><Paperclip /> Anexar</span>
          </div>
          <span className="hero-product__organize"><Bot /> Organizar com Dex <kbd>Ctrl ↵</kbd></span>
        </div>
      </div>

      <div className="hero-product__review-head">
        <span>Ficha estruturada</span>
        <small>resultado do relato</small>
      </div>
      <div className="hero-product__results">
        <div className="hero-product__result">
          <div>
            <b>Restauração · dente 16</b>
            <small>Resina composta · realizado hoje</small>
          </div>
          <em className="hero-product__status hero-product__status--done">Realizado</em>
        </div>
        <div className="hero-product__result">
          <div>
            <b>Restauração · dente 46</b>
            <small>Material, técnica e intercorrência podem ser revisados</small>
          </div>
          <em className="hero-product__status hero-product__status--next">Próxima sessão</em>
        </div>
      </div>
      <footer>Você revisa antes de salvar. A decisão clínica é sempre sua.</footer>
    </aside>
  );
}
