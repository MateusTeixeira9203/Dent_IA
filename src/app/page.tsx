import type { Metadata } from 'next';
import Link from 'next/link';

import '@/components/landing/landing.css';
import { DexMark } from '@/components/dex/dex-mark';
import { BotaoGoogle } from '@/components/landing/botao-google';
import { InstallPwaCard } from '@/components/landing/install-pwa-card';
import { PassoFale } from '@/components/landing/passo-fale';
import { PassoFicha } from '@/components/landing/passo-ficha';
import { PonteForm } from '@/components/landing/ponte-form';
import { Revelar } from '@/components/landing/revelar';
import { TopoNav } from '@/components/landing/topo-nav';
import { BrandBackground } from '@/components/layout/brand-background';
import { HeroProductPreview } from '@/components/landing/hero-product-preview';

// ══════════════════════════════════════════════════════════════════════════════
// LANDING — R-88 · eixo CONTINUIDADE · registro INSTRUMENTO
// Implementação do artefato aprovado plans/artefatos/R-88-landing-conversao.html (v7).
// O artefato é o contrato VISUAL. Preço e regra de negócio vêm do código:
// os valores saem de lib/planos.ts, que é a fonte única.
// ══════════════════════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title: 'Odonto.IA — Você atende. A IA documenta.',
  description:
    'Termine o dia sem papelada pendente. Você conversa olhando pro paciente, o Odonto.IA estrutura a ficha — e o que ficou pra próxima sessão volta sozinho, na ficha certa.',
  alternates: { canonical: '/' },
};

const PERGUNTAS = [
  {
    q: 'Preciso migrar meus pacientes na mão?',
    a: 'Você não precisa migrar nada para começar. O paciente entra no sistema quando senta na cadeira — no primeiro atendimento dele com você. O que a gente importa de arquivo é a sua tabela de procedimentos e preços; e se você usa Google Agenda, os agendamentos vêm de lá.',
  },
  {
    q: 'Funciona no celular?',
    a: 'Sim. Você pode usar no navegador ou instalar o Odonto.IA na tela inicial do celular para abrir como aplicativo, com a mesma conta e os mesmos dados.',
  },
  {
    q: 'A IA inventa diagnóstico?',
    a: 'Não. Ela organiza o que você falou em campos estruturados — dente, face, procedimento, conduta. Nunca sugere diagnóstico nem decide conduta. Você revisa tudo antes de assinar.',
  },
  {
    q: 'A assinatura do paciente tem validade?',
    a: 'O que o sistema garante é o registro: a assinatura fica presa ao procedimento ou ao orçamento que o paciente aceitou, com data e autor, dentro do prontuário — não é uma imagem solta num arquivo. Sobre valor jurídico a gente não faz afirmação: isso depende do tipo de documento e da orientação do seu advogado.',
  },
  {
    q: 'E se eu quiser sair?',
    a: 'Você leva seus dados. O prontuário de cada paciente é exportável a qualquer momento, e as fichas saem em PDF. O plano é mensal, sem fidelidade — cancela quando quiser.',
  },
];

const SELOS = [
  {
    t: 'Procedimento assinado',
    d: 'O paciente assina o que foi feito, no fim do atendimento. Fica na ficha, com data.',
  },
  {
    t: 'Orçamento aceito',
    d: 'O aceite acontece na cadeira, com assinatura — não num papel que some no caminho.',
  },
  {
    t: 'Prontuário que sai com você',
    d: 'Tudo exportável em PDF, a qualquer momento. O histórico é seu, não nosso.',
  },
];

const MARCOS = [
  { v: '5', l: 'dentistas usando todo dia' },
  { v: '+450', l: 'atendimentos por mês' },
  { v: '3', l: 'meses em uso real' },
];

export default function LandingPage() {
  return (
    <div className="lp">
      <BrandBackground variant="marketing" tone="charcoal" position="fixed" />

      <TopoNav />

      {/* ══ HERO ══ */}
      <header className="hero" id="inicio">
        <div className="env">
          <div className="hero__grid">
            <div>
              <span className="autoridade sobe" style={{ animationDelay: '.05s' }}>
                <span className="ponto-vivo" />
                Em uso diário na <b>ClinDent</b> — clínica de alto fluxo
              </span>
              <h1 className="sobe" style={{ animationDelay: '.13s' }}>
                Você atende. <em>A IA documenta.</em>
              </h1>
              <p className="intro sobe" style={{ animationDelay: '.24s' }}>
                Fale do atendimento como você fala. O Odonto.IA organiza a ficha, registra o que foi feito e devolve a próxima sessão no lugar certo.
              </p>
              <div className="acoes sobe" style={{ animationDelay: '.34s' }}>
                <BotaoGoogle label="Começar com Google" />
                <Link href="/cadastro" className="btn btn-s">
                  Criar conta com e-mail <span className="s">→</span>
                </Link>
              </div>
              <p className="miudo sobe" style={{ animationDelay: '.42s' }}>
                7 dias gratuitos. Sem fidelidade.
              </p>
            </div>
            <div className="sobe hero__preview" style={{ animationDelay: '.2s' }}>
              <HeroProductPreview />
            </div>
          </div>
        </div>
      </header>

      <section className="hero-proof" aria-label="Uso clínico real e aplicativo">
        <div className="env">
          <div className="hero-proof__metrics">
            <strong>ClinDent</strong>
            <span>Uso clínico real, todos os dias</span>
            <b><i>5</i> dentistas usando</b>
            <b><i>+450</i> atendimentos por mês</b>
          </div>
          <div className="hero-proof__pwa">
            <div>
              <span>No computador e no celular</span>
              <h2>Instale quando quiser. Continue de onde parou.</h2>
              <p>A mesma conta e os mesmos dados, em tela cheia no celular.</p>
            </div>
            <a href="#aplicativo" className="btn btn-s">Ver como instalar</a>
          </div>
        </div>
      </section>

      <main>
        {/* ══ I · PROBLEMA ══ */}
        <section className="bloco" id="problema">
          <div className="marcador">
            <span className="n">I</span>
            <span className="r">O problema</span>
          </div>
          <Revelar className="conteudo">
            <h2>O trabalho não acaba quando o paciente vai embora.</h2>
            <dl className="camadas">
              <div className="camada">
                <dt>O que acontece</dt>
                <dd>Sábado à tarde pondo evolução em dia, com a memória da semana já embaçada.</dd>
              </div>
              <div className="camada viva">
                <dt>O que isso causa</dt>
                <dd>A insegurança de perguntar ao paciente o que foi feito da última vez.</dd>
              </div>
              <div className="camada">
                <dt>Por que é injusto</dt>
                <dd>Você estudou pra tratar, não pra digitar.</dd>
              </div>
            </dl>
          </Revelar>
        </section>

        {/* ══ II · COMO FUNCIONA ══ */}
        <section className="bloco" id="como">
          <div className="marcador">
            <span className="n">II</span>
            <span className="r">Como funciona</span>
          </div>
          <Revelar className="conteudo">
            <h2>Do que você fala ao que fica registrado.</h2>
            <p className="intro" style={{ marginBottom: 8 }}>
              Um caso só, do começo ao fim: a Maria chega com dor no <strong className="destaque">16</strong>, e o{' '}
              <strong className="destaque">46</strong> fica pra próxima.
            </p>

            <PassoFale />
            <PassoFicha />

            {/* PASSO 3 — a próxima visita já abre com o 46 esperando */}
            <Revelar className="passo" id="passo3">
              <div className="texto">
                <div className="ord">E então</div>
                <h3>A pendência volta sozinha</h3>
                <p>O que ficou pra próxima sessão reaparece na ficha certa, sem você procurar.</p>
              </div>
              <div className="demo">
                <div className="demo-cab">
                  <span className="nome">Maria S.</span>
                  <span className="meta">Próxima visita · 04/09</span>
                </div>
                <p className="demo-secao">A fazer</p>
                <div className="demo-corpo">
                  <div className="afazer encena">
                    <div>
                      <p className="t">
                        Restauração <span>dente 46</span>
                      </p>
                      <p className="s">planejado em 14/08</p>
                    </div>
                    <button type="button" className="btn-fazer" tabIndex={-1}>
                      marcar feito
                    </button>
                  </div>
                </div>
                <p className="demo-secao">Histórico</p>
                <div className="demo-corpo">
                  <div className="rcard encena historico">
                    <div className="txt">
                      <p className="tit">Restauração — dente 16, oclusal</p>
                      <p className="sub">Realizado em 14/08 · Você</p>
                    </div>
                    <span className="pill pill-teal">
                      <span className="dot" />
                      Realizado
                    </span>
                  </div>
                </div>
              </div>
            </Revelar>

            <PonteForm />
          </Revelar>
        </section>

        {/* ══ III · QUEM USA ══ */}
        <section className="bloco" id="quem">
          <div className="marcador">
            <span className="n">III</span>
            <span className="r">Quem usa</span>
          </div>
          <Revelar className="conteudo">
            <h2>Construído com dentistas que precisam ganhar tempo de verdade.</h2>
            <p className="intro quem-intro">
              O fluxo foi lapidado no atendimento real: falar, revisar, assinar e seguir para o próximo paciente sem deixar a ficha para depois.
            </p>
            <div className="marcos">
              {MARCOS.map((m) => (
                <div key={m.l} className="marco">
                  <div className="v">{m.v}</div>
                  <div className="l">{m.l}</div>
                </div>
              ))}
            </div>
          </Revelar>
        </section>

        {/* ══ IV · PROTEÇÃO ══ */}
        <section className="bloco" id="protecao">
          <div className="marcador">
            <span className="n">IV</span>
            <span className="r">Proteção</span>
          </div>
          <Revelar className="conteudo">
            <h2>O que foi combinado fica assinado.</h2>
            <p className="intro">
              O paciente assina na própria tela, na hora — e a assinatura fica presa ao que ele aceitou, dentro do
              prontuário.
            </p>
            <div className="selos">
              {SELOS.map((s) => (
                <div key={s.t} className="selo">
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              ))}
            </div>
          </Revelar>
        </section>

        {/* ══ V · PREÇO ══ */}
        <section className="bloco" id="preco">
          <div className="marcador">
            <span className="n">V</span>
            <span className="r">Preço</span>
          </div>
          <Revelar className="conteudo">
            <h2>Entre na primeira turma como Fundador.</h2>
            <p className="intro fundador-intro">
              A primeira turma entra com o valor fundador, mantido enquanto a assinatura estiver ativa.
            </p>
            <div className="fundador-planos">
              <article className="fundador-plano">
                <span className="fundador-selo">Plano fundador</span>
                <h3>Consultório</h3>
                <p className="fundador-subtitulo">Para quem atende sozinho.</p>
                <strong className="fundador-valor">R$200 <small>/ mês</small></strong>
                <p className="fundador-detalhe">1 dentista + 1 secretária. Valor mantido enquanto a assinatura estiver ativa.</p>
                <BotaoGoogle label="Começar com Google" />
              </article>
              <article className="fundador-plano fundador-plano--destaque">
                <span className="fundador-selo">Plano fundador</span>
                <h3>Clínica</h3>
                <p className="fundador-subtitulo">A partir de 2 dentistas.</p>
                <strong className="fundador-valor">R$200 <small>/ dentista / mês</small></strong>
                <p className="fundador-detalhe">Cada dentista tem sua própria assinatura e seu próprio financeiro, com a clínica compartilhada.</p>
                <BotaoGoogle label="Começar com Google" />
              </article>
            </div>
            <p className="fundador-rodape">7 dias gratuitos antes da primeira cobrança. Condição limitada às próximas 10 vagas.</p>
          </Revelar>
        </section>

        {/* R-116 — instalação PWA online-first, sem cache de dados clínicos. */}
        <section className="bloco" id="aplicativo">
          <div className="marcador">
            <span className="n">VI</span>
            <span className="r">Aplicativo</span>
          </div>
          <Revelar className="conteudo">
            <InstallPwaCard />
          </Revelar>
        </section>

        {/* ══ VII · PERGUNTAS ══ */}
        <section className="bloco" id="duvidas">
          <div className="marcador">
            <span className="n">VII</span>
            <span className="r">Perguntas</span>
          </div>
          <Revelar className="conteudo">
            <h2>O que perguntam antes de testar.</h2>
            <div className="perguntas">
              {PERGUNTAS.map((p) => (
                <details key={p.q} className="perg">
                  <summary>{p.q}</summary>
                  <p>{p.a}</p>
                </details>
              ))}
            </div>
          </Revelar>
        </section>

        <div className="env">
          <Revelar className="fecho">
            {/* Assinatura de marca: o DexMark canônico, o mesmo que o dentista
                encontra no onboarding e na voice-ux. Landing pré-familiariza. */}
            <DexMark size={44} shape="squircle" className="dex-fecho" />
            <h2>Termine amanhã sem papelada pendente.</h2>
            <p>
              Sete dias completos para conhecer o fluxo antes de decidir.
            </p>
            <div className="acoes">
              <BotaoGoogle label="Começar com Google" />
              <Link href="/cadastro" className="btn btn-s">
                Criar conta com e-mail <span className="s">→</span>
              </Link>
            </div>
          </Revelar>
        </div>
      </main>

      <footer className="rodape">
        <div className="env">
          <span className="marca">
            Odonto<i>.IA</i>
          </span>
          <span>© {new Date().getFullYear()} Odonto.IA</span>
        </div>
      </footer>
    </div>
  );
}
