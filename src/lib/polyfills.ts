import { getRandomValues } from 'expo-crypto';

// pdf-lib's encryption needs Web Crypto randomness, which Hermes lacks.
const g = globalThis as { crypto?: { getRandomValues?: unknown } };
if (!g.crypto) g.crypto = {};
if (!g.crypto.getRandomValues) g.crypto.getRandomValues = getRandomValues;
