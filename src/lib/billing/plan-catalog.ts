import 'server-only';
import { getStripeClient } from '@/lib/stripe';
import { erroValidacaoPreco } from './price-validation';

export type PlanoAssinatura = 'CONSULTORIO' | 'CLINICA';
export type CicloCobranca = 'mensal' | 'anual';
export type OfertaPreco = 'fundador' | 'publico';
export type ChavePreco = `${PlanoAssinatura}:${CicloCobranca}:${OfertaPreco}`;

export type CatalogoPreco = {
  plano: PlanoAssinatura;
  ciclo: CicloCobranca;
  oferta: OfertaPreco;
  stripePriceId: string;
  valorCentavos: number;
  moeda: 'brl';
};

const ENV_POR_CHAVE: Record<ChavePreco, string> = {
  'CONSULTORIO:mensal:fundador': 'STRIPE_PRICE_FUNDADOR_CONSULTORIO_MENSAL',
  'CONSULTORIO:anual:fundador': 'STRIPE_PRICE_FUNDADOR_CONSULTORIO_ANUAL',
  'CLINICA:mensal:fundador': 'STRIPE_PRICE_FUNDADOR_CLINICA_MENSAL',
  'CLINICA:anual:fundador': 'STRIPE_PRICE_FUNDADOR_CLINICA_ANUAL',
  'CONSULTORIO:mensal:publico': 'STRIPE_PRICE_PUBLICO_CONSULTORIO_MENSAL',
  'CONSULTORIO:anual:publico': 'STRIPE_PRICE_PUBLICO_CONSULTORIO_ANUAL',
  'CLINICA:mensal:publico': 'STRIPE_PRICE_PUBLICO_CLINICA_MENSAL',
  'CLINICA:anual:publico': 'STRIPE_PRICE_PUBLICO_CLINICA_ANUAL',
};

const VALOR_FUNDADOR: Record<CicloCobranca, number> = {
  mensal: 20_000,
  anual: 200_000,
};

const validacoesPreco = new Map<string, Promise<void>>();

export function isCicloCobranca(value: string): value is CicloCobranca {
  return value === 'mensal' || value === 'anual';
}

export function resolverPrecoStripe(input: {
  plano: PlanoAssinatura;
  ciclo: CicloCobranca;
  oferta?: OfertaPreco;
}): CatalogoPreco {
  const oferta = input.oferta ?? 'fundador';
  const chave: ChavePreco = `${input.plano}:${input.ciclo}:${oferta}`;
  const envName = ENV_POR_CHAVE[chave];
  const stripePriceId = process.env[envName];

  if (!stripePriceId) {
    throw new Error(`Preço Stripe não configurado: ${envName}.`);
  }

  if (oferta !== 'fundador') {
    throw new Error('Os valores públicos ainda não foram aprovados.');
  }

  return {
    plano: input.plano,
    ciclo: input.ciclo,
    oferta,
    stripePriceId,
    valorCentavos: VALOR_FUNDADOR[input.ciclo],
    moeda: 'brl',
  };
}

/**
 * Confere o objeto real da Stripe antes de abrir Checkout ou criar assinatura.
 * Assim um Price ID trocado no ambiente nunca cobra valor ou periodicidade errados.
 */
export async function validarPrecoStripe(preco: CatalogoPreco): Promise<void> {
  const existente = validacoesPreco.get(preco.stripePriceId);
  if (existente) return existente;

  const validacao = (async () => {
    const stripePrice = await getStripeClient().prices.retrieve(preco.stripePriceId, {
      expand: ['product'],
    });
    const intervaloEsperado = preco.ciclo === 'mensal' ? 'month' : 'year';
    const produtoAtivo = typeof stripePrice.product === 'string'
      ? true
      : !stripePrice.product.deleted && stripePrice.product.active;

    const erro = erroValidacaoPreco({
      priceId: preco.stripePriceId,
      snapshot: {
        active: stripePrice.active,
        productActive: produtoAtivo,
        currency: stripePrice.currency,
        unitAmount: stripePrice.unit_amount,
        type: stripePrice.type,
        interval: stripePrice.recurring?.interval ?? null,
        intervalCount: stripePrice.recurring?.interval_count ?? null,
      },
      expectedCurrency: preco.moeda,
      expectedAmount: preco.valorCentavos,
      expectedInterval: intervaloEsperado,
    });
    if (erro) throw new Error(erro);
  })();

  validacoesPreco.set(preco.stripePriceId, validacao);
  try {
    await validacao;
  } catch (error) {
    validacoesPreco.delete(preco.stripePriceId);
    throw error;
  }
}

export function descreverPreco(ciclo: CicloCobranca): string {
  return ciclo === 'mensal' ? 'R$ 200/mês' : 'R$ 2.000/ano';
}
