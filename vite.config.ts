import { defineConfig } from 'vite';

// base is set for GitHub Pages project hosting: https://asbjol90.github.io/Fitnessfactory/
export default defineConfig({
  base: '/Fitnessfactory/',
  build: { target: 'es2022', sourcemap: false },
  test: { include: ['src/**/*.test.ts'] },
});
