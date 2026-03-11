"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { hasDentistaRegistro } from "@/lib/auth";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(1, "Informe a senha"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormData): Promise<void> {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email ou senha incorretos. Verifique e tente novamente.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (authData.session) {
        const temDentista = await hasDentistaRegistro(supabase);
        toast.success("Login realizado com sucesso!");
        router.push(temDentista ? redirectTo : "/onboarding");
        router.refresh();
      }
    } catch {
      toast.error("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Títulos */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-foreground mb-2">
          Bem-vindo de volta
        </h1>
        <p className="font-sans text-sm" style={{ color: "var(--gray-mid)" }}>
          Entre na sua conta
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="font-sans font-medium text-sm">
              Senha
            </Label>
            <Link
              href="/esqueci-senha"
              className="font-sans text-xs transition-colors hover:underline underline-offset-4"
              style={{ color: "var(--gray-mid)" }}
            >
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            disabled={isLoading}
            className="h-11"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 font-sans font-semibold text-sm"
          disabled={isLoading}
          style={{ backgroundColor: "var(--teal)", color: "white" }}
        >
          {isLoading ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      {/* Divisor */}
      <div className="mt-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="font-sans text-xs" style={{ color: "var(--gray-mid)" }}>
          ou
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Link para cadastro */}
      <p
        className="mt-4 text-center text-sm font-sans"
        style={{ color: "var(--gray-mid)" }}
      >
        Não tem conta?{" "}
        <Link
          href="/cadastro"
          className="font-medium underline-offset-4 hover:underline transition-colors"
          style={{ color: "var(--teal)" }}
        >
          Criar conta grátis
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm space-y-5">
          <div className="h-12 rounded-lg bg-muted animate-pulse" />
          <div className="h-11 rounded-lg bg-muted animate-pulse" />
          <div className="h-11 rounded-lg bg-muted animate-pulse" />
          <div className="h-11 rounded-lg bg-muted animate-pulse" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
