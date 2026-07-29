import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      // Vain ZAP-kutsut ohjataan eteenpäin ZAP-ohjelmalle (esim. portti 8080 tai ZAP:n oma portti)
      '/zap-api': {
        target: 'http://localhost:8080', // ZAP kuuntelee nyt oikeasti täällä!
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/zap-api/, ''),
        secure: false,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})