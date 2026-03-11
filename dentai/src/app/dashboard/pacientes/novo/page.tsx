"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
} from "@/components/dentai";
import { Textarea } from "@/components/ui/textarea";
import { createPaciente } from "./actions";

// ── Máscaras ──────────────────────────────────────────────────────
function mascaraCPF(valor: string): string {
  return valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function mascaraTelefone(valor: string): string {
  const digits = valor.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

// ── Schema Zod ────────────────────────────────────────────────────
const pacienteSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cpf: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Email inválido"
    ),
  telefone: z.string().optional(),
  data_nascimento: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  whatsapp: z.string().optional(),
  observacoes: z.string().optional(),
});

type PacienteFormData = z.infer<typeof pacienteSchema>;

export default function NovoPacientePage(): React.JSX.Element {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [whatsappIgualTelefone, setWhatsappIgualTelefone] = useState(false);
  const [cpfValue, setCpfValue] = useState("");
  const [telefoneValue, setTelefoneValue] = useState("");
  const [whatsappValue, setWhatsappValue] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      nome: "",
      cpf: "",
      email: "",
      telefone: "",
      data_nascimento: "",
      endereco: "",
      cidade: "",
      estado: "",
      whatsapp: "",
      observacoes: "",
    },
  });

  // Sincroniza WhatsApp com telefone quando checkbox está marcado
  useEffect(() => {
    if (whatsappIgualTelefone) {
      setWhatsappValue(telefoneValue);
      setValue("whatsapp", telefoneValue);
    }
  }, [whatsappIgualTelefone, telefoneValue, setValue]);

  function handleCPFChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const masked = mascaraCPF(e.target.value);
    setCpfValue(masked);
    setValue("cpf", masked);
  }

  function handleTelefoneChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const masked = mascaraTelefone(e.target.value);
    setTelefoneValue(masked);
    setValue("telefone", masked);
    if (whatsappIgualTelefone) {
      setWhatsappValue(masked);
      setValue("whatsapp", masked);
    }
  }

  function handleWhatsappChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const masked = mascaraTelefone(e.target.value);
    setWhatsappValue(masked);
    setValue("whatsapp", masked);
  }

  async function onSubmit(data: PacienteFormData): Promise<void> {
    setIsSubmitting(true);
    try {
      const result = await createPaciente({
        nome: data.nome,
        cpf: data.cpf ?? null,
        email: data.email ?? null,
        telefone: data.telefone ?? null,
        data_nascimento: data.data_nascimento ?? null,
        endereco: data.endereco ?? null,
        cidade: data.cidade ?? null,
        estado: data.estado ?? null,
        whatsapp: data.whatsapp ?? null,
        observacoes: data.observacoes ?? null,
      });

      if (result.success) {
        toast.success("Paciente cadastrado com sucesso!");
        router.push("/dashboard/pacientes");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao cadastrar paciente");
      }
    } catch {
      toast.error("Erro inesperado ao cadastrar paciente");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pacientes">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={15} />
            Voltar
          </Button>
        </Link>
        <h1 className="font-serif text-3xl text-brand-black">Novo Paciente</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* ── Dados Pessoais ── */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nome */}
            <Input
              label="Nome completo *"
              placeholder="Ex: Maria da Silva"
              error={errors.nome?.message}
              {...register("nome")}
            />

            {/* CPF + Data de nascimento */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-700">CPF</label>
                <input
                  value={cpfValue}
                  onChange={handleCPFChange}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  className="w-full font-mono text-sm px-3 py-2.5 rounded-[3px] border border-brand-border bg-brand-bg text-brand-black focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal placeholder:text-brand-muted/60 transition-colors"
                />
              </div>
              <Input
                label="Data de nascimento"
                type="date"
                {...register("data_nascimento")}
              />
            </div>

            {/* Email + Telefone */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Email"
                type="email"
                placeholder="email@exemplo.com"
                error={errors.email?.message}
                {...register("email")}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-700">Telefone</label>
                <input
                  value={telefoneValue}
                  onChange={handleTelefoneChange}
                  placeholder="(00) 00000-0000"
                  inputMode="numeric"
                  className="w-full font-mono text-sm px-3 py-2.5 rounded-[3px] border border-brand-border bg-brand-bg text-brand-black focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal placeholder:text-brand-muted/60 transition-colors"
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700">WhatsApp</label>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-brand-muted">
                  <input
                    type="checkbox"
                    checked={whatsappIgualTelefone}
                    onChange={(e) => setWhatsappIgualTelefone(e.target.checked)}
                    className="size-3.5 rounded border-brand-border accent-teal"
                  />
                  Mesmo que telefone
                </label>
              </div>
              <input
                value={whatsappValue}
                onChange={handleWhatsappChange}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                disabled={whatsappIgualTelefone}
                className="w-full font-mono text-sm px-3 py-2.5 rounded-[3px] border border-brand-border bg-brand-bg text-brand-black focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal placeholder:text-brand-muted/60 transition-colors disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Endereço ── */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Endereço"
              placeholder="Rua, número, complemento"
              {...register("endereco")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Cidade"
                placeholder="Cidade"
                {...register("cidade")}
              />
              <Input
                label="Estado"
                placeholder="UF"
                maxLength={2}
                {...register("estado")}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Observações ── */}
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register("observacoes")}
              placeholder="Alergias, condições especiais, observações..."
              rows={4}
              className="font-sans text-sm border-brand-border bg-brand-bg focus:border-teal focus:ring-teal/30 resize-none"
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={isSubmitting}
        >
          Salvar Paciente
        </Button>
      </form>
    </div>
  );
}
