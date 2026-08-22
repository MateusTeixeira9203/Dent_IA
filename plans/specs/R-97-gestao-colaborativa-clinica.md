# R-97 — Gestão colaborativa da clínica

> **SPEC** · **R-97** · 🔵 aprovada para execução  
> **Aberto:** 2026-08-18 · **Replanejado:** 2026-08-20 · **Billing R-92:** execução conjunta

## 1. Problema

Configurações fragmenta Dados da clínica e Equipe em abas diferentes e ainda carrega a ideia de
Admin. Clínicas parceiras funcionam entre dentistas sócios: todos precisam administrar a operação
compartilhada, sem enxergar agenda, orçamento ou financeiro dos colegas.

## 2. Decisão

Configurações terá uma única aba **Clínica**, acessível a todo dentista ativo. Ela reúne:

1. resumo e dados da clínica;
2. equipe ativa;
3. convites pendentes e envio de convite;
4. WhatsApp compartilhado como **“Em breve”** nesta entrega.

“Equipe” deixa de existir como aba independente. Meu Perfil, Horários, Procedimentos, Plano,
Agenda, Orçamentos e Financeiro continuam separados.

- Dentistas têm hierarquia operacional igual.
- Qualquer dentista ativo pode editar dados compartilhados, convidar dentista e gerir
  secretária/protético.
- Dentista nunca remove outro dentista; cada um só sai voluntariamente.
- Secretária e protético não acessam a gestão da clínica.
- O painel mostra a formação 2–8 e o prazo de 48h quando o R-92 for ativado, mas esta entrega não
  cria Checkout nem liga cobrança.

## 3. Trava de segurança

Não mudam:

- ownership de ficha, regras de encaminhamento e autoria;
- silos de agenda, orçamento, pagamento e financeiro;
- APIs clínicas, schema de prontuário e rotas desses módulos;
- capacidade operacional já existente da secretária;
- dados ou autoria quando um dentista sai.

Apresentação e governança compartilhada mudam; acesso clínico/financeiro não.

## 4. Contrato técnico

### 4.1 Rota e composição

Continuar em `/dashboard/configuracoes?aba=clinica`. Não criar dashboard paralelo.

`ConfiguracoesPage` busca em paralelo dados da clínica, membros e convites válidos, sempre por
`active_clinica_id`. Entrega um view-model único:

```ts
type GestaoClinicaViewModel = {
  clinica: { nome: string; logoUrl: string | null; telefone: string; endereco: string }
  equipe: Array<{
    id: string; nome: string; email: string | null
    role: 'dentista' | 'secretaria' | 'protetico'; ativo: boolean; souEu: boolean
  }>
  convites: Array<{
    id: string; email: string; role: 'dentista' | 'secretaria' | 'protetico'
    status: 'pendente'; expiresAt: string
  }>
  capacidade: { dentistasAtivos: number; convitesDentistas: number; maximo: 8 }
  formacao?: {
    status: 'aguardando_equipe' | 'coletando_pagamento' | 'ativando' | 'ativa' | 'expirada'
      | 'recompondo_equipe' | 'decisao_pendente' | 'bloqueada'
    expiresAt: string | null; cartoesProntos: number
  }
}
```

O campo `formacao` só é hidratado quando o schema/flag do R-92 estiver ativo. Até lá, a UI não
simula cobrança nem apresenta prazo falso.

Componentes finos previstos:

- `ClinicaOverviewCard` — identidade e contagem;
- `DadosClinicaForm` — reutiliza `salvarClinica` e upload existente;
- `EquipeClinicaSection` — reutiliza `UsuariosClient`, sem duplicar actions;
- `ConvitesClinicaSection` — enviar, copiar, cancelar e renovar;
- `WhatsAppEmBreveCard` — informativo, sem CTA funcional;
- `SairDaClinicaCard` — ação individual com confirmação explícita.

### 4.2 Permissões

Na janela de compatibilidade, guards aceitam `admin | dentista`; a experiência mostra apenas
“Dentista”. Actions de clínica/equipe validam membership ativa e clínica ativa no servidor.

| Ação | Dentista | Secretária | Protético |
|---|---:|---:|---:|
| ver/editar dados compartilhados | sim | não | não |
| convidar dentista | sim | não | não |
| criar/remover secretária ou protético | sim | não | não |
| remover dentista | nunca | nunca | nunca |
| sair da própria clínica | sim | não nesta entrega | não nesta entrega |

`removerMembro` recusa alvo `admin/dentista` mesmo em chamada direta. `sairDaClinica` desativa
somente o próprio vínculo e perfil daquela clínica, troca/limpa `active_clinica_id` e registra log;
não executa `DELETE` nem reatribui registros.

### 4.3 RLS e migração

A migration local do R-97 ainda não publicada é revisada antes do deploy e separada em commits:

1. policy: remove bypass transversal de Admin em orçamento e exclusão de ficha; libera somente
   configuração/convites compartilhados para dentistas ativos;
2. gate manual com dois dentistas, secretária e usuário de outra clínica;
3. backfill posterior `admin -> dentista` nas duas tabelas de papel, com contagem antes/depois;
4. contração dos CHECKs/types apenas em item posterior, depois de produção verificada.

WhatsApp real não é habilitado por esta migration. Policies existentes não são ampliadas além do
necessário para o painel aprovado.

### 4.4 Convites

Reutilizar `criarConvite`, `cancelarConvite` e `renovarConvite`. O prazo comercial de 48h vale
somente para formação Clínica do R-92; convites operacionais comuns preservam o prazo atual até a
ativação do billing. A tela apresenta data real retornada pelo servidor, nunca texto fixo.

## 5. Comportamento da tela

- Cabeçalho “Clínica” com identidade e resumo compacto.
- Dados e Equipe são blocos da mesma página; editar dados não desmonta a lista de membros.
- Membro dentista exibe função e estado, sem menu de remoção.
- Secretária/protético exibem ações permitidas em menu contextual.
- Convites pendentes mostram e-mail, função, expiração, copiar link, renovar/cancelar.
- WhatsApp mostra benefício futuro e “Em breve”, sem conectar conta.
- Clínica abaixo do mínimo mostra prazo; vencido, apresenta “Migrar para Consultório” ou
  “Continuar como Clínica bloqueada”, sem selecionar uma opção pelo usuário.
- Mobile: uma coluna; ações primárias visíveis sem scroll horizontal.
- Empty/error/loading local por seção, sem bloquear a página inteira.

## 6. Referência visual

- **Artefato:** `plans/artefatos/R-97-gestao-clinica.html` — aberto para validação visual antes
  de portar a interface; o contrato funcional já está aprovado.
- **Rota alvo:** `/dashboard/configuracoes?aba=clinica`.
- **Composição:** resumo → Equipe/Dados na coluna principal → Convites/WhatsApp/Saída na lateral;
  no mobile: resumo → Convites → Equipe → Dados → WhatsApp → Saída.

| Token extraído | Valor |
|---|---|
| fundo light / dark | `#f5f3ed` / `#0d0d0d` |
| superfície light / dark | `#ffffff` / `#111112` |
| borda light / dark | `#d8d5cd` / `#29292c` |
| teal / teal pale light | `#2f9c85` / `#dff3ee` |
| raio de card | `16px` |
| display / corpo | `DM Serif Display` / `Outfit` |

Implementação usa os aliases Tailwind existentes equivalentes, nunca os hex diretamente. Artefato
validado sem overflow em 375 px e com todos os controles visíveis de pelo menos 44 px.

## 7. Invariantes

- Gestão compartilhada nunca abre orçamento, agenda ou financeiro de colega.
- Dentista não remove dentista por UI, action ou SQL permitido pela RLS.
- Saída voluntária não apaga nem transfere dado.
- Não se duplica lógica/actions de Equipe.
- Secretária e protético não ganham acesso ao painel.
- Billing desligado não cria estado comercial fictício.

## 8. Gates de aceite

- [ ] Aba Equipe desaparece; Clínica contém Dados, Equipe, Convites e WhatsApp Em breve.
- [ ] Dois dentistas ativos veem e editam os mesmos dados compartilhados.
- [ ] A não vê orçamento/financeiro/agenda de B por UI nem chamada direta.
- [ ] A não encontra nem consegue forçar remoção de B.
- [ ] B sai; perde acesso e todos os registros permanecem com a autoria original.
- [ ] Secretária, protético e usuário de outra clínica não acessam a tela/actions.
- [ ] Convite pode ser enviado, copiado, cancelado e renovado sem duplicação.
- [ ] Estado abaixo do mínimo apresenta as duas escolhas e deixa leitura/exportação alcançáveis.
- [ ] Dark/light e 375/768/1440 seguem o brief aprovado.
- [ ] Mudança de RLS passa obrigatoriamente com duas contas logadas antes do deploy.

## 9. Fora de escopo

- ativar Stripe, Checkout ou preços (R-92);
- conectar WhatsApp nesta entrega;
- gestor burocrático, sugestões e indicação;
- alterar módulos separados ou seus silos;
- remover imediatamente o valor legado `admin` do banco.
