# R-140c — Redesign: Prontuário e Ficha longitudinal

> **SPEC (redesign)** · **R-140c** · 🔵 filha do R-140
> **Aberto:** 2026-08-30 · **Fase:** execução local — revisão 7 aprovada na conversa em 02/09/2026
> **Depende:** R-140a · **Preserva:** R-108 e R-120

## 0. Identificação

| | |
|---|---|
| **Tela / módulo** | Perfil do paciente — Prontuário e Ficha de tratamento |
| **Tipo** | redesign + projeção longitudinal, sem reescrever o núcleo clínico |
| **Rota** | `/dashboard/pacientes/[id]` |
| **Arquivos principais** | `ProntuarioTab.tsx`, `FichasTab.tsx`, `get-prontuario-longitudinal.ts`, `lib/prontuario/` |

## 1. Problema e inventário

- A mesma informação abre em dois designs concorrentes: “Registro” e “Tratamento”.
- A timeline global mistura tratamentos e profissionais; é completa, mas difícil de usar na rotina.
- `FichasTab` ainda concentra leitura, edição, assinatura, odontograma, especialidades e legado.
- O design de Registro já reúne evolução, odontograma, procedimentos, retorno, materiais e documentos.
- Ficha moderna é um tratamento que atravessa consultas; `Atendimento` é a visita exata e pode tocar
  mais de uma Ficha. Legado pode não possuir Atendimento ou eventos estruturados.

## 2. Trava de segurança

- [x] Ficha continua sendo o tratamento e mantém ID, nome, status, responsável e evolução por visita.
- [x] Atendimento continua sendo a visita exata; uma data ou um dentista não identificam uma visita.
- [x] Eventos, evoluções, assinaturas, documentos, orçamentos e retornos preservam IDs e regras.
- [x] Encaminhamento continua por procedimento; autoria original e data clínica não mudam.
- [x] Conteúdo assinado é snapshot imutável; correção posterior é complemento/retificação auditada.
- [x] Legado continua acessível; nenhum dado é descartado por não ter Ficha, Atendimento ou texto.
- [x] Isolamento por clínica, RLS e permissões atuais não são relaxados.
- [x] Rastreabilidade continua opcional ao salvar; ausência nunca bloqueia o próximo paciente.

## 3. Decisão aprovada

O “Registro” deixa de ser produto/tela concorrente. Seu design vira o corpo da **Ficha de
tratamento**. A Ficha contém uma consulta selecionada e um **Histórico da Ficha** clicável. Trocar a
consulta atualiza o corpo da mesma tela, sem abrir outro design.

```text
Paciente
└── Prontuário (mapa e fichas)
    └── Ficha de tratamento
        ├── Consulta selecionada (Atendimento)
        │   ├── evolução + odontograma da visita
        │   ├── procedimentos/status/próxima sessão
        │   └── retorno + materiais + documentos/assinatura
        └── Histórico da Ficha (outras consultas clicáveis)
```

- **Prontuário:** condição atual, Fichas em curso e acesso ao histórico/concluídos.
- **Ficha:** acompanhamento de um tratamento, usando a hierarquia visual do Registro v7.
- **Meu Dia:** entrada rápida. Ao salvar, cada procedimento é roteado para uma Ficha e a visita
  aparece no Histórico dessa Ficha pelo `atendimento_id` exato.
- **Avulso:** vira Ficha episódica curta, fechada ao concluir, mas preservada no histórico.
- **Concluído:** sai da fila operacional do odontograma geral; não some do prontuário. “Ver
  concluídos” reapresenta o histórico, e o detalhe do dente preserva a condição clínica conhecida.

## 4. Contrato funcional e de dados

### 4.1 Projeção

```ts
type EstadoRastreabilidade = 'nao_informada'|'pendente'|'completa'|'nao_se_aplica';

interface ProntuarioFicha {
  fichaId: string;
  nome: string;
  status: 'aberta'|'concluida';
  responsavel: ProntuarioProfissional;
  progresso: { realizados: number; total: number };
  consultas: ProntuarioConsultaDaFicha[]; // data desc; Atendimento exato
}

interface ProntuarioConsultaDaFicha {
  atendimentoId: string | null; // null somente em fallback legado
  fonte: 'moderna'|'evolucao_legada'|'ficha_legada';
  data: string;
  autor: ProntuarioProfissional;
  evolucao: { texto: string|null; autoria: 'dentista'|'sistema'|'ausente' };
  eventos: EventoClinicoResumo[]; // somente os pertencentes a esta Ficha
  retorno: RetornoResumo | null;
  rastreabilidade: EstadoRastreabilidade;
  documentos: DocumentoClinicoResumo[];
}

interface EventoClinicoResumo {
  eventoId: string;
  fichaId: string;
  procedimento: { id: string|null; nome: string };
  localizacao: LocalizacaoClinica;
  status: 'indicado'|'realizado';
  momentoPlanejado: 'sessao_atual'|'proxima_sessao';
  autorOriginal: ProntuarioProfissional;
  encaminhadoPara: ProntuarioProfissional|null;
  ultimaAlteracao: AuditoriaEvento|null;
}
```

O servidor compõe Fichas → consultas a partir da projeção atual. O cliente não refaz joins nem
deduz vínculos por data. Uma visita que toca duas Fichas aparece nos dois históricos, filtrada por
Ficha, mas continua referenciando o mesmo Atendimento. Materiais da visita são exibidos em ambas
sem duplicar persistência.

Texto oficial vem de `ficha_evolucoes.texto`; fallback usa `fichas.anotacoes`. Saída do Dex só vira
evolução após revisão e salvamento. Texto `null` aparece como “Sem evolução textual registrada”.
Dex pode propor o texto usando captura, procedimentos, localizações, observações e detalhes da
consulta; entrada manual permanece autoritativa. Retorno, materiais, documentos e assinatura ficam
em blocos próprios. A evolução salva é snapshot e nunca é regenerada ao reabrir a Ficha.

#### Sugestão opcional da evolução manual

O compositor compartilhado pelo Meu Dia e pela Ficha oferece “Gerar evolução com Dex” somente
quando `textoVisita` está vazio e há evento clínico ou manutenção ortodôntica preenchida. A ação
envia um DTO mínimo, sem nome do paciente nem histórico longitudinal:

```ts
type SugerirEvolucaoRequest = {
  itens: Array<{
    procedimento: string;
    status: 'indicado'|'realizado';
    origem: 'clinica'|'preexistente';
    momentoPlanejado: 'sessao_atual'|'proxima_sessao';
    localizacao: string;
    observacao: string;
    detalhe: string|null;
  }>;
  ortodontia: string|null;
};
type SugerirEvolucaoResponse = { texto: string };
```

`POST /api/dex/sugerir-evolucao` autentica, limita por IP e por dentista, valida entrada/saída e
usa JSON estruturado. O modelo apenas redige fatos presentes no DTO; não cria diagnóstico,
técnica, material, orientação ou execução ausentes. O resultado abre no campo editável com aviso
de revisão. Não salva, não altera eventos e não bloqueia o fluxo em erro. Depois de revisado, o
salvamento normal registra `automatica=false`, pois o texto passou pela aprovação do dentista.

### 4.2 Navegação exclusiva

```ts
type SuperficieProntuario =
  | { tipo: 'resumo'; contexto: ContextoProntuario }
  | { tipo: 'ficha'; fichaId: string; atendimentoSelecionadoId: string|null;
      retorno: ContextoProntuario }
  | { tipo: 'legado'; atendimentoId: string; retorno: ContextoProntuario }
  | { tipo: 'editor'; modo: 'novo'|'editar'|'complementar'; fichaId: string|null;
      atendimentoOrigemId: string|null; retorno: ContextoProntuario };
```

- Só uma superfície existe por vez. Não existe mais par usuário-visível `registro`/`tratamento`.
- Dente com evento de Ficha abre essa Ficha já na consulta exata; múltiplas Fichas exigem escolha.
- Histórico lateral altera apenas `atendimentoSelecionadoId` e preserva a Ficha aberta.
- Voltar restaura dente, filtros, concluídos visíveis e posição do Prontuário.
- Fallback sem Ficha usa renderer legado único, nunca abre editor vazio em paralelo.

### 4.3 Odontograma geral e Ficha

- Resumo geral prioriza `indicado`: coral = A fazer; amarelo = próxima sessão.
- `realizado` não ocupa a fila padrão. “Ver concluídos” liga a camada azul histórica.
- O detalhe do dente sempre permite acessar Fichas ativas e concluídas; nada é apagado.
- Dentro da Ficha, odontograma anatômico existente mostra somente o recorte da consulta selecionada,
  sem scroll interno; “Ver completo” amplia no mesmo contexto e não edita o passado.
- Clique no dente da Ficha inicia edição/complemento somente por ação explícita.

### 4.4 Consulta selecionada e ações

- A consulta mais recente é padrão. Cabeçalho mostra data, autor e origem (`meu_dia`/`ficha`).
- Procedimentos reutilizam integralmente o comportamento do Registro:
  - `A fazer`/`Realizado` alteram `status` explicitamente;
  - “Próxima sessão” altera somente `momento_planejado` de evento indicado;
  - no próximo Meu Dia aparece “Planejado para hoje”, ainda pendente;
  - dente e chip usam a mesma cor canônica.
- “Encaminhar” continua por procedimento. Escrita + `activity_logs` são atômicos pela RPC aprovada;
  autor original e `realizado_em` permanecem separados da última alteração.
- “Coletar assinatura” seleciona um/vários/todos os realizados sem `assinatura_id`, agrupados por
  Ficha; cada Ficha gera seu documento congelado e aparece em Arquivos.
- Consulta não assinada e do autor permite “Editar ficha”. Assinada ou de outro autor oferece
  complemento autorizado, sem sobrescrever o histórico.
- Retorno vazio usa `MarcarRetornoModal` e grava `atendimento_origem_id`; existente oferece “Ver na
  Agenda”. A edição ocorre somente na Agenda.

### 4.5 Meu Dia → Ficha e materiais

Invariantes do roteamento: cada procedimento tem uma Ficha destino; “Ficha à parte” só por escolha
explícita; uma visita pode atualizar várias Fichas; retry não duplica; sem dente/localização não
descarta o procedimento; evolução entra na consulta correta; histórico liga por `atendimento_id`,
nunca por coincidência de data.

R-140c posiciona “Materiais desta consulta” e os estados `nao_informada`, `nao_se_aplica`,
`pendente`, `completa`. A câmera/OCR e persistência real pertencem ao R-140d. Nesse contrato futuro:
foto/texto extraído/dados confirmados ficam ligados ao Atendimento; `used_at` é a data clínica e
`registered_at` é a inclusão posterior; complemento de materiais não reescreve snapshot assinado.

### 4.6 Histórico e revisão compacta

- No Meu Dia, a gaveta Histórico ocupa toda a altura útil do painel clínico. Abas ficam fixas e há
  um único scroll no corpo; o teto isolado de `420px` e o rodapé “ver as visitas” deixam de existir.
- A visita mais recente inicia aberta. As anteriores mostram data, dentista e até três
  `procedimento · localização`; “Ver detalhes” abre evolução, procedimentos e especialidades.
- Em “Revisar consulta”, cada card mostra sempre procedimento/localização e três situações
  mutuamente exclusivas: **A fazer**, **Próxima sessão**, **Realizado**. A UI traduz isso para
  `status` + `momento_planejado`; nenhum clique no corpo altera situação.
- **Editar detalhes** abre observação ou o painel de especialidade. Implante/canal carregam os dados
  existentes editáveis; lote, torque ou execução ausentes nunca são presumidos.
- **Remover** é ação textual visível; não usa `X` isolado. Vários procedimentos continuam em uma
  lista compacta e “Alterar vários” exige seleção explícita antes de aplicar uma situação.
- Na Ficha, o Histórico é um índice: cada consulta mostra procedimentos/localizações e o clique
  atualiza o corpo inteiro da mesma Ficha, sem modal nem terceira superfície.

### 4.7 Meu Dia — plano e histórico unificados

“Pendências” deixa de existir como gaveta. A única gaveta clínica passa a se chamar **Plano e
histórico** e tem duas zonas, nesta ordem: (1) plano operacional e (2) visitas históricas em
leitura. Isso elimina a duplicidade em que o dentista precisava procurar a mesma pendência em duas
abas para decidir o que fazer.

```ts
type SituacaoDoPlano = 'sessao_atual'|'proxima_sessao'|'realizado';

interface AcaoDoPlano {
  eventoId: string;
  situacaoAnterior: 'sessao_atual'|'proxima_sessao';
  autor: boolean;
  encaminhadoParaMim: boolean;
}
```

- Fonte do plano: somente `contexto.pendencias` filtrado pelo responsável atual (`autor` ou
  `encaminhado_para`). A mesma coleção alimenta contador, plano e encaminhamento; não há segunda
  query nem cópia no rascunho da consulta.
- Ordem: “Para esta consulta” mostra `momento_planejado=proxima_sessao`. A seção **Em aberto**
  pertence ao Histórico clínico, antes das visitas; assim o histórico tem contexto sem criar uma
  segunda fila visual. Ambos preservam procedimento, localização, autor e data de registro.
- Autor de ficha aberta pode escolher **A fazer**, **Próxima sessão** ou **Registrar hoje**. Os
  dois primeiros chamam `alternarMomentoRegistro`. Registrar hoje leva o mesmo `evento_id` ao
  rascunho da Revisão do atendimento com `status=realizado`; detalhe de implante/canal e
  observação são completados ali e somente **Salvar atendimento** persiste a realização.
- Destinatário de encaminhamento pode somente **Realizado** / desfazer, pela RPC já existente
  `atualizarStatusEncaminhado`; não altera o planejamento do autor.
- “Desfazer” existe para a última alteração de planejamento da sessão. Não é um log de desfazer
  nem reescreve dados assinados.
- Encaminhar permanece no topo do mesmo plano: seleção explícita de eventos próprios e a mesma
  `EncaminharBar` existente. Nenhuma pendência encaminhada a outro dentista é reenviável.
- Visitas históricas seguem clicáveis e detalhadas, mas são leitura. Não há ação de status dentro
  de uma visita histórica, pois a ação existe uma única vez no plano do evento ainda aberto.
- Cada Server Action continua validando clínica ativa, papel, autoria/destino e assinatura. A UI
  nunca concede permissão: erro de evento assinado ou de autor errado volta como toast.

## 5. Estados e comportamento

| Estado | Resultado obrigatório |
|---|---|
| Sem Ficha ativa | resumo instrutivo + histórico/concluídos acessíveis |
| Ficha aberta | última consulta + histórico lateral, sem tela “Registro” concorrente |
| Consulta anterior | mesmo layout; conteúdo/autoria/data trocam pelo Atendimento exato |
| Legado | renderer atual, rótulo anterior, leitura/exportação sem dados fabricados |
| A fazer | coral; pode editar, encaminhar ou priorizar |
| Próxima sessão | amarelo e ainda indicado; reaparece planejado no Meu Dia |
| Realizado | azul na consulta/camada histórica; elegível à assinatura |
| Assinado | documento visível; correção cria complemento |
| Material ausente | não bloqueia salvar; CTA contextual reservado ao R-140d |
| Sem permissão | leitura permitida; escrita oculta/desabilitada com motivo |
| Erro parcial | bloco afetado com retry; restante permanece visível |

## 6. Referência visual

- **Artefato-base aprovado:** `plans/artefatos/R-140c-prontuario-ficha-unificada-v8.html`.
- **Delta de revisão local:** `plans/artefatos/R-140c-prontuario-ficha-unificada-v9.html`.
- **Delta Plano e histórico:** `plans/artefatos/R-140c-plano-e-historico-v10.html`.
- **Delta Plano → Revisão:** `plans/artefatos/R-140c-plano-e-historico-v11.html`.
- **Preserva:** hierarquia, status e próxima sessão do v7 aprovado; v8 substitui a dualidade
  Registro/Tratamento por Ficha + Histórico da Ficha.
- **Geometria:** desktop `minmax(0,2.05fr) / minmax(300px,.72fr)`; uma coluna ≤1050 px; sem
  scroll interno clínico. Odontograma real usa o componente anatômico existente.

| Token | Valor |
|---|---|
| background / surface | `#080b0b` / `#0d1110` |
| foreground / muted | `#f4f2eb` / `#9daba7` |
| border / strong | `#25302e` / `#34423f` |
| brand / soft | `#55d9c0` / `#102d28` |
| realizado / a fazer / próxima | `#69aff0` / `#ff8a82` / `#fbbf24` |
| radius / radius-lg | `12px` / `18px` |
| fontes | Georgia só em títulos; Outfit na interface; mono em data/dente |

O v11 mantém as abas **Boca / Plano e histórico / Anexos**, um corpo com scroll único e painéis
`Para esta consulta` e `Histórico clínico`, cujo primeiro agrupamento é `Em aberto`. O CTA
**Encaminhar procedimentos** é visível no cabeçalho. `Registrar hoje` conduz à Revisão, em vez de
concluir silenciosamente o procedimento.

## 7. Invariantes

- [x] Uma Ficha aparece uma vez; consulta aparece uma vez dentro dela por Atendimento/fallback.
- [x] Filtrar ou selecionar histórico não altera nem reparenta dados.
- [x] Atendimento com duas Fichas compartilha retorno/materiais, mas filtra evolução/eventos por Ficha.
- [x] Realizado sair da fila padrão nunca apaga evento, condição, documento ou acesso histórico.
- [x] Status, momento e cor derivam do mesmo evento canônico no Prontuário, Ficha e Meu Dia.
- [ ] Sugestão do Dex nunca é persistida sem revisão e o salvamento explícito do dentista.
- [ ] Conteúdo assinado, orçamento e documento congelado não são recalculados pela UI.
- [ ] Alteração encaminhada preserva autor/data original e persiste log na mesma transação.
- [ ] Paginação/500 visitas permanece no R-129; R-140c não omite dados silenciosamente.

## 8. Gates de aceite

- [x] Prontuário → dente → Ficha abre uma interface, na consulta correta, e voltar restaura contexto.
- [x] “Ver concluídos” alterna histórico azul sem ocultar acesso clínico ao dente.
- [ ] Histórico da Ficha troca entre duas consultas e atualiza evolução, autor, procedimentos,
      retorno, materiais e documentos sem misturar dados.
- [ ] Meu Dia salva visita com duas Fichas; cada histórico recebe seu recorte sem duplicar Atendimento.
- [ ] A fazer/Realizado/Próxima sessão persistem e aparecem coerentes no Meu Dia seguinte.
- [ ] Plano e histórico não duplicam pendência; Realizado, Próxima sessão, desfazer e encaminhar
      aplicam as guards de autoria/assinatura da Ficha.
- [ ] Consulta manual sem texto gera rascunho factual; editar, rejeitar ou falhar preserva o
      rascunho clínico e nunca impede salvar.
- [ ] Editar, complementar, encaminhar e assinar respeitam autoria/permissão; assinado é imutável.
- [ ] Assinatura de duas Fichas gera um documento por Ficha e ambos chegam a Arquivos.
- [ ] Retorno cria um agendamento ligado ao Atendimento; existente abre na Agenda.
- [ ] Avulso, Ficha concluída, sem localização, arcada, quadrante, ortodontia e legado ficam acessíveis.
- [ ] PDF/exportação preserva agrupamento por Ficha e Atendimento/fallback.
- [ ] RLS passa com duas clínicas e perfis dentista/admin/secretária.
- [ ] Artefato aprovado, light/dark, 375/768/1440 px, teclado e rolagem passam no navegador.

## 9. Fora de escopo

- Câmera/OCR/estoque e persistência de materiais: R-140d; v8 apenas reserva o ponto de entrada.
- Paginação real: R-129. Fechamento assistido: R-144. Nenhum diagnóstico/resumo clínico novo por IA.
- Nenhuma migration remota, repair, merge, deploy ou mudança em Vercel nesta fase.
