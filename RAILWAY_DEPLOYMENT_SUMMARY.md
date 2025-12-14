# Railway.com Deployment - Changes Summary

## Overview
Project configured for deployment on Railway.com with RSA key exchange for initial session setup, followed by AES-256 encryption for ongoing communication.

---

## Files Created

### 1. **railway.toml**
Railway-specific configuration file that specifies:
- Build method: Dockerfile
- Start command: `python backend/run.py`
- Environment: Python 3.11

### 2. **Dockerfile**
Docker container configuration:
- Base image: Python 3.11-slim
- Copies backend and frontend files
- Sets environment: `PORT`, `DEV_MODE=false`
- Command: `python run.py`

### 3. **app/rsa_key_exchange.py**
New module that handles RSA key exchange:
- Loads RSA private key from `certs/rsa_private.pem`
- Provides public key in PEM format
- Exports to base64 for transmission

### 4. **.gitignore**
Git ignore file that excludes:
- SSL certificates: `cert.pem`, `key.pem` (not needed for Railway)
- Database files: `*.db`
- Environment files: `.env`
- Virtual environments and cache

### 5. **CLEANUP.sh** & **CLEANUP.bat**
Helper scripts to remove unused files:
- `backend/certs/cert.pem` ❌ Delete (Railway provides HTTPS)
- `backend/certs/key.pem` ❌ Delete (Railway provides HTTPS)
- `backend/generate_certs.py` ❌ Delete (not needed)
- `backend/keygen.py` ❌ Delete (not needed)

### 6. **DEPLOYMENT_RAILWAY.md**
Complete deployment guide including:
- Step-by-step instructions
- Environment variable setup
- Troubleshooting guide
- Production recommendations

---

## Files Modified

### 1. **backend/run.py**
**Changed**: Added support for Railway's PORT environment variable

```python
# Before
port=8000

# After
port = int(os.getenv("PORT", 8000))
```

This allows Railway to dynamically assign port when deploying.

### 2. **app/main.py**
**Added**: New RSA public key endpoint

```python
@app.get("/api/auth/public-key")
async def get_public_key():
    return {
        "public_key": rsa_key_exchange.get_public_key_pem(),
        "key_format": "PEM",
        "algorithm": "RSA-4096"
    }
```

**Added**: Import statement
```python
from app.rsa_key_exchange import rsa_key_exchange
```

---

## Files to DELETE Manually

Run `CLEANUP.bat` (Windows) or `CLEANUP.sh` (Linux/Mac) to remove:

```
backend/certs/cert.pem        ← Self-signed SSL (not needed with Railway)
backend/certs/key.pem         ← Self-signed SSL key (not needed)
backend/generate_certs.py     ← Cert generation script (not needed)
backend/keygen.py             ← Key generation script (not needed)
```

---

## Files to KEEP

```
backend/certs/rsa_private.pem   ← KEEP (used for RSA key exchange)
backend/certs/rsa_public.pem    ← KEEP (backup of public key)
```

---

## Security Architecture on Railway

```
CLIENT REQUEST FLOW:

1. Client initiates login
   ↓
2. Client requests: GET /api/auth/public-key
   Response: RSA-4096 public key (PEM format)
   ↓
3. Client encrypts sensitive data with RSA public key
   ↓
4. Client sends encrypted data to: POST /api/auth/login
   ↓
5. Server receives and decrypts with RSA private key
   ↓
6. Server validates credentials
   ↓
7. Server generates JWT token (signed with SECRET_KEY)
   Response: JWT token
   ↓
8. Client stores JWT and uses it for subsequent requests
   ↓
9. All future requests encrypted with HTTPS (Railway automatic)
   ↓
10. Attendance data protected with HMAC-SHA256
   ↓
11. CNIC data encrypted with AES-256 at rest
```

---

## Environment Variables (Set in Railway)

```env
# Security Keys
SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_urlsafe(32))">
HMAC_SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_urlsafe(32))">
AES_KEY=<generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">

# Database
DATABASE_URL=sqlite:///./attendance.db

# Deployment
DEV_MODE=false
PORT=<automatically set by Railway>

# Email (for OTP)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
```

---

## Deployment Steps

1. **Clean up unused files**
   ```bash
   # Windows
   CLEANUP.bat
   
   # Linux/Mac
   bash CLEANUP.sh
   ```

2. **Commit changes**
   ```bash
   git add -A
   git commit -m "Configure for Railway deployment: add RSA key exchange, remove SSL files"
   git push
   ```

3. **Create Railway project**
   - Go to railway.app
   - Create new project from GitHub
   - Select this repository

4. **Set environment variables**
   - In Railway dashboard → Variables
   - Add all variables from above

5. **Deploy**
   - Railway will automatically build and deploy
   - You'll get a public URL

6. **Update frontend**
   - Change API URLs from `http://localhost:8000` to your Railway URL
   - Example: `https://your-project-xxxxx.railway.app`

---

## Key Improvements

✅ **Hybrid Encryption**:
- RSA-4096 for initial key exchange (asymmetric)
- AES-256 for session data (symmetric, faster)
- HMAC-SHA256 for integrity

✅ **Automatic HTTPS**:
- Railway provides free SSL certificates
- Automatic renewal
- No manual certificate management

✅ **Scalability**:
- Railway auto-scales based on traffic
- No server management required

✅ **Security**:
- All traffic encrypted end-to-end
- Keys securely stored in environment variables
- No hardcoded secrets

---

## Testing After Deployment

1. **Test RSA endpoint**
   ```bash
   curl https://your-project-xxxxx.railway.app/api/auth/public-key
   ```
   Should return RSA public key in PEM format

2. **Test login with OTP**
   - Navigate to deployed URL
   - Login with employee credentials
   - Verify OTP is received

3. **Test attendance marking**
   - Mark attendance
   - Verify HMAC is computed and stored

4. **Test admin dashboard**
   - View attendance reports
   - Verify HMAC validation shows "integrity_verified: true"
   - Verify CNIC is decrypted correctly

---

## Troubleshooting

**If deployment fails:**
1. Check Railway logs: Dashboard → View logs
2. Verify Python 3.11 is installed
3. Check .env variables are set correctly
4. Ensure Dockerfile is in project root

**If database is lost:**
- SQLite is ephemeral on Railway
- For production, use PostgreSQL service
- Request from Railway dashboard

**If RSA endpoint returns error:**
- Verify `backend/certs/rsa_private.pem` exists
- Check file path in `app/rsa_key_exchange.py`
- Restart deployment

---

## Next: Frontend Updates

Frontend needs to be updated to:
1. Call `/api/auth/public-key` endpoint
2. Get RSA public key
3. Encrypt login credentials with RSA before sending
4. Use returned JWT for subsequent requests
5. Update API base URL to Railway domain

See `DEPLOYMENT_RAILWAY.md` for detailed guide.

