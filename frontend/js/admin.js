document.addEventListener('DOMContentLoaded', function () {
    const vehicleTableBody = document.getElementById('vehicle-table-body');
    const searchInput = document.getElementById('search');
    const reportSection = document.getElementById('report');
    const errorMsg = document.getElementById('error-msg');
    const reportButton = document.getElementById('show-report');
    const incasButton = document.getElementById('incas-button');
    const incasAmountDisplay = document.getElementById('incas-amount');
    const addVehicleForm = document.getElementById('add-vehicle-past-form');
    let incasAmount = 0;

    // Определяем базовый URL (локально → localhost, на сервере → Render)
const baseUrl = window.location.origin;

    // Загрузка автомобилей для администратора
    loadAdminVehicles();

    // Поиск автомобилей по номеру
    searchInput.addEventListener('input', function () {
        const searchTerm = searchInput.value.toLowerCase();
        const rows = vehicleTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const vehicleNumber = row.cells[0].textContent.toLowerCase();
            row.style.display = vehicleNumber.includes(searchTerm) ? '' : 'none';
        });
    });

    // Функция загрузки списка автомобилей для администратора
    function loadAdminVehicles() {
        fetch(`${baseURL}/admin/vehicles`)
            .then(response => {
                if (!response.ok) throw new Error('Ошибка при загрузке автомобилей');
                return response.json();
            })
            .then(data => {
		  data.sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime));
                vehicleTableBody.innerHTML = ''; // Очищаем таблицу
                incasAmount = 0; // Обнуляем сумму инкассации

                data.forEach(vehicle => {
                    const row = document.createElement('tr');

                    // Устанавливаем цвет строки в зависимости от статуса инкассации
                    if (vehicle.exitTime) {
                        row.classList.add(vehicle.incasStatus ? 'incas-vehicle' : 'exited-vehicle');
                    } else {
                        row.classList.add('current-vehicle');
                    }

                    row.innerHTML = `
                        <td>${vehicle.vehicleBrand}</td>
                        <td>${vehicle.vehicleNumber}</td>
                        <td>${vehicle.entryTime ? new Date(vehicle.entryTime).toLocaleString() : '—'}</td>
                        <td>${vehicle.exitTime ? new Date(vehicle.exitTime).toLocaleString() : '—'}</td>
                        <td>${vehicle.totalAmount} KZT</td>
                        <td>
                            ${vehicle.exitTime ? '' : `<button class="exit-btn" data-id="${vehicle.id}">Фиксировать выезд</button>`}
                            <button class="delete-btn" data-id="${vehicle.id}">Удалить</button>
                        </td>
                    `;
                    vehicleTableBody.appendChild(row);

                    // Добавляем к сумме для инкассации, если автомобиль не инкассирован
                    if (vehicle.exitTime && !vehicle.incasStatus) {
                        incasAmount += vehicle.totalAmount;
                    }
                });

                // Обновление отображения суммы к инкассации
                incasAmountDisplay.textContent = `Сумма к инкассации: ${incasAmount} KZT`;

                // Добавляем обработчик для кнопок "Фиксировать выезд"
                document.querySelectorAll('.exit-btn').forEach(button => {
                    button.addEventListener('click', function () {
                        const vehicleId = this.getAttribute('data-id');
                        recordExit(vehicleId);
                    });
                });

                // Добавляем обработчик для кнопок "Удалить"
                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', function () {
                        const vehicleId = this.getAttribute('data-id');
                        deleteVehicle(vehicleId);
                    });
                });
            })
            .catch(error => {
                console.error('Ошибка при загрузке автомобилей:', error);
                errorMsg.textContent = 'Ошибка при загрузке автомобилей.';
            });
    }

    // Функция фиксации выезда автомобиля
    function recordExit(vehicleId) {
        fetch(`${baseURL}/vehicles/${vehicleId}/exit`, { method: 'PUT' })
            .then(response => {
                if (!response.ok) throw new Error('Ошибка при фиксации выезда');
                return response.text();
            })
            .then(message => {
                alert(message);
                loadAdminVehicles(); // Перезагружаем список автомобилей
            })
            .catch(error => {
                console.error('Ошибка при фиксации выезда:', error);
                errorMsg.textContent = 'Ошибка при фиксации выезда.';
            });
    }

    // Функция для удаления автомобиля
    function deleteVehicle(vehicleId) {
        if (confirm('Вы уверены, что хотите удалить этот автомобиль?')) {
            fetch(`${baseURL}/vehicles/${vehicleId}`, { method: 'DELETE' })
                .then(response => {
                    if (!response.ok) throw new Error('Ошибка при удалении автомобиля');
                    return response.text();
                })
                .then(message => {
                    alert(message);
                    loadAdminVehicles(); // Перезагружаем список автомобилей
                })
                .catch(error => {
                    console.error('Ошибка при удалении автомобиля:', error);
                    errorMsg.textContent = 'Ошибка при удалении автомобиля.';
                });
        }
    }

    // Добавление автомобиля задним числом
    addVehicleForm.addEventListener('submit', function (e) {
        e.preventDefault();
        addVehiclePast();
    });

   function addVehiclePast() {
    const vehicleNumber = document.getElementById('vehicle-number-past').value;
    const vehicleBrand = document.getElementById('vehicle-brand-past').value;
    const entryDate = document.getElementById('entry-date-past').value;
    const entryTime = document.getElementById('entry-time-past').value;

    if (!entryDate || !entryTime) {
        errorMsg.textContent = 'Укажите дату и время заезда.';
        return;
    }

    const entryDateTime = new Date(`${entryDate}T${entryTime}`).toISOString();

    fetch(`${baseURL}/vehicles/add-past`, { // Обновленный маршрут
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleNumber, vehicleBrand, entryTime: entryDateTime })
    })
        .then(response => {
            if (!response.ok) throw new Error('Ошибка при добавлении автомобиля задним числом.');
            return response.text();
        })
        .then(message => {
            alert(message);
            loadAdminVehicles(); // Перезагружаем список автомобилей
        })
        .catch(error => {
            console.error('Ошибка при добавлении автомобиля задним числом:', error);
            errorMsg.textContent = 'Ошибка при добавлении автомобиля задним числом.';
        });
}


    // Функция для инкассации
    incasButton.addEventListener('click', function () {
        if (incasAmount > 0) {
            fetch(`${baseURL}/admin/incas`, { method: 'PUT' })
                .then(response => response.json())
                .then(data => {
                    if (data.message === 'Инкассация завершена.') {
                        alert(`Инкассация завершена. Сумма: ${data.totalIncasAmount} KZT`);
                        incasAmount = 0;
                        incasAmountDisplay.textContent = 'Сумма к инкассации: 0 KZT';
                        loadAdminVehicles(); // Перезагружаем список после инкассации
                    } else {
                        alert(data.message);
                    }
                })
                .catch(error => {
                    console.error('Ошибка при инкассации:', error);
                    errorMsg.textContent = 'Ошибка при инкассации.';
                });
        } else {
            alert('Нет средств для инкассации.');
        }
    });

    // Функция для показа отчета
    reportButton.addEventListener('click', function () {
        reportSection.classList.toggle('hidden');
        if (!reportSection.classList.contains('hidden')) {
            loadReport();
        }
    });

    // Функция загрузки отчета
    function loadReport() {
        fetch(`${baseURL}/admin/report`)
            .then(response => response.json())
            .then(data => {
                if (!data || typeof data.totalAmount !== 'number' || typeof data.vehicleCount !== 'number' || typeof data.currentVehicles !== 'number') {
                    throw new Error('Неверный формат данных отчёта');
                }

                reportSection.innerHTML = `
                    <h3>Отчёт</h3>
                    <p>Количество всех автомобилей: ${data.vehicleCount}</p>
                    <p>Текущее количество автомобилей на парковке: ${data.currentVehicles}</p>
                    <p>Общая сумма: ${data.totalAmount} KZT</p>
                `;
            })
            .catch(error => {
                console.error('Ошибка при получении отчёта:', error);
                errorMsg.textContent = 'Ошибка при загрузке отчёта.';
            });
    }
});
