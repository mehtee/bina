import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { staffWebMswHandlers } from "~/core/api/msw/handlers";
import { resetMockDb } from "~/core/api/msw/mock-transport";

// Ensure matchMedia exists in jsdom for ThemeProvider
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Ensure URL.createObjectURL exists in jsdom for blob report preview tests
if (typeof URL !== "undefined" && !URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => "blob:mock-report");
  URL.revokeObjectURL = vi.fn();
}

export const server = setupServer(...staffWebMswHandlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockDb();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterAll(() => {
  server.close();
});
