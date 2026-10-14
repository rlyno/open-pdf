import assert from 'node:assert/strict';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { describe, it } from 'node:test';

import { pdfCrypto } from '../src/lib/pdf/fast-crypto';

describe('fast crypto shim', () => {
  it('hashes like Node', () => {
    for (const alg of ['sha256', 'sha384', 'sha512']) {
      for (const size of [0, 55, 64, 5000]) {
        const data = randomBytes(size);
        const half = Math.floor(size / 2);
        const ours = pdfCrypto.createHash(alg).update(data.subarray(0, half)).update(data.subarray(half)).digest();
        assert.deepEqual(Buffer.from(ours), createHash(alg).update(data).digest(), `${alg} ${size}`);
      }
    }
  });
  it('encrypts AES-128-CBC like Node, with and without padding', () => {
    const key = randomBytes(16);
    const iv = randomBytes(16);
    for (const padding of [false, true]) {
      const data = randomBytes(padding ? 100 : 4096);
      const c = pdfCrypto.createCipheriv('aes-128-cbc', key, iv).setAutoPadding(padding);
      const ours = Buffer.concat([c.update(data), c.final()]);
      const node = createCipheriv('aes-128-cbc', key, iv).setAutoPadding(padding);
      assert.deepEqual(ours, Buffer.concat([node.update(data), node.final()]));
    }
  });
});
