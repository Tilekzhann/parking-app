document.addEventListener('DOMContentLoaded', function () {
    const vehicleTableBody = document.getElementById('vehicle-table-body');
    const searchInput = document.getElementById('search-input');
    const errorMsg = document.getElementById('error-msg');
    const addVehicleForm = document.getElementById('add-vehicle-form');

    if (!vehicleTableBody || !searchInput || !addVehicleForm) {
        console.error('Не удается найти необходимые элементы в DOM.');
        return;
    }

    // Единый базовый URL
    const BASE_URL = window.location.origin;

    loadGuardVehicles();

    searchInput.addEventListener('input', function () {
        const searchTerm = searchInput.value.toLowerCase();
        const rows = vehicleTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const vehicleNumber = row.cells[0].textContent.toLowerCase();
            row.style.display = vehicleNumber.includes(searchTerm) ? '' : 'none';
        });
    });

    addVehicleForm.addEventListener('submit', function (e) {
        e.preventDefault();
        addVehicle();
    });

    function loadGuardVehicles() {
        fetch(`${BASE_URL}/guard/vehicles`)
            .then(response => {
                if (!response.ok) throw new Error('Ошибка при загрузке автомобилей');
                return response.json();
            })
            .then(data => {
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

    function addVehicle() {
        const vehicleNumber = document.getElementById('vehicle-number').value.trim();
        const vehicleBrand = document.getElementById('vehicle-brand').value.trim();

        if (!vehicleNumber || !vehicleBrand) {
            errorMsg.textContent = 'Пожалуйста, заполните все поля.';
            return;
        }

        fetch(`${BASE_URL}/vehicles/add-vehicle`, {
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
            errorMsg.textContent = '';
            loadGuardVehicles();
        })
        .catch(error => {
            console.error('Ошибка при добавлении автомобиля:', error);
            errorMsg.textContent = 'Ошибка при добавлении автомобиля.';
        });
    }

    document.getElementById('vehicle-brand-select').addEventListener('change', function () {
        const selectedBrand = this.value;
        if (selectedBrand) {
            document.getElementById('vehicle-brand').value = selectedBrand;
        }
    });

    function recordExit(vehicleId) {
        fetch(`${BASE_URL}/vehicles/${vehicleId}/exit`, { method: 'PUT' })
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
