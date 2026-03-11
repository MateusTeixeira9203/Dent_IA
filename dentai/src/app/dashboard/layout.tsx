import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
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

  const primeiroNome = dentista.nome.split(" ")[0] ?? dentista.nome;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <Sidebar nome={dentista.nome} clinicaNome={dentista.clinica} />
      <div className="pl-60">
        <Header nome={dentista.nome} primeiroNome={primeiroNome} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
