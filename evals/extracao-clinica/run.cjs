// Eval de extração clínica (pass 1). Bate no endpoint HTTP REAL (/api/dex/formatar-evolucao)
// com a sessão logada salva — testa a extração de verdade, sem duplicar o prompt nem tocar na rota.
//
//   1) dev server no ar (preview_start "dev" ou npm run dev) em localhost:3000
//   2) sessão salva válida em AUTH (a mesma do audit; se expirar, refazer o login headed 1x)
//   3) NODE_PATH="<repo>/node_modules" node evals/extracao-clinica/run.cjs
//
// Rode ANTES de mexer no enum do Gemini (baseline) e DEPOIS (R-06/R-07) e compare os números.
// 'atual' = deve passar e não regredir. 'novo' = esperado 0 hoje (enum barra) -> alvo do R-06/R-07.
const { request } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const AUTH = 'C:/Users/mateu/AppData/Local/Temp/claude/C--Users-mateu-Desktop-Odonto-IA-main/e3f4b577-fd87-4960-b2bd-87a3f63afd9f/scratchpad/audit-auth.json';
const OUT = 'C:/Users/mateu/AppData/Local/Temp/claude/C--Users-mateu-Desktop-Odonto-IA-main/e3f4b577-fd87-4960-b2bd-87a3f63afd9f/scratchpad';
const GOLDEN = path.join(__dirname, 'golden.json');
const PACE_MS = 3000;       // espaçamento entre chamadas (rate limit da rota = 20/60s)
// R-50 (05/08) — os 4 `_inferior` entram aqui, senão `camposPreenchidos` não consegue exigir
// `fio_inferior` e o caso `orto-ambas-arcadas` passaria sem provar nada.
const ORTO_CAMPOS = [
  'fio', 'ativacao', 'elastico_corrente', 'elastico_intermaxilar',
  'fio_inferior', 'ativacao_inferior', 'elastico_corrente_inferior', 'elastico_intermaxilar_inferior',
];

const faceSet = (a) => (Array.isArray(a) ? a.slice().sort().join(',') : '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Um evento produzido casa com um spec do golden? Só confere os campos presentes no spec (match parcial). */
function casa(ev, spec) {
  if (!ev) return false;
  const anc = ev.ancora || {};
  if (spec.tipo != null && ev.tipo !== spec.tipo) return false;
  if (spec.status != null && ev.status !== spec.status) return false;
  if (spec.dente != null && anc.dente !== spec.dente) return false;
  if (spec.nivel != null && anc.nivel !== spec.nivel) return false;
  if (spec.faces != null && faceSet(anc.faces) !== faceSet(spec.faces)) return false;
  return true;
}

function avaliar(caso, resp) {
  const eventos = Array.isArray(resp?.odontograma_eventos) ? resp.odontograma_eventos : [];
  const esp = caso.esperado || {};
  const r = { id: caso.id, cat: caso.cat, esperados: 0, casados: 0, faltando: [], proibidosHit: [], extras: 0, ortoOk: null, ok: false };

  // eventos esperados
  const specs = Array.isArray(esp.eventos) ? esp.eventos : null;
  if (specs) {
    r.esperados = specs.length;
    const usados = new Set();
    for (const spec of specs) {
      const idx = eventos.findIndex((ev, i) => !usados.has(i) && casa(ev, spec));
      if (idx >= 0) { usados.add(idx); r.casados++; } else { r.faltando.push(spec); }
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
  if (!fs.existsSync(AUTH)) { console.log('SEM_SESSAO — refazer login headed (capture-audit-3.cjs sem --headless)'); process.exit(2); }
  const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
  const casos = golden.casos;
  const ctx = await request.newContext({ baseURL: BASE, storageState: AUTH });
  const resultados = [];

  for (const caso of casos) {
    let resp = null, tentativas = 0;
    while (tentativas < 3) {
      tentativas++;
      const res = await ctx.post('/api/dex/formatar-evolucao', {
        data: { texto: caso.relato, modo: caso.modo || 'consulta' },
        timeout: 70000,
      });
      const st = res.status();
      if (st === 401) { console.log('SESSAO_EXPIRADA (401) — refazer login headed'); await ctx.dispose(); process.exit(3); }
      if (st === 429) { console.log(`  rate limit em ${caso.id}, esperando 60s...`); await sleep(60000); continue; }
      if (st !== 200) { console.log(`  ERRO ${st} em ${caso.id}`); break; }
      resp = await res.json();
      break;
    }
    const r = resp ? avaliar(caso, resp) : { id: caso.id, cat: caso.cat, ok: false, erro: true };
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

  console.log('\n============================================');
  console.log(`ATUAL (não pode regredir): ${atualOk}/${atual.length} casos OK`);
  console.log(`  eventos: ${evCasados}/${evEsperados} casados · ${evExtras} inventados (falso-positivo)`);
  console.log(`NOVO (alvo R-06/R-07, esperado 0 hoje): ${novoOk}/${novo.length} presentes`);
  console.log('============================================');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = `${OUT}/eval-extracao-${stamp}.json`;
  fs.writeFileSync(outFile, JSON.stringify({ stamp, resumo: { atualOk, atualTotal: atual.length, evCasados, evEsperados, evExtras, novoOk, novoTotal: novo.length }, resultados }, null, 2));
  console.log(`\nresultado completo: ${outFile}`);
  process.exit(0);
})().catch((e) => { console.error('FALHOU', e); process.exit(1); });
