"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  Contrast,
  LoaderCircle,
  RotateCw,
  RotateCcw,
  SlidersHorizontal,
  SunMedium,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  aplicarZoomNoPonto,
  calcularLimitesPan,
  calcularRetanguloImagemTransformada,
  ESTADO_VISUALIZACAO_PADRAO,
  limitarAjuste,
  limitarPan,
  pontoImagemParaPercentual,
  pontoViewportParaImagem,
  proximaRotacao,
  proximoZoomDiscreto,
  type EstadoVisualizacaoImagem,
  type PontoImagem,
  type RetanguloImagem,
  type TamanhoImagem,
} from "@/lib/imagens/visualizacao-imagem";

export interface VisualizadorImagemClinicaProps {
  src: string;
  alt: string;
  contexto: "arquivos" | "editor_apresentacao" | "apresentacao";
  overlay?: ReactNode;
  onRetry?: () => Promise<void> | void;
  onEstadoChange?: (estado: EstadoVisualizacaoImagem) => void;
  className?: string;
}

export interface ContextoPalcoImagemClinica {
  estado: EstadoVisualizacaoImagem;
  retangulo: RetanguloImagem;
  pontoClienteParaPercentual: (clientX: number, clientY: number) => PontoImagem;
}

const PalcoImagemClinicaContext = createContext<ContextoPalcoImagemClinica | null>(null);

/**
 * Camadas como as anotações da Apresentação usam este contexto para converter cliques
 * após zoom, pan e rotação, sem duplicar a matemática do viewport.
 */
export function usePalcoImagemClinica(): ContextoPalcoImagemClinica | null {
  return useContext(PalcoImagemClinicaContext);
}

type EstadoCarregamento = "carregando" | "pronto" | "erro";

type GestoPan = {
  pointerId: number;
  inicioX: number;
  inicioY: number;
  panX: number;
  panY: number;
};

type GestoPinch = {
  distancia: number;
  centro: PontoImagem;
  estado: EstadoVisualizacaoImagem;
};

type PontoPonteiro = PontoImagem & { tipo: string };

function distanciaEntre(a: PontoImagem, b: PontoImagem): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function centroEntre(a: PontoImagem, b: PontoImagem): PontoImagem {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function formatarZoom(zoom: number): string {
  return `${Number(zoom.toFixed(2))}×`;
}

function BotaoViewport({
  children,
  label,
  ativo = false,
  pressed,
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  label: string;
  ativo?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
        "border-clinical-stage-border bg-clinical-stage-raised text-clinical-stage-foreground",
        "hover:border-teal/70 hover:text-teal-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/70",
        "disabled:cursor-not-allowed disabled:opacity-40",
        ativo && "border-teal/70 bg-teal/20 text-teal-lt",
      )}
    >
      {children}
    </button>
  );
}

function CampoAjuste({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <label htmlFor={id} className="grid gap-2 text-xs font-medium text-clinical-stage-muted">
      <span className="flex items-center justify-between gap-3">
        {label}
        <output className="tabular-nums text-clinical-stage-foreground">{value}%</output>
      </span>
      <input
        id={id}
        type="range"
        min="50"
        max="200"
        step="1"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-teal disabled:cursor-not-allowed"
      />
    </label>
  );
}

export function VisualizadorImagemClinica({
  src,
  alt,
  contexto,
  overlay,
  onRetry,
  onEstadoChange,
  className,
}: VisualizadorImagemClinicaProps): React.JSX.Element {
  const viewportRef = useRef<HTMLDivElement>(null);
  const imagemRef = useRef<HTMLImageElement>(null);
  const estadoRef = useRef<EstadoVisualizacaoImagem>(ESTADO_VISUALIZACAO_PADRAO);
  const gestoPanRef = useRef<GestoPan | null>(null);
  const gestoPinchRef = useRef<GestoPinch | null>(null);
  const ponteirosRef = useRef<Map<number, PontoPonteiro>>(new Map());
  const [estado, setEstado] = useState<EstadoVisualizacaoImagem>(ESTADO_VISUALIZACAO_PADRAO);
  const [tamanhoViewport, setTamanhoViewport] = useState<TamanhoImagem>({ largura: 0, altura: 0 });
  const [origemViewport, setOrigemViewport] = useState<PontoImagem>({ x: 0, y: 0 });
  const [tamanhoNatural, setTamanhoNatural] = useState<TamanhoImagem | null>(null);
  const [carregamento, setCarregamento] = useState<EstadoCarregamento>("carregando");
  const [srcCarregada, setSrcCarregada] = useState(src);
  const [ajustesAbertos, setAjustesAbertos] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const identificadorAjustes = useId();

  const retangulo = useMemo(
    () => calcularRetanguloImagemTransformada(tamanhoViewport, tamanhoNatural, estado.rotacao),
    [estado.rotacao, tamanhoNatural, tamanhoViewport],
  );
  const limitesPan = useMemo(
    () => calcularLimitesPan(tamanhoViewport, retangulo, estado),
    [estado, retangulo, tamanhoViewport],
  );
  const podeArrastar = limitesPan.x > 0 || limitesPan.y > 0;
  const estadoCarregamentoAtual: EstadoCarregamento = srcCarregada === src ? carregamento : "carregando";

  function atualizarEstado(
    proximo: EstadoVisualizacaoImagem | ((atual: EstadoVisualizacaoImagem) => EstadoVisualizacaoImagem),
  ): void {
    setEstado((atual) => {
      const resolvido = typeof proximo === "function" ? proximo(atual) : proximo;
      estadoRef.current = resolvido;
      return resolvido;
    });
  }

  function cancelarGestos(): void {
    gestoPanRef.current = null;
    gestoPinchRef.current = null;
    ponteirosRef.current.clear();
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setTamanhoViewport({ largura: entry.contentRect.width, altura: entry.contentRect.height });
      const bounds = viewport.getBoundingClientRect();
      setOrigemViewport({ x: bounds.left, y: bounds.top });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    onEstadoChange?.(estado);
  }, [estado, onEstadoChange]);

  function pontoNoViewport(clientX: number, clientY: number): PontoImagem {
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return { x: 0, y: 0 };
    return { x: clientX - viewport.left, y: clientY - viewport.top };
  }

  function aplicarZoom(novoZoom: number, ponto: PontoImagem): void {
    atualizarEstado((atual) => aplicarZoomNoPonto(atual, novoZoom, ponto, tamanhoViewport, retangulo));
  }

  function centroViewport(): PontoImagem {
    return { x: tamanhoViewport.largura / 2, y: tamanhoViewport.altura / 2 };
  }

  function alternarRotacao(): void {
    atualizarEstado((atual) => {
      const rotacao = proximaRotacao(atual.rotacao);
      const retanguloRotacionado = calcularRetanguloImagemTransformada(tamanhoViewport, tamanhoNatural, rotacao);
      return limitarPan({ ...atual, rotacao }, tamanhoViewport, retanguloRotacionado);
    });
  }

  function restaurar(): void {
    cancelarGestos();
    atualizarEstado(ESTADO_VISUALIZACAO_PADRAO);
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>): void {
    if (estadoCarregamentoAtual !== "pronto" || !retangulo) return;
    event.preventDefault();
    const fator = Math.exp(-event.deltaY * 0.0015);
    aplicarZoom(estadoRef.current.zoom * fator, pontoNoViewport(event.clientX, event.clientY));
  }

  function iniciarPinch(): void {
    const pontos = [...ponteirosRef.current.values()];
    if (pontos.length !== 2) return;
    gestoPanRef.current = null;
    gestoPinchRef.current = {
      distancia: distanciaEntre(pontos[0], pontos[1]),
      centro: centroEntre(pontos[0], pontos[1]),
      estado: estadoRef.current,
    };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (estadoCarregamentoAtual !== "pronto") return;
    const ponto = pontoNoViewport(event.clientX, event.clientY);
    ponteirosRef.current.set(event.pointerId, { ...ponto, tipo: event.pointerType });

    if (ponteirosRef.current.size === 2) {
      event.currentTarget.setPointerCapture(event.pointerId);
      iniciarPinch();
      return;
    }

    const alvo = event.target;
    const iniciouNaImagem = alvo === imagemRef.current || alvo === event.currentTarget;
    if (!iniciouNaImagem || !podeArrastar) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    gestoPanRef.current = {
      pointerId: event.pointerId,
      inicioX: event.clientX,
      inicioY: event.clientY,
      panX: estadoRef.current.panX,
      panY: estadoRef.current.panY,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const ponto = pontoNoViewport(event.clientX, event.clientY);
    if (ponteirosRef.current.has(event.pointerId)) {
      ponteirosRef.current.set(event.pointerId, { ...ponto, tipo: event.pointerType });
    }

    const gestoPinch = gestoPinchRef.current;
    if (gestoPinch && ponteirosRef.current.size >= 2) {
      const pontos = [...ponteirosRef.current.values()];
      const distancia = distanciaEntre(pontos[0], pontos[1]);
      if (gestoPinch.distancia > 0) {
        atualizarEstado(aplicarZoomNoPonto(
          gestoPinch.estado,
          gestoPinch.estado.zoom * (distancia / gestoPinch.distancia),
          gestoPinch.centro,
          tamanhoViewport,
          retangulo,
        ));
      }
      return;
    }

    const gestoPan = gestoPanRef.current;
    if (!gestoPan || gestoPan.pointerId !== event.pointerId) return;
    atualizarEstado(limitarPan({
      ...estadoRef.current,
      panX: gestoPan.panX + event.clientX - gestoPan.inicioX,
      panY: gestoPan.panY + event.clientY - gestoPan.inicioY,
    }, tamanhoViewport, retangulo));
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>): void {
    ponteirosRef.current.delete(event.pointerId);
    if (gestoPanRef.current?.pointerId === event.pointerId) gestoPanRef.current = null;
    if (ponteirosRef.current.size < 2) gestoPinchRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (estadoCarregamentoAtual !== "pronto" || event.target instanceof HTMLInputElement) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      aplicarZoom(proximoZoomDiscreto(estadoRef.current.zoom, 1), centroViewport());
    } else if (event.key === "-") {
      event.preventDefault();
      aplicarZoom(proximoZoomDiscreto(estadoRef.current.zoom, -1), centroViewport());
    } else if (event.key === "0") {
      event.preventDefault();
      restaurar();
    } else if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      alternarRotacao();
    }
  }

  async function tentarNovamente(): Promise<void> {
    cancelarGestos();
    setCarregamento("carregando");
    setTamanhoNatural(null);
    try {
      await onRetry?.();
      setTentativa((atual) => atual + 1);
    } catch {
      setCarregamento("erro");
    }
  }

  const contextoPalco = useMemo<ContextoPalcoImagemClinica | null>(() => {
    if (!retangulo) return null;
    return {
      estado,
      retangulo,
      pontoClienteParaPercentual: (clientX, clientY) => pontoImagemParaPercentual(
        pontoViewportParaImagem({ x: clientX - origemViewport.x, y: clientY - origemViewport.y }, retangulo, estado),
        retangulo,
      ),
    };
  }, [estado, origemViewport, retangulo]);

  const controlesDesabilitados = estadoCarregamentoAtual !== "pronto";

  return (
    <div
      className={cn("flex h-full min-h-0 w-full flex-col gap-3 sm:flex-row", className)}
      data-contexto-visualizador={contexto}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={viewportRef}
        tabIndex={0}
        className={cn(
          "relative min-h-[280px] min-w-0 flex-1 touch-none overflow-hidden rounded-2xl border border-clinical-stage-border bg-clinical-stage outline-none",
          "focus-visible:ring-2 focus-visible:ring-teal/70",
          podeArrastar && estadoCarregamentoAtual === "pronto" && "cursor-grab active:cursor-grabbing",
        )}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div
          className="absolute will-change-transform"
          style={retangulo ? {
            left: retangulo.esquerda,
            top: retangulo.topo,
            width: retangulo.largura,
            height: retangulo.altura,
            transform: `translate3d(${estado.panX}px, ${estado.panY}px, 0) rotate(${estado.rotacao}deg) scale(${estado.zoom})`,
            transformOrigin: "center center",
          } : { left: 0, top: 0, width: 1, height: 1, visibility: "hidden" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- o retângulo real vem das dimensões naturais para alinhar a camada clínica */}
          <img
            key={`${src}-${tentativa}`}
            ref={imagemRef}
            src={src}
            alt={alt}
            draggable={false}
            referrerPolicy="no-referrer"
            className="block h-full w-full select-none"
            style={{
              filter: `brightness(${estado.brilho}%) contrast(${estado.contraste}%) invert(${estado.invertida ? 1 : 0})`,
            }}
            onLoad={(event) => {
              cancelarGestos();
              estadoRef.current = ESTADO_VISUALIZACAO_PADRAO;
              setEstado(ESTADO_VISUALIZACAO_PADRAO);
              setTamanhoNatural({ largura: event.currentTarget.naturalWidth, altura: event.currentTarget.naturalHeight });
              setAjustesAbertos(false);
              setSrcCarregada(src);
              setCarregamento("pronto");
            }}
            onError={() => { setSrcCarregada(src); setCarregamento("erro"); }}
          />
          {contextoPalco && overlay && (
            <PalcoImagemClinicaContext.Provider value={contextoPalco}>
              <div className="absolute inset-0">{overlay}</div>
            </PalcoImagemClinicaContext.Provider>
          )}
        </div>

        {estadoCarregamentoAtual === "carregando" && (
          <div className="absolute inset-0 grid place-items-center bg-clinical-stage">
            <div className="grid place-items-center gap-3 text-center text-sm text-clinical-stage-muted">
              <LoaderCircle className="size-6 animate-spin text-teal-lt" aria-hidden="true" />
              <span>Carregando imagem clínica…</span>
            </div>
          </div>
        )}

        {estadoCarregamentoAtual === "erro" && (
          <div className="absolute inset-0 grid place-items-center bg-clinical-stage p-6 text-center">
            <div className="grid max-w-sm gap-3 text-sm text-clinical-stage-muted">
              <p className="text-clinical-stage-foreground">Não foi possível abrir esta imagem.</p>
              <p>Ela pode ter expirado ou não estar mais disponível. Nenhum arquivo foi alterado.</p>
              <button
                type="button"
                onClick={tentarNovamente}
                className="mx-auto min-h-11 rounded-xl border border-teal/70 bg-teal/20 px-4 text-sm font-semibold text-teal-lt transition-colors hover:bg-teal/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/70"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="order-last flex shrink-0 flex-col gap-2 sm:order-first">
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible">
          <BotaoViewport
            label="Reduzir zoom"
            disabled={controlesDesabilitados || estado.zoom <= 1}
            onClick={() => aplicarZoom(proximoZoomDiscreto(estado.zoom, -1), centroViewport())}
          >
            <ZoomOut className="size-5" aria-hidden="true" />
          </BotaoViewport>
          <output
            aria-label={`Zoom atual: ${formatarZoom(estado.zoom)}`}
            className="flex h-11 min-w-14 shrink-0 items-center justify-center rounded-xl border border-clinical-stage-border bg-clinical-stage-raised px-2 text-sm font-semibold tabular-nums text-clinical-stage-foreground"
          >
            {formatarZoom(estado.zoom)}
          </output>
          <BotaoViewport
            label="Ampliar zoom"
            disabled={controlesDesabilitados || estado.zoom >= 8}
            onClick={() => aplicarZoom(proximoZoomDiscreto(estado.zoom, 1), centroViewport())}
          >
            <ZoomIn className="size-5" aria-hidden="true" />
          </BotaoViewport>
          <BotaoViewport label="Girar 90 graus no sentido horário" disabled={controlesDesabilitados} onClick={alternarRotacao}>
            <RotateCw className="size-5" aria-hidden="true" />
          </BotaoViewport>
          <BotaoViewport
            label="Abrir ajustes de imagem"
            ativo={ajustesAbertos}
            disabled={controlesDesabilitados}
            onClick={() => setAjustesAbertos((abertos) => !abertos)}
          >
            <SlidersHorizontal className="size-5" aria-hidden="true" />
          </BotaoViewport>
          <BotaoViewport
            label="Inverter tons da imagem"
            ativo={estado.invertida}
            pressed={estado.invertida}
            disabled={controlesDesabilitados}
            onClick={() => atualizarEstado((atual) => ({ ...atual, invertida: !atual.invertida }))}
          >
            <Contrast className="size-5" aria-hidden="true" />
          </BotaoViewport>
          <BotaoViewport label="Restaurar visualização original" disabled={controlesDesabilitados} onClick={restaurar}>
            <RotateCcw className="size-5" aria-hidden="true" />
          </BotaoViewport>
        </div>

        {ajustesAbertos && (
          <div className="grid w-full gap-4 rounded-2xl border border-clinical-stage-border bg-clinical-stage-raised p-4 sm:w-[248px]">
            <div className="flex items-center gap-2 text-sm font-semibold text-clinical-stage-foreground">
              <SunMedium className="size-4 text-teal-lt" aria-hidden="true" />
              Ajustes temporários
            </div>
            <CampoAjuste
              id={`ajuste-brilho-${identificadorAjustes}`}
              label="Brilho"
              value={estado.brilho}
              disabled={controlesDesabilitados}
              onChange={(brilho) => atualizarEstado((atual) => ({ ...atual, brilho: limitarAjuste(brilho) }))}
            />
            <CampoAjuste
              id={`ajuste-contraste-${identificadorAjustes}`}
              label="Contraste"
              value={estado.contraste}
              disabled={controlesDesabilitados}
              onChange={(contraste) => atualizarEstado((atual) => ({ ...atual, contraste: limitarAjuste(contraste) }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
