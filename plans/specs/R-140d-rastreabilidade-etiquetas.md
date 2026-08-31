# R-140d — Rastreabilidade por etiquetas no Atendimento

> **SPEC** · **R-140d** · ⏳ filha do R-140
> **Aberto:** 2026-08-30 · **Fase:** contrato aguardando aprovação
> **Depende:** R-140a · **Habilitação:** feature flag/configuração por clínica
> **Referência regulatória:** [`memory/references/rdc-1002-rastreabilidade-odontologia.md`](../../memory/references/rdc-1002-rastreabilidade-odontologia.md)

## 1. Problema

As informações necessárias já existem nas etiquetas dos pacotes esterilizados e de produtos, mas
não estão ligadas à visita em que foram usados. Digitar tudo gera atrito; tratar OCR como verdade
gera erro clínico, regulatório e de estoque. A norma não torna QR/código de barras obrigatório nem
obriga rastrear todo consumível da mesma forma, então o produto precisa suportar configuração local.

## 2. Decisões

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Foto + OCR estruturado + confirmação humana | Texto livre ou OCR autoaprovado | Auditável e corrigível |
| Câmera traseira como entrada primária no celular | Formulário de materiais antes da imagem | A etiqueta já contém os dados e a digitação gera atrito |
| Arquivo/câmera USB como fallback de desktop | Exigir celular para concluir | Consultório também pode operar em desktop |
| Distinguir pacote esterilizado, produto e implantável | Um campo genérico `lote` | Lote de carga ≠ lote do fabricante |
| Quatro estados explícitos | Booleano `tem_rastreabilidade` | Não informado ≠ pendente ≠ não se aplica |
| Um Atendimento pode ter N capturas e N itens | Uma etiqueta por consulta | Foto pode conter vários pacotes/produtos |
| Item pode ligar N eventos realizados | Copiar procedimento no item | Preserva o evento canônico |
| Sem hard delete após confirmação | Editar/apagar histórico | Rastreabilidade precisa de trilha |

## 3. Objetivo e experiência

**Objetivo:** fotografar ou digitar uma etiqueta, revisar o texto extraído e vincular os materiais
ao Atendimento sem interromper o salvamento clínico.

```text
Materiais / etiquetas
  → toque explícito do profissional
  → câmera traseira no celular
  → foto da etiqueta
  → upload privado + OCR estruturado
  → revisão dos campos e vínculos com procedimentos
  → confirmar

Salvar + adicionar etiquetas
  → atendimento clínico já salvo
  → rastreabilidade completa
```

“Completar depois” cria uma pendência encontrável no Meu Dia e no Prontuário. “Não se aplica” é
uma decisão registrada, nunca o fallback automático de uma captura ausente.

A câmera nunca abre sozinha ao entrar no paciente ou ao salvar: só depois do toque explícito em
`Materiais / etiquetas`. Em celular, a preferência é `facingMode: 'environment'` (traseira). Se
o navegador negar permissão ou não suportar `getUserMedia`, a tela oferece `input` de imagem com
`capture="environment"`; em desktop, upload de arquivo e webcam são os fallbacks. Cancelar ou
negar a câmera não altera o atendimento nem impede salvar.

## 4. Contrato técnico

### 4.1 Schema

```sql
create table rastreabilidade_config (
  clinica_id uuid primary key references clinicas(id) on delete cascade,
  modo text not null check (modo in ('opcional','lembrar_por_procedimento')),
  tipos_evento text[] not null default '{}',
  updated_by uuid not null references users(id),
  updated_at timestamptz not null default now()
);

create table atendimento_rastreabilidade (
  atendimento_id uuid primary key references atendimentos_clinicos(id) on delete restrict,
  clinica_id uuid not null references clinicas(id) on delete restrict,
  status text not null check (status in
    ('nao_informada','pendente','completa','nao_se_aplica')),
  decidido_por uuid references users(id) on delete restrict,
  decidido_em timestamptz,
  motivo_nao_aplica text,
  updated_at timestamptz not null default now()
);

create table rastreabilidade_capturas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas(id) on delete restrict,
  atendimento_id uuid not null references atendimentos_clinicos(id) on delete restrict,
  origem text not null check (origem in ('foto','arquivo','manual','codigo')),
  storage_path text,
  arquivo_sha256 text,
  texto_ocr text,
  extracao_json jsonb,
  estado text not null check (estado in ('enviando','processando','revisao','falhou','confirmada')),
  criado_por uuid not null references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (atendimento_id, arquivo_sha256)
);

create table rastreabilidade_itens (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas(id) on delete restrict,
  atendimento_id uuid not null references atendimentos_clinicos(id) on delete restrict,
  captura_id uuid references rastreabilidade_capturas(id) on delete restrict,
  categoria text not null check (categoria in
    ('pacote_esterilizado','produto_consumivel','dispositivo_implantavel','outro')),
  descricao text not null,
  fabricante text,
  codigo text,
  lote_fabricante text,
  validade date,
  registro_anvisa text,
  lote_esterilizacao text,
  data_esterilizacao date,
  responsavel_preparo text,
  conteudo_pacote text,
  quantidade numeric,
  unidade text,
  estado text not null check (estado in ('confirmado','substituido','cancelado')),
  substitui_id uuid references rastreabilidade_itens(id) on delete restrict,
  confirmado_por uuid not null references users(id) on delete restrict,
  confirmado_em timestamptz not null default now()
);

create table rastreabilidade_eventos (
  clinica_id uuid not null references clinicas(id) on delete restrict,
  item_id uuid not null references rastreabilidade_itens(id) on delete restrict,
  evento_id uuid not null references odontograma_eventos(id) on delete restrict,
  primary key (item_id, evento_id)
);
```

Uma tabela append-only `rastreabilidade_auditoria` registra criação, confirmação, substituição,
cancelamento, ator e snapshots anterior/novo. Bucket `rastreabilidade` é privado; path obrigatório
`{clinica_id}/{paciente_id}/{atendimento_id}/{uuid}.jpg`, com policy validando clínica ativa.

### 4.2 Saída estruturada da IA

```ts
interface EtiquetaExtraida {
  categoria: 'pacote_esterilizado'|'produto_consumivel'|'dispositivo_implantavel'|'outro';
  descricao: string | null;
  fabricante: string | null;
  codigo: string | null;
  loteFabricante: string | null;
  validade: string | null;
  registroAnvisa: string | null;
  loteEsterilizacao: string | null;
  dataEsterilizacao: string | null;
  responsavelPreparo: string | null;
  conteudoPacote: string | null;
  textoVisivel: string;
  camposIncertos: string[];
}
interface ExtracaoEtiqueta { itens: EtiquetaExtraida[]; textoBruto: string }
```

`POST /api/rastreabilidade/capturas/[id]/extrair` recebe apenas `capturaId`, resolve clínica e
imagem no servidor e chama `generateStructuredGemini` com `responseSchema` e
`feature: 'rastreabilidade_etiqueta'`. Nunca usa texto livre parseado à mão. Limites iniciais:
JPG/PNG/WebP, 10 MB, 10 extrações/minuto/usuário; otimização preserva legibilidade e original.

### 4.3 Ações e permissões

- `iniciarCaptura(atendimentoId, metadata)` → URL/path autorizado ou entrada manual.
- `confirmarCaptura(capturaId, itens, eventoIds)` valida Zod, clínica, Atendimento finalizado,
  eventos realizados nesse Atendimento e grava tudo em transação.
- `marcarRastreabilidadePendente(atendimentoId)` e `marcarNaoSeAplica(atendimentoId, motivo?)`.
- `corrigirItem(itemId, novo)` cria nova linha `substitui_id`; nunca edita a linha confirmada.
- Admin, dentista e secretária da clínica podem completar rastreabilidade; protético não. O ator
  real é sempre gravado. Conteúdo clínico/eventos continuam editáveis só pelas regras próprias.
- O cliente só inicia `navigator.mediaDevices.getUserMedia` após gesto explícito. Ao capturar,
  cancelar ou trocar de tela, encerra todas as tracks; o frame fica apenas em memória até o upload
  autorizado. Nenhum stream de vídeo é enviado ou persistido.

## 5. Estados e recuperação

| Estado | Interface | Recuperação |
|---|---|---|
| Não informada | ação neutra “Adicionar” | nenhuma cobrança automática |
| Pendente | chip + “Completar” | Meu Dia e Prontuário apontam para o Atendimento |
| Enviando/processando | preview + `DexLoader` | retry não duplica pelo SHA |
| Revisão | campos editáveis + incertezas destacadas | original e OCR sempre acessíveis |
| Completa | itens confirmados e ator/data | correção cria revisão |
| Não se aplica | decisão e ator/data | pode reabrir com auditoria |
| Falha OCR | entrada manual + tentar novamente | atendimento permanece salvo |

Configuração `lembrar_por_procedimento` transforma o estado inicial em `pendente` quando a visita
realiza um tipo configurado. Ela lembra, mas nunca bloqueia o save.

## 6. Invariantes

- [ ] Lote do fabricante e lote da esterilização são campos distintos.
- [ ] Imagem original, texto OCR e confirmação humana permanecem relacionados.
- [ ] Somente evento do mesmo paciente/clínica e realizado naquele Atendimento pode ser ligado.
- [ ] Confirmar duas vezes é idempotente; arquivo repetido na mesma visita é avisado.
- [ ] “Completa” exige ao menos um item confirmado; “não se aplica” exige ator/data.
- [ ] Nenhum dado confirmado é apagado fisicamente pela UI.

## 7. Gates de aceite

- [ ] Foto com um pacote opaco extrai data, responsável, lote da carga e conteúdo para revisão.
- [ ] Em celular, tocar `Materiais / etiquetas` pede câmera traseira; cancelar/recusar mantém a
  consulta utilizável e oferece arquivo/manual.
- [ ] Foto com dois rótulos gera dois itens, sem fundir lotes.
- [ ] Campo incerto/vazio não é inventado nem confirmado silenciosamente.
- [ ] Correção mantém versão anterior e atual; exportação mostra a atual + trilha.
- [ ] Falha/offline fecha e reabre a pendência sem perder o atendimento.
- [ ] Conta de outra clínica não obtém URL assinada nem consulta metadados.
- [ ] Duas contas da mesma clínica validam dentista e secretária; protético recebe negação.
- [ ] Nenhum log contém texto OCR, imagem, nome do paciente ou lote.

## 8. Base regulatória e retenção

- A configuração da clínica deve mencionar que exigências locais podem variar.
- O produto suporta os campos de pacote esterilizado destacados na RDC/FAQ oficial e mantém
  vínculo digital no prontuário; QR/barcode permanece opcional.
- Dispositivo implantável usa categoria/fluxo próprio e preserva fabricante, código, lote,
  registro e paciente.
- Não há deleção automática. Política definitiva de retenção de prontuário e imagens exige
  validação jurídica; registros de monitoramento da esterilização têm referência mínima de 5 anos.

## 9. Fora de escopo

- Certificar conformidade da clínica, interpretar norma local ou substituir responsável técnico.
- Ler escrita ilegível com garantia, reconhecer instrumento individual sem etiqueta ou baixar
  estoque antes da confirmação.
