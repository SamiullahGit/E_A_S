const token = localStorage.getItem('token');
const employeeId = localStorage.getItem('employee_id');

if (!token || !employeeId) {
    window.location.href = 'index.html';
}

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});

// Load attendance data
async function loadAttendance() {
    try {
        const response = await fetch(`${API_BASE}/api/employee/my-attendance?employee_id=${employeeId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const attendance = await response.json();
            displayAttendance(attendance);
            updateStats(attendance);
        }
    } catch (error) {
        showAlert('Failed to load attendance data', 'error');
    }
}

function displayAttendance(attendance) {
    const tbody = document.getElementById('attendance-body');
    tbody.innerHTML = '';

    attendance.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(record.date).toLocaleDateString()}</td>
            <td>${record.status}</td>
            <td>${new Date(record.marked_at).toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateStats(attendance) {
    const today = new Date().toDateString();
    const todayRecord = attendance.find(record => 
        new Date(record.date).toDateString() === today
    );
    
    document.getElementById('today-status').textContent = todayRecord ? todayRecord.status : 'Not Marked';
    document.getElementById('total-present').textContent = 
        attendance.filter(record => record.status === 'present').length;
}

// Mark attendance
document.getElementById('mark-attendance').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_BASE}/api/employee/mark-attendance?employee_id=${employeeId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Attendance marked successfully!', 'success');
            loadAttendance();
        } else {
            showAlert(data.detail, 'error');
        }
    } catch (error) {
        showAlert('Failed to mark attendance', 'error');
    }
});

function showAlert(message, type) {
    const alertContainer = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Initial load
loadAttendance();