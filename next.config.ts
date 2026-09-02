import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tsc --noEmit roda separadamente no CI (script "typecheck").
  // Desabilitar a checagem redundante do next build evita OOM em máquinas com menos RAM.
  typescript: { ignoreBuildErrors: true },
  turbopack: {},
  experimental: {
    // O runner CLI do Next 16.3.3 pode encerrar o `--showConfig` com stdout vazio.
    // TypeScript 5.9 ainda expõe a Compiler API, então este caminho evita o falso
    // erro de parse sem alterar o `typecheck` explícito do projeto.
    useTypeScriptCli: false,
    // #9 — tree-shaking agressivo pra bundle das libs mais pesadas do app.
    optimizePackageImports: ['lucide-react', 'motion', 'date-fns', 'recharts'],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  webpack: (config) => {
    // Necessário para pdf-parse funcionar em API routes do Next.js
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
