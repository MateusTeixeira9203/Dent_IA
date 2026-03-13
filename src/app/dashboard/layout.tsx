import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getDentistaCached } from "@/lib/get-dentista";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const dentista = await getDentistaCached();

  // Redireciona se não há sessão ou dentista cadastrado
  if (!dentista) {
    redirect("/login");
  }

  return (
    <DashboardShell
      nome={dentista.nome}
      clinicaNome={dentista.clinica}
    >
      {children}
    </DashboardShell>
  );
}
