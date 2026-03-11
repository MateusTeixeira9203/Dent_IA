"use client";

import { useState, useCallback, useRef, useEffect, useId } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Mic,
  Square,
  Upload,
  ImageIcon,
  FileText,
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  Presentation,
  Plus,
  Check,
  Loader2,
  ZoomIn,
  Phone,
  MessageCircle,
  Sparkles,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardContent,
  SectionLabel,
  Waveform,
} from "@/components/dentai";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import type { Ficha, Paciente, Dentista, FichaArquivo } from "@/types/database";
import Link from "next/link";

interface FichaClientProps {
  ficha: Ficha;
  paciente: Paciente;
  dentista: Dentista;
  clinicaId: string;
  arquivosIniciais: FichaArquivo[];
}

// Separador visual para cada fonte de texto
function separador(fonte: string): string {
  return `\n\n--- [${fonte}] ---\n`;
}

// Gera iniciais do nome para o avatar
function iniciais(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function FichaClient({
  ficha: fichaInicial,
  paciente,
  dentista,
  clinicaId,
  arquivosIniciais,
}: FichaClientProps): React.JSX.Element {
  const supabase = createClient();
  const docInputId = useId();
  const rxInputId = useId();
  const fotoInputId = useId();

  // ── Estado principal ──────────────────────────────────────────────
  const [ficha, setFicha] = useState(fichaInicial);
  const [transcricao, setTranscricao] = useState(fichaInicial.transcricao ?? "");
  const [anotacoes, setAnotacoes] = useState(fichaInicial.anotacoes ?? "");
  const [arquivos, setArquivos] = useState<FichaArquivo[]>(arquivosIniciais);
  const [activeTab, setActiveTab] = useState("ficha");

  // Signed URLs para exibição de imagens
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // ── Estado de UI ──────────────────────────────────────────────────
  const [salvandoTranscricao, setSalvandoTranscricao] = useState(false);
  const [salvandoAnotacoes, setSalvandoAnotacoes] = useState(false);
  const [processandoTranscricao, setProcessandoTranscricao] = useState(false);
  const [uploadandoDoc, setUploadandoDoc] = useState(false);
  const [uploadandoFoto, setUploadandoFoto] = useState(false);
  const [uploadandoRx, setUploadandoRx] = useState(false);
  const [concluindoFicha, setConcluindoFicha] = useState(false);
  const [dragOverDoc, setDragOverDoc] = useState(false);
  const [extraindo, setExtraindo] = useState<Record<string, boolean>>({});

  // Lightbox e apresentação
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [apresentacaoOpen, setApresentacaoOpen] = useState(false);
  const [apresentacaoIndex, setApresentacaoIndex] = useState(0);

  // Timers de auto-save
  const transcricaoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anotacoesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { status: recorderStatus, timer, startRecording, stopRecording } =
    useAudioRecorder();

  // Listas derivadas por tipo
  const documentos = arquivos.filter((a) => a.tipo === "documento");
  const fotosficha = arquivos.filter((a) => a.tipo === "foto_ficha");
  const radiografias = arquivos.filter((a) => a.tipo === "radiografia");

  // ── Signed URLs ───────────────────────────────────────────────────
  const carregarSignedUrl = useCallback(
    async (arquivo: FichaArquivo): Promise<string | null> => {
      const bucket =
        arquivo.tipo === "foto_ficha"
          ? "fichas"
          : arquivo.tipo === "radiografia"
          ? "radiografias"
          : "documentos";

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(arquivo.storage_url, 3600);

      if (error || !data?.signedUrl) return null;
      setSignedUrls((prev) => ({ ...prev, [arquivo.id]: data.signedUrl }));
      return data.signedUrl;
    },
    [supabase]
  );

  // Carrega signed URLs ao montar
  useEffect(() => {
    arquivos
      .filter((a) => a.tipo === "foto_ficha" || a.tipo === "radiografia")
      .forEach((a) => carregarSignedUrl(a));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Formatação ────────────────────────────────────────────────────
  function formatarTimer(segundos: number): string {
    const m = Math.floor(segundos / 60).toString().padStart(2, "0");
    const s = (segundos % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  const dataFormatada = format(
    new Date(ficha.created_at),
    "dd 'de' MMMM 'de' yyyy",
    { locale: ptBR }
  );

  const estaGravando = recorderStatus === "recording";
  const estaProcessandoAudio = recorderStatus === "processing" || processandoTranscricao;

  // ── Auto-save transcrição (debounce 2s) ───────────────────────────
  function handleTranscricaoChange(valor: string): void {
    setTranscricao(valor);
    if (transcricaoTimerRef.current) clearTimeout(transcricaoTimerRef.current);
    transcricaoTimerRef.current = setTimeout(async () => {
      setSalvandoTranscricao(true);
      await supabase.from("fichas").update({ transcricao: valor }).eq("id", ficha.id);
      setSalvandoTranscricao(false);
    }, 2000);
  }

  function incluirNaFicha(texto: string, fonte: string): void {
    const novoTexto = transcricao
      ? transcricao + separador(fonte) + texto
      : `--- [${fonte}] ---\n` + texto;
    handleTranscricaoChange(novoTexto);
    toast.success(`"${fonte}" incluído na ficha.`);
  }

  // ── Auto-save anotações (debounce 2s) ─────────────────────────────
  function handleAnotacoesChange(valor: string): void {
    setAnotacoes(valor);
    if (anotacoesTimerRef.current) clearTimeout(anotacoesTimerRef.current);
    anotacoesTimerRef.current = setTimeout(async () => {
      setSalvandoAnotacoes(true);
      await supabase.from("fichas").update({ anotacoes: valor }).eq("id", ficha.id);
      setSalvandoAnotacoes(false);
    }, 2000);
  }

  // ── Concluir ficha ────────────────────────────────────────────────
  async function handleConcluirFicha(): Promise<void> {
    if (ficha.status === "concluida") return;
    setConcluindoFicha(true);
    try {
      const { error } = await supabase
        .from("fichas")
        .update({ status: "concluida" })
        .eq("id", ficha.id);

      if (error) { toast.error("Erro ao concluir ficha."); return; }
      setFicha((f) => ({ ...f, status: "concluida" }));
      toast.success("Ficha concluída!");
    } catch {
      toast.error("Erro inesperado ao concluir ficha.");
    } finally {
      setConcluindoFicha(false);
    }
  }

  // ── Gravação de voz ───────────────────────────────────────────────
  const handlePararGravacao = useCallback(async (): Promise<void> => {
    const blob = await stopRecording();
    if (!blob) { toast.error("Nenhum áudio gravado."); return; }

    setProcessandoTranscricao(true);
    try {
      const timestamp = Date.now();
      const audioPath = `${clinicaId}/${ficha.id}/${timestamp}.webm`;

      const { error: uploadError } = await supabase.storage
        .from("audios")
        .upload(audioPath, blob, { contentType: "audio/webm" });

      if (uploadError) { toast.error("Erro ao fazer upload do áudio."); return; }

      await supabase.from("fichas").update({ audio_url: audioPath }).eq("id", ficha.id);

      const resp = await fetch("/api/transcricao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ficha_id: ficha.id, audio_url: audioPath }),
      });

      if (!resp.ok) { toast.error("Erro ao transcrever áudio."); return; }

      const { transcricao: texto } = (await resp.json()) as { transcricao: string };
      incluirNaFicha(texto, "Gravação de voz");
      setFicha((f) => ({ ...f, audio_url: audioPath }));
      toast.success("Áudio transcrito e incluído na ficha!");
    } catch {
      toast.error("Erro ao processar a gravação.");
    } finally {
      setProcessandoTranscricao(false);
    }
  }, [stopRecording, supabase, ficha.id, clinicaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload de documentos ──────────────────────────────────────────
  async function processarArquivosDocumento(files: FileList | File[]): Promise<void> {
    const lista = Array.from(files);
    if (lista.length === 0) return;

    const tiposPermitidos = ["doc", "docx", "pdf", "txt"];
    for (const file of lista) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!tiposPermitidos.includes(ext)) { toast.error(`Tipo não suportado: ${file.name}`); return; }
      if (file.size > 20 * 1024 * 1024) { toast.error(`Muito grande (máx 20MB): ${file.name}`); return; }
    }

    setUploadandoDoc(true);
    try {
      for (const file of lista) {
        const timestamp = Date.now();
        const storagePath = `${clinicaId}/${ficha.id}/docs/${timestamp}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("documentos").upload(storagePath, file);
        if (uploadError) { toast.error(`Erro ao enviar ${file.name}`); continue; }

        const resp = await fetch("/api/processar-documento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ficha_id: ficha.id, clinica_id: clinicaId,
            nome_original: file.name, storage_url: storagePath,
          }),
        });

        if (!resp.ok) { toast.error(`Erro ao processar ${file.name}`); continue; }
        const { ficha_arquivo } = (await resp.json()) as { ficha_arquivo: FichaArquivo; texto: string };
        setArquivos((prev) => [...prev, ficha_arquivo]);
        toast.success(`${file.name} processado!`);
      }
    } catch {
      toast.error("Erro inesperado ao processar documentos.");
    } finally {
      setUploadandoDoc(false);
    }
  }

  function handleDocInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    if (e.target.files) processarArquivosDocumento(e.target.files);
    e.target.value = "";
  }

  function handleDocDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragOverDoc(false);
    if (e.dataTransfer.files) processarArquivosDocumento(e.dataTransfer.files);
  }

  async function handleRemoverDocumento(arquivo: FichaArquivo): Promise<void> {
    try {
      await supabase.storage.from("documentos").remove([arquivo.storage_url]);
      await supabase.from("ficha_arquivos").delete().eq("id", arquivo.id);
      setArquivos((prev) => prev.filter((a) => a.id !== arquivo.id));
      toast.success("Documento removido.");
    } catch { toast.error("Erro ao remover documento."); }
  }

  // ── Upload de foto da ficha ───────────────────────────────────────
  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
      toast.error("Use jpg, png ou webp."); return;
    }
    if (file.size > 10 * 1024 * 1024) { toast.error("Máx 10MB."); return; }

    setUploadandoFoto(true);
    try {
      const timestamp = Date.now();
      const storagePath = `${clinicaId}/${ficha.id}/foto_${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("fichas").upload(storagePath, file);
      if (uploadError) { toast.error("Erro ao enviar foto."); return; }

      const { data: fichaArquivo, error: insertError } = await supabase
        .from("ficha_arquivos")
        .insert({
          ficha_id: ficha.id, clinica_id: clinicaId,
          tipo: "foto_ficha", nome_original: file.name,
          storage_url: storagePath, texto_extraido: null, processado: false,
        })
        .select().single();

      if (insertError || !fichaArquivo) { toast.error("Erro ao registrar foto."); return; }

      const novaFoto = fichaArquivo as FichaArquivo;
      setArquivos((prev) => [...prev, novaFoto]);
      await carregarSignedUrl(novaFoto);

      setExtraindo((prev) => ({ ...prev, [novaFoto.id]: true }));
      toast.info("Foto enviada! Extraindo texto com IA...");

      const resp = await fetch("/api/extrair-imagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ficha_arquivo_id: novaFoto.id, tipo: "foto_ficha" }),
      });

      if (!resp.ok) { toast.error("Erro ao extrair texto."); return; }
      const { texto } = (await resp.json()) as { texto: string };

      setArquivos((prev) =>
        prev.map((a) => a.id === novaFoto.id ? { ...a, texto_extraido: texto, processado: true } : a)
      );
      setExtraindo((prev) => { const next = { ...prev }; delete next[novaFoto.id]; return next; });
      toast.success("Texto da ficha extraído!");
    } catch {
      toast.error("Erro ao processar foto.");
    } finally {
      setUploadandoFoto(false);
    }
  }

  async function handleRemoverFoto(arquivo: FichaArquivo): Promise<void> {
    try {
      await supabase.storage.from("fichas").remove([arquivo.storage_url]);
      await supabase.from("ficha_arquivos").delete().eq("id", arquivo.id);
      setArquivos((prev) => prev.filter((a) => a.id !== arquivo.id));
      setSignedUrls((prev) => { const next = { ...prev }; delete next[arquivo.id]; return next; });
      toast.success("Foto removida.");
    } catch { toast.error("Erro ao remover foto."); }
  }

  // ── Upload de radiografias ────────────────────────────────────────
  async function handleUploadRx(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    e.target.value = "";

    const tiposPermitidos = ["jpg", "jpeg", "png", "webp", "pdf"];
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!tiposPermitidos.includes(ext)) { toast.error(`Tipo não suportado: ${file.name}`); return; }
      if (file.size > 20 * 1024 * 1024) { toast.error(`Muito grande (máx 20MB): ${file.name}`); return; }
    }

    setUploadandoRx(true);
    try {
      for (const file of files) {
        const timestamp = Date.now();
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const storagePath = `${clinicaId}/${ficha.id}/rx_${timestamp}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("radiografias").upload(storagePath, file);
        if (uploadError) { toast.error(`Erro ao enviar ${file.name}`); continue; }

        const { data: fichaArquivo, error: insertError } = await supabase
          .from("ficha_arquivos")
          .insert({
            ficha_id: ficha.id, clinica_id: clinicaId,
            tipo: "radiografia", nome_original: file.name,
            storage_url: storagePath, texto_extraido: null, processado: true,
          })
          .select().single();

        if (insertError || !fichaArquivo) { toast.error(`Erro ao registrar ${file.name}`); continue; }

        const novaRx = fichaArquivo as FichaArquivo;
        setArquivos((prev) => [...prev, novaRx]);
        if (ext !== "pdf") await carregarSignedUrl(novaRx);
        toast.success(`${file.name} enviada!`);
      }
    } catch {
      toast.error("Erro ao enviar radiografias.");
    } finally {
      setUploadandoRx(false);
    }
  }

  async function handleRemoverRx(arquivo: FichaArquivo): Promise<void> {
    try {
      await supabase.storage.from("radiografias").remove([arquivo.storage_url]);
      await supabase.from("ficha_arquivos").delete().eq("id", arquivo.id);
      setArquivos((prev) => prev.filter((a) => a.id !== arquivo.id));
      setSignedUrls((prev) => { const next = { ...prev }; delete next[arquivo.id]; return next; });
      toast.success("Radiografia removida.");
    } catch { toast.error("Erro ao remover radiografia."); }
  }

  // ── Navegação lightbox / apresentação ─────────────────────────────
  function lightboxAnterior(): void {
    setLightboxIndex((i) => (i > 0 ? i - 1 : radiografias.length - 1));
  }
  function lightboxProximo(): void {
    setLightboxIndex((i) => (i < radiografias.length - 1 ? i + 1 : 0));
  }
  function apresentacaoAnterior(): void {
    setApresentacaoIndex((i) => (i > 0 ? i - 1 : radiografias.length - 1));
  }
  function apresentacaoProximo(): void {
    setApresentacaoIndex((i) => (i < radiografias.length - 1 ? i + 1 : 0));
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        setApresentacaoOpen(false);
        setLightboxOpen(false);
      }
      if (apresentacaoOpen) {
        if (e.key === "ArrowLeft") apresentacaoAnterior();
        if (e.key === "ArrowRight") apresentacaoProximo();
      }
      if (lightboxOpen) {
        if (e.key === "ArrowLeft") lightboxAnterior();
        if (e.key === "ArrowRight") lightboxProximo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [apresentacaoOpen, lightboxOpen, radiografias.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── JSX ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pacientes">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={15} />
            Pacientes
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="font-serif text-2xl text-brand-black">
            Ficha de {paciente.nome}
          </h1>
          <p className="font-mono text-xs text-brand-muted mt-0.5">{dataFormatada}</p>
        </div>
        <Badge variant={ficha.status === "aberta" ? "warning" : "success"}>
          {ficha.status === "aberta" ? "Aberta" : "Concluída"}
        </Badge>
      </div>

      {/* ── Layout duas colunas: 280px | 1fr ── */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "280px 1fr" }}>

        {/* ════════════════════════
            COLUNA ESQUERDA — sticky
        ════════════════════════ */}
        <div className="space-y-4 sticky top-6 self-start">

          {/* Card Paciente */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              {/* Avatar + nome */}
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-teal/10 font-mono text-sm font-medium text-teal select-none">
                  {iniciais(paciente.nome)}
                </div>
                <p className="font-serif text-[1.05rem] leading-tight text-brand-black truncate">
                  {paciente.nome}
                </p>
              </div>

              {paciente.telefone && (
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-brand-muted shrink-0" />
                  <span className="font-mono text-sm text-brand-muted">{paciente.telefone}</span>
                </div>
              )}

              {paciente.whatsapp && (
                <div className="flex items-center gap-2">
                  <MessageCircle size={13} className="text-teal shrink-0" />
                  <a
                    href={`https://wa.me/55${paciente.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-teal hover:underline"
                  >
                    {paciente.whatsapp}
                  </a>
                </div>
              )}

              <Link href={`/dashboard/pacientes/${paciente.id}`}>
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Ver perfil completo
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Card Ficha */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <SectionLabel>Ficha</SectionLabel>

              <div>
                <p className="font-sans text-sm text-brand-black">{dentista.nome}</p>
                {dentista.especialidade && (
                  <p className="font-mono text-xs text-brand-muted">{dentista.especialidade}</p>
                )}
              </div>

              <p className="font-mono text-xs text-brand-muted">{dataFormatada}</p>

              <div>
                <Badge variant={ficha.status === "aberta" ? "warning" : "success"}>
                  {ficha.status === "aberta" ? "Aberta" : "Concluída"}
                </Badge>
              </div>

              {ficha.status === "aberta" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleConcluirFicha}
                  loading={concluindoFicha}
                >
                  {!concluindoFicha && <Check size={13} />}
                  Concluir Ficha
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ════════════════════════
            COLUNA DIREITA — Tabs
        ════════════════════════ */}
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-b border-brand-border rounded-none w-full justify-start gap-0 h-auto p-0 mb-4">
              {(["ficha", "anotacoes", "orcamento"] as const).map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="font-sans text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-teal data-[state=active]:text-teal data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-brand-muted hover:text-brand-black transition-colors"
                >
                  {tab === "ficha" ? "Ficha" : tab === "anotacoes" ? "Anotações" : "Orçamento"}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ══════════════════════════════
                TAB: FICHA
            ══════════════════════════════ */}
            <TabsContent value="ficha" className="space-y-4 mt-0">

              {/* SEÇÃO 1 — Gravação de Voz */}
              <Card>
                <CardContent className="pt-5 space-y-4">
                  <SectionLabel>Gravação de Voz</SectionLabel>

                  <div className="flex flex-col items-center gap-4 py-2">
                    {estaProcessandoAudio ? (
                      <div className="flex items-center gap-3">
                        <Waveform />
                        <span className="font-mono text-sm text-brand-muted">
                          Transcrevendo com IA...
                        </span>
                      </div>
                    ) : estaGravando ? (
                      <div className="flex flex-col items-center gap-3">
                        <Button
                          variant="destructive"
                          size="lg"
                          className="gap-2 animate-record-pulse"
                          onClick={handlePararGravacao}
                        >
                          <Square size={16} />
                          Parar
                          <span className="font-mono ml-1">{formatarTimer(timer)}</span>
                        </Button>
                        <p className="font-sans text-xs text-brand-muted">
                          Gravando… clique para parar
                        </p>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="lg"
                        className="gap-2"
                        onClick={startRecording}
                      >
                        <Mic size={18} />
                        Iniciar Gravação
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* SEÇÃO 2 — Documentos */}
              <Card>
                <CardContent className="pt-5 space-y-4">
                  <SectionLabel>Documentos</SectionLabel>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOverDoc(true); }}
                    onDragLeave={() => setDragOverDoc(false)}
                    onDrop={handleDocDrop}
                    onClick={() => document.getElementById(docInputId)?.click()}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded border-2 border-dashed p-5 text-center transition-colors ${
                      dragOverDoc ? "border-teal bg-teal/5" : "border-brand-border hover:border-teal/40"
                    }`}
                  >
                    {uploadandoDoc
                      ? <Loader2 className="size-5 animate-spin text-brand-muted" />
                      : <Upload className="size-5 text-brand-muted" />}
                    <p className="font-sans text-sm text-brand-muted">
                      {uploadandoDoc ? "Processando arquivos..." : "Arraste ou clique para enviar"}
                    </p>
                    <p className="font-mono text-xs text-brand-muted">
                      .doc .docx .pdf .txt — máx. 20MB
                    </p>
                    <input
                      id={docInputId}
                      type="file"
                      multiple
                      accept=".doc,.docx,.pdf,.txt"
                      className="hidden"
                      onChange={handleDocInputChange}
                      disabled={uploadandoDoc}
                    />
                  </div>

                  {documentos.length > 0 && (
                    <div className="space-y-2">
                      {documentos.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-3 rounded border border-brand-border bg-brand-bg px-3 py-2.5"
                        >
                          <FileText className="size-4 text-brand-muted shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm text-brand-black truncate">
                              {doc.nome_original}
                            </p>
                            {doc.processado && doc.texto_extraido && (
                              <Badge variant="success" className="mt-1">✓ Extraído</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {doc.texto_extraido && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-teal text-xs h-7"
                                onClick={() => incluirNaFicha(doc.texto_extraido!, `Documento: ${doc.nome_original}`)}
                              >
                                <Plus size={11} />
                                Incluir na ficha
                              </Button>
                            )}
                            <button
                              className="flex size-7 items-center justify-center rounded text-brand-muted hover:text-red-500 transition-colors"
                              onClick={() => handleRemoverDocumento(doc)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SEÇÃO 3 — Foto da Ficha Física */}
              <Card>
                <CardContent className="pt-5 space-y-4">
                  <SectionLabel>Foto da Ficha Física</SectionLabel>

                  {fotosficha.length === 0 ? (
                    <label
                      htmlFor={fotoInputId}
                      className="flex cursor-pointer flex-col items-center gap-2 rounded border-2 border-dashed border-brand-border p-5 text-center transition-colors hover:border-teal/40"
                    >
                      {uploadandoFoto
                        ? <Loader2 className="size-5 animate-spin text-brand-muted" />
                        : <ImageIcon className="size-5 text-brand-muted" />}
                      <p className="font-sans text-sm text-brand-muted">
                        {uploadandoFoto ? "Enviando e extraindo texto..." : "Arraste ou clique para enviar"}
                      </p>
                      <p className="font-mono text-xs text-brand-muted">
                        jpg, png, webp — máx. 10MB
                      </p>
                      <input
                        id={fotoInputId}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleUploadFoto}
                        disabled={uploadandoFoto}
                      />
                    </label>
                  ) : (
                    fotosficha.map((foto) => (
                      <div key={foto.id} className="space-y-3">
                        <div className="relative overflow-hidden rounded border border-brand-border">
                          {signedUrls[foto.id] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={signedUrls[foto.id]}
                              alt="Foto da ficha"
                              className="w-full object-contain max-h-64 bg-brand-bg"
                            />
                          ) : (
                            <div className="flex h-32 items-center justify-center bg-brand-bg">
                              <Skeleton className="size-full" />
                            </div>
                          )}
                          <button
                            className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-white/90 text-red-500 shadow hover:bg-red-50"
                            onClick={() => handleRemoverFoto(foto)}
                          >
                            <X size={12} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          {extraindo[foto.id] ? (
                            <span className="flex items-center gap-1 font-mono text-xs text-brand-muted">
                              <Loader2 size={11} className="animate-spin" />
                              Analisando imagem...
                            </span>
                          ) : foto.processado && foto.texto_extraido ? (
                            <Badge variant="success">✓ Extraído</Badge>
                          ) : (
                            <span className="font-mono text-xs text-brand-muted">Sem texto extraído</span>
                          )}
                          {foto.texto_extraido && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-teal text-xs h-7"
                              onClick={() => incluirNaFicha(foto.texto_extraido!, "Foto da ficha")}
                            >
                              <Plus size={11} />
                              Incluir na ficha
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* SEÇÃO 4 — Transcrição Consolidada */}
              <Card>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <SectionLabel>Transcrição Consolidada</SectionLabel>
                    {salvandoTranscricao && (
                      <span className="font-mono text-xs text-brand-muted">✓ Salvo</span>
                    )}
                  </div>
                  <Textarea
                    value={transcricao}
                    onChange={(e) => handleTranscricaoChange(e.target.value)}
                    placeholder="As informações de voz, documentos e fotos aparecerão aqui. Você também pode digitar diretamente."
                    className="font-sans text-sm resize-none min-h-[220px] border-brand-border bg-brand-bg focus:border-teal rounded p-3.5"
                  />
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full gap-2"
                    disabled={!transcricao.trim()}
                    onClick={() => toast.info("Funcionalidade disponível na próxima versão")}
                  >
                    <Sparkles size={16} />
                    Gerar Orçamento com IA
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══════════════════════════════
                TAB: ANOTAÇÕES
            ══════════════════════════════ */}
            <TabsContent value="anotacoes" className="mt-0">
              <Card>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <SectionLabel>Anotações Clínicas</SectionLabel>
                    {salvandoAnotacoes && (
                      <span className="font-mono text-xs text-brand-muted">✓ Salvo</span>
                    )}
                  </div>
                  <Textarea
                    value={anotacoes}
                    onChange={(e) => handleAnotacoesChange(e.target.value)}
                    placeholder="Anotações clínicas, observações do dentista..."
                    className="font-sans text-sm resize-none min-h-[320px] border-brand-border bg-brand-bg focus:border-teal rounded p-3.5"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══════════════════════════════
                TAB: ORÇAMENTO
            ══════════════════════════════ */}
            <TabsContent value="orcamento" className="mt-0">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <Receipt size={40} className="text-brand-muted/30" />
                  <p className="font-serif text-lg text-brand-black">
                    Nenhum orçamento gerado
                  </p>
                  <p className="font-sans text-sm text-brand-muted max-w-xs">
                    Grave ou digite os procedimentos na aba Ficha
                    e clique em Gerar Orçamento
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => setActiveTab("ficha")}
                  >
                    Ir para Ficha
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          RADIOGRAFIAS — fora das tabs, largura total
      ════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <SectionLabel>Radiografias</SectionLabel>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(rxInputId)?.click()}
              >
                {uploadandoRx ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                Adicionar
              </Button>
              <input
                id={rxInputId}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,.pdf"
                className="hidden"
                onChange={handleUploadRx}
                disabled={uploadandoRx}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {radiografias.length === 0 ? (
            <div className="flex h-28 items-center justify-center rounded border-2 border-dashed border-brand-border font-sans text-sm text-brand-muted">
              Nenhuma radiografia adicionada ainda
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {radiografias.map((rx, idx) => (
                <div
                  key={rx.id}
                  className="group relative overflow-hidden rounded border border-brand-border bg-brand-bg"
                >
                  {signedUrls[rx.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={signedUrls[rx.id]}
                      alt={rx.nome_original}
                      className="h-36 w-full object-cover cursor-pointer"
                      onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}
                    />
                  ) : (
                    <div
                      className="flex h-36 cursor-pointer items-center justify-center bg-brand-surface"
                      onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}
                    >
                      <ImageIcon className="size-8 text-brand-muted/30" />
                    </div>
                  )}

                  {/* Overlay hover */}
                  <div className="absolute inset-0 flex flex-col justify-between bg-black/0 p-2 opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100">
                    <div className="flex justify-end">
                      <button
                        className="flex size-6 items-center justify-center rounded-full bg-white/90 text-red-500 hover:bg-red-50"
                        onClick={() => handleRemoverRx(rx)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        className="flex flex-1 items-center justify-center gap-1 rounded bg-white/90 px-1 py-1.5 text-xs font-medium text-brand-black hover:bg-white"
                        onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}
                      >
                        <ZoomIn size={11} /> Ampliar
                      </button>
                      <button
                        className="flex flex-1 items-center justify-center gap-1 rounded bg-white/90 px-1 py-1.5 text-xs font-medium text-brand-black hover:bg-white"
                        onClick={() => { setApresentacaoIndex(idx); setApresentacaoOpen(true); }}
                      >
                        <Presentation size={11} /> Apresentar
                      </button>
                    </div>
                  </div>

                  <p className="truncate px-2 py-1.5 font-mono text-xs text-brand-muted">
                    {rx.nome_original}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════════════════════
          LIGHTBOX
      ════════════════════════════════════════════════════════════ */}
      {lightboxOpen && radiografias[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-h-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute -right-3 -top-3 z-10 flex size-7 items-center justify-center rounded-full bg-white text-brand-black shadow"
              onClick={() => setLightboxOpen(false)}
            >
              <X size={14} />
            </button>

            {signedUrls[radiografias[lightboxIndex].id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signedUrls[radiografias[lightboxIndex].id]}
                alt={radiografias[lightboxIndex].nome_original}
                className="max-h-[90vh] max-w-full rounded object-contain"
              />
            ) : (
              <div className="flex h-64 w-96 items-center justify-center rounded bg-zinc-800">
                <ImageIcon className="size-12 text-zinc-500" />
              </div>
            )}

            <p className="mt-2 text-center font-mono text-xs text-white/50">
              {radiografias[lightboxIndex].nome_original}
            </p>

            {radiografias.length > 1 && (
              <>
                <button
                  className="absolute -left-12 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40"
                  onClick={lightboxAnterior}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  className="absolute -right-12 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40"
                  onClick={lightboxProximo}
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MODO APRESENTAÇÃO — z-[9999] fullscreen
      ════════════════════════════════════════════════════════════ */}
      {apresentacaoOpen && radiografias[apresentacaoIndex] && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
          <div className="flex items-center justify-between px-6 py-3">
            <p className="font-mono text-xs text-white/40">
              {radiografias[apresentacaoIndex].nome_original}
            </p>
            <button
              className="flex size-8 items-center justify-center rounded text-white/60 hover:text-white transition-colors"
              onClick={() => setApresentacaoOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-1 items-center justify-center px-16">
            {signedUrls[radiografias[apresentacaoIndex].id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signedUrls[radiografias[apresentacaoIndex].id]}
                alt={radiografias[apresentacaoIndex].nome_original}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center">
                <ImageIcon className="size-16 text-white/20" />
              </div>
            )}
          </div>

          {radiografias.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                onClick={apresentacaoAnterior}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                onClick={apresentacaoProximo}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
