import { defineConfig } from 'vite';
import { angularBuilder } from '@angular/build';

export default defineConfig({
  build: {
    target: ['es2020']
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5101',
        changeOrigin: true
      }
    }
  },
  plugins: [angularBuilder()]
});
