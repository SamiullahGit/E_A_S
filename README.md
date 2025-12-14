# Employee Attendance System - Information Security Project

A comprehensive, security-hardened employee attendance management system with cryptographic integrity protection, encryption, and role-based access control.

## Table of Contents

1. [Overview](#overview)
2. [Security Architecture](#security-architecture)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Running the Application](#running-the-application)
6. [HTTPS/TLS Setup for Deployment](#httpstls-setup-for-deployment)
7. [Security Features in Detail](#security-features-in-detail)
8. [API Endpoints](#api-endpoints)
9. [Security Best Practices](#security-best-practices)
10. [Deployment Checklist](#deployment-checklist)

---

## Overview

This system manages employee attendance with location-based marking, OTP authentication, and HR approval workflows. It implements production-grade security measures to protect sensitive employee data and ensure attendance record integrity.

**Key Components:**
- **Backend**: FastAPI (Python) with SQLite database
- **Frontend**: HTML/JavaScript with role-based dashboards
- **Roles**: Employee, HR Manager, Admin

---

## Security Architecture

### 1. **HMAC-SHA256 for Attendance Integrity**

Every attendance record is protected with a cryptographic signature (HMAC).

**How it works:**
```
Marking Attendance:
1. Employee marks attendance (status, location, timestamp)
2. Server computes: HMAC = SHA256(SECRET_KEY + employee_id + date + status + location + timestamp)
3. Both data and HMAC are stored in database

Verifying Attendance:
1. Admin requests attendance report
2. Server reads attendance record and stored HMAC
3. Server recomputes HMAC with same data
4. If recomputed HMAC ≠ stored HMAC → Data was tampered
5. Tampered records are flagged in reports

Why it's secure:
- Attacker cannot modify status (present→absent) without changing HMAC
- Attacker cannot recompute correct HMAC without SECRET_KEY
- Only server possesses SECRET_KEY (stored in .env, never exposed)
```

**Result**: Undetectable tampering is impossible. Any database modification is cryptographically verified.

---

### 2. **AES-256 Encryption for CNIC (Confidentiality)**

Employee CNIC numbers are encrypted using AES-128 (Fernet).

**How it works:**
```
During Signup:
1. Employee enters CNIC number (plaintext)
2. Server encrypts: encrypted_cnic = AES_encrypt(SECRET_AES_KEY, cnic)
3. Only encrypted_cnic is stored in database
4. Original CNIC is never stored

When Admin Views CNIC:
1. Admin requests employee details
2. Server retrieves encrypted_cnic from database
3. Server decrypts: cnic = AES_decrypt(SECRET_AES_KEY, encrypted_cnic)
4. CNIC is shown ONLY to authorized admin in backend
5. CNIC is NEVER sent to frontend/client
6. Decrypted CNIC is never stored (kept only in server memory)

Why it's secure:
- Database breach: Attacker gets encrypted CNIC only (useless without key)
- Plaintext CNIC never in transit or storage
- Only server-side admin can decrypt (requires authentication + authorization)
```

**Result**: CNIC data is protected even if database is compromised.

---

### 3. **JWT Authentication**

Secure token-based authentication for API requests.

**How it works:**
```
Login Process:
1. Employee enters credentials (email/password + OTP)
2. Server validates credentials against bcrypt hashes
3. If valid: Server generates JWT = sign(payload, SECRET_KEY)
4. JWT sent to client (in response)

Making Requests:
1. Client includes JWT in Authorization header: "Bearer <JWT>"
2. Server verifies: verify_jwt(token, SECRET_KEY)
3. If valid → Request processed | If invalid → 401 Unauthorized

JWT Content:
{
  "sub": "employee_id",
  "role": "employee|hr|admin",
  "exp": 3600,  // Expires in 1 hour
  "iat": 1234567890
}

Why it's secure:
- Tokens expire automatically (default 1 hour)
- Tokens are signed → Cannot be forged without SECRET_KEY
- Stateless: Server doesn't need to store sessions
- HTTPS ensures token isn't intercepted in transit
```

**Result**: Only authenticated users can access the system.

---

### 4. **Role-Based Access Control (RBAC)**

Fine-grained permissions based on user role.

**Roles:**
- **Employee**: Mark own attendance, view own records
- **HR Manager**: Approve attendance, view reports, manage payroll
- **Admin**: Full system access, user management, security audit

**Implementation:**
```python
@app.post("/api/attendance/mark")
def mark_attendance(data, token):
    user = verify_jwt(token)
    if user.role != "employee":
        return 403 Forbidden  // Only employees can mark attendance
    
    # Process attendance marking
```

---

### 5. **Secure Password Storage**

Passwords are hashed using bcrypt (one-way hashing).

**How it works:**
```
Signup:
1. User enters password: "MyPassword123"
2. Server computes: hash = bcrypt(password, salt=10)
3. Only hash is stored, never plaintext

Login:
1. User enters password: "MyPassword123"
2. Server computes: bcrypt_compare(password, stored_hash)
3. If match → Authenticated | If no match → Invalid credentials

Why it's secure:
- Bcrypt is slow (intentional) → Brute force attacks take years
- Each password has random salt → Same password = different hash
- One-way: Cannot reverse hash back to password
```

**Result**: Even if database is breached, passwords remain protected.

---

### 6. **OTP-Based Two-Factor Authentication**

Additional security layer using One-Time Passwords via email.

**How it works:**
```
Login:
1. User enters email/password
2. Server validates credentials
3. If valid: Generate random 6-digit OTP
4. OTP sent to registered email (SMTP)
5. User enters OTP in frontend
6. Server verifies OTP
7. If valid: JWT issued | If invalid: Authentication fails

Why it's secure:
- OTP valid for limited time only (e.g., 5 minutes)
- OTP is random (cryptographically secure)
- Even with password compromise, attacker needs email access
- Prevents unauthorized access from different IP/location
```

---

## Installation

### Prerequisites
- Python 3.8+
- pip (Python package manager)
- SQLite (included with Python)

### Steps

1. **Clone/Navigate to project:**
   ```bash
   cd employee_attendaance_system/backend
   ```

2. **Create virtual environment (recommended):**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment:**
   - **Windows**: `venv\Scripts\activate`
   - **Linux/Mac**: `source venv/bin/activate`

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Setup database:**
   ```bash
   python reset_db.py
   ```

---

## Configuration

### 1. **Setup .env File**

Create `backend/.env` with the following variables:

```env
SECRET_KEY=your-super-secret-jwt-key-change-in-production
DATABASE_URL=sqlite:///./attendance.db
DEV_MODE=false

SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
FROM_EMAIL=noreplyy098@gmail.com

HMAC_SECRET_KEY=your-very-long-random-secret-key-minimum-32-characters
AES_KEY=<your-fernet-key>
```

### 2. **Generate Cryptographic Keys**

**Generate AES Key (Fernet):**
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
Copy output and set as `AES_KEY`.

**Generate HMAC Secret:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```
Copy output and set as `HMAC_SECRET_KEY`.

**Generate JWT Secret:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```
Copy output and set as `SECRET_KEY`.

### 3. **Email Configuration**

For Gmail:
1. Enable "Less secure app access" or use "App Password"
2. Set `SMTP_USERNAME` and `SMTP_PASSWORD` in .env

---

## Running the Application

### Development Mode

```bash
python run.py
```

Server starts at: `http://localhost:8000`

### Access Points

- **Frontend**: `http://localhost:8000/` (index page)
- **API Docs**: `http://localhost:8000/docs` (Swagger UI)
- **Employee Login**: Frontend HTML pages
- **Admin Dashboard**: Frontend HTML pages

---

## HTTPS/TLS Setup for Deployment

### Why HTTPS is Critical

Without HTTPS:
- **JWT tokens** transmitted in plaintext → Intercepted
- **Passwords** transmitted in plaintext → Stolen
- **CNIC data** transmitted in plaintext → Exposed
- **All data** vulnerable to Man-in-the-Middle (MITM) attacks

**HTTPS encrypts entire communication** between client and server.

### Step 1: Generate SSL/TLS Certificates

**Option A: Self-Signed Certificate (Development/Testing)**

```bash
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365
```

This creates:
- `cert.pem` - Public certificate
- `key.pem` - Private key

**Option B: Let's Encrypt (Free, Production)**

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate for your domain
sudo certbot certonly --standalone -d yourdomain.com

# Certificates stored in: /etc/letsencrypt/live/yourdomain.com/
```

### Step 2: Configure FastAPI for HTTPS

**Modify `backend/run.py`:**

```python
import uvicorn
import os
from app.main import app

if __name__ == "__main__":
    ssl_keyfile = os.getenv("SSL_KEY_FILE", "key.pem")
    ssl_certfile = os.getenv("SSL_CERT_FILE", "cert.pem")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8443,
        ssl_keyfile=ssl_keyfile,
        ssl_certfile=ssl_certfile,
        log_level="info"
    )
```

### Step 3: Update .env

```env
SSL_KEY_FILE=/path/to/key.pem
SSL_CERT_FILE=/path/to/cert.pem
DEV_MODE=false
```

### Step 4: Update Frontend URLs

In frontend JavaScript files (e.g., `frontend/js/login.js`):

```javascript
// Development
const API_URL = "http://localhost:8000";

// Production (HTTPS)
const API_URL = "https://yourdomain.com:8443";
```

### Step 5: Verify HTTPS Works

```bash
python run.py
# Server should start with: "ssl_keyfile=key.pem ssl_certfile=cert.pem"
```

Then access: `https://localhost:8443/` (your browser will warn about self-signed cert initially)

---

## Security Features in Detail

### Data Flow with Security

```
EMPLOYEE MARKS ATTENDANCE:

1. Employee clicks "Mark Attendance"
   ↓
2. JavaScript collects: location (lat/lon), timestamp
   ↓
3. HTTPS request sent (encrypted):
   POST /api/attendance/mark
   Authorization: Bearer <JWT>
   {
     "latitude": 31.5204,
     "longitude": 74.3587,
     "status": "present"
   }
   ↓
4. Server receives (HTTPS decrypted)
   ↓
5. Server verifies JWT (must be valid and not expired)
   ↓
6. Server verifies user role = "employee" (RBAC)
   ↓
7. Server computes HMAC:
   HMAC = SHA256(HMAC_SECRET_KEY + employee_id + date + status + lat + lon + timestamp)
   ↓
8. Server stores in database:
   - employee_id
   - attendance_date
   - status
   - latitude/longitude
   - timestamp
   - hmac ← CRYPTOGRAPHIC SIGNATURE
   ↓
9. Response sent back (HTTPS encrypted):
   {
     "status": "success",
     "message": "Attendance marked",
     "integrity_verified": true
   }


ADMIN VIEWS ATTENDANCE REPORT:

1. Admin clicks "View Reports"
   ↓
2. HTTPS request sent (encrypted):
   GET /api/attendance/report
   Authorization: Bearer <ADMIN_JWT>
   ↓
3. Server verifies JWT and role = "admin"
   ↓
4. Server retrieves ALL attendance records
   ↓
5. For EACH record:
   a. Recompute HMAC using same formula
   b. Compare with stored HMAC
   c. If match → integrity_verified = true
   d. If no match → integrity_verified = false (TAMPERED!)
   ↓
6. For EACH employee record with CNIC:
   a. Retrieve encrypted_cnic from database
   b. Decrypt using AES_KEY: cnic = AES_decrypt(encrypted_cnic)
   c. Include decrypted CNIC in response (server-side only)
   ↓
7. Response sent (HTTPS encrypted):
   {
     "attendance": [
       {
         "employee_id": "EMP001",
         "cnic": "12345-6789012-3",  ← Only shown here, never in database unencrypted
         "status": "present",
         "integrity_verified": true,
         "tampered": false
       }
     ]
   }
```

---

## API Endpoints

### Authentication

**POST** `/api/auth/login`
```json
{
  "email": "emp@company.com",
  "password": "securePassword123"
}
Response: { "otp_required": true }
```

**POST** `/api/auth/verify-otp`
```json
{
  "email": "emp@company.com",
  "otp": "123456"
}
Response: { "token": "eyJhbGc..." }
```

### Attendance

**POST** `/api/attendance/mark`
```json
Headers: { "Authorization": "Bearer <JWT>" }
{
  "latitude": 31.5204,
  "longitude": 74.3587,
  "status": "present"
}
Response: { "status": "success", "integrity_verified": true }
```

**GET** `/api/attendance/report`
```
Headers: { "Authorization": "Bearer <ADMIN_JWT>" }
Response: { 
  "attendance": [
    {
      "employee_id": "EMP001",
      "cnic": "12345-6789012-3",
      "status": "present",
      "integrity_verified": true,
      "tampered": false
    }
  ]
}
```

---

## Security Best Practices

### 1. **Environment Variables**
- ✅ Store secrets in `.env`, NOT in code
- ✅ Add `.env` to `.gitignore` - never commit secrets
- ✅ Use different keys for dev vs production

### 2. **Key Rotation**
- Rotate `SECRET_KEY`, `AES_KEY`, `HMAC_SECRET_KEY` periodically
- When rotating AES_KEY: Re-encrypt all CNIC data with new key
- When rotating HMAC_SECRET_KEY: Re-sign all attendance records

### 3. **Database Security**
- ✅ Use strong SQLite file permissions: `chmod 600 attendance.db`
- ✅ Regular backups of database
- ✅ Limit database access to backend only
- ✅ No direct database access from frontend

### 4. **HTTPS/TLS**
- ✅ Always use HTTPS in production (port 8443)
- ✅ Use certificates from trusted CA (Let's Encrypt, DigiCert, etc.)
- ✅ Enable HSTS header (HTTP Strict Transport Security)
- ✅ Certificate must match domain name

### 5. **Logging and Monitoring**
- ✅ Log all authentication attempts
- ✅ Log all admin actions (viewing data)
- ✅ Monitor for failed HMAC verifications (tampering attempts)
- ✅ Alert on suspicious patterns
- ❌ Never log plaintext passwords or encryption keys

### 6. **Access Control**
- ✅ Enforce role-based access control
- ✅ Validate JWT expiration
- ✅ Require OTP for sensitive operations
- ✅ Implement rate limiting on login attempts

### 7. **Data Minimization**
- ✅ Only collect necessary data
- ✅ Delete old records periodically
- ✅ Encrypt sensitive PII (CNIC, phone numbers)
- ✅ Never expose decrypted data to frontend

---

## Deployment Checklist

Before deploying to production:

- [ ] **Environment Variables**
  - [ ] Set `DEV_MODE=false`
  - [ ] Generate strong `SECRET_KEY` (32+ chars)
  - [ ] Generate valid `AES_KEY` (Fernet key)
  - [ ] Generate strong `HMAC_SECRET_KEY` (32+ chars)
  - [ ] Configure SMTP credentials for email

- [ ] **HTTPS/TLS**
  - [ ] Obtain SSL certificate (Let's Encrypt or CA)
  - [ ] Place certificate in `certs/` directory
  - [ ] Update `run.py` with correct paths
  - [ ] Test HTTPS connection works
  - [ ] Verify certificate is not self-signed (unless testing)

- [ ] **Database**
  - [ ] Set file permissions: `chmod 600 attendance.db`
  - [ ] Backup database before migration
  - [ ] Run `python migrate_db.py` to add HMAC column
  - [ ] Verify all records have HMAC values

- [ ] **Security Headers**
  - [ ] Add `X-Content-Type-Options: nosniff`
  - [ ] Add `X-Frame-Options: DENY`
  - [ ] Add `X-XSS-Protection: 1; mode=block`
  - [ ] Add `Strict-Transport-Security: max-age=31536000`

- [ ] **Testing**
  - [ ] Test login and OTP flow
  - [ ] Test attendance marking with HMAC verification
  - [ ] Test admin viewing decrypted CNIC
  - [ ] Test tampering detection (modify attendance record)
  - [ ] Verify HTTPS works (no warnings)
  - [ ] Test role-based access (unauthorized access blocked)

- [ ] **Monitoring**
  - [ ] Setup application logging
  - [ ] Monitor for HMAC failures (tampering attempts)
  - [ ] Monitor failed login attempts
  - [ ] Setup alerts for security issues

- [ ] **Documentation**
  - [ ] Document all credentials (separately, securely)
  - [ ] Document key rotation procedure
  - [ ] Document backup/recovery procedure
  - [ ] Document incident response plan

---

## Troubleshooting

### Issue: "AES_KEY must be 32 url-safe base64-encoded bytes"
**Solution**: Generate valid key:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Issue: HMAC verification failing
**Solution**: Ensure `HMAC_SECRET_KEY` hasn't changed. If changed, re-run:
```bash
python migrate_db.py
```

### Issue: HTTPS certificate warning
**Solution**: 
- For self-signed: Accept the warning (development only)
- For production: Use certificate from trusted CA (Let's Encrypt)

### Issue: OTP not received
**Solution**: 
- Check SMTP credentials in .env
- Verify email address is correct
- Check spam folder
- Ensure less secure apps are enabled (Gmail)

---

## Support & Questions

For security-related questions or vulnerabilities, contact the project maintainer immediately.

---

**Last Updated**: December 2025
**Security Level**: Production-Grade
**Compliance**: Information Security Best Practices
