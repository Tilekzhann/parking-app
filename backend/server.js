const express = require('express');
const bodyParser = require('body-parser');
const firebase = require('firebase-admin');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware для работы с JSON и разрешение CORS
app.use(bodyParser.json());
app.use(cors());

// Подключение Firebase через скачанный ключ
firebase.initializeApp({
  credential: firebase.credential.cert(require('./firebaseServiceAccount.json')),
  databaseURL: 'https://<your-database-name>.firebaseio.com' // Замени на свой URL Firebase базы данных
});

// Firestore инициализация
const db = firebase.firestore();

// Простой маршрут для проверки работы сервера
app.get('/', (req, res) => {
  res.send('Парковочное приложение работает!');
});

// Маршрут для добавления нового автомобиля
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

// Маршрут для получения всех автомобилей
app.get('/vehicles', async (req, res) => {
  try {
    const vehiclesSnapshot = await db.collection('vehicles').get();
    const vehiclesList = [];

    vehiclesSnapshot.forEach(doc => {
      vehiclesList.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(vehiclesList);
  } catch (error) {
    res.status(500).send('Ошибка получения списка автомобилей: ' + error.message);
  }
});

app.put('/vehicles/:id/exit', async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const vehicleRef = db.collection('vehicles').doc(vehicleId);
    const vehicleDoc = await vehicleRef.get();

    if (!vehicleDoc.exists) {
      return res.status(404).send('Автомобиль не найден');
    }

    const entryTime = new Date(vehicleDoc.data().entryTime);
    const exitTime = new Date();
    const millisecondsParked = exitTime - entryTime;
    const hoursParked = Math.ceil(millisecondsParked / (1000 * 60 * 60)); // Округляем до ближайшего большего

    let totalAmount = 700;
    if (hoursParked > 24) {
      const extraHours = hoursParked - 24;
      totalAmount += extraHours * 30; // 30 тенге за каждый дополнительный час
    }

    await vehicleRef.update({
      exitTime: exitTime.toISOString(),
      totalAmount: totalAmount
    });

    res.status(200).send(`Выезд зафиксирован. Общая сумма: ${totalAmount} KZT`);
  } catch (error) {
    res.status(500).send('Ошибка при обновлении данных автомобиля: ' + error.message);
  }
});


// Маршрут для удаления автомобиля
app.delete('/vehicles/:id', async (req, res) => {
  try {
    const vehicleId = req.params.id;
    await db.collection('vehicles').doc(vehicleId).delete();
    res.status(200).send('Автомобиль удалён успешно!');
  } catch (error) {
    res.status(500).send('Ошибка удаления автомобиля: ' + error.message);
  }
});

// Добавляем маршрут для получения отчёта для администратора
app.get('/admin/report', async (req, res) => {
  try {
    const vehiclesSnapshot = await db.collection('vehicles').get();
    let totalAmount = 0;
    let vehicleCount = 0;

    vehiclesSnapshot.forEach(doc => {
      totalAmount += doc.data().totalAmount || 0;
      vehicleCount++;
    });

    const report = {
      totalAmount: totalAmount,
      vehicleCount: vehicleCount
    };

    res.status(200).json(report);
  } catch (error) {
    res.status(500).send('Ошибка получения отчёта: ' + error.message);
  }
});
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === '123') {
    res.status(200).json({ role: 'admin' }); // Возвращаем JSON с ролью 'admin'
  } else if (username === 'guard' && password === '123') {
    res.status(200).json({ role: 'guard' }); // Возвращаем JSON с ролью 'guard'
  } else {
    res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
