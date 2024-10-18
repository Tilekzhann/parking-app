document.addEventListener('DOMContentLoaded', function () {
    loadVehicles(); // Загрузка списка автомобилей

    // Обработка формы добавления автомобиля
    document.getElementById('add-vehicle-form').addEventListener('submit', function (e) {
        e.preventDefault();
        addVehicle(); // Добавление нового автомобиля
    });

    // Логика поиска автомобилей по номеру
    document.getElementById('search-input').addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#vehicle-table-body tr');

        rows.forEach(row => {
            const vehicleNumber = row.querySelector('td').textContent.toLowerCase();
            if (vehicleNumber.includes(searchTerm)) {
                row.style.display = ''; // Показать строки, которые соответствуют поисковому запросу
            } else {
                row.style.display = 'none'; // Скрыть строки, которые не соответствуют
            }
        });
    });
});

// Функция для загрузки списка автомобилей
function loadVehicles() {
    fetch('http://localhost:3000/vehicles')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('vehicle-table-body');
            tableBody.innerHTML = '';

            data.forEach(vehicle => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${vehicle.vehicleNumber}</td>
                    <td>${vehicle.vehicleBrand}</td>
                    <td>${vehicle.entryTime ? new Date(vehicle.entryTime).toLocaleString() : '—'}</td>
                    <td>${vehicle.exitTime ? new Date(vehicle.exitTime).toLocaleString() : '—'}</td>
                    <td>${vehicle.totalAmount} KZT</td>
                    <td>
                        ${vehicle.exitTime ? '' : `<button class="exit-btn" data-id="${vehicle.id}">Фиксировать выезд</button>`}
                    </td>
                `;
                tableBody.appendChild(row);
            });

            // Добавляем обработчик для кнопок "Фиксировать выезд"
            document.querySelectorAll('.exit-btn').forEach(button => {
                button.addEventListener('click', function () {
                    const vehicleId = this.getAttribute('data-id');
                    recordExit(vehicleId);
                });
            });
        })
        .catch(error => {
            console.error('Ошибка при загрузке автомобилей:', error);
        });
}

// Функция для добавления нового автомобиля
function addVehicle() {
    const vehicleNumber = document.getElementById('vehicle-number').value;
    const vehicleBrand = document.getElementById('vehicle-brand').value;

    fetch('http://localhost:3000/vehicles/add-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleNumber, vehicleBrand })
    })
        .then(response => response.text())
        .then(data => {
            alert(data); // Показываем сообщение о добавлении
            loadVehicles(); // Перезагружаем список автомобилей
        })
        .catch(error => {
            console.error('Ошибка при добавлении автомобиля:', error);
        });
}

// Функция для фиксации выезда автомобиля
function recordExit(vehicleId) {
    fetch(`http://localhost:3000/vehicles/${vehicleId}/exit`, {
        method: 'PUT'
    })
        .then(response => response.text())
        .then(data => {
            alert(data); // Показываем сообщение о выезде
            loadVehicles(); // Перезагружаем список автомобилей
        })
        .catch(error => {
            console.error('Ошибка при фиксации выезда:', error);
        });
}
