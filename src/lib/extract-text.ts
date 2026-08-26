// Parsers de texto embutido em documento — extraído de `api/processar-documento`
// (Job A Fatia B, §6) pra ser reusado por `api/extrair-texto` sem duplicar lógica.
// Refactor extrativo (invariante #11): `processar-documento` se comporta idêntico.

export async function extractTextFromFile(buffer: ArrayBuffer, ext: string): Promise<string> {
  if (ext === 'docx' || ext === 'doc') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  }
  if (ext === 'pdf') {
    // 'pdf-parse/lib/pdf-parse.js', não 'pdf-parse' — o index.js da lib tem um bug conhecido
    // que quebra o import inteiro sob bundler (ver src/types/pdf-parse-lib.d.ts).
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
    const result = await pdfParse(Buffer.from(buffer));
    return result.text;
  }
  if (ext === 'txt') {
    return new TextDecoder('utf-8').decode(buffer);
  }
  if (ext === 'pptx') {
    const { strFromU8, unzipSync } = await import('fflate');
    const arquivos = unzipSync(new Uint8Array(buffer));
    const slides = Object.keys(arquivos)
      .filter((nome) => /^ppt\/slides\/slide\d+\.xml$/.test(nome))
      .sort((a, b) => numeroDoArquivo(a) - numeroDoArquivo(b));

    if (slides.length === 0) {
      throw new Error('PPTX inválido: nenhum slide encontrado.');
    }

    return slides
      .flatMap((slide) => {
        const numero = numeroDoArquivo(slide);
        const nota = `ppt/notesSlides/notesSlide${numero}.xml`;
        return [slide, nota]
          .filter((arquivo) => arquivos[arquivo] !== undefined)
          .map((arquivo) => extrairTextoDoSlide(strFromU8(arquivos[arquivo])));
      })
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

function numeroDoArquivo(nome: string): number {
  return Number(nome.match(/(?:slide|notesSlide)(\d+)\.xml$/)?.[1] ?? 0);
}

function extrairTextoDoSlide(xml: string): string {
  const paragrafos = Array.from(xml.matchAll(/<a:p(?:\s[^>]*)?>([\s\S]*?)<\/a:p>/g));
  const origem = paragrafos.length > 0 ? paragrafos.map((paragrafo) => paragrafo[1]) : [xml];

  return origem
    .map((paragrafo) => Array.from(paragrafo.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g))
      .map((texto) => decodificarEntidadesXml(texto[1]))
      .join(''))
    .filter(Boolean)
    .join('\n');
}

function decodificarEntidadesXml(texto: string): string {
  return texto
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, codigo: string) => String.fromCodePoint(Number(codigo)))
    .replace(/&#x([\da-f]+);/gi, (_, codigo: string) => String.fromCodePoint(parseInt(codigo, 16)));
}
