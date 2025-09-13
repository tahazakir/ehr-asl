// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // base is '/' locally/Vercel, repo subpath on GitHub Pages
  base: process.env.GITHUB_PAGES ? '/ehr-asl/' : '/',
  // DO NOT set build.outDir here (Vite default is 'dist')
});
