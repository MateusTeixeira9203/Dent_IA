import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireClinicContext } from "@/server/auth/clinic";
import { getDentistaCached } from "@/lib/get-dentista";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { WelcomeModal } from "./_components/welcome-modal";

const ROTA_PROTETICO = "/dashboard/protetico";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { clinicId, user, supabase } = await requireClinicContext();

  const dentista = await getDentistaCached();

  if (!dentista) {
    redirect("/onboarding");
  }

  // R-94 — gate de ponto único: protético só acessa a própria agenda. A permissão do
  // projeto é deny-list sem exhaustive check (63 arquivos com gate negativo, nenhum
  // pego pelo compilador) — em vez de auditar todos, um choke point aqui garante que
  // qualquer rota (existente ou futura) fica bloqueada por padrão pra esse role.
  if (dentista.role === "protetico") {
    const pathname = (await headers()).get("x-pathname") ?? "";
    if (pathname !== ROTA_PROTETICO && !pathname.startsWith(`${ROTA_PROTETICO}/`)) {
      redirect(ROTA_PROTETICO);
    }
  }

  // Guard: secretária com must_change_password = true deve definir senha antes de entrar.
  if (dentista.role === "secretaria") {
    const { data: sec } = await supabase
      .from("secretarias")
      .select("must_change_password")
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (sec?.must_change_password) redirect("/primeiro-acesso");
  }

  if (
    dentista.status_assinatura === "trial" &&
    dentista.trial_ends_at &&
    new Date(dentista.trial_ends_at) < new Date()
  ) {
    redirect("/planos?expired=1");
  }

  return (
    <DashboardShell
      nome={dentista.nome}
      clinicaNome={dentista.clinica}
      activeClinicId={clinicId}
      role={dentista.role}
      avatarUrl={dentista.avatar_url}
      plano={dentista.plano}
      dentistaId={dentista.id}
    >
      {children}
      <WelcomeModal clinicaNome={dentista.clinica} />
    </DashboardShell>
  );
}
