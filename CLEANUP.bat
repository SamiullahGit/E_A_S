@echo off
echo Cleaning up unused files for Railway deployment...

del /F backend\certs\cert.pem
del /F backend\certs\key.pem
del /F backend\generate_certs.py
del /F backend\keygen.py

echo.
echo ✅ Cleanup complete!
echo.
echo Next steps:
echo 1. Commit changes: git add -A ^&^& git commit -m "Clean up unused files"
echo 2. Push to Git: git push
echo 3. Deploy to Railway: https://railway.app
pause
