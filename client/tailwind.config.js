/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
      // 1. Tambahkan path ke komponen Flowbite-React di sini
      "./node_modules/flowbite-react/lib/esm/**/*.js",
    ],
    theme: {
      extend: {
        fontFamily: { // <-- Tambahkan blok ini
          'signature': ['"Dancing Script"', 'cursive'],
      },
    },
    },
    // 2. Tambahkan plugin Flowbite di sini
    plugins: [
      require('flowbite/plugin'),
    ],
  }