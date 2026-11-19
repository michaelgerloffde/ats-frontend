import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Entwicklung: Vite leitet alle Anfragen an /api an das Backend auf Port 3000 weiter.
    // Für den Browser ist es dieselbe Adresse -> kein CORS nötig. Im Betrieb liefert Express beides aus.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
