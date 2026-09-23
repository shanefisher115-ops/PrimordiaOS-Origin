import { defineConfig } from 'electron-vite';
import path from 'path';

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: path.join(__dirname, 'electron/main.js'),
        formats: ['cjs']
      }
    }
  },
  preload: {
    build: {
      lib: {
        entry: path.join(__dirname, 'electron/preload.js'),
        formats: ['cjs']
      }
    }
  },
  renderer: {
    build: {
      rollupOptions: {
        input: path.join(__dirname, 'src/index.html')
      }
    }
  }
});
