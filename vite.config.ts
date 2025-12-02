import { defineConfig } from 'vite';
import { resolve } from 'path';
export default defineConfig({
  root: './src/web',
  publicDir: '../../public',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    rollupOptions: {
      external: (id) => {
        // Don't bundle config.ts in browser (it uses Node.js crypto)
        if (id.includes('/config.ts') || id.includes('\\config.ts')) {
          return true;
        }
        return false;
      }
    }
  },
  server: {
    port: 8080,
    open: true,
    cors: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Allow importing from dist folder of tongo-sdk
      '@fatsolutions/tongo-sdk/dist/types.js': resolve(__dirname, './node_modules/@fatsolutions/tongo-sdk/dist/types.js')
    },
    dedupe: []
  },
  optimizeDeps: {
    include: ['@fatsolutions/tongo-sdk', '@fatsolutions/tongo-sdk/dist/types.js', 'get-starknet'],
    exclude: ['crypto', 'dotenv'] // Exclude Node.js modules from browser bundle
  },
  define: {
    // Replace Node.js globals with browser-safe versions
    'process.env': '{}',
    'global': 'globalThis'
  },
  ssr: {
    // Don't externalize these for SSR (we're not using SSR, but good to have)
    noExternal: ['@fatsolutions/tongo-sdk']
  },
  plugins: [],
});

