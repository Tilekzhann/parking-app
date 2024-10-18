const express = require('express');
const router = express.Router();
const Vehicle = require('../models/vehicle');

// Добавление автомобиля
router.post('/add-vehicle', async (req, res) => {
    const { vehicleNumber, vehicleBrand } = req.body;
    try {
        const vehicle = await Vehicle.addVehicle(vehicleNumber, vehicleBrand);
        res.status(200).send('Vehicle added successfully!');
    } catch (error) {
        res.status(500).send('Error adding vehicle: ' + error.message);
    }
});

// Получение всех автомобилей
router.get('/', async (req, res) => {
    try {
        const vehicles = await Vehicle.getAllVehicles();
        res.status(200).json(vehicles);
    } catch (error) {
        res.status(500).send('Error retrieving vehicles: ' + error.message);
    }
});

// Фиксация выезда автомобиля
router.put('/:id/exit', async (req, res) => {
    const vehicleId = req.params.id;
    try {
        const totalAmount = await Vehicle.exitVehicle(vehicleId);
        res.status(200).send(`Vehicle exit recorded. Total amount: ${totalAmount} KZT`);
    } catch (error) {
        res.status(500).send('Error exiting vehicle: ' + error.message);
    }
});

// Удаление автомобиля
router.delete('/:id', async (req, res) => {
    const vehicleId = req.params.id;
    try {
        await Vehicle.deleteVehicle(vehicleId);
        res.status(200).send('Vehicle deleted successfully!');
    } catch (error) {
        res.status(500).send('Error deleting vehicle: ' + error.message);
    }
});

module.exports = router;
