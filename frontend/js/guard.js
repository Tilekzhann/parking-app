document.addEventListener('DOMContentLoaded', function () {
    const vehicleTableBody = document.getElementById('vehicle-table-body');
    const searchInput = document.getElementById('search-input'); // Исправленный ID
    const errorMsg = document.getElementById('error-msg');
    const addVehicleForm = document.getElementById('add-vehicle-form');

    // Проверка наличия элементов
    if (!vehicleTableBody || !searchInput || !addVehicleForm) {
        console.error('Не удается найти необходимые элементы в DOM.');
        return;
    }

   // Определяем базовый URL (локально → localhost, на сервере → Render)
const baseUrl = window.location.origin;

    // Загрузка автомобилей для охранника
    loadGuardVehicles();

    // Поиск автомобилей по номеру
    searchInput.addEventListener('input', function () {
        const searchTerm = searchInput.value.toLowerCase();
        const rows = vehicleTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const vehicleNumber = row.cells[0].textContent.toLowerCase();
            row.style.display = vehicleNumber.includes(searchTerm) ? '' : 'none';
        });
    });

    // Обработка формы добавления автомобиля
    addVehicleForm.addEventListener('submit', function (e) {
        e.preventDefault();
        addVehicle();
    });

    // Функция загрузки списка автомобилей для охранника
    function loadGuardVehicles() {
        fetch(`${baseURL}/guard/vehicles`)
            .then(response => {
                if (!response.ok) throw new Error('Ошибка при загрузке автомобилей');
                return response.json();
            })
            .then(data => {
                           // Сортировка по времени заезда (entryTime), от нового к старому
            data.sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime));

            vehicleTableBody.innerHTML = ''; 

                data.forEach(vehicle => {
                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${vehicle.vehicleBrand}</td>
                        <td>${vehicle.vehicleNumber}</td>
                        <td>${vehicle.entryTime ? new Date(vehicle.entryTime).toLocaleString() : '—'}</td>
                        <td>${vehicle.exitTime ? new Date(vehicle.exitTime).toLocaleString() : '—'}</td>
                        <td>${vehicle.totalAmount} KZT</td>
                        <td>
                            ${vehicle.exitTime ? '' : `<button class="exit-btn" data-id="${vehicle.id}">Фиксировать выезд</button>`}
                        </td>
                    `;
                    vehicleTableBody.appendChild(row);
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
                errorMsg.textContent = 'Ошибка при загрузке автомобилей.';
            });
    }

    // Функция для добавления нового автомобиля
    function addVehicle() {
        const vehicleNumber = document.getElementById('vehicle-number').value.trim();
        const vehicleBrand = document.getElementById('vehicle-brand').value.trim();

        if (!vehicleNumber || !vehicleBrand) {
            errorMsg.textContent = 'Пожалуйста, заполните все поля.';
            return;
        }

        fetch(`${baseURL}/vehicles/add-vehicle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vehicleNumber, vehicleBrand })
        })
        .then(response => {
            if (!response.ok) throw new Error('Ошибка при добавлении автомобиля.');
            return response.text();
        })
        .then(message => {
            alert(message);
            document.getElementById('vehicle-number').value = '';
            document.getElementById('vehicle-brand').value = '';
            errorMsg.textContent = ''; // Очищаем сообщение об ошибке
            loadGuardVehicles();
        })
        .catch(error => {
            console.error('Ошибка при добавлении автомобиля:', error);
            errorMsg.textContent = 'Ошибка при добавлении автомобиля.';
        });
    }
// Обработка выбора марки автомобиля
document.getElementById('vehicle-brand-select').addEventListener('change', function () {
    const selectedBrand = this.value;
    if (selectedBrand) {
        document.getElementById('vehicle-brand').value = selectedBrand; // Заполняем поле выбранной маркой
    }
});

    // Функция для фиксации выезда автомобиля
    function recordExit(vehicleId) {
        fetch(`${baseURL}/vehicles/${vehicleId}/exit`, {
            method: 'PUT'
        })
        .then(response => {
            if (!response.ok) throw new Error('Ошибка при фиксации выезда.');
            return response.text();
        })
        .then(message => {
            alert(message);
            loadGuardVehicles();
        })
        .catch(error => {
            console.error('Ошибка при фиксации выезда:', error);
            errorMsg.textContent = 'Ошибка при фиксации выезда.';
        });
    }
});
