from app.database import engine, Base
from app.models import User, Employee, Attendance, OTP

def init_db():
    """Create all tables in the database"""
    print("[*] Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("[✓] Database tables created successfully!")

if __name__ == "__main__":
    init_db()
