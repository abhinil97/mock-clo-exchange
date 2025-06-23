// Polyfills for browser compatibility with Aptos SDK
/* eslint-disable @typescript-eslint/no-explicit-any */

if (typeof global === 'undefined') {
  (globalThis as any).global = globalThis;
}

if (typeof process === 'undefined') {
  (globalThis as any).process = { env: {} };
}

// Add Buffer polyfill if needed
if (typeof Buffer === 'undefined') {
  (globalThis as any).Buffer = {};
} 