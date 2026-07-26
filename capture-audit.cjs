// Audit visual — captura com login interativo. VOCÊ loga na janela que abre; o script captura sozinho.
// Rodar:  node capture-audit.cjs plans/auditorias/screens
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = process.argv[2] || 'plans/auditorias/screens';
const BASE = 'http://localhost:3000';

// Telas logadas (a ficha real entra separada, via 1º paciente da lista).
const SHELLS = [
  { name: 'dashboard',     url: '/dashboard',               mobile: true  },
  { name: 'pacientes',     url: '/dashboard/pacientes',     mobile: false },
  { name: 'agendamentos',  url: '/dashboard/agendamentos',  mobile: false },
  { name: 'financeiro',    url: '/dashboard/financeiro',    mobile: false },
  { name: 'orcamentos',    url: '/dashboard/orcamentos',    mobile: false },
  { name: 'configuracoes', url: '/dashboard/configuracoes', mobile: false },
  { name: 'perfil',        url: '/dashboard/perfil',        mobile: false },
  { name: 'consulta',      url: '/consulta/demo',           mobile: false }, // ref. Modo Consulta
];

async function shoot(page, name, wantMobile, settle = 2600) {
  const vps = [{ n: 'desktop', w: 1280, h: 900 }];
  if (wantMobile) vps.push({ n: 'mobile', w: 375, h: 812 });
  for (const vp of vps) {
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.emulateMedia({ colorScheme: theme });
      await page.evaluate((t) => { try { localStorage.setItem('theme', t); } catch (e) {} }, theme);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(settle);
      await page.screenshot({ path: `${OUT}/${name}-${theme}-${vp.n}.png`, fullPage: true });
      console.log(`ok ${name}-${theme}-${vp.n}`);
    }
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/login');
  console.log('\n============================================================');
  console.log('  >>> LOGA COM TUA CONTA na janela que abriu.');
  console.log('  >>> Assim que cair no /dashboard, a captura começa sozinha.');
  console.log('  >>> (até 5 min de espera)');
  console.log('============================================================\n');
  await page.waitForURL('**/dashboard**', { timeout: 300000 });
  console.log('\n>>> Logado! Capturando... (não mexa na janela)\n');
  await page.waitForTimeout(2000);

  // Ficha real — 1º paciente da lista
  try {
    await page.goto(BASE + '/dashboard/pacientes', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2800);
    const href = await page.evaluate(() => {
      const hrefs = [...document.querySelectorAll('a[href^="/dashboard/pacientes/"]')]
        .map((el) => el.getAttribute('href'));
      return hrefs.find((h) => h && !h.endsWith('/novo') && !h.endsWith('/demo') && h !== '/dashboard/pacientes') || null;
    });
    if (href) {
      await page.goto(BASE + href, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3500); // odontograma + ficha carregam client-side
      await shoot(page, 'ficha', true, 3500);
    } else {
      console.log('(nenhum paciente na lista — ficha real pulada)');
    }
  } catch (e) { console.log('ficha FAIL:', String(e).slice(0, 140)); }

  for (const s of SHELLS) {
    try {
      await page.goto(BASE + s.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2600);
      await shoot(page, s.name, s.mobile);
    } catch (e) { console.log(`${s.name} FAIL:`, String(e).slice(0, 140)); }
  }

  console.log('\n=== captura terminada — fechando o browser ===');
  await browser.close();
})().catch((e) => { console.error('FALHOU', e); process.exit(1); });
