# R-139e — Visualizador clínico na Apresentação com anotações alinhadas

> SPEC · R-139e · ⏳ fila  
> Aberto em 2026-08-28 · Fase: implementação local concluída · Validação segue o item ativo R-139d/e

## 1. Problema

A Apresentação já permite desenhar anotações sobre radiografias/fotografias, mas não permite inspeção por zoom, pan, rotação ou ajustes. Simplesmente transformar a imagem quebraria o alinhamento porque as anotações são capturadas em coordenadas percentuais no overlay atual.

Este item integra o motor de R-139d ao editor e à apresentação ao vivo, preservando o schema e a semântica de R-99.

## 2. Decisões fechadas

- Reutilizar `VisualizadorImagemClinica`; é proibido criar outro motor de zoom.
- Refatorar `AnotacaoOverlayImagem` para uma camada sem imagem própria.
- Imagem e anotações ficam no mesmo palco transformável.
- A Apresentação existente é incrementada, não redesenhada: slides de texto, orçamento e
  odontograma/símbolos do plano de tratamento permanecem no fluxo atual. O viewer só compõe
  seções `tipo='imagem'`.
- Anotações permanecem em coordenadas percentuais `0–100` relativas à imagem.
- Transformações de viewport nunca são persistidas; apenas mudanças de anotação seguem o autosave atual.
- Filtros afetam só a imagem; traços ciano mantêm cor/contraste.
- Editor e modo ao vivo usam o mesmo cálculo geométrico.
- Nenhuma migration, mudança de RLS, novo formato de anotação ou dependência.

## 3. Pré-condições

R-139d deve entregar:

- `VisualizadorImagemClinica` e `EstadoVisualizacaoImagem`;
- palco com `overlay` no mesmo retângulo da imagem;
- funções puras de transformação e conversão geométrica;
- controles/gestos de navegação e ciclo de URLs.

R-99 continua dono do formato, ferramentas, validação Zod e persistência de anotações.

## 4. Origem e destino dos dados

### Documentos elegíveis

```text
usePlanejamentoPaciente
  └─ paciente_documentos
      filtros: clinica ativa + paciente + Radiografias/Fotografias
      └─ URLs assinadas do bucket fichas
          └─ PlanDocument[] em memória
```

### Seção da apresentação

```text
planejamento_secoes
  ├─ imagem_ids[] → paciente_documentos.id
  └─ anotacoes jsonb
      └─ schema Zod existente
          └─ seção resolve PlanDocument + URL temporária
              └─ VisualizadorImagemClinica
                  ├─ img recebe transformações/filtros
                  └─ CamadaAnotacaoImagem recebe mesma transformação
```

### Escrita

```text
ponteiro no viewport
  └─ transformação inversa
      └─ coordenada percentual 0–100 na imagem
          └─ tipo de anotação R-99
              └─ callback existente
                  └─ autosave/update de planejamento_secoes.anotacoes

zoom/pan/rotação/filtros
  └─ estado React local
      └─ nenhum write
```

`imagem_ids` guarda IDs estáveis; URL assinada nunca entra no row.

## 5. Contrato da camada de anotação

Reutilizar os tipos reais já definidos por R-99. O contrato conceitual é:

```ts
interface CamadaAnotacaoImagemProps {
  anotacoes: AnotacaoOverlay[]
  ferramenta: FerramentaAnotacao | null
  somenteLeitura: boolean
  onChange?: (anotacoes: AnotacaoOverlay[]) => void
  onFerramentaUsada?: () => void
}
```

A camada:

- não renderiza `<img>`;
- ocupa exatamente o retângulo natural/contido fornecido pelo palco;
- renderiza coordenadas `0–100` no mesmo SVG/sistema atual;
- recebe eventos de ponteiro apenas quando edição estiver habilitada;
- não conhece Supabase, seção ou documento;
- não aplica zoom/pan/rotação próprios.

## 6. Transformação inversa para escrita

Para cada ponto capturado:

1. Obter coordenada do ponteiro relativa ao viewport.
2. Subtrair pan e origem do palco.
3. Aplicar rotação inversa em torno do centro.
4. Dividir pela escala do zoom.
5. Converter para o retângulo real da imagem, excluindo barras de `contain`.
6. Normalizar x/y para `0–100`.
7. Limitar aos limites da imagem.
8. Entregar ao construtor da ferramenta R-99.

Na leitura, não se recalcula cada traço para o zoom. O overlay inteiro viaja junto com o palco. Isso garante que uma anotação criada em `4×/90°` reapareça no mesmo ponto em `1×/0°`.

Funções de matriz/conversão ficam no módulo matemático de R-139d, com testes puros; componente React não deve conter fórmulas duplicadas.

## 7. Arbitragem entre navegar e anotar

```ts
type ModoInteracaoImagem = 'navegar' | 'anotar'
```

| Modo | Um ponteiro | Dois ponteiros/wheel |
|---|---|---|
| Navegar | Pan, quando aplicável | Pinch/wheel faz zoom |
| Anotar com ferramenta | Desenha/posiciona anotação | Pinch só antes de iniciar traço |
| Somente leitura | Pan | Pinch/wheel faz zoom |

Regras:

- gesto iniciado como anotação permanece até `pointerup/cancel`;
- segundo ponteiro durante preview cancela o preview não persistido e só então inicia pinch;
- um dedo não faz pan enquanto ferramenta estiver armada;
- toolbar de zoom/rotação/reset continua utilizável no modo anotar;
- uso/consumo da ferramenta mantém a regra atual de R-99;
- falha ou cancelamento nunca cria anotação parcial.

## 8. Integração no editor

| Responsável atual | Mudança contratada |
|---|---|
| hook/service do planejamento | Nenhuma mudança de schema; continua resolvendo IDs, URLs e salvando anotações |
| `src/components/pacientes/anotacao-overlay-imagem.tsx` (`AnotacaoOverlayImagem`) | Extrair camada de desenho; remover propriedade da imagem no uso novo |
| editor da seção com imagem | Compor viewer + overlay editável + ferramentas existentes |
| autosave/update da seção | Receber somente alterações de anotação, nunca estado do viewport |

Ao trocar `imagem_ids[0]`, cancelar gesto, resetar viewport e carregar as anotações pertencentes à seção conforme contrato atual. A mudança não pode associar traços de uma imagem à outra silenciosamente.

## 9. Integração na apresentação ao vivo

`src/components/pacientes/ApresentarPanel.tsx` usa o mesmo viewer:

- resolve a imagem pelo ID e URL temporária recebidos do hook;
- renderiza anotações existentes;
- mantém edição ao vivo somente se essa capacidade já estiver habilitada no fluxo atual;
- quando somente leitura, nenhum evento chama `onChange`;
- troca de slide restaura viewport e cancela gestos;
- controles clínicos podem recolher, mas permanecem alcançáveis;
- setas não são capturadas pelo viewer porque navegam slides.

## 10. Filtros e legibilidade

- `brightness`, `contrast` e `invert` ficam exclusivamente no `<img>` de R-139d;
- overlay continua acima da imagem, sem CSS filter;
- cor ciano e espessura visual seguem R-99;
- se a escala geométrica também ampliar a espessura, o artefato deve decidir entre espessura escalada ou `vector-effect="non-scaling-stroke"`; a decisão aprovada será registrada aqui antes do código;
- controles não podem cobrir anotações centrais no mobile.

## 11. URLs, erro e segurança

- URLs vêm do fluxo autorizado de `usePlanejamentoPaciente` e mantêm validade de 1 hora.
- Em 403/expiração, retry regenera URL para o mesmo `paciente_documentos.id`.
- Retry não troca `imagem_ids`, não limpa anotações e não cria write.
- Consultas continuam filtradas por clínica e paciente.
- Bucket permanece privado; URL não é persistida.
- Nenhuma mudança de RLS; necessidade descoberta devolve o item ao planejamento.

## 12. Estados e bordas

| Caso | Resultado |
|---|---|
| Anotação antiga | Aparece alinhada em `1×` e após qualquer transformação |
| Anotação criada em `8×/270°` | Salva coordenada lógica e reabre no mesmo ponto |
| Filtro + anotação | Pixels mudam; traço não muda |
| Resize/orientação | Recalcula palco sem alterar coordenadas persistidas |
| Troca de slide | Reseta viewport, preserva anotações salvas |
| Troca de imagem da seção | Não reutiliza preview/gesto da imagem anterior |
| URL expirada | Retry preserva IDs e anotações |
| Somente leitura | Zoom/pan funcionam; nenhuma anotação é alterada |

## 13. Referência visual obrigatória

Antes do código, criar e aprovar:

`plans/artefatos/R-139e-visualizador-apresentacao-anotacoes.html`

O artefato cobre editor desktop/mobile, modo navegar/anotar, apresentação ao vivo, controles recolhidos/abertos e erro. Deve preservar o palco escuro e o ciano aprovados em R-99, além da hierarquia existente.

A implementação copia o artefato. Tokens, medidas, posição da toolbar e comportamento de recolhimento serão extraídos para esta spec antes da aprovação final.

### Artefato em revisão — ainda não é contrato visual

- **Artefato:** `plans/artefatos/R-139e-visualizador-apresentacao-anotacoes.html`.
- **Brief:** `plans/design/R-139-visualizador-clinico-DESIGN.md`.
- **Superfícies mostradas:** editor de seção e apresentação ao vivo, com modo navegar/anotar.

| Decisão visual proposta | Valor/posição |
|---|---|
| palco ao vivo | `#080c0b`, preservando o carvão já usado pela Apresentação |
| cor de anotação | `#22d3ee`, exclusiva de traços clínicos |
| toolbar do editor | acima do palco, fora do retângulo real da imagem |
| toolbar de viewport no editor | 52 px lateral no desktop; faixa inferior no mobile |
| ferramentas ao vivo | barra compacta centrada no topo; vai para baixo no mobile |
| zoom demonstrado | `2×`, com imagem e overlay no mesmo palco |
| espessura de traço | constante: `vector-effect="non-scaling-stroke"` |

**Comportamento que o artefato fixa, se aprovado:** filtros são da imagem, nunca do ciano; o
modo de anotação troca explicitamente com Navegar; imagem e traços viajam juntos, mas ampliar uma
região não transforma um traço fino em uma mancha grossa.

## 14. Invariantes

- Schema de `planejamento_secoes.anotacoes` não muda.
- Coordenadas persistidas continuam `0–100` relativas à imagem.
- Viewport nunca dispara autosave.
- Imagem e overlay compartilham um único palco/transform.
- Filtros não alteram traços.
- URL assinada não é persistida.
- R-139d é o único motor geométrico.
- Nenhuma anotação pode migrar silenciosamente para outra imagem/seção.
- Editor e apresentação ao vivo produzem a mesma posição visual.
- O slide/bloco de odontograma continua renderizando seus símbolos atuais e não importa o
  viewer de imagem.

## 15. Gates de aceite

### Unitários

- ida/volta viewport ↔ percentual funciona em zoom 1, 2 e 8;
- cobre rotações 0/90/180/270 e pans nos limites;
- ponto fora da imagem é limitado/ignorado conforme ferramenta atual;
- cancelamento por segundo ponteiro não persiste preview;
- filtros não entram no cálculo geométrico.

### Integração

- editor e apresentação importam o viewer de R-139d;
- alteração de viewport não chama update/autosave;
- anotação criada transformada persiste e reabre alinhada;
- somente leitura não chama `onChange`;
- retry mantém documento, seção e anotações;
- troca de slide/imagem cancela gesto e reseta viewport.

### QA

- Comparar todas as superfícies ao artefato aprovado.
- Testar mouse, trackpad, teclado e touch real.
- Conferir alinhamento nos extremos de zoom e quatro rotações.
- Testar cada ferramenta de R-99 sobre imagem transformada.
- Conferir editor light/dark e palco escuro ao vivo.
- Recarregar: viewport volta ao padrão; anotações salvas permanecem.
- Confirmar na rede que apenas mudança de anotação gera write.

## 16. Fora de escopo

- Novo formato, ferramenta ou histórico de anotação.
- Salvar enquadramento/filtros por slide.
- Incorporar filtros ou traços ao arquivo original.
- Exportar imagem anotada.
- Comparação lado a lado, DICOM ou medidas calibradas.
- Diagnóstico/laudo por IA.
- Redesign geral do editor ou da apresentação.
