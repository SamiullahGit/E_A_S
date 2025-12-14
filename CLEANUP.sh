#!/bin/bash

echo "Cleaning up unused files for Railway deployment..."

rm -f backend/certs/cert.pem
rm -f backend/certs/key.pem
rm -f backend/generate_certs.py
rm -f backend/keygen.py

echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Commit changes: git add -A && git commit -m 'Clean up unused files'"
echo "2. Push to Git: git push"
echo "3. Deploy to Railway: https://railway.app"
