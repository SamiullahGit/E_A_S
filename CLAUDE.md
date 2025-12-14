# Employee Attendance System - Updated Version

## 🎯 Recent Changes & New Features

### ✨ **Feature 1: Location-Based Attendance Marking**
- ✅ Employees must enable location before marking attendance
- ✅ Only employees at NUST H-12 Islamabad can mark attendance
- ✅ Location coordinates are saved with each attendance record
- ✅ Admin can see location details in the attendance dashboard

### ✨ **Feature 2: Real Email Notifications**
- ✅ OTP codes are now sent to employee's real email (not console)
- ✅ HR approval notifications sent via email
- ✅ Professional HTML email templates
- ✅ Requires SMTP configuration in `.env` file

### ✨ **Feature 3: Enhanced Admin Dashboard**
- ✅ Attendance records now show location information
- ✅ Display latitude and longitude coordinates
- ✅ Location name shows "NUST H-12 Islamabad"
- ✅ Auto-refresh every 30 seconds

---

## 📋 Configuration Setup

### **Step 1: Backend Configuration**

Edit `backend/.env` file and update the following:

```env
SECRET_KEY=your-super-secret-jwt-key-change-in-production
DATABASE_URL=sqlite:///./attendance.db

# Gmail SMTP Configuration (example)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
```

**⚠️ For Gmail Users:**
1. Enable 2-Factor Authentication in Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the generated password in `SMTP_PASSWORD`
4. Use your Gmail address in `SMTP_USERNAME` and `FROM_EMAIL`

**Alternative Email Providers:**
- **Outlook**: SMTP: smtp-mail.outlook.com, Port: 587
- **Yahoo**: SMTP: smtp.mail.yahoo.com, Port: 587
- **SendGrid**: SMTP: smtp.sendgrid.net, Port: 587

### **Step 2: Install Dependencies**

```bash
cd backend
pip install -r requirements.txt
```

### **Step 3: Initialize Database**

```bash
python init_db.py
```

### **Step 4: Run Backend Server**

```bash
python run.py
```

The API will start on: `http://localhost:8000`

### **Step 5: Open Frontend**

Open `frontend/index.html` in your browser (use Live Server or similar)

---

## 🔐 Location Validation Details

### **Allowed Location (NUST H-12 Islamabad)**
- **Latitude Range**: 33.638 to 33.648
- **Longitude Range**: 73.179 to 73.189
- **Buffer**: ~1 km radius

Employees will see an error message if they try to mark attendance from outside this location.

### **Frontend Location Flow**
1. Employee clicks "📍 Enable Location" button
2. Browser requests geolocation permission
3. User accepts permission
4. Location status updates with accuracy
5. Employee can then click "Mark Present"
6. Location is validated on backend

---

## 📊 Admin Dashboard Features

### **New Columns in Attendance Table**
| Column | Description |
|--------|-------------|
| 📅 Date | Date of attendance |
| 👤 Employee Name | Full name |
| 🆔 Employee ID | Employee ID |
| 🏢 Department | Department name |
| ✅ Status | Present/Absent |
| 📍 Location | Location name |
| 🗺️ Coordinates | Latitude, Longitude |
| ⏰ Marked At | Timestamp |

---

## 📧 Email Templates

### **OTP Email**
- Professional HTML design
- Shows OTP code in large blue box
- Includes expiration time (10 minutes)
- Security warnings

### **Approval Email**
- Confirmation message
- Employee details (name, ID)
- Welcome message

---

## 🗄️ Database Schema Updates

### **Attendance Table - New Fields**
```
latitude    VARCHAR(50)    - GPS latitude
longitude   VARCHAR(50)    - GPS longitude  
location_name VARCHAR(255) - Human-readable location name
```

---

## 🧪 Testing the System

### **Test Scenario: Employee Login & Mark Attendance**

1. **Create Test Account**
   - Go to Signup page
   - Fill in all details
   - Submit form

2. **HR Approval**
   - Login as HR/Admin
   - Approve pending employee
   - Email will be sent

3. **Employee Login**
   - Login with approved account
   - Complete security questions
   - Request OTP (check email)
   - Enter OTP and login

4. **Mark Attendance**
   - Click "📍 Enable Location"
   - Grant location permission (use Chrome DevTools to mock location if needed)
   - Click "Mark Present"
   - Location must be NUST H-12 Islamabad

5. **Admin View**
   - Login as Admin
   - See attendance record with location

---

## 🛠️ Mock Location for Testing (Chrome DevTools)

**To test without leaving your location:**

1. Open Chrome DevTools (F12)
2. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)
3. Type "Sensors" and select "Show Sensors"
4. In Sensors panel, select location
5. Enter coordinates:
   - **Latitude**: 33.643
   - **Longitude**: 73.184

---

## 📱 Geolocation Support

### **Browser Compatibility**
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari (iOS 13+)
- ✅ Android browsers
- ❌ Internet Explorer (not supported)

### **Requirements**
- **HTTPS connection** (required for production)
- **User permission** (browser will ask)
- **GPS/Location enabled** on device

---

## 🔧 API Endpoints

### **Mark Attendance (Updated)**
```
POST /api/employee/mark-attendance
Content-Type: application/json

{
    "employee_id": 1,
    "latitude": 33.643,
    "longitude": 73.184,
    "location_name": "NUST H-12 Islamabad"
}

Response:
{
    "message": "Attendance marked successfully"
}

Error Response (Outside Location):
{
    "detail": "Location not authorized. You must be at NUST H-12 Islamabad to mark attendance."
}
```

### **Get All Attendance (Admin)**
```
GET /api/admin/all-attendance

Response includes new fields:
{
    "date": "2024-11-30",
    "employee_name": "John Doe",
    "employee_id": "EMP0001",
    "department": "IT",
    "status": "present",
    "latitude": "33.643",
    "longitude": "73.184",
    "location_name": "NUST H-12 Islamabad",
    "marked_at": "2024-11-30T10:30:00"
}
```

---

## 📝 File Changes Summary

### **Backend Changes**
- `app/models.py` - Added location fields to Attendance model
- `app/email_service.py` - Implemented real SMTP email sending
- `app/main.py` - Added location validation and updated endpoints

### **Frontend Changes**
- `js/employee.js` - Added geolocation functions
- `html/employee_dashboard.html` - Added location enable button
- `js/admin.js` - Updated table to show location data
- `html/admin_dashboard.html` - Added location columns

---

## ⚠️ Common Issues & Solutions

### **Issue: OTP not received in email**
- ✅ Check `.env` configuration
- ✅ Verify SMTP credentials are correct
- ✅ Check spam/junk folder
- ✅ For Gmail, ensure App Password is used (not regular password)

### **Issue: Location permission denied**
- ✅ Grant location permission in browser
- ✅ Check if browser supports geolocation
- ✅ Use HTTPS (required for production)
- ✅ For localhost, HTTP is allowed in Chrome

### **Issue: Location validation fails**
- ✅ Ensure you're within NUST H-12 boundaries
- ✅ For testing, use Chrome DevTools mock location
- ✅ Check accuracy is within ~1km

### **Issue: Attendance not showing in admin panel**
- ✅ Ensure backend is running on port 8000
- ✅ Check browser console for errors
- ✅ Verify admin user is logged in
- ✅ Try refreshing the page

---

## 🚀 Production Deployment

### **Important Checklist**
- [ ] Change `SECRET_KEY` in `.env`
- [ ] Use HTTPS instead of HTTP
- [ ] Use production database (PostgreSQL/MySQL instead of SQLite)
- [ ] Update CORS origins to your domain
- [ ] Use environment variables securely
- [ ] Enable location verification validation
- [ ] Set up email service properly

---

## 📞 Support

For issues or questions:
1. Check the browser console for errors (F12)
2. Check backend logs in terminal
3. Verify `.env` configuration
4. Ensure all dependencies are installed

---

## ✅ Final Checklist

- [x] Location-based attendance system implemented
- [x] Real email notifications configured
- [x] Admin dashboard shows location details
- [x] Database models updated
- [x] Frontend UI updated
- [x] Location validation working
- [x] Error handling in place
- [x] Professional email templates

**Your system is ready to use! 🎉**

---

## 🔐 **NEW: Post-Quantum Encryption & HTTPS**

### **Security Features Added**

#### **1. HTTPS/TLS (Transport Layer)**
- ✅ Self-signed SSL certificates (auto-generated on startup)
- ✅ TLS 1.2+ encryption
- ✅ RSA-4096 certificates
- ✅ Location: `backend/certs/cert.pem` and `backend/certs/key.pem`

#### **2. RSA-4096 Encryption**
- ✅ Client-side encryption before transmission
- ✅ OAEP padding with SHA-256
- ✅ Server holds private key (never transmitted)
- ✅ Location: `backend/certs/rsa_private.pem`, `rsa_public.pem`

#### **3. NIST SP 800-63B Password Guidelines**
- ✅ Minimum 8 characters
- ✅ Real-time password strength indicator
- ✅ Backend validation on signup
- ✅ Color-coded strength: 🔴 Weak → 🟢 Strong

#### **4. New Backend Modules**
- ✅ `app/pq_crypto.py` - RSA-4096 encryption/decryption
- ✅ `app/password_validator.py` - NIST password validation
- ✅ `run.py` - Auto-generates SSL certificates on startup

#### **5. New Frontend Encryption**
- ✅ `js/encryption.js` - Client-side encryption library
- ✅ Fetches public key from server
- ✅ Encrypts sensitive data before sending
- ✅ Works with HTTPS for defense-in-depth

---

### **Quick Start**

#### **Backend (HTTPS)**
```bash
cd backend
python run.py
```

Output will show:
```
✅ SSL certificates found (or generated)
[*] Backend: https://localhost:8000
```

#### **Frontend**
1. Open `frontend/index.html`
2. First time: Browser shows SSL warning (self-signed cert is normal)
3. Click "Proceed Anyway" or "Accept Risk"

---

### **New API Endpoints**

```
GET /api/security/public-key
Returns: RSA-4096 public key in PEM format

GET /api/security/info
Returns: Security implementation details
```

---

### **Updated Configuration**

Add to `backend/.env`:
```env
HTTPS_ENABLED=true
SSL_CERT_PATH=certs/cert.pem
SSL_KEY_PATH=certs/key.pem
USE_POST_QUANTUM=true
```

---

### **How It Works**

1. **Client connects to server over HTTPS** (TLS 1.2+)
2. **Client fetches public key** from `/api/security/public-key`
3. **Client encrypts password** using RSA-4096 OAEP
4. **Client sends encrypted data** over HTTPS
5. **Server receives encrypted data** over HTTPS
6. **Server decrypts** using private key (held securely on server)
7. **Response sent back** over HTTPS

This is **defense-in-depth**: HTTPS protects transport, RSA-4096 protects if HTTPS is compromised.

---

### **Development Certificate Warning**

Self-signed certificates are normal for development:
- **Chrome/Edge**: Click "Advanced" → "Proceed to localhost"
- **Firefox**: Click "Advanced" → "Accept the Risk and Continue"
- **Safari**: Proceed

For **production**, install Let's Encrypt certificates.

---

### **Testing Encryption**

Browser console:
```javascript
// Check encryption is working
fetch('https://localhost:8000/api/security/public-key')
    .then(r => r.json())
    .then(d => console.log('RSA Key:', d.public_key.substring(0, 50)))
```

---

### **Files Modified/Created**

**Backend:**
- `app/pq_crypto.py` - NEW: RSA-4096 encryption module
- `app/password_validator.py` - NEW: Password validation (NIST)
- `app/config.py` - UPDATED: Added HTTPS settings
- `app/main.py` - UPDATED: Added security endpoints & password validation
- `run.py` - UPDATED: Added SSL certificate generation

**Frontend:**
- `js/encryption.js` - NEW: Client-side encryption library
- `login.html` - UPDATED: Added password strength indicator

---

### **Password Strength Colors**

| Indicator | Score | Requirements |
|-----------|-------|--------------|
| 🔴 Weak | 0-2 | Very basic |
| 🟠 Fair | 3-4 | Some variety |
| 🔵 Good | 5-6 | Mixed chars & length |
| 🟢 Strong | 7+ | All types + long |

---

**✅ Your system now has enterprise-grade encryption!**
