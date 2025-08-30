document.addEventListener('DOMContentLoaded', function () {
    const vehicleTableBody = document.getElementById('vehicle-table-body');
    const searchInput = document.getElementById('search');

    // Определяем базовый URL (локально → localhost, на сервере → Render URL)
    const baseUrl = window.location.origin;

    // Функция для загрузки списка автомобилей
    function loadVehicles() {
        fetch(`${baseUrl}/vehicles`)
            .then(response => response.json())
            .then(vehicles => {
                vehicleTableBody.innerHTML = '';
                vehicles.forEach(vehicle => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${vehicle.vehicleNumber}</td>
                        <td>${vehicle.vehicleBrand}</td>
                        <td>${new Date(vehicle.entryTime).toLocaleString()}</td>
                        <td>${vehicle.exitTime ? new Date(vehicle.exitTime).toLocaleString() : 'Ещё на парковке'}</td>
                        <td>${vehicle.totalAmount || 0} KZT</td>
                        <td><button onclick="deleteVehicle('${vehicle.id}')">Удалить</button></td>
                    `;
                    vehicleTableBody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Ошибка загрузки данных:', error);
            });
    }

    // Логика для поиска
    searchInput.addEventListener('input', function () {
        const searchTerm = searchInput.value.toLowerCase();
        const rows = vehicleTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const vehicleNumber = row.cells[0].textContent.toLowerCase();
            row.style.display = vehicleNumber.includes(searchTerm) ? '' : 'none';
        });
    });

    // Функция для удаления автомобиля
    window.deleteVehicle = function (id) {
        fetch(`${baseUrl}/vehicles/${id}`, { method: 'DELETE' })
            .then(() => loadVehicles())
            .catch(error => {
                console.error('Ошибка при удалении автомобиля:', error);
            });
    };

    // Функция для загрузки отчёта
    function loadReport() {
        fetch(`${baseUrl}/admin/report`)
            .then(response => response.json())
            .then(data => {
                const reportSection = document.getElementById('report');
                reportSection.innerHTML = `
                    <h3>Отчёт</h3>
                    <p>Количество автомобилей: ${data.vehicleCount}</p>
                    <p>Общая сумма: ${data.totalAmount} KZT</p>
                `;
            })
            .catch(error => {
                console.error('Ошибка при получении отчёта:', error);
                document.getElementById('error-msg').textContent = 'Ошибка при загрузке отчёта.';
            });
    }

    // При загрузке страницы
    window.addEventListener('load', function () {
        loadVehicles();
        loadReport();
    });
});
