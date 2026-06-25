import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import '../i18n';

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;
