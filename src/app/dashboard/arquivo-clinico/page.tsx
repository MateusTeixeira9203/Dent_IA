import Link from 'next/link';
import { Download, FileText, Settings } from 'lucide-react';
import { requireClinicContext } from '@/server/auth/clinic';
import { PageContainer } from '@/components/layout/page-container';
import { PageTransition } from '@/components/layout/page-transition';

export default async function ArquivoClinicoPage() {
  const { clinicId, supabase } = await requireClinicContext();
  const { data: pacientes, error } = await supabase
    .from('pacientes')
    .select('id, nome')
    .eq('clinica_id', clinicId)
    .order('nome');

  return (
    <PageTransition>
      <PageContainer variant="wide">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-teal">Somente leitura</p>
            <h1 className="font-heading text-3xl font-bold text-text-primary">Arquivo clínico</h1>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              Seus dados continuam preservados. Enquanto a clínica regulariza o plano, você pode ler e exportar cada prontuário em PDF.
            </p>
          </div>
          <Link
            href="/dashboard/configuracoes?aba=clinica"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-alt"
          >
            <Settings className="size-4" /> Regularizar clínica
          </Link>
        </header>

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
            Não foi possível carregar o arquivo clínico. Tente novamente.
          </div>
        ) : pacientes?.length ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {pacientes.map((paciente) => (
              <div key={paciente.id} className="flex flex-col gap-3 border-b border-border p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal">
                    <FileText className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-text-primary">{paciente.nome}</p>
                    <p className="text-xs text-text-secondary">Prontuário completo em modo de leitura</p>
                  </div>
                </div>
                <a
                  href={`/api/pacientes/${paciente.id}/prontuario`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal px-4 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  <Download className="size-4" /> Abrir PDF
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-text-secondary">
            Nenhum prontuário encontrado nesta clínica.
          </div>
        )}
      </PageContainer>
    </PageTransition>
  );
}
