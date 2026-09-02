# Estado — Odonto.IA

> **ESTADO** · atualizado em 02/09/2026

## Agora

🔵 **R-140c — Prontuário/Ficha unificados em execução local.** Revisão 3 e artefato v8
aprovados em 01/09; implementação autorizada neste PC, sem VM. Commits locais separados de
Ficha, Dex, Meu Dia, layout e build vão de `ada48fc` a `14ff34f`; sem push, deploy ou migration remota.

**Implementado e provado localmente**

- “Registro” e “Tratamento” deixaram de ser destinos concorrentes: ambos abrem uma única Ficha,
  já na consulta exata. O editor antigo ficou somente como compositor compatível, sem sua lista.
- Servidor projeta `Ficha → consultas`; visita com duas Fichas mantém um Atendimento compartilhado
  e filtra eventos/evoluções/documentos por Ficha. Documentos usam os IDs clínicos congelados na
  assinatura para aparecer somente na consulta exata. Testes novos cobrem recorte e ordenação.
- Ficha usa o corpo aprovado do Registro: evolução, odontograma, procedimentos, retorno,
  rastreabilidade, documentos/assinatura e Histórico da Ficha clicável.
- A Ficha restaura filtro, dente, camada de concluídos e scroll ao voltar. Concluídos saem da fila
  operacional e retornam por “Ver concluídos”, sem exclusão clínica.
- Entrada manual agora oferece “Gerar evolução com Dex” somente quando há contexto estruturado e
  a evolução está vazia. O Dex recebe apenas os dados da consulta atual, devolve rascunho editável e
  nunca salva, bloqueia ou inventa informação; o texto só vira registro no salvamento normal.
- Browser: destino único pelo dente, duas consultas no mesmo layout, editor preenchido e volta para
  a mesma Ficha; 375/1440 px sem overflow, dark/light e console sem erros. A entrada manual pelo
  dente 36 também exibiu o novo botão habilitado sem salvar nem transmitir o rascunho.
- 171/171 testes, TypeScript e `git diff --check` passaram; o lint do recorte não tem erro.
- Nenhuma migration, escrita remota, deploy ou push foi executado nesta rodada.

**Falta provar no PC/local navegador**

1. Teste transacional guiado: novo atendimento/complemento, status, próxima sessão e Meu Dia → Ficha.
2. Assinatura → Storage → documento congelado → Arquivos, inclusive visita com duas Fichas.
3. Retorno ligado ao Atendimento e reabertura na Agenda; encaminhamento + log com dois dentistas.
4. RLS com duas clínicas e perfis dentista/admin/secretária; anexos, PDF, 768 px e teclado.
5. Build atual atravessou a configuração do Next, mas parou ao resolver Google Fonts neste ambiente;
   repetir com rede disponível antes de publicar.

## Restrições do teste local

- Localhost pode usar Supabase de produção somente com clínica, contas e paciente sintéticos de teste.
- Sem `service_role`, dados clínicos reais, pagamentos ou integrações externas.
- Não executar `repair`: objetos da `20260831110000` existem no remoto sem histórico correspondente.
- Ausência da `20260831111000` bloqueia a prova da auditoria atômica do encaminhamento.
- Nenhum push, deploy, Vercel ou publicação antes da revisão e dos gates acima.

## Bloqueios conhecidos

- `supabase db reset` não reproduz produção: migrations históricas `001`/`007` estão fora de ordem.
- Lint geral mantém baseline preexistente de 14 erros/65 warnings fora dos arquivos desta execução.
- Produção não recebe a R-140c enquanto os gates transacionais, RLS e build da revisão atual não passarem.

## Próximo

Usuário revisa a Ficha unificada no localhost. Depois, repetir build na VM e executar a matriz
transacional sintética. Performance/paginação segue no R-129; câmera/OCR segue no R-140d.

**Achados visuais trazidos em 01/09, aguardando decisão:** no Meu Dia, o Histórico usa uma área
rolável menor que o painel clínico e deixa espaço morto abaixo; ele deve preencher a altura útil do
painel. Na Ficha, o Histórico precisa permitir abrir uma visita e ler seus detalhes sem criar uma
terceira interface concorrente. Em “Revisar consulta”, os ícones sem rótulo de status, planejar,
remover e expandir competem em cada procedimento; o primeiro uso precisa expor situação e detalhes
com texto e recolher ações secundárias.

**Correção local em teste (01/09):** o painel “Boca” não pode reservar a altura da gaveta fechada;
o odontograma deve permanecer visível. Histórico agora mostra “Planejados para esta consulta” a
partir das pendências com `momento_planejado=proxima_sessao`. Eventos sem grupo explícito com
momentos diferentes não podem se fundir no mesmo card, pois esconderiam a prioridade clínica.

**Decisão aplicada localmente (02/09):** “Pendências” deixa de ser uma aba separada. “Plano e
histórico” reúne os itens abertos — com “Para esta consulta” primeiro — e o histórico clínico em
leitura abaixo. O dentista autor pode marcar **A fazer / Próxima sessão / Realizado** diretamente;
destino de encaminhamento só conclui/reabre via RPC. A última ação oferece Desfazer e
encaminhamento continua no mesmo plano, sem duplicar listas. Falta prova visual e transacional
em registro sintético antes de qualquer push ou publicação.

**Ajuste de fluxo aplicado (02/09):** “Em aberto” agora mora dentro do Histórico clínico, para
evitar duas filas. **Registrar hoje** não conclui silenciosamente: põe o evento próprio na Revisão
do atendimento com o mesmo ID, para preencher detalhes de canal/implante e concluir apenas no
Salvar atendimento. Próxima sessão segue uma ação direta no painel; encaminhamento ganhou CTA
visível no topo. Para item encaminhado recebido, a conclusão ainda é a RPC estreita existente.
