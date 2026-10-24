import { defineConfig } from 'vitest/config';

// Tests do not load the userscript build plugin or contact a real site.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    clearMocks: true,
    restoreMocks: true,
  },
});
