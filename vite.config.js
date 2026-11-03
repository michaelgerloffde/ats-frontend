import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Für später: Sobald Dein Backend auf Port 3000 läuft, leitet Vite alle Anfragen
    // an /api dorthin weiter. Für den Browser sieht es aus wie dieselbe Adresse → kein CORS nötig.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
