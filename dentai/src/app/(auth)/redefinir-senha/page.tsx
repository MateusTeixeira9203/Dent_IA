"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

const redefinirSchema = z
  .object({
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type RedefinirFormData = z.infer<typeof redefinirSchema>;

export default function RedefinirSenhaPage(): React.JSX.Element {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [sessionPronta, setSessionPronta] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RedefinirFormData>({
    resolver: zodResolver(redefinirSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Aguarda o Supabase processar o token de recuperação do hash da URL
  useEffect(() => {
    const supabase = createClient();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionPronta(true);
      }
    });

    // Verifica se já há sessão ativa (ex: usuário voltou à aba)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionPronta(true);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(data: RedefinirFormData): Promise<void> {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Senha redefinida com sucesso!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Erro ao redefinir senha. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  // Aguardando o token ser processado pelo Supabase
  if (!sessionPronta) {
    return (
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="h-8 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 rounded bg-muted animate-pulse w-3/4 mx-auto" />
        <div className="h-11 rounded-lg bg-muted animate-pulse" />
        <div className="h-11 rounded-lg bg-muted animate-pulse" />
        <div className="h-11 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      {/* Ícone + Títulos */}
      <div className="mb-8">
        <div
          className="mb-4 flex size-12 items-center justify-center rounded-full"
          style={{ backgroundColor: "color-mix(in srgb, var(--teal) 15%, transparent)" }}
        >
          <ShieldCheck className="size-6" style={{ color: "var(--teal)" }} />
        </div>

        <h1 className="font-serif text-3xl text-foreground mb-2">
          Nova senha
        </h1>
        <p className="font-sans text-sm" style={{ color: "var(--gray-mid)" }}>
          Escolha uma senha segura com pelo menos 8 caracteres.
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="font-sans font-medium text-sm">
            Nova senha
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            disabled={isLoading}
            className="h-11"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="confirmPassword"
            className="font-sans font-medium text-sm"
          >
            Confirmar nova senha
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repita a nova senha"
            disabled={isLoading}
            className="h-11"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 font-sans font-semibold text-sm"
          disabled={isLoading}
          style={{ backgroundColor: "var(--teal)", color: "white" }}
        >
          {isLoading ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </div>
  );
}
