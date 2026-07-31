# Gate de 2 contas — R-29 · R-32 · R-34 (I6/G9)

> **Roteiro de verificação** · aberto 2026-07-30 · executado por: Mateus
> Cobre os três itens 🟡 numa passada só. **Login com senha é você** — eu não faço.
> Resultados voltam pra mim e eu marco os checkboxes nas 3 specs.

## Antes de começar — o que já foi conferido por leitura no banco

Isto **não** substitui o gate; serve pra garantir que ele vai testar a coisa certa e não
falhar por um motivo bobo.

| Conferido | Estado |
|---|---|
| `get_my_dentista_id()` filtra por clínica (migration 120, R-29) | ✅ no ar |
| `can_see_orcamento()` existe e `orcamentos_select` usa ela (migration 121, R-32) | ✅ no ar |
| RPCs `gerar_parcelas_orcamento` e `definir_plano_avista` (R-34) | ✅ no ar |
| Colunas `plano_forma`, `plano_parcelas`, `valor_acordado`, `condicoes_pagamento` | ✅ no ar |

## ⚠️ Regra da sessão: **Clindent é produção com paciente real**

Nas contas da Clindent, **só olhar**. Não criar orçamento, não registrar pagamento, não
apagar nada. Os gates que exigem escrita rodam na conta de teste (passo 4), em clínica de
teste. Se um gate parecer exigir escrita na Clindent, pule e me avise.

## Os números esperados — medidos no banco hoje

Clindent Odontologia tem **54 orçamentos**, distribuídos assim:

| Autor | Papel | Orçamentos |
|---|---|---|
| Renato Gonçalves Teixeira | dentista | 19 |
| Jenaina Massa Teixeira | dentista | 17 |
| Gabriel de O. Teixeira | **admin** | 9 |
| Armando | dentista | 8 |
| Paula Monteiro de O. Teixeira | dentista | 1 |

Pacientes na Clindent: **232** (todo dentista deve ver os 232 — decisão de produto do R-29).

O número a ler é o rodapé da lista: *"Exibindo X de Y orçamentos"*. Use **Y**.

---

## Passo 1 — Paula (dentista comum) · `pmoteixeira@yahoo.com.br`

É a conta mais reveladora: ela tem **1** orçamento próprio num universo de 54.

- [ ] **1.1** `/dashboard/orcamentos` → esperado **1**. Se aparecer 54, a R-32 vazou pra dentista comum.
- [ ] **1.2** `/dashboard/pacientes` → esperado **232**. Se vier menos, o filtro antigo do R-29 ainda está de pé.
- [ ] **1.3** Abrir um paciente **que não é dela** pela lista → tem que abrir normalmente.
- [ ] **1.4** Colar na URL o id de um orçamento do **Renato** → tem que **negar** (404 / vazio).
      *(me peça o id se quiser um específico — eu pego sem escrever nada)*
- [ ] **1.5** `/dashboard/financeiro` → só o dinheiro dela. Anote o **Saldo do mês**: ______

## Passo 2 — Renato (o outro dentista comum) · `rgteixeira04@yahoo.com.br`

Este é o par que o **R-29** exige: dois dentistas **comuns**. Testar com admin não prova
o invariante do R-29 — visibilidade de admin é regra do R-32.

- [ ] **2.1** `/dashboard/orcamentos` → esperado **19**.
- [ ] **2.2** `/dashboard/pacientes` → esperado **232** (mesmos da Paula).
- [ ] **2.3** URL direta do único orçamento da **Paula** → tem que **negar**.

> **Se 1.4 e 2.3 negarem, o silo entre dentistas comuns está de pé.** É o coração do R-29.

## Passo 3 — Gabriel (admin) · `goteixeira2001@gmail.com`

- [ ] **3.1** `/dashboard/orcamentos` → esperado **54** (antes da migration 121 via 9). **Este é o R-32 G1.**
- [ ] **3.2** Abrir um orçamento de outro dentista → **vê os itens e valores**.
- [ ] **3.3** No mesmo orçamento: **Editar** e **Excluir** não podem funcionar pra ele
      (decisão do R-32 §9: admin só vê). Se editar salvar, é furo.
- [ ] **3.4** **`/dashboard/agenda` → conjunto INALTERADO, só a agenda dele.**
- [ ] **3.5** **`/dashboard/financeiro` → conjunto INALTERADO, só o dinheiro dele.**

> **3.4 e 3.5 não são opcionais.** São a prova de que o `can_see_orcamento` ficou dentro
> de orçamento e não vazou pra agenda e dinheiro. Se o admin passar a ver a agenda ou o
> financeiro dos outros, a migration 121 vazou e o item volta pra 🔵.

## Passo 4 — Conta multi-clínica · `mateusteixeira834@gmail.com`

É a única conta com 2 clínicas (Império + Teste01). **Aqui pode escrever** — é clínica de teste.

- [ ] **4.1** Entrar na **Teste01**, criar um orçamento → **ele aparece na lista** e **abre pra editar**.
      *(é exatamente o que estava quebrado antes da migration 120: criava e não enxergava)*
- [ ] **4.2** Salvar uma ficha na Teste01 → **me avise**, eu confiro a linha no banco.
      Não confie na mensagem da tela: **UPDATE barrado por RLS devolve sucesso com 0 linhas.**
- [ ] **4.3** Trocar pra **Império** → nada da Teste01 aparece. *(já verificado 30/07, repetir é barato)*

## Passo 5 — Secretária (Portaria) · `aerodonto@yahoo.com.br`

- [ ] **5.1** `/dashboard/orcamentos` → esperado **54** (comportamento inalterado — ela já via tudo).
- [ ] **5.2** Pacientes, agenda e financeiro: iguais ao que ela via antes.

## Passo 6 — R-34, o que só se prova com 2 pessoas e com clique

- [ ] **6.1 (G9)** Pegue **um** recebimento do mês na Clindent. O total do mês que a
      **secretária** vê e o que o **dentista dono** vê batem? Um contar 2× é o bug de receita
      dobrada. Secretária: ______ · Dentista: ______
- [ ] **6.2 (G7)** Abrir o **PDF** de um orçamento **com plano de pagamento** e conferir se a
      condição negociada aparece. *(a escrita no banco está confirmada; os 3 leitores não
      foram tocados — "deveria" funcionar, mas ninguém abriu um PDF ainda)*
- [ ] **6.3 (G7)** Mesma coisa no **prontuário**.

---

## Como me reportar

Só os números e o que destoou. Formato que basta:

```
1.1 = 1     1.2 = 232    1.4 negou
2.1 = 19    2.3 negou
3.1 = 54    3.3 bloqueou    3.4 inalterada    3.5 inalterado
4.1 ok      5.1 = 54
6.1 secretária X / dentista Y     6.2 apareceu?   6.3 apareceu?
```

**Qualquer número diferente do esperado, pare nele e me diga** — não siga adiante. Um furo
de RLS achado no passo 1 muda o que os passos seguintes significam.

## Resultado

*(preencho quando os números voltarem, e daí marco os checkboxes das specs
[R-29](../specs/R-29-silo-resto-modelo-antigo.md) ·
[R-32](../specs/R-32-orcamento-visivel-autor-admin-secretaria.md) ·
[R-34](../specs/R-34-plano-de-pagamento.md))*
