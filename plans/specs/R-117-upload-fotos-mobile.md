# R-117 — Fotos clínicas no celular

> **SPEC** · **R-117** · ⏳ fila
> **Aberto:** 2026-08-18 · **Fechado:** — · **Fase:** contrato
> **Migration:** zero. Usa `paciente_documentos` e o bucket privado `fichas` já existentes.

## 1. Problema

Na aba Documentos, a foto original do celular vai diretamente ao Storage. Fotos modernas podem
passar de 20 MB; várias selecionadas elevam a memória do iPhone e causam uma falha opaca.
O input já aceita múltiplos arquivos, mas não há fila, redução de foto clínica nem recuperação
individual de erro.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| **Tirar foto** e **Selecionar fotos** | Um input genérico | Câmera simples; galeria em lote. Captura múltipla não é confiável em mobile. |
| Otimizar fotos clínicas uma por vez | Enviar original ou `Promise.all` | Reduz o pico de memória e tráfego. |
| PDF, documentos e imagem diagnóstica seguem originais | Comprimir qualquer imagem | Não degradar exame/radiografia por uma otimização de fotografia. |
| Rotação de 90° antes do envio | Editor completo de imagem | Corrige foto de lado sem abrir escopo de recorte, filtros ou anotação. |
| Caminho gerado com UUID | Nome original no Storage | Evita colisão e caracteres imprevisíveis; o nome continua salvo para exibição. |
| Limpar objeto se insert falhar | Deixar órfão no bucket | Mantém Storage e banco consistentes. |

## 3. Objetivo e como funciona

**Objetivo:** dentista ou secretária consegue tirar ou selecionar até 10 fotos clínicas de um
paciente, acompanhar o envio e terminar com cada foto vinculada ao paciente sem estourar a memória.

Na aba Documentos de `/dashboard/pacientes/[id]`, **Tirar foto** abre a câmera traseira e adiciona
uma foto; **Selecionar fotos** abre a galeria em lote. Cada foto clínica é redimensionada para, no
máximo, 2048 px no maior lado, convertida em JPEG qualidade 0,82 e enviada antes da próxima. Antes
de confirmar o envio, cada foto pode girar 90° à esquerda ou à direita.

## 4. Contrato técnico

### Arquivos

- `src/components/pacientes/DocumentosTab.tsx` — entradas, fila, progresso e recuperação.
- `src/lib/storage/otimizar-foto-clinica.ts` — função de browser pura, sem Base64.
- `src/lib/storage/otimizar-foto-clinica.test.ts` — dimensões, MIME e erro de decodificação.

```ts
export type FotoOtimizada = {
  arquivo: File;
  nomeExibicao: string;
  tamanhoOriginal: number;
};

export type OtimizarFotoResultado =
  | { ok: true; foto: FotoOtimizada }
  | { ok: false; erro: 'formato_nao_suportado' | 'imagem_corrompida' };

export function otimizarFotoClinica(
  arquivo: File,
  rotacaoGraus?: 0 | 90 | 180 | 270,
): Promise<OtimizarFotoResultado>;
```

- Câmera: `accept="image/jpeg,image/png,image/webp"` + `capture="environment"`.
- Galeria: mesmo conjunto de formatos e máximo de 10 fotos por seleção.
- HEIC/HEIF não é convertido nesta fase; a mensagem pede JPEG/PNG/WebP, sem alegar falta de memória.
- Cada foto grava `categoria: 'Fotografias'` em `paciente_documentos`.
- Caminho: `{clinicaId}/{patientId}/docs/{uuid}.jpg`; o nome exibido é preservado na linha.

## 5. Comportamento — o alvo funcional

| Estado | Quando acontece | O que a tela mostra | O que a função faz |
|---|---|---|---|
| Vazio | sem arquivos | CTAs Tirar foto e Selecionar fotos | não cria registro |
| Preparando | foto escolhida | “Preparando foto X de Y” | mantém só uma imagem em memória |
| Revisando | foto pronta antes do envio | miniatura + Girar à esquerda/direita | aplica rotação somente à cópia que será enviada |
| Enviando | foto pronta | miniatura e progresso X de Y | upload e insert sequenciais |
| Sucesso | item persistiu | foto na galeria | adiciona somente a nova linha |
| Erro de validação | >10, formato inválido ou documento >20 MB | erro por arquivo | não envia o inválido |
| Erro de envio | Storage/insert falha | arquivo que falhou + repetir | mantém os anteriores; limpa objeto se insert falhou |
| Sem permissão | RLS recusa | erro claro | não cria URL nem linha |

```
Tirar foto ou Selecionar fotos
  → valida quantidade e formato
  → para cada foto: revisa/rotaciona → otimiza sem Base64 → gera UUID → envia ao bucket privado
  → insere `paciente_documentos` → gera URL assinada → atualiza galeria
  → só então processa a próxima
```

| Situação | Resultado esperado |
|---|---|
| 5 JPEGs de 12 MP no iPhone | cinco cards aparecem, sem travar a interface |
| Foto pela câmera | uma nova fotografia anexada ao paciente |
| Foto horizontal acidental | gira 90° antes de confirmar | galeria exibe a orientação escolhida |
| PDF de 8 MB | arquivo original, sem recompressão |
| HEIC de galeria | erro explícito, sem upload parcial |
| Falha no banco após Storage | só o objeto recém-enviado é removido |

## 6. Referência visual

- **Rota:** `/dashboard/pacientes/[id]` · **Componente:** `DocumentosTab.tsx`.
- Extensão da barra existente, não redesign: `bg-surface`, `border-border`, `text-text-primary`,
  `text-text-secondary` e `rounded-2xl`.
- No celular, os dois CTAs não dependem de hover; o progresso é textual e usa `DexLoader` somente
  durante processamento.

## 7. Invariantes

- [ ] Bucket `fichas` continua privado e limitado à própria clínica.
- [ ] Fotos enviadas antes de uma falha posterior não são apagadas.
- [ ] Fluxo de foto clínica não altera arquivo diagnóstico nem documento existente.
- [ ] Rotação altera só a cópia JPEG otimizada; nunca o arquivo original local.
- [ ] Não usa Base64 nem processa duas fotos simultaneamente.
- [ ] Falha de insert remove apenas o objeto novo.
- [ ] O nome original nunca vira chave de Storage.

## 8. Gates de aceite

- [ ] iPhone real: tirar 5 fotos seguidas não mostra “memória insuficiente”; todas chegam à galeria.
- [ ] Android real: selecionar 10 fotos envia em sequência, com progresso visível.
- [ ] Foto acima de 2048 px vira JPEG com maior lado ≤2048 px; o original local não é alterado.
- [ ] Girar uma foto quatro vezes retorna à orientação inicial; a galeria mostra a orientação escolhida.
- [ ] PDF/imagem diagnóstica pelo fluxo de documento conserva o original.
- [ ] HEIC e 11 fotos falham com mensagem específica, sem objetos ou linhas criados.
- [ ] Falha simulada no insert não deixa objeto novo no Storage.
- [ ] Outra clínica não cria/lê documentos (teste com 2 contas).
- [ ] `npm run typecheck` e teste unitário da otimização passam.

## 9. Fora de escopo

- Vídeos, recorte, filtros, anotação e OCR de foto.
- Alterar ou recomprimir radiografias, exames e documentos existentes.
- Contratos, assinatura eletrônica, PWA/offline.
