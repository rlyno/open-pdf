import { getRandomValues } from 'expo-crypto';

import { pdfCrypto } from '@/lib/pdf/fast-crypto';

// pdf-lib's encryption needs Web Crypto randomness, which Hermes lacks.
const g = globalThis as { crypto?: { getRandomValues?: unknown } };
if (!g.crypto) g.crypto = {};
if (!g.crypto.getRandomValues) g.crypto.getRandomValues = getRandomValues;

// pdf-lib checks AES-256 passwords with Node's crypto when it can find it.
// Without this, it falls back to a pure-JS SHA-512 that takes minutes on
// Hermes for a single password check.
const p = globalThis as { process?: { getBuiltinModule?: (name: string) => unknown } };
if (!p.process) p.process = {};
if (!p.process.getBuiltinModule) p.process.getBuiltinModule = (name) => (name === 'crypto' ? pdfCrypto : undefined);
