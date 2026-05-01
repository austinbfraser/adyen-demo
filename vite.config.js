import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [TanStackRouterVite({ autoCodeSplitting: true }), react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/handleShopperRedirect': 'http://localhost:8080',
    },
  },
})
