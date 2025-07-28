const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('error', (err, client) => {
  console.error('❌ Terjadi error tak terduga pada koneksi database', err);
});

// Fungsi pembungkus (wrapper) dengan mekanisme retry
const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    // Cek jika error adalah karena koneksi diputus oleh admin (Neon)
    if (err.code === '57P00' || err.code === '57P01') {
      console.warn('⚠️ Koneksi database terputus oleh Neon, mencoba kembali...');
      // Coba lagi satu kali
      const res = await pool.query(text, params);
      return res;
    }
    // Jika error lain, lemparkan agar bisa ditangani di endpoint
    throw err;
  }
};

module.exports = {
  query,
  pool 
};