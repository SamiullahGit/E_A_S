# Deployment on Railway.com

Complete guide to deploy the Employee Attendance System on Railway.com

## Prerequisites

1. Railway.com account (free tier available)
2. Git repository (GitHub, GitLab, or Bitbucket)
3. Project pushed to your Git repository

## Step-by-Step Deployment

### 1. Prepare Your Repository

Delete unnecessary files (don't commit these to git):
```bash
rm backend/certs/cert.pem
rm backend/certs/key.pem
rm backend/generate_certs.py
rm backend/keygen.py
```

Commit your changes:
```bash
git add -A
git commit -m "Prepare for Railway deployment"
git push
```

### 2. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub" (or your Git provider)
4. Select your repository
5. Choose the branch to deploy (e.g., `main`)
6. Click "Deploy"

### 3. Configure Environment Variables

Once Railway creates your project:

1. Click "Variables" tab
2. Add the following environment variables:

```env
SECRET_KEY=<your-strong-random-string>
HMAC_SECRET_KEY=<your-strong-random-string>
AES_KEY=<your-fernet-key>
DATABASE_URL=sqlite:///./attendance.db
DEV_MODE=false
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
```

**Generate keys (if needed):**

```bash
# AES Key (Fernet)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# HMAC Secret
python -c "import secrets; print(secrets.token_urlsafe(32))"

# JWT Secret
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 4. Check Deployment Status

In Railway dashboard:
- Green checkmark = Deployment successful
- Red X = Deployment failed (check logs)

View logs: Click "View logs" button in deployment

### 5. Access Your Application

Railway will provide a public URL:
```
https://your-project-name-xxxxx.railway.app
```

Update your frontend to use this URL:

**frontend/js/config.js** (create if doesn't exist):
```javascript
const API_URL = "https://your-project-name-xxxxx.railway.app";
```

Update all frontend files to use `API_URL` instead of hardcoded localhost.

### 6. Enable HTTPS (Automatic)

✅ Railway automatically provides HTTPS with free SSL certificates
✅ All data is encrypted in transit (no additional setup needed)
✅ Your RSA public key endpoint is secure

---

## Security Features in Deployment

### 1. **RSA Key Exchange**
- Client requests public key: `GET /api/auth/public-key`
- Server responds with RSA-4096 public key (PEM format)
- Client uses public key to encrypt sensitive initial data

### 2. **AES Encryption**
- Session data encrypted with AES-256
- Attendance records protected with HMAC-SHA256
- CNIC data encrypted at rest in database

### 3. **HTTPS/TLS**
- Automatic HTTPS enabled by Railway
- All communication encrypted end-to-end
- Certificate automatically renewed

### 4. **Database**
- SQLite file stored in Railway's persistent storage
- Encrypted at rest on Railway servers
- Automatic backups recommended

---

## Troubleshooting

### Issue: "PORT environment variable not found"
**Solution**: Railway automatically sets PORT. If needed, manually add in Variables tab.

### Issue: Database file not persisting
**Solution**: Railway ephemeral storage doesn't persist. Use:
```env
DATABASE_URL=postgresql://...
```
Or use Railway's PostgreSQL service (recommended for production)

### Issue: SMTP emails not sending
**Solution**: 
- Check credentials in environment variables
- Verify Gmail "Less Secure Apps" is enabled
- Check email spam folder

### Issue: Public key endpoint returns error
**Solution**:
- Verify `rsa_private.pem` exists in `backend/certs/`
- Check file permissions
- Restart deployment

---

## Production Recommendations

1. **Database**: Switch from SQLite to PostgreSQL
   - Railway offers free PostgreSQL
   - More reliable for production
   
2. **Environment Variables**: Use Railway Secrets vault for sensitive keys

3. **Monitoring**: Enable Railway's built-in monitoring
   - View request logs
   - Monitor error rates
   - Set up alerts

4. **Backups**: 
   - If using SQLite, download backups regularly
   - If using PostgreSQL, enable automatic backups

5. **Scaling**: 
   - Railway auto-scales based on traffic
   - Monitor resource usage in dashboard

---

## File Structure for Deployment

```
employee_attendaance_system/
├── Dockerfile              ← Created for Railway
├── railway.toml           ← Created for Railway
├── .gitignore             ← Created
├── README.md
├── DEPLOYMENT_RAILWAY.md  ← This file
│
├── backend/
│   ├── run.py            ← Updated for PORT env var
│   ├── requirements.txt
│   ├── .env              ← NOT committed (in .gitignore)
│   ├── attendance.db     ← NOT committed (in .gitignore)
│   │
│   ├── certs/
│   │   ├── rsa_private.pem   ← Keep (used for RSA key exchange)
│   │   ├── rsa_public.pem    ← Keep (backup of public key)
│   │   ├── cert.pem         ← DELETE (not needed)
│   │   └── key.pem          ← DELETE (not needed)
│   │
│   └── app/
│       ├── main.py          ← Updated with RSA endpoint
│       ├── rsa_key_exchange.py  ← NEW (handles RSA)
│       ├── aes_encryption.py
│       ├── hmac_integrity.py
│       ├── models.py
│       ├── database.py
│       └── ... (other modules)
│
└── frontend/
    ├── index.html
    ├── employee-login.html
    ├── admin-login.html
    ├── hr-login.html
    ├── js/
    │   └── (update to use Railway URL)
    └── css/
```

---

## Deployment Checklist

Before pushing to Railway:

- [ ] Deleted `backend/certs/cert.pem`
- [ ] Deleted `backend/certs/key.pem`
- [ ] Deleted `backend/generate_certs.py`
- [ ] Deleted `backend/keygen.py`
- [ ] Added `.gitignore` file
- [ ] Created `railway.toml`
- [ ] Created `Dockerfile`
- [ ] Updated `run.py` for PORT env var
- [ ] Added RSA endpoint to `main.py`
- [ ] Generated new environment variable keys
- [ ] Updated frontend URLs to Railway domain
- [ ] Tested locally: `python backend/run.py`
- [ ] Committed and pushed to Git
- [ ] Set up Railway project
- [ ] Added environment variables in Railway
- [ ] Deployment successful (green checkmark)
- [ ] Tested endpoints on deployed URL

---

## Next Steps

1. Update frontend to call RSA public key endpoint
2. Implement RSA + AES encryption on frontend
3. Test login flow with hybrid encryption
4. Monitor application performance
5. Consider switching to PostgreSQL for production

