# Auditoria — símbolos do odontograma vs. normas (2026-07-27)

> Pedido do Mateus: "pesquise todos os símbolos de odontograma que usamos, acho que dá pra
> melhorar/polir". Inventário aterrado no código (`Odontograma.tsx`) e comparação com a
> **Norma Técnica del Odontograma** (Colégio Odontológico do Peru / MINSA — lida na íntegra,
> [PDF](https://ccdp.org.pe/wp-content/uploads/2024/03/Norma-Tecnica-del-Odontograma.pdf)),
> a única norma pública que **especifica o desenho** símbolo a símbolo. O manual CFO (BR)
> exige o odontograma mas não prescreve glifos (ver memória `prontuario-cfo-perio`).
> **Nada daqui foi aplicado** — polimento visual é território do R-22 (congelado); os achados
> abaixo viram itens quando o Mateus decidir.

## Contexto que muda a leitura

A norma foi escrita pra **ficha de papel** (2 cores de caneta, azul=bom estado/feito e
vermelho=mau estado/a fazer; siglas em "recuadros" porque papel não tem tooltip). Divergir
dela em software não é erro por si — mas onde a norma tem um desenho consagrado e nós temos
outro, o dentista formado nessa convenção estranha. Cada linha abaixo julga isso.

## Inventário (código) × norma × veredicto

| Condição | Norma (desenho prescrito) | Nosso (Odontograma.tsx) | Veredicto |
|---|---|---|---|
| **Cores** | 2: azul=feito/bom · vermelho=a fazer/mau/temporário | 3: coral=a fazer · teal=feito aqui · slate=pré-existente (+ variantes `-ink` AA) | ✅ Superset compatível (coral↔vermelho, teal↔azul). O slate é distinção que a norma nem tem (quem fez) — manter |
| Cárie | lesão desenhada na forma, pintada de VERMELHO na superfície | face pintada coral no mapa oclusal + tint na coroa | ✅ alinhado |
| Restauração | superfície pintada AZUL + sigla do material (AM/R/IV/IM/IE) no recuadro | face pintada teal; material em `observacao` (texto no card) | ✅ alinhado; sigla visual de material = possível ganho (P3) |
| Restauração **temporária** | contorno vermelho (só o contorno) | conceito não existe no modelo | ⚠ gap de modelo, não de símbolo — só entra se virar `tipo` (decisão de produto) |
| Coroa | **circunferência** azul envolvendo a coroa + sigla (CC/CMC/CV/CJ…) | contorno duplo + **hachura diagonal** (convenção DALE/Bird & Robinson) | ⚠ divergência consciente: hachura é convenção anglo válida; circunferência é o que o dentista BR/hispânico viu na faculdade. **P1 — decidir** |
| Endodontia | linha reta **vertical azul na raiz** + sigla TC/PC/PP | silhueta do canal (contorno=a tratar · preenchida=tratado) | ✅ nosso é mais rico e na mesma região anatômica |
| Dente ausente | **aspa (X) AZUL** sobre a figura | contorno tracejado ("vaga") | ⚠ divergência consciente: X azul em papel; tracejado é padrão de software (a "vaga" comunica espaço protético). **P2 — decidir** |
| Extração indicada | *(a norma nem registra plano no odontograma inicial — V.5)* | X coral sobre a coroa | ✅ nosso registra plano porque o produto vive disso; X vermelho ~ norma de consultório |
| Implante | siglas "IMP" azul no recuadro | **parafuso** desenhado (corpo + roscas + plataforma) | ✅ nosso é melhor (texto na norma é limitação do papel; parafuso = convenção Open Dental) |
| Fratura | **linha reta** vermelha **no sentido da fratura**, coroa e/ou raiz | zigue-zague fixo na coroa | ⚠ P2: norma quer direção clínica real; nosso zigzag é decorativo e só na coroa. Sem dado de direção no modelo, a reta diagonal simples já aproxima |
| Pino/núcleo | linha vertical na raiz + **quadrado** na coroa, azul | haste no canal + **triângulo** (núcleo) no colo | ✅ praticamente alinhado (triângulo↔quadrado, mesma gramática) |
| **Ponte** | linha horizontal na altura dos ápices + traços verticais nos pilares | idem — implementado hoje (R-06, `PonteMarks`) | ✅ alinhado por construção |
| Incluso/impactado | letra "I" azul no recuadro | contorno tracejado `4 3` | ✅ nosso é gráfico onde a norma usa texto; ok |
| Selante | *(sem símbolo próprio na norma)* | ponto na oclusal | ✅ ok |
| **Esfoliação** | *(sem símbolo na norma; convenção "EX" — [Cenident](https://cenident.com/blog/simbolos-del-odontogram a))* | tracejado + **seta de erupção** (R-06) | ✅ criação fundamentada; documentar na legenda |
| Lesão periapical | *(sem símbolo — achado radiográfico em especificações)* | círculo vazado no ápice | ✅ convenção radiográfica reconhecível |
| Aparelho orto fixo | quadrados com cruz nos extremos + linha reta unindo, nos ápices | não desenha (orto = card, `pinta:false`) | ⚠ P3: decisão de produto R-05 (orto é registro de arcada). Se um dia pintar, a norma dá o desenho pronto |
| Extruído/intruído/giroversão/migração/mobilidade | setas azuis / M+grau | não existem como tipo | fora de escopo (mobilidade → R-08 periograma) |

## Rodada 2 (27/07, mesma sessão) — APLICADO: geometria do artefato + anatomia

Depois deste inventário o Mateus pediu duas coisas, nesta ordem: (a) portar os símbolos
fielmente do artefato canônico; (b) elevar o desenho pra "profissional e de alta qualidade —
mais estilizado com a realidade, não só um triângulo". Ambas foram executadas e verificadas
no harness (light+dark, zoom 3×). O que mudou no código (`Odontograma.tsx` + `tooth-geometry.ts`):

**(a) Proporções portadas do artefato** (extraídas por JS, viewBox 96×152 → frações de
`w`/`crownH`/`rootH`, nunca coordenada absoluta): implante (corpo era ~1,7× largo demais),
pino (núcleo 44% largo), lesão, X de extração, selante, fratura, canal (stroke 1,4→1,7),
fills da coroa (`coral-pale` / mix 24%), raiz tingida com token `-pale` + contorno cheio,
coroa do implante vazada. A hachura da coroa foi portada **pelo ângulo** (55,7°) e não por
frações de x/y: o dente do artefato tem proporção 1,71 e os nossos 0,73–1,13, o que entortava
a hachura pra ~70° (medido).

**(b) Anatomia no lugar das primitivas:**
| Símbolo | Antes | Agora |
|---|---|---|
| **Canal** | forma aproximada, stroke 1,4 | **path do catálogo portado em frações** (lado direito quase reto + lado esquerdo curvo + ponta deslocada = leitura de canal curvo, não de triângulo), largura = 28% da raiz, stroke 1,7. Molar: 1 canal por raiz. **Versão com câmara pulpar + cornos foi construída e REPROVADA pelo Mateus** (27/07): pesa demais no tamanho real do odontograma — o catálogo já estava certo |
| **Pino/núcleo** | haste + triângulo | **peça protética contínua**: núcleo trapezoidal com ombro cervical + pino cônico de ponta arredondada |
| **Implante** | roscas = linhas horizontais atravessando | **perfil em V (dente de serra)** no contorno do corpo, como no raio-x |
| **Lesão periapical** | círculo geométrico | **radiolucência** de contorno orgânico irregular |
| **Fratura** | zigue-zague uniforme | traço principal + **ramificação** fina (a trinca se espalha) |
| **Selante** | ponto solto | segue o **sulco oclusal** (molar: central + ramos) |
| **Coroa** | contorno + hachura | **+ margem cervical** — o traço que faz ler como peça cimentada |

**Bugs achados pelo harness no caminho** (nenhum visível no olho, todos por medição/zoom): a
linha da ponte quebrava em degraus entre classes de dente de alturas diferentes; a lesão com
raio proporcional puro (r≈2,5) fechava o miolo sob o stroke; e — na versão com câmara, depois
descartada — a câmara era **coberta pelo `crownPath`**, a mesma armadilha já documentada no
pino em 25/07 (marca que vive na coroa precisa ser desenhada DEPOIS dela).

**Divergência mantida de propósito:** o artefato pinta o pré-existente com **slate sólido**.
Medido: 7,36:1 de contraste contra o fundo (dark) vs 1,27:1 do coral. Na arcada cheia o "já
estava assim" viraria o elemento mais chamativo, invertendo a hierarquia declarada pelo próprio
componente (coral > teal > slate). Ficou no `-pale` + textura pontilhada; está comentado no
código com o número, pra decisão do Mateus.

## Achados priorizados da rodada 1 (P1 pendente de decisão; P3/P4 seguem abertos)

- **P1 · Coroa: hachura vs circunferência.** Único símbolo onde divergimos de TODAS as fontes
  hispânicas consultadas. Trocar por circunferência envolvendo a coroa (norma 1.4) deixaria o
  odontograma legível de primeira pro dentista BR médio — e é mudança pequena (1 bloco de
  render). Contra: a hachura comunica "material cobrindo" e já foi validada no artefato R-02.
- **P2 · Fratura direcional + ausente.** (a) trocar o zigue-zague por linha reta diagonal
  (aproxima a norma sem mudar o modelo); (b) decidir se ausente ganha X além do tracejado.
- **P3 · Legenda de GLIFOS.** A legenda atual só explica **cores**; nenhum glifo (parafuso,
  hachura, linha de ponte, seta de esfoliação) é explicado em lugar nenhum. Uma seção de
  símbolos na legenda resolve a descobribilidade de tudo acima — candidato forte a item.
- **P4 · Sigla de material da restauração** (AM/R/IV…) como badge no card — a norma indexa
  por sigla; nosso `observacao` livre não padroniza. Ganho pequeno, custo pequeno.

**Como virar trabalho:** P1/P2 cabem no descongelamento do R-22 (lote "ícones de
procedimento" que já existe lá); P3 pode ser item próprio (peso P); P4 é discussão de modelo
antes de símbolo. Nada disso bloqueia o R-06/R-07 já codado — a ponte e a esfoliação nasceram
alinhadas à norma.

## Fontes

- [Norma Técnica del Odontograma — Colégio Odontológico do Peru (PDF, 12 pp., lida na íntegra)](https://ccdp.org.pe/wp-content/uploads/2024/03/Norma-Tecnica-del-Odontograma.pdf) — 33 categorias, regras de desenho e cores (a RM-559-2022 do MINSA atualiza a mesma norma; PDF oficial fora do ar em 27/07)
- [Cenident — símbolos do odontograma (códigos EX, CR/PD, X)](https://cenident.com/blog/simbolos-del-odontograma)
- [Open Dental — treatment areas / charting](https://opendental.com/manual/procedurecodeedit.html) · convenção implante-parafuso
- Código: `src/components/odontograma/Odontograma.tsx` (ToothSVG, PonteMarks, buildResumos, legendItems)
