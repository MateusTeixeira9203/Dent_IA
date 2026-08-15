import type { Metadata } from 'next';
import Link from 'next/link';

import { PLANOS } from '@/lib/planos';
import '@/components/landing/landing.css';
import { DexMark } from '@/components/dex/dex-mark';
import { BotaoGoogle } from '@/components/landing/botao-google';
import { PassoFale } from '@/components/landing/passo-fale';
import { PassoFicha } from '@/components/landing/passo-ficha';
import { PonteForm } from '@/components/landing/ponte-form';
import { Revelar } from '@/components/landing/revelar';
import { TopoNav } from '@/components/landing/topo-nav';

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
};

const PERGUNTAS = [
  {
    q: 'Preciso migrar meus pacientes na mão?',
    a: 'Você não precisa migrar nada para começar. O paciente entra no sistema quando senta na cadeira — no primeiro atendimento dele com você. O que a gente importa de arquivo é a sua tabela de procedimentos e preços; e se você usa Google Agenda, os agendamentos vêm de lá.',
  },
  {
    q: 'Funciona no celular?',
    a: 'Funciona no navegador do celular, sem instalar nada. Mas vamos ser diretos: a experiência é melhor no computador, e o uso no celular está sendo refinado agora. Aplicativo próprio ainda não existe.',
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
  { v: '6', l: 'dentistas usando todo dia' },
  { v: '+300', l: 'pacientes por mês' },
  { v: '3', l: 'meses em uso real' },
];

export default function LandingPage() {
  return (
    <div className="lp">
      {/* grade contínua da página — atravessa hero, blocos e rodapé sem emenda */}
      <div className="grade" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <TopoNav />

      {/* ══ HERO ══ */}
      <header className="hero">
        <div className="env">
          <span className="autoridade sobe" style={{ animationDelay: '.05s' }}>
            <span className="ponto-vivo" />
            Em uso diário na <b>ClinDent</b> — 6 dentistas, +300 pacientes por mês
          </span>
          <h1 className="sobe" style={{ animationDelay: '.13s' }}>
            Você atende. <em>A IA documenta.</em>
          </h1>
          <p className="intro sobe" style={{ animationDelay: '.24s' }}>
            Termine o dia sem papelada pendente. Você conversa olhando pro paciente, o Odonto.IA estrutura a ficha —
            e o que ficou pra próxima sessão volta sozinho, na ficha certa.
          </p>
          <div className="acoes sobe" style={{ animationDelay: '.34s' }}>
            <Link href="/cadastro" className="btn btn-p">
              Testar 14 dias grátis <span className="s">→</span>
            </Link>
            <BotaoGoogle />
          </div>
          <p className="miudo sobe" style={{ animationDelay: '.42s' }}>
            Cobrança só no 15º dia — e a gente avisa 7 dias antes. Cancele até lá e não paga nada.
          </p>
        </div>
      </header>

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
            <h2>Uma clínica de alto fluxo abre o Odonto.IA todo dia.</h2>
            <div className="duo">
              <div>
                <blockquote className="citacao">
                  “Eu perdia sábado pondo ficha em dia. Agora acabo o atendimento e a ficha já está pronta.”
                </blockquote>
                <p className="assina">Dr. Renato Gonçalves Teixeira · ClinDent</p>
              </div>
              {/* TODO(R-88): entra a foto real da ClinDent. Até lá, o espaço fica declarado. */}
              <div className="vaga" style={{ '--h': '320px' } as React.CSSProperties}>
                <b>Foto — ClinDent</b>
                Dentista atendendo com o sistema aberto.
                <br />
                Horizontal, luz natural.
              </div>
            </div>
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
            <h2>Você testa antes de pagar.</h2>
            <div className="planos">
              <div className="plano eleito">
                <div className="nome">{PLANOS.SOLO.label}</div>
                <div className="valor">R${PLANOS.SOLO.preco}</div>
                <div className="base">por mês · 1 dentista + 1 secretária</div>
                <ul>
                  <li>Ficha clínica estruturada por voz</li>
                  <li>Odontograma e campos por especialidade</li>
                  <li>Plano apresentado na imagem do paciente</li>
                  <li>Assinatura no procedimento e no orçamento</li>
                  <li>Agenda e financeiro</li>
                </ul>
                {/* sem `?plano=` — o plano é escolhido no onboarding, depois do aha
                    (ver o comentário em (auth)/cadastro/page.tsx). O parâmetro que a
                    landing antiga mandava não era lido por ninguém. */}
                <Link href="/cadastro" className="btn btn-p">
                  Testar 14 dias
                </Link>
              </div>
              <div className="plano">
                <div className="nome">{PLANOS.CLINICA.label}</div>
                <div className="valor">R${PLANOS.CLINICA.preco}</div>
                <div className="base">por dentista/mês · a partir de 3</div>
                <ul>
                  <li>Tudo do {PLANOS.SOLO.label}</li>
                  <li>Secretária com visão de todos</li>
                  <li>Protético com acesso próprio</li>
                  <li>WhatsApp com lembretes</li>
                </ul>
                <Link href="/cadastro" className="btn btn-s">
                  Testar 14 dias
                </Link>
              </div>
            </div>
          </Revelar>
        </section>

        {/* ══ VI · PERGUNTAS ══ */}
        <section className="bloco">
          <div className="marcador">
            <span className="n">VI</span>
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
              Quatorze dias completos. Cobrança só no 15º dia, com aviso 7 dias antes — cancele até lá e não paga
              nada.
            </p>
            <div className="acoes">
              <Link href="/cadastro" className="btn btn-p">
                Testar 14 dias grátis <span className="s">→</span>
              </Link>
              <BotaoGoogle />
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
