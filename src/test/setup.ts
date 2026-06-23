// Setup global des tests (vitest).
// jsdom n'expose pas toujours localStorage sur le global : on fournit un
// polyfill en mémoire afin que le code applicatif (caches, préférences) tourne.

class LocalStorageMock {
  private store: Record<string, string> = {};
  clear() { this.store = {}; }
  getItem(key: string): string | null { return key in this.store ? this.store[key] : null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
  key(index: number): string | null { return Object.keys(this.store)[index] ?? null; }
  get length(): number { return Object.keys(this.store).length; }
}

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new LocalStorageMock(),
    configurable: true,
  });
}
