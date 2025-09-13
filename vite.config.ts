/// <reference types="node" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  plugins: [react()],
  base: isPages ? '/ehr-asl/' : '/',  // Pages vs Vercel/local
});
