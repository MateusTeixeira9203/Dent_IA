import { NextRequest, NextResponse } from 'next/server';
import { Type, type Schema } from '@google/genai';
import { getDentistaCached } from '@/lib/get-dentista';
import { withRateLimit } from '@/lib/rate-limit';
import { generateStructuredGemini } from '@/lib/ai/provider';
import { logAICall } from '@/lib/ai/logger';
import { buildDentalContext } from '@/lib/odonto-dictionary';
import { isArch } from '@/lib/arcadas';
import type {
  OdontogramaEventoInput,
  TipoRegistroOdontograma,
  StatusRegistro,
  NivelAncora,
  FaceDental,
  Arcada,
  QuadranteFDI,
  AncoraClinica,
  OrtoManutencaoInfo,
  PapelNoGrupo,
} from '@/types/odontograma';

export interface EvolucaoFormatada {
  queixa_principal:    string;
  anotacoes:           string;
  dentes_afetados:     number[];
  dentes_observacoes:  Record<string, string>;
  procedimentos:       string[];
  conduta:             string;
  alerta_novo:         string | null;
  // Camada visual v3 (odontograma) — aditiva. Contrato v2 acima permanece intacto.
  odontograma_eventos: OdontogramaEventoInput[];
  orto_manutencao:     OrtoManutencaoInfo | null;
}

// Formato que o MODELO devolve (spec fase1-5 §C2): schema estrito não aceita chaves
// dinâmicas, então dentes_observacoes chega como lista de pares e a rota converte.
// O contrato com o cliente (EvolucaoFormatada) permanece intacto.
interface EvolucaoWire {
  queixa_principal:    string;
  anotacoes:           string;
  dentes_afetados:     number[];
  dentes_observacoes:  Array<{ dente: string; observacao: string }>;
  procedimentos:       string[];
  conduta:             string;
  alerta_novo:         string | null;
  odontograma_eventos: OdontogramaEventoWire[];
  orto_manutencao:     OrtoManutencaoWire | null;
}

/** Evento como o modelo emite: origem NÃO vem do modelo (a rota decide pelo modo).
 *  papel_no_grupo vem do modelo SÓ pra ponte (R-06) — validado no parse, null nos demais. */
interface OdontogramaEventoWire {
  tipo:       string;
  status:     string;
  nivel:      string;
  arcada?:    string | null;
  quadrante?: number | null;
  dente?:     number | null;
  faces:      string[];
  grupo_id?:  string | null;
  papel_no_grupo?: string | null;
  observacao: string;
}

// R-50 (05/08) — os 4 campos `_inferior` são a metade que faltava do `arcada: 'ambas'`: o schema
// já aceitava o valor mas não tinha onde guardar o 2º conjunto, então ditar as duas arcadas
// guardava um fio só (bug relatado ao vivo em 04/08). Todos opcionais: relato de arcada única e
// registro antigo nunca os têm.
interface OrtoManutencaoWire {
  arcada:                string;
  fio?:                  string | null;
  ativacao?:             string | null;
  elastico_corrente?:    string | null;
  elastico_intermaxilar?: string | null;
  fio_inferior?:                   string | null;
  ativacao_inferior?:              string | null;
  elastico_corrente_inferior?:     string | null;
  elastico_intermaxilar_inferior?: string | null;
}

// R-06/R-07 (spec R-06-07, Fase 4): enum completo — 'ponte'/'esfoliacao' entraram junto com a
// UI que os renderiza (invariante #11 satisfeito nas Fases 1-3) e a rotina ganhou nível 'boca'.
// Mudança gated por eval (evals/extracao-clinica): baseline ATUAL 16/16 não pode regredir.
const ODONTOGRAMA_EVENTO_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['tipo', 'status', 'nivel', 'faces', 'observacao'],
  properties: {
    tipo: {
      type: Type.STRING,
      enum: ['carie_restauracao', 'exodontia', 'endodontia', 'lesao_periapical',
             'implante', 'coroa', 'selante', 'inclusao', 'fratura', 'pino_nucleo',
             'ponte', 'esfoliacao', 'profilaxia', 'raspagem', 'clareamento', 'fluor'],
    },
    status:    { type: Type.STRING, enum: ['indicado', 'realizado'] },
    nivel:     { type: Type.STRING, enum: ['boca', 'arcada', 'quadrante', 'dente', 'face'] },
    arcada:    { type: Type.STRING, enum: ['superior', 'inferior'], nullable: true },
    quadrante: { type: Type.INTEGER, nullable: true },
    dente:     { type: Type.INTEGER, nullable: true },
    faces:     { type: Type.ARRAY, items: { type: Type.STRING, enum: ['O', 'M', 'D', 'V', 'L'] } },
    grupo_id:  { type: Type.STRING, nullable: true },
    papel_no_grupo: { type: Type.STRING, enum: ['pilar', 'pontico'], nullable: true },
    observacao: { type: Type.STRING },
  },
};

// Schema imposto pela API do Gemini — validado no bake-off 13/07 (plans/specs/eval/).
// v3: ganha odontograma_eventos + orto_manutencao. Nenhum campo v2 muda de tipo/obrigatoriedade.
const EVOLUCAO_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['queixa_principal', 'anotacoes', 'dentes_afetados', 'dentes_observacoes', 'procedimentos', 'conduta', 'odontograma_eventos'],
  properties: {
    queixa_principal: { type: Type.STRING },
    anotacoes:        { type: Type.STRING },
    dentes_afetados:  { type: Type.ARRAY, items: { type: Type.INTEGER } },
    dentes_observacoes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['dente', 'observacao'],
        properties: {
          dente:      { type: Type.STRING },
          observacao: { type: Type.STRING },
        },
      },
    },
    procedimentos:    { type: Type.ARRAY, items: { type: Type.STRING } },
    conduta:          { type: Type.STRING },
    alerta_novo:      { type: Type.STRING, nullable: true },
    odontograma_eventos: { type: Type.ARRAY, items: ODONTOGRAMA_EVENTO_SCHEMA },
    orto_manutencao: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        arcada:                { type: Type.STRING, enum: ['superior', 'inferior', 'ambas'] },
        fio:                   { type: Type.STRING, nullable: true },
        ativacao:              { type: Type.STRING, nullable: true },
        elastico_corrente:     { type: Type.STRING, nullable: true },
        elastico_intermaxilar: { type: Type.STRING, nullable: true },
        // R-50: só usados com arcada 'ambas' (base = superior, estes = inferior).
        fio_inferior:                   { type: Type.STRING, nullable: true },
        ativacao_inferior:              { type: Type.STRING, nullable: true },
        elastico_corrente_inferior:     { type: Type.STRING, nullable: true },
        elastico_intermaxilar_inferior: { type: Type.STRING, nullable: true },
      },
    },
  },
};

// FDI estrito: permanentes q1–4 dentes 1–8; decíduos q5–8 dentes 1–5.
const isValidFDI = (d: number): boolean => {
  const q = Math.floor(d / 10);
  const t = d % 10;
  if (q >= 1 && q <= 4) return t >= 1 && t <= 8;
  if (q >= 5 && q <= 8) return t >= 1 && t <= 5;
  return false;
};

const TIPOS_ACEITOS = new Set<TipoRegistroOdontograma>([
  'carie_restauracao', 'exodontia', 'endodontia', 'lesao_periapical',
  'implante', 'coroa', 'selante', 'inclusao', 'fratura', 'pino_nucleo',
  // R-06/R-07 — abertos com a UI pronta (Fases 1-3 da spec R-06-07):
  'ponte', 'esfoliacao', 'profilaxia', 'raspagem', 'clareamento', 'fluor',
]);
const FACES_VALIDAS = new Set<FaceDental>(['O', 'M', 'D', 'V', 'L']);

/**
 * Pós-processamento dos eventos (§3.1.4): filtra enum, valida FDI, garante coerência de
 * âncora (mesma regra da constraint SQL — invariante #8), resolve tag curta de grupo_id
 * para uuid, e força origem='preexistente' quando modo='exame_inicial' (§3.1.3).
 * Evento malformado é DESCARTADO — nunca derruba a resposta (os campos v2 seguem válidos).
 */
function parseEventos(wire: unknown, modo: 'consulta' | 'exame_inicial'): OdontogramaEventoInput[] {
  if (!Array.isArray(wire)) return [];
  const origem = modo === 'exame_inicial' ? 'preexistente' : 'clinica';
  const grupoMap = new Map<string, string>(); // tag curta do modelo ("g1") -> uuid real
  const out: OdontogramaEventoInput[] = [];

  for (const raw of wire) {
    if (!raw || typeof raw !== 'object') continue;
    const w = raw as OdontogramaEventoWire;

    if (!TIPOS_ACEITOS.has(w.tipo as TipoRegistroOdontograma)) continue;
    if (w.status !== 'indicado' && w.status !== 'realizado') continue;
    if (!['boca', 'arcada', 'quadrante', 'dente', 'face'].includes(w.nivel)) continue;

    const nivel = w.nivel as NivelAncora;
    const dente = w.dente != null ? Number(w.dente) : undefined;
    const faces = (Array.isArray(w.faces) ? w.faces : []).filter((f): f is FaceDental => FACES_VALIDAS.has(f as FaceDental));

    // Coerência de âncora — espelha odontograma_eventos_ancora_valida (constraint SQL).
    const ancora: AncoraClinica = { nivel };
    if (nivel === 'boca') {
      // R-07: boca toda — nenhum campo de âncora (constraint exige tudo null).
    } else if (nivel === 'arcada') {
      if (w.arcada !== 'superior' && w.arcada !== 'inferior') continue;
      ancora.arcada = w.arcada as Arcada;
    } else if (nivel === 'quadrante') {
      if (w.quadrante == null || w.quadrante < 1 || w.quadrante > 8) continue;
      ancora.quadrante = w.quadrante as QuadranteFDI;
    } else if (nivel === 'dente') {
      if (dente == null || !isValidFDI(dente)) continue;
      ancora.dente = dente; // faces fica vazio por definição
    } else { // face
      if (dente == null || !isValidFDI(dente) || faces.length === 0) continue;
      ancora.dente = dente;
      ancora.faces = faces;
    }

    // R-06: esfoliação só existe em decíduo (51-85) e como fato consumado — evento fora
    // disso é alucinação, descarta (perda silenciosa < dado errado no prontuário).
    if (w.tipo === 'esfoliacao' && (dente == null || dente < 51 || w.status !== 'realizado')) continue;

    let grupo_id: string | null = null;
    if (w.grupo_id) {
      const tag = String(w.grupo_id);
      if (!grupoMap.has(tag)) grupoMap.set(tag, crypto.randomUUID());
      grupo_id = grupoMap.get(tag)!;
    }

    // R-06: papel só faz sentido na ponte; qualquer outro valor/tipo degrada pra null.
    const papel: PapelNoGrupo | null =
      w.tipo === 'ponte' && (w.papel_no_grupo === 'pilar' || w.papel_no_grupo === 'pontico')
        ? w.papel_no_grupo
        : null;

    out.push({
      tipo:           w.tipo as TipoRegistroOdontograma,
      status:         w.status as StatusRegistro,
      origem,
      ancora,
      grupo_id,
      papel_no_grupo: papel,
      observacao:     typeof w.observacao === 'string' ? w.observacao.trim() : '',
    });
  }
  return out;
}

function parseOrto(wire: unknown): OrtoManutencaoInfo | null {
  if (!wire || typeof wire !== 'object') return null;
  const w = wire as OrtoManutencaoWire;
  // R-50 (F2) — backstop no código da regra de recusa do prompt: arcada fora dos 3 valores
  // (inclusive ausente) devolve null. A IA nunca escolhe arcada por conta própria; sem arcada
  // dita, não há manutenção estruturada — o relato cai no texto da visita.
  if (w.arcada !== 'superior' && w.arcada !== 'inferior' && w.arcada !== 'ambas') return null;
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
  // R-50 (F1) — os `_inferior` só fazem sentido com 'ambas'; em arcada única ficam undefined
  // (o tipo os declara opcionais), não null, pra não gravar campo vazio à toa.
  const inferior = w.arcada === 'ambas'
    ? {
        fio_inferior:                   str(w.fio_inferior),
        ativacao_inferior:              str(w.ativacao_inferior),
        elastico_corrente_inferior:     str(w.elastico_corrente_inferior),
        elastico_intermaxilar_inferior: str(w.elastico_intermaxilar_inferior),
      }
    : {};
  return {
    arcada:                w.arcada,
    fio:                   str(w.fio),
    ativacao:              str(w.ativacao),
    elastico_corrente:     str(w.elastico_corrente),
    elastico_intermaxilar: str(w.elastico_intermaxilar),
    ...inferior,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = await withRateLimit(req, 'dex:formatar-evolucao', 20, 60_000);
  if (limited) return limited;

  try {
    const dentista = await getDentistaCached();
    if (!dentista) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 });
    }

    let body: { texto: string; pacienteNome?: string; modo?: 'consulta' | 'exame_inicial' };
    try {
      body = (await req.json()) as { texto: string; pacienteNome?: string; modo?: 'consulta' | 'exame_inicial' };
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
    }

    if (!body.texto?.trim()) return NextResponse.json({ error: 'Texto vazio' }, { status: 400 });

    const modo: 'consulta' | 'exame_inicial' = body.modo === 'exame_inicial' ? 'exame_inicial' : 'consulta';

    const prompt = `Você é um assistente clínico odontológico especializado em documentação.
Analise o relato livre do dentista e extraia SOMENTE o que é clinicamente relevante — sinal, não ruído.

${buildDentalContext()}

RELATO DO DENTISTA:
"${body.texto}"

CONTEXTO:
- Paciente: ${body.pacienteNome ?? 'não informado'}
- Data: ${new Date().toLocaleDateString('pt-BR')}
${modo === 'exame_inicial' ? '- Origem do texto: HISTÓRICO/REFERÊNCIA — documento anexado ou colado pelo dentista, não é ele narrando o que fez nesta sessão. Ver regra de status no bloco ODONTOGRAMA abaixo — ela muda pra este modo.' : ''}

Retorne SOMENTE um JSON válido, sem markdown, com exatamente esta estrutura:
{
  "queixa_principal": "título objetivo do procedimento principal (ex: Endodontia dente 26, Restauração dentes 14 e 15)",
  "anotacoes": "evolução clínica em linguagem técnica — procedimento realizado, técnica usada, intercorrências relevantes. 2-3 frases (caso extenso: até 6, cobrindo os principais diagnósticos), sem repetição, sem encher linguiça.",
  "dentes_afetados": [26, 36],
  "dentes_observacoes": [{"dente": "13", "observacao": "Tratamento de canal\\nPino\\nProvisório\\nCoroa de porcelana"}, {"dente": "98", "observacao": "PPR (prótese parcial removível)"}],
  "procedimentos": ["lista resumida dos procedimentos realizados — ex: Tratamento endodôntico, Radiografia periapical"],
  "conduta": "orientações ao paciente, cuidados pós-procedimento, prescrições mencionadas. String vazia se não mencionado.",
  "alerta_novo": "se o dentista mencionar nova alergia ou medicamento novo do paciente, registrar aqui. null se nenhum",
  "odontograma_eventos": [{"tipo": "carie_restauracao", "status": "realizado", "nivel": "face", "dente": 14, "faces": ["O"], "grupo_id": null, "papel_no_grupo": null, "observacao": "resina composta"}],
  "orto_manutencao": null
}

Regras críticas:
- IGNORE conversa não-clínica: saudação, small talk, divagação, interrupção — não vira anotação nem aparece no JSON.
- NÃO INVENTE nem infira o que não foi dito — dente, procedimento, conduta ou diagnóstico ausentes no relato ficam vazios/null, nunca "chutados".
- CORREÇÃO DE TRANSCRIÇÃO: o relato vem de transcrição de voz e pode ter erros fonéticos — corrija-os pelo contexto clínico (ex: "reza"→"resina", "pério"→"periodontia"). Números de dente só corrigir se o contexto tornar o erro inequívoco. Nunca invente conteúdo novo ao corrigir.
- dentes_afetados: array de inteiros FDI válidos (11-48, decíduos 51-85). Para procedimentos de arcada ou boca inteira, use os sentinelas (99 boca toda, 97 arcada superior, 98 arcada inferior — ver glossário). NÃO liste dentes individuais nesses casos.
- OBRIGATÓRIO — dentes_observacoes cobre TODO dente: para CADA número em dentes_afetados (dente individual OU sentinela 97/98/99), crie um item {"dente": "<número>", "observacao": "<procedimento(s)>"} em dentes_observacoes. Nenhum dente citado em dentes_afetados pode ficar sem item correspondente — se o dente foi mencionado, o que se fez nele TEM que estar lá. Sem isso o procedimento some do orçamento e do progresso.
- PLANEJADO TAMBÉM CONTA: procedimento indicado ou planejado para sessão futura (ex: "indiquei exodontia", "vou extrair o 28 na próxima", "facetas nos incisivos, preparo na próxima") ENTRA em dentes_afetados e dentes_observacoes igual ao realizado — marque o status na observação (ex: "Exodontia — planejado"). A ficha alimenta o plano de tratamento e o orçamento: o que foi indicado e não registrado é tratamento e receita perdidos.
- NOTA DE PLANEJAMENTO/COORDENAÇÃO ≠ procedimento: fala de preparo, encaminhamento ou avaliação futura SEM intervenção executável definida (ex: "preparar o dente pra passar pro Dr. Fulano", "planejar um implante ali mais pra frente", "avaliar na próxima consulta") vira observação do dente prefixada com "Planejamento: " (ex: "Planejamento: preparo para prótese — encaminhar ao Dr. Fulano") e NUNCA entra no array procedimentos — não é item orçável. Distinção: "vou extrair o 28 na próxima" é intervenção concreta indicada (entra como "Exodontia — planejado"); "preparar pro protesista" é coordenação (vira "Planejamento: ...").
- Se nenhum dente mencionado: [] e []
- observacao: se mais de um procedimento no mesmo dente, separar por \\n — cada linha vira um item independente marcável pelo dentista
- procedimentos: array de strings resumidas, mínimo 1 item baseado no relato
- procedimentos = INTERVENÇÕES (o que foi feito ou será feito: restauração, endodontia, exodontia, profilaxia…), NUNCA achados/diagnósticos. Cárie, pulpite, necrose, fratura, mobilidade, retração gengival são ACHADOS — descrevem o problema, vão em anotacoes/queixa_principal, jamais em procedimentos. Ex: relato "cárie oclusal no 14" → procedimento = "Restauração com resina composta", não "Cárie oclusal".
- O diagnóstico e o raciocínio clínico (ex: "pulpite irreversível confirmada por teste de vitalidade") entram em anotacoes — registrar, não descartar.
- GENERALIZAÇÃO: termo clínico fora do glossário → use o nome clínico padrão brasileiro do procedimento; o glossário ancora nomenclatura, não limita cobertura.
- conduta: string vazia "" se não houver orientações mencionadas
- alerta_novo: null se não mencionado
- Não repetir nome do paciente nas anotações
- Português brasileiro, linguagem técnica mas clara

ODONTOGRAMA (camada visual — além dos campos acima):
Para CADA achado/procedimento que você registrou em dentes_observacoes, emita TAMBÉM o(s) evento(s) visual(is) correspondente(s) em "odontograma_eventos". Um evento descreve o estado clínico de um dente ou face.
- tipo (escolha o mais específico): "carie_restauracao" (cárie a restaurar OU restauração feita — ancora em FACE), "endodontia" (canal), "exodontia" (extração), "coroa" (coroa total protética UNITÁRIA), "ponte" (prótese fixa multi-dente — ver regra PONTE), "implante", "selante" (sempre face O), "lesao_periapical" (achado radiográfico no ápice), "inclusao" (dente incluso/impactado), "fratura" (trauma dentário), "pino_nucleo" (pino/núcleo intrarradicular), "esfoliacao" (decíduo que caiu naturalmente — SÓ dentes 51-85, sempre "realizado"), "profilaxia" (limpeza — nível boca), "raspagem" (raspagem/alisamento periodontal — nível quadrante; sem quadrante citado, boca), "clareamento" (nível boca), "fluor" (aplicação de flúor — nível boca).
- status: "indicado" (a fazer/planejado — MESMA regra do PLANEJADO acima) ou "realizado" (feito / verbo no passado).
${modo === 'exame_inicial' ? `- ⛔⛔ MODO HISTÓRICO/REFERÊNCIA — a regra de status ACIMA NÃO VALE aqui, esta a substitui: o texto é
  documento trazido de fora (prontuário anterior, histórico importado), não o dentista relatando o
  que fez agora. Verbo no passado sozinho ("fez o canal", "extraiu o dente", "restaurou o 26") NÃO
  prova que ESTA clínica concluiu o procedimento hoje — vira "indicado" por padrão, mesmo narrado no
  passado. Só use "realizado" quando o texto afirma conclusão de forma explícita e inequívoca:
  data de realização, ou palavras como "concluído"/"finalizado"/"realizado em [data]". Menção vaga
  ("fez tratamento há uns anos", "já tratou esse dente antes") fica "indicado" — o dentista confirma
  na tela antes de qualquer coisa virar prontuário definitivo. Perder um "indicado" que devia ser
  "realizado" o dentista corrige com 1 clique; um "realizado" fantasma pode passar despercebido.` : ''}
- ⛔ NEGAÇÃO NO EVENTO (erro comum — leia com atenção): se o dentista NEGOU ter feito um procedimento, NÃO emita evento "realizado" pra ele, mesmo que o nome do procedimento apareça no relato. Exemplo obrigatório: "não fiz o canal, só o curativo no 46" → o evento do 46 é NO MÁXIMO {tipo:endodontia, status:"indicado"} (ou nenhum) — JAMAIS {tipo:endodontia, status:"realizado"}. O curativo não vira evento de odontograma (não há tipo pra ele). Regra geral: um tipo de evento só recebe status:"realizado" se AQUELE procedimento foi de fato executado; procedimento citado-e-negado nunca é realizado.
- nivel decide os campos da âncora:
  · "face": preencha dente (FDI) e faces (array de "O"/"M"/"D"/"V"/"L"). Use para cárie/restauração/selante.
  · "dente": preencha dente, deixe faces []. Use para endodontia/exodontia/coroa/ponte/implante/lesao_periapical/inclusao/fratura/pino_nucleo/esfoliacao.
  · "arcada": preencha arcada. · "quadrante": preencha quadrante (1=sup dir, 2=sup esq, 3=inf esq, 4=inf dir).
  · "boca": procedimento de boca toda (profilaxia/clareamento/fluor) — deixe arcada/quadrante/dente null e faces [].
- PONTE (prótese fixa): emita UM evento tipo "ponte" PARA CADA dente do vão — pilares E pônticos — todos com a MESMA tag curta em grupo_id (ex: "g1") e papel_no_grupo "pilar" (dente de apoio) ou "pontico" (dente ausente que a ponte substitui). Ex: "ponte de 24 a 26" → 3 eventos: {dente:24, papel_no_grupo:"pilar"}, {dente:25, papel_no_grupo:"pontico"}, {dente:26, papel_no_grupo:"pilar"}. Coroa avulsa NUNCA vira ponte — sem menção a ponte/pôntico/pilar ou a um VÃO, use "coroa". papel_no_grupo: null em qualquer tipo que não seja ponte.
- MOD e multi-face: uma restauração que cobre várias faces é UM evento com faces:["M","O","D"], NUNCA vários eventos de 1 face.
- observacao do evento: material/detalhe curto (ex: "resina", "amálgama", "coroa de zircônia", "faceta/lente de contato", "fratura coronária", "pulpotomia"). "" se nada a acrescentar.
- NÃO invente evento sem base no relato — dente/face/procedimento não citado não vira evento. Se nenhum registro dentário: odontograma_eventos: [].

orto_manutencao (SÓ manutenção de aparelho ortodôntico):
Se o relato for APENAS manutenção de aparelho (troca de arco, ativação, borrachinhas/ligaduras, elásticos), preencha orto_manutencao e deixe "odontograma_eventos": []. Caso contrário orto_manutencao: null.
- arcada: "superior"/"inferior"/"ambas". fio: bitola/tipo do arco (ex: "0.018 NiTi"). ativacao: descrição da ativação (inclui troca de ligadura). elastico_corrente: cadeia elastomérica na MESMA arcada (ex: "corrente de 13 a 23"). elastico_intermaxilar: elástico ENTRE arcadas (ex: "3/16 Classe II").
- ⛔⛔ ARCADA É OBRIGATÓRIA E NUNCA UM PALPITE — leia com atenção, é o erro mais comum aqui: "ambas" SÓ quando o relato NOMEIA as duas arcadas (ex: "superior… inferior…", "arco de cima e o de baixo", "as duas"). Relato genérico de manutenção SEM nomear nenhuma arcada — mesmo mencionando ativação, troca de ligadura, elástico — NÃO é "ambas": é arcada não dita, e a resposta é "orto_manutencao": null. "Ambas" NÃO é o valor seguro pra quando você não sabe — é o valor pra quando o dentista falou as DUAS explicitamente. Errado: "troquei as ligaduras" → arcada:"ambas" (chute — ligadura sozinha não diz arcada nenhuma). Certo: "troquei as ligaduras" (sem mais nada) → orto_manutencao: null. Certo: "troquei as ligaduras dos dois lados, de cima e de baixo" → arcada:"ambas".
- DUAS ARCADAS (só depois de confirmar que arcada:"ambas" é legítima pela regra acima): os campos base (fio, ativacao, elastico_corrente, elastico_intermaxilar) descrevem a arcada SUPERIOR, e os campos fio_inferior, ativacao_inferior, elastico_corrente_inferior, elastico_intermaxilar_inferior descrevem a INFERIOR. Preencha os DOIS conjuntos só se o relato disse o que foi feito em CADA arcada separadamente — ex: "superior 0.018 de aço, inferior 0.016 NiTi" → fio:"0.018 aço" E fio_inferior:"0.016 NiTi". NUNCA copie o mesmo valor pros dois conjuntos — se você está prestes a repetir a mesma string em ativacao e ativacao_inferior, isso é sinal de que a arcada não foi dita duas vezes de verdade; reconsidere se não é o caso de "arcada não dita" acima. Em arcada única, deixe os campos _inferior null.`;

    const result = await generateStructuredGemini<EvolucaoWire>({
      prompt,
      responseSchema: EVOLUCAO_SCHEMA,
      feature: 'formatar-evolucao',
    });

    const wire = result.data;

    const dentesAfetados = (wire.dentes_afetados ?? [])
      .map((d) => Number(d))
      .filter((d) => !isNaN(d) && (isValidFDI(d) || isArch(d))); // aceita dentes FDI e sentinelas de arcada (97/98/99)

    // Pares → Record (contrato do cliente). Duplicatas do mesmo dente concatenam com \n.
    const dentesObservacoes: Record<string, string> = {};
    const pares = Array.isArray(wire.dentes_observacoes) ? wire.dentes_observacoes : [];
    for (const par of pares) {
      if (!par || par.dente == null) continue;
      const dente = Number(par.dente);
      if (isNaN(dente)) continue;
      const key = String(dente);
      const texto = (par.observacao ?? '').trim();
      if (!texto) continue;
      dentesObservacoes[key] = dentesObservacoes[key] ? `${dentesObservacoes[key]}\n${texto}` : texto;
    }

    // Rede de segurança: nenhum dente detectado pode ficar sem observação (senão some do
    // orçamento/progresso, que derivam de dentes_observacoes). O prompt já exige isso;
    // aqui é o fallback caso o modelo escorregue. Rótulo genérico — o dentista revisa/edita
    // na tela "Confirmar evolução" antes de salvar.
    for (const dente of dentesAfetados) {
      const key = String(dente);
      if (!dentesObservacoes[key]?.trim()) {
        dentesObservacoes[key] = 'Procedimento a confirmar';
      }
    }

    const parsed: EvolucaoFormatada = {
      queixa_principal:   typeof wire.queixa_principal === 'string' ? wire.queixa_principal : '',
      anotacoes:          typeof wire.anotacoes === 'string' ? wire.anotacoes : '',
      dentes_afetados:    dentesAfetados,
      dentes_observacoes: dentesObservacoes,
      procedimentos: Array.isArray(wire.procedimentos)
        ? (wire.procedimentos as unknown[]).filter((p): p is string => typeof p === 'string')
        : [],
      conduta:            typeof wire.conduta === 'string' ? wire.conduta : '',
      alerta_novo:        typeof wire.alerta_novo === 'string' ? wire.alerta_novo : null,
      odontograma_eventos: parseEventos(wire.odontograma_eventos, modo),
      orto_manutencao:     parseOrto(wire.orto_manutencao),
    };

    logAICall({
      feature:    'formatar-evolucao',
      provider:   result.provider,
      model:      result.model,
      latencyMs:  result.latencyMs,
      success:    true,
      dentistaId: dentista.id,
      clinicaId:  dentista.clinica_id,
    });

    return NextResponse.json(parsed satisfies EvolucaoFormatada);
  } catch (err) {
    console.error('[dex/formatar-evolucao] Erro:', err);
    const msg = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
