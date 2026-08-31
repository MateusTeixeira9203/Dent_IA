# R-140 — Prontuário longitudinal, Atendimento e rastreabilidade

> **SPEC-mãe** · **R-140** · 🧊 congelado enquanto o gate clínico do Dex está aberto
> **Aberto:** 2026-08-30 · **Fechado:** — · **Fase:** contrato aguardando aprovação
> **Decisão de arquitetura aprovada pelo usuário:** 2026-08-30
> **Filhas:** [R-140a](R-140a-atendimento-clinico.md) · [R-140b](R-140b-meu-dia-fechamento.md) ·
> [R-140c](R-140c-prontuario-longitudinal.md) · [R-140d](R-140d-rastreabilidade-etiquetas.md) ·
> [R-140e](R-140e-estoque-rastreavel.md)

## 1. Problema

O Meu Dia precisa continuar sendo a ficha rápida, mas sua revisão de procedimentos ainda não
deixa claro o que foi feito, o que ficou planejado e para qual tratamento cada item vai. A Ficha
mostra bem um tratamento, porém não funciona como leitura longitudinal completa do paciente.

Ao mesmo tempo, a clínica precisará vincular ao atendimento informações de pacotes esterilizados,
materiais e dispositivos. Resolver apenas a interface quebraria contratos que hoje sustentam
orçamentos, pagamentos, assinaturas, PDFs, agenda, histórico e isolamento multi-clínica.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| **Prontuário** é a visão longitudinal do paciente | Transformar uma ficha existente no prontuário único | Misturaria tratamentos, responsáveis, orçamento e assinatura |
| **Ficha continua sendo tratamento** | Reabrir a tabela/aba `Tratamentos` | Preserva R-108 e não cria navegação paralela |
| **Atendimento clínico representa uma visita** | Usar ficha ou data como visita | Uma visita pode alcançar N fichas e pode haver 2 visitas no mesmo dia |
| Eventos mantêm seus IDs e fichas | Reparentear eventos para o Atendimento | Quebraria orçamento, assinatura e origem do planejamento |
| Atendimento liga evento como `registrado` e/ou `realizado` | Um único `atendimento_id` no evento | Um evento pode nascer numa visita e ser realizado em outra |
| Rastreabilidade é opcional e não bloqueante | Exigir etiqueta para salvar | A regra varia e o atrito atingiria o caminho clínico principal |
| Estoque consome rastreabilidade confirmada | OCR alterar saldo diretamente | OCR pode errar produto, lote, unidade ou duplicidade |

## 3. Objetivo e arquitetura

**Objetivo:** transformar o perfil do paciente em registro clínico longitudinal sem desmontar o
modelo de tratamento e preparar rastreabilidade/estoque sem aumentar o gesto comum de salvar.

```text
Paciente
└── Prontuário (projeção de leitura)
    ├── Fichas = tratamentos existentes
    │   ├── eventos odontológicos — fonte clínica e financeira
    │   └── evoluções — relato por visita
    └── Atendimentos = visitas
        ├── evoluções tocadas na visita
        ├── evento registrado / evento realizado
        ├── documentos e assinatura existentes
        └── rastreabilidade → uso de estoque futuro
```

Não nasce uma terceira fonte clínica. O Atendimento organiza relações; o evento continua sendo a
fonte do procedimento e a Ficha continua sendo a dona do tratamento.

## 4. Contrato de impacto

| Área | Contrato preservado | Adição permitida | Gate obrigatório |
|---|---|---|---|
| Orçamento | `orcamento_eventos.evento_id`, exclusividade e `ficha_id` | Exibir origem por atendimento | Suíte R-130 integral |
| Pagamentos | total, negociado, parcelas e recebimentos | nenhuma nesta família | valores antes/depois idênticos |
| Assinatura | evento assinado é imutável; snapshot/PDF congelado | atendimento apenas como metadado futuro | assinar, baixar e reabrir |
| Ficha | `ficha = tratamento`, nome, status e autor | leitura dentro do Prontuário | criar, editar, encaminhar e concluir |
| Evolução | uma por ficha tocada na visita | vínculo nullable com Atendimento | visita em N fichas gera N evoluções |
| Odontograma | evento e reduce atuais | vínculo relacional por papel | estado visual e IDs idênticos |
| Agenda | finalizar uma vez e notificar uma vez | `agendamento_id` no Atendimento | salvar/repetir sem duplicar |
| Arquivos | buckets privados e URLs assinadas | bucket privado de rastreabilidade | teste cross-clínica |
| Exportação | prontuário legado continua completo | seção de atendimentos/rastreabilidade | PDF/HTML antigo não perde conteúdo |
| Legado | renderer e registros existentes | backfill determinístico | contagens reconciliadas |

## 5. Dependências e ordem de entrega

```text
R-140a Atendimento clínico
   ├── R-140b Meu Dia
   ├── R-140c Prontuário longitudinal
   └── R-140d Etiquetas
          └── R-140e Estoque rastreável
```

1. Migration aditiva do R-140a, sem UI e com leitura antiga intacta.
2. Escrita em sombra + reconciliação; comparar atendimentos/evoluções antes de expor a leitura.
3. Meu Dia vira a primeira tela de referência e ganha o novo fechamento.
4. Rastreabilidade entra atrás de feature flag por clínica.
5. Prontuário passa a consumir Atendimentos, preservando fallback legado.
6. Estoque só recebe usos confirmados depois de a captura real de etiquetas estar validada.

Cada migration sobe em commit próprio. Nenhuma coluna/tabela antiga é removida nesta família.

## 6. Falhas, recuperação e observabilidade

- Toda visita recebe `chave_idempotencia`; retry não cria segundo Atendimento.
- Atendimento em preparação não aparece como visita concluída. Escrita interrompida é retomada
  pela mesma chave ou reconciliada; nunca apaga a ficha que já foi salva.
- Falha de OCR, upload ou estoque nunca reverte o registro clínico.
- Logs estruturados: `feature`, `clinicaId`, `atendimentoId`, estágio e código de erro; nenhum
  texto clínico, imagem ou etiqueta vai para log.
- Métricas: tempo até salvar, cliques no caminho comum, escolha `salvar+etiquetas`, OCR aceito
  sem edição, pendências abertas e reconciliações necessárias.
- Kill switches independentes: leitura longitudinal, captura de etiquetas e baixa de estoque.

## 7. Invariantes

- [ ] `ficha_id` e `evento_id` existentes não mudam de dono.
- [ ] Salvar sem etiqueta continua sendo um gesto e termina o atendimento clínico.
- [ ] `não informado`, `pendente`, `completo` e `não se aplica` nunca são confundidos.
- [ ] OCR nunca vira dado confirmado nem movimento de estoque sem ação humana.
- [ ] Uma visita pode tocar N fichas; um evento pode relacionar duas visitas por papéis distintos.
- [ ] Toda tabela nova tem `clinica_id`, RLS e query escopada pela clínica ativa.
- [ ] Registro assinado e documento congelado permanecem imutáveis.
- [ ] Legado sem vínculo de Atendimento continua visível e exportável.

## 8. Gates transversais

- [ ] Rodar os gates completos de Meu Dia, R-108/R-108b e R-130 antes e depois.
- [ ] Gerar orçamento com evento indicado, realizado e assinado; IDs, itens e totais iguais.
- [ ] Aprovar parcialmente, receber, editar e excluir recebimento sem divergência.
- [ ] Assinar procedimentos, gerar documento/PDF e confirmar bloqueio de edição posterior.
- [ ] Salvar visita que só conclui pendências e visita que cria eventos em outra ficha.
- [ ] Retry da mesma requisição cria um Atendimento, N evoluções esperadas e zero duplicação.
- [ ] Duas contas de clínicas diferentes não leem nem escrevem Atendimento, imagem ou estoque.
- [ ] Dentista e secretária da mesma clínica exercitam exatamente as permissões de cada filha.
- [ ] Light/dark e 375/768/1440 px passam; nenhum modal deixa `body` sem rolagem após fechar/F5.
- [ ] Backfill reconciliado: toda evolução histórica ganha Atendimento; ambiguidade é relatada,
  nunca preenchida por aproximação.

## 9. Fora de escopo

- Marketplace, pagamento de compras, fornecedores e cotação nesta rodada.
- Diagnóstico ou decisão clínica por IA.
- Obrigatoriedade nacional presumida para todo material; configuração local continua necessária.
- Apagar estruturas legadas, reescrever fichas antigas ou criar aba separada de Tratamentos.
