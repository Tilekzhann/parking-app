document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.role === 'admin') {
            window.location.href = 'admin.html';
        } else if (data.role === 'guard') {
            window.location.href = 'guard.html';
        } else {
            document.getElementById('error-msg').textContent = 'Invalid login';
        }
    })
    .catch(() => {
        document.getElementById('error-msg').textContent = 'Login failed. Try again.';
    });
});
