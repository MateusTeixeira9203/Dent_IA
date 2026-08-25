# Resultado da varredura — 24/08/2026

> **Escopo:** atrito operacional, responsividade, acessibilidade e coerência técnica do
> workspace odontológico · **Ambiente:** produção somente leitura + localhost para portas
> públicas e verificações técnicas · **Perfil runtime:** dentista da clínica de teste.
>
> Nenhum paciente, ficha, agendamento, orçamento ou configuração foi criado, alterado ou
> excluído durante esta auditoria.

## Veredito

O núcleo do produto já tem uma boa forma no celular: Agenda em lista, Meu Dia, cadastro de
paciente, perfil e Financeiro são compreensíveis sem treinamento. O bloqueio para chamar o
fluxo de **rápido e previsível** não é falta de mais recursos. São dois problemas anteriores:

1. **Navegações clínicas simples levam de 2 a 4,5 segundos**, com tela vazia em Configurações.
2. **Modais importantes ainda reorganizam mal o conteúdo no celular.**

Adicionar agora um pop-up de agenda ou outro painel aumentaria superfície e esconderia essas
causas. A ordem recomendada é: performance/hidratação → agenda e modais mobile → atalho de
agenda, se a medição posterior ainda justificar.

## Achados por prioridade

### Crítico

Nenhum achado crítico permaneceu confirmado.

**C1 descartado após validação clínica:** as 12 restaurações repetidas eram procedimentos em
faces diferentes. O orçamento estava correto ao preservar cada face como item próprio. O
achado remanescente é apenas de apresentação: no celular, descrição e face ficam truncadas e
não deixam evidente por que o mesmo dente aparece em mais de uma linha.

### Altos

#### H1 — O caminho principal não parece imediato

Medições observacionais em produção, numa clínica com poucos dados:

| Gesto | Tempo percebido |
|---|---:|
| Dashboard → Meu Dia | 3,29 s |
| Meu Dia → Agenda | 3,52 s |
| Agenda → perfil do paciente | 3,46 s |
| Abrir perfil no mobile, até conteúdo completo | ~4,4 s |
| Abrir Financeiro | 2,36 s |
| Abrir Configurações | ~3 s até logo; até ~8 s para conteúdo |
| Trocar Semana → Mês na Agenda | >3,5 s |
| Filtrar paciente por nome | ~2,2 s |

Não é benchmark de laboratório, mas é suficiente para a pergunta do produto: o Word não tem
esse intervalo entre intenção e resposta. A transição de visão da Agenda também muda o estado
visual antes de o conteúdo terminar de chegar, produzindo sensação de travamento.

#### H2 — Há erro de hidratação sistêmico e dívida de efeitos

O console de produção registrou `React #418` em mais de uma rota. Em paralelo, o lint de `src`
encontra **17 erros e 65 avisos**; os erros concentram-se em `setState` síncrono dentro de
efeitos de montagem, `use-mobile`, tema, Dex e drawers. Isso é causa provável para flash,
render duplo e conteúdo que só aparece depois da montagem, mas precisa de correção isolada para
confirmar causalidade.

#### H3 — O modal de orçamento continua desktop comprimido no celular

Com muitos itens, há duas regiões de rolagem. Descrição, quantidade e preço disputam a mesma
linha; os nomes ficam truncados, enquanto resumo e ação ficam destacados antes de o usuário
conseguir conferir a lista inteira. A informação mais importante — **o que está sendo cobrado**
— é a menos legível.

#### H4 — “Novo agendamento” quebra a ordem do formulário no celular

O rodapé de “Salvar agendamento” aparece antes do último controle de duração (“Ou: 30 min”).
Os presets e o campo livre ficam visualmente separados pela ação final. O fluxo deve ser uma
coluna única: paciente → observações → data/hora → duração → protético, se houver → salvar.

#### H5 — Plano e isenção não formam um estado comercial coerente

Em uma conta declarada como isenta e dentro da clínica de teste, a aba Plano mostrou
simultaneamente clínica ativa no cabeçalho, `Consultório`, `Inativo`, `R$200/mês`, “Criar
Clínica” e “Ativar assinatura”. O modelo atual da tela não representa “isento” e cai no estado
legado de `clinicas.status_assinatura` quando não encontra assinatura individual.

Antes de cobrar o primeiro cliente, a UI precisa distinguir: isento, trial, ativo, pendente,
suspenso e clínica em formação — sem oferecer checkout para quem nunca deve pagar.

#### H6 — Link de indicação aponta para o domínio aposentado

Produção exibiu `dentia.app.br/cadastro?ref=...`. O código usa `NEXT_PUBLIC_APP_URL`; portanto,
o sintoma indica variável de produção antiga. Além do link quebrado, o card promete desconto
automático com contadores que ainda não vêm de dados reais.

#### H7 — Linhas clicáveis importantes não são acessíveis por teclado

Linhas de pacientes (`motion.tr`/`motion.div`) e cards de compromisso da semana usam `onClick`
e `cursor-pointer`, sem semântica de link/botão, foco ou Enter/Espaço. Mouse e toque funcionam;
teclado e tecnologia assistiva não têm o mesmo caminho. O odontograma, por outro lado, já tem
`aria-label` por dente e não deve ser refeito.

#### H8 — A Agenda não permite alcançar o dia inteiro

Relato confirmado pelo usuário no uso real: ao abrir as visões **Dia** ou **Semana**, o
dentista não consegue rolar a grade até os horários inferiores nem visualizar o expediente
completo. Isso bloqueia consulta e criação de horários da tarde, portanto é falha funcional do
R-126a, não mero polimento responsivo. A correção precisa definir um único dono da rolagem no
mobile, preservar o cabeçalho de contexto e permitir chegar ao primeiro e ao último horário sem
arrastar a página e uma área interna ao mesmo tempo.

#### H9 — Editar uma ficha histórica exige atravessar a tela

No perfil do paciente, o dentista ativa a edição no cabeçalho da ficha, corrige o registro no
corpo e precisa descer até “Salvar Evolução” no rodapé. Em fichas longas, a confirmação fica
fora do contexto e obriga rolagem de ida e volta para uma correção pequena. Como a ficha já foi
persistida, o sistema deve manter confirmação explícita, mas a ação precisa acompanhar o
usuário: barra de edição fixa no viewport com “Cancelar” e “Salvar alterações”, além de acesso
direto ao card que será corrigido.

### Médios

| ID | Achado | Efeito |
|---|---|---|
| M1 | Busca de paciente leva ~2,2 s mesmo com 2 registros | Parece busca remota pesada para uma ação frequente |
| M2 | Troca de visão da Agenda atualiza o controle antes do conteúdo | Estado transitório confuso/flicker |
| M3 | Alvos públicos abaixo de 44 px em Landing/Auth | “Esqueceu a senha?”, voltar e alguns CTAs são difíceis no polegar |
| M4 | Cadastro mobile: voltar tem 38×38 e inputs segmentados de data têm área interna baixa | Toque/foco menos previsíveis |
| M5 | Programa de indicação mostra estatísticas `0` hardcoded | Apresenta como funcional algo ainda sem medição |
| M6 | 25 arquivos ativos usam `bg-white`; há `text-black` e `gray-*` | Viola tokens e pode quebrar contraste/tema |
| M7 | `npm run lint` varre worktrees e builds gerados | Gate global fica lento/inutilizável; lint de `src` precisou ser separado |
| M8 | Retorno direto de checkout esgota tentativas e permanece “aguardando” | Há retry manual, mas não há estado terminal nem orientação de suporte |

### Baixos / polimento

- Campo Mágico no mobile mostra scrollbar interna e o input “Outro procedimento” trunca cedo.
- Alguns controles icon-only do perfil ainda chegam sem nome acessível.
- Texto “7 vagas disponívelis” precisa virar “7 vagas disponíveis”.
- `transition-all` aparece em 78 arquivos; anima propriedades desnecessárias e dificulta prever
  custo. Trocar apenas nos componentes tocados, sem refactor cosmético global.

## O que funcionou bem

- Agenda mobile em **Dia**, **Semana** e **Mês** usa representação própria, sem comprimir a
  grade desktop.
- Meu Dia deixa Campo Mágico, revisão, odontograma e ações finais compreensíveis em 390×844.
- Selecionar dente não abre histórico automaticamente; detalhe dental é opcional e acessível.
- Cadastro e perfil do paciente não têm overflow horizontal.
- Financeiro foi a rota clínica mais estável e legível no celular.
- Formulários públicos mantêm hierarquia consistente; Google é a entrada principal.
- `build`, TypeScript e os 2 testes do R-128 passam.
- As ações clínicas verificadas no código aplicam contexto de clínica e gates de papel; nenhum
  furo novo de RLS foi afirmado nesta varredura.

## Cobertura executada

### Runtime

| Área | Desktop | Mobile 390×844 | Escrita |
|---|---|---|---|
| Landing, Login, Cadastro, Recuperação, Planos | sim | sim | não |
| Dashboard, Meu Dia | sim | sim | não |
| Agenda Dia/Semana/Mês + drawer novo | sim | sim | não |
| Pacientes: lista, busca, novo, perfil e ficha | sim | sim | não |
| Orçamento pelo perfil | sim | sim | não criou orçamento |
| Financeiro + modal de entrada | sim | sim | não salvou |
| Configurações, Horários e Plano | sim | sim | não salvou |

### Inventário e técnica

- 31 páginas e 40 endpoints de API inventariados.
- Build de produção: passou.
- TypeScript estrito: passou.
- Teste `escopo-regional`: 2/2 passou.
- Lint de `src`: falhou com 17 erros e 65 avisos.

## Não verificado — não transformar em “aprovado”

- Fluxos runtime de **secretária** e **protético**; a sessão disponível era dentista.
- Encaminhamento para protético no drawer: a clínica da sessão não retornou protético ativo.
- Escritas completas: criar paciente, salvar ficha, marcar retorno, orçamento, pagamento e
  exclusões. Produção foi mantida somente leitura.
- Stripe E2E, webhooks, convite real e troca de plano.
- PDFs e permissões com duas contas logadas.
- iPhone/Safari e PWA instalado; o viewport Android foi simulado pelo navegador.

## Ordem proposta

1. Fechar o QA visual do **R-127** e publicar o **R-128** em commits isolados.
2. **R-129a — performance e hidratação do shell.** Instrumentar navegação, eliminar #418 e
   atacar somente os efeitos/consultas que a medição confirmar.
3. **R-129b — Agenda e modais mobile.** Dia/Semana alcançam o expediente inteiro; orçamento e
   agendamento ficam em uma coluna, uma rolagem e com ação final depois de todos os campos.
4. **R-129e — edição de ficha histórica.** Barra explícita acompanha o dentista com Descartar e
   Salvar, preservando o save atômico atual.
5. **R-129c — estado comercial verdadeiro.** Isenção, trial, assinatura, domínio e indicação.
6. **R-129d — navegação acessível e alvos de toque.** Linhas viram links/botões sem mudar o visual.
7. Rodar QA com dentista + secretária + protético e escrita confinada à clínica de teste.
8. Só então medir novamente se um atalho persistente de Agenda ainda reduz tempo real.

## Conclusão de produto

O Odonto.IA já se parece mais com um workspace odontológico do que com um ERP. O risco agora é
adicionar conveniência em volta de um núcleo que ainda espera. A melhor próxima versão não é a
que mostra mais ferramentas: é a que responde rápido e deixa explícito o que será salvo,
agendado e cobrado.
