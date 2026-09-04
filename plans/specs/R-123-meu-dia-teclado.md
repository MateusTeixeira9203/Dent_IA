# R-123 — Meu Dia: bancada compacta orientada a teclado

> **SPEC** · **R-123** · ✅ no ar e verificado; registro histórico
> **Aberto:** 2026-08-20 · **Fechado:** — · **Fase:** aprovada
> **Migration:** zero · **API nova:** zero · **Aprovação:** artefato e execução autorizados pelo usuário em 20/08.

## 1. Problema

O Meu Dia registra corretamente, mas os blocos ficam em sequência vertical e exigem rolagem para alternar entre captura, revisão, odontograma, detalhe e ações finais. O dentista perde contexto sem ganhar capacidade clínica.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Reorganizar componentes existentes em bancada desktop 60/40 | Criar uma segunda tela de consulta | Evita regras e rotas paralelas |
| Clique no dente apenas seleciona | Abrir histórico/editor automaticamente | Permite selecionar vários dentes sem trocar foco |
| `Abrir detalhe dental` com 1 dente, ao lado de Limpar | Painel sempre aberto | Editor só abre por intenção explícita |
| Gavetas continuam sob a bancada | Manter Histórico, A fazer e Anexos permanentes | Não competem com a consulta |
| Rodapé persistente no desktop | Duplicar ações nos cards | Cada ação mantém uma rota visual |

## 3. Objetivo e como funciona

**Objetivo:** registrar e revisar sem rolar para alternar entre relato, cards, odontograma e ação final em desktop.

Campo Mágico fica no topo; revisão ocupa a coluna principal; odontograma, seleção e MultiDent ocupam a coluna lateral ampliada. Ao selecionar um dente, a faixa de lote aparece. Com exatamente um dente, **Abrir detalhe dental** abre o editor existente no mesmo painel lateral; fechar ou `Esc` retornam ao mapa. Nenhuma ação cria rota nova.

## 4. Contrato técnico

### Mapa completo: elemento → dono atual → destino

| Elemento do artefato | Código existente | Destino | Mudança permitida |
|---|---|---|---|
| Paciente, alertas, pendências, perfil | `MeuDiaClient` | cabeçalho compacto | agrupamento/estilo |
| Campo Mágico, voz, anexo e Dex | `CampoMagicoMeuDia` → `CapturaLivreCard` | faixa superior | variante visual opcional; mesma API |
| Cards da consulta | `NestaSessaoBloco` → `RegistroCard` | coluna esquerda | continente, altura e rolagem interna |
| Destino de novos eventos | seletor de `MeuDiaClient` | abaixo dos cards, se ambíguo | intacto |
| Odontograma e seleção | `RegistrarPainel.slotCentral` → `Odontograma` | coluna direita, mínimo 460 px | escala/posição; mesma seleção |
| Lote, faces e avulso | `FaixaLote` + `lote-multidente` | logo abaixo do mapa | intacto; detalhe ao lado de limpar |
| Detalhe, faces, endo e implante | `ToothDetailPanel` | substitui o mapa | fecha para o mapa; sem rota nova |
| Histórico, A fazer, Anexos | `FaixaGavetas` + blocos atuais | abas do painel clínico lateral | intactos; só muda o continente |
| Retorno, orçamento e salvar | `registrarPainel.rodape` | rodapé persistente | handlers intactos |

**Arquivos com mudança permitida:**

- `src/app/dashboard/meu-dia/_components/meu-dia-client.tsx` — composição, containers e responsividade; mesmos estados/handlers.
- `src/app/dashboard/meu-dia/_components/registrar-painel.tsx` — variantes de slots; mesma seleção, retorno, orçamento e salvamento.
- `src/app/dashboard/meu-dia/_components/campo-magico-meu-dia.tsx` e `src/components/fichas/captura-livre-card.tsx` — somente se a variante compacta exigir.
- `src/components/odontograma/faixa-lote.tsx` — ordem visual de detalhe/limpar, sem mudar `FaixaLoteProps` ou ação clínica.

Sem alteração em schema, Server Actions, API, RLS, tipos clínicos, rotas ou regra de destino.

## 5. Comportamento — o alvo funcional

| Estado | Tela | Regra |
|---|---|---|
| Sem seleção | mapa ampliado, sem lote | clique adiciona/remove seleção |
| 1 dente | lote + Abrir detalhe + Limpar | detalhe abre só por clique explícito |
| 2+ dentes | lote + Limpar | não há detalhe; faces múltiplas preservadas |
| Detalhe aberto | `ToothDetailPanel` no lugar do mapa | fechar/`Esc` retorna ao mapa |
| Aba contextual | substitui o mapa no painel lateral | uma aberta por vez; não altera rascunho |
| Salvando/falha parcial | sinalização atual no rodapé | rascunho e repetição preservados |

```text
selecionar dente(s)
  → `onToothToggle` atualiza `onde`
  → `FaixaLote` recebe a seleção
  → [1 dente + Abrir detalhe] chama `abrirDetalheDental`
  → `ToothDetailPanel` substitui somente o mapa
  → fechar retorna ao mapa; salvar usa `handleSalvar` atual
```

## 6. Referência visual

- **Artefato:** `plans/artefatos/R-123-meu-dia-teclado.html`
- **Rota:** `/dashboard/meu-dia` · **Componente principal:** `MeuDiaClient`

| Token | Valor |
|---|---|
| `--bg` / `--surface` | `#0d0d0d` / `#111112` |
| `--surface-2` / `--border` | `#171719` / `#27272a` |
| `--tx` / `--tx2` | `#f5f5f5` / `#a1a1aa` |
| `--teal` / `--teal-pale` | `#63c9b6` / `#102b26` |
| `--coral` / `--coral-pale` | `#ef8f8f` / `#351a1d` |
| fonte / raio | `Outfit, sans-serif` / 10 px |
| desktop | revisão flexível + painel clínico mínimo de 460 px |

Campo compacto, cards mínimos de 104 px, odontograma ampliado, detalhe substituindo mapa e rodapé persistente no desktop são vinculantes. No celular a ordem é Campo → revisão → mapa/ações → gavetas → ações, sem ação atrás do teclado.

## 7. Invariantes

- [ ] Nenhum gesto de escrita, regra de destino ou permissão muda.
- [ ] Clique no mapa nunca abre histórico ou editor sozinho.
- [ ] Detalhe só surge com exatamente um dente e abre o mesmo `ToothDetailPanel`.
- [ ] Restauração mantém uma ou mais faces antes de aplicar.
- [ ] Cards, observações, endo, implante, orto, orçamento e retorno mantêm rota existente.
- [ ] Seleção, rascunho e detalhe resetam ao trocar de paciente como hoje.

## 8. Gates de aceite

- [ ] Em 1440 px, Campo, revisão, odontograma e rodapé são utilizáveis sem rolar para alternar; painel lateral tem ≥460 px.
- [ ] Selecionar três dentes não abre detalhe e ação de lote continua igual.
- [ ] Com dente 46, Abrir detalhe fica ao lado de Limpar; clique abre detalhe; fechar ou Esc retornam ao mapa.
- [ ] Clique sucessivo em dentes só altera seleção, sem deslocar cards nem abrir painel.
- [ ] Restauração em lote aceita múltiplas faces e cria o mesmo conjunto de eventos.
- [ ] Retorno, orçamento, salvar e repetição de falha chamam os mesmos handlers.
- [ ] Em 375 px não há corte horizontal nem ação atrás do teclado.
- [ ] `npm run typecheck` e `npm run lint` passam.

## 9. Fora de escopo

- Ficha completa, símbolos anatômicos, nova IA de especialidade e schema clínico.
- Nova rota de detalhe, atalho global persistente ou alteração do fluxo de orçamento.
- Mudança no que cada dentista pode ver, salvar ou editar.
