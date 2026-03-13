import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDentistaCached } from "@/lib/get-dentista";
import Link from "next/link";
import {
  ArrowLeft, Phone, MessageCircle, MapPin,
  Mail, Calendar, FileText,
} from "lucide-react";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button, SectionLabel } from "@/components/dentai";
import { FichasLista } from "./_components/fichas-lista";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PacienteDetalhePage({ params }: Props) {
  const { id } = await params;
  const dentista = await getDentistaCached();
  if (!dentista) redirect("/login");

  const supabase = await createClient();

  const [{ data: paciente }, { data: fichas }] = await Promise.all([
    supabase
      .from("pacientes")
      .select("*")
      .eq("id", id)
      .eq("clinica_id", dentista.clinica_id)
      .maybeSingle(),
    supabase
      .from("fichas")
      .select("id, status, created_at")
      .eq("paciente_id", id)
      .eq("clinica_id", dentista.clinica_id)
      .order("created_at", { ascending: false }),
  ]);

  if (!paciente) notFound();

  const iniciais = paciente.nome
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6 p-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pacientes">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={15} />
            Pacientes
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="font-serif text-2xl text-brand-black">{paciente.nome}</h1>
          <p className="font-mono text-xs text-brand-muted mt-0.5">
            Cadastrado em{" "}
            {format(new Date(paciente.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Layout duas colunas */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "300px 1fr" }}>

        {/* Coluna esquerda — dados do paciente */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <SectionLabel>Dados Pessoais</SectionLabel>

            {/* Avatar */}
            <div className="flex justify-center py-2">
              <div className="flex size-16 items-center justify-center rounded-full bg-teal/10 font-mono text-xl font-medium text-teal select-none">
                {iniciais}
              </div>
            </div>

            <div className="space-y-3">
              {paciente.cpf && (
                <div>
                  <p className="font-mono text-[0.65rem] uppercase tracking-widest text-brand-muted mb-0.5">CPF</p>
                  <p className="font-mono text-sm text-brand-black">{paciente.cpf}</p>
                </div>
              )}
              {paciente.data_nascimento && (
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-brand-muted shrink-0" />
                  <p className="font-mono text-sm text-brand-muted">
                    {format(new Date(paciente.data_nascimento), "dd/MM/yyyy")}
                  </p>
                </div>
              )}
              {paciente.email && (
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-brand-muted shrink-0" />
                  <p className="font-mono text-sm text-brand-muted truncate">{paciente.email}</p>
                </div>
              )}
              {paciente.telefone && (
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-brand-muted shrink-0" />
                  <p className="font-mono text-sm text-brand-muted">{paciente.telefone}</p>
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
              {(paciente.cidade || paciente.estado) && (
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-brand-muted shrink-0" />
                  <p className="font-mono text-sm text-brand-muted">
                    {[paciente.cidade, paciente.estado].filter(Boolean).join(" / ")}
                  </p>
                </div>
              )}
            </div>

            {paciente.observacoes && (
              <div className="pt-2 border-t border-brand-border">
                <p className="font-mono text-[0.65rem] uppercase tracking-widest text-brand-muted mb-1">
                  Observações
                </p>
                <p className="font-sans text-sm text-brand-muted">{paciente.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna direita — fichas */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <SectionLabel>Fichas Clínicas</SectionLabel>
              <Link href={`/dashboard/fichas/nova?paciente_id=${paciente.id}`}>
                <Button variant="outline" size="sm">
                  <FileText size={13} />
                  Nova Ficha
                </Button>
              </Link>
            </div>
            <FichasLista fichas={fichas ?? []} pacienteId={paciente.id} />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
