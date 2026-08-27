# R-116 — PWA instalável

> **SPEC** · **R-116** · 🔵 ativo
> **Aberto:** 2026-08-20 · **Fechado:** — · **Fase:** execução (aprovada em 2026-08-20)
> **Migration:** zero · **Dependência:** domínio HTTPS em produção

## 1. Problema

O Odonto.IA funciona no navegador do celular, mas não declara identidade de aplicativo. No
iPhone, “Adicionar à Tela de Início” pode usar um ícone genérico; no Android não existe promoção
de instalação controlada pelo produto. O dentista precisa abrir o sistema como aplicativo sem
procurar a URL diariamente.

## 2. Decisão

Entregar uma PWA **instalável e online-first**:

- manifest canônico, ícones PNG e metadados iOS;
- abertura em modo `standalone`, iniciando em `/dashboard`;
- introdução visual curta depois do splash nativo, exclusiva ao aplicativo instalado;
- CTA de instalação no espaço já reservado na landing;
- Chrome/Edge usam `beforeinstallprompt`; iPhone mostra instrução curta para Safari;
- nenhum service worker com cache de dados nesta fase.

O corte sem cache é deliberado. Prontuários, agenda e financeiro não podem abrir numa versão
antiga ou aparentar estar atualizados quando não há rede. Instalar não será apresentado como
“funciona offline”. Os critérios atuais do Chromium exigem HTTPS, manifest e ícones 192/512 para
o prompt; service worker não é requisito atual. O iOS usa `apple-touch-icon` PNG e modo standalone.

A tela nativa de abertura do sistema operacional não pode ser animada por uma PWA. A introdução
começa logo depois: o símbolo central desloca 52 px à esquerda e revela “Odonto.IA”. Ela não
espera dados nem roda em navegação interna.

Referências: [Chrome/web.dev — critérios de instalação](https://web.dev/articles/install-criteria),
[web.dev — manifest](https://web.dev/articles/add-manifest),
[Apple — configuração de web apps](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html).

## 3. Objetivo

Ao tocar em “Instalar o Odonto.IA”:

- Android/desktop compatível abre o prompt nativo;
- iPhone exibe “Safari → Compartilhar → Adicionar à Tela de Início”;
- aplicativo instalado abre sem barra do navegador e com ícone Odonto.IA;
- usuário não autenticado segue pelo login e retorna ao dashboard normalmente.

## 4. Contrato técnico

### Manifest — `src/app/manifest.ts`

```ts
export default function manifest(): MetadataRoute.Manifest
```

Campos fixos:

```ts
{
  id: '/',
  name: 'Odonto.IA',
  short_name: 'Odonto.IA',
  description: 'Prontuário odontológico estruturado por voz.',
  start_url: '/dashboard',
  scope: '/',
  display: 'standalone',
  orientation: 'any',
  background_color: '#0d0d0d',
  theme_color: '#0d0d0d',
  lang: 'pt-BR',
  icons: [
    { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
```

### Ícones

- `public/icons/pwa-192.png`;
- `public/icons/pwa-512.png`;
- `public/icons/pwa-maskable-512.png` com conteúdo dentro da safe area central;
- `public/apple-touch-icon.png`, 180×180, fundo sólido `#0d0d0d` e símbolo teal centralizado;
- nenhuma transparência no `apple-touch-icon`.

### Metadados raiz

`src/app/layout.tsx` referencia `/manifest.webmanifest`, o apple touch icon e declara
`appleWebApp.capable = true`, título `Odonto.IA` e status bar `black-translucent`.

### Introdução — `PwaLaunchIntro`

`src/components/pwa/pwa-launch-intro.tsx` é um Client Component montado uma única vez no
`RootLayout`. A sobreposição renderiza no HTML inicial, mas CSS a exibe somente com
`display-mode: standalone`; a detecção em JavaScript também cobre `navigator.standalone` no iOS.

- `OdontoIALogo` existente começa centralizado; após 180 ms move apenas `transform: translateX(-52px)`;
- wordmark `Odonto.IA` entra com opacidade, deslocamento de 12 px e blur de 2 px → 0;
- composição: 820 ms; saída do overlay: 180 ms; janela total aproximada: 1 s; curva
  `cubic-bezier(.22, 1, .36, 1)` e sem bounce;
- `prefers-reduced-motion` exibe o estado final e remove a sobreposição sem animação;
- nenhum timer depende de fetch, autenticação ou dados clínicos.

### UI — `InstallPwaCard`

```ts
type InstallState =
  | 'checking'
  | 'available'
  | 'ios-instructions'
  | 'installed'
  | 'manual-instructions';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
```

O componente substitui somente o conteúdo de `.pwa-slot` na landing. Não cria modal global,
banner no dashboard nem dependência nova.

## 5. Comportamento

### Estados

- `checking`: card estático “Aplicativo instalável”, sem flicker;
- `available`: CTA “Instalar o Odonto.IA” chama o prompt nativo uma vez;
- `ios-instructions`: CTA “Ver como instalar” abre instrução de três passos para Safari;
- `installed`: “Odonto.IA já está instalado”; CTA desaparece;
- `manual-instructions`: explica usar o menu do navegador quando o prompt não estiver disponível.

### Caminho principal

1. Detectar `display-mode: standalone` e `navigator.standalone`.
2. Se instalado, renderizar `installed`.
3. Se iOS, renderizar instrução específica; não fingir existir prompt automático.
4. Nos navegadores compatíveis, guardar `beforeinstallprompt`, cancelar a mini-infobar e habilitar
   o CTA.
5. Após `appinstalled`, limpar o evento e renderizar `installed`.
6. Se o usuário dispensar o prompt, manter orientação manual; não insistir com popup.
7. Ao abrir o PWA instalado, exibir a introdução uma vez no carregamento inicial; em seguida,
   revelar a rota atual, mesmo que seus dados ainda estejam carregando.

## 6. Referência visual

Não há tela nova. O componente ocupa o slot PWA aprovado do R-121 na landing:

- mesma geometria `.bloco > .marcador + .conteudo`;
- card charcoal, borda teal discreta, raio 18 px;
- CTA usa `.btn .btn-p`; instruções usam texto secundário e ícone linear;
- nenhuma métrica comercial dentro do card;
- mobile empilha conteúdo e CTA, alvo de toque mínimo 44 px.

### Abertura standalone

- **Artefato aprovado:** `plans/artefatos/R-116-pwa-abertura.html`.
- Fundo: `--color-brand-charcoal` (`#0d0d0d`); símbolo: `--color-teal` (`#2f9c85`);
  wordmark: `--color-text-primary` (`#fafafa` no escuro).
- Tipografia: `DM Serif Display` para “Odonto.IA”; não introduz fonte, cor ou logo novo.
- Sem card, loader giratório, gradiente, pulso, escala, giro ou loop.

## 7. Invariantes

- [ ] **I1** — instalar nunca grava nem altera paciente, prontuário, agenda ou financeiro.
- [ ] **I2** — nenhum dado clínico é cacheado para uso offline.
- [ ] **I3** — a interface nunca promete funcionamento offline.
- [ ] **I4** — ícone do iPhone é PNG 180×180, opaco e explicitamente referenciado.
- [ ] **I5** — CTA nunca aparece como instalável quando o app já está standalone.
- [ ] **I6** — dispensa do prompt não gera repetição automática ou bloqueio da landing.
- [ ] **I7** — zero dependência npm e zero mudança de banco, auth ou RLS.
- [ ] **I8** — a abertura não bloqueia por mais de 1 s e nunca depende da chegada de dados.
- [ ] **I9** — navegador comum não renderiza nem reserva espaço para a introdução do PWA.

## 8. Gates de aceite

- [ ] **G1** — `/manifest.webmanifest` responde 200 e contém nome, start URL, display e três ícones.
- [ ] **G2** — os quatro PNGs abrem e têm exatamente 192, 512, 512 e 180 px.
- [ ] **G3** — Lighthouse/Application não acusa erro de manifest ou ícone em produção HTTPS.
- [ ] **G4** — Chrome Android oferece instalação e abre em standalone em `/dashboard`.
- [ ] **G5** — Safari iPhone mostra instrução correta; após adicionar, usa o ícone Odonto.IA e
  abre sem a barra do Safari.
- [ ] **G6** — app já instalado mostra estado concluído, sem CTA duplicado.
- [ ] **G7** — prompt dispensado mantém a landing utilizável e não reaparece sozinho.
- [ ] **G8** — 375, 768 e 1440 px sem overflow; dark/light não se aplica à landing de tema fixo.
- [ ] **G9** — TypeScript, lint, build e teste dos assets passam.
- [ ] **G10** — desligar a rede mostra o erro normal de conectividade; nenhum dado antigo é
  apresentado como atual.
- [ ] **G11** — PWA Android e Safari/iPhone instalado exibem símbolo → wordmark uma vez ao abrir;
  abrir telas internas não repete a animação.
- [ ] **G12** — com `prefers-reduced-motion`, a rota fica disponível sem deslocamento, blur ou atraso.

## 9. Fora de escopo

- funcionamento offline, cache de rotas, sincronização em segundo plano e fila de writes;
- push notifications, App Store/Google Play e aplicativo React Native;
- badge, shortcuts, share target e atualizador customizado;
- prompt dentro do dashboard;
- mudança ampla no design da landing.

## 10. Resultado local — 20/08

- manifesto responde `200 application/manifest+json`, com `/dashboard`, `standalone` e 3 ícones;
- PNGs conferidos em 192×192, 512×512, 512×512 e 180×180, todos com alpha mínimo 255;
- dente oficial teal centralizado em fundo carvão; versão maskable usa área segura menor;
- card sem overflow em 375, 768 e 1440 px; estado manual conferido no navegador embutido;
- lint dos arquivos tocados, `npm run typecheck` e `npm run build` passaram;
- G3–G7 e G10 dependem do deploy HTTPS e de aparelhos reais; não foram simulados como aprovação.
