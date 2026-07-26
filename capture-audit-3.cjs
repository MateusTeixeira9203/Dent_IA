// Audit visual — 3ª passada: ESTADOS INTERATIVOS (modais, janelas, odontograma expandido).
// "aperte todos os botoes, abra todas as janelas" — mas PROD = SÓ LEITURA: abre a janela,
// captura o design, e NUNCA submete/cria/apaga. Botão destrutivo: abre o modal de confirmação
// e CANCELA (o modal é o que se audita).
//
// Login 1x (headed). Persiste a sessão em scratchpad → re-rodadas são headless, sem novo login:
//   node capture-audit-3.cjs            → 1ª vez: janela abre, VOCÊ loga; sessão é salva
//   node capture-audit-3.cjs --headless → reusa a sessão salva, sem login (pra iterar)
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = 'plans/auditorias/screens';
const BASE = 'http://localhost:3000';
const AUTH = 'C:/Users/mateu/AppData/Local/Temp/claude/C--Users-mateu-Desktop-Odonto-IA-main/15b2e79b-9e57-419a-aa28-cd1730c02089/scratchpad/audit-auth.json';
const REUSE = process.argv.includes('--headless') && fs.existsSync(AUTH);

const W = 1280, H = 900;

// Cada "janela" = um estado que só existe depois de um clique. open(page) faz os cliques.
// themes: quais temas capturar. Odontograma e modais grandes → os dois (dark-contrast importa).
const FICHA = '/dashboard/pacientes/demo';
const SPECS = [
  // ── FICHA: odontograma + símbolos de procedimento (o foco do audit) ──
  { name: 'ficha-evolucao-expandida', url: FICHA, themes: ['light', 'dark'], open: async (p) => {
      await p.getByText('Dor ao mastigar', { exact: false }).first().click({ timeout: 5000 });
      await p.waitForTimeout(1200);
    } },
  { name: 'ficha-dente-aberto', url: FICHA, themes: ['light', 'dark'], open: async (p) => {
      await p.getByText('Dor ao mastigar', { exact: false }).first().click({ timeout: 5000 });
      await p.waitForTimeout(1000);
      // clica o dente no odontograma → ToothDetailPanel (R-20 lado-a-lado). Tenta alvos plausíveis.
      const alvos = ['[aria-label*="46"]', '[data-dente="46"]', 'text=D46', 'g[aria-label*="46"]'];
      for (const s of alvos) { try { const l = p.locator(s).first(); if (await l.count()) { await l.click({ timeout: 2500 }); break; } } catch (e) {} }
      await p.waitForTimeout(1200);
    } },
  { name: 'ficha-nova-evolucao', url: FICHA, themes: ['light', 'dark'], open: async (p) => {
      await p.getByRole('button', { name: /Nova Evolu/i }).first().click({ timeout: 5000 });
      await p.waitForTimeout(1600);
    } },
  // ── FICHA: modais (abre e captura; nunca submete) ──
  { name: 'ficha-modal-editar', url: FICHA, themes: ['light', 'dark'], open: async (p) => {
      await p.locator('[title="Editar paciente"]').first().click({ timeout: 5000 });
      await p.waitForTimeout(1000);
    } },
  { name: 'ficha-modal-emitir', url: FICHA, themes: ['light', 'dark'], open: async (p) => {
      await p.locator('[title*="Emitir documento"]').first().click({ timeout: 5000 });
      await p.waitForTimeout(1000);
    } },
  { name: 'ficha-modal-apresentar', url: FICHA, themes: ['light', 'dark'], open: async (p) => {
      await p.getByRole('button', { name: /Apresentar/i }).first().click({ timeout: 5000 });
      await p.waitForTimeout(1600);
    } },
  { name: 'ficha-modal-retorno', url: FICHA, themes: ['light', 'dark'], open: async (p) => {
      await p.getByRole('button', { name: /Marcar retorno/i }).first().click({ timeout: 5000 });
      await p.waitForTimeout(1000);
    } },
  { name: 'ficha-modal-orcamento', url: FICHA, themes: ['light', 'dark'], open: async (p) => {
      await p.getByText('Gerar orçamento', { exact: false }).first().click({ timeout: 5000 });
      await p.waitForTimeout(1400);
    } },
  { name: 'ficha-confirma-excluir', url: FICHA, themes: ['light'], open: async (p) => {
      // destrutivo: abre a confirmação (UI pura, sem mutação) — captura e NÃO confirma.
      await p.getByText('Dor ao mastigar', { exact: false }).first().click({ timeout: 5000 });
      await p.waitForTimeout(900);
      await p.locator('[title="Excluir"]').first().click({ timeout: 4000 });
      await p.waitForTimeout(900);
    } },
  // ── FICHA: abas ──
  { name: 'ficha-tab-orcamentos', url: FICHA, themes: ['light', 'dark'], open: async (p) => {
      await p.getByRole('tab', { name: /Orçamentos/i }).first().click({ timeout: 5000 }); await p.waitForTimeout(1200);
    } },
  { name: 'ficha-tab-arquivos', url: FICHA, themes: ['light', 'dark'], open: async (p) => {
      await p.getByRole('tab', { name: /Arquivos/i }).first().click({ timeout: 5000 }); await p.waitForTimeout(1200);
    } },
  { name: 'ficha-tab-agenda', url: FICHA, themes: ['light', 'dark'], open: async (p) => {
      await p.getByRole('tab', { name: /Agenda/i }).first().click({ timeout: 5000 }); await p.waitForTimeout(1200);
    } },
  // ── DASHBOARD: dock + modais ──
  { name: 'dash-novo-agendamento', url: '/dashboard', themes: ['light', 'dark'], open: async (p) => {
      await p.getByRole('button', { name: /Novo agendamento/i }).first().click({ timeout: 5000 }); await p.waitForTimeout(1400);
    } },
  { name: 'dash-notificacoes', url: '/dashboard', themes: ['light'], open: async (p) => {
      await p.locator('button:has(svg.lucide-bell), [aria-label*="Notific"]').first().click({ timeout: 4000 }); await p.waitForTimeout(1000);
    } },
  { name: 'dash-menu-perfil', url: '/dashboard', themes: ['light'], open: async (p) => {
      await p.getByRole('button', { name: /^T$/ }).first().click({ timeout: 4000 }); await p.waitForTimeout(1000);
    } },
  // ── AGENDAMENTOS: modal de novo ──
  { name: 'agenda-modal-novo', url: '/dashboard/agendamentos', themes: ['light', 'dark'], open: async (p) => {
      await p.getByRole('button', { name: /Novo|Agendar/i }).first().click({ timeout: 5000 }); await p.waitForTimeout(1400);
    } },
  // ── CONFIG: sub-rotas (navegação pura) ──
  { name: 'config-usuarios', url: '/dashboard/configuracoes/usuarios', themes: ['light', 'dark'], open: async () => {} },
  { name: 'config-whatsapp', url: '/dashboard/configuracoes/whatsapp', themes: ['light', 'dark'], open: async () => {} },
];

async function prep(page, url, theme) {
  await page.emulateMedia({ colorScheme: theme });
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => { try { localStorage.setItem('theme', t); } catch (e) {} }, theme);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2800);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: REUSE });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    ...(REUSE ? { storageState: AUTH } : {}),
  });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(90000);

  if (!REUSE) {
    await page.goto(BASE + '/login');
    console.log('\n=== LOGA COM E-MAIL + SENHA (nao o Google). Cai no /dashboard e a captura comeca. ===\n');
    await page.waitForURL('**/dashboard**', { timeout: 300000 });
    await ctx.storageState({ path: AUTH });
    console.log('>>> Logado e sessao salva. Capturando estados interativos...\n');
    await page.waitForTimeout(1500);
  } else {
    console.log('>>> Reusando sessao salva (headless).\n');
  }

  for (const spec of SPECS) {
    for (const theme of spec.themes) {
      try {
        await prep(page, spec.url, theme);
        await spec.open(page);
        await page.screenshot({ path: `${OUT}/${spec.name}-${theme}-desktop.png`, fullPage: true });
        console.log(`ok ${spec.name}-${theme}`);
      } catch (e) {
        console.log(`MISS ${spec.name}-${theme}: ${String(e).slice(0, 120)}`);
      }
    }
  }

  console.log('\n=== captura interativa terminada ===');
  await browser.close();
})().catch((e) => { console.error('FALHOU', e); process.exit(1); });
