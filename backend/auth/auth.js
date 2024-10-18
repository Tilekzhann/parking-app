const express = require('express');
const router = express.Router();

// Простой пример логина
const users = {
  admin: { password: 'admin123', role: 'admin' },
  guard: { password: 'guard123', role: 'guard' }
};

// Обработка логина
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (users[username] && users[username].password === password) {
    return res.status(200).json({ role: users[username].role });
  } else {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
});

module.exports = router;
