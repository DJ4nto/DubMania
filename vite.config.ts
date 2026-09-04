import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/',
    build: {
      target: 'es2022',
      sourcemap: true,
      chunkSizeWarningLimit: 750,
    },
    server: {
      port: 5173,
      strictPort: true,
    },
  };
});
