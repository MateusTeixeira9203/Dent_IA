# DESIGN.md — R-140 Prontuário e Atendimento

> Gerado em 2026-08-30 · status: brief aguardando aprovação das specs
> Superfícies: Meu Dia, Prontuário e captura de rastreabilidade

## 1. Produto, público e intenção

- **Produto:** SaaS B2B odontológico multi-clínica; superfície clínica de alta frequência.
- **Usuário primário:** dentista durante ou logo após o atendimento.
- **Usuários secundários:** admin/secretária completando rastreabilidade autorizada.
- **Direção:** duas velocidades com a mesma linguagem: Meu Dia é uma bancada rápida; Prontuário é
  um arquivo clínico editorial. A captura de etiquetas é uma ferramenta curta, não outro sistema.
- **Teste de identidade:** deve parecer feito pela mesma equipe do Dashboard, Meu Dia e Ficha.

## 2. Hierarquia por superfície

| Superfície | Primeiro olhar | Segundo nível | Nunca domina |
|---|---|---|---|
| Meu Dia | procedimento feito/a fazer + salvar | destino e ações contextuais | rastreabilidade |
| Prontuário | cronologia da visita | tratamento, documentos e rastreabilidade | odontograma |
| Etiquetas | imagem + campos a confirmar | texto original e vínculos | IA/score técnico |

O odontograma do Prontuário é compacto e expansível. O odontograma operacional do Meu Dia mantém
a área definida no R-123; a redução solicitada vale para a leitura longitudinal, não para o gesto
de registrar dentes.

## 3. Paleta e tokens existentes

Nenhuma nova identidade ou cor semântica. Valores abaixo documentam a origem; componentes usam
classes/tokens do `src/app/globals.css`, nunca hex hardcoded.

| Token | Light | Dark | Uso |
|---|---:|---:|---|
| `--color-bg` | `#f4f4f6` | `#0d0d0d` | página |
| `--color-surface` | `#ffffff` | `#111112` | superfície principal |
| `--color-surface-alt` | `#dadade` | `#1c1c1e` | controles e estados neutros |
| `--color-border` | `#c2c2c6` | `#27272a` | divisores |
| `--color-text-primary` | `#09090b` | `#fafafa` | conteúdo clínico |
| `--color-text-secondary` | `#4b5563` | `#a1a1aa` | metadados |
| `--color-teal` | `#2f9c85` | `#2f9c85` | feito/foco/ação positiva |
| `--color-teal-lt` | `#5dbeb0` | `#5dbeb0` | contraste dark |

Coral existente continua significando **a fazer**. Alerta permanece reservado a risco clínico;
pendência de etiqueta usa neutro/ícone/texto, não amarelo de alergia.

## 4. Tipografia, densidade e geometria

- **Título editorial:** DM Serif Display (`--font-heading`), somente página/seção principal.
- **Interface e leitura:** Outfit (`--font-sans`).
- **Precisão:** `ui-monospace` para dente, data compacta, lote, validade, contadores e valores.
- **Escala:** 12 metadado · 14 corpo/controle · 16 destaque · 20 seção · 28–32 título.
- **Espaço:** 4 / 8 / 12 / 16 / 24 / 32 px.
- **Raios:** 10 px controles, 14–16 px containers; evitar raio igual em tudo.
- **Bordas/sombras:** borda tokenizada como estrutura; sombra apenas em sobreposição elevada.
- **Densidade:** uma camada de containers. Timeline não vira card dentro de card.

## 5. Layout responsivo

| Largura | Meu Dia | Prontuário | Etiquetas |
|---|---|---|---|
| ≥1280 | bancada R-123 60/40 | leitura 760–880 + resumo lateral | sheet/painel 420–520 |
| 768–1279 | duas áreas empilhadas controladas | resumo acima da timeline | sheet de largura útil |
| 320–767 | campo → revisão → mapa → ações | uma coluna; odontograma full width | tela/folha inferior full width |

- CTA fica acima de safe area/teclado; nenhum footer cobre o último conteúdo.
- Painéis com scroll restauram `body` ao fechar, desmontar, trocar rota e após erro.
- Alvo touch mínimo 44×44 px e linha de leitura mínima 40 px.

## 6. Componentes visuais

### Meu Dia

- Cabeçalhos `Feito hoje` / `A fazer`: label + contador, sem banner colorido.
- `RegistroCard` preservado; seção dá contexto, não duplica status no card.
- Rodapé: um CTA primário; `Salvar + adicionar etiquetas` é secundário explícito.
- Destino do tratamento usa uma linha mono discreta somente na ambiguidade.

### Prontuário

- Resumo compacto com odontograma, tratamentos ativos e rastreabilidade pendente.
- Timeline usa data/autor como eixo, conteúdo clínico em blocos tipográficos e divisores.
- Tratamento selecionado aparece como filtro/chip removível, não como nova navegação.
- Documento/assinatura são metadados com ação, não previews pesados na timeline.

### Etiquetas

- Foto fica ao lado/acima dos campos; usuário compara sem alternar tela.
- Campo incerto usa rótulo e mensagem, nunca apenas cor.
- Texto OCR bruto fica recolhido em “Texto identificado”.
- `DexLoader` é o único loader de processamento de IA.
- A confirmação nomeia a ação real: `Confirmar rastreabilidade`.

## 7. Motion, acessibilidade e conteúdo

- Disclosure/filtro: 150–200 ms; sem animação de celebração ou atraso deliberado.
- Respeitar `prefers-reduced-motion`; foco não é removido quando uma seção muda.
- `aria-live` anuncia upload, extração, save clínico e falha posterior separadamente.
- Status sempre tem texto; lote/validade não dependem de truncamento ou tooltip.
- Copy diferencia: `Não informado`, `Completar depois`, `Completo`, `Não se aplica`.
- Erro parcial: `Atendimento salvo` aparece antes da mensagem de falha de etiqueta.

## 8. Exploração e contrato visual

Antes do código, `design-shotgun` gera quatro variantes do **Prontuário** com o mesmo conteúdo:

1. linha do tempo editorial + resumo lateral;
2. ledger clínico compacto;
3. tratamentos como índice + cronologia;
4. cronologia em largura total + resumo recolhível.

Depois da escolha do usuário, o artefato aprovado vira contrato visual. O Meu Dia recebe uma tela
de referência compatível com a direção escolhida, preservando a geometria vinculante do R-123.
Tokens, medidas e algoritmo do artefato serão extraídos por JS e escritos nas specs antes do código.

## 9. Anti-padrões e gates visuais

- Sem dashboard de métricas, cards estatísticos, ícones em círculos coloridos ou gradiente roxo.
- Sem modal obrigatório após salvar, toolbar flutuante sobre odontograma ou controles por hover.
- Sem nova cor para “etiqueta”, “estoque” ou “IA”.
- [ ] Light/dark e 375/768/1440 px aprovados.
- [ ] Meu Dia mantém caminho comum sem rolagem adicional causada pela rastreabilidade.
- [ ] Prontuário mostra visita, tratamento e autor sem o usuário decifrar a estrutura do banco.
- [ ] Captura permite comparar foto e campos no mesmo viewport útil.
- [ ] Fechar qualquer sheet/dialog restaura scroll e foco.
