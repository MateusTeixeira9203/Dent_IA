# Mapa de atrito — 3ª rodada (recontagem completa)

> **Auditoria** · 2026-08-09 · workflow de 14 agentes (7 mapeadores + 7 verificadores
> adversariais), mesma estrutura da 1ª rodada (30/07). **Método:** leitura de código atual +
> SQL SELECT-only em produção — sem sessão de browser autenticada (não disponível nesta
> sessão). Onde isso deixa margem real, cada caminho tem uma seção "precisa de teste ao vivo".

## Placar

| Caminho | 30/07 | Hoje | Word | Notas |
|---|---|---|---|---|
| Orçamento a partir da ficha | 3,5 (2 sem acidental) | **2** | 3 | Piso atingido, confiança alta |
| Registrar atendimento (ficha) | 7–9 (5) | **5 frio / 4 quente** | 5 | Caminho **novo**, não é "antes/depois" direto |
| Histórico do dente | 6 (3) | **1** | 3 | Só dentro do Meu dia — fora dele, sem mudança |
| Agendar (avulso) | 8 (5) | **6** | 3 | Bug da data (#5) **reaberto** — eu tinha dito errado que estava corrigido |
| Receber dinheiro | 8 (2) | **4** | 3 | Piso de 2 existe pronto no servidor, só não está plugado |
| Achar paciente c/ acento | 3 (erra) | **3, bifurcado** | 3 | Acerta em 4 telas, erra em 2 (Ctrl+K, Atender agora) |
| Quem faltou e não voltou | ~58 | **~162** | não responde | Sem mudança de UI — o custo subiu porque o volume de produção cresceu |

## 1. Orçamento a partir da ficha — 2 gestos, confirmado

R-83+R-84+R-85 não reduziram o atrito acidental: **eliminaram**. Clicar "Gerar orçamento" já
grava a ficha em background e pula direto pra etapa "itens", pré-preenchida; "Criar Orçamento"
fecha. Verificador tentou 3 refutações (atalho de teclado, chip pré-preenchido, submit
automático) — nenhuma se sustentou.

**Achado de graça:** o pré-preenchimento só funciona pra eventos com `status='indicado'`, e o
chip nasce em `'realizado'` por padrão — sem trocar antes, "Gerar orçamento" abre com 1 linha
vazia, sem nenhum aviso do motivo. Não é bug novo, é regra nunca comunicada na UI.

## 2. Registrar atendimento — 5 frio / 4 quente

**Ressalva importante:** a rota `/dashboard/meu-dia` inteira nasceu em 31/07, um dia **depois**
do mapa original — comparar "7–9 → 5" como melhoria é enganoso, é um caminho reconstruído do
zero. O número de hoje: digitar o procedimento no campo mágico → clicar no chip de sugestão
local (zero IA, zero rede, casa tipo+dente do mesmo texto, R-62) → "Salvar e passar". O campo
mágico nasce fechado (+1 gesto), mas não remonta entre pacientes — do 2º atendimento em diante
já fica aberto.

## 3. Histórico do dente — 1 gesto, só dentro do Meu dia

Correção de cronologia: eu tinha atribuído isso ao R-58 (04/08); é o **R-78** (08/08).
Tocar o dente no espelho abre direto o histórico agregado (hoje + todas as visitas). Mas esse
atalho é **exclusivo do Meu dia** — na ficha do paciente fora do dia de atendimento, tocar o
dente ainda pula direto pro editor, sem histórico. Fora do Meu dia, a única forma de montar o
histórico continua sendo abrir ficha por ficha manualmente.

## 4. Agendar — 6 gestos, e o bug da data está de volta na fila

**Eu errei na 2ª rodada:** disse que o achado #5 (data ignora o dia em foco) tinha sido
corrigido, citando `agendamentos-client.tsx:1780`. Essa linha é do modal de **Encaixe**
(walk-in, só secretária) — um formulário separado. O modal real "Novo Agendamento" (botão do
cabeçalho, tecla `N`, "Agendar agora" do mês) **continua** abrindo sempre com a data de hoje,
não com o dia sendo visualizado. Confirmado por dois agentes independentes, código idêntico
nos dois passes.

O que de fato melhorou desde 30/07 foi o redesenho R-27b (Sheet → Dialog com botão fixo, sem
rolar pra Salvar) — a queda de 8 pra 6 é essa, não a data.

**Achado à parte, não corrigido:** clicar num slot vazio da grade Dia/Semana já pré-preenche
tudo (existe desde 22/07, R-13) e cai pra 4 gestos — mas só serve se a secretária já estiver
navegando a grade certa; senão o custo de chegar lá anula o ganho.

## 5. Receber dinheiro — 4 gestos, piso de 2 pronto e não plugado

R-39a (coluna do dinheiro permanente) e R-28 (fecha parcela por UPDATE) fecharam os dois
achados acidentais de 30/07. O caminho de hoje: abrir orçamento → clicar no valor pendente →
trocar "Pix" (default) por "Dinheiro" → "Marcar como Pago".

**O achado mais barato desta rodada:** `registrarPagamentoRapido` já existe no servidor
("R-34 §7.1 — o atalho de 1 clique") e já tem um botão irmão ("Registrar Dinheiro") em
`orcamentos-client.tsx` — mas ele só aparece pra secretária, só quando o orçamento **não** está
aprovado, e nunca foi portado pro modal que hoje é o caminho real
(`detalhe-orcamento-modal.tsx`). Ligar esse fio cai o caminho de 4 pra 2 gestos.

**Correção a uma nota do handoff de 09/08:** o achado "`excluirPagamento` não tem NENHUMA
policy de DELETE" está impreciso. SQL confirma 1 policy (`pagamentos_access`, `cmd=ALL`, cobre
DELETE) — o bug real é outro: o delete não confere linhas afetadas e o client trata qualquer
não-erro como sucesso, **mesma classe do `excluirOrcamento` antes do R-66**, não "zero
proteção". Corrigido no ROADMAP.

## 6. Achar paciente com acento — bifurcado: 4 telas acertam, 2 erram

Minha checagem solo (mensagem anterior) estava **errada**: busquei coluna com "normaliz" no
nome; a coluna real se chama `nome_busca` (migration `125`, 31/07, função `normalizar_nome()`
+ trigger). Confirmado ao vivo: 319/319 pacientes com `nome_busca` populada, e funciona em
Pacientes, Agendamentos, Financeiro e Orçamentos.

**O que ficou de fora, sem decisão consciente registrada:** `command-palette.tsx` (**Ctrl+K —
o atalho mais rápido do app inteiro**, funciona de qualquer tela) e `atender-agora-modal.tsx`
(Encaixe do Meu dia) continuam com `ilike` cru. A spec do R-31a nomeia "5 telas" — essas duas
nunca estiveram na lista. Reproduzido ao vivo: "antonio" acha 9 pelo caminho quebrado, 11 pelo
corrigido — as 2 que faltam têm "Antônio" no meio do nome, não no início.

## 7. Quem faltou e não voltou — ~162 gestos, e o problema real piorou

R-26 segue não iniciado, zero mudança de UI na área. Mas o **dado de produção piorou** nesses
10 dias: 22 pacientes sem nenhum retorno após falta hoje (era 9 em 30/07, meu primeiro cálculo
do agente deu 24 — o verificador corrigiu pra 22 após reconferir 3 formulações de query). O
custo em gestos também subiu — não por regressão, por **volume**: dias de agosto já têm
24–25 agendamentos, o que força rolagem que quase não existia em julho.

**Achado de graça:** o botão "Ver Ficha" na agenda não passa `?tab=agenda` na URL, embora a
página do paciente já saiba ler esse parâmetro — 1 linha economiza 1 clique por paciente
checado.

## O que só um teste ao vivo resolve

Listado por caminho nos relatórios dos agentes (arquivo bruto do workflow, se quiser o
detalhe): tempo de espera perceptível no "Gerar orçamento" sem loading state, se o espelho do
odontograma exige rolagem em notebook 13", e principalmente o volume de rolagem em "Quem
faltou" — a única parte do número que o código não resolve sozinho.
