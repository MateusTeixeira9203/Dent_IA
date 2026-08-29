# R-134 — Apresentação comercial interativa

**Fase:** contrato aprovado pelo briefing do usuário · **Status:** 🔵 ativo · **Data:** 26/08/2026

## 1. Intenção e limite

Entregar uma apresentação presencial de 8–10 minutos que conduza o dentista de problema → fluxo
→ inteligência → paciente → gestão → produto real → evolução → convite. A saída é estática,
offline e isolada em `public/apresentacao/`; não altera rota, API, auth, banco ou UI do produto.

## 2. Contrato da entrega

- HTML/CSS/JavaScript sem CDN, API ou serviço externo.
- Abre por arquivo local e em `/apresentacao/index.html` quando o app estiver servido.
- Navegação por `←`, `→`, `Espaço`, botões e zonas amplas de clique.
- 9 cenas: abertura, problema, fluxo, Campo Mágico, paciente/odontograma, clínico→financeiro,
  produto real, evolução e Clínicas Fundadoras.
- Cenas podem ter beats internos; avançar rápido nunca enfileira animações.
- Voltar restaura o último estado estável da cena.
- Funciona em 1366×768 e 1920×1080; telas menores recebem layout compacto.
- `prefers-reduced-motion` remove movimento sem esconder informação.

## 3. Dados e verdade do produto

- Paciente fictícia única: **Mariana Costa**, dor/sensibilidade no dente 36.
- Campo Mágico organiza o relato em queixa, avaliação e conduta revisável; não diagnostica.
- Dex é a marca canônica portada de `src/components/dex/dex-mark.tsx`.
- Odontograma usa a geometria canônica de `src/components/odontograma/tooth-geometry.ts`.
- Perfil do paciente respeita as áreas atuais: **Ficha, Orçamentos, Agenda e Arquivos**; não cria
  uma aba “Tratamento”.
- O repositório não contém screenshots reais. A cena “produto real” usa placeholder explícito e
  substituível, sem fingir ser captura do produto.

## 4. Arquivos

```text
public/apresentacao/index.html          cenas e estrutura acessível
public/apresentacao/presentation.css   tokens, layout e estados visuais
public/apresentacao/config.js          preços, apresentador, clínica e URL da demo
public/apresentacao/presentation.js    navegação, beats, fluxo e odontograma
public/assets/presentation/            fontes locais, screenshots e instruções de troca
```

## 5. Configuração pública

`window.ODONTO_IA_PRESENTATION_CONFIG` expõe:

```js
{
  presenterName: string,
  testClinic: string,
  demoUrl: string,
  screenshotUrl: string,
  plans: { solo: { price: string }, clinic: { price: string } }
}
```

`demoUrl` vazio mantém o botão como transição narrativa; URL segura abre em nova aba.
`screenshotUrl` vazio preserva o placeholder sem fazer requisição.

## 6. Movimento

- Cena: 540ms, `opacity + translateY(12px) + blur(4px)`; saída menor.
- Beat: 280–360ms; linha do fluxo e transformação clínica usam apenas `transform`, `opacity` e
  `stroke-dashoffset`.
- Sem bounce, parallax, zoom de tela ou loop decorativo.
- A entrada por voz tem progressão finita, reiniciável ao entrar na cena.

## 7. Aceite

- [x] Todas as cenas e beats avançam/voltam por teclado e clique.
- [x] Não há fetch, CDN, fonte remota ou dependência de runtime.
- [x] Preços e demo são alterados apenas em `config.js`.
- [x] A cena do Campo Mágico termina com os três campos estruturados e aviso de revisão.
- [x] O dente 36 conecta visualmente ao contexto de Mariana Costa.
- [x] O financeiro deriva do orçamento clínico.
- [x] A cena de produto real identifica qualquer ausência de screenshot como placeholder.
- [x] Layout verificado em 1366×768, 1920×1080 e `prefers-reduced-motion`.
