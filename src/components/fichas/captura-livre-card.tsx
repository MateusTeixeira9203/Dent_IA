'use client';

// Campo mágico do perfil (Job A Fatia B, §8): relato livre (digitado, colado ou
// ditado) + anexo (áudio/pdf/docx/txt) → "Organizar com Dex" → preenche o form
// existente. Não salva nada — quem salva é o FichasTab, dono do formData.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Paperclip, Loader2, Bot, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useCapturaLivre } from '@/hooks/useCapturaLivre';
import { extrairTextoDeArquivo } from '@/lib/dex/extrair-texto-arquivo';
import { casarProcedimentoLocal, type SugestaoLocal } from '@/lib/odontograma/casar-procedimento-local';
import { VoiceUX } from './voice-ux';
import { DexAvatar } from '@/components/ui/dex-avatar';
import type { EvolucaoFormatada } from '@/app/api/dex/formatar-evolucao/route';
import type { MeuDiaCatalogoProcedimento } from '@/server/dashboard/get-meu-dia';

// Etapas do feedback progressivo — mesmo texto/timing do modo consulta (§8).
const ETAPAS = [
  { ms: 0,    label: 'Analisando queixa...' },
  { ms: 1800, label: 'Identificando dentes...' },
  { ms: 3800, label: 'Gerando conduta...' },
  { ms: 6500, label: 'Finalizando ficha...' },
] as const;

export interface CapturaLivreCardProps {
  pacienteNome: string;
  /** Form já tem conteúdo? Gate de confirmação antes de sobrescrever (§8 fluxo, passo 4). */
  formDirty: boolean;
  onOrganizado: (evolucao: EvolucaoFormatada) => void;
  /** R-46d (D8) — "usar este documento de base": `nonce` muda a cada clique, o efeito abaixo
   *  observa a mudança e faz append no texto atual. Opcional — callers existentes (FichasTab)
   *  não passam, comportamento 100% preservado. */
  anexarTexto?: { texto: string; nonce: number };
  /** R-62 — catálogo pro match local (§3.1). Ausente = o matcher casa só os 17 tipos
   *  estruturais, sem item comercial. */
  catalogoProcedimentos?: MeuDiaCatalogoProcedimento[];
  /** R-62 — clique num chip de sugestão LOCAL (zero rede, zero IA — §1.2/§3.1). Ausente =
   *  os chips locais nem são calculados (I5: `FichasTab` não passa, fica idêntico a hoje). */
  onAplicarSugestao?: (sugestao: SugestaoLocal) => void;
}

export function CapturaLivreCard({
  pacienteNome, formDirty, onOrganizado, anexarTexto, catalogoProcedimentos, onAplicarSugestao,
}: CapturaLivreCardProps) {
  const {
    texto,
    setTexto,
    toggleVoz,
    micStatus,
    isTranscribing,
    liveTranscript,
    elapsedSeconds,
    detectedProcs,
    isDetecting,
  } = useCapturaLivre({ pacienteNome });

  // R-62 — puro e síncrono: roda a cada tecla, sem debounce, sem rede (I1/I6). Ausência de
  // `onAplicarSugestao` desliga o cálculo inteiro (I5) — é o que mantém o FichasTab intocado.
  const sugestoesLocais = useMemo(
    () => (onAplicarSugestao ? casarProcedimentoLocal(texto, catalogoProcedimentos ?? []) : []),
    [texto, catalogoProcedimentos, onAplicarSugestao],
  );

  // R-46d (D8) — append, não substituição: mesmo padrão que `handleArquivo` já usa.
  const anexarNonceRef = useRef(anexarTexto?.nonce);
  useEffect(() => {
    if (anexarTexto == null || anexarTexto.nonce === anexarNonceRef.current) return;
    anexarNonceRef.current = anexarTexto.nonce;
    const novo = anexarTexto.texto;
    setTexto((prev) => (prev ? `${prev}\n\n${novo}` : novo));
  }, [anexarTexto, setTexto]);

  const [isOrganizando, setIsOrganizando] = useState(false);
  const [organizarLabel, setOrganizarLabel] = useState('Organizar com Dex');
  const [processandoArquivo, setProcessandoArquivo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleOrganizar = async () => {
    const relato = texto.trim();
    if (!relato) return;
    // §8 passo 4 — form já preenchido pede confirmação antes de sobrescrever.
    // R-47 (31/07): eventos do odontograma agora se SOMAM aos existentes (não substituem
    // mais — era o achado 1), só o texto/campos do form são substituídos de fato.
    //
    // 05/08 (achado ao vivo) — cancelar aqui devolvia silêncio total: nenhum toast, nenhuma
    // mudança visível, o texto continuava no campo do jeito que estava. Parecia que o botão
    // não tinha feito nada (relatado como "não aparece no odontograma" — na verdade nunca
    // chegou a chamar a IA). Fica mais comum depois do R-62: os chips locais já preenchem o
    // draft sem passar por aqui, então `formDirty` chega `true` com mais frequência.
    if (formDirty && !window.confirm('Isso substitui o texto e os campos do formulário. Os registros já lançados no odontograma são mantidos — os novos se somam a eles.')) {
      toast.info('Cancelado — nada foi alterado. O texto continua no campo.');
      return;
    }

    setIsOrganizando(true);
    setOrganizarLabel(ETAPAS[0].label);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = ETAPAS.slice(1).map(({ ms, label }) => setTimeout(() => setOrganizarLabel(label), ms));

    try {
      const res = await fetch('/api/dex/formatar-evolucao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: relato, pacienteNome }),
      });
      const data = await res.json() as EvolucaoFormatada & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro ao formatar');
      onOrganizado(data);
    } catch (err) {
      console.error('[captura-livre] formatar-evolucao:', err);
      toast.error('O Dex não conseguiu organizar as anotações. Tente novamente.');
    } finally {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setIsOrganizando(false);
      setOrganizarLabel('Organizar com Dex');
    }
  };

  const handleArquivo = async (file: File) => {
    setProcessandoArquivo(file.name);
    try {
      const resultado = await extrairTextoDeArquivo(file);
      if (!resultado.ok) throw new Error(resultado.error);
      if (resultado.texto) {
        const novo = resultado.texto;
        setTexto(prev => prev ? `${prev}\n${novo}` : novo);
      }
    } catch (err) {
      console.error('[captura-livre] anexo:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao processar o arquivo.');
    } finally {
      setProcessandoArquivo(null);
    }
  };

  return (
    <div className="rounded-2xl border border-teal/30 bg-surface-alt/40 overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <DexAvatar size={18} animated={isDetecting || isOrganizando} />
        <span className="text-[11px] font-bold uppercase tracking-widest text-teal-ink">Campo mágico</span>
        <span className="text-xs text-text-secondary ml-1">Fale, cole ou anexe — o Dex monta a ficha</span>
      </div>

      {/* R-62 — sugestões LOCAIS: instantâneas, acionáveis, zero rede. Distintas das da IA
          logo abaixo (preenchidas + ícone de raio, vs. outline sozinho) — são sugestão de
          outra natureza (trecho casado, não o relato inteiro entendido). */}
      <AnimatePresence>
        {sugestoesLocais.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {sugestoesLocais.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAplicarSugestao?.(s)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-ink text-surface hover:opacity-90 transition-opacity"
                >
                  <Zap className="w-2.5 h-2.5" />
                  {s.trecho}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detecção ao vivo (IA) — informativo, não clicável. */}
      <AnimatePresence>
        {texto.length > 20 && (detectedProcs.length > 0 || isDetecting) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {detectedProcs.map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border bg-teal/10 border-teal/25 text-teal-ink"
                >
                  {p}
                </span>
              ))}
              {detectedProcs.length === 0 && isDetecting && (
                <span className="text-[11px] text-text-secondary italic">Analisando o relato…</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Ex: Paciente relatou dor no dente 36, fiz restauração com resina composta. Orientei sobre cuidados pós-procedimento."
        className="w-full px-4 py-3 text-sm leading-relaxed resize-none outline-none bg-transparent text-text-primary placeholder:text-text-secondary/50 min-h-[100px]"
      />

      {processandoArquivo && (
        <div className="flex items-center gap-2 px-4 pb-2 text-xs text-text-secondary">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-ink" />
          Processando {processandoArquivo}...
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleVoz()}
            disabled={isTranscribing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              micStatus === 'recording'
                ? 'bg-coral/10 text-coral-ink hover:bg-coral/20 animate-pulse'
                : 'bg-teal/10 text-teal-ink hover:bg-teal/20'
            }`}
          >
            {micStatus === 'recording' ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            {micStatus === 'recording' ? 'Parar' : 'Gravar voz'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.pdf,.docx,.doc,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void handleArquivo(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={processandoArquivo !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors disabled:opacity-50"
          >
            <Paperclip className="w-3.5 h-3.5" />
            Anexar
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleOrganizar()}
          disabled={!texto.trim() || isOrganizando}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-ink hover:opacity-90 text-surface text-sm font-bold transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(47,156,133,0.3)]"
        >
          {isOrganizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
          {isOrganizando ? organizarLabel : 'Organizar com Dex'}
        </button>
      </div>

      <VoiceUX
        isRecording={micStatus === 'recording'}
        isTranscribing={isTranscribing}
        liveTranscript={liveTranscript}
        elapsedSeconds={elapsedSeconds}
        onStop={() => void toggleVoz()}
      />
    </div>
  );
}
