# R-129e — Edição explícita de ficha histórica

> **SPEC** · **R-129e** · fase **plano — aguardando execução**
> **Aberto:** 2026-08-24 · **Migration:** zero

## 1. Problema

Ao corrigir uma ficha já salva, o dentista clica na caneta no cabeçalho, altera o corpo e precisa
descer até `Salvar Evolução`. Em ficha longa, a ação sai do contexto e parece que a edição não
tem fim.

## 2. Decisão

Manter o save atômico da ficha inteira, mas deixar seu estado explícito. Ao entrar em edição,
uma barra acompanha o viewport com ficha/data, alterações pendentes, Descartar e Salvar.
Atalho de teclado não é caminho principal.

## 3. Objetivo e funcionamento

O dentista abre `Editar ficha`, corrige qualquer card e salva de onde estiver. Depois do save,
permanece na mesma ficha e posição aproximada; não precisa voltar ao topo ou rodapé.

## 4. Contrato técnico

```ts
type EstadoEdicaoFicha = {
  fichaId: string;
  snapshotInicial: string;
  alteracoesPendentes: number;
};
```

- Ao `handleEdit`, normalizar o payload editável e guardar snapshot inicial.
- `alteracoesPendentes` compara unidades editáveis (campos gerais, eventos, orto e detalhes),
  sem contar re-render como mudança.
- A barra chama o mesmo `handleSave`/`salvarFicha`; não cria endpoint nem save parcial.
- `Descartar alterações` restaura/fecha após confirmação se houver mudança.
- `beforeunload` protege aba/reload; fechar o painel também passa pelo guard.
- Antes do save, capturar âncora/scroll; após `fetchFichas`, reabrir a ficha salva e restaurar o
  contexto sem depender de timeout arbitrário.

## 5. Estados

| Estado | Barra |
|---|---|
| Sem mudança | `Salvar alterações` desabilitado; `Nenhuma alteração` |
| Alterado | contador + Descartar + Salvar habilitado |
| Salvando | botões bloqueados e loader no CTA |
| Erro | permanece em edição com dados intactos e mensagem |
| Sucesso | sai da edição e mantém a ficha no contexto |

## 6. Referência visual

- Desktop: barra sticky no limite inferior da área de prontuário.
- Mobile: fixa acima da navegação inferior e da safe-area.
- Texto: `Editando ficha de DD/MM` e `N alterações pendentes`.
- `Descartar` secundário; `Salvar alterações` teal; 44 px mínimos.
- O botão da caneta ganha rótulo visível/tooltip `Editar ficha`, sem mudar o card histórico.

## 7. Invariantes

- Save continua atômico e fail-closed se eventos não carregaram.
- Erro nunca fecha painel nem perde rascunho.
- Nenhuma atualização automática ou silenciosa.
- Permissões de editar/excluir não mudam.

## 8. Gates de aceite

- [ ] Ficha longa: salvar uma correção sem chegar ao rodapé original.
- [ ] Sem mudança: CTA desabilitado e nenhuma chamada ao servidor.
- [ ] Alterar evento + observação: contador reage e um único save persiste ambos.
- [ ] Descartar com mudança pede confirmação; cancelar mantém tudo.
- [ ] Falha de rede mantém edição e rascunho.
- [ ] Recarregar/fechar aba com mudança aciona aviso nativo.
- [ ] Após sucesso, a mesma ficha continua aberta/visível.

## 9. Fora de escopo

- Autosave, edição inline de ficha fechada e versionamento/auditoria clínica do R-79.
