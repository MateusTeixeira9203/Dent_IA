# R-120 — Documentos e aceites assinados

> **Status:** 🟡 fluxo no ar; QA jurídico e de uso pendente · **aberto:** 2026-08-19
> **Escopo:** termos de uso da Odonto.IA + aceite de orçamento + TCLE pré-procedimento +
> conclusão de procedimento. **ICP-Brasil não entra nesta entrega.**

## Problema e decisão

Hoje o orçamento guarda uma assinatura desenhada e um snapshot de valores, e receitas/atestados
viram PDF em Arquivos. Não existe um documento clínico completo, congelado e baixável que prove
o consentimento do paciente antes e depois do procedimento; nem registro de qual versão dos
Termos da Odonto.IA o usuário aceitou.

Cada documento novo será produzido a partir de dados do servidor, apresentado para conferência,
assinado pelo paciente na presença do profissional e armazenado como PDF imutável. A assinatura
desenhada é um **aceite eletrônico provisório** — a interface não a chama de assinatura ICP ou
certificado digital. ICP-Brasil substitui esse método na próxima atualização.

Os quatro textos entregues pelo Mateus são fonte de conteúdo, não parecer jurídico. Antes de
ativar em produção, advogado deve aprovar a versão final, os campos obrigatórios e a qualificação
da Odonto.IA/clinica. Termos não tentam afastar responsabilidades que a lei não permite afastar.

## O que entra

| Fluxo | Onde começa | Resultado |
|---|---|---|
| Termos de uso B2B | primeiro acesso autenticado, antes do dashboard | aceite versionado por usuário, com data/hora e evidência técnica mínima |
| Aceite de orçamento | ação atual de aceite no orçamento | mantém `assinaturas`/snapshot atual e gera PDF da parte aprovada com a assinatura do paciente |
| TCLE | ação "Gerar TCLE do paciente", antes de executar | documento por procedimento indicado, com dados clínicos conferidos pelo dentista |
| Conclusão | botão já existente "Coletar assinatura" no prontuário, depois da execução | a mesma assinatura trava os eventos e gera o PDF dos realizados selecionados |

Todos aparecem em **Documentos** e no resumo da ficha/orçamento correspondente. Ao finalizar,
o modal oferece **Abrir PDF**; depois, o arquivo permanece disponível para abrir e baixar em
Documentos, bloqueado contra edição e exclusão pelo fluxo normal.

## Fora de escopo

- ICP-Brasil, certificado A1/A3, assinatura qualificada, biometria, OTP/SMS/WhatsApp, link remoto
  ou envio automático por WhatsApp/e-mail.
- Cobrança/Checkout Stripe, preço, trial e aceite comercial do plano: continuam no R-92/R-121.
- Biblioteca automática de riscos por TUSS, modelo por especialidade, testemunhas e revogação
  digital; campos livres explícitos atendem esta primeira versão.
- Alterar o desenho da landing, onboarding ou tela de login.

## Jornada

```text
login autenticado → Termos vigentes? não → /termos-de-uso → aceitar → destino original

TCLE/orçamento → preencher o que não vem do prontuário → revisar prévia → paciente assina
→ servidor congela dados + gera PDF + salva

prontuário → Coletar assinatura → todos os realizados ainda não assinados já selecionados
→ informar/revisar orientações → paciente assina uma vez
→ a mesma assinatura trava os eventos + gera o PDF + salva em Arquivos
```

### Regras por documento

- **Termos:** a aceitação ocorre uma vez por versão; nova versão exige novo aceite antes de usar
  o dashboard. Não é vinculada ao Stripe e não inicia trial.
- **Orçamento:** somente itens `aprovado=true` entram. O valor devido e as condições vêm do
  snapshot servidor-side já usado em `aceitar_orcamento`; nunca do formulário do navegador.
- **TCLE:** só pode apontar a evento/procedimento ainda não realizado. Procedimento, dente/região,
  dentista e paciente vêm do banco; justificativa, explicação leiga, alternativas, riscos,
  consequências e orientações são campos que o dentista revisa/preenche.
- **Conclusão:** nasce exclusivamente do gesto de assinatura que já existe no prontuário. O gesto
  padrão cobre todos os eventos realizados ainda não assinados; "Selecionar quais assinar" cobre
  o subconjunto escolhido. Inclui materiais/observação já registrados e um único campo obrigatório
  de orientações; intercorrência e retorno continuam com os fallbacks do template. Uma única
  `assinaturas`/imagem é ligada aos eventos e reutilizada pelo PDF — nunca há segundo pad.
- A ação genérica vira "Gerar TCLE do paciente". Conclusão não aparece ali,
  eliminando dois pontos de entrada capazes de assinar o mesmo procedimento.
- Assinaturas clínicas anteriores à R-120 permanecem válidas e visíveis como hoje, sem backfill de
  declarações novas. Só assinaturas coletadas pelo fluxo novo geram a conclusão automaticamente.
- **Paciente menor/incapaz:** nesta rodada o formulário exige nome e CPF do representante antes
  de permitir assinatura. A relação/guarda é declarada no documento; validação documental fica
  fora de escopo.

## Contrato técnico

### Dados novos (uma migration aditiva)

```sql
create table public.aceites_termos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.users(id) on delete cascade,
  clinica_id uuid references public.clinicas(id) on delete set null,
  versao text not null,
  conteudo_hash text not null,
  aceito_em timestamptz not null default now(),
  ip inet,
  user_agent text,
  unique (usuario_id, versao)
);

create table public.documentos_aceite (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  paciente_id uuid not null references public.pacientes(id) on delete restrict,
  dentista_id uuid not null references public.dentistas(id) on delete restrict,
  ficha_id uuid references public.fichas(id) on delete set null,
  orcamento_id uuid references public.orcamentos(id) on delete restrict,
  assinatura_id uuid references public.assinaturas(id) on delete restrict,
  tipo text not null check (tipo in ('orcamento', 'tcle', 'conclusao_procedimento')),
  template_versao text not null,
  template_hash text not null,
  conteudo_snapshot jsonb not null,
  assinatura_paciente_ref text not null,
  assinado_por text not null,
  assinado_em timestamptz not null default now(),
  pdf_path text not null unique,
  paciente_documento_id uuid not null references public.paciente_documentos(id) on delete restrict,
  unique (assinatura_id),
  check ((tipo = 'orcamento') = (orcamento_id is not null))
);
```

RLS: leitura segue equipe clínica da clínica ativa; não haverá `UPDATE` ou `DELETE` do cliente.
Criação somente por server action/RPC autorizada. A migration ganha teste manual com duas contas
(dentista e secretária) antes de produção.

### Código e fontes de verdade

- `src/lib/legal/`: termos e templates versionados em código, hash SHA-256 do conteúdo renderizado;
  nenhuma cláusula vem do client.
- `src/server/legal/`: resolve dados da clínica/paciente/dentista, valida a fase clínica,
  monta snapshot, persiste a assinatura PNG e o PDF final numa transação lógica com limpeza de
  arquivos órfãos em falhas.
- `src/app/termos-de-uso/`: página protegida de aceite. O guard fica no layout do dashboard,
  evitando consulta duplicada em middleware em toda requisição estática.
- `src/app/dashboard/pacientes/[id]/`: o modal de aceite fica restrito ao TCLE; a conclusão usa o
  diálogo de assinatura já existente em `FichasTab` e não cria uma segunda área de arquivos.
- `src/lib/pdf/documento.ts`: recebe conteúdo final estruturado e assinatura do paciente para
  renderizar o PDF. O PDF já salvo nunca é refeito a partir de dados atuais.
- `aceitarOrcamento`: preserva a RPC `aceitar_orcamento`; depois do aceite bem-sucedido cria o
  `documentos_aceite` e o `paciente_documentos` correspondente. Se a geração falhar, o aceite
  não é apresentado como “documento finalizado”; a operação pode ser retomada sem aceitar de novo.
- `assinarProcedimentos`: preserva a RPC `assinar_procedimentos`; quando recebe os campos de
  conclusão, captura o UUID retornado pela RPC e chama o gerador idempotente com a mesma
  `assinatura_ref`. Falha do PDF não desfaz nem mascara uma assinatura clínica já confirmada:
  retorna sucesso da assinatura com aviso de documento pendente para permitir retry.

### UI / brief de design

Não há redesign de landing. A interface estende a linguagem existente de `Emitir documento`:
`bg-surface`, `bg-surface-alt`, `border-border`, teal para ação primária e texto semântico.

- TCLE mantém o modal em uma coluna e as etapas **Dados → Revisar → Assinar → Pronto**.
- O diálogo já existente "Assinatura do Paciente" no prontuário ganha apenas o campo obrigatório
  "Orientações entregues", pré-preenchido pela conduta da ficha quando houver. Nome, pad e botões
  permanecem na mesma ordem; o gesto padrão continua sendo um clique para toda a ficha realizada.
- A prévia mostra o texto e as partes/dados essenciais antes do pad. O botão final é
  “Assinar e finalizar documento”; após assinar só restam Abrir PDF e Baixar.
- Arquivos usa ícone de cadeado, tipo, data, paciente/assinante e “Assinado”; ações de editar e
  apagar não aparecem para documento de aceite.
- No orçamento, o mesmo card de aceite atual informa que o documento final está em Documentos,
  sem criar um novo status comercial.

## Invariantes

- O paciente nunca assina dados controlados pelo navegador: valores, itens, CRO, dentista,
  eventos e vínculo clínico são remontados no servidor.
- Assinar cria exatamente um snapshot, uma imagem de assinatura e um PDF final; nenhum pode ser
  alterado pelo fluxo normal da aplicação.
- A conclusão reutiliza a linha e a imagem de `assinaturas` que travam os eventos; nunca grava uma
  segunda assinatura para produzir o PDF.
- Evento já assinado não aparece como elegível em nenhum segundo fluxo de conclusão.
- TCLE nunca é emitido após o evento associado estar realizado; conclusão nunca contém evento de
  outra ficha, paciente ou clínica.
- Item não aprovado não aparece no aceite/PDF do orçamento.
- Falha após upload não deixa arquivo órfão nem linha parcialmente finalizada.
- Sem aceite dos Termos vigentes, usuário autenticado não acessa dados clínicos; o destino
  original é preservado para retorno depois do aceite.
- “Assinatura ICP”, “certificado” e equivalentes não aparecem nesta entrega.

## Gates de aceite

- Usuário novo e usuário com versão antiga de Termos são levados a `/termos-de-uso`; aceitar uma
  vez libera dashboard, recarregar não pede novamente.
- Orçamento com 3 itens e 1 aprovado gera PDF com somente aquele item, valor devido correto e
  assinatura; o PDF abre logo após assinar e permanece em Documentos.
- TCLE para procedimento indicado salva PDF; tentar gerar o mesmo fluxo para evento realizado é
  bloqueado com mensagem clara.
- Conclusão com dois eventos realizados de uma ficha salva os dois; tentar misturar evento de
  outra ficha/paciente é recusado no servidor.
- No prontuário, "Coletar assinatura" com dois realizados cria 1 assinatura, vincula os 2 eventos,
  cria 1 `documentos_aceite` + 1 `paciente_documentos` e abre o mesmo PDF em Arquivos.
- "Selecionar quais assinar" gera a conclusão somente do subconjunto; os demais continuam
  assináveis. Nenhum procedimento já assinado reaparece no modal genérico.
- Simular falha do gerador depois da RPC: a UI informa que a assinatura foi salva e que o documento
  ficou pendente, sem convidar o paciente a assinar novamente.
- PDF e snapshot ainda exibem os dados assinados depois que o orçamento/ficha atual muda.
- Secretária não consegue assinar em nome do dentista sem a autorização já existente; dentista de
  outra clínica não lê nem baixa documento.
- Teste responsivo em 375 px: leitura, assinatura e botão final permanecem acessíveis.
- Antes de ativar em produção: revisão jurídica aprova templates v1, dados da Odonto.IA e a
  mensagem do aceite; teste de RLS com duas contas é registrado.

## Entrega e dependências

1. Migration e services sem ativar o guard global.
2. Modal, PDF e listagem de documentos; QA local com clínica de teste.
3. Termos no acesso, protegido por feature flag `LEGAL_ACCEPTS_ENABLED=false` até a revisão
   jurídica e preenchimento dos dados empresariais.
4. Commit separado: migration; backend; UI; planos. Nunca aplicar migration junto de mudança RLS.

**Dados ainda necessários antes de produção:** razão social/CNPJ/endereço/canal de suporte da
Odonto.IA, política de privacidade publicada, dados obrigatórios da clínica e aprovação jurídica
da versão final. Isso não impede o desenvolvimento local, mas impede ativar o fluxo real.
