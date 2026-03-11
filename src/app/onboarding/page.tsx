"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { completeOnboarding } from "./actions";
import { toast } from "sonner";

const ESPECIALIDADES = [
  "Clínico Geral",
  "Ortodontia",
  "Endodontia",
  "Implantodontia",
  "Periodontia",
  "Odontopediatria",
  "Cirurgia",
  "Outro",
] as const;

const onboardingSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cro: z.string().min(1, "Informe o CRO"),
  especialidade: z.enum(ESPECIALIDADES),
  nomeConsultorio: z.string().min(2, "Nome do consultório é obrigatório"),
  telefone: z.string().optional(),
  cidade: z.string().min(2, "Informe a cidade"),
  estado: z
    .string()
    .min(2, "Informe o estado (UF)")
    .max(2, "Use a sigla (ex: SP)"),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

// Mapa de passos para a barra de progresso
const TOTAL_FIELDS = 7;

export default function OnboardingPage(): React.JSX.Element {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      nome: "",
      cro: "",
      especialidade: undefined,
      nomeConsultorio: "",
      telefone: "",
      cidade: "",
      estado: "",
    },
  });

  const watchedValues = watch();
  const especialidadeValue = watchedValues.especialidade;

  // Calcula progresso com base nos campos preenchidos
  const filledCount = [
    watchedValues.nome,
    watchedValues.cro,
    watchedValues.especialidade,
    watchedValues.nomeConsultorio,
    watchedValues.telefone,
    watchedValues.cidade,
    watchedValues.estado,
  ].filter((v) => v && String(v).trim().length > 0).length;

  const progress = Math.round((filledCount / TOTAL_FIELDS) * 100);

  async function onSubmit(data: OnboardingFormData): Promise<void> {
    setIsLoading(true);
    try {
      const result = await completeOnboarding({
        nome: data.nome,
        cro: data.cro,
        especialidade: data.especialidade,
        nomeConsultorio: data.nomeConsultorio,
        telefone: data.telefone ?? "",
        cidade: data.cidade,
        estado: data.estado,
      });

      if (result.success) {
        toast.success("Tudo pronto! Seu consultório está configurado.");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao salvar. Tente novamente.");
      }
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg">
      {/* Cabeçalho da página */}
      <div className="text-center mb-8">
        <h1 className="font-serif text-[2rem] leading-tight text-foreground mb-2">
          Olá! Vamos configurar seu consultório 🦷
        </h1>
        <p className="font-sans text-sm" style={{ color: "var(--gray-mid)" }}>
          Isso leva menos de 2 minutos
        </p>
      </div>

      {/* Card do formulário */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Barra de progresso */}
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              backgroundColor: "var(--teal)",
            }}
          />
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Nome completo */}
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="font-sans font-medium text-sm">
                Nome completo
              </Label>
              <Input
                id="nome"
                placeholder="Ex: Dr. João Silva"
                disabled={isLoading}
                className="h-10"
                {...register("nome")}
              />
              {errors.nome && (
                <p className="text-xs text-destructive">{errors.nome.message}</p>
              )}
            </div>

            {/* CRO + Especialidade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cro" className="font-sans font-medium text-sm">
                  CRO
                </Label>
                <Input
                  id="cro"
                  placeholder="Ex: CRO-SP 12345"
                  disabled={isLoading}
                  className="h-10"
                  {...register("cro")}
                />
                {errors.cro && (
                  <p className="text-xs text-destructive">{errors.cro.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="especialidade"
                  className="font-sans font-medium text-sm"
                >
                  Especialidade
                </Label>
                <Select
                  value={especialidadeValue ?? ""}
                  onValueChange={(v) =>
                    setValue(
                      "especialidade",
                      v as (typeof ESPECIALIDADES)[number],
                      { shouldValidate: true }
                    )
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger id="especialidade" className="w-full h-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESPECIALIDADES.map((esp) => (
                      <SelectItem key={esp} value={esp}>
                        {esp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.especialidade && (
                  <p className="text-xs text-destructive">
                    {errors.especialidade.message}
                  </p>
                )}
              </div>
            </div>

            {/* Nome do consultório */}
            <div className="space-y-1.5">
              <Label
                htmlFor="nomeConsultorio"
                className="font-sans font-medium text-sm"
              >
                Nome do consultório
              </Label>
              <Input
                id="nomeConsultorio"
                placeholder="Ex: Consultório Dr. João"
                disabled={isLoading}
                className="h-10"
                {...register("nomeConsultorio")}
              />
              {errors.nomeConsultorio && (
                <p className="text-xs text-destructive">
                  {errors.nomeConsultorio.message}
                </p>
              )}
            </div>

            {/* Telefone */}
            <div className="space-y-1.5">
              <Label
                htmlFor="telefone"
                className="font-sans font-medium text-sm"
              >
                Telefone{" "}
                <span style={{ color: "var(--gray-mid)" }}>(opcional)</span>
              </Label>
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                disabled={isLoading}
                className="h-10"
                {...register("telefone")}
              />
            </div>

            {/* Cidade + Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="cidade"
                  className="font-sans font-medium text-sm"
                >
                  Cidade
                </Label>
                <Input
                  id="cidade"
                  placeholder="Cidade"
                  disabled={isLoading}
                  className="h-10"
                  {...register("cidade")}
                />
                {errors.cidade && (
                  <p className="text-xs text-destructive">
                    {errors.cidade.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="estado"
                  className="font-sans font-medium text-sm"
                >
                  Estado
                </Label>
                <Input
                  id="estado"
                  placeholder="UF"
                  maxLength={2}
                  disabled={isLoading}
                  className="h-10 uppercase"
                  {...register("estado")}
                />
                {errors.estado && (
                  <p className="text-xs text-destructive">
                    {errors.estado.message}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-sans font-semibold text-sm mt-2"
              disabled={isLoading}
              style={{ backgroundColor: "var(--teal)", color: "white" }}
            >
              {isLoading ? "Salvando..." : "Concluir configuração →"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
