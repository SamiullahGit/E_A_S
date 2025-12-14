const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

// Check authentication
if (!token || role !== 'admin') {
    alert('Access denied. Please login as Admin.');
    window.location.href = 'index.html';
}

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});

document.getElementById('refresh-btn').addEventListener('click', function() {
    const btn = this;
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    
    loadAttendance();
    
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }, 500);
});

// Load all attendance data
async function loadAttendance() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/all-attendance?t=${Date.now()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

        if (response.ok) {
            const attendance = await response.json();
            displayAttendance(attendance);
        } else if (response.status === 401) {
            throw new Error('Not authenticated. Please login again.');
        } else if (response.status === 403) {
            throw new Error('Not authorized. Admin access required.');
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to load attendance data');
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        if (error.message.includes('Failed to fetch')) {
            showAlert('Cannot connect to backend. Make sure backend is running on port 8000.', 'error');
        } else {
            showAlert(error.message, 'error');
        }
    }
}

// Display attendance in table
function displayAttendance(attendance) {
    const tbody = document.getElementById('attendance-body');
    
    if (attendance.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    No attendance records found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = attendance.map(record => `
        <tr>
            <td>${new Date(record.date).toLocaleDateString()}</td>
            <td>${record.employee_name}</td>
            <td><span class="employee-id">${record.employee_id}</span></td>
            <td>${record.department}</td>
            <td>
                <span class="status-${record.status}">
                    <i class="fas fa-${record.status === 'present' ? 'check' : 'times'}"></i>
                    ${record.status.toUpperCase()}
                </span>
            </td>
            <td>${record.location_name || 'N/A'}</td>
            <td><span class="coordinates">${record.latitude && record.longitude ? `${parseFloat(record.latitude).toFixed(4)}, ${parseFloat(record.longitude).toFixed(4)}` : 'N/A'}</span></td>
            <td><span class="time-display">${record.marked_at ? new Date(record.marked_at).toLocaleString() : 'N/A'}</span></td>
        </tr>
    `).join('');
}

// Alert function
function showAlert(message, type) {
    const alertContainer = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'success' ? 'success' : 'refresh'}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Debug function
async function debugStatus() {
    try {
        console.log('\n🔍 === ADMIN DASHBOARD DEBUG ===');
        console.log('🔑 Authentication:');
        console.log('   Token:', token ? '✅ Present' : '❌ Missing');
        console.log('   Role:', role || '❌ Missing');
        console.log('   Expected Role: admin');
        
        console.log('\n📊 Checking Backend Status...');
        const statusResponse = await fetch(`${API_BASE}/api/debug/status`);
        const statusData = await statusResponse.json();
        console.log('   Backend:', statusData.backend);
        console.log('   Database:', statusData.database);
        console.log('   Total Attendance Records:', statusData.total_attendance);
        console.log('   Total Employees:', statusData.total_employees);
        console.log('   Total Users:', statusData.total_users);
        
        console.log('\n📨 Testing Admin Endpoint...');
        const testResponse = await fetch(`${API_BASE}/api/admin/all-attendance`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('   Status Code:', testResponse.status);
        const testData = await testResponse.json();
        console.log('   Response:', testData);
        console.log('🔍 === END DEBUG ===\n');
    } catch (error) {
        console.error('❌ Debug Error:', error);
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Dashboard Loaded');
    
    loadAttendance();
    
    // Add auto-refresh every 30 seconds
    setInterval(loadAttendance, 30000);
});