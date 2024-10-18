const firebase = require('firebase-admin');

// Создание модели автомобиля
class Vehicle {
    constructor(id, vehicleNumber, vehicleBrand, entryTime, exitTime, totalAmount) {
        this.id = id;
        this.vehicleNumber = vehicleNumber;
        this.vehicleBrand = vehicleBrand;
        this.entryTime = entryTime;
        this.exitTime = exitTime;
        this.totalAmount = totalAmount;
    }

    // Метод для сохранения автомобиля в базе данных
    static async addVehicle(vehicleNumber, vehicleBrand) {
        const vehicleRef = firebase.firestore().collection('vehicles').doc();
        const vehicle = {
            vehicleNumber,
            vehicleBrand,
            entryTime: new Date().toISOString(),
            exitTime: null,
            totalAmount: 0
        };

        await vehicleRef.set(vehicle);
        return vehicle;
    }

    // Метод для получения всех автомобилей
    static async getAllVehicles() {
        const vehiclesSnapshot = await firebase.firestore().collection('vehicles').get();
        const vehicles = [];
        vehiclesSnapshot.forEach(doc => {
            const data = doc.data();
            vehicles.push(new Vehicle(doc.id, data.vehicleNumber, data.vehicleBrand, data.entryTime, data.exitTime, data.totalAmount));
        });
        return vehicles;
    }

    // Метод для обновления автомобиля при выезде
    static async exitVehicle(vehicleId) {
        const vehicleRef = firebase.firestore().collection('vehicles').doc(vehicleId);
        const vehicleDoc = await vehicleRef.get();

        if (!vehicleDoc.exists) {
            throw new Error('Vehicle not found');
        }

        const entryTime = new Date(vehicleDoc.data().entryTime);
        const exitTime = new Date();
        const hoursParked = Math.floor((exitTime - entryTime) / (1000 * 60 * 60));
        const totalAmount = hoursParked > 24 ? 700 + (hoursParked - 24) * 30 : 700;

        await vehicleRef.update({
            exitTime: exitTime.toISOString(),
            totalAmount
        });

        return totalAmount;
    }

    // Метод для удаления автомобиля
    static async deleteVehicle(vehicleId) {
        await firebase.firestore().collection('vehicles').doc(vehicleId).delete();
    }
}

module.exports = Vehicle;
