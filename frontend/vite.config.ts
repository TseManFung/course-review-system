import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['atlweb.freedynamicdns.net'],
    port: 54321,
    host: true
  },
  preview: {
    allowedHosts: ['atlweb.freedynamicdns.net']
  },
});
