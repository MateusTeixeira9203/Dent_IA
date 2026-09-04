// Eval de extração clínica (pass 1). Bate no endpoint HTTP REAL (/api/dex/formatar-evolucao)
// com a sessão logada salva — testa a extração de verdade, sem duplicar o prompt nem tocar na rota.
//
//   1) dev server no ar (preview_start "dev" ou npm run dev) em localhost:3000
//   2) sessão salva válida em AUTH (a mesma do audit; se expirar, refazer o login headed 1x)
//   3) NODE_PATH="<repo>/node_modules" node evals/extracao-clinica/run.cjs
//
// Rode ANTES de mexer no enum do Gemini (baseline) e DEPOIS (R-06/R-07) e compare os números.
// 'atual' = deve passar e não regredir. 'novo' = esperado 0 hoje (enum barra) -> alvo do R-06/R-07.
let request;
try {
  ({ request } = require('playwright'));
} catch {
  console.log('SEM_PLAYWRIGHT — instale/restaure a dependência de desenvolvimento Playwright antes de rodar o eval HTTP.');
  process.exit(2);
}
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
// Sessão e saída são locais e configuráveis. Nunca apontar para uma pasta temporária de uma
// sessão anterior: ela some e faz o eval parecer quebrado em toda retomada de trabalho.
const AUTH = process.env.EVAL_AUTH_FILE || path.join(__dirname, 'audit-auth.json');
const OUT = process.env.EVAL_OUT_DIR || path.join(__dirname, 'results');
const GOLDEN = path.join(__dirname, 'golden.json');
const PACE_MS = 3000;       // espaçamento entre chamadas (rate limit da rota = 20/60s)
const WARM_UP = process.env.EVAL_WARM_UP === '1';
const CASE_LIMIT = Number.parseInt(process.env.EVAL_CASE_LIMIT || '', 10);
// R-50 (05/08) — os 4 `_inferior` entram aqui, senão `camposPreenchidos` não consegue exigir
// `fio_inferior` e o caso `orto-ambas-arcadas` passaria sem provar nada.
const ORTO_CAMPOS = [
  'fio', 'ativacao', 'elastico_corrente', 'elastico_intermaxilar',
  'fio_inferior', 'ativacao_inferior', 'elastico_corrente_inferior', 'elastico_intermaxilar_inferior',
];

const faceSet = (a) => (Array.isArray(a) ? a.slice().sort().join(',') : '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseServerTiming(value) {
  const values = {};
  for (const metric of (value || '').split(',')) {
    const [name, ...params] = metric.trim().split(';');
    const duration = params.find((param) => param.startsWith('dur='));
    const number = Number(duration?.slice(4));
    if (name && Number.isFinite(number)) values[name] = number;
  }
  return {
    preAiMs: values['pre-ai'] ?? null,
    aiMs: values.ai ?? null,
    postAiMs: values['post-ai'] ?? null,
  };
}

function percentile(values, percentileValue) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return Math.round(sorted[index] * 10) / 10;
}

function resumirLatencia(resultados) {
  const samples = resultados.map((resultado) => resultado.latencia).filter(Boolean);
  const summary = (field) => {
    const values = samples.map((sample) => sample[field]).filter((value) => typeof value === 'number');
    return { p50: percentile(values, 50), p95: percentile(values, 95) };
  };
  return {
    amostras: samples.length,
    totalMs: summary('totalMs'),
    preAiMs: summary('preAiMs'),
    aiMs: summary('aiMs'),
    postAiMs: summary('postAiMs'),
  };
}

/** Um evento produzido casa com um spec do golden? Só confere os campos presentes no spec (match parcial). */
function casa(ev, spec) {
  if (!ev) return false;
  const anc = ev.ancora || {};
  if (spec.tipo != null && ev.tipo !== spec.tipo) return false;
  if (spec.status != null && ev.status !== spec.status) return false;
  if (spec.evidencia_status != null && ev.evidencia_status !== spec.evidencia_status) return false;
  if (spec.dente != null && anc.dente !== spec.dente) return false;
  if (spec.nivel != null && anc.nivel !== spec.nivel) return false;
  if (spec.faces != null && faceSet(anc.faces) !== faceSet(spec.faces)) return false;
  return true;
}

function avaliar(caso, resp) {
  const eventos = Array.isArray(resp?.odontograma_eventos) ? resp.odontograma_eventos : [];
  const esp = caso.esperado || {};
  const r = {
    id: caso.id, cat: caso.cat, esperados: 0, casados: 0, faltando: [], proibidosHit: [], extras: 0, ortoOk: null, ok: false,
    realizadoEsperados: 0, realizadoCasados: 0, realizadoEmitidos: eventos.filter((ev) => ev.status === 'realizado').length,
    indicadoEsperados: 0, indicadoCasados: 0, ambiguoEsperado: 0, ambiguoCasado: 0,
  };

  // eventos esperados
  const specs = Array.isArray(esp.eventos) ? esp.eventos : null;
  if (specs) {
    r.esperados = specs.length;
    const usados = new Set();
    for (const spec of specs) {
      const idx = eventos.findIndex((ev, i) => !usados.has(i) && casa(ev, spec));
      if (spec.status === 'realizado') r.realizadoEsperados++;
      if (spec.status === 'indicado') r.indicadoEsperados++;
      if (spec.evidencia_status === 'ambiguo') r.ambiguoEsperado++;
      if (idx >= 0) {
        usados.add(idx); r.casados++;
        if (spec.status === 'realizado') r.realizadoCasados++;
        if (spec.status === 'indicado') r.indicadoCasados++;
        if (spec.evidencia_status === 'ambiguo') r.ambiguoCasado++;
      } else { r.faltando.push(spec); }
    }
    // extras = eventos produzidos que não casaram com nenhum spec (só conta quando há expectativa explícita)
    r.extras = eventos.length - usados.size;
  }

  // proibidos (ex: realizado sob negação) — qualquer hit é falha dura
  for (const p of (esp.proibido || [])) {
    if (eventos.some((ev) => casa(ev, p))) r.proibidosHit.push(p);
  }

  // orto
  if (esp.orto !== undefined) {
    const o = resp?.orto_manutencao || null;
    if (esp.orto === null) {
      r.ortoOk = o === null;
    } else if (o) {
      const preenchidos = ORTO_CAMPOS.filter((k) => o[k] != null);
      const arcadaOk = o.arcada === esp.orto.arcada;
      const camposOk = (esp.orto.camposPreenchidos || []).every((k) => preenchidos.includes(k));
      // R-50 — `camposDistintos` exige que os campos citados tenham valores DIFERENTES entre si.
      // Sem isso, "ambas" passaria com a IA repetindo o mesmo fio nas 2 arcadas (ou juntando as
      // duas numa string só), que é exatamente o modo de falha que o caso testa.
      const distintos = esp.orto.camposDistintos || [];
      const vals = distintos.map((k) => (o[k] == null ? null : String(o[k]).trim().toLowerCase()));
      const distintosOk = distintos.length === 0
        || (vals.every((v) => v) && new Set(vals).size === vals.length);
      r.ortoOk = arcadaOk && camposOk && distintosOk;
    } else {
      r.ortoOk = false;
    }
  }

  // veredito do caso
  const eventosOk = specs ? r.casados === r.esperados : true;
  const proibidoOk = r.proibidosHit.length === 0;
  const ortoOk = r.ortoOk === null ? true : r.ortoOk;
  const semEventoOk = (specs && specs.length === 0) ? eventos.length === 0 : true;
  r.ok = eventosOk && proibidoOk && ortoOk && semEventoOk;
  return r;
}

(async () => {
  if (!fs.existsSync(AUTH)) {
    console.log(`SEM_SESSAO — salve uma sessão Playwright em ${AUTH} ou informe EVAL_AUTH_FILE.`);
    process.exit(2);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
  const casos = Number.isFinite(CASE_LIMIT) && CASE_LIMIT > 0
    ? golden.casos.slice(0, CASE_LIMIT)
    : golden.casos;
  const ctx = await request.newContext({ baseURL: BASE, storageState: AUTH });
  const resultados = [];

  if (WARM_UP && casos[0]) {
    console.log('AQUECENDO — esta chamada não entra nas métricas.');
    await ctx.post('/api/dex/formatar-evolucao', {
      data: { texto: casos[0].relato, modo: casos[0].modo || 'consulta' },
      timeout: 70000,
    });
    await sleep(PACE_MS);
  }

  for (const caso of casos) {
    let resp = null, tentativas = 0;
    let latencia = null;
    while (tentativas < 3) {
      tentativas++;
      const startedAt = Date.now();
      const res = await ctx.post('/api/dex/formatar-evolucao', {
        data: { texto: caso.relato, modo: caso.modo || 'consulta' },
        timeout: 70000,
      });
      const totalMs = Date.now() - startedAt;
      const st = res.status();
      if (st === 401) { console.log('SESSAO_EXPIRADA (401) — refazer login headed'); await ctx.dispose(); process.exit(3); }
      if (st === 429) { console.log(`  rate limit em ${caso.id}, esperando 60s...`); await sleep(60000); continue; }
      if (st !== 200) { console.log(`  ERRO ${st} em ${caso.id}`); break; }
      resp = await res.json();
      latencia = {
        totalMs,
        ...parseServerTiming(res.headers()['server-timing']),
        model: res.headers()['x-dex-model'] ?? null,
        promptVersion: res.headers()['x-dex-prompt-version'] ?? null,
        inputChars: caso.relato.length,
        promptChars: Number(res.headers()['x-dex-prompt-chars']) || null,
        outputItems: Array.isArray(resp?.odontograma_eventos) ? resp.odontograma_eventos.length : 0,
      };
      break;
    }
    const r = resp ? avaliar(caso, resp) : { id: caso.id, cat: caso.cat, ok: false, erro: true };
    if (latencia) r.latencia = { ...latencia, ok: r.ok };
    resultados.push(r);
    const mark = r.erro ? 'ERRO' : r.ok ? 'PASS' : 'FALHA';
    const det = r.erro ? '' : `(casou ${r.casados}/${r.esperados}${r.proibidosHit.length ? ` · PROIBIDO x${r.proibidosHit.length}` : ''}${r.extras ? ` · extras ${r.extras}` : ''}${r.ortoOk === false ? ' · orto FALHA' : ''})`;
    console.log(`${mark.padEnd(5)} [${r.cat.padEnd(5)}] ${r.id.padEnd(22)} ${det}`);
    await sleep(PACE_MS);
  }
  await ctx.dispose();

  const atual = resultados.filter((r) => r.cat === 'atual');
  const novo = resultados.filter((r) => r.cat === 'novo');
  const atualOk = atual.filter((r) => r.ok).length;
  const novoOk = novo.filter((r) => r.ok).length;
  const evEsperados = atual.reduce((s, r) => s + (r.esperados || 0), 0);
  const evCasados = atual.reduce((s, r) => s + (r.casados || 0), 0);
  const evExtras = atual.reduce((s, r) => s + (r.extras || 0), 0);
  const todos = resultados.filter((r) => !r.erro);
  const realizadosCorretos = todos.reduce((s, r) => s + r.realizadoCasados, 0);
  const realizadosEmitidos = todos.reduce((s, r) => s + r.realizadoEmitidos, 0);
  const esperadosIndicados = todos.reduce((s, r) => s + r.indicadoEsperados, 0);
  const indicadosCorretos = todos.reduce((s, r) => s + r.indicadoCasados, 0);
  const negacaoViolations = todos.reduce((s, r) => s + r.proibidosHit.length, 0);
  const ambiguosEsperados = todos.reduce((s, r) => s + r.ambiguoEsperado, 0);
  const ambiguosCorretos = todos.reduce((s, r) => s + r.ambiguoCasado, 0);
  const statusMetrics = {
    realizadoPrecision: realizadosEmitidos === 0 ? null : realizadosCorretos / realizadosEmitidos,
    realizadoFalsePositives: Math.max(0, realizadosEmitidos - realizadosCorretos),
    indicadoRecall: esperadosIndicados === 0 ? null : indicadosCorretos / esperadosIndicados,
    negacaoViolations,
    ambiguousReviewRecall: ambiguosEsperados === 0 ? null : ambiguosCorretos / ambiguosEsperados,
  };
  const latencia = resumirLatencia(resultados);

  console.log('\n============================================');
  console.log(`ATUAL (não pode regredir): ${atualOk}/${atual.length} casos OK`);
  console.log(`  eventos: ${evCasados}/${evEsperados} casados · ${evExtras} inventados (falso-positivo)`);
  console.log(`NOVO (alvo R-06/R-07, esperado 0 hoje): ${novoOk}/${novo.length} presentes`);
  console.log(`R-106: negação ${statusMetrics.negacaoViolations} violações · ambíguos ${ambiguosCorretos}/${ambiguosEsperados} com revisão`);
  console.log(`LATÊNCIA: n=${latencia.amostras} · total p50/p95 ${latencia.totalMs.p50}/${latencia.totalMs.p95} ms · pre-AI ${latencia.preAiMs.p50}/${latencia.preAiMs.p95} ms`);
  console.log('============================================');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = `${OUT}/eval-extracao-${stamp}.json`;
  fs.writeFileSync(outFile, JSON.stringify({ stamp, resumo: { atualOk, atualTotal: atual.length, evCasados, evEsperados, evExtras, novoOk, novoTotal: novo.length, statusMetrics, latencia }, resultados }, null, 2));
  console.log(`\nresultado completo: ${outFile}`);
  process.exit(0);
})().catch((e) => { console.error('FALHOU', e); process.exit(1); });
