import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- Import tailwindcss

export default defineConfig({
  // Daftarkan tailwindcss() sebagai plugin di sini
  plugins: [react(), tailwindcss()], 
})