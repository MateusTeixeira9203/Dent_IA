# Estado — Odonto.IA

> **ESTADO** · atualizado em 31/08/2026

## Agora

🔵 **R-140c — Prontuário longitudinal em contrato/execução.** O artefato v7 foi aprovado, mas a
revisão 2 da spec aguarda aprovação antes de continuar o código.

**Feito**

- Projeção longitudinal preserva Atendimento moderno, evolução legada e Ficha sem evolução.
- Meu Dia manual/Dex, paciente, Agenda, orçamento básico, Atendimento, prontuário e encaminhamento
  passaram no Supabase local descartável.
- Matriz RLS com duas clínicas passou; 154/154 testes, TypeScript, diff-check e audit de dependências
  de produção passaram.
- Auditoria salva em `auditorias/2026-08-31-sistema-completo.md` e retomada da VM no handoff mais
  recente.
- Revisão 2 define uma única superfície de Prontuário e navegação explícita entre timeline,
  registro, tratamento e editor. R-144 preserva o fechamento assistido como etapa posterior.

**Falta**

1. Eliminar a ficha vazia que aparece junto da correta ao abrir pelo odontograma.
2. Tornar “Editar ficha” edição preenchida do registro atual e separar de “Complementar”.
3. Corrigir retorno dentro do registro, status visual sem localização e assinatura até Arquivos.
4. Validar arcada, quadrante, ortodontia, anexos, PDF/exportação, mobile, teclado e light/dark.
5. Rodar perfis dentista/admin/secretária, lint/build e gate final antes de propor publicação.

## Travado

- `supabase db reset` não reproduz produção porque migrations históricas estão fora de ordem.
- `next build` falha neste host ao interpretar `tsc --showConfig`, embora o TypeScript passe.
- Produção não deve receber a R-140c enquanto os P0 e o gate visual não passarem.

## Esperando você

- Aprovar a revisão 2 de `specs/R-140c-prontuario-longitudinal.md` na VM.
- Nenhuma decisão de Vercel é necessária para a transferência: a branch de trabalho não deve mover
  a produção; qualquer alteração de projeto/alias será decidida separadamente.

## Próximo da fila

Depois da R-140c: R-144 (fechamento assistido opcional), gate clínico do Dex e R-140d
(etiquetas/câmera/OCR). Ordem completa no `ROADMAP.md`.
