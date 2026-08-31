# R-140c — Redesign: Prontuário longitudinal do paciente

> **SPEC (redesign)** · **R-140c** · ⏳ filha do R-140
> **Aberto:** 2026-08-30 · **Fase:** contrato aguardando aprovação
> **Depende:** R-140a · **Preserva:** R-108 e R-120

## 0. Identificação

| | |
|---|---|
| **Tela / módulo** | Perfil do paciente — aba hoje chamada Ficha |
| **Tipo** | redesign de tela existente + projeção longitudinal |
| **Rota** | `/dashboard/pacientes/[id]` |
| **Arquivos principais** | `paciente-detail-client.tsx`, `FichasTab.tsx`, serviços de workspace/timeline |

## 1. Estado atual — inventário

- O perfil possui Ficha, Orçamentos, Agenda e Arquivos.
- `FichasTab` reúne leitura, edição, assinatura, odontograma, especialidades, captura e legado num
  componente grande; apresentação e regra clínica têm acoplamento relevante.
- Cada ficha moderna é um tratamento e contém eventos + evoluções; fichas só-texto usam renderer
  legado. Orçamentos e assinaturas dependem de `ficha_id`/`evento_id`.
- O odontograma ocupa grande área mesmo quando o objetivo é ler a história completa.
- A sequência principal é por ficha/tratamento, não por visita do paciente.

**Conferência do usuário:** reorganizar completamente; reduzir o odontograma e transformar a
superfície num arquivo de registro completo. Tratamentos continuam existindo dentro dela.

## 2. O que NÃO pode mudar — trava de segurança

- [x] Ficha continua tratamento 1↔1 e mantém nome/status/autor.
- [x] Eventos, evoluções, assinaturas, documentos e orçamentos mantêm IDs e regras.
- [x] Renderer legado continua disponível e nenhum dado antigo é reescrito.
- [x] Aba Orçamentos permanece separada e funcional.
- [x] Editar, encaminhar, assinar, imprimir e excluir seguem as autorizações atuais.
- [x] Nenhum conteúdo de outra clínica aparece; leitura compartilhada segue o núcleo clínico.
- [x] Apresentação muda primeiro em uma tela/artefato; lógica não é reescrita dentro do layout.

## 3. O que o usuário quer

**Sensação pretendida:** registro completo, organizado e rápido de consultar; odontograma presente,
mas não dominante; leitura longitudinal antes de edição detalhada.

| Elemento | Como está | Como o usuário quer |
|---|---|---|
| Nome da aba | Ficha | **Prontuário** |
| Ordem | fichas/tratamentos primeiro | visitas cronológicas como leitura principal |
| Odontograma | grande e dominante | resumo compacto, expansível para trabalho clínico |
| Tratamentos | cada ficha ocupa a narrativa | seção/filtro interno, sem nova aba |
| Evolução | dentro de cada ficha | dentro da visita correspondente |
| Etiquetas | inexistentes | estado e itens junto do atendimento |
| Registro completo | espalhado em abas/cards | visão clínica agregada com links para documentos/arquivos |

## 4. Contrato funcional e de dados

### 4.1 Projeção de leitura

```ts
interface ProntuarioAtendimento {
  atendimentoId: string | null; // null = fallback legado
  data: string;
  autor: { id: string; nome: string; cro: string | null };
  origem: 'meu_dia'|'ficha'|'importado'|'legado';
  evolucoes: Array<{ fichaId: string; fichaNome: string; texto: string | null }>;
  eventosRegistrados: EventoClinicoResumo[];
  eventosRealizados: EventoClinicoResumo[];
  rastreabilidade: 'nao_informada'|'pendente'|'completa'|'nao_se_aplica';
  documentos: DocumentoClinicoResumo[];
}

interface ProntuarioTratamento {
  fichaId: string;
  nome: string;
  status: 'aberta'|'concluida';
  progresso: { realizados: number; total: number };
  responsavel: { id: string; nome: string };
}
```

O servidor compõe a projeção em `getPatientWorkspaceData`/serviço específico com fetches
independentes em `Promise.all`. O client recebe DTO tipado; não faz joins clínicos nem reduce de
autoria. Paginação é por Atendimento (`cursor = data,id`) e nunca corta conteúdo dentro da visita.

### 4.2 Hierarquia da tela

```text
Prontuário
├── Resumo compacto
│   ├── odontograma miniatura → Expandir/Editar
│   ├── tratamentos em curso
│   └── pendências de rastreabilidade
├── Filtros: Tudo | Tratamento selecionado | Período | Autor
└── Linha do tempo por Atendimento
    ├── evolução por tratamento
    ├── feito / indicado
    ├── rastreabilidade e documentos
    └── ações autorizadas
```

- “Tratamentos em curso” é um bloco interno; clicar filtra a timeline e abre o detalhe existente.
- “Expandir odontograma” reutiliza o odontograma/editores existentes numa superfície dedicada;
  reduzir visualmente não reduz sua capacidade clínica.
- Orçamentos aparecem apenas como link contextual quando relacionados; valores permanecem na aba
  Orçamentos, evitando duas fontes visuais financeiras.
- Arquivos sem vínculo com Atendimento continuam na aba Arquivos e entram no resumo por data.

### 4.3 Legado e documentos

- Evolução sem Atendimento vira item `legado`, com data/autor da ficha e rótulo discreto.
- Ficha só-texto abre o renderer legado atual; não tenta fabricar eventos.
- Documento assinado mostra o snapshot congelado. A timeline nunca reconstrói um documento antigo
  a partir de dados atuais.
- Exportação ganha agrupamento por Atendimento sem remover a seção histórica por ficha durante a
  fase de compatibilidade.

## 5. Estados e comportamento

| Estado | Tela | Ação |
|---|---|---|
| Sem registro | resumo + vazio instrutivo | iniciar pelo Meu Dia/Agenda |
| Carregando | skeleton por resumo/timeline | sem layout shift grande |
| Sucesso | visitas decrescentes | carregar mais preserva posição |
| Filtro vazio | mensagem + limpar filtro | não parece ausência de prontuário |
| Legado | rótulo + renderer atual | leitura/exportação completas |
| Rastreabilidade pendente | chip neutro/ação | completar sem editar a evolução |
| Assinado | selo + ações de leitura | edição clínica bloqueada como hoje |
| Sem permissão de escrita | tudo legível permitido | ações ocultas/desabilitadas com motivo |
| Erro parcial | bloco afetado com retry | restante do prontuário continua visível |

## 6. Tokens e referência visual

- **Artefato:** a criar; 4 variantes antes da escolha, depois uma referência aprovada.
- **Direção:** arquivo clínico editorial compacto, não dashboard de métricas.

| Elemento | Contrato |
|---|---|
| Largura | leitura 760–880 px + resumo lateral em desktop; uma coluna no mobile |
| Odontograma compacto | 280–360 px desktop; largura total mobile; expandir explícito |
| Tipografia | DM Serif só no título; Outfit na interface; mono em datas/dentes |
| Cores | tokens atuais; teal feito, coral a fazer, alerta apenas risco clínico |
| Linha do tempo | borda/divisor, sem card aninhado em cada campo |
| Motion | 150–200 ms em filtro/expansão; `prefers-reduced-motion` respeitado |

## 7. Invariantes

- [ ] Timeline não duplica evento registrado/realizado na mesma seção.
- [ ] Filtrar tratamento não altera ou reparenta dados.
- [ ] Odontograma compacto deriva do mesmo reduce canônico.
- [ ] Conteúdo assinado, orçamento e documento congelado não são recalculados pela UI.
- [ ] Paginação não esconde metade de um Atendimento.

## 8. Gates de aceite

- [ ] Paciente com 3 tratamentos e visita tocando 2 mostra 1 visita + 2 evoluções identificadas.
- [ ] Indicação numa visita e realização noutra aparecem nos respectivos papéis sem duplicação.
- [ ] Selecionar tratamento filtra corretamente e “Tudo” restaura a linha do tempo.
- [ ] Ficha legada, documento assinado, PDF, Arquivos e orçamento continuam acessíveis.
- [ ] Perfil com 500 atendimentos carrega primeira página sem buscar/renderizar tudo.
- [ ] Secretária/dentista/admin veem somente ações autorizadas; duas clínicas provam isolamento.
- [ ] Artefato aprovado, light/dark, 375/768/1440 px, teclado e rolagem passam no navegador.

## 9. Fora de escopo e pós-entrega

- Não fundir Orçamentos, Agenda e Arquivos numa única aba física.
- Não criar diagnóstico automático, sumário clínico gerado por IA ou nova taxonomia odontológica.
- Pós-entrega: validar uma tela de referência, produção e só então substituir o rótulo Ficha em
  todas as superfícies relacionadas.
