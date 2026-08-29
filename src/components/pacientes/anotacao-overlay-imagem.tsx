'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePalcoImagemClinica } from '@/components/imagens/visualizador-imagem-clinica';
import { AnotacaoIcone } from './anotacao-simbolos';
import type { AnotacaoOverlay, FormaDesenho, TipoAnotacaoRadiografia } from '@/hooks/usePlanejamentoPaciente';

// R-99 (10/08, sessão de teste ao vivo) — componente único usado no editor E na
// apresentação ao vivo. Substitui a implementação anterior (percentual cru do
// container) porque ela quebrava em 2 casos reais: (1) a imagem precisa PREENCHER
// mais tela (object-contain com w-auto/h-auto nunca cresce além do tamanho natural
// do arquivo — só encolhe), e (2) marcador/forma precisam de coordenada exata mesmo
// quando a imagem letterboxa dentro do palco (barra preta em cima/embaixo ou nos
// lados). A solução: medir o "palco" (retângulo exato onde a imagem aparece, sem a
// barra preta) via ResizeObserver + naturalWidth/Height, e ancorar TUDO nele —
// ícones em %, formas em px reais dentro de um <svg> do tamanho exato do palco
// (nunca um viewBox 0..100 esticado, que distorceria círculo e espessura de traço).

export type FerramentaAnotacao =
  | { modo: 'icone'; tipo: TipoAnotacaoRadiografia }
  | { modo: 'forma'; tipo: FormaDesenho }
  | { modo: 'traco' };

export type ModoInteracaoImagem = 'navegar' | 'anotar';

const TAMANHO_BASE_PX = 36; // ícone em tamanho=1
const TAMANHO_MIN = 0.6;
const TAMANHO_MAX = 2.2;
const TAMANHO_PASSO = 0.2;

type Icone = Extract<AnotacaoOverlay, { forma: 'icone' }>;
type Forma = Extract<AnotacaoOverlay, { forma: 'linha' | 'circulo' | 'seta' }>;
type Traco = Extract<AnotacaoOverlay, { forma: 'traco' }>;

type DesenhoEmCurso =
  | { forma: FormaDesenho; x1: number; y1: number; x2: number; y2: number }
  | { forma: 'traco'; pontos: { x: number; y: number }[] };

// D15 (10/08) — mover e girar ícone são gestos de arrasto direto no marcador (não no
// palco), então pointer capture acontece no PRÓPRIO botão. Um ref só (não dois) porque
// só um gesto de ícone pode estar em curso por vez.
type GestoIcone =
  | { tipo: 'mover'; id: string; startClientX: number; startClientY: number; moveu: boolean }
  | { tipo: 'rotacionar'; id: string };

function toPx(pct: number, dim: number): number {
  return (pct / 100) * dim;
}

function pontoPercentual(e: { clientX: number; clientY: number }, el: Element): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return {
    x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
    y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
  };
}

function posicaoRepresentativa(a: AnotacaoOverlay): { x: number; y: number } {
  if (a.forma === 'icone') return { x: a.x, y: a.y };
  if (a.forma === 'traco') return a.pontos[0] ?? { x: 50, y: 50 };
  return { x: (a.x1 + a.x2) / 2, y: (a.y1 + a.y2) / 2 };
}

/** linha/seta/círculo, persistidos OU em pré-visualização (traço tracejado, sem clique). */
function FormaSvg({
  a, fittedRect, cor, interativo, selecionado, onSelect, preview,
}: {
  a: { forma: FormaDesenho; x1: number; y1: number; x2: number; y2: number };
  fittedRect: { width: number; height: number };
  cor: string;
  interativo: boolean;
  selecionado?: boolean;
  onSelect?: () => void;
  preview?: boolean;
}) {
  const x1 = toPx(a.x1, fittedRect.width), y1 = toPx(a.y1, fittedRect.height);
  const x2 = toPx(a.x2, fittedRect.width), y2 = toPx(a.y2, fittedRect.height);
  const common = {
    stroke: cor,
    strokeWidth: selecionado ? 3.6 : 2.6,
    strokeLinecap: 'round' as const,
    strokeDasharray: preview ? '5 4' : undefined,
    style: { pointerEvents: (interativo ? 'stroke' : 'none') as CSSProperties['pointerEvents'], cursor: interativo ? 'pointer' : 'default' },
    onClick: onSelect ? (e: ReactMouseEvent) => { e.stopPropagation(); onSelect(); } : undefined,
  };

  if (a.forma === 'circulo') {
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    const r = Math.hypot(x2 - x1, y2 - y1) / 2;
    return <circle cx={cx} cy={cy} r={r} fill="none" vectorEffect="non-scaling-stroke" {...common} />;
  }

  if (a.forma === 'seta') {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const tam = 11;
    const p1x = x2 - tam * Math.cos(ang - Math.PI / 7), p1y = y2 - tam * Math.sin(ang - Math.PI / 7);
    const p2x = x2 - tam * Math.cos(ang + Math.PI / 7), p2y = y2 - tam * Math.sin(ang + Math.PI / 7);
    return (
      <>
        <line x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect="non-scaling-stroke" {...common} />
        <line x1={x2} y1={y2} x2={p1x} y2={p1y} vectorEffect="non-scaling-stroke" {...common} />
        <line x1={x2} y1={y2} x2={p2x} y2={p2y} vectorEffect="non-scaling-stroke" {...common} />
      </>
    );
  }

  return <line x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect="non-scaling-stroke" {...common} />;
}

function TracoSvg({
  pontos, fittedRect, cor, interativo, selecionado, onSelect, preview,
}: {
  pontos: { x: number; y: number }[];
  fittedRect: { width: number; height: number };
  cor: string;
  interativo: boolean;
  selecionado?: boolean;
  onSelect?: () => void;
  preview?: boolean;
}) {
  const points = pontos.map((p) => `${toPx(p.x, fittedRect.width)},${toPx(p.y, fittedRect.height)}`).join(' ');
  return (
    <polyline
      points={points}
      fill="none"
      stroke={cor}
      strokeWidth={selecionado ? 4 : 2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      strokeDasharray={preview ? '5 4' : undefined}
      style={{ pointerEvents: interativo ? 'stroke' : 'none', cursor: interativo ? 'pointer' : 'default' }}
      onClick={onSelect ? (e) => { e.stopPropagation(); onSelect(); } : undefined}
    />
  );
}

export function CamadaAnotacaoImagem({
  // D17 (10/08) — ciano fixo, não mais o token coral: escolhido numa comparação de 5
  // cores num fundo simulando panorâmica, coral lia mal contra o cinza do raio-x (D5
  // mantém — 1 cor só pros 5 símbolos, só mudou qual).
  anotacoes, onChange, ferramenta, interativo, cor = '#22d3ee', onFerramentaUsada,
}: {
  anotacoes: AnotacaoOverlay[];
  onChange: (anotacoes: AnotacaoOverlay[]) => void;
  ferramenta: FerramentaAnotacao | null;
  /** false = puro display (apresentação com a marcação fechada) — sem clique, sem seleção. */
  interativo: boolean;
  cor?: string;
  /** D18 (10/08) — chamado depois de UM ícone/forma criado, pro pai desarmar a ferramenta.
   *  Sem isso ela ficava armada pro próximo clique indefinidamente (sticky). */
  onFerramentaUsada?: () => void;
}) {
  const palcoRef = useRef<HTMLDivElement>(null);
  const contextoPalco = usePalcoImagemClinica();
  const [tamanhoPalco, setTamanhoPalco] = useState<{ width: number; height: number } | null>(null);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [desenhoEmCurso, setDesenhoEmCurso] = useState<DesenhoEmCurso | null>(null);
  // D15 — posição/rotação LIVE durante o arrasto (o ícone segue o dedo); só vira
  // onChange (persiste) no pointerUp. Ref guarda o gesto em curso sem re-renderizar.
  const [arrastoIcone, setArrastoIcone] = useState<{ id: string; x: number; y: number } | null>(null);
  const [rotacaoIcone, setRotacaoIcone] = useState<{ id: string; graus: number } | null>(null);
  const gestoRef = useRef<GestoIcone | null>(null);

  useEffect(() => {
    const el = palcoRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setTamanhoPalco({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A camada é montada DENTRO do retângulo contido do VisualizadorImagemClinica. Assim,
  // seu 0,0 nunca inclui as barras de letterbox e acompanha o mesmo transform da imagem.
  const fittedRect = tamanhoPalco && tamanhoPalco.width > 0 && tamanhoPalco.height > 0
    ? { width: tamanhoPalco.width, height: tamanhoPalco.height }
    : null;

  function pontoDoEvento(e: { clientX: number; clientY: number }, el: Element): { x: number; y: number } {
    if (contextoPalco) return contextoPalco.pontoClienteParaPercentual(e.clientX, e.clientY);
    return pontoPercentual(e, el);
  }

  const icones = anotacoes.filter((a): a is Icone => a.forma === 'icone');
  const formas = anotacoes.filter((a): a is Forma => a.forma === 'linha' || a.forma === 'circulo' || a.forma === 'seta');
  const tracos = anotacoes.filter((a): a is Traco => a.forma === 'traco');
  const selecionado = anotacoes.find((a) => a.id === selecionadoId) ?? null;

  function ajustarTamanho(delta: number): void {
    if (!selecionadoId) return;
    onChange(anotacoes.map((a) => (a.id === selecionadoId && a.forma === 'icone'
      ? { ...a, tamanho: Math.min(TAMANHO_MAX, Math.max(TAMANHO_MIN, Number((a.tamanho + delta).toFixed(2)))) }
      : a)));
  }

  function remover(): void {
    if (!selecionadoId) return;
    onChange(anotacoes.filter((a) => a.id !== selecionadoId));
    setSelecionadoId(null);
  }

  function handleClickPalco(e: ReactMouseEvent<HTMLDivElement>): void {
    if (!interativo) return;
    if (!ferramenta || ferramenta.modo !== 'icone') { setSelecionadoId(null); return; }
    const p = pontoDoEvento(e, e.currentTarget);
    const novo: Icone = { id: crypto.randomUUID(), forma: 'icone', tipo: ferramenta.tipo, x: p.x, y: p.y, tamanho: 1, rotacao: 0 };
    onChange([...anotacoes, novo]);
    // D18 — desarma sozinha depois de UM uso e já seleciona o que acabou de nascer (mostra
    // a toolbar de ajuste na hora, sem precisar de um 2º clique pra selecionar).
    setSelecionadoId(novo.id);
    onFerramentaUsada?.();
  }

  // ── D15 — mover (arrasta o corpo do ícone) e girar (arrasta a alcinha) ──
  // Os dois usam o MESMO par de handlers de move/up: pointer capture garante que só o
  // elemento que iniciou o gesto os recebe, e `gestoRef.tipo` decide o que fazer.

  function handleIconePointerDown(e: ReactPointerEvent<HTMLButtonElement>, id: string): void {
    if (!interativo) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    gestoRef.current = { tipo: 'mover', id, startClientX: e.clientX, startClientY: e.clientY, moveu: false };
  }

  function handleRotacaoPointerDown(e: ReactPointerEvent<HTMLButtonElement>, id: string, rotacaoAtual: number): void {
    if (!interativo) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    gestoRef.current = { tipo: 'rotacionar', id };
    setRotacaoIcone({ id, graus: rotacaoAtual });
  }

  function handleIconeGestoMove(e: ReactPointerEvent<HTMLButtonElement>): void {
    const g = gestoRef.current;
    if (!g || !palcoRef.current) return;
    if (g.tipo === 'mover') {
      const dx = e.clientX - g.startClientX, dy = e.clientY - g.startClientY;
      if (!g.moveu && Math.hypot(dx, dy) > 4) g.moveu = true; // limiar — abaixo disso é clique, não arrasto
      if (!g.moveu) return;
      setArrastoIcone({ id: g.id, ...pontoDoEvento(e, palcoRef.current) });
      return;
    }
    if (!fittedRect) return;
    const icone = icones.find((i) => i.id === g.id);
    if (!icone) return;
    const centroPx = { x: toPx(icone.x, fittedRect.width), y: toPx(icone.y, fittedRect.height) };
    const pontoPercentualNaImagem = pontoDoEvento(e, palcoRef.current);
    const ponteiroPx = {
      x: toPx(pontoPercentualNaImagem.x, fittedRect.width),
      y: toPx(pontoPercentualNaImagem.y, fittedRect.height),
    };
    // atan2 + 90°: ponteiro reto ACIMA do centro = 0° (ícone na orientação natural, sem giro).
    const graus = Math.atan2(ponteiroPx.y - centroPx.y, ponteiroPx.x - centroPx.x) * (180 / Math.PI) + 90;
    setRotacaoIcone({ id: g.id, graus: Math.round(graus) });
  }

  function handleIconeGestoUp(): void {
    const g = gestoRef.current;
    gestoRef.current = null;
    if (!g) return;
    if (g.tipo === 'mover') {
      if (g.moveu && arrastoIcone) {
        onChange(anotacoes.map((a) => (a.id === g.id && a.forma === 'icone' ? { ...a, x: arrastoIcone.x, y: arrastoIcone.y } : a)));
      } else {
        // Não arrastou — foi clique: seleciona (toggle), mesma UX de antes (D12).
        setSelecionadoId((prev) => (prev === g.id ? null : g.id));
      }
      setArrastoIcone(null);
      return;
    }
    if (rotacaoIcone) {
      const normalizado = ((rotacaoIcone.graus % 360) + 360) % 360;
      onChange(anotacoes.map((a) => (a.id === g.id && a.forma === 'icone' ? { ...a, rotacao: normalizado } : a)));
    }
    setRotacaoIcone(null);
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    if (!interativo || !ferramenta || ferramenta.modo === 'icone') return;
    if (!e.isPrimary) {
      setDesenhoEmCurso(null);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pontoDoEvento(e, e.currentTarget);
    setDesenhoEmCurso(ferramenta.modo === 'traco' ? { forma: 'traco', pontos: [p] } : { forma: ferramenta.tipo, x1: p.x, y1: p.y, x2: p.x, y2: p.y });
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>): void {
    if (!desenhoEmCurso) return;
    const p = pontoDoEvento(e, e.currentTarget);
    setDesenhoEmCurso((prev) => {
      if (!prev) return prev;
      if (prev.forma === 'traco') {
        const last = prev.pontos[prev.pontos.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) < 1.2) return prev; // amostragem — evita array gigante
        return { ...prev, pontos: [...prev.pontos, p] };
      }
      return { ...prev, x2: p.x, y2: p.y };
    });
  }

  function handlePointerUp(): void {
    if (!desenhoEmCurso) return;
    const valido = desenhoEmCurso.forma === 'traco'
      ? desenhoEmCurso.pontos.length >= 2
      : Math.hypot(desenhoEmCurso.x2 - desenhoEmCurso.x1, desenhoEmCurso.y2 - desenhoEmCurso.y1) > 1.5;
    if (valido) {
      const id = crypto.randomUUID();
      onChange([...anotacoes, { id, ...desenhoEmCurso }]);
      setSelecionadoId(id); // D18 — mesma lógica do ícone acima.
      onFerramentaUsada?.();
    }
    setDesenhoEmCurso(null);
  }

  const posSelecionado = selecionado ? posicaoRepresentativa(selecionado) : null;
  // D19 (10/08, print dele) — a alça de girar fica a (tamanhoPx/2 + 18) do centro do ícone,
  // mais o próprio raio dela (9). Gap fixo de 14px só limpava a alça em ícone bem grande —
  // "pra eu girar eu tenho que aumentar bastante". Agora acompanha o tamanho do ícone
  // selecionado, sempre deixando a alça livre pro clique.
  const gapToolbar = selecionado?.forma === 'icone'
    ? (TAMANHO_BASE_PX * selecionado.tamanho) / 2 + 35
    : 14;

  return (
    <div
      ref={palcoRef}
      className={cn(
        'absolute inset-0',
        interativo ? (ferramenta ? 'cursor-crosshair' : 'cursor-default') : 'pointer-events-none',
      )}
      onClick={handleClickPalco}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {fittedRect && (
        <>
          <svg width={fittedRect.width} height={fittedRect.height} viewBox={`0 0 ${fittedRect.width} ${fittedRect.height}`} className="absolute inset-0" style={{ pointerEvents: 'none' }}>
            {formas.map((a) => (
              <FormaSvg key={a.id} a={a} fittedRect={fittedRect} cor={cor} interativo={interativo} selecionado={a.id === selecionadoId} onSelect={() => setSelecionadoId(a.id)} />
            ))}
            {tracos.map((a) => (
              <TracoSvg key={a.id} pontos={a.pontos} fittedRect={fittedRect} cor={cor} interativo={interativo} selecionado={a.id === selecionadoId} onSelect={() => setSelecionadoId(a.id)} />
            ))}
            {desenhoEmCurso && desenhoEmCurso.forma === 'traco' && (
              <TracoSvg pontos={desenhoEmCurso.pontos} fittedRect={fittedRect} cor={cor} interativo={false} preview />
            )}
            {desenhoEmCurso && desenhoEmCurso.forma !== 'traco' && (
              <FormaSvg a={desenhoEmCurso} fittedRect={fittedRect} cor={cor} interativo={false} preview />
            )}
          </svg>

          {icones.map((a) => {
            // D15 — durante o arrasto, a posição/rotação vem do estado live (segue o
            // ponteiro); fora do arrasto, vem do dado persistido.
            const emArrasto = arrastoIcone?.id === a.id;
            const emRotacao = rotacaoIcone?.id === a.id;
            const posX = emArrasto ? arrastoIcone.x : a.x;
            const posY = emArrasto ? arrastoIcone.y : a.y;
            const rot = emRotacao ? rotacaoIcone.graus : a.rotacao;
            const tamanhoPx = TAMANHO_BASE_PX * a.tamanho;
            return (
              <div
                key={a.id}
                className="absolute"
                style={{ left: `${posX}%`, top: `${posY}%`, width: tamanhoPx, height: tamanhoPx, transform: `translate(-50%, -50%) rotate(${rot}deg)` }}
              >
                <button
                  type="button"
                  onPointerDown={(e) => handleIconePointerDown(e, a.id)}
                  onPointerMove={handleIconeGestoMove}
                  onPointerUp={handleIconeGestoUp}
                  // Achado 10/08 (print dele): pointerdown/up não bastam. Depois de um
                  // clique sem arrastar, o navegador AINDA dispara um `click` nativo, que
                  // não passava por nenhum stopPropagation e furava até o palco atrás —
                  // com uma ferramenta armada, isso criava um ícone fantasma a cada
                  // clique num ícone já existente (o cacho de implantes empilhados).
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0"
                  style={{ color: cor, cursor: !interativo ? 'default' : emArrasto ? 'grabbing' : 'grab', touchAction: 'none' }}
                >
                  <AnotacaoIcone tipo={a.tipo} className="h-full w-full drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" />
                </button>
                {interativo && a.id === selecionadoId && (
                  <button
                    type="button"
                    title="Arraste pra girar"
                    onPointerDown={(e) => handleRotacaoPointerDown(e, a.id, a.rotacao)}
                    onPointerMove={handleIconeGestoMove}
                    onPointerUp={handleIconeGestoUp}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute rounded-full"
                    style={{
                      left: '50%', top: -18, width: 18, height: 18,
                      transform: 'translate(-50%, -50%)',
                      background: cor, border: '2px solid rgba(20,24,23,0.9)', cursor: 'grab', touchAction: 'none',
                    }}
                  />
                )}
              </div>
            );
          })}

          {interativo && selecionado && posSelecionado && (
            <div
              className="absolute flex items-center gap-1 rounded-xl px-1.5 py-1"
              style={{
                left: `${posSelecionado.x}%`, top: `${posSelecionado.y}%`,
                transform: `translate(-50%, calc(-100% - ${gapToolbar}px))`,
                background: 'rgba(20,24,23,0.92)', border: '1px solid rgba(255,255,255,0.14)',
              }}
              // Bug achado 10/08: sem isso, o clique/pointerdown nos botões borbulha pro
              // palco atrás (handleClickPalco cria ícone fantasma se uma ferramenta tá
              // armada; handlePointerDown arma um desenho se for forma/traço) — a toolbar
              // inteira precisa segurar os dois eventos num lugar só.
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {selecionado.forma === 'icone' && (
                <>
                  <button type="button" onClick={() => ajustarTamanho(-TAMANHO_PASSO)} className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                    <Minus className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => ajustarTamanho(TAMANHO_PASSO)} className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                    <Plus className="h-4 w-4" />
                  </button>
                  <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.16)' }} />
                </>
              )}
              <button type="button" onClick={remover} className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-coral">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
