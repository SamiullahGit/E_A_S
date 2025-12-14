import uvicorn
import os

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = "0.0.0.0"
    
    print("[*] Starting Employee Attendance System...")
    print(f"[*] Backend: {host}:{port}")
    print("[*] Press Ctrl+C to stop\n")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=False
    )