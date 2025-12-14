const API_BASE = 'http://localhost:8000';
const API_BASE = typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:8000';

console.log('🔧 Role Auth.js loaded successfully');

function initializeRoleLogin(roleType) {
    const loginSection = document.getElementById('login-section');
    const loginForm = document.getElementById('login-form');
    const requestOtpBtn = document.getElementById('request-otp');
    const alertContainer = document.getElementById('alert-container');

    console.log(`🔧 Initializing ${roleType} login`);

    requestOtpBtn.addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        
        if (!email) {
            showAlert('❌ Please enter your email address first', 'error', alertContainer);
            return;
        }

        try {
            setButtonLoading(requestOtpBtn, true);
            
            const response = await fetch(`${API_BASE}/api/auth/request-otp?email=${encodeURIComponent(email)}`, {
                method: 'POST'
            });

            const data = await response.json();

            if (response.ok) {
                showAlert('✅ OTP sent successfully! Check your email for the code.', 'success', alertContainer);
                console.log(`🔐 OTP requested for: ${email}`);
            } else {
                showAlert('❌ ' + (data.detail || 'Failed to send OTP. Please check your email and try again.'), 'error', alertContainer);
            }
        } catch (error) {
            showAlert('❌ Cannot reach backend server. Make sure it is running on port 8000.', 'error', alertContainer);
            console.error('OTP Error:', error);
        } finally {
            setButtonLoading(requestOtpBtn, false);
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log(`🔧 ${roleType} login form submitted`);
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const securityAnswer = document.getElementById('security-answer').value;
        const otp = document.getElementById('otp').value;

        if (!email) {
            showAlert('❌ Please enter your email address', 'error', alertContainer);
            return;
        }

        if (!password) {
            showAlert('❌ Please enter your password', 'error', alertContainer);
            return;
        }

        if (!securityAnswer) {
            showAlert('❌ Please answer your security question', 'error', alertContainer);
            return;
        }

        if (!otp) {
            showAlert('❌ Please enter the OTP from your email', 'error', alertContainer);
            return;
        }

        const loginData = {
            email,
            password,
            security_answer: securityAnswer,
            otp
        };

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        
        try {
            setButtonLoading(submitBtn, true);
            
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            const data = await response.json();

            if (response.ok) {
                showAlert('✅ Login successful! Redirecting to dashboard...', 'success', alertContainer);
                
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('role', data.role);
                
                setTimeout(() => {
                    if (data.role === 'hr') {
                        window.location.href = 'hr_dashboard.html';
                    } else if (data.role === 'admin') {
                        window.location.href = 'admin_dashboard.html';
                    }
                }, 1000);
                
            } else {
                console.error(`🔧 ${roleType} login failed:`, data.detail);
                const errorMsg = data.detail || 'Login failed';
                if (errorMsg.toLowerCase().includes('password')) {
                    showAlert('❌ Invalid password. Please try again.', 'error', alertContainer);
                } else if (errorMsg.toLowerCase().includes('security')) {
                    showAlert('❌ Incorrect security answer. Please try again.', 'error', alertContainer);
                } else if (errorMsg.toLowerCase().includes('otp')) {
                    showAlert('❌ Invalid or expired OTP. Request a new one.', 'error', alertContainer);
                } else if (errorMsg.toLowerCase().includes('email')) {
                    showAlert('❌ Email not found or account not approved.', 'error', alertContainer);
                } else {
                    showAlert('❌ ' + errorMsg, 'error', alertContainer);
                }
            }
        } catch (error) {
            console.error(`🔧 ${roleType} login network error:`, error);
            showAlert('❌ Cannot reach backend server. Make sure it is running on port 8000.', 'error', alertContainer);
        } finally {
            setButtonLoading(submitBtn, false);
        }
    });

    window.addEventListener('load', () => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        
        if (token && role && role === roleType) {
            showAlert(`Welcome back! Redirecting...`, 'success', alertContainer);
            setTimeout(() => {
                if (roleType === 'hr') {
                    window.location.href = 'hr_dashboard.html';
                } else if (roleType === 'admin') {
                    window.location.href = 'admin_dashboard.html';
                }
            }, 1000);
        }
        
        testBackendConnection();
    });
}

function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.innerHTML = '⏳ Loading...';
        button.disabled = true;
    } else {
        if (button.id === 'request-otp') {
            button.innerHTML = 'Send OTP';
        } else if (button.type === 'submit') {
            button.innerHTML = '🚀 Login to Dashboard';
        }
        button.disabled = false;
    }
}

function showAlert(message, type, container) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    container.innerHTML = '';
    container.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

async function testBackendConnection() {
    try {
        const response = await fetch(`${API_BASE}/`);
        if (!response.ok) {
            const alertContainer = document.getElementById('alert-container');
            showAlert('Backend server is not responding. Please start it on port 8000.', 'error', alertContainer);
        }
    } catch (error) {
        const alertContainer = document.getElementById('alert-container');
        showAlert('Cannot connect to backend server on port 8000.', 'error', alertContainer);
    }
}

console.log('🔧 Role Auth.js initialization complete');
