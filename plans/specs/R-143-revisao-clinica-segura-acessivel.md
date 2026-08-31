# R-143 — Revisão clínica segura e acessível do Dex

> **SPEC** · **R-143** · ⏳ fila
> **Aberto:** 2026-08-30 · **Fechado:** — · **Fase:** aprovada para execução

## 1. Problema

`revisar_status` hoje exibe apenas “Confira o status”; salvar continua permitido. As ações
“Tudo indicado” e “✓ tudo feito” mudam todos os eventos, limpam a pendência e não oferecem
confirmação/undo. Grupos mistos exibem o status do primeiro evento. Os principais controles têm
alvos de 25–28 px, há roles interativos contendo botões, contraste insuficiente e overflow mobile.

O dentista consegue confirmar informação clínica errada por omissão, e corrigir no celular exige
precisão de toque incompatível com o ambiente de consulta.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Pendência bloqueia save até decisão | aviso passivo | aviso pode passar despercebido |
| Dois comandos explícitos no card suspeito | pill que alterna sem dizer destino | decisão fica inequívoca |
| “Tudo feito” confirma quantidade + undo | conversão imediata | falso realizado tem maior consequência |
| “Tudo indicado” imediato + undo | modal para toda ação segura | reduz atrito mantendo reversão |
| Grupo misto mostra contagens | status do primeiro evento | não representa o grupo |
| Alvo mínimo 44×44 px | manter aparência compacta como área clicável | uso mobile/luvas e WCAG |
| Corrigir componentes atuais | redesign do fluxo | segurança não exige reabrir direção visual |
| Vocabulário único | indicado/planejado/a fazer misturados | reduz interpretação durante consulta |

## 3. Objetivo e como funciona

**Objetivo:** nenhum evento ambíguo ou de fallback é salvo sem uma decisão explícita, e todos os
controles de revisão funcionam com toque, teclado e leitor de tela.

Cards suspeitos oferecem “Confirmar indicado” e “Confirmar realizado”. O save aponta a primeira
pendência. Ações em lote mostram quantos itens mudarão e podem ser desfeitas antes do salvamento.

## 4. Contrato técnico

### 4.1 Pendência de revisão

`revisar_status` continua transitório e suficiente; não há coluna nova.

```ts
function eventosPendentesDeRevisao(
  eventos: readonly OdontogramaEventoDraft[],
): OdontogramaEventoDraft[];

function resolverStatusDraft(
  eventos: readonly OdontogramaEventoDraft[],
  ids: readonly string[],
  status: 'indicado' | 'realizado',
  dataPadrao: string,
): OdontogramaEventoDraft[];
```

- “Confirmar indicado” define indicado, `realizado_em: null` e limpa `revisar_status`.
- “Confirmar realizado” define realizado, origem clínica, sessão atual, data padrão e limpa flag.
- Save em Ficha/Meu Dia chama a função de pendências antes da Action. Havendo qualquer uma, não
  envia request, abre/rola até o primeiro card e anuncia a quantidade.
- Remover o evento também resolve a pendência por decisão explícita.
- Reextração não reabre evento que já foi corrigido e preservado pelo dedup atual.

### 4.2 Ações em lote e undo

```ts
interface AlteracaoLoteDex {
  anterior: OdontogramaEventoDraft[];
  proximo: OdontogramaEventoDraft[];
  afetados: number;
  expiraEm: number;
}
```

- `Tudo indicado` mostra “Marcar N como indicados”, aplica e oferece undo por 10 segundos.
- `Tudo feito` abre confirmação ancorada: “Marcar N procedimentos como realizados hoje?”. Só o
  segundo gesto aplica; depois também oferece undo por 10 segundos.
- Uma nova alteração substitui o snapshot anterior; não há pilha de histórico.
- Undo restaura status, origem, momento, data e `revisar_status` de todos os afetados.
- Salvar encerra o período de undo; não tenta desfazer dado já persistido.

### 4.3 Grupos mistos

View-model aditivo, sem novo status persistido:

```ts
interface RegistroCardData {
  // campos atuais
  statusResumo: {
    indicado: number;
    realizado: number;
  };
}
```

- Um card homogêneo mantém pill individual.
- Grupo com ambos mostra `Misto · N realizados · N indicados`, usando tokens neutros
  `bg-surface-alt text-foreground border-border`; não escolhe a cor do primeiro.
- Toggle/confirmar em grupo declara quantos eventos serão alterados.
- `eventosParaCards` agrega `revisarStatus` e contagens de todos os itens.

### 4.4 Semântica e acessibilidade

- Vocabulário visível: **Realizado**, **Indicado**, **Próxima sessão**, **Precisa revisar**.
- Corrigir “Próxima seção” e trocar “Planejado” por “Indicado” quando significa status.
- Origem temporal “Planejado antes” vira “Indicado anteriormente”.
- Todo botão/pill/ação do odontograma tem área interativa mínima de 44×44 CSS px.
- Header expansível vira botão real separado; controles de status/remover são irmãos, nunca
  elementos interativos aninhados em `role=button`.
- Textarea recebe `<label>` associado; ícones têm nome acessível; estados usam `aria-live` sem
  anunciar cada tick do timer.
- Foco visível usa token teal; nenhuma ação depende apenas de cor.
- Escape fecha confirmação sem aplicar; Tab segue ordem visual; Enter/Espaço ativam o controle.

### 4.5 Responsividade, contraste e motion

- Grades dos cards usam uma coluna como base e duas apenas quando houver largura real
  (`grid-cols-1 xl:grid-cols-2`); remover `minmax(360px,1fr)`.
- Rodapés e ações usam wrap e não criam scroll horizontal a 320 px.
- CTA de texto pequeno não usa `bg-teal text-white`; combinações precisam atingir 4,5:1.
- Componentes respeitam `prefers-reduced-motion`; feedback clínico não depende de animação.
- Light e dark usam somente tokens; nenhuma cor hardcoded.

## 5. Comportamento — alvo funcional

| Estado | O que aparece | Save |
|---|---|---|
| Sem eventos | vazio atual | permitido conforme fluxo atual |
| Todos revisados | resumo realizados/indicados | permitido |
| Uma pendência | card destacado + duas confirmações | bloqueado |
| Fallback `outro` | nome real + precisa revisar | bloqueado |
| Grupo misto | contagens dos dois estados | permitido se sem flag |
| Tudo indicado | mudança + undo 10s | permitido após resolução |
| Tudo feito | confirmação com N + undo | permitido após resolução |
| Erro de Action | rascunho permanece | retry disponível |
| Mobile 320px | uma coluna, ações com wrap | sem scroll horizontal |

## 6. Referência visual

Não há redesign nem artefato novo: preservar geometria e hierarquia aprovadas de Ficha/Meu Dia.
A implementação altera estados, semântica, áreas interativas e contraste dentro dos componentes
existentes. Auditoria visual final compara light/dark e desktop/mobile com as referências oficiais.

## 7. Invariantes

- [ ] Evento com `revisar_status` não é enviado à Action.
- [ ] Só gesto humano explícito limpa a pendência.
- [ ] Ações em lote nunca mudam silenciosamente um grupo sem contagem/undo.
- [ ] Grupo misto nunca se apresenta como inteiramente realizado.
- [ ] Estado persistido continua por evento; `misto` é apenas view-model.
- [ ] Toda funcionalidade opera por teclado e não depende de cor/motion.
- [ ] Nenhuma mudança altera schema, API, orçamento ou regra de negócio.

## 8. Gates de aceite

- [ ] **G1:** teste puro cobre confirmar indicado/realizado, remover e restauração por undo.
- [ ] **G2:** save com 1+ pendências faz zero request, foca o primeiro card e anuncia quantidade.
- [ ] **G3:** `Tudo feito` exige confirmação; ambas as ações restauram snapshot completo em undo.
- [ ] **G4:** grupo 1 realizado + 1 indicado mostra “Misto” e contagens corretas em rascunho e
  ficha salva.
- [ ] **G5:** todos os controles têm bounding box ≥44×44 em viewport 320/390 px.
- [ ] **G6:** navegação completa por teclado sem foco preso, interação aninhada ou ação invisível.
- [ ] **G7:** contraste WCAG AA em light/dark e nenhuma rolagem horizontal a 320 px.
- [ ] **G8:** redução de movimento preserva todo feedback e remove animação não essencial.
- [ ] **G9:** qa-web em Ficha e Meu Dia cobre vazio, misto, suspeito, undo, erro e sucesso.

## 9. Fora de escopo

- Redesign visual amplo ou novo fluxo de consulta.
- Novo status no banco ou persistência de confiança/evidência da IA.
- Histórico ilimitado de undo ou desfazer após salvar.
- Alterar classificação do modelo — R-139c/R-133.
