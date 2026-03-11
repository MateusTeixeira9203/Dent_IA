import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, FileText, Receipt, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { getDentistaCached } from "@/lib/get-dentista";
import { Separator } from "@/components/ui/separator";

// Saudação baseada no horário do servidor
function getSaudacao(): string {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

function getIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

interface FichaRecente {
  id: string;
  created_at: string;
  paciente_nome: string;
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const dentista = await getDentistaCached();
  if (!dentista) redirect("/login");

  const supabase = await createClient();
  const saudacao = getSaudacao();
  const primeiroNome = dentista.nome.split(" ")[0] ?? dentista.nome;

  // Todas as queries em paralelo
  const [
    { count: totalPacientes },
    { count: fichasAbertas },
    { count: orcamentosPendentes },
    { data: fichasRaw },
  ] = await Promise.all([
    supabase
      .from("pacientes")
      .select("*", { count: "exact", head: true })
      .eq("clinica_id", dentista.clinica_id),
    supabase
      .from("fichas")
      .select("*", { count: "exact", head: true })
      .eq("clinica_id", dentista.clinica_id)
      .eq("status", "aberta"),
    supabase
      .from("orcamentos")
      .select("*", { count: "exact", head: true })
      .eq("clinica_id", dentista.clinica_id)
      .eq("status", "enviado"),
    supabase
      .from("fichas")
      .select("id, created_at, pacientes(nome)")
      .eq("clinica_id", dentista.clinica_id)
      .eq("status", "aberta")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Normaliza atividade recente extraindo nome do paciente do join
  const atividades: FichaRecente[] = (fichasRaw ?? []).map((f) => {
    const p = f.pacientes;
    const nome =
      Array.isArray(p) && p[0]
        ? (p[0] as { nome: string }).nome
        : p && typeof p === "object" && "nome" in p
          ? (p as { nome: string }).nome
          : "—";
    return { id: f.id as string, created_at: f.created_at as string, paciente_nome: nome };
  });

  return (
    <div className="space-y-8">
      {/* Cabeçalho da página */}
      <div>
        <p
          className="font-mono text-[0.65rem] uppercase tracking-[0.15em] mb-1"
          style={{ color: "var(--gray-mid)" }}
        >
          Visão Geral
        </p>
        <h1 className="font-serif text-2xl text-foreground leading-tight">
          {saudacao}, Dr. {primeiroNome} 👋
        </h1>
      </div>

      <Separator />

      {/* Cards de métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/pacientes" className="group block">
          <div
            className="rounded-lg border p-6 space-y-4 transition-colors group-hover:border-teal"
            style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border-brand)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="font-mono text-[0.65rem] uppercase tracking-[0.15em]"
                style={{ color: "var(--gray-mid)" }}
              >
                Pacientes
              </span>
              <Users className="size-4" style={{ color: "var(--gray-mid)" }} />
            </div>
            <span className="block font-mono text-[2rem] font-medium leading-none text-foreground">
              {totalPacientes ?? 0}
            </span>
            <span className="block font-sans text-xs" style={{ color: "var(--gray-mid)" }}>
              cadastrados
            </span>
          </div>
        </Link>

        <Link href="/dashboard/fichas" className="group block">
          <div
            className="rounded-lg border p-6 space-y-4 transition-colors group-hover:border-teal"
            style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border-brand)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="font-mono text-[0.65rem] uppercase tracking-[0.15em]"
                style={{ color: "var(--gray-mid)" }}
              >
                Fichas Abertas
              </span>
              <FileText className="size-4" style={{ color: "var(--gray-mid)" }} />
            </div>
            <span className="block font-mono text-[2rem] font-medium leading-none text-foreground">
              {fichasAbertas ?? 0}
            </span>
            <span className="block font-sans text-xs" style={{ color: "var(--gray-mid)" }}>
              em andamento
            </span>
          </div>
        </Link>

        <Link href="/dashboard/orcamentos" className="group block">
          <div
            className="rounded-lg border p-6 space-y-4 transition-colors group-hover:border-teal"
            style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border-brand)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="font-mono text-[0.65rem] uppercase tracking-[0.15em]"
                style={{ color: "var(--gray-mid)" }}
              >
                Orçamentos Pendentes
              </span>
              <Receipt className="size-4" style={{ color: "var(--gray-mid)" }} />
            </div>
            <span className="block font-mono text-[2rem] font-medium leading-none text-foreground">
              {orcamentosPendentes ?? 0}
            </span>
            <span className="block font-sans text-xs" style={{ color: "var(--gray-mid)" }}>
              aguardando aprovação
            </span>
          </div>
        </Link>
      </div>

      {/* Atividade Recente */}
      <div className="space-y-4">
        <h2 className="font-sans font-medium text-base text-foreground">
          Atividade Recente
        </h2>
        <Separator />

        {atividades.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 gap-3"
            style={{ color: "var(--gray-mid)" }}
          >
            <FileText className="size-8 opacity-40" />
            <p className="font-sans text-sm">Nenhuma atividade ainda</p>
          </div>
        ) : (
          <div
            className="rounded-lg border divide-y overflow-hidden"
            style={{ borderColor: "var(--border-brand)", backgroundColor: "var(--card-bg)" }}
          >
            {atividades.map((ficha) => (
              <div key={ficha.id} className="flex items-center gap-4 px-4 py-3">
                {/* Avatar com iniciais */}
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--teal) 15%, transparent)",
                    color: "var(--teal)",
                  }}
                >
                  {getIniciais(ficha.paciente_nome)}
                </div>

                {/* Nome e data */}
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-medium text-sm text-foreground truncate">
                    {ficha.paciente_nome}
                  </p>
                  <p className="font-mono text-[0.7rem]" style={{ color: "var(--gray-mid)" }}>
                    {format(new Date(ficha.created_at), "dd MMM yyyy", { locale: ptBR })}
                  </p>
                </div>

                {/* Badge status */}
                <span
                  className="hidden sm:inline font-mono text-[0.6rem] uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--teal) 12%, transparent)",
                    color: "var(--teal)",
                  }}
                >
                  aberta
                </span>

                {/* Link Ver */}
                <Link
                  href={`/dashboard/fichas/${ficha.id}`}
                  className="flex items-center gap-1 font-sans text-xs font-medium transition-opacity hover:opacity-60 shrink-0"
                  style={{ color: "var(--teal)" }}
                >
                  Ver
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
