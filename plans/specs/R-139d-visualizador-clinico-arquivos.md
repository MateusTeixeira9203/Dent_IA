# R-139d — Motor do visualizador clínico e integração em Arquivos

> SPEC · R-139d · 🟡 no ar; aguarda auditoria completa
> Aberto em 2026-08-28 · Fase: validação em produção · Artefato aprovado antes da execução

## 1. Problema

Radiografias e fotografias abertas em Arquivos apenas se ajustam ao lightbox. O dentista não consegue ampliar uma região, deslocar a imagem ampliada, girar um arquivo recebido na orientação errada nem ajustar temporariamente a visualização.

Este item cria o único motor de viewport de imagens do produto e o coloca em Arquivos. A integração desse mesmo motor à Apresentação, onde há anotações persistidas, é contratada separadamente em R-139e.

## 2. Decisões fechadas

- Um componente compartilhado será a única implementação de zoom, pan, rotação e filtros.
- Primeira integração: lightbox de todas as imagens da aba Arquivos do paciente, incluindo
  radiografias e fotografias, sem tratamento especial por categoria.
- Estado é transitório e local; não vai para banco, Storage, URL ou `localStorage`.
- O original é imutável; não haverá crop, upload ou cópia processada.
- Faixas: zoom `1×–8×`, rotação de 90°, brilho/contraste `50–200%`, inversão liga/desliga.
- O palco transformável aceitará uma camada sobreposta no mesmo sistema de coordenadas para R-139e, sem conhecer regras de anotação.
- Não haverá migration, dependência nova, canvas de processamento, PDF ou DICOM.

## 3. Objetivo verificável

No lightbox de Arquivos, o dentista consegue ampliar, reduzir, arrastar, girar, ajustar brilho/contraste, inverter e restaurar a imagem. Ao fechar ou trocar de arquivo, tudo volta ao padrão. Reabrir o documento mostra o original intacto.

## 4. Origem e destino dos dados

```text
paciente_documentos
  ├─ id, paciente_id, clinica_id, categoria e metadados
  └─ url = caminho privado no bucket fichas
      └─ DocumentosTab consulta paciente + clínica ativa
          └─ createSignedUrls('fichas', caminhos, 3600)
              └─ Document com URL temporária em memória
                  └─ GaleriaImagens
                      └─ VisualizadorImagemClinica(src, alt)

interação do usuário
  └─ EstadoVisualizacaoImagem no React
      └─ transform/filter CSS no browser
          └─ fecha/troca src → estado descartado
```

O visualizador não recebe credenciais, não consulta Supabase e não transforma caminho de Storage em URL. O único destino dos ajustes é o estilo visual da sessão atual.

## 5. Tipos públicos

Criar em módulo compartilhado de imagens:

```ts
export type RotacaoVisual = 0 | 90 | 180 | 270

export interface EstadoVisualizacaoImagem {
  zoom: number
  panX: number
  panY: number
  rotacao: RotacaoVisual
  brilho: number
  contraste: number
  invertida: boolean
}

export interface VisualizadorImagemClinicaProps {
  src: string
  alt: string
  contexto: 'arquivos' | 'editor_apresentacao' | 'apresentacao'
  overlay?: React.ReactNode
  onRetry?: () => Promise<void> | void
  onEstadoChange?: (estado: EstadoVisualizacaoImagem) => void
  className?: string
}
```

Estado inicial:

```ts
export const ESTADO_VISUALIZACAO_PADRAO = {
  zoom: 1,
  panX: 0,
  panY: 0,
  rotacao: 0,
  brilho: 100,
  contraste: 100,
  invertida: false,
} satisfies EstadoVisualizacaoImagem
```

`overlay` é renderizado dentro do palco transformável, depois da imagem, ocupando o retângulo real dela. `onEstadoChange` é apenas integração de UI; nenhum consumidor pode usá-lo para persistir viewport.

## 6. Estrutura geométrica

```text
viewport (posição relativa; overflow hidden)
  └─ palco (translate + rotate + scale; transform-origin central)
      ├─ img (object-fit contain; filtros CSS)
      └─ overlay opcional (mesmo retângulo e proporção)
```

Regras:

1. `zoom: 1` significa imagem inteira contida, mantendo proporção.
2. O palco usa dimensões naturais da imagem e o espaço disponível para calcular o retângulo contido.
3. Barras vazias pertencem ao viewport, não à imagem/overlay.
4. Imagem e overlay recebem exatamente a mesma transformação geométrica.
5. Filtros atingem somente `<img>`; nunca overlay, toolbar ou fundo.
6. Resize e mudança de orientação recalculam o encaixe sem deformar a imagem.

## 7. Zoom e pan

- zoom mínimo `1`, máximo `8`;
- botões percorrem `1`, `1.25`, `1.5`, `2`, `3`, `4`, `6`, `8`;
- wheel/trackpad e pinch aceitam valores contínuos dentro do limite;
- zoom por ponteiro mantém o ponto da imagem sob cursor/dedos, ajustando pan;
- ao voltar para `1`, pan volta a zero;
- arraste de um ponteiro faz pan quando o conteúdo exceder o viewport;
- clamp mantém pelo menos 48 px do conteúdo visível por eixo;
- cursor `grab/grabbing` só aparece quando pan estiver disponível;
- não há inércia, para preservar posicionamento clínico preciso.

## 8. Rotação e filtros

Rotação:

- comando horário: `0 → 90 → 180 → 270 → 0`;
- depois de girar, recalcular dimensões e limites de pan;
- preservar zoom e centro visual quando possível;
- corrigir somente o pan que sair dos limites.

Filtros na imagem:

```css
filter: brightness(var(--brilho)) contrast(var(--contraste)) invert(var(--invertida));
```

- brilho e contraste: padrão 100%, limites 50–200%;
- inversão: 0/1;
- filtros são apresentação temporária, não interpretação diagnóstica nem edição do arquivo.

## 9. Controles e acessibilidade

Toolbar mínima:

- reduzir zoom, valor atual e ampliar;
- girar 90°;
- brilho e contraste;
- inverter;
- restaurar;
- fechar, quando o consumidor for modal.

Contrato:

- alvos touch mínimos de 44×44 px;
- botões com nome acessível; inversão usa `aria-pressed`;
- sliders com label, valor e teclado;
- atalhos com foco no visualizador: `+`, `-`, `0` e `R`;
- não capturar setas, reservadas à navegação de galeria/apresentação;
- toolbar não cobre a região principal no mobile e pode rolar horizontalmente;
- Escape continua sendo tratado pelo lightbox consumidor.

## 10. Integração em Arquivos

| Caminho | Responsabilidade depois da mudança |
|---|---|
| `src/components/pacientes/DocumentosTab.tsx` | Consultar paciente/clínica, gerar URLs assinadas e expor retry para o mesmo documento |
| `src/components/fichas/galeria-imagens.tsx` | Manter grade/navegação; substituir imagem estática do lightbox pelo viewer |
| `src/components/imagens/visualizador-imagem-clinica.tsx` **(novo)** | Implementar viewport, controles, gestos, loading e erro |
| módulo de matemática do viewer | Funções puras de zoom, clamp, rotação e conversão geométrica, sem React |

Ao navegar para anterior/próxima, primeiro cancelar gestos ativos e restaurar estado; depois renderizar a nova `src`. Grade e miniaturas não mudam.

## 11. Ciclo de URL e estados

| Estado | Comportamento |
|---|---|
| Carregando | Skeleton discreto no viewport; controles indisponíveis |
| Pronto | Imagem e controles ativos |
| URL expirada/403 | Erro no viewport e ação “Tentar novamente” |
| Retry | `DocumentosTab` regenera URL assinada pelo mesmo `paciente_documentos.id` |
| Arquivo ausente/404 | Erro explícito; registro não é removido automaticamente |
| Troca de `src` | Cancela ponteiros, limpa erro e restaura viewport |
| Fechamento | Descarta todo o estado transitório |

## 12. Segurança e multi-clínica

- Consulta continua filtrada por `clinica_id` ativa e `paciente_id`.
- Bucket `fichas` permanece privado.
- URLs assinadas mantêm validade atual de 1 hora e não são persistidas.
- Nada de service role no cliente.
- O viewer não recebe IDs de clínica/paciente porque não acessa dados.
- Nenhuma mudança de RLS. Necessidade descoberta durante execução devolve o item ao planejamento e exige teste com duas contas.

## 13. Referência visual obrigatória

Antes do código, criar e aprovar:

`plans/artefatos/R-139d-visualizador-clinico-arquivos.html`

O artefato cobre desktop, mobile, controles de ajuste abertos, loading e erro/retry. Arquivos herda Dashboard/Meu Dia/Ficha e usa somente `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground` e `border-border`.

Sem gradiente decorativo, controles bubbly ou aparência de editor fotográfico genérico. Chrome pode transicionar em cerca de 150 ms; a imagem acompanha gestos sem atraso perceptível. Tokens e medidas aprovados serão extraídos para esta spec antes da execução.

### Artefato em revisão — ainda não é contrato visual

- **Artefato:** `plans/artefatos/R-139d-visualizador-clinico-arquivos.html`.
- **Brief:** `plans/design/R-139-visualizador-clinico-DESIGN.md`.
- **Rota mostrada:** `/dashboard/pacientes/[id]?aba=arquivos`.
- **Estados demonstrados:** pronto, ajustes, carregando, URL expirada/retry, desktop e mobile.

| Token/medida extraída | Valor |
|---|---|
| `--color-bg` / `--bg` | `#f4f4f6` (light), `#0d0d0d` (dark) |
| `--color-surface` | `#ffffff` (light), `#111112` (dark) |
| `--color-teal` | `#2f9c85` |
| palco clínico | `#080c0b` |
| toolbar desktop | 56 px lateral, fora da imagem |
| toolbar mobile | 62 px inferior, horizontal rolável; alvos de 44 px |
| viewport desktop | mínimo 620 px; imagem contida e centralizada |
| ajustes | painel de 248 px, fechado por padrão |

**Comportamento que o artefato fixa, se aprovado:** a imagem é a única superfície central;
brilho/contraste aparecem por demanda, o erro não cobre a explicação da ação e o mobile não
recebe controles flutuando sobre a região diagnóstica.

## 14. Invariantes

- Bytes e metadata do arquivo original nunca mudam.
- Viewport não gera write, upload ou autosave.
- Imagem e overlay não recebem transformações divergentes.
- Filtros nunca atingem o overlay.
- URLs permanecem temporárias e privadas.
- Não adicionar biblioteca de zoom/edição sem voltar ao planejamento.
- PDF, Word e outros documentos continuam no fluxo atual.
- O componente é compartilhável por R-139e sem duplicação do motor.

### Limite a decidir antes de expandir

O motor contratado recebe um `<img>` e cobre qualquer foto/radiografia elegível no lightbox.
PDF, Word e arquivos não-imagem continuam abrindo no fluxo atual: dar zoom, rotação e filtros
dentro do produto para eles requer outro viewer e não deve ser incluído por analogia sem uma
decisão explícita de escopo.

## 15. Gates de aceite

### Unitários

- clamp de zoom respeita `1–8`;
- reset restaura exatamente o objeto padrão;
- rotação percorre quatro estados;
- clamp de pan mantém 48 px visíveis;
- resize e rotação calculam limites válidos;
- filtros aceitam somente faixas contratadas.

### Integração

- lightbox usa o componente compartilhado;
- troca de `src` e fechamento restauram estado;
- URL expirada regenera sem trocar `documento.id`;
- nenhuma interação chama banco/Storage;
- PDF não entra no viewer;
- `overlay` de teste permanece alinhado em zoom/rotação.

### QA

- Comparar com artefato aprovado em desktop/mobile e light/dark.
- Testar mouse, trackpad, teclado e touch real.
- Testar panorâmica larga, periapical e fotografia vertical.
- Verificar extremos `1×/8×`, quatro rotações e filtros.
- Confirmar na rede ausência de upload/write.
- Reabrir e confirmar original + estado padrão.

## 16. Fora de escopo

- Integração e persistência de anotações na Apresentação — R-139e.
- Salvar enquadramento por usuário/documento.
- Crop, espelhamento, exportação processada ou sobrescrita.
- DICOM, medidas calibradas, laudo ou diagnóstico por IA.
- Zoom de PDF/Word.
- Comparação lado a lado ou sincronização entre dispositivos.
