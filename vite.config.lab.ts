import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Lab build: one self-contained HTML file for previewing the app as a hosted page. Not the deploy build.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  define: { 'import.meta.env.VITE_LAB': JSON.stringify('1') },
  build: { outDir: 'dist-lab', target: 'es2022', assetsInlineLimit: 100000000, cssCodeSplit: false },
});
