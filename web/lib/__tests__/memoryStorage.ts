// A minimal in-memory Storage used by the lib unit tests. Each test installs a
// fresh instance in beforeEach so suites never share state, and the modules
// under test (which all read window.localStorage / window.sessionStorage) see a
// clean, deterministic store regardless of the host jsdom version.

function createMemoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    get length(): number {
      return Object.keys(store).length;
    },
    clear(): void {
      store = {};
    },
    getItem(key: string): string | null {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key]! : null;
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string): void {
      delete store[key];
    },
    setItem(key: string, value: string): void {
      store[key] = String(value);
    },
  };
}

// Replaces window.localStorage and window.sessionStorage with fresh in-memory
// stores. Defined as configurable own properties so they shadow jsdom's
// built-ins and can be reinstalled before every test.
export function installMemoryStorage(): void {
  Object.defineProperty(window, "localStorage", {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, "sessionStorage", {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
}
