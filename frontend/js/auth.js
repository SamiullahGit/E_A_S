const API_BASE = 'http://localhost:8000';

console.log('🔐 Auth.js loaded');

// DOM elements
const loginSection = document.getElementById('login-section');
const signupSection = document.getElementById('signup-section');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const requestOtpBtn = document.getElementById('request-otp');
const alertContainer = document.getElementById('alert-container');

console.log('🔧 DOM elements loaded:', {
    loginSection: !!loginSection,
    signupSection: !!signupSection,
    loginForm: !!loginForm,
    signupForm: !!signupForm
});

// Toggle between login and signup
showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('🔧 Switching to signup section');
    loginSection.classList.add('hidden');
    signupSection.classList.remove('hidden');
    clearAlerts();
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('🔧 Switching to login section');
    signupSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
    clearAlerts();
});

// Check if user is HR/Admin and toggle OTP fields
function toggleOtpFields(email) {
    console.log('🔧 Checking email for HR/Admin:', email);
    const securityGroup = document.querySelector('#security-group');
    const otpGroup = document.querySelector('#otp-group');
    
    if (email.includes('hr@') || email.includes('admin@')) {
        console.log('🔧 HR/Admin detected - hiding security fields');
        securityGroup.style.display = 'none';
        otpGroup.style.display = 'none';
        showAlert('HR/Admin login detected. Security questions and OTP are not required.', 'info');
    } else {
        console.log('🔧 Employee detected - showing security fields');
        securityGroup.style.display = 'block';
        otpGroup.style.display = 'block';
        clearAlerts();
    }
}

// Request OTP
// Request OTP
requestOtpBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    
    if (!email) {
        showAlert('Please enter your email first', 'error');
        return;
    }

    // Don't send OTP for HR/Admin
    if (email.includes('hr@') || email.includes('admin@')) {
        showAlert('HR/Admin accounts do not require OTP', 'info');
        return;
    }

    try {
        setButtonLoading(requestOtpBtn, true);
        
        const response = await fetch(`${API_BASE}/api/auth/request-otp?email=${encodeURIComponent(email)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit'
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('✅ OTP generated! Check your email for the OTP code.', 'success');
            console.log(`🔐 OTP requested for: ${email} - Check email or backend terminal`);
        } else {
            showAlert('❌ ' + (data.detail || 'Failed to generate OTP'), 'error');
        }
    } catch (error) {
        showAlert('Failed to generate OTP. Check if backend is running.', 'error');
        console.error('OTP Error:', error);
    } finally {
        setButtonLoading(requestOtpBtn, false);
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('🔧 Login form submitted');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const securityAnswer = document.getElementById('security-answer').value;
    const otp = document.getElementById('otp').value;

    console.log('🔧 Login attempt:', { email, passwordLength: password.length });

    if (!email || !password) {
        showAlert('Please fill in email and password', 'error');
        return;
    }

    // Prepare login data
    let loginData = {
        email,
        password
    };

    console.log('🔧 User type:', email.includes('hr@') || email.includes('admin@') ? 'HR/Admin' : 'Employee');

    // Only include security answer and OTP for non-HR/Admin users
    if (!email.includes('hr@') && !email.includes('admin@')) {
        if (!securityAnswer || !otp) {
            showAlert('Please fill in security answer and OTP', 'error');
            return;
        }
        loginData.security_answer = securityAnswer;
        loginData.otp = otp;
    } else {
        // For HR/Admin, send empty values that will be ignored by backend
        loginData.security_answer = "";
        loginData.otp = "";
    }

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    
    try {
        setButtonLoading(submitBtn, true);
        
        console.log('🔧 Sending login request:', { 
            email: loginData.email, 
            hasPassword: !!loginData.password,
            hasSecurityAnswer: !!loginData.security_answer,
            hasOTP: !!loginData.otp
        });
        
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit',
            body: JSON.stringify(loginData)
        });

        console.log('🔧 Login response status:', response.status);
        const data = await response.json();
        console.log('🔧 Login response data:', data);

        if (response.ok) {
            showAlert('Login successful! Redirecting...', 'success');
            console.log('🔧 Login successful! Role:', data.role);
            
            // Store user data
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('role', data.role);
            if (data.employee_id) {
                localStorage.setItem('employee_id', data.employee_id);
            }
            
            console.log('🔧 Stored in localStorage:', {
                token: !!localStorage.getItem('token'),
                role: localStorage.getItem('role'),
                employee_id: localStorage.getItem('employee_id')
            });
            
            // Redirect based on role
            setTimeout(() => {
                console.log('🔧 Redirecting to:', data.role + '_dashboard.html');
                switch(data.role) {
                    case 'employee':
                        window.location.href = 'employee_dashboard.html';
                        break;
                    case 'hr':
                        window.location.href = 'hr_dashboard.html';
                        break;
                    case 'admin':
                        window.location.href = 'admin_dashboard.html';
                        break;
                    default:
                        console.error('🔧 Unknown role:', data.role);
                        showAlert('Unknown user role', 'error');
                }
            }, 1000);
            
        } else {
            console.error('🔧 Login failed:', data.detail);
            showAlert(data.detail || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('🔧 Login network error:', error);
        showAlert('Login failed. Check if backend server is running on port 8000.', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
});

// Signup
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('🔧 Signup form submitted');
    
    const formData = {
        full_name: document.getElementById('full-name').value,
        email: document.getElementById('signup-email').value,
        cnic: document.getElementById('cnic').value,
        security_question: document.getElementById('security-question').value,
        security_answer: document.getElementById('security-answer-signup').value,
        password: document.getElementById('signup-password').value
    };

    console.log('🔧 Signup data:', { ...formData, password: '***' });

    // Validate required fields
    for (const [key, value] of Object.entries(formData)) {
        if (!value) {
            showAlert(`Please fill in ${key.replace('_', ' ')}`, 'error');
            return;
        }
    }

    const submitBtn = signupForm.querySelector('button[type="submit"]');
    
    try {
        setButtonLoading(submitBtn, true);
        
        const response = await fetch(`${API_BASE}/api/employee/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit',
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        console.log('🔧 Signup response:', data);

        if (response.ok) {
            showAlert('Registration successful! Waiting for HR approval.', 'success');
            signupForm.reset();
            setTimeout(() => {
                signupSection.classList.add('hidden');
                loginSection.classList.remove('hidden');
            }, 2000);
        } else {
            showAlert(data.detail || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('🔧 Signup error:', error);
        showAlert('Registration failed. Check if backend is running.', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
});

// Email input listener to auto-detect HR/Admin
document.getElementById('email').addEventListener('input', function() {
    const email = this.value;
    console.log('🔧 Email input changed:', email);
    if (email) {
        toggleOtpFields(email);
    }
});

// Utility functions
function setButtonLoading(button, isLoading) {
    const originalText = button.textContent;
    
    if (isLoading) {
        button.innerHTML = '⏳ Loading...';
        button.disabled = true;
    } else {
        if (button.id === 'request-otp') {
            button.innerHTML = 'Send OTP';
        } else if (button.type === 'submit') {
            if (button.closest('#login-form')) {
                button.innerHTML = '🚀 Login to Dashboard';
            } else {
                button.innerHTML = '📝 Register for Approval';
            }
        }
        button.disabled = false;
    }
}

function showAlert(message, type) {
    console.log('🔧 Showing alert:', type, message);
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function clearAlerts() {
    alertContainer.innerHTML = '';
}

window.addEventListener('load', async () => {
    console.log('🔐 Page loaded - Initializing security...');
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    await encryptionClient.init();
    
    console.log('🔧 Stored login data:', { token: !!token, role });
    
    if (token && role) {
        showAlert(`Welcome back! Redirecting to ${role} dashboard...`, 'success');
        setTimeout(() => {
            console.log('🔧 Auto-redirecting to:', role + '_dashboard.html');
            switch(role) {
                case 'employee':
                    window.location.href = 'employee_dashboard.html';
                    break;
                case 'hr':
                    window.location.href = 'hr_dashboard.html';
                    break;
                case 'admin':
                    window.location.href = 'admin_dashboard.html';
                    break;
            }
        }, 1000);
    }
    
    testBackendConnection();
});

function getPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (password.length >= 16) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};:'"<>?/\\|`~]/.test(password)) strength++;
    
    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'fair';
    if (strength <= 6) return 'good';
    return 'strong';
}

async function testBackendConnection() {
    try {
        console.log('🔐 Testing backend connection over HTTPS...');
        const response = await fetch(`${API_BASE}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit'
        });
        console.log('🔧 Backend response status:', response.status);
        if (!response.ok) {
            showAlert('Backend server is not responding. Make sure it\'s running on port 8000 with HTTPS.', 'error');
        } else {
            console.log('✅ Backend connection successful over HTTPS');
        }
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
        showAlert('Cannot connect to backend server. Start the backend on port 8000 with HTTPS.', 'error');
    }
}

console.log('🔧 Auth.js initialization complete');