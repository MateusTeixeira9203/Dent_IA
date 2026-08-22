'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type SignaturePadLib from 'signature_pad';
import { CheckCircle2, FileSignature, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { emitirAceiteClinico, listarContextoAceite, type ContextoAceite } from '@/app/dashboard/pacientes/[id]/aceites-actions';

const SignaturePad = dynamic(
  () => import('@/components/fichas/SignaturePad').then((module) => module.SignaturePad),
  { ssr: false },
);

type TipoAceite = 'tcle';
type Etapa = 'dados' | 'revisar' | 'salvando' | 'pronto';
type Campo = 'justificativa' | 'explicacao' | 'alternativas' | 'riscos' | 'consequencias' | 'orientacoes' | 'intercorrencia' | 'retorno';

type Props = {
  open: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
};

type CampoConfig = { id: Campo; label: string; placeholder: string; optional?: boolean };

const CAMPOS_TCLE: CampoConfig[] = [
  { id: 'justificativa', label: 'Por que foi indicado?', placeholder: 'Explique em linguagem acessível.' },
  { id: 'explicacao', label: 'Como será feito?', placeholder: 'Descreva o procedimento para o paciente.' },
  { id: 'alternativas', label: 'Alternativas apresentadas', placeholder: 'Inclua alternativas e suas consequências.' },
  { id: 'riscos', label: 'Riscos e complicações possíveis', placeholder: 'Registre os riscos específicos explicados.' },
  { id: 'consequencias', label: 'Consequências de não realizar', placeholder: 'O que pode ocorrer sem o tratamento.' },
  { id: 'orientacoes', label: 'Orientações e cuidados', placeholder: 'Cuidados e canal de contato.' },
];

function labelEvento(evento: { tipo: string; dente: number | null; observacao: string | null }): string {
  const dente = evento.dente ? ` — dente ${evento.dente}` : '';
  return `${evento.tipo}${dente}${evento.observacao?.trim() ? ` · ${evento.observacao.trim()}` : ''}`;
}

export function EmitirAceiteModal({ open, onClose, patientId, patientName }: Props) {
  const padRef = useRef<SignaturePadLib | null>(null);
  const [contexto, setContexto] = useState<ContextoAceite | null>(null);
  const [loadingContexto, setLoadingContexto] = useState(false);
  const tipo: TipoAceite = 'tcle';
  const [fichaId, setFichaId] = useState('');
  const [eventoIds, setEventoIds] = useState<string[]>([]);
  const [assinadoPor, setAssinadoPor] = useState(patientName);
  const [temRepresentante, setTemRepresentante] = useState(false);
  const [representanteNome, setRepresentanteNome] = useState('');
  const [representanteCpf, setRepresentanteCpf] = useState('');
  const [campos, setCampos] = useState<Record<Campo, string>>({
    justificativa: '', explicacao: '', alternativas: '', riscos: '', consequencias: '', orientacoes: '', intercorrencia: '', retorno: '',
  });
  const [etapa, setEtapa] = useState<Etapa>('dados');
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    void Promise.resolve().then(async () => {
      setLoadingContexto(true);
      const resultado = await listarContextoAceite(patientId);
      if (!ativo) return;
      setLoadingContexto(false);
      if ('error' in resultado) {
        toast.error(resultado.error);
        return;
      }
      setContexto(resultado);
    });
    return () => { ativo = false; };
  }, [open, patientId]);

  const ficha = useMemo(
    () => contexto?.fichas.find((item) => item.id === fichaId) ?? null,
    [contexto, fichaId],
  );
  const eventosElegiveis = useMemo(
    () => ficha?.eventos.filter((evento) => evento.status !== 'realizado') ?? [],
    [ficha],
  );
  const camposAtivos = CAMPOS_TCLE;

  const resetar = (): void => {
    setFichaId(''); setEventoIds([]); setAssinadoPor(patientName);
    setTemRepresentante(false); setRepresentanteNome(''); setRepresentanteCpf('');
    setCampos({ justificativa: '', explicacao: '', alternativas: '', riscos: '', consequencias: '', orientacoes: '', intercorrencia: '', retorno: '' });
    setEtapa('dados'); setSignedUrl(null); onClose();
  };

  const selecionarFicha = (id: string): void => {
    setFichaId(id);
    setEventoIds([]);
  };

  const podeRevisar = fichaId !== ''
    && eventoIds.length > 0
    && assinadoPor.trim().length >= 2
    && (!temRepresentante || representanteNome.trim().length >= 2)
    && camposAtivos.every((campo) => campo.optional || campos[campo.id].trim().length >= 3);

  const finalizar = async (): Promise<void> => {
    if (!padRef.current || padRef.current.isEmpty()) {
      toast.error('Peça ao paciente para assinar antes de finalizar.');
      return;
    }
    setEtapa('salvando');
    const resultado = await emitirAceiteClinico({
      tipo,
      pacienteId: patientId,
      fichaId,
      eventoIds,
      assinadoPor: assinadoPor.trim(),
      assinaturaDataUrl: padRef.current.toDataURL('image/png'),
      representante: temRepresentante ? { nome: representanteNome.trim(), cpf: representanteCpf.trim() || undefined } : null,
      campos,
    });
    if (resultado.error) {
      setEtapa('revisar');
      toast.error(resultado.error);
      return;
    }
    setSignedUrl(resultado.signedUrl ?? null);
    setEtapa('pronto');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[135] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={resetar}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal/10 text-teal"><FileSignature className="h-4 w-4" /></div>
            <div><h2 className="font-heading text-lg font-semibold text-text-primary">TCLE do paciente</h2><p className="text-xs text-text-secondary">{patientName}</p></div>
          </div>
          <button type="button" onClick={resetar} className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary" aria-label="Fechar"><X className="h-4 w-4" /></button>
        </header>

        {etapa === 'dados' && (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <div className="rounded-xl border border-teal/30 bg-teal/5 p-3 text-sm">
              <p className="font-semibold text-teal-ink">TCLE — antes do procedimento</p>
              <p className="mt-1 text-text-secondary">A conclusão dos procedimentos realizados nasce da assinatura coletada no prontuário.</p>
            </div>

            {loadingContexto ? <div className="flex items-center gap-2 py-8 text-sm text-text-secondary"><Loader2 className="h-4 w-4 animate-spin" /> Carregando fichas...</div> : (
              <>
                <label className="block space-y-1.5 text-sm font-semibold text-text-primary">Ficha
                  <select value={fichaId} onChange={(event) => selecionarFicha(event.target.value)} className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2.5 text-sm font-normal text-text-primary outline-none focus:border-teal">
                    <option value="">Selecione a ficha</option>
                    {(contexto?.fichas ?? []).map((item) => <option key={item.id} value={item.id}>{new Date(`${item.dataAtendimento}T12:00:00`).toLocaleDateString('pt-BR')}</option>)}
                  </select>
                </label>

                {ficha && <div className="space-y-2"><p className="text-sm font-semibold text-text-primary">Procedimento</p>
                  {eventosElegiveis.length === 0 ? <p className="rounded-xl bg-surface-alt p-3 text-sm text-text-secondary">Nenhum procedimento elegível nesta ficha.</p> : eventosElegiveis.map((evento) => (
                    <label key={evento.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-alt p-3 text-sm text-text-primary">
                      <input type="radio" name="evento-aceite" checked={eventoIds.includes(evento.id)} onChange={() => setEventoIds([evento.id])} className="mt-0.5 accent-teal" />
                      <span>{labelEvento(evento)}</span>
                    </label>
                  ))}
                </div>}
              </>
            )}

            {camposAtivos.map((campo) => <label key={campo.id} className="block space-y-1.5 text-sm font-semibold text-text-primary">{campo.label}{campo.optional ? ' (opcional)' : ' *'}
              <textarea value={campos[campo.id]} rows={3} placeholder={campo.placeholder} onChange={(event) => setCampos((atual) => ({ ...atual, [campo.id]: event.target.value }))} className="w-full resize-none rounded-xl border border-border bg-surface-alt px-3 py-2.5 text-sm font-normal text-text-primary outline-none placeholder:text-text-secondary/60 focus:border-teal" />
            </label>)}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text-primary"><input type="checkbox" checked={temRepresentante} onChange={(event) => setTemRepresentante(event.target.checked)} className="h-4 w-4 accent-teal" /> Assina como representante legal</label>
            {temRepresentante && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="block space-y-1.5 text-sm font-semibold text-text-primary">Nome do representante *<input value={representanteNome} onChange={(event) => setRepresentanteNome(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-surface-alt px-3 py-2.5 text-sm font-normal text-text-primary outline-none focus:border-teal" /></label><label className="block space-y-1.5 text-sm font-semibold text-text-primary">CPF do representante<input value={representanteCpf} onChange={(event) => setRepresentanteCpf(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-surface-alt px-3 py-2.5 text-sm font-normal text-text-primary outline-none focus:border-teal" /></label></div>}
            <label className="block space-y-1.5 text-sm font-semibold text-text-primary">Nome de quem assina *
              <input value={assinadoPor} onChange={(event) => setAssinadoPor(event.target.value)} className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2.5 text-sm font-normal text-text-primary outline-none focus:border-teal" placeholder="Paciente ou responsável" />
            </label>
          </div>
        )}

        {etapa === 'revisar' && <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div className="rounded-xl border border-teal/30 bg-teal/5 p-4 text-sm text-text-primary"><p className="font-bold">Revise com o paciente antes de assinar</p><p className="mt-1 text-text-secondary">O PDF final vai congelar os dados exibidos aqui.</p></div>
          <div className="space-y-2 rounded-xl border border-border bg-surface-alt p-4 text-sm text-text-primary"><p className="font-semibold">TCLE pré-procedimento</p>{eventoIds.map((id) => { const evento = ficha?.eventos.find((item) => item.id === id); return evento ? <p key={id}>• {labelEvento(evento)}</p> : null; })}</div>
          {temRepresentante && <div className="rounded-xl border border-border p-3 text-sm text-text-primary"><p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Representante legal</p><p className="mt-1">{representanteNome}{representanteCpf ? ` — CPF ${representanteCpf}` : ''}</p></div>}
          {camposAtivos.map((campo) => <div key={campo.id} className="rounded-xl border border-border p-3"><p className="text-xs font-bold uppercase tracking-wider text-text-secondary">{campo.label}</p><p className="mt-1 whitespace-pre-line text-sm text-text-primary">{campos[campo.id] || '—'}</p></div>)}
          <div className="space-y-2"><p className="text-sm font-semibold text-text-primary">Assinatura do paciente *</p><SignaturePad padRef={padRef} /></div>
        </div>}

        {etapa === 'salvando' && <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-sm text-text-secondary"><Loader2 className="h-7 w-7 animate-spin text-teal" /> Finalizando documento...</div>}
        {etapa === 'pronto' && <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center"><CheckCircle2 className="h-10 w-10 text-teal" /><div><p className="font-semibold text-text-primary">Documento assinado e salvo.</p><p className="mt-1 text-sm text-text-secondary">Ele já está disponível em Arquivos.</p></div>{signedUrl && <a href={signedUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-lt">Abrir PDF</a>}</div>}

        {etapa !== 'salvando' && etapa !== 'pronto' && <footer className="flex gap-3 border-t border-border px-5 py-4">
          <button type="button" onClick={etapa === 'dados' ? resetar : () => setEtapa('dados')} className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-text-primary hover:bg-surface-alt">{etapa === 'dados' ? 'Cancelar' : 'Voltar'}</button>
          <button type="button" disabled={etapa === 'dados' ? !podeRevisar : false} onClick={() => etapa === 'dados' ? setEtapa('revisar') : void finalizar()} className="flex-1 rounded-xl bg-teal px-4 py-3 text-sm font-bold text-white hover:bg-teal-lt disabled:cursor-not-allowed disabled:opacity-40">{etapa === 'dados' ? 'Revisar documento' : 'Assinar e finalizar'}</button>
        </footer>}
        {etapa === 'pronto' && <footer className="border-t border-border p-4"><button type="button" onClick={resetar} className="w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold text-text-primary hover:bg-surface-alt">Concluir</button></footer>}
      </div>
    </div>
  );
}
