# R-154 — Plano de tratamento fluido no Meu Dia

> **SPEC** · **R-154** · ⏳ fila
> **Aberto:** 2026-09-03 · **Fechado:** — · **Fase:** debate
> **Depende de:** R-149 (revisão legível) · preserva R-51/R-52/R-108b

## 1. Problema

O bloco “Plano e histórico” não representa com clareza todo o tratamento do paciente durante a
consulta. Uma pendência pode ficar invisível pela redução global de procedimento+âncora, e o
filtro de responsabilidade deixa procedimentos de outro dentista apenas no histórico, sem explicar
por que não são operáveis. Ao escolher “Registrar hoje”, o mesmo evento aparece como realizado no
rascunho e ainda como “A fazer” no plano persistido até o save final; isso parece duplicidade.

As ações persistidas (`A fazer` e `Próxima sessão`) esperam o `router.refresh()` para atualizar o
bloco. Em conexão real essa espera parece falha, leva o dentista a recarregar a página e quebra o
ritmo da consulta.

## 2. Direção registrada

- O plano deve mostrar a situação clínica completa do paciente, organizada por **minha fila**,
  **recebidos por encaminhamento** e **tratamento acompanhado por outro dentista**.
- Apenas o responsável atual pode alterar um evento. Item de colega continua visível com
  responsável e leitura clínica, mas não ganha atalho que contorne autoria; transferência acontece
  pelo encaminhamento explícito já existente.
- Cada evento indicado que continua clinicamente aberto precisa permanecer acessível. A redução
  por âncora só pode resolver um evento efetivamente substituído, nunca ocultar uma pendência
  independente.
- “Registrar hoje” move o item imediatamente para a revisão desta consulta com o estado
  **“será salvo como realizado”**; ele deixa de aparecer simultaneamente como pendência ativa.
- `A fazer` ↔ `Próxima sessão`, `Registrar hoje` e conclusão encaminhada atualizam a interface
  de forma otimista e reversível. A confirmação do servidor reconcilia em segundo plano; falha
  restaura o estado anterior e explica o motivo, sem exigir reload.
- As transições usam Motion leve (opacidade e posição, respeitando redução de movimento), sem
  animação decorativa, salto de layout ou ocultação de conteúdo.
- A organização visual deve manter o padrão de Dashboard, Meu Dia e Ficha: uma fila de trabalho
  explícita, histórico como leitura de apoio e ações junto do item a que se aplicam.

## 3. Questão que precisa da decisão do usuário

Para pendência de outro dentista, a proposta segura é: **aparecer no panorama, mas só o
responsável atual pode mudar status ou próxima sessão; o caminho para assumir é encaminhamento
explícito**. Permitir que qualquer dentista altere diretamente mudaria autoria clínica e RLS.

## 4. Fora desta fase de debate

- Não cria status clínico novo, migration, mudança de RLS ou reatribuição automática de autoria.
- Não altera orçamento, assinatura, histórico já persistido nem dados existentes.
- Não amplia o R-149 nem redesenha a tela inteira fora do fluxo de plano.
