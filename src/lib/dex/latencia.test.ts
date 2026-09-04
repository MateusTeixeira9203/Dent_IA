import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDexServerTiming } from './latencia';

test('expõe as três etapas do Dex sem valores negativos', () => {
  assert.equal(
    formatDexServerTiming({ preAiMs: 12.34, aiMs: 987.65, postAiMs: -3 }),
    'pre-ai;dur=12.3, ai;dur=987.6, post-ai;dur=0.0',
  );
});
