const jwt = require('jsonwebtoken');

const guestAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err || !payload.authorized || payload.slug !== req.params.slug) {
      return res.status(403).json({ error: 'Token tamu tidak valid untuk acara ini.' });
    }
    req.guest = payload;
    next();
  });
};

module.exports = guestAuthMiddleware;