import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Worktrees e metadados locais não fazem parte do produto nem do CI.
    ".claude/**",
    ".worktrees/**",
    "supabase/.temp/**",
    // Scripts CLI standalone (CommonJS, fora do build da app) — require() é o correto aqui,
    // não faz sentido a regra de import de TS (ex.: capture-audit*.cjs do audit visual).
    "scripts/**",
    "**/*.cjs",
  ]),
]);

export default eslintConfig;
