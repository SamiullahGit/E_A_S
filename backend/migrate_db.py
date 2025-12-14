import os
import sys
from sqlalchemy import text
from app.database import engine, SessionLocal
from app.models import Attendance
from app.hmac_integrity import hmac_integrity

def migrate_attendance_table():
    """
    Add HMAC column to existing attendance table and compute HMAC for all existing records
    """
    print("[*] Starting database migration...")
    
    session = SessionLocal()
    
    try:
        print("[1] Checking if 'hmac' column exists...")
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(attendance)"))
            columns = [row[1] for row in result]
            
            if 'hmac' in columns:
                print("[✓] HMAC column already exists")
            else:
                print("[2] Adding 'hmac' column to attendance table...")
                conn.execute(text("ALTER TABLE attendance ADD COLUMN hmac VARCHAR(64) DEFAULT ''"))
                conn.commit()
                print("[✓] HMAC column added successfully")
        
        print("[3] Computing HMAC signatures for existing attendance records...")
        attendance_records = session.query(Attendance).all()
        
        updated_count = 0
        for record in attendance_records:
            if not record.hmac or record.hmac == '':
                date_str = record.date.strftime("%Y-%m-%d") if record.date else ""
                
                hmac_sig = hmac_integrity.compute_attendance_hmac(
                    employee_id=record.employee_id,
                    date_str=date_str,
                    status=record.status,
                    latitude=record.latitude or "",
                    longitude=record.longitude or ""
                )
                
                record.hmac = hmac_sig
                updated_count += 1
        
        session.commit()
        print(f"[✓] HMAC signatures computed and stored for {updated_count} records")
        
        print("\n[SUCCESS] Database migration completed successfully!")
        print(f"         - Total attendance records: {len(attendance_records)}")
        print(f"         - Updated with HMAC: {updated_count}")
        
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {str(e)}")
        session.rollback()
        return False
    finally:
        session.close()
    
    return True

if __name__ == "__main__":
    success = migrate_attendance_table()
    sys.exit(0 if success else 1)
