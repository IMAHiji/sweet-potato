import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    environmentMatchGlobs: [['tests/audio.test.ts', 'jsdom']],
    coverage: {
      provider: 'v8',
    },
  },
});
