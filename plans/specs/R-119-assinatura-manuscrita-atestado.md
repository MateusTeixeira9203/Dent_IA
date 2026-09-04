# R-119 — Assinatura manuscrita em atestado e receita

> **SPEC** · **R-119** · 🟡 ponte no ar; revisão jurídica pendente
> **Aberto:** 2026-08-18 · **Fechado:** — · **Fase:** aprovada · **Migration:** zero

## 1. Problema

Os PDFs de atestado e receita já identificam o dentista com nome e CRO, mas só exibem a linha
de assinatura vazia. A assinatura existente no sistema é do paciente/responsável, vinculada a
aceite e ficha; reutilizá-la como assinatura do dentista atribuiria o ato à pessoa errada.

## 2. Decisão

Ao emitir **atestado ou receita**, o dentista desenha sua assinatura manuscrita no modal antes
de gerar o PDF. A imagem entra no próprio PDF, acima do nome e CRO já existentes. É uma etapa
provisória até a integração ICP-Brasil: o produto não a chama de assinatura digital nem promete
validação por certificado.

## 3. Objetivo

O dentista gera atestado ou receita já organizados, com assinatura manuscrita, nome e CRO, em
um único fluxo. Pedido de exame permanece exatamente como está.

## 4. Contrato técnico

### `EmitirDocumentoModal`

- Quando `tipo` é `atestado` ou `receita` e há modelo selecionado, renderiza `SignaturePad`
  abaixo dos campos do modelo.
- Ao clicar em gerar, recusa pad vazio com mensagem clara; pad preenchido gera `data:image/png`.
- Botão do atestado/receita: `Assinar e gerar {tipo}`. Pedido de exame: `Gerar documento`.
- Trocar tipo ou fechar o modal descarta a assinatura que ainda não foi emitida.

### `emitirDocumento`

```ts
type EmitirDocumentoParams = {
  pacienteId: string;
  tipo: TipoDocumento;
  modeloId: string;
  valores: Record<string, string>;
  duasVias: boolean;
  assinaturaDataUrl?: string;
};
```

- Para `atestado` e `receita`, `assinaturaDataUrl` é obrigatória e aceita somente PNG em data
  URL, até 2 MB.
- Para pedido de exame, o campo é ignorado.
- A action continua gravando somente o PDF final em `fichas/{clinica}/{paciente}/docs`; não há
  nova tabela, bucket ou credencial.

### `gerarPDFDocumento`

```ts
interface DocumentoPDFData {
  // campos existentes
  assinaturaDataUrl?: string;
}
```

- Quando fornecida, a imagem aparece centralizada acima da linha e de
  `Nome — CRO: ...`, limitada a 180 × 52 pt e sem distorção.
- O PDF mantém a linha e os identificadores atuais; a imagem é evidência visual embutida no
  arquivo, não uma assinatura ICP-Brasil.

## 5. Comportamento

| Estado | Resultado |
|---|---|
| Atestado ou receita sem assinatura | Não gera; pede assinatura do dentista. |
| Atestado ou receita assinados | Gera, salva em Arquivos e abre o PDF final. |
| Troca de tipo/modal fecha | Assinatura temporária é descartada. |
| Pedido de exame | Sem campo novo e sem mudança de geração. |
| PNG inválido/grande | Action recusa antes de gerar ou salvar PDF. |

Exemplo principal: Dr. A escolhe “Atestado de Comparecimento” ou uma receita, preenche os
campos, assina e gera. O PDF mostra o desenho, `Dr. A — CRO: ...` e é salvo uma vez no paciente.

## 6. Referência visual

- Rota: `/dashboard/pacientes/[id]`; componente: `EmitirDocumentoModal`.
- Reusa `SignaturePad` existente, com o mesmo canvas branco e botão de limpar; entra abaixo dos
  campos do modelo e acima da ação principal.
- Sem novo modal, cor ou linguagem visual.

## 7. Invariantes

- [ ] Nunca usar assinatura de paciente/responsável como assinatura do dentista.
- [ ] A assinatura é obrigatória para atestado e receita, nunca para pedido de exame.
- [ ] PDF é salvo somente depois de validar a assinatura; falha não cria documento nem arquivo.
- [ ] Não rotular essa etapa como assinatura digital/ICP-Brasil.
- [ ] A futura ICP-Brasil substitui somente a origem de `assinaturaDataUrl`/PDF final, não o
      cadastro de paciente nem o fluxo de arquivo.

## 8. Gates de aceite

- [ ] Atestado ou receita sem traço no pad → mensagem; nenhum arquivo novo em Arquivos.
- [ ] Atestado e receita assinados → PDF contém o desenho, nome e CRO; registro tem o mesmo
      dentista emissor.
- [ ] Fechar e reabrir o modal → pad está vazio.
- [ ] Pedido de exame → não exibe pad e segue gerando normalmente.
- [ ] Data URL que não é PNG ou excede 2 MB → action retorna erro sem upload.
- [ ] `npm run typecheck` passa; teste manual em desktop e celular confirma que o canvas é utilizável.

## 9. Fora de escopo

- Certificado ICP-Brasil, assinatura qualificada, QR de validação ou integração com provedor.
- Assinatura persistente automática no perfil do dentista.
- Envio pelo WhatsApp (o PDF gerado permanece pronto para o fluxo futuro).
