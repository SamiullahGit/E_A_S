const API_BASE = 'http://localhost:8000';

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    if (password.length < 10) {
        return 'Password must be at least 10 characters long';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must include lowercase letters (a-z)';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must include uppercase letters (A-Z)';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must include numbers (0-9)';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};:'",./<>?\\|`~]/.test(password)) {
        return 'Password must include special characters (!@#$%^&*...)';
    }
    return null;
}

console.log('🔧 Employee Auth.js loaded successfully');

document.addEventListener('DOMContentLoaded', function() {
    const loginSection = document.getElementById('login-section');
    const signupSection = document.getElementById('signup-section');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const requestOtpBtn = document.getElementById('request-otp');
    const alertContainer = document.getElementById('alert');

    function showAlert(message, type) {
        if (!alertContainer) return;
        
        alertContainer.textContent = message;
        alertContainer.style.display = 'block';
        
        if (type === 'error') {
            alertContainer.style.background = 'rgba(255, 69, 96, 0.12)';
            alertContainer.style.borderLeftColor = '#FF4560';
            alertContainer.style.color = '#FF4560';
        } else {
            alertContainer.style.background = 'rgba(0, 209, 160, 0.12)';
            alertContainer.style.borderLeftColor = '#00d1a0';
            alertContainer.style.color = '#00d1a0';
        }
        
        const timeout = type === 'success' ? 4000 : 5000;
        setTimeout(() => {
            if (alertContainer) alertContainer.style.display = 'none';
        }, timeout);
    }

    function clearAlerts() {
        if (alertContainer) alertContainer.innerHTML = '';
    }

    function setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.innerHTML = '⏳ Loading...';
            button.disabled = true;
        } else {
            if (button.id === 'request-otp') {
                button.innerHTML = 'Send OTP to Email';
            } else if (button.type === 'submit') {
                const form = button.closest('form');
                if (form && form.id === 'login-form') {
                    button.textContent = 'Login to Dashboard';
                } else if (form && form.id === 'signup-form') {
                    button.textContent = 'Create Employee Account';
                }
            }
            button.disabled = false;
        }
    }

    if (showSignup) {
        showSignup.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔧 Switching to signup section');
            if (loginSection) loginSection.classList.add('hidden');
            if (signupSection) signupSection.classList.remove('hidden');
            clearAlerts();
        });
    }

    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔧 Switching to login section');
            if (signupSection) signupSection.classList.add('hidden');
            if (loginSection) loginSection.classList.remove('hidden');
            clearAlerts();
        });
    }

    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            if (e.target.closest('.back-btn').getAttribute('href') === 'role-select.html') {
                e.preventDefault();
                showAlert('↩️ Returning to role selection...', 'success');
                setTimeout(() => {
                    window.location.href = 'role-select.html';
                }, 500);
            }
        });
    }

    if (requestOtpBtn) {
        console.log('✅ OTP button found! Setting up event listener...');
        requestOtpBtn.addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            
            if (!email) {
                showAlert('❌ Please enter your email address first', 'error');
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
                    showAlert('✅ OTP sent successfully! Check your email for the code.', 'success');
                    console.log(`🔐 OTP requested for: ${email}`);
                } else {
                    showAlert('❌ ' + (data.detail || 'Failed to send OTP. Please check your email.'), 'error');
                }
            } catch (error) {
                showAlert('❌ Cannot reach backend server. Make sure it is running on port 8000.', 'error');
                console.error('OTP Error:', error);
            } finally {
                setButtonLoading(requestOtpBtn, false);
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('🔧 Employee login form submitted');
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const securityAnswer = document.getElementById('security-answer').value;
            const otp = document.getElementById('otp').value;

            if (!email) {
                showAlert('❌ Please enter your email address', 'error');
                return;
            }

            if (!password) {
                showAlert('❌ Please enter your password', 'error');
                return;
            }

            if (!securityAnswer) {
                showAlert('❌ Please answer your security question', 'error');
                return;
            }

            if (!otp) {
                showAlert('❌ Please enter the OTP from your email', 'error');
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
                    mode: 'cors',
                    credentials: 'omit',
                    body: JSON.stringify(loginData)
                });

                const data = await response.json();

                if (response.ok) {
                    showAlert('✅ Login successful! Redirecting to dashboard...', 'success');
                    
                    localStorage.setItem('token', data.access_token);
                    localStorage.setItem('role', data.role);
                    if (data.employee_id) {
                        localStorage.setItem('employee_id', data.employee_id);
                    }
                    
                    setTimeout(() => {
                        window.location.href = 'employee_dashboard.html';
                    }, 1000);
                    
                } else {
                    console.error('🔧 Login failed:', data.detail);
                    const errorMsg = data.detail || 'Login failed';
                    if (errorMsg.toLowerCase().includes('password')) {
                        showAlert('❌ Invalid password. Please try again.', 'error');
                    } else if (errorMsg.toLowerCase().includes('security')) {
                        showAlert('❌ Incorrect security answer. Please try again.', 'error');
                    } else if (errorMsg.toLowerCase().includes('otp')) {
                        showAlert('❌ Invalid or expired OTP. Request a new one.', 'error');
                    } else if (errorMsg.toLowerCase().includes('not found') || errorMsg.toLowerCase().includes('approval')) {
                        showAlert('❌ Account not found or not approved yet. Contact HR.', 'error');
                    } else {
                        showAlert('❌ ' + errorMsg, 'error');
                    }
                }
            } catch (error) {
                console.error('🔧 Login network error:', error);
                showAlert('❌ Cannot reach backend server. Make sure it is running on port 8000.', 'error');
            } finally {
                setButtonLoading(submitBtn, false);
            }
        });
    }

    const signupEmail = document.getElementById('signup-email');
    if (signupEmail) {
        signupEmail.addEventListener('input', (e) => {
            const email = e.target.value;
            const feedback = document.getElementById('email-feedback');
            const isValid = validateEmail(email);

            if (email === '') {
                e.target.classList.remove('email-valid', 'email-invalid');
                feedback.classList.remove('show');
            } else if (isValid) {
                e.target.classList.remove('email-invalid');
                e.target.classList.add('email-valid');
                feedback.classList.add('show', 'valid');
                feedback.classList.remove('invalid');
                feedback.innerHTML = '<i class="fas fa-check-circle"></i> Valid email address';
            } else {
                e.target.classList.remove('email-valid');
                e.target.classList.add('email-invalid');
                feedback.classList.add('show', 'invalid');
                feedback.classList.remove('valid');
                feedback.innerHTML = '<i class="fas fa-exclamation-circle"></i> Invalid email format';
            }
        });
    }

    if (signupForm) {
        console.log('✅ Signup form found! Setting up event listener...');
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('🔧 Signup form submitted');
            
            const fullName = document.getElementById('full-name').value;
            const email = document.getElementById('signup-email').value;
            const cnic = document.getElementById('cnic').value;
            const securityQuestion = document.getElementById('security-question').value;
            const securityAnswer = document.getElementById('security-answer-signup').value;
            const password = document.getElementById('signup-password').value;

            console.log('📝 Form data:', {fullName, email, cnic, securityQuestion, securityAnswer});

            if (!fullName) {
                showAlert('❌ Please enter your full name', 'error');
                return;
            }
            if (!email) {
                showAlert('❌ Please enter your email address', 'error');
                return;
            }
            if (!validateEmail(email)) {
                showAlert('❌ Please enter a valid email address', 'error');
                return;
            }
            if (!cnic) {
                showAlert('❌ Please enter your CNIC number', 'error');
                return;
            }
            if (!securityQuestion) {
                showAlert('❌ Please select a security question', 'error');
                return;
            }
            if (!securityAnswer) {
                showAlert('❌ Please answer your security question', 'error');
                return;
            }
            if (!password) {
                showAlert('❌ Please enter a password', 'error');
                return;
            }

            const passwordError = validatePassword(password);
            if (passwordError) {
                showAlert('❌ ' + passwordError, 'error');
                return;
            }

            const formData = {
                full_name: fullName,
                email: email,
                cnic: cnic,
                security_question: securityQuestion,
                security_answer: securityAnswer,
                password: password
            };

            const submitBtn = signupForm.querySelector('button[type="submit"]');
            
            try {
                setButtonLoading(submitBtn, true);
                
                console.log('📤 Sending signup request to:', `${API_BASE}/api/employee/signup`);
                console.log('📦 Request payload:', formData);
                
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
                
                console.log('📥 Response status:', response.status);
                console.log('📥 Response data:', data);

                if (response.ok) {
                    console.log('✅ Signup successful!');
                    const successMsg = `✅ Registration Request Submitted Successfully!

Your account request has been sent to HR for approval.
You will receive an email notification once your account is approved.
Request ID: EMP-${Date.now().toString().slice(-6)}`;
                    showAlert(successMsg, 'success');
                    signupForm.reset();
                    setTimeout(() => {
                        if (signupSection) signupSection.classList.add('hidden');
                        if (loginSection) loginSection.classList.remove('hidden');
                    }, 3000);
                } else {
                    console.error('❌ Signup failed:', data);
                    const errorMsg = data.detail || 'Registration failed';
                    if (errorMsg.toLowerCase().includes('email')) {
                        showAlert('❌ This email is already registered. Please login instead.', 'error');
                    } else if (errorMsg.toLowerCase().includes('cnic')) {
                        showAlert('❌ This CNIC is already registered. Please login instead.', 'error');
                    } else {
                        showAlert('❌ ' + errorMsg, 'error');
                    }
                }
            } catch (error) {
                console.error('🔧 Signup network error:', error);
                showAlert('❌ Cannot reach backend server. Make sure it is running on port 8000.', 'error');
            } finally {
                setButtonLoading(submitBtn, false);
            }
        });
    }

    async function testBackendConnection() {
        try {
            const response = await fetch(`${API_BASE}/`);
            if (!response.ok) {
                showAlert('Backend server is not responding. Please start it on port 8000.', 'error');
            }
        } catch (error) {
            showAlert('Cannot connect to backend server on port 8000.', 'error');
        }
    }

    window.addEventListener('load', () => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        
        if (token && role && role === 'employee') {
            showAlert('Welcome back! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'employee_dashboard.html';
            }, 1000);
        }
        
        testBackendConnection();
    });

    console.log('🔧 Employee Auth.js initialization complete');
});
