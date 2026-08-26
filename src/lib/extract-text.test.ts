import assert from 'node:assert/strict';
import test from 'node:test';
import { strToU8, zipSync } from 'fflate';
import { extractTextFromFile } from './extract-text.ts';

function comoArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

test('extrai texto de slides PPTX na ordem correta', async () => {
  const pptx = zipSync({
    'ppt/slides/slide2.xml': strToU8('<a:p><a:r><a:t>Segundo slide</a:t></a:r></a:p>'),
    'ppt/slides/slide1.xml': strToU8('<a:p><a:r><a:t>Primeiro &amp; slide</a:t></a:r></a:p>'),
    'ppt/notesSlides/notesSlide1.xml': strToU8('<a:p><a:r><a:t>Nota do primeiro</a:t></a:r></a:p>'),
  });

  const texto = await extractTextFromFile(comoArrayBuffer(pptx), 'pptx');

  assert.equal(texto, 'Primeiro & slide\n\nNota do primeiro\n\nSegundo slide');
});

test('rejeita PPTX sem slides com erro controlado', async () => {
  const pacoteInvalido = zipSync({ 'docProps/core.xml': strToU8('<coreProperties />') });

  await assert.rejects(
    () => extractTextFromFile(comoArrayBuffer(pacoteInvalido), 'pptx'),
    /nenhum slide encontrado/i,
  );
});
