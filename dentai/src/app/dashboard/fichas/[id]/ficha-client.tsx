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
  Trash2,
  Plus,
  Check,
  Loader2,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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

export function FichaClient({
  ficha: fichaInicial,
  paciente,
  dentista,
  clinicaId,
  arquivosIniciais,
}: FichaClientProps) {
  const supabase = createClient();
  const docInputId = useId();
  const rxInputId = useId();
  const fotoInputId = useId();

  // ── Estado principal ──────────────────────────────────────────────
  const [ficha, setFicha] = useState(fichaInicial);
  const [transcricao, setTranscricao] = useState(fichaInicial.transcricao ?? "");
  const [anotacoes, setAnotacoes] = useState(fichaInicial.anotacoes ?? "");
  const [arquivos, setArquivos] = useState<FichaArquivo[]>(arquivosIniciais);

  // Signed URLs para exibição de imagens: id do arquivo → URL
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
  // Extração em andamento por arquivo: id → boolean
  const [extraindo, setExtraindo] = useState<Record<string, boolean>>({});

  // Lightbox e apresentação de radiografias
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
  // Gera signed URL para um arquivo e armazena no mapa de estado
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

  // Carrega signed URLs de imagens ao montar o componente
  useEffect(() => {
    const imagensParaCarregar = arquivos.filter(
      (a) => a.tipo === "foto_ficha" || a.tipo === "radiografia"
    );
    imagensParaCarregar.forEach((a) => {
      carregarSignedUrl(a);
    });
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
  const estaProcessandoAudio =
    recorderStatus === "processing" || processandoTranscricao;

  // ── Auto-save transcrição ─────────────────────────────────────────
  function handleTranscricaoChange(valor: string): void {
    setTranscricao(valor);
    if (transcricaoTimerRef.current) clearTimeout(transcricaoTimerRef.current);
    transcricaoTimerRef.current = setTimeout(async () => {
      setSalvandoTranscricao(true);
      await supabase
        .from("fichas")
        .update({ transcricao: valor })
        .eq("id", ficha.id);
      setSalvandoTranscricao(false);
    }, 2000);
  }

  // Inclui texto de uma fonte na transcrição consolidada
  function incluirNaFicha(texto: string, fonte: string): void {
    const novoTexto = transcricao
      ? transcricao + separador(fonte) + texto
      : `--- [${fonte}] ---\n` + texto;
    handleTranscricaoChange(novoTexto);
    toast.success(`Texto de "${fonte}" incluído na ficha.`);
  }

  // ── Auto-save anotações ───────────────────────────────────────────
  function handleAnotacoesChange(valor: string): void {
    setAnotacoes(valor);
    if (anotacoesTimerRef.current) clearTimeout(anotacoesTimerRef.current);
    anotacoesTimerRef.current = setTimeout(async () => {
      setSalvandoAnotacoes(true);
      await supabase
        .from("fichas")
        .update({ anotacoes: valor })
        .eq("id", ficha.id);
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

      if (error) {
        toast.error("Erro ao concluir ficha.");
        return;
      }

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
    if (!blob) {
      toast.error("Nenhum áudio gravado.");
      return;
    }

    setProcessandoTranscricao(true);
    try {
      const timestamp = Date.now();
      const audioPath = `${clinicaId}/${ficha.id}/${timestamp}.webm`;

      const { error: uploadError } = await supabase.storage
        .from("audios")
        .upload(audioPath, blob, { contentType: "audio/webm" });

      if (uploadError) {
        toast.error("Erro ao fazer upload do áudio.");
        return;
      }

      await supabase
        .from("fichas")
        .update({ audio_url: audioPath })
        .eq("id", ficha.id);

      const resp = await fetch("/api/transcricao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ficha_id: ficha.id, audio_url: audioPath }),
      });

      if (!resp.ok) {
        toast.error("Erro ao transcrever áudio.");
        return;
      }

      const { transcricao: texto } = (await resp.json()) as {
        transcricao: string;
      };

      // Adiciona o texto transcrito à seção 4 com separador
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
  async function processarArquivosDocumento(
    files: FileList | File[]
  ): Promise<void> {
    const lista = Array.from(files);
    if (lista.length === 0) return;

    // Valida cada arquivo
    const tiposPermitidos = ["doc", "docx", "pdf", "txt"];
    for (const file of lista) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!tiposPermitidos.includes(ext)) {
        toast.error(`Tipo não suportado: ${file.name}`);
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`Arquivo muito grande (máx 20MB): ${file.name}`);
        return;
      }
    }

    setUploadandoDoc(true);
    try {
      for (const file of lista) {
        const timestamp = Date.now();
        const storagePath = `${clinicaId}/${ficha.id}/docs/${timestamp}_${file.name}`;

        // Upload para o bucket documentos
        const { error: uploadError } = await supabase.storage
          .from("documentos")
          .upload(storagePath, file);

        if (uploadError) {
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }

        // Chama API para extrair texto e criar registro em ficha_arquivos
        const resp = await fetch("/api/processar-documento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ficha_id: ficha.id,
            clinica_id: clinicaId,
            nome_original: file.name,
            storage_url: storagePath,
          }),
        });

        if (!resp.ok) {
          toast.error(`Erro ao processar ${file.name}`);
          continue;
        }

        const { ficha_arquivo } = (await resp.json()) as {
          ficha_arquivo: FichaArquivo;
          texto: string;
        };

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
      await supabase.storage
        .from("documentos")
        .remove([arquivo.storage_url]);

      await supabase
        .from("ficha_arquivos")
        .delete()
        .eq("id", arquivo.id);

      setArquivos((prev) => prev.filter((a) => a.id !== arquivo.id));
      toast.success("Documento removido.");
    } catch {
      toast.error("Erro ao remover documento.");
    }
  }

  // ── Upload de foto da ficha ───────────────────────────────────────
  async function handleUploadFoto(
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const tiposPermitidos = ["jpg", "jpeg", "png", "webp"];
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!tiposPermitidos.includes(ext)) {
      toast.error("Tipo não suportado. Use jpg, png ou webp.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 10MB).");
      return;
    }

    setUploadandoFoto(true);
    try {
      const timestamp = Date.now();
      const storagePath = `${clinicaId}/${ficha.id}/foto_${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("fichas")
        .upload(storagePath, file);

      if (uploadError) {
        toast.error("Erro ao enviar foto.");
        return;
      }

      // Insere registro em ficha_arquivos
      const { data: fichaArquivo, error: insertError } = await supabase
        .from("ficha_arquivos")
        .insert({
          ficha_id: ficha.id,
          clinica_id: clinicaId,
          tipo: "foto_ficha",
          nome_original: file.name,
          storage_url: storagePath,
          texto_extraido: null,
          processado: false,
        })
        .select()
        .single();

      if (insertError || !fichaArquivo) {
        toast.error("Erro ao registrar foto.");
        return;
      }

      const novaFoto = fichaArquivo as FichaArquivo;
      setArquivos((prev) => [...prev, novaFoto]);

      // Carrega signed URL para preview
      const url = await carregarSignedUrl(novaFoto);
      if (!url) toast.warning("Foto enviada, mas não foi possível gerar preview.");

      // Inicia extração de texto via GPT-4o Vision
      setExtraindo((prev) => ({ ...prev, [novaFoto.id]: true }));
      toast.info("Foto enviada! Extraindo texto com IA...");

      const resp = await fetch("/api/extrair-imagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ficha_arquivo_id: novaFoto.id,
          tipo: "foto_ficha",
        }),
      });

      if (!resp.ok) {
        toast.error("Erro ao extrair texto da foto.");
        return;
      }

      const { texto } = (await resp.json()) as { texto: string };

      setArquivos((prev) =>
        prev.map((a) =>
          a.id === novaFoto.id
            ? { ...a, texto_extraido: texto, processado: true }
            : a
        )
      );
      toast.success("Texto da ficha extraído!");
    } catch {
      toast.error("Erro ao processar foto.");
    } finally {
      setUploadandoFoto(false);
      setExtraindo((prev) => {
        const next = { ...prev };
        // Remove entrada quando terminar (não temos o id aqui, será limpo pelo setState acima)
        return next;
      });
    }
  }

  async function handleRemoverFoto(arquivo: FichaArquivo): Promise<void> {
    try {
      await supabase.storage.from("fichas").remove([arquivo.storage_url]);
      await supabase.from("ficha_arquivos").delete().eq("id", arquivo.id);

      setArquivos((prev) => prev.filter((a) => a.id !== arquivo.id));
      setSignedUrls((prev) => {
        const next = { ...prev };
        delete next[arquivo.id];
        return next;
      });
      toast.success("Foto removida.");
    } catch {
      toast.error("Erro ao remover foto.");
    }
  }

  // ── Upload de radiografias ────────────────────────────────────────
  async function handleUploadRx(
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    e.target.value = "";

    const tiposPermitidos = ["jpg", "jpeg", "png", "webp", "pdf"];
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!tiposPermitidos.includes(ext)) {
        toast.error(`Tipo não suportado: ${file.name}`);
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`Arquivo muito grande (máx 20MB): ${file.name}`);
        return;
      }
    }

    setUploadandoRx(true);
    try {
      for (const file of files) {
        const timestamp = Date.now();
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const storagePath = `${clinicaId}/${ficha.id}/rx_${timestamp}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("radiografias")
          .upload(storagePath, file);

        if (uploadError) {
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }

        const { data: fichaArquivo, error: insertError } = await supabase
          .from("ficha_arquivos")
          .insert({
            ficha_id: ficha.id,
            clinica_id: clinicaId,
            tipo: "radiografia",
            nome_original: file.name,
            storage_url: storagePath,
            texto_extraido: null,
            processado: true,
          })
          .select()
          .single();

        if (insertError || !fichaArquivo) {
          toast.error(`Erro ao registrar ${file.name}`);
          continue;
        }

        const novaRx = fichaArquivo as FichaArquivo;
        setArquivos((prev) => [...prev, novaRx]);

        // Só gera signed URL para imagens (não PDF)
        if (ext !== "pdf") {
          await carregarSignedUrl(novaRx);
        }

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
      await supabase.storage
        .from("radiografias")
        .remove([arquivo.storage_url]);
      await supabase.from("ficha_arquivos").delete().eq("id", arquivo.id);

      setArquivos((prev) => prev.filter((a) => a.id !== arquivo.id));
      setSignedUrls((prev) => {
        const next = { ...prev };
        delete next[arquivo.id];
        return next;
      });
      toast.success("Radiografia removida.");
    } catch {
      toast.error("Erro ao remover radiografia.");
    }
  }

  // ── Navegação lightbox ────────────────────────────────────────────
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
    setApresentacaoIndex((i) =>
      i < radiografias.length - 1 ? i + 1 : 0
    );
  }

  // Fecha apresentação com ESC
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

  // Ícone por extensão de documento
  function iconeDocumento(nome: string): React.ReactNode {
    const ext = nome.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "pdf") return <FileText className="size-4 text-red-500" />;
    if (ext === "docx" || ext === "doc")
      return <FileText className="size-4 text-blue-500" />;
    return <FileText className="size-4 text-slate-400" />;
  }

  // ── JSX ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pacientes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Pacientes
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-900">
            Ficha de {paciente.nome}
          </h1>
          <p className="text-sm text-slate-500">{dataFormatada}</p>
        </div>
        <Badge
          className={
            ficha.status === "aberta"
              ? "bg-amber-100 text-amber-700 border-amber-200"
              : "bg-green-100 text-green-700 border-green-200"
          }
        >
          {ficha.status === "aberta" ? "Aberta" : "Concluída"}
        </Badge>
      </div>

      {/* Layout duas colunas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Coluna esquerda ── */}
        <div className="space-y-4 lg:col-span-1">
          {/* Card Paciente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Paciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-slate-500">Nome</span>
                <p className="font-medium text-slate-900">{paciente.nome}</p>
              </div>
              {paciente.telefone && (
                <div>
                  <span className="text-slate-500">Telefone</span>
                  <p className="font-medium text-slate-900">
                    {paciente.telefone}
                  </p>
                </div>
              )}
              {paciente.whatsapp && (
                <div>
                  <span className="text-slate-500">WhatsApp</span>
                  <p className="font-medium text-slate-900">
                    {paciente.whatsapp}
                  </p>
                </div>
              )}
              {paciente.data_nascimento && (
                <div>
                  <span className="text-slate-500">Nascimento</span>
                  <p className="font-medium text-slate-900">
                    {format(
                      new Date(paciente.data_nascimento + "T00:00:00"),
                      "dd/MM/yyyy"
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card Ficha */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ficha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-slate-500">Dentista</span>
                <p className="font-medium text-slate-900">{dentista.nome}</p>
              </div>
              {dentista.especialidade && (
                <div>
                  <span className="text-slate-500">Especialidade</span>
                  <p className="font-medium text-slate-900">
                    {dentista.especialidade}
                  </p>
                </div>
              )}
              <div>
                <span className="text-slate-500">Data</span>
                <p className="font-medium text-slate-900">{dataFormatada}</p>
              </div>
              <div>
                <span className="text-slate-500">Status</span>
                <p className="mt-0.5">
                  <Badge
                    variant="outline"
                    className={
                      ficha.status === "aberta"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-green-200 bg-green-50 text-green-700"
                    }
                  >
                    {ficha.status === "aberta" ? "Aberta" : "Concluída"}
                  </Badge>
                </p>
              </div>

              {ficha.status === "aberta" && (
                <Button
                  size="sm"
                  className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleConcluirFicha}
                  disabled={concluindoFicha}
                >
                  {concluindoFicha ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Concluir Ficha
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Coluna direita — Tabs ── */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="ficha">
            <TabsList>
              <TabsTrigger value="ficha">Ficha</TabsTrigger>
              <TabsTrigger value="anotacoes">Anotações</TabsTrigger>
              <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
            </TabsList>

            {/* ═══════════════════════════════════════
                TAB: FICHA
            ════════════════════════════════════════ */}
            <TabsContent value="ficha" className="space-y-4 mt-4">

              {/* ── SEÇÃO 1: Gravação de Voz ── */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700 uppercase tracking-wide">
                    1 · Gravação de Voz
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center gap-3 py-2">
                    {estaProcessandoAudio ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex size-16 items-center justify-center rounded-full bg-slate-100">
                          <Loader2 className="size-7 animate-spin text-slate-400" />
                        </div>
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-40" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <p className="text-sm text-slate-500">
                          Transcrevendo áudio...
                        </p>
                      </div>
                    ) : estaGravando ? (
                      <div className="flex flex-col items-center gap-3">
                        <button
                          onClick={handlePararGravacao}
                          className="flex size-16 animate-pulse items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600"
                        >
                          <Square className="size-7 fill-white" />
                        </button>
                        <span className="font-mono text-lg font-medium text-red-600">
                          {formatarTimer(timer)}
                        </span>
                        <p className="text-sm text-slate-500">
                          Gravando… clique para parar
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={startRecording}
                          className="flex size-16 items-center justify-center rounded-full bg-slate-700 text-white shadow-lg transition hover:bg-slate-900"
                        >
                          <Mic className="size-7" />
                        </button>
                        <p className="text-sm text-slate-500">
                          Clique para iniciar a gravação
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── SEÇÃO 2: Documentos ── */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700 uppercase tracking-wide">
                    2 · Documentos (Word / PDF / TXT)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Área drag & drop */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverDoc(true);
                    }}
                    onDragLeave={() => setDragOverDoc(false)}
                    onDrop={handleDocDrop}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-5 text-sm transition ${
                      dragOverDoc
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700"
                    }`}
                    onClick={() =>
                      document.getElementById(docInputId)?.click()
                    }
                  >
                    {uploadandoDoc ? (
                      <Loader2 className="size-6 animate-spin" />
                    ) : (
                      <Upload className="size-6" />
                    )}
                    <span>
                      {uploadandoDoc
                        ? "Processando arquivos..."
                        : "Arraste arquivos aqui ou clique para selecionar"}
                    </span>
                    <span className="text-xs text-slate-400">
                      .doc, .docx, .pdf, .txt · máx 20 MB por arquivo
                    </span>
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

                  {/* Lista de documentos enviados */}
                  {documentos.length > 0 && (
                    <div className="space-y-2">
                      {documentos.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                        >
                          {iconeDocumento(doc.nome_original)}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {doc.nome_original}
                            </p>
                            {doc.processado && doc.texto_extraido && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                <Check className="size-3" />
                                Texto extraído
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {doc.texto_extraido && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() =>
                                  incluirNaFicha(
                                    doc.texto_extraido!,
                                    `Documento: ${doc.nome_original}`
                                  )
                                }
                              >
                                <Plus className="size-3" />
                                Incluir na ficha
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                              onClick={() => handleRemoverDocumento(doc)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── SEÇÃO 3: Foto de Ficha Física ── */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700 uppercase tracking-wide">
                    3 · Foto de Ficha Física
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {fotosficha.length === 0 ? (
                    <label
                      htmlFor={fotoInputId}
                      className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 p-5 text-sm text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
                    >
                      {uploadandoFoto ? (
                        <Loader2 className="size-6 animate-spin" />
                      ) : (
                        <ImageIcon className="size-6" />
                      )}
                      <span>
                        {uploadandoFoto
                          ? "Enviando e extraindo texto..."
                          : "Clique para enviar foto da ficha"}
                      </span>
                      <span className="text-xs text-slate-400">
                        jpg, png, webp · máx 10 MB
                      </span>
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
                      <div key={foto.id} className="space-y-2">
                        {/* Preview */}
                        <div className="relative overflow-hidden rounded-lg border border-slate-200">
                          {signedUrls[foto.id] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={signedUrls[foto.id]}
                              alt="Foto da ficha"
                              className="max-h-48 w-full object-contain bg-slate-50"
                            />
                          ) : (
                            <div className="flex h-32 items-center justify-center bg-slate-50">
                              <Skeleton className="size-full" />
                            </div>
                          )}
                          <button
                            className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-white/90 text-red-500 shadow hover:bg-red-50"
                            onClick={() => handleRemoverFoto(foto)}
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>

                        {/* Status e ações */}
                        <div className="flex items-center justify-between">
                          {extraindo[foto.id] ? (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Loader2 className="size-3 animate-spin" />
                              Extraindo texto com IA...
                            </span>
                          ) : foto.processado && foto.texto_extraido ? (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <Check className="size-3" />
                              Texto extraído
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Sem texto extraído
                            </span>
                          )}

                          {foto.texto_extraido && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() =>
                                incluirNaFicha(
                                  foto.texto_extraido!,
                                  "Foto da ficha"
                                )
                              }
                            >
                              <Plus className="size-3" />
                              Incluir na ficha
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* ── SEÇÃO 4: Transcrição Consolidada ── */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700 uppercase tracking-wide flex items-center justify-between">
                    4 · Transcrição Consolidada
                    {salvandoTranscricao && (
                      <span className="text-xs font-normal text-slate-400 normal-case tracking-normal">
                        Salvando...
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={transcricao}
                    onChange={(e) => handleTranscricaoChange(e.target.value)}
                    placeholder="As informações de voz, documentos e fotos aparecerão aqui automaticamente. Você também pode digitar diretamente."
                    rows={10}
                    className="resize-none"
                  />
                  <Button
                    disabled={!transcricao.trim()}
                    className="w-full"
                    onClick={() =>
                      toast.info("Módulo de orçamento em breve!")
                    }
                  >
                    <FileText className="size-4" />
                    Gerar Orçamento
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══════════════════════════════════════
                TAB: ANOTAÇÕES
            ════════════════════════════════════════ */}
            <TabsContent value="anotacoes">
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Anotações do dentista
                    </label>
                    {salvandoAnotacoes && (
                      <span className="text-xs text-slate-400">
                        Salvando...
                      </span>
                    )}
                  </div>
                  <Textarea
                    value={anotacoes}
                    onChange={(e) => handleAnotacoesChange(e.target.value)}
                    placeholder="Observações clínicas, plano de tratamento, notas relevantes..."
                    rows={14}
                    className="resize-none"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══════════════════════════════════════
                TAB: ORÇAMENTO (placeholder)
            ════════════════════════════════════════ */}
            <TabsContent value="orcamento">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="mb-4 size-12 text-slate-300" />
                  <p className="text-slate-500">
                    Grave ou digite os procedimentos e clique em{" "}
                    <strong>Gerar Orçamento</strong> na aba Ficha.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RADIOGRAFIAS — fora das tabs, abaixo das duas colunas
      ══════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Radiografias
          </h2>
          <label
            htmlFor={rxInputId}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {uploadandoRx ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Adicionar
            <input
              id={rxInputId}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,.pdf"
              className="hidden"
              onChange={handleUploadRx}
              disabled={uploadandoRx}
            />
          </label>
        </div>

        {radiografias.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400">
            Nenhuma radiografia adicionada ainda
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {radiografias.map((rx, idx) => (
              <div
                key={rx.id}
                className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
              >
                {/* Thumbnail */}
                {signedUrls[rx.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signedUrls[rx.id]}
                    alt={rx.nome_original}
                    className="h-36 w-full object-cover cursor-pointer"
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxOpen(true);
                    }}
                  />
                ) : (
                  <div
                    className="flex h-36 cursor-pointer items-center justify-center bg-slate-100"
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxOpen(true);
                    }}
                  >
                    <ImageIcon className="size-8 text-slate-300" />
                  </div>
                )}

                {/* Overlay de ações */}
                <div className="absolute inset-0 flex flex-col justify-between bg-black/0 p-2 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                  <div className="flex justify-end">
                    <button
                      className="flex size-6 items-center justify-center rounded-full bg-white/90 text-red-500 hover:bg-red-50"
                      onClick={() => handleRemoverRx(rx)}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="flex flex-1 items-center justify-center gap-1 rounded bg-white/90 px-1 py-1 text-xs font-medium text-slate-700 hover:bg-white"
                      onClick={() => {
                        setLightboxIndex(idx);
                        setLightboxOpen(true);
                      }}
                    >
                      <ZoomIn className="size-3" />
                      Ver
                    </button>
                    <button
                      className="flex flex-1 items-center justify-center gap-1 rounded bg-white/90 px-1 py-1 text-xs font-medium text-slate-700 hover:bg-white"
                      onClick={() => {
                        setApresentacaoIndex(idx);
                        setApresentacaoOpen(true);
                      }}
                    >
                      <Presentation className="size-3" />
                      Apresentar
                    </button>
                  </div>
                </div>

                {/* Nome do arquivo */}
                <p className="truncate px-2 py-1 text-xs text-slate-500">
                  {rx.nome_original}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          LIGHTBOX
      ══════════════════════════════════════════════════════════════ */}
      {lightboxOpen && radiografias[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-h-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute -right-3 -top-3 z-10 flex size-7 items-center justify-center rounded-full bg-white text-slate-700 shadow"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="size-4" />
            </button>

            {signedUrls[radiografias[lightboxIndex].id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signedUrls[radiografias[lightboxIndex].id]}
                alt={radiografias[lightboxIndex].nome_original}
                className="max-h-[80vh] max-w-full rounded object-contain"
              />
            ) : (
              <div className="flex h-64 w-96 items-center justify-center rounded bg-slate-800">
                <ImageIcon className="size-12 text-slate-500" />
              </div>
            )}

            <p className="mt-2 text-center text-sm text-white/80">
              {radiografias[lightboxIndex].nome_original}
            </p>

            {radiografias.length > 1 && (
              <>
                <button
                  className="absolute -left-10 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40"
                  onClick={lightboxAnterior}
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  className="absolute -right-10 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40"
                  onClick={lightboxProximo}
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODO APRESENTAÇÃO
      ══════════════════════════════════════════════════════════════ */}
      {apresentacaoOpen && radiografias[apresentacaoIndex] && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          {/* Nome discreto no topo */}
          <div className="flex items-center justify-between px-6 py-3">
            <p className="text-sm text-white/40">
              {radiografias[apresentacaoIndex].nome_original}
            </p>
            <button
              className="flex size-8 items-center justify-center rounded text-white/60 hover:text-white"
              onClick={() => setApresentacaoOpen(false)}
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Imagem centralizada e maximizada */}
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

          {/* Navegação por setas */}
          {radiografias.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={apresentacaoAnterior}
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={apresentacaoProximo}
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
