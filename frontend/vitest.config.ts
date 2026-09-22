import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  root: 'frontend',
  plugins: [react(), wasm()],
  test: { environment: 'node', include: ['src/**/*.test.ts'], globals: true },
});
