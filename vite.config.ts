import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/qreate/',  // Ensure this matches your GitHub repository name exactly
  plugins: [react()]
})