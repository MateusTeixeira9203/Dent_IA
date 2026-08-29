# Auditoria — Orçamento vindo da ficha e UX · 2026-08-26

> Escopo: geração de orçamento dentro do perfil do paciente, com foco no relato de
> procedimentos adicionados a uma ficha existente que não apareceram no orçamento.
> Auditoria de código + leitura agregada de produção. **Nenhuma escrita em produção.**

## Resultado executivo

O problema não é apenas visual. Há dois contratos diferentes que hoje ficam invisíveis para o
dentista:

1. O orçamento já criado é um **snapshot**. Alterar a ficha depois não atualiza esse orçamento.
2. A ficha textual é salva antes dos eventos estruturados. Se a sincronização dos eventos falhar,
   a ficha parece atualizada, mas a fonte lida pelo orçamento não recebeu os procedimentos.

Além disso, eventos já vinculados a outro orçamento e eventos atribuídos a outro responsável
somem da lista sem explicação. O modal reduz todos esses estados a uma lista vazia ou incompleta.

## Evidências

### C1 · Crítico — ficha pode salvar sem salvar a fonte do orçamento

`salvarFicha` persiste a linha da ficha e só depois chama a RPC
`salvar_eventos_odontograma`. A falha dessa RPC é deliberadamente tratada como sucesso parcial:
`{ ok: true, eventosFalharam: true }`.

A tela mantém o editor aberto e mostra um aviso para tentar novamente, mas o dado clínico textual
já aparece salvo. Se o aviso for perdido ou o usuário sair, o orçamento continuará sem os novos
eventos.

**Conclusão:** o relato “apareceu na ficha, mas não no orçamento” é tecnicamente possível sem
qualquer erro na leitura do orçamento.

### C2 · Alto — orçamento emitido não acompanha edição posterior da ficha

`orcamento_eventos` vincula cada evento a no máximo um orçamento. O orçamento é uma fotografia
do que foi selecionado naquele momento. Novos procedimentos adicionados depois ficam disponíveis
para um novo orçamento, mas não entram automaticamente no anterior.

Essa regra protege orçamento aprovado, assinado ou pago, porém não é comunicada na interface.
Para o dentista, parece que a atualização “não funcionou”.

### C3 · Alto — estados diferentes viram o mesmo silêncio

Ao montar a lista, o código remove sem representação visual:

- evento já vinculado a outro orçamento;
- evento cujo responsável não é o dentista atual;
- evento que não foi persistido pela sincronização;
- evento fora da fonte clínica estruturada.

O usuário recebe um item vazio, não a razão da ausência.

### C4 · Médio — agrupamento pode parecer perda de procedimento

Eventos com o mesmo `tipo` e `grupo_id` viram uma única linha. Isso é correto para uma restauração
multiface agrupada, mas a linha não evidencia bem dentes/faces e quantidade. Três registros podem
parecer um procedimento incompleto.

### C5 · Médio — criação mistura decisões demais

O modal atual reúne, na mesma tela:

- escolha da fonte/ficha em alguns caminhos;
- seleção e edição de procedimentos;
- quantidade e valor unitário;
- valor final negociado;
- plano à vista ou parcelado;
- criação do orçamento.

Em celular, as duas colunas viram uma sequência longa. A interface não mostra a proveniência de
cada item nem separa decisão clínica de decisão financeira.

## Medição agregada de produção

- 22 edições de ficha nos últimos 7 dias.
- 8 dessas edições aumentaram a quantidade declarada de eventos.
- 201 eventos clínicos foram criados nos últimos 7 dias.
- 154 ainda não estão vinculados a orçamento; 47 já estão vinculados.

Os números confirmam que “procedimento novo depois da ficha” é um fluxo real e recorrente, não uma
exceção. A leitura foi agregada e não expôs pacientes, fichas ou clínicas.

## Proposta de comportamento

### 1. Orçamento novo: fonte explícita

O modal abre com um resumo curto:

> **Procedimentos encontrados nas fichas** · 3 novos · 2 já orçados · 1 precisa de atenção

A lista é separada em três grupos:

1. **Novos da ficha** — selecionados por padrão e prontos para entrar.
2. **Já estão em orçamento** — recolhido, somente leitura, com acesso ao orçamento de destino.
3. **Precisam de atenção** — sem preço, falha de sincronização ou responsabilidade diferente,
   sempre com motivo e ação possível.

Cada linha mostra procedimento, dente/face ou região, data da ficha, preço do catálogo e origem.
Item manual recebe selo “Adicionado aqui”.

### 2. Orçamento existente: atualização nunca silenciosa

Ao abrir um orçamento cujo paciente recebeu eventos novos depois da criação:

> **Há 3 novos procedimentos nas fichas deste paciente.**
> `Revisar e adicionar`

Regras:

- orçamento ainda sem aceite, assinatura ou pagamento: o dentista pode adicionar explicitamente
  ao orçamento atual;
- orçamento aprovado, assinado ou com recebimento: não é alterado silenciosamente; cria revisão,
  complemento ou novo orçamento, preservando a evidência anterior.

### 3. Fluxo em três passos curtos

1. **Procedimentos** — entender a fonte, selecionar e corrigir faltas.
2. **Valores** — preço unitário, desconto/valor negociado e total.
3. **Revisar e gerar** — conferir o documento e criar.

O plano de pagamento sai da criação principal. Entra depois que o orçamento existe ou fica em
“Definir pagamento agora”, recolhido e opcional. Isso reduz a carga da primeira decisão.

### 4. Celular

- uma coluna;
- barra inferior fixa com “X selecionados · R$ total · Continuar”;
- grupos recolhíveis;
- edição de preço em painel curto, sem tabela horizontal;
- nenhum botão essencial abaixo de um scroll interno escondido.

## Travas de segurança do redesign

Não podem mudar durante a reorganização visual:

- um evento clínico não pode entrar duas vezes em orçamentos diferentes;
- orçamento emitido continua snapshot e não muda sem ação explícita;
- filtros de clínica e responsável continuam aplicados;
- aprovação parcial por item, recebimentos, parcelas e PDF continuam intactos;
- itens manuais continuam permitidos;
- orçamento assinado ou pago preserva o histórico original.

## Plano recomendado

1. Tornar o salvamento da ficha/eventos um estado operacional impossível de ignorar: retry claro
   e bloqueio de gerar orçamento enquanto a sincronização estiver pendente.
2. Criar um diagnóstico de fonte que devolva contagens e motivos: novo, já orçado, outro
   responsável, sem preço e indisponível.
3. Adicionar detecção de eventos posteriores ao orçamento e o fluxo “Revisar e adicionar”.
4. Redesenhar o modal em três passos, primeiro em artefato e depois no código.
5. Validar com dois casos reais: ficha editada após orçamento e restauração com múltiplos
   dentes/faces.

## Gate de aceite pro caso relatado

1. Criar ficha com uma restauração e gerar orçamento.
2. Editar a mesma ficha e adicionar restaurações em três dentes.
3. Abrir o orçamento anterior: mostrar “3 novos procedimentos”, sem alterá-lo sozinho.
4. Escolher “Revisar e adicionar”: os três aparecem com dente/face e preço.
5. Simular falha da RPC de eventos: impedir a falsa impressão de orçamento completo e oferecer
   retry antes de sair.

