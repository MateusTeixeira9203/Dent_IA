# R-140b — Meu Dia: registro rápido e fechamento do atendimento

> **SPEC (redesign)** · **R-140b** · ⏳ filha do R-140
> **Aberto:** 2026-08-30 · **Fase:** verificação local
> **Depende:** R-140a · **Inclui:** migration aditiva de procedimento flexível · **Integra depois com:** R-140d (etiquetas)

## 1. Resultado e limite

O Meu Dia será o cockpit de uma consulta: registrar manualmente ou com Dex, revisar, editar,
marcar retorno, gerar orçamento e salvar sem trocar de rota. O modo comum deve terminar em
**2–3 minutos** e nunca exigir mais de **5 minutos** numa consulta simples.

O redesign não escolhe manual nem Dex como caminho principal. Os dois alimentam o mesmo rascunho,
a mesma revisão e o mesmo salvamento. “Uma página” significa sem navegação obrigatória; painéis
podem trocar de conteúdo dentro da bancada fixa.

O sistema não tenta enumerar toda a Odontologia. Ele oferece um registro universal e permissivo:
procedimento, localização e detalhe especializado são eixos independentes. O odontograma representa
estado clínico; nunca decide sozinho o que o dentista está autorizado a registrar.
## 2. Travas de segurança

- IDs, status, origem, grupo, anatomia, detalhe e observação dos eventos não mudam por causa do layout.
- Pendência antiga volta para a ficha onde nasceu; somente evento novo pode escolher destino.
- Orçamento antecipado continua reutilizando `fichaRascunhoId` e a mesma `visitaKey`.
- Dex nunca apaga texto não reconhecido; ele permanece como evolução editável.
- Salvar clínica é independente de etiqueta, OCR, upload e estoque.
- RLS e toda query/escrita continuam limitadas por `clinica_id`; secretária não grava conteúdo clínico.
- R-123 continua governando bancada, rodapé, responsividade e painel lateral.
- A migration deste item é aditiva e nullable; não reescreve evento antigo nem cria tabela por especialidade.
- Estado “dente ausente” não remove a posição clínica nem bloqueia implante, ponte ou planejamento.
- Combinação incomum pode gerar aviso confirmável; somente erro de integridade bloqueia o registro.

## 3. Organização definitiva

### 3.1 Entrada única, dois caminhos equivalentes

O bloco neutro chama-se **Registrar atendimento**. Sem aba ou seletor obrigatório, oferece:

- `+ Procedimento`: busca o catálogo completo ou aceita nome livre; pode começar pelo procedimento
  ou pela anatomia e nunca exige que a opção exista previamente no banco.
- `+ Evolução`: texto livre para curativo, sutura, cicatrização, orientação ou outra ocorrência sem código.
- `Sem localização | Boca | Arcada | Quadrante | Dente/faces`: alvo opcional conforme o registro.
- `Manutenção ortodôntica`: mantém campos livres separados em superior e inferior, mais observação geral.
- campo Dex: falar, digitar, colar ou usar documento; só estrutura após `Organizar com Dex`.

Manual e Dex convergem nestes estados já existentes:

```ts
interface RascunhoAtendimento {
  eventosDraft: OdontogramaEventoDraft[]; // procedimento/condição estruturada
  textoVisita: string;                    // evolução livre, inclusive texto não casado pelo Dex
  alertaNovo: string | null;
  ortoManutencao: OrtoManutencaoInfo | null;
  visitaKey: string;                      // estável até salvar/trocar paciente
  fichaRascunhoId: string | null;         // quando orçamento já criou a ficha
  destinoNovos: { fichaId: string | null };
}
```

Não se cria uma segunda estrutura persistida só para distinguir “manual” de “Dex”: a origem de
entrada não muda o fato clínico. `+ Evolução` edita `textoVisita`; `+ Procedimento` e o Dex
mesclam em `eventosDraft` por ID sem sobrescrever edição mais recente.

### 3.2 Procedimento flexível e liberdade clínica

O evento existente continua canônico e ganha somente metadados opcionais:

```ts
type NivelAncora = 'geral' | 'boca' | 'arcada' | 'quadrante' | 'dente' | 'face';

interface DadosProcedimentoFlexivel {
  procedimentoId: string | null;   // catálogo da mesma clínica, quando escolhido
  procedimentoNome: string | null; // snapshot; obrigatório no tipo genérico novo
  ancora: AncoraClinica;           // `geral` = sem localização anatômica
  detalhe?: unknown | null;        // validado pelo módulo da especialidade, se houver
}
```
- Tipo canônico conhecido mantém `tipo`; qualquer nome não coberto usa `tipo='outro'` + snapshot.
- Rótulo de leitura: `procedimentoNome ?? observacao ?? TIPO_LABEL[tipo]`; histórico não muda ao
  renomear/desativar item do catálogo.
- Catálogo sugere e conecta orçamento/estoque futuro, mas não é pré-condição clínica. Nome livre
  não é adicionado automaticamente ao catálogo.
- Âncora é coordenada, não permissão. Posição ausente continua clicável. Ponte usa `grupo_id` e
  `papel_no_grupo` (`pilar | pontico`); implante pode usar posição marcada como ausente.
- Multidente mantém o mapa aberto: cada clique adiciona/remove seleção e `Aplicar` cria os eventos.
  Só detalhe explícito de canal/implante/perio substitui mapa + faixa rápida no painel fixo.
- Faces sem dente, ponte sem papéis válidos, nome genérico vazio e referência de outra clínica são
  erros bloqueantes. Estado dental incomum é no máximo aviso confirmável.
### 3.3 Revisão

1. **Feito hoje** — realizados nesta visita, inclusive pendência anterior concluída.
2. **A fazer** — indicados nesta visita; não inclui condições preexistentes.
3. **Condições existentes** aparece somente quando houver conteúdo.
4. A anatomia é badge do card (`BOCA TODA`, `ARC. SUP`, `Q2`, `D26 MOD`), não uma seção.
5. Incerteza é aviso no card, nunca uma quarta coluna permanente.
6. Ordem dos cards segue a ordem de entrada/narração dentro de cada seção.
7. Todo card é editável antes do save: status, observação, anatomia e detalhe suportado.
8. Texto livre aparece como card **Evolução clínica**, editável, sem exigir odontograma/catálogo.

### 3.4 Painel de contexto fixo

Abas: **Boca | Histórico | Pendências | Anexos**. “Pendências” é trabalho anterior do paciente;
“A fazer” é o que nasceu na revisão atual.

- `Boca`: alterna `Dentes/faces | Regiões`; regiões incluem boca, arcadas e quadrantes.
- Em `Regiões`, o Meu Dia não rola horizontalmente: primeira linha `Sem localização | Manutenção
  ortodôntica | Boca toda`; segunda linha `Arcada superior | Arcada inferior | Q1 | Q2 | Q3 | Q4`.
- `Histórico`: usa as visitas já carregadas e mantém ações existentes.
- `Pendências`: usa pendências canônicas do paciente e `Fazer hoje` reaproveita o ID original.
- `Anexos`: lê `paciente_documentos`; upload continua no bucket/tabela existentes. `Usar no Dex`
  extrai texto para o rascunho, mas não duplica o arquivo.
- O painel sempre reserva odontograma + faixa rápida. Sem seleção, a faixa oferece região,
  manutenção ortodôntica e procedimento sem localização; com seleção, ativa lote/faces/procedimento.
- Manutenção ortodôntica entra imediatamente em **Feito hoje** como registro revisável;
  `Editar manutenção` retorna ao mesmo formulário, e `Voltar à boca` retorna ao odontograma sem
  descartar os campos preenchidos.
- Clicar num card especializado da revisão substitui odontograma **e** faixa rápida pelo formulário,
  na mesma largura/altura; voltar restaura aba, seleção, scroll e rascunho.

No desktop, revisão e contexto ocupam toda a largura útil da mesma régua dos atendimentos e têm
`760 px` de altura conjunta. A aba **Boca** exibe o odontograma anatômico atual completo, sem
scroll horizontal nem vertical; a revisão acompanha exatamente a mesma altura. Histórico,
Pendências, Anexos e detalhes que ultrapassem a bancada devem abrir sua leitura dedicada usando
a rolagem da página, não uma segunda barra dentro do painel. Nenhuma abertura de detalhe muda a
geometria dos setores comuns.

**Regra de atrito (30/08):** o Meu Dia usa a rolagem vertical da página como única rolagem do
fluxo clínico comum. Odontograma, faixa rápida e revisão não criam barras internas concorrentes;
os setores se organizam por altura estável, tabs e disclosures. Conteúdo excepcionalmente longo
(histórico extenso, documento ou formulário especializado) pode usar leitura dedicada, mas nunca
esconde uma ação clínica abaixo de uma rolagem interna.

**Organização aplicada (30/08):** `Dentes/faces | Regiões` é a única escolha de modo; atalhos
abaixo que repetiam essas entradas saíram. Retorno e orçamento são botões secundários com ícone,
borda e fundo discreto, sem competir com `Salvar atendimento`. O rodapé ganha a entrada visual
`Materiais / etiquetas 0`: ela antecipa o ponto de captura do R-140d, sem OCR nem persistência
nesta fatia, e deixa explícito que o save clínico não será bloqueado. No R-140d, esse mesmo
toque abre a câmera traseira no celular; arquivo/webcam são fallback de desktop.
### 3.5 Rodapé e saída

Há um CTA primário:

```text
[ Materiais / etiquetas  0 ]                           [Salvar atendimento]
```

Checkbox começa desmarcado. Enquanto R-140d não estiver habilitada na clínica, ele fica oculto;
o artefato demonstra o estado habilitado. Marcado: o save clínico termina primeiro e, com o
`atendimentoId` retornado, a captura R-140d abre. Fechar/falhar a captura não repete nem invalida
o atendimento e deixa rastreabilidade pendente conforme o contrato R-140d.

## 4. Fluxo de dados — origem, destino e atualização

### 4.1 Leitura ao abrir/trocar paciente

| Informação na tela | Fonte | Transformação/uso |
|---|---|---|
| paciente, horário, status e bloqueio da visita | `agendamentos` + `pacientes` + `atendimentos_clinicos` | `getMeuDiaData` → `slots`; `atendimentoRegistrado` usa a âncora finalizada do próprio `agendamento_id`, nunca a ficha do paciente no dia |
| boca atual | `odontograma_eventos` do paciente/clínica | `eventoParaBoca` → `contexto.boca`; nunca entra sozinho no draft |
| histórico | `fichas` + eventos | `contexto.visitas`, unido por `ficha_id`, não por data |
| pendências | eventos `indicado` canônicos | `contexto.pendencias`; grupo e autoria preservados |
| tratamentos de destino | fichas `aberta` do dentista | `contexto.tratamentosAbertos`; primeira opção é preselecionada |
| catálogo manual/orçamento | `procedimentos` ativos do dentista | ordem alfabética; sem ranking inventado |
| anexos | `paciente_documentos` + URLs assinadas do bucket `fichas` | busca ao abrir a aba; RLS da clínica |
| retorno/orçamento | handlers e tabelas atuais | somente reposicionados; regra de negócio inalterada |

`MeuDiaClient` é o dono do rascunho. Trocar `agendamentoId` limpa eventos, texto, documento
temporário, seleção, intenção de etiqueta e cria nova `visitaKey`; nenhum dado cruza pacientes.

### 4.2 Entrada → revisão

| Entrada | Vai para | Como atualiza |
|---|---|---|
| procedimento manual | `eventosDraft` | cria evento contextual; aparece imediatamente na seção pelo status |
| procedimento livre | `eventosDraft` (`outro` + snapshot) | localização é opcional; não cadastra catálogo implicitamente |
| evolução manual | `textoVisita` | card único editável **Evolução clínica** |
| Dex estruturado | `eventosDraft` | `mesclarEventosSemPerda`; edição local mais recente vence |
| anotação/conduta do Dex | `textoVisita` | append legível; nunca substitui texto já digitado |
| detalhe endo/implante | `evento.detalhe` | formulário especializado edita o mesmo evento |
| pendência “Fazer hoje” | `eventosDraft` com ID existente | servidor reconhece ficha de origem e atualiza o evento certo |
| documento “Usar no Dex” | texto temporário da captura | somente o resultado aceito entra em evento/evolução |

Os derivadores de revisão serão funções puras em `lib/atendimentos/revisao.ts`; componente não
reclassifica status nem destino.

### 4.3 Save clínico

```text
Salvar atendimento
  → salvarVisitaMeuDia (Zod)
  → registrarAtendimentoClinico(visitaKey)
  → encontra/cria atendimentos_clinicos em estado preparando
  → rotearVisitaMeuDia
       pendência antiga → ficha de origem
       evento novo → tratamento escolhido ou ficha da sessão
       textoVisita → ficha principal + ficha_evolucoes
       eventos → odontograma_eventos via RPC atômica
  → atendimento_eventos liga registro/realização ao Atendimento
  → atendimentos_clinicos = finalizado
  → agenda = completed quando aplicável
  → revalidar Meu Dia e perfil do paciente
  → devolver fichaId + atendimentoId
```

Contrato específico da action:

```ts
type SalvarVisitaMeuDiaResult =
  | { ok: true; fichaId: string; atendimentoId: string; eventosFalharam?: boolean }
  | { ok: false; error: string };
```

Retry usa a mesma `visitaKey`; agendamento é segunda chave de proteção. Se a ficha salvou e a RPC
de eventos falhou, mantém o rascunho e oferece retry dos eventos. Somente depois de todos os vínculos
clínicos íntegros o cliente limpa o draft e seleciona o próximo agendamento elegível, sem abrir a ficha.
Âncora finalizada deixa somente aquele slot em leitura; perfil é ação opcional e nova consulta exige encaixe.
### 4.4 Persistência do procedimento flexível

Migration aditiva sobre `odontograma_eventos`, sem tabela paralela:

- `procedimento_id uuid null references procedimentos(id) on delete set null`;
- `procedimento_nome text null` como snapshot;
- `nivel` aceita `geral`, cuja âncora exige arcada/quadrante/dente/faces nulos;
- RPC `salvar_eventos_odontograma` lê/escreve as colunas e rejeita `procedimento_id` de outra clínica;
- leitura antiga continua válida; eventos `outro` sem snapshot usam `observacao` como fallback.

Novas colunas ficam no `on conflict update`; retry preserva ID e snapshot. RLS existente continua
governando a tabela, mas a migration só é liberada após matriz com duas clínicas e duas contas
logadas.
### 4.5 Como aparece no perfil do paciente

Após sucesso, o servidor executa:

```ts
revalidatePath('/dashboard/meu-dia');
revalidatePath(`/dashboard/pacientes/${pacienteId}`);
```

Na próxima navegação/refresh, o perfil lê:

- resumo recente de `fichas` em `getPatientWorkspaceData`;
- prontuário completo em `FichasTab`: `fichas`, `odontograma_eventos` e `ficha_evolucoes`.

Assim, “está no banco” não basta: o gate exige abrir o perfil após salvar e conferir evolução,
cards, status e anatomia. Outra aba já aberta não recebe push/realtime neste item; ao voltar a ela,
um refresh é necessário. Não se promete atualização instantânea entre abas sem implementá-la.

## 5. Estados obrigatórios do artefato/tela

| Estado | Conteúdo e recuperação |
|---|---|
| vazio | manual e Dex disponíveis; revisão explica o próximo gesto; salvar desabilitado |
| manual | selecionar dentes mantém mapa; procedimento + faces/status → `Aplicar` → revisão |
| multidente | mapa permanece; seleção acumulativa; faixa rápida ocupa espaço já reservado |
| sem localização | nome de catálogo ou livre + status; não exige odontograma |
| evolução livre | texto editável, anatomia opcional, sem código obrigatório |
| Dex processando | `DexLoader`; rascunho anterior permanece visível |
| Dex revisado | Feito/A fazer + incerteza no card; tudo editável |
| região | boca/arcada/quadrante sem abrir odontograma |
| ausente/ponte | posição ausente selecionável; pilar/pôntico explícitos; nenhuma trava clínica indevida |
| especialidade | formulário ocupa painel direito sem alterar geometria |
| erro clínico | mensagem + draft intacto; etiqueta não inicia |
| salvo | draft limpo, agenda atualizada, próximo slot; perfil revalidado, sem redirecionamento |
| visita já finalizada | entrada e revisão ausentes; explicação curta, perfil opcional e novo encaixe para outra consulta |
| etiqueta falhou | “Atendimento salvo”; retry só da rastreabilidade |

## 6. Contrato visual

- Artefato base: `plans/artefatos/R-140b-meu-dia-fechamento-v3.html`. A composição e os estados
  continuam aprovados; a geometria da bancada foi superada pela correção de 30/08 feita sobre o
  localhost: largura integral da régua do dia, odontograma anatômico e colunas de `760 px`.
- Desktop: conteúdo ocupa `100%` da largura útil da régua, gap `12 px`; revisão flexível e contexto
  com piso de `720 px`; rodapé de `70 px`. Em **Boca**, não aparece scrollbar no painel.
- Mobile: uma coluna; Registrar → Revisão → Contexto → Rodapé; CTA alcançável com teclado aberto.
- Tipografia Outfit; mono só em anatomia, contagem e valor. Alvo touch mínimo 44 px.
- Teal = realizado/ação; coral = indicado; neutro = estrutura. Sem cor hardcoded no React.
- Motion 150–200 ms somente em troca de painel/disclosure; nunca anima o save.
- Dark e light preservam tokens do R-123. Sem card dentro de card na revisão.

Valores extraídos no navegador do artefato v3, em 1280 × 720:

| | Dark | Light |
|---|---|---|
| fundo / superfície | `#0d0d0d` / `#111112` | `#f4f4f6` / `#ffffff` |
| texto / metadado | `#f5f5f5` / `#a1a1aa` | `#09090b` / `#62626a` |
| borda | `#27272a` | `#d6d6da` |
| feito / a fazer | `#63c9b6` / `#ef8f8f` | `#2f9c85` / `#c76662` |

A correção validada no localhost substitui as medidas fixas do artefato: cabeçalho do paciente,
entrada, bancada e rodapé usam a largura da régua; a bancada tem `760 px` de altura, gap `12 px`,
contexto com piso de `720 px` e revisão ocupando o restante. O painel especializado substitui o
conteúdo interno sem alterar a geometria externa.

## 7. Invariantes e gates

- [ ] Manual simples: local → procedimento → aplicar; sem etapa de escolha “manual ou Dex”.
- [ ] D16 → Restauração em resina → MOD → Aplicar cria card editável correto na revisão.
- [ ] Selecionar vários dentes não fecha/substitui o mapa; lote pode ser aplicado de uma vez.
- [ ] Posição ausente aceita implante e papel de pôntico; estado visual nunca vira autorização.
- [ ] Procedimento livre salva com ou sem anatomia e reaparece igual no perfil/histórico.
- [ ] Manutenção ortodôntica preserva campos livres superior/inferior; sem formulário excessivo.
- [ ] Evolução livre: digitar → adicionar; procedimento/odontograma opcionais.
- [ ] Dex: capturar → organizar → revisar → salvar; nenhum dado desconhecido é perdido.
- [ ] Um único CTA primário; etiqueta desmarcada e não bloqueante.
- [ ] Página e painel não crescem ao abrir canal/coroa/implante/periodontal.
- [ ] Editar card altera exatamente o payload que será salvo.
- [ ] Orçamento mantém itens/valores já aprovados e reutiliza a mesma ficha/visita.
- [ ] Save/retry não cria segunda ficha, evolução, Atendimento ou vínculo.
- [ ] Perfil mostra ficha, evolução e eventos corretos após salvar e recarregar a rota.
- [ ] Duas contas logadas confirmam isolamento de clínica e autoria de escrita.
- [ ] RPC rejeita `procedimento_id` de outra clínica e retry não perde snapshot/localização.
- [ ] 375/768/1280/1440 px, teclado, light/dark e scroll após toda sobreposição.
- [ ] Teste com dentista real: tarefa completa ≤5 min; alvo observado 2–3 min.
- [ ] Implementação é comparada pixel/estado ao artefato aprovado antes de auditoria.

## 8. Fora de escopo

- Schema/OCR de etiquetas (R-140d), estoque/marketplace (R-140e) e prontuário longitudinal (R-140c).
- Ranking/favoritos sem dados de uso, cadastro automático no catálogo, novo periograma ou diagnóstico.
- Novos formulários por especialidade além dos já existentes; o registro universal é o fallback.
- Redesign interno de orçamento, histórico ou upload de arquivos.
- Realtime entre abas, obrigatoriedade de rastreabilidade ou baixa automática de estoque.
