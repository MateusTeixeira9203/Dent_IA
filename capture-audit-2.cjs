// Audit visual — 2ª passada: só o que faltou (ficha+odontograma via /pacientes/demo, e agendamentos).
// Login manual de novo (sessão não persiste). Timeouts altos: rota fria compila devagar.
// Rodar:  node capture-audit-2.cjs plans/auditorias/screens
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = process.argv[2] || 'plans/auditorias/screens';
const BASE = 'http://localhost:3000';

const TARGETS = [
  // A ficha enlatada: default tab = Prontuário → odontograma + símbolos de procedimento (o foco do audit).
  { name: 'ficha',        url: '/dashboard/pacientes/demo', mobile: true,  settle: 5000 },
  { name: 'agendamentos', url: '/dashboard/agendamentos',   mobile: false, settle: 3000 },
];

async function shoot(page, name, wantMobile, settle) {
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
  page.setDefaultNavigationTimeout(90000); // rota fria compila devagar (dashboard levou ~13s)
  await page.goto(BASE + '/login');
  console.log('\n============================================================');
  console.log('  >>> LOGA COM E-MAIL + SENHA (nao o botao do Google).');
  console.log('  >>> Assim que cair no /dashboard, a captura comeca sozinha.');
  console.log('  >>> (ate 5 min de espera)');
  console.log('============================================================\n');
  await page.waitForURL('**/dashboard**', { timeout: 300000 });
  console.log('\n>>> Logado! Capturando... (nao mexa na janela)\n');
  await page.waitForTimeout(2000);

  for (const t of TARGETS) {
    // Aquece a rota primeiro (compila) com tolerancia; depois o shoot() so recarrega.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await page.goto(BASE + t.url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(t.settle);
        await shoot(page, t.name, t.mobile, t.settle);
        break;
      } catch (e) {
        console.log(`${t.name} tentativa ${attempt} FAIL:`, String(e).slice(0, 140));
        if (attempt === 2) console.log(`${t.name} DESISTIU`);
      }
    }
  }

  console.log('\n=== captura terminada — fechando o browser ===');
  await browser.close();
})().catch((e) => { console.error('FALHOU', e); process.exit(1); });
