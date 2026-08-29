# Estado — Odonto.IA

> **ESTADO** · atualizado em 29/08/2026

## Agora

🟡 **R-139d/e — Visualizador clínico de imagens** está no ar, aguardando validação manual,
contra
`plans/specs/R-139d-visualizador-clinico-arquivos.md` e
`plans/specs/R-139e-visualizador-apresentacao-anotacoes.md`.

**Objetivo:** criar um único viewport para radiografias/fotos, com zoom, pan, rotação e ajustes
temporários na Ficha; a Apresentação reutiliza o mesmo palco sem desalojar anotações persistidas.

**Contrato visual aprovado:** brief e dois artefatos interativos em
`plans/design/R-139-visualizador-clinico-DESIGN.md`,
`plans/artefatos/R-139d-visualizador-clinico-arquivos.html` e
`plans/artefatos/R-139e-visualizador-apresentacao-anotacoes.html`. A proposta tira controles da
área diagnóstica no mobile e fixa traços ciano com espessura constante no zoom.

**Direção confirmada na conversa:** a Apresentação já existente será incrementada, nunca
substituída; slides e símbolos do odontograma do plano de tratamento ficam como estão. O motor
cobre radiografias e fotografias. Falta definir se “documentos” também inclui PDF/Word dentro do
produto — isso exige viewer próprio e não entra por inferência no mesmo motor de imagem.

**Recorte de execução:** fotos e radiografias usam o motor compartilhado. PDF e Word continuam
no fluxo atual, porque exigem viewer próprio. Implementar primeiro R-139d em Arquivos e, sobre
o mesmo palco, integrar R-139e sem mudar os slides nem símbolos do odontograma.

**Publicado em produção:** lightbox de Arquivos, renovação de URL assinada no retry, zoom/pan/
rotação/filtros temporários, e o mesmo palco em imagem do editor + apresentação ao vivo. A camada
ciano agora recebe a transformação inversa ao escrever e usa traço de espessura constante.
O CI remoto passou com typecheck, testes, lint e build; a rota pública de login respondeu `200`.

**Gate restante:** validação manual autenticada de Arquivos e Apresentação em produção.

## Travado

Nada travado.

## Esperando você

1. Validação manual da Agenda R-138 em Android/iPhone e desktop (🟡 em `main`).
2. Resultado do teste manual do R-136 em produção.
3. Testar em produção o Dex R-139c, catálogo R-139a e face incisal R-139b.

**Observação da demonstração (28/08):** na revisão da consulta, o dentista não consegue
trocar/corrigir o procedimento que o Dex extraiu; também foi relatado que saídas do Dex ainda
chegam como `realizado` quando o procedimento não foi executado. Aguardar decisão de escopo
para abrir item próprio: tipo clínico controlado versus nome livre, e reprodução do status na
rota em que ocorreu.

## Próximo da fila

Intro do PWA amanhã; depois, auditoria da Agenda R-138. R-133 permanece na fila do `ROADMAP.md`.
