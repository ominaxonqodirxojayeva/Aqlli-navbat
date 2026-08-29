import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Har bir testdan keyin DOM tozalanadi
afterEach(() => {
  cleanup();
});

// jsdom'da mavjud bo'lmagan, lekin ilova ishlatadigan brauzer API'lari
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  }

  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof window.ResizeObserver;
  }

  // `'scrollTo' in window` ishlatib bo'lmaydi: TS uni Window'ning majburiy
  // a'zosi deb biladi va salbiy shoxda `window` ni `never` ga toraytiradi.
  if (typeof window.scrollTo !== 'function') {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  }
}
