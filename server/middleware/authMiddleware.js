const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // 1. Ambil header Authorization
  const authHeader = req.headers['authorization'];

  // 2. Cek jika header ada dan formatnya benar ('Bearer TOKEN')
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  // 3. Verifikasi token
  jwt.verify(token, process.env.JWT_SECRET, (err, admin) => {
    if (err) {
      return res.status(403).json({ error: 'Token tidak valid.' }); // 403 Forbidden
    }

    // Simpan data admin di request untuk digunakan oleh endpoint selanjutnya
    req.admin = admin;
    next(); // Lanjutkan ke endpoint yang dituju
  });
};

module.exports = authMiddleware;