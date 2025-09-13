import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/ehr-asl/',            // <-- repo name between slashes
  build: { outDir: 'docs' },    // <-- build into /docs for GitHub Pages
});
