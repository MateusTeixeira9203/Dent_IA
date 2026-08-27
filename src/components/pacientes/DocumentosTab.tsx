'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Filter,
  Search,
  Loader2,
  Upload,
  Plus,
  Camera,
  Images,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DexLoader } from '@/components/ui/dex-loader';
import { GaleriaImagens } from '@/components/fichas/galeria-imagens';
import { toast } from 'sonner';
import { toStoragePath } from '@/lib/storage/url';
import { otimizarFotoClinica, type RotacaoFoto } from '@/lib/storage/otimizar-foto-clinica';

interface Document {
  id: string;
  name: string;
  tipo: string;
  category: 'Radiografias' | 'Fotografias' | 'Documentos' | 'Outros';
  date: string;
  source: string;
  locked: boolean;
  url: string;
  storagePath: string;
}

type FotoNaFila = { id: string; arquivo: File; rotacao: RotacaoFoto };

const CATEGORIES = ['Radiografias', 'Fotografias', 'Documentos', 'Outros'] as const;

const ALLOWED_MIME: Record<string, boolean> = {
  'image/jpeg': true,
  'image/png': true,
  'image/webp': true,
  'image/gif': true,
  'image/bmp': true,
  'application/pdf': true,
  'application/msword': true,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
  'application/vnd.ms-excel': true,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
  'application/vnd.ms-powerpoint': true,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
};

const MAX_UPLOAD_SIZE = 20 * 1024 * 1024; // 20 MB

function inferMimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  return map[ext] ?? 'application/octet-stream';
}

const getCategoryFromFile = (file: File): Document['category'] => {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) return 'Fotografias';
  if (['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xls', 'xlsx'].includes(ext)) return 'Documentos';
  return 'Outros';
};

interface DocumentosTabProps {
  patientId: string;
  clinicaId: string;
  /** Autor do upload. O documento é lido pela clínica, mas só o autor edita/apaga (migration 099). */
  dentistaId: string;
}

export function DocumentosTab({ patientId, clinicaId, dentistaId }: DocumentosTabProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [soEmitidos, setSoEmitidos] = useState(false);
  const [fotosNaFila, setFotosNaFila] = useState<FotoNaFila[]>([]);
  const [indiceFotoRevisada, setIndiceFotoRevisada] = useState(0);
  const [urlPreviewFoto, setUrlPreviewFoto] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fotosInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string): void => {
    setSearchTerm(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const fetchDocuments = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('paciente_documentos')
        .select('*')
        .eq('paciente_id', patientId)
        .eq('clinica_id', clinicaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = data ?? [];

      // Extract storage paths (handles both old public URLs and new path-only values)
      const paths = rows.map((doc: Record<string, unknown>) =>
        toStoragePath(doc.url as string, 'fichas'),
      );

      // Batch-generate signed URLs for all documents (1-hour expiry)
      const { data: signedList } = paths.length > 0
        ? await supabase.storage.from('fichas').createSignedUrls(paths, 3600)
        : { data: [] };

      const signedMap = new Map<string, string>();
      (signedList ?? []).forEach((entry) => {
        if (entry.path && entry.signedUrl) signedMap.set(entry.path, entry.signedUrl);
      });

      const formattedDocs = rows.map((doc: Record<string, unknown>) => {
        const nome = doc.nome as string;
        const storagePath = toStoragePath(doc.url as string, 'fichas');
        return {
          id: doc.id as string,
          name: nome,
          tipo: inferMimeFromName(nome),
          category: doc.categoria as Document['category'],
          date: new Date(doc.created_at as string).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          source: (doc.origem as string | undefined) ?? 'Upload Direto',
          locked: doc.origem === 'aceite_assinado',
          url: signedMap.get(storagePath) ?? storagePath,
          storagePath,
        };
      });

      setDocuments(formattedDocs);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
    } finally {
      setLoading(false);
    }
  }, [patientId, clinicaId]);

  useEffect(() => {
    if (patientId) {
      void fetchDocuments();
    }
  }, [patientId, fetchDocuments]);

  const fotoEmRevisao = fotosNaFila[indiceFotoRevisada] ?? null;

  useEffect(() => {
    if (!fotoEmRevisao) {
      setUrlPreviewFoto(null);
      return;
    }
    const url = URL.createObjectURL(fotoEmRevisao.arquivo);
    setUrlPreviewFoto(url);
    return () => URL.revokeObjectURL(url);
  }, [fotoEmRevisao]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = '';

    const invalidos = files.filter(f => !ALLOWED_MIME[f.type]);
    const grandes = files.filter(f => f.size > MAX_UPLOAD_SIZE);

    if (invalidos.length > 0) {
      toast.error(`Tipo não permitido: ${invalidos.map(f => f.name).join(', ')}. Use imagens, PDF, DOC, DOCX, XLS, XLSX, PPT ou PPTX.`);
      return;
    }
    if (grandes.length > 0) {
      toast.error(`Arquivos muito grandes (máx 20 MB): ${grandes.map(f => f.name).join(', ')}`);
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    const supabase = createClient();
    const novos: Document[] = [];
    const erros: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ current: i + 1, total: files.length });

      try {
        const storagePath = `${clinicaId}/${patientId}/docs/${Date.now()}_${file.name}`;

        const { error: storageErr } = await supabase.storage
          .from('fichas')
          .upload(storagePath, file, { upsert: false });
        if (storageErr) throw storageErr;

        const { data: signedData } = await supabase.storage
          .from('fichas')
          .createSignedUrl(storagePath, 3600);
        const displayUrl = signedData?.signedUrl ?? '';

        const { data: docData, error: dbErr } = await supabase
          .from('paciente_documentos')
          .insert({
            paciente_id: patientId,
            clinica_id: clinicaId,
            dentista_id: dentistaId,
            nome: file.name,
            url: storagePath,
            categoria: getCategoryFromFile(file),
          })
          .select('id, created_at')
          .single();
        if (dbErr) throw dbErr;

        const row = docData as Record<string, unknown>;
        novos.push({
          id: row.id as string,
          name: file.name,
          tipo: file.type || inferMimeFromName(file.name),
          category: getCategoryFromFile(file),
          date: new Date(row.created_at as string).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          source: 'Upload Direto',
          locked: false,
          url: displayUrl,
          storagePath,
        });
      } catch (err) {
        console.error(`Erro no upload de ${file.name}:`, err);
        erros.push(file.name);
      }
    }

    if (novos.length > 0) {
      setDocuments(prev => [...novos.reverse(), ...prev]);
    }
    if (erros.length > 0) {
      toast.error(`Erro ao enviar: ${erros.join(', ')}`);
    }

    setIsUploading(false);
    setUploadProgress(null);
  };

  const handleFotosSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    if (files.length > 10) {
      toast.error('Selecione no máximo 10 fotos por vez.');
      return;
    }
    const invalidas = files.filter((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type));
    if (invalidas.length > 0) {
      toast.error(`Use JPEG, PNG ou WebP. Não foi possível preparar: ${invalidas.map((file) => file.name).join(', ')}.`);
      return;
    }
    const grandes = files.filter((file) => file.size > MAX_UPLOAD_SIZE);
    if (grandes.length > 0) {
      toast.error(`Fotos muito grandes (máx. 20 MB): ${grandes.map((file) => file.name).join(', ')}.`);
      return;
    }

    setFotosNaFila(files.map((arquivo) => ({ id: crypto.randomUUID(), arquivo, rotacao: 0 })));
    setIndiceFotoRevisada(0);
  };

  const girarFotoEmRevisao = (direcao: -90 | 90): void => {
    if (!fotoEmRevisao) return;
    setFotosNaFila((atual) => atual.map((foto) => {
      if (foto.id !== fotoEmRevisao.id) return foto;
      return { ...foto, rotacao: ((foto.rotacao + direcao + 360) % 360) as RotacaoFoto };
    }));
  };

  const enviarFotosClinicas = async (): Promise<void> => {
    if (fotosNaFila.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: fotosNaFila.length });
    const supabase = createClient();
    const novos: Document[] = [];
    const erros: string[] = [];

    for (let i = 0; i < fotosNaFila.length; i += 1) {
      const fotoDaFila = fotosNaFila[i];
      setUploadProgress({ current: i + 1, total: fotosNaFila.length });
      const resultado = await otimizarFotoClinica(fotoDaFila.arquivo, fotoDaFila.rotacao);
      if (!resultado.ok) {
        erros.push(fotoDaFila.arquivo.name);
        continue;
      }

      const { foto } = resultado;
      const storagePath = `${clinicaId}/${patientId}/docs/${crypto.randomUUID()}.jpg`;
      let uploadConcluido = false;
      try {
        const { error: storageErr } = await supabase.storage
          .from('fichas')
          .upload(storagePath, foto.arquivo, { contentType: 'image/jpeg', upsert: false });
        if (storageErr) throw storageErr;
        uploadConcluido = true;

        const { data: docData, error: dbErr } = await supabase
          .from('paciente_documentos')
          .insert({
            paciente_id: patientId,
            clinica_id: clinicaId,
            dentista_id: dentistaId,
            nome: foto.nomeExibicao,
            url: storagePath,
            categoria: 'Fotografias',
          })
          .select('id, created_at')
          .single();
        if (dbErr) throw dbErr;

        const { data: signedData } = await supabase.storage.from('fichas').createSignedUrl(storagePath, 3600);
        const row = docData as Record<string, unknown>;
        novos.push({
          id: row.id as string,
          name: foto.nomeExibicao,
          tipo: 'image/jpeg',
          category: 'Fotografias',
          date: new Date(row.created_at as string).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
          source: 'Upload Direto',
          locked: false,
          url: signedData?.signedUrl ?? '',
          storagePath,
        });
      } catch (error) {
        console.error(`Erro no upload de ${foto.nomeExibicao}:`, error);
        if (uploadConcluido) await supabase.storage.from('fichas').remove([storagePath]);
        erros.push(foto.nomeExibicao);
      }
    }

    if (novos.length > 0) setDocuments((atual) => [...novos.reverse(), ...atual]);
    if (erros.length > 0) toast.error(`Não foi possível enviar: ${erros.join(', ')}.`);
    if (novos.length > 0 && erros.length === 0) toast.success(`${novos.length} foto${novos.length > 1 ? 's enviadas' : ' enviada'} com sucesso.`);
    setFotosNaFila([]);
    setIndiceFotoRevisada(0);
    setIsUploading(false);
    setUploadProgress(null);
  };

  const handleDeleteDoc = async (docId: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    const doc = documents.find(d => d.id === docId);
    if (doc?.locked) {
      toast.error('Documento assinado é imutável e não pode ser apagado por aqui.');
      return;
    }
    if (!doc || !window.confirm(`Excluir "${doc.name}"?`)) return;

    try {
      const supabase = createClient();
      const { storagePath } = doc;

      // R-35 item 4 — apaga a linha primeiro e confere .select(): RLS pode barrar sem
      // devolver erro (0 linhas). Só remove do storage se a linha realmente saiu, senão o
      // documento de outro autor ficava listado com URL morta (arquivo já apagado, linha não).
      const { data: apagado, error: deleteErr } = await supabase
        .from('paciente_documentos')
        .delete()
        .eq('id', docId)
        .select('id');

      if (deleteErr) throw deleteErr;

      if (!apagado?.length) {
        toast.error('Sem permissão para apagar este documento.');
        return;
      }

      if (storagePath) {
        await supabase.storage.from('fichas').remove([storagePath]);
      }

      setDocuments(prev => prev.filter(d => d.id !== docId));
      setSelecionados(prev => prev.filter(id => id !== docId));
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      toast.error('Erro ao excluir documento. Tente novamente.');
    }
  };

  const filteredDocs = documents.filter(doc => {
    if (filterMonth && !doc.date.includes(filterMonth)) return false;
    if (filterYear && !doc.date.includes(filterYear)) return false;
    if (soEmitidos && doc.source !== 'emitido' && doc.source !== 'aceite_assinado') return false;
    if (debouncedSearch && !doc.name.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    return true;
  });

  const years = Array.from(new Set(documents.map(d => d.date.split(' ')[2]))).sort().reverse();
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <div className="space-y-8">
      {/* Input oculto para upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handleFotosSelect}
      />
      <input
        ref={fotosInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFotosSelect}
      />

      {/* Filtros e ações */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-semibold text-text-primary">Filtrar por:</span>
          </div>

          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="min-h-11 flex-1 rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-xs font-bold text-text-primary outline-none transition-colors focus:border-teal sm:min-h-0 sm:flex-none"
          >
            <option value="">Todos os Meses</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="min-h-11 flex-1 rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-xs font-bold text-text-primary outline-none transition-colors focus:border-teal sm:min-h-0 sm:flex-none"
          >
            <option value="">Todos os Anos</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {(filterMonth || filterYear) && (
            <button
              onClick={() => { setFilterMonth(''); setFilterYear(''); }}
              className="min-h-11 px-1 text-xs font-bold text-red-500 transition-colors hover:text-red-600 sm:min-h-0"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
          {/* Botão de modo seleção */}
          <button
            onClick={() => setSoEmitidos((s) => !s)}
            className={`min-h-11 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors sm:min-h-0 ${
              soEmitidos
                ? 'bg-teal text-white'
                : 'bg-surface-alt text-text-secondary hover:bg-border'
            }`}
          >
            Emitidos
          </button>

          <button
            onClick={() => { setModoSelecao(!modoSelecao); if (modoSelecao) setSelecionados([]); }}
            className={`min-h-11 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors sm:min-h-0 ${
              modoSelecao
                ? 'bg-teal text-white'
                : 'bg-surface-alt text-text-secondary hover:bg-border'
            }`}
          >
            {modoSelecao ? `${selecionados.length} selecionado(s)` : 'Selecionar'}
          </button>

          <div className="relative order-first w-full basis-full sm:order-none sm:basis-auto sm:w-64">
            <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar arquivo..."
              className="min-h-11 w-full rounded-lg border border-border bg-surface-alt py-1.5 pl-9 pr-4 text-xs font-medium text-text-primary outline-none transition-colors focus:border-teal sm:min-h-0"
            />
          </div>

          <div className="grid w-full basis-full grid-cols-3 gap-2 sm:w-auto sm:basis-auto sm:flex sm:gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || fotosNaFila.length > 0}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-teal px-2 py-1.5 text-center text-xs font-bold text-white transition-colors hover:bg-teal-lt disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:px-3"
            >
              {isUploading && uploadProgress ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {uploadProgress.current}/{uploadProgress.total}</> : isUploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...</> : <><Plus className="h-3.5 w-3.5 shrink-0" /> Adicionar</>}
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading || fotosNaFila.length > 0}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-teal/30 px-2 py-1.5 text-center text-xs font-bold text-teal-ink transition-colors hover:bg-teal/10 disabled:opacity-50 sm:min-h-0 sm:px-3"
            >
              <Camera className="h-3.5 w-3.5 shrink-0" /> Tirar foto
            </button>
            <button
              onClick={() => fotosInputRef.current?.click()}
              disabled={isUploading || fotosNaFila.length > 0}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-teal/30 px-2 py-1.5 text-center text-xs font-bold text-teal-ink transition-colors hover:bg-teal/10 disabled:opacity-50 sm:min-h-0 sm:px-3"
            >
              <Images className="h-3.5 w-3.5 shrink-0" /> Selecionar fotos
            </button>
          </div>
        </div>
      </div>

      {fotoEmRevisao && (
        <div className="rounded-2xl border border-teal/30 bg-surface p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-text-primary">Revisar fotos clínicas</p>
              <p className="text-xs text-text-secondary mt-0.5">Foto {indiceFotoRevisada + 1} de {fotosNaFila.length} · será reduzida para até 2048 px antes do envio.</p>
            </div>
            <button onClick={() => { setFotosNaFila([]); setIndiceFotoRevisada(0); }} className="text-xs font-semibold text-text-secondary hover:text-text-primary">Cancelar</button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {urlPreviewFoto && (
              <>
                {/* URL de objeto local: Next/Image não consegue otimizar um arquivo ainda não enviado. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlPreviewFoto}
                  alt={`Prévia de ${fotoEmRevisao.arquivo.name}`}
                  className="h-40 w-full sm:w-56 rounded-xl border border-border object-contain bg-surface-alt transition-transform"
                  style={{ transform: `rotate(${fotoEmRevisao.rotacao}deg)` }}
                />
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => girarFotoEmRevisao(-90)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-alt"><RotateCcw className="w-3.5 h-3.5" /> Girar à esquerda</button>
              <button onClick={() => girarFotoEmRevisao(90)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-alt"><RotateCw className="w-3.5 h-3.5" /> Girar à direita</button>
              {fotosNaFila.length > 1 && <>
                <button disabled={indiceFotoRevisada === 0} onClick={() => setIndiceFotoRevisada((indice) => indice - 1)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs font-semibold disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5" /> Anterior</button>
                <button disabled={indiceFotoRevisada === fotosNaFila.length - 1} onClick={() => setIndiceFotoRevisada((indice) => indice + 1)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs font-semibold disabled:opacity-40">Próxima <ChevronRight className="w-3.5 h-3.5" /></button>
              </>}
              <button onClick={() => void enviarFotosClinicas()} disabled={isUploading} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal text-white text-xs font-bold hover:bg-teal-lt disabled:opacity-50"><Upload className="w-3.5 h-3.5" /> Enviar {fotosNaFila.length} foto{fotosNaFila.length > 1 ? 's' : ''}</button>
            </div>
          </div>
        </div>
      )}

      {/* Categorias com galeria */}
      {loading ? (
        <DexLoader className="p-20" />
      ) : (
        CATEGORIES.map(category => {
          const docsInCategory = filteredDocs.filter(d => d.category === category);
          if (docsInCategory.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <h3 className="font-heading text-lg text-text-primary px-2">{category}</h3>
                <div className="h-px flex-1 bg-border" />
              </div>

              <GaleriaImagens
                documentos={docsInCategory.map(d => ({
                  id: d.id,
                  nome: d.name,
                  url: d.url,
                  tipo: d.tipo,
                  date: d.date,
                  locked: d.locked,
                }))}
                selecionados={selecionados}
                onSelecionar={setSelecionados}
                modoSelecao={modoSelecao}
                onDelete={handleDeleteDoc}
              />
            </div>
          );
        })
      )}

      {!loading && filteredDocs.length === 0 && (
        <div className="bg-surface rounded-2xl border border-border p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-surface-alt flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-text-secondary" />
          </div>
          <h3 className="font-heading text-xl text-text-primary mb-2">Nenhum documento encontrado</h3>
          <p className="text-text-secondary text-sm max-w-xs">
            Não existem arquivos nesta categoria ou para o período selecionado.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-teal text-white rounded-xl text-sm font-bold hover:bg-teal-lt transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" /> Adicionar Primeiro Documento
          </button>
        </div>
      )}
    </div>
  );
}
