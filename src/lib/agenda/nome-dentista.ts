const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Evita expor identificadores internos onde o produto espera o nome do dentista. */
export function nomeDentistaExibicao(nome: string | null | undefined): string {
  const nomeLimpo = nome?.trim();
  return !nomeLimpo || UUID_REGEX.test(nomeLimpo)
    ? "Dentista não identificado"
    : nomeLimpo;
}
