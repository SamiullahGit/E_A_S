console.log('[INIT] Employee.js loading...');
const token = localStorage.getItem('token');
const employeeId = localStorage.getItem('employee_id');
let userLocation = null;
let hasLocationPermission = false;
let map = null;
let locationMarker = null;

console.log('[INIT] token:', token ? 'EXISTS' : 'MISSING');
console.log('[INIT] employeeId:', employeeId ? employeeId : 'MISSING');

if (!token || !employeeId) {
    console.error('[ERROR] Missing token or employeeId - redirecting to login');
    window.location.href = 'index.html';
}

async function loadEmployeeInfo() {
    try {
        console.log('[DEBUG] Loading employee info...');
        console.log('[DEBUG] employeeId:', employeeId);
        console.log('[DEBUG] API_BASE:', API_BASE);
        
        const response = await fetch(`${API_BASE}/api/debug/all-employees`, {
            headers: {'Authorization': `Bearer ${token}`}
        });
        
        console.log('[DEBUG] Response status:', response.status);
        
        if (response.ok) {
            const employees = await response.json();
            console.log('[DEBUG] Employees received:', employees);
            const employee = employees.find(e => e.id === parseInt(employeeId));
            console.log('[DEBUG] Found employee:', employee);
            
            if (employee) {
                const nameEl = document.querySelector('.employee-name');
                console.log('[DEBUG] Name element:', nameEl);
                if (nameEl) {
                    nameEl.textContent = employee.full_name;
                    console.log('[DEBUG] Name set to:', employee.full_name);
                }
                const avatarEl = document.querySelector('.employee-avatar');
                console.log('[DEBUG] Avatar element:', avatarEl);
                if (avatarEl) {
                    avatarEl.textContent = employee.full_name.charAt(0).toUpperCase();
                    console.log('[DEBUG] Avatar set to:', employee.full_name.charAt(0).toUpperCase());
                }
            } else {
                console.log('[DEBUG] Employee not found in list. Looking for id:', parseInt(employeeId));
            }
        } else {
            console.error('[ERROR] Response not OK:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Failed to load employee info:', error);
    }
}

function requestLocationPermission() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                hasLocationPermission = true;
                updateLocationStatus();
                initializeMap();
                showAlert('✅ Location enabled successfully', 'success');
            },
            (error) => {
                hasLocationPermission = false;
                updateLocationStatus();
                showAlert('❌ Location access denied. Please enable location to mark attendance.', 'error');
                console.error('Geolocation error:', error);
            },
            {enableHighAccuracy: false, timeout: 5000, maximumAge: 0}
        );
    } else {
        showAlert('❌ Geolocation is not supported by your browser.', 'error');
    }
}

function updateLocationStatus() {
    const statusEl = document.getElementById('location-status');
    if (hasLocationPermission && userLocation) {
        statusEl.innerHTML = `✅ Location enabled (Accuracy: ${userLocation.accuracy.toFixed(0)}m)`;
        statusEl.style.color = '#27ae60';
    } else {
        statusEl.innerHTML = '❌ Location disabled - Please enable to mark attendance';
        statusEl.style.color = '#e74c3c';
    }
}

function isLocationValid(lat, lon) {
    const ALLOWED_LAT_MIN = 33.60;
    const ALLOWED_LAT_MAX = 33.70;
    const ALLOWED_LON_MIN = 72.95;
    const ALLOWED_LON_MAX = 73.25;
    
    console.log('[DEBUG] Location validation check:');
    console.log('  Your coords: Lat=' + lat + ', Lon=' + lon);
    console.log('  Allowed range: Lat=' + ALLOWED_LAT_MIN + '-' + ALLOWED_LAT_MAX + ', Lon=' + ALLOWED_LON_MIN + '-' + ALLOWED_LON_MAX);
    
    return lat >= ALLOWED_LAT_MIN && lat <= ALLOWED_LAT_MAX && 
           lon >= ALLOWED_LON_MIN && lon <= ALLOWED_LON_MAX;
}

function initializeMap() {
    const mapContainer = document.getElementById('map');
    
    if (!map && userLocation) {
        mapContainer.style.display = 'block';
        
        setTimeout(() => {
            map = L.map('map').setView([userLocation.latitude, userLocation.longitude], 17);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
                minZoom: 13
            }).addTo(map);
            
            const NUST_LAT = 33.643;
            const NUST_LON = 73.184;
            
            L.circle([NUST_LAT, NUST_LON], {
                color: '#00ff9d',
                fillColor: '#00ff9d',
                fillOpacity: 0.1,
                radius: 1000,
                weight: 2,
                dashArray: '5, 5'
            }).addTo(map).bindPopup('<b>✅ Attendance Zone (NUST H-12)</b><br>You must be here to mark attendance');
            
            L.marker([NUST_LAT, NUST_LON], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                }),
                title: 'NUST H-12 Islamabad - Attendance Zone'
            }).addTo(map).bindPopup('<b>✅ NUST H-12 Islamabad</b><br>Attendance Zone Center');
            
            const isValid = isLocationValid(userLocation.latitude, userLocation.longitude);
            const iconUrl = isValid ? 
                'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png' :
                'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
            
            locationMarker = L.marker([userLocation.latitude, userLocation.longitude], {
                icon: L.icon({
                    iconUrl: iconUrl,
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                }),
                title: 'Your Current Location'
            }).addTo(map);
            
            const statusText = isValid ? 
                '<b>✅ You are INSIDE attendance zone</b><br>Ready to mark attendance' :
                '<b>❌ You are OUTSIDE attendance zone</b><br>Move to NUST H-12 to mark attendance';
            locationMarker.bindPopup(statusText).openPopup();
            
            map.invalidateSize();
        }, 100);
    } else if (map && userLocation) {
        map.setView([userLocation.latitude, userLocation.longitude], 17);
        if (locationMarker) {
            locationMarker.setLatLng([userLocation.latitude, userLocation.longitude]);
            const isValid = isLocationValid(userLocation.latitude, userLocation.longitude);
            const statusText = isValid ? 
                '<b>✅ You are INSIDE attendance zone</b><br>Ready to mark attendance' :
                '<b>❌ You are OUTSIDE attendance zone</b><br>Move to NUST H-12 to mark attendance';
            locationMarker.setPopupContent(statusText);
        }
    }
}



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

    if (attendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: rgba(224, 247, 250, 0.5);">No attendance records found</td></tr>';
        return;
    }

    attendance.forEach(record => {
        const row = document.createElement('tr');
        const statusClass = record.status === 'present' ? 'present' : 'absent';
        row.innerHTML = `
            <td>${new Date(record.date).toLocaleDateString()}</td>
            <td><div class="${statusClass}">${record.status === 'present' ? 'Present' : 'Absent'}</div></td>
            <td>${new Date(record.marked_at).toLocaleString()}</td>
            <td>${record.location_name || 'N/A'}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateStats(attendance) {
    const today = new Date().toDateString();
    const todayRecord = attendance.find(record => 
        new Date(record.date).toDateString() === today
    );
    
    const totalPresent = attendance.filter(record => record.status === 'present').length;
    const totalDays = attendance.length > 0 ? attendance.length : 1;
    const attendanceRate = Math.round((totalPresent / totalDays) * 100);
    
    const todayStatusEl = document.getElementById('today-status');
    if (todayStatusEl) {
        todayStatusEl.textContent = todayRecord ? (todayRecord.status === 'present' ? '✅ Present' : '❌ Absent') : 'Not Marked';
        todayStatusEl.style.color = todayRecord ? 
            (todayRecord.status === 'present' ? '#00ff9d' : '#ff006e') : '#ffbe0b';
    }
    
    const todayProgressEl = document.getElementById('today-progress');
    if (todayProgressEl) {
        todayProgressEl.style.width = todayRecord ? '100%' : '0%';
    }
    
    const presentEl = document.getElementById('total-present');
    if (presentEl) presentEl.textContent = totalPresent;
    
    const presentProgressEl = document.getElementById('present-progress');
    if (presentProgressEl && totalDays > 0) {
        presentProgressEl.style.width = Math.round((totalPresent / totalDays) * 100) + '%';
    }
    
    const rateEl = document.getElementById('attendance-rate');
    if (rateEl) rateEl.textContent = attendanceRate + '%';
    
    const rateProgressEl = document.getElementById('rate-progress');
    if (rateProgressEl) {
        rateProgressEl.style.width = attendanceRate + '%';
    }
}

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

function attachEventListeners() {
    console.log('[DEBUG] Attaching event listeners...');
    
    const enableLocationBtn = document.getElementById('enable-location');
    console.log('[DEBUG] Enable location button:', enableLocationBtn);
    if (enableLocationBtn) {
        enableLocationBtn.addEventListener('click', requestLocationPermission);
        console.log('[DEBUG] Enable location listener attached');
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    console.log('[DEBUG] Logout button:', logoutBtn);
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            console.log('[DEBUG] Logout clicked');
            localStorage.clear();
            window.location.href = 'index.html';
        });
        console.log('[DEBUG] Logout listener attached');
    }
    
    const markAttendanceBtn = document.getElementById('mark-attendance');
    console.log('[DEBUG] Mark attendance button:', markAttendanceBtn);
    if (markAttendanceBtn) {
        markAttendanceBtn.addEventListener('click', async () => {
            console.log('[DEBUG] Mark attendance clicked');
            if (!hasLocationPermission || !userLocation) {
                showAlert('❌ Please enable location first by clicking "Enable Location"', 'error');
                return;
            }

            if (!isLocationValid(userLocation.latitude, userLocation.longitude)) {
                showAlert('❌ You must be at NUST H-12 Islamabad to mark attendance', 'error');
                return;
            }

            console.log('📍 Current Location:', {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                accuracy: userLocation.accuracy
            });

            try {
                const button = document.getElementById('mark-attendance');
                button.disabled = true;
                button.textContent = '⏳ Marking...';

                const payloadData = {
                    employee_id: parseInt(employeeId),
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    location_name: "NUST H-12 Islamabad"
                };
                
                console.log('📤 Sending attendance payload:', payloadData);

                const response = await fetch(`${API_BASE}/api/employee/mark-attendance`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payloadData)
                });

                const data = await response.json();

                if (response.ok) {
                    showAlert('✅ Attendance marked successfully!', 'success');
                    button.textContent = '✅ Already Marked Today';
                    button.style.background = '#95a5a6';
                    loadAttendance();
                } else {
                    showAlert('❌ ' + data.detail, 'error');
                    button.disabled = false;
                    button.textContent = 'Mark Present';
                    console.log('❌ Backend Response:', data);
                }
            } catch (error) {
                showAlert('❌ Failed to mark attendance - Check backend connection', 'error');
                console.error('Error:', error);
                const button = document.getElementById('mark-attendance');
                button.disabled = false;
                button.textContent = 'Mark Present';
            }
        });
        console.log('[DEBUG] Mark attendance listener attached');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[DEBUG] DOMContentLoaded fired');
    console.log('[DEBUG] API_BASE:', typeof API_BASE !== 'undefined' ? API_BASE : 'UNDEFINED!');
    console.log('[DEBUG] token:', token ? 'EXISTS' : 'MISSING');
    console.log('[DEBUG] employeeId:', employeeId ? employeeId : 'MISSING');
    
    loadEmployeeInfo();
    updateLocationStatus();
    loadAttendance();
    setInterval(loadAttendance, 30000);
    
    setTimeout(() => {
        console.log('[DEBUG] Calling attachEventListeners after 500ms');
        attachEventListeners();
    }, 500);
});