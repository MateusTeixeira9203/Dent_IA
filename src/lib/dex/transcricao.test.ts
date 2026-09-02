import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { mimeAudioAceito } from './schemas';
import {
  arquivoParaWhisper,
  mensagemErroTranscricao,
  normalizarMimeAudio,
  parseDexErrorCode,
  statusDoErroProvider,
} from './transcricao';

test('a rota de transcrição usa o vínculo canônico e não a coluna legada', () => {
  const route = readFileSync(fileURLToPath(new URL('../../app/api/transcrever/route.ts', import.meta.url)), 'utf8');
  assert.match(route, /getDentistaCached/);
  assert.doesNotMatch(route, /usuario_id/);
});

test('MIME de áudio aceita aliases seguros e rejeita formato desconhecido', () => {
  assert.equal(mimeAudioAceito('audio/wav;codecs=1'), true);
  assert.equal(mimeAudioAceito('audio/x-wav'), true);
  assert.equal(mimeAudioAceito('audio/x-m4a'), true);
  assert.equal(mimeAudioAceito('audio/opus'), true);
  assert.equal(mimeAudioAceito('video/mp4'), false);
});

test('normalização de MIME remove parâmetros sem alterar formatos válidos', () => {
  assert.equal(normalizarMimeAudio(' Audio/WebM; codecs=opus '), 'audio/webm');
  assert.equal(normalizarMimeAudio('audio/mpeg'), 'audio/mpeg');
});

test('arquivo Opus é enviado com extensão de contêiner aceita pelo provider', async () => {
  const original = new File(['bytes'], 'consulta.opus', { type: 'audio/opus' });
  const preparado = arquivoParaWhisper(original);
  assert.equal(preparado.name, 'consulta.ogg');
  assert.equal(preparado.type, 'audio/ogg');
  assert.equal(await preparado.text(), 'bytes');
});

test('códigos e mensagens públicas não expõem erro do provider', () => {
  assert.equal(parseDexErrorCode('UNAUTHORIZED'), 'UNAUTHORIZED');
  assert.equal(parseDexErrorCode('internal-secret'), undefined);
  assert.match(mensagemErroTranscricao('RATE_LIMITED'), /Limite/);
  assert.match(mensagemErroTranscricao(undefined, 504), /demorou/);
  assert.equal(statusDoErroProvider({ status: 429, message: 'secret' }), 429);
  assert.equal(statusDoErroProvider({ status: '429' }), undefined);
});
