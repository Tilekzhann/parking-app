const express = require('express');
const bodyParser = require('body-parser');
const firebaseAdmin = require('firebase-admin');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

// ======================= FIREBASE INIT =======================
let serviceAccount;

try {
  const sa = JSON.parse(process.env.FIREBASE_CONFIG);

  console.log("PROJECT:", sa.project_id);
  console.log("CLIENT:", sa.client_email);
  console.log("PRIVATE KEY START:", sa.private_key?.slice(0, 30));
  console.log("KEY ID:", sa.private_key_id);

  serviceAccount = sa;

  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase инициализирован");

} catch (e) {
  console.error("❌ JSON ERROR:", e.message);
  process.exit(1);
}

const db = firebaseAdmin.firestore();

// ======================= FIRESTORE TEST =======================
async function testFirestore() {
  try {
    // Тест 1: получить токен
    const token = await firebaseAdmin.app().options.credential.getAccessToken();
    console.log("✅ Access token получен:", token.access_token?.slice(0, 20) + "...");

    // Тест 2: запрос к Firestore
    const snapshot = await db.collection('vehicles').get();
    console.log("✅ Firestore работает, документов:", snapshot.size);

  } catch (err) {
    console.error("❌ Firestore ошибка код:", err.code);
    console.error("❌ Firestore ошибка детали:", err.details);
    console.error("❌ Firestore ошибка message:", err.message);
    if (err.metadata) {
      console.error("❌ Metadata:", JSON.stringify([...err.metadata.internalRepr]));
    }
  }
}

testFirestore();

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

app.post('/vehicles/add-past', async (req, res) => {
  try {
    const { vehicleNumber, vehicleBrand, entryTime } = req.body;
    const vehicleRef = db.collection('vehicles').doc();
    const entryTimestamp = entryTime ? new Date(entryTime).toISOString() : new Date().toISOString();
    await vehicleRef.set({ vehicleNumber, vehicleBrand, entryTime: entryTimestamp, exitTime: null, totalAmount: 0, incasStatus: false });
    res.json({ success: true, message: 'Автомобиль добавлен задним числом!' });
  } catch (error) {
    console.error("Ошибка add-past:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

app.post('/vehicles/add-vehicle', async (req, res) => {
  try {
    const { vehicleNumber, vehicleBrand } = req.body;
    const vehicleRef = db.collection('vehicles').doc();
    await vehicleRef.set({ vehicleNumber, vehicleBrand, entryTime: new Date().toISOString(), exitTime: null, totalAmount: 0, incasStatus: false });
    res.json({ success: true, message: 'Автомобиль добавлен!' });
  } catch (error) {
    console.error("Ошибка add-vehicle:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

app.get('/admin/vehicles', async (req, res) => {
  try {
    const snapshot = await db.collection('vehicles').get();
    const vehicles = [];
    snapshot.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));
    res.json(vehicles);
  } catch (error) {
    console.error("Ошибка admin/vehicles:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

app.get('/guard/vehicles', async (req, res) => {
  try {
    const snapshot = await db.collection('vehicles').where('incasStatus', '==', false).get();
    const vehicles = [];
    snapshot.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));
    res.json(vehicles);
  } catch (error) {
    console.error("Ошибка guard/vehicles:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

app.put('/vehicles/:id/exit', async (req, res) => {
  try {
    const ref = db.collection('vehicles').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: true, message: 'Автомобиль не найден' });
    const entryTime = new Date(doc.data().entryTime);
    const exitTime = new Date();
    const hoursParked = Math.ceil((exitTime - entryTime) / (1000 * 60 * 60));
    let totalAmount = 1000;
    if (hoursParked > 24) totalAmount += (hoursParked - 24) * 41;
    await ref.update({ exitTime: exitTime.toISOString(), totalAmount });
    res.json({ success: true, message: `Выезд зафиксирован. Сумма: ${totalAmount} KZT` });
  } catch (error) {
    console.error("Ошибка exit:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

app.delete('/vehicles/:id', async (req, res) => {
  try {
    await db.collection('vehicles').doc(req.params.id).delete();
    res.json({ success: true, message: 'Автомобиль удалён!' });
  } catch (error) {
    console.error("Ошибка delete:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

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
    res.json({ totalAmount, vehicleCount, currentVehicles });
  } catch (error) {
    console.error("Ошибка report:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

app.put('/admin/incas', async (req, res) => {
  try {
    const snapshot = await db.collection('vehicles').where('exitTime', '!=', null).where('incasStatus', '==', false).get();
    if (snapshot.empty) return res.json({ message: 'Нет автомобилей для инкассации.', totalIncasAmount: 0 });
    let totalIncasAmount = 0;
    const batch = db.batch();
    snapshot.forEach(doc => {
      totalIncasAmount += doc.data().totalAmount || 0;
      batch.update(db.collection('vehicles').doc(doc.id), { incasStatus: true });
    });
    await batch.commit();
    res.json({ message: 'Инкассация завершена.', totalIncasAmount });
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
