import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/landing_page/',
  plugins: [
    react({
      babel: {
        compact: false
      }
    }),
    tailwindcss()
  ],
})
