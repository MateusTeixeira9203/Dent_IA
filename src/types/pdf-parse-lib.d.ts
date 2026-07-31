// pdf-parse/index.js roda, no top-level do módulo, `isDebugMode = !module.parent` — sob o
// bundling do Next.js/webpack isso avalia true, e a lib tenta ler um PDF de teste do disco
// (`./test/data/05-versions-space.pdf`) que não existe no projeto: ENOENT, derruba o import
// inteiro. Bug conhecido da lib (não do projeto). O parser real mora em pdf-parse/lib/pdf-parse.js
// — mesmo `module.exports`, sem o wrapper de debug. src/lib/extract-text.ts e
// api/importar-procedimentos importam esse caminho direto; o pacote não publica .d.ts do
// subpath, então esta declaração só dá o tipo (idêntico ao de @types/pdf-parse).
declare module 'pdf-parse/lib/pdf-parse.js' {
  import type PdfParse from 'pdf-parse';
  const parse: typeof PdfParse;
  export default parse;
}
