"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const cadastroSchema = z
  .object({
    email: z.email("Email inválido"),
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type CadastroFormData = z.infer<typeof cadastroSchema>;

export default function CadastroPage(): React.JSX.Element {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CadastroFormData>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(data: CadastroFormData): Promise<void> {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (authData.user?.identities?.length === 0) {
        toast.error("Este email já está cadastrado. Faça login ou use outro email.");
        return;
      }

      if (authData.session) {
        toast.success("Conta criada com sucesso!");
        router.push("/onboarding");
        router.refresh();
      } else {
        toast.success("Conta criada! Verifique seu email para confirmar o cadastro.");
        router.push("/login");
        router.refresh();
      }
    } catch {
      toast.error("Erro ao criar conta");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Títulos */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-foreground mb-2">
          Crie sua conta
        </h1>
        <p className="font-sans text-sm" style={{ color: "var(--gray-mid)" }}>
          Comece grátis, sem cartão de crédito
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="font-sans font-medium text-sm">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            disabled={isLoading}
            className="h-11"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="font-sans font-medium text-sm">
            Senha
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
          <Label htmlFor="confirmPassword" className="font-sans font-medium text-sm">
            Confirmar senha
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repita a senha"
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
          {isLoading ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>

      {/* Link para login */}
      <p
        className="mt-6 text-center text-sm font-sans"
        style={{ color: "var(--gray-mid)" }}
      >
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-medium underline-offset-4 hover:underline transition-colors"
          style={{ color: "var(--teal)" }}
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
