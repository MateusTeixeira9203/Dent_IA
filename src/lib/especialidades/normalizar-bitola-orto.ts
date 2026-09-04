/**
 * Converte a bitola ditada de forma abreviada para a escrita clínica brasileira.
 * O campo já é exclusivamente de fio ortodôntico; material e demais observações são preservados.
 */
export function normalizarBitolaOrto(valor: string): string {
  const decimalComVirgula = valor.replace(/\b0[.,](\d{3})\b/g, '0,$1');
  const comDuasMedidas = decimalComVirgula.replace(
    /\b(\d{1,2})\s*(?:x|por)\s*(\d{1,2})\b/gi,
    (_trecho, primeira: string, segunda: string) => `${formatarBitola(primeira)} x ${formatarBitola(segunda)}`,
  );
  return comDuasMedidas.replace(/\b(\d{1,2})\b/g, (trecho) => formatarBitola(trecho));
}

/**
 * Versão para a evolução manual da arcada. Só mexe depois de “fio” ou “arco”, para não
 * converter medidas de elástico como `3/16` em uma bitola inexistente.
 */
export function normalizarBitolaEmRegistroOrto(valor: string): string {
  return valor.replace(
    /\b(fio|arco)\s+((?:0[.,])?\d{1,3}(?:\s*(?:x|por)\s*(?:0[.,])?\d{1,3})?)/gi,
    (_trecho, rotulo: string, medida: string) => `${rotulo} ${normalizarBitolaOrto(medida)}`,
  );
}

function formatarBitola(valor: string): string {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 10 && numero <= 99
    ? `0,0${String(numero).padStart(2, '0')}`
    : valor;
}
