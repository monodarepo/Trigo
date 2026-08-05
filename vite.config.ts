import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Deploy na raiz do domínio (Netlify/Vercel) — nunca subpasta ('/Trigo/').
  base: '/',
  plugins: [react()],
})
