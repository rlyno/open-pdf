/**
 * The slice of Node's `crypto` module that pdf-lib uses for AES-256 PDF
 * passwords (ISO 32000-2 Algorithm 2.B): SHA-2 hashes and AES-128-CBC.
 *
 * pdf-lib looks it up through `process.getBuiltinModule('crypto')` and
 * otherwise falls back to its own pure-JS SHA-512, which models every 64-bit
 * word as an object and takes minutes per password check under Hermes.
 * @noble's implementations do the same work in a fraction of the time.
 */
import { cbc } from '@noble/ciphers/aes.js';
import { sha256, sha384, sha512 } from '@noble/hashes/sha2.js';

const HASHES: Record<string, (data: Uint8Array) => Uint8Array> = { sha256, sha384, sha512 };

function concat(chunks: Uint8Array[]) {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

export const pdfCrypto = {
  createHash(algorithm: string) {
    const hash = HASHES[algorithm];
    if (!hash) throw new Error(`Unsupported hash: ${algorithm}`);
    const chunks: Uint8Array[] = [];
    return {
      update(data: Uint8Array) {
        chunks.push(data);
        return this;
      },
      digest: () => hash(concat(chunks)),
    };
  },
  createCipheriv(algorithm: string, key: Uint8Array, iv: Uint8Array) {
    if (algorithm !== 'aes-128-cbc') throw new Error(`Unsupported cipher: ${algorithm}`);
    const chunks: Uint8Array[] = [];
    let padding = true;
    return {
      setAutoPadding(on: boolean) {
        padding = on;
        return this;
      },
      // Encrypts everything in final(); pdf-lib concatenates update() and final().
      update(data: Uint8Array) {
        chunks.push(data);
        return new Uint8Array(0);
      },
      final: () => cbc(key, iv, { disablePadding: !padding }).encrypt(concat(chunks)),
    };
  },
};
