"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { createPaciente } from "./actions";

// Máscara de CPF: 000.000.000-00
function mascaraCPF(valor: string): string {
  return valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// Máscara de telefone: (00) 00000-0000
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

export default function NovoPacientePage() {
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

  function handleCPFChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = mascaraCPF(e.target.value);
    setCpfValue(masked);
    setValue("cpf", masked);
  }

  function handleTelefoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = mascaraTelefone(e.target.value);
    setTelefoneValue(masked);
    setValue("telefone", masked);
    if (whatsappIgualTelefone) {
      setWhatsappValue(masked);
      setValue("whatsapp", masked);
    }
  }

  function handleWhatsappChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = mascaraTelefone(e.target.value);
    setWhatsappValue(masked);
    setValue("whatsapp", masked);
  }

  async function onSubmit(data: PacienteFormData) {
    setIsSubmitting(true);
    try {
      const result = await createPaciente({
        nome: data.nome,
        cpf: data.cpf || null,
        email: data.email || null,
        telefone: data.telefone || null,
        data_nascimento: data.data_nascimento || null,
        endereco: data.endereco || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        whatsapp: data.whatsapp || null,
        observacoes: data.observacoes || null,
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Novo Paciente
        </h1>
        <p className="text-slate-600">
          Preencha os dados para cadastrar um novo paciente
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Dados Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
            <CardDescription>Informações de identificação do paciente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo *</Label>
              <Input
                id="nome"
                {...register("nome")}
                placeholder="Ex: Maria da Silva"
              />
              {errors.nome && (
                <p className="text-sm text-destructive">{errors.nome.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={cpfValue}
                  onChange={handleCPFChange}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  {...register("data_nascimento")}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="email@exemplo.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={telefoneValue}
                  onChange={handleTelefoneChange}
                  placeholder="(00) 00000-0000"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={whatsappIgualTelefone}
                    onChange={(e) => setWhatsappIgualTelefone(e.target.checked)}
                    className="size-4 rounded border-slate-300"
                  />
                  Mesmo que telefone
                </label>
              </div>
              <Input
                id="whatsapp"
                value={whatsappValue}
                onChange={handleWhatsappChange}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                disabled={whatsappIgualTelefone}
              />
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                {...register("endereco")}
                placeholder="Rua, número, complemento"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  {...register("cidade")}
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  {...register("estado")}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="observacoes"
              {...register("observacoes")}
              placeholder="Alergias, condições especiais, histórico relevante..."
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar paciente"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
