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

// ======================= FIREBASE INIT =======================
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase инициализирован");
} catch (err) {
  console.error("❌ Ошибка инициализации Firebase:", err.message);
}
const db = firebaseAdmin.firestore();

// ======================= AUTH =======================
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  const users = {
    admin: { password: process.env.ADMIN_PASS || '123', role: 'admin' },
    guard: { password: process.env.GUARD_PASS || '123', role: 'guard' }
  };

  if (users[username] && users[username].password === password) {
    return res.status(200).json({ role: users[username].role });
  }
  return res.status(401).json({ error: true, message: 'Неверное имя пользователя или пароль' });
});

// ======================= VEHICLES =======================

// Добавление автомобиля задним числом
app.post('/vehicles/add-past', async (req, res) => {
  try {
    const { vehicleNumber, vehicleBrand, entryTime } = req.body;
    const vehicleRef = db.collection('vehicles').doc();

    const entryTimestamp = entryTime ? new Date(entryTime).toISOString() : new Date().toISOString();

    await vehicleRef.set({
      vehicleNumber,
      vehicleBrand,
      entryTime: entryTimestamp,
      exitTime: null,
      totalAmount: 0,
      incasStatus: false
    });

    res.status(200).json({ success: true, message: 'Автомобиль добавлен задним числом!' });
  } catch (error) {
    console.error("Ошибка add-past:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// Добавление автомобиля (обычное)
app.post('/vehicles/add-vehicle', async (req, res) => {
  try {
    const { vehicleNumber, vehicleBrand } = req.body;
    const vehicleRef = db.collection('vehicles').doc();

    await vehicleRef.set({
      vehicleNumber,
      vehicleBrand,
      entryTime: new Date().toISOString(),
      exitTime: null,
      totalAmount: 0,
      incasStatus: false
    });

    res.status(200).json({ success: true, message: 'Автомобиль добавлен!' });
  } catch (error) {
    console.error("Ошибка add-vehicle:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// Список автомобилей (админ)
app.get('/admin/vehicles', async (req, res) => {
  try {
    const snapshot = await db.collection('vehicles').get();
    const vehicles = [];
    snapshot.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));
    res.status(200).json(vehicles);
  } catch (error) {
    console.error("Ошибка admin/vehicles:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// Список автомобилей (охранник)
app.get('/guard/vehicles', async (req, res) => {
  try {
    const snapshot = await db.collection('vehicles').where('incasStatus', '==', false).get();
    const vehicles = [];
    snapshot.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));
    res.status(200).json(vehicles);
  } catch (error) {
    console.error("Ошибка guard/vehicles:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// Фиксация выезда
app.put('/vehicles/:id/exit', async (req, res) => {
  try {
    const id = req.params.id;
    const ref = db.collection('vehicles').doc(id);
    const doc = await ref.get();

    if (!doc.exists) return res.status(404).json({ error: true, message: 'Автомобиль не найден' });

    const entryTime = new Date(doc.data().entryTime);
    const exitTime = new Date();
    const hoursParked = Math.ceil((exitTime - entryTime) / (1000 * 60 * 60));

    let totalAmount = 700;
    if (hoursParked > 24) {
      totalAmount += (hoursParked - 24) * 29;
    }

    await ref.update({
      exitTime: exitTime.toISOString(),
      totalAmount
    });

    res.status(200).json({ success: true, message: `Выезд зафиксирован. Общая сумма: ${totalAmount} KZT` });
  } catch (error) {
    console.error("Ошибка exit:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// Удаление авто
app.delete('/vehicles/:id', async (req, res) => {
  try {
    await db.collection('vehicles').doc(req.params.id).delete();
    res.status(200).json({ success: true, message: 'Автомобиль удалён!' });
  } catch (error) {
    console.error("Ошибка delete:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// Отчёт админа
app.get('/admin/report', async (req, res) => {
  try {
    const snapshot = await db.collection('vehicles').get();
    let totalAmount = 0, vehicleCount = 0, currentVehicles = 0;

    snapshot.forEach(doc => {
      const v = doc.data();
      totalAmount += v.totalAmount || 0;
      vehicleCount++;
      if (!v.exitTime) currentVehicles++;
    });

    res.status(200).json({ totalAmount, vehicleCount, currentVehicles });
  } catch (error) {
    console.error("Ошибка report:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// Инкассация
app.put('/admin/incas', async (req, res) => {
  try {
    const snapshot = await db.collection('vehicles')
      .where('exitTime', '!=', null)
      .where('incasStatus', '==', false)
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ message: 'Нет автомобилей для инкассации.', totalIncasAmount: 0 });
    }

    let totalIncasAmount = 0;
    const batch = db.batch();
    snapshot.forEach(doc => {
      const data = doc.data();
      totalIncasAmount += data.totalAmount || 0;
      batch.update(db.collection('vehicles').doc(doc.id), { incasStatus: true });
    });

    await batch.commit();
    res.status(200).json({ message: 'Инкассация завершена.', totalIncasAmount });
  } catch (error) {
    console.error("Ошибка инкассации:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// ======================= FRONTEND =======================
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// ======================= START =======================
app.listen(port, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${port}`);
});
