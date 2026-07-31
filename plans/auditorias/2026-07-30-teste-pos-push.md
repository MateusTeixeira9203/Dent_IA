# Roteiro de teste pós-push — 30/07, 20h

> Você vai testar depois do push e não precisa lembrar o que mudou. Está tudo aqui.
> **Regra:** o que destoar, anote o número do passo e me mande. Não tente consertar.

## O que sobe

| Item | Em uma linha |
|---|---|
| **R-30** | Ficha: procedimento passa a ter fonte única. Destrava **24 fichas** que não salvavam ao editar |
| **R-29** | Lista de pacientes sem o filtro antigo por dentista |
| **R-34** | Plano de pagamento: definir à vista/parcelado na criação do orçamento |
| **R-35** | Segurança: bucket de avatar privado, `google_tokens` por clínica, outros |
| migrations | 116–123 (**já estavam em produção** — o commit só registra o arquivo) |

## Antes de começar

1. Confirmar na Vercel que o deploy está **READY** (não "Building").
2. **Ctrl+Shift+R** no navegador. Sem isso você testa o bundle velho e culpa o código novo.

---

## 1. Ficha — é o que estava te incomodando

| # | O que fazer | Esperado | Seria bug |
|---|---|---|---|
| 1.1 | Abrir uma ficha que tenha **arcada ou boca toda** marcada, clicar em editar, mexer em algo e salvar | Salva normal | Erro ao salvar, ou salvar e não mudar nada |
| 1.2 | Abrir ficha pronta com **vários dentes**, clicar em editar | O odontograma abre **com os registros que já existiam** | Aparecer odontograma vazio/novo, como se fosse outra ficha |
| 1.3 | Ainda em 1.2: salvar sem mexer em nada, reabrir | **Nada sumiu** — nem os antigos nem os novos | Sobrar só os últimos, ou só os antigos |
| 1.4 | Gerar orçamento a partir de uma ficha **antiga** (das que você fez antes desta semana) | Vem **pré-preenchido** com os procedimentos | Vir vazio, com um item em branco |
| 1.5 | Gerar orçamento de uma ficha que tenha **profilaxia / raspagem / clareamento** (boca toda) | Esses procedimentos **aparecem** no orçamento | Não aparecerem — era o defeito antigo |
| 1.6 | Olhar um dente que você **selecionou** mas ainda não registrou nada | Fica com **contorno**, sem preenchimento sólido | Ficar pintado igual a "realizado" (o dente azul) |

> **1.4 é o que eu quase quebrei hoje.** Das 87 fichas, 58 só têm o procedimento em texto —
> se o orçamento lesse só do odontograma, essas 58 viriam vazias. Corrigido antes do push:
> evento primeiro, texto como rede.

## 2. Pacientes

| # | O que fazer | Esperado | Seria bug |
|---|---|---|---|
| 2.1 | Abrir a lista de pacientes | **232 pacientes** | Número menor |
| 2.2 | Abrir o perfil de um paciente que **não é seu** | Abre normal | Erro ou tela vazia |

## 3. Orçamento e pagamento

| # | O que fazer | Esperado | Seria bug |
|---|---|---|---|
| 3.1 | Criar orçamento e, na coluna da direita, escolher **Parcelado**, 3x | Mostra a prévia "3× de R$ ..." | Não mostrar, ou mostrar valor errado |
| 3.2 | Salvar e reabrir o orçamento | As **3 parcelas** estão lá com as datas certas | Faltar parcela ou data errada |
| 3.3 | Clicar no valor de uma **parcela pendente** e marcar como paga | A parcela vira paga | **Aparecer um pagamento novo e a parcela continuar pendente** — é o bug de recebimento dobrado |
| 3.4 | Abrir o **PDF** de um orçamento com plano | A condição negociada aparece | Não aparecer |
| 3.5 | Mesma coisa no **prontuário** | Idem | Idem |

## 4. Configurações e perfil

| # | O que fazer | Esperado | Seria bug |
|---|---|---|---|
| 4.1 | Configurações → trocar o **logo da clínica** | Sobe e aparece | Sumir depois de recarregar |
| 4.2 | Perfil → colocar **foto** | Sobe e aparece | Idem |
| 4.3 | Se você usa **Google Calendar**, abrir a agenda | Continua conectado | Pedir pra reconectar |

---

## ⚠️ Problemas que **já existem** e **não** foram corrigidos nesta leva

Não reporte como regressão — eu já achei e estão na fila.

| O quê | Detalhe |
|---|---|
| **"Registrar Recebimento" do `/dashboard/financeiro` nunca funcionou** | `dentista_id` é obrigatório no banco e o código não grava. **Toda** tentativa falha. Use o caminho pelo orçamento |
| **Microfone não grava no iPhone** | O código não tenta `audio/mp4`, único formato do Safari iOS. A mensagem de erro fala de permissão e engana |
| **Busca sensível a acento** | "Antonio" e "Antônio" devolvem **conjuntos diferentes**. 44 de 244 pacientes (18%) têm acento |
| **1 paciente vai ficar sem foto** | O avatar dele está salvo como URL pública e o bucket virou privado. Só esse |
| **6 orçamentos com "a receber" fantasma** | R$ 5.100 em orçamentos quitados que ficaram com parcela pendente aberta. Dado antigo, não novo |

---

## Como me reportar

Número do passo + o que aconteceu. Ex.: *"1.2 — abriu odontograma vazio"*.
Se der erro na tela, o texto do erro. Se não der erro mas o dado estiver errado, me diga
**qual paciente e qual ficha**, que eu confiro direto no banco.
