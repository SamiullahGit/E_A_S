from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
import random
import string
from pydantic import BaseModel
import traceback
import os

from app.database import get_db, engine, Base
from app.models import User, Employee, Attendance, OTP
from app.encryption import verify_password, get_password_hash, get_deterministic_hash
from app.email_service import send_otp_email, send_approval_email
from app.password_validator import password_validator
from app.auth import create_access_token
from app.pq_crypto import pq_crypto
from app.hmac_integrity import hmac_integrity
from app.aes_encryption import aes_encryption
from app.rsa_key_exchange import rsa_key_exchange
import re

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Employee Attendance System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost:3000", "http://localhost:3000", "http://127.0.0.1:3000", "https://127.0.0.1:3000", "*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print(f"\n❌ GLOBAL ERROR: {str(exc)}")
    print(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server error: {str(exc)}"}
    )

# Pydantic models
class EmployeeSignup(BaseModel):
    full_name: str
    email: str
    cnic: str
    security_question: str
    security_answer: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str
    security_answer: str = ""
    otp: str = ""

class HRApproval(BaseModel):
    employee_id: int
    department: str = "N/A"
    position: str = "N/A"

class MarkAttendanceRequest(BaseModel):
    employee_id: int
    latitude: float
    longitude: float
    location_name: str = ""

def validate_email(email: str) -> bool:
    """Validate email format using regex pattern"""
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None

def validate_location(latitude: float, longitude: float) -> bool:
    ALLOWED_LAT_RANGE = (33.60, 33.70)
    ALLOWED_LON_RANGE = (72.95, 73.25)
    
    is_valid = (ALLOWED_LAT_RANGE[0] <= latitude <= ALLOWED_LAT_RANGE[1] and 
            ALLOWED_LON_RANGE[0] <= longitude <= ALLOWED_LON_RANGE[1])
    
    print("[DEBUG] Location validation:")
    print("  Latitude: {} (range: {}-{})".format(latitude, ALLOWED_LAT_RANGE[0], ALLOWED_LAT_RANGE[1]))
    print("  Longitude: {} (range: {}-{})".format(longitude, ALLOWED_LON_RANGE[0], ALLOWED_LON_RANGE[1]))
    print("  Valid: {}".format(is_valid))
    
    return is_valid

# Routes
@app.get("/api/test")
async def test_endpoint():
    return {"status": "ok", "message": "Backend is responding", "cors": "enabled"}

@app.options("/{path:path}")
async def options_handler(path: str):
    return {"message": "OK"}

@app.get("/api/security/public-key")
async def get_public_key():
    """Return RSA-4096 public key for encryption"""
    try:
        with open("certs/rsa_public.pem", "r") as f:
            rsa_public_key = f.read()
        
        return {
            "algorithm": "RSA-4096",
            "encryption_type": "RSA OAEP with SHA-256",
            "public_key": rsa_public_key,
            "key_size": "4096 bits",
            "status": "ACTIVE"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Could not load public key: {str(e)}"
        }

@app.get("/api/security/info")
async def get_security_info():
    """Return security implementation information"""
    return {
        "status": "operational",
        "encryption": {
            "algorithm": "RSA-4096",
            "type": "RSA OAEP with SHA-256",
            "key_size": "4096 bits",
            "status": "ACTIVE",
            "security_level": "256-bit equivalent symmetric strength"
        },
        "authentication": {
            "algorithm": "HS256 (HMAC-SHA256)",
            "type": "JWT Tokens",
            "status": "ACTIVE",
            "expiration": "24 hours"
        }
    }

@app.post("/api/employee/signup")
async def employee_signup(signup_data: EmployeeSignup, db: Session = Depends(get_db)):
    print(f"\n[SIGNUP] New employee registration: {signup_data.email}")
    print(f"[SIGNUP] 📝 Data received: {signup_data}")
    
    print(f"[SIGNUP] 🔍 Validating email format...")
    if not validate_email(signup_data.email):
        print(f"[SIGNUP] ❌ Invalid email format: {signup_data.email}")
        raise HTTPException(status_code=400, detail="Invalid email format. Please enter a valid email address (e.g., user@example.com)")
    print(f"[SIGNUP] ✅ Email format is valid")
    
    is_valid, msg = password_validator.validate(signup_data.password)
    if not is_valid:
        print(f"[SIGNUP] ❌ Password validation failed: {msg}")
        raise HTTPException(status_code=400, detail=msg)
    
    strength = password_validator.get_strength(signup_data.password)
    print(f"[SIGNUP] ✅ Password strength: {strength}")
    
    print(f"[SIGNUP] 🔍 Checking if email exists...")
    existing_user = db.query(User).filter(User.email == signup_data.email).first()
    print(f"[SIGNUP] ✅ Email check completed")
    if existing_user:
        print(f"[SIGNUP] ❌ Email already exists: {signup_data.email}")
        raise HTTPException(status_code=400, detail="Email already registered")
    
    print(f"[SIGNUP] 🔍 Checking if CNIC exists...")
    hashed_cnic = get_deterministic_hash(signup_data.cnic)
    existing_employee = db.query(Employee).filter(Employee.cnic == hashed_cnic).first()
    print(f"[SIGNUP] ✅ CNIC check completed")
    if existing_employee:
        print(f"[SIGNUP] ❌ CNIC already exists: {signup_data.cnic}")
        raise HTTPException(status_code=400, detail="CNIC already registered")
    
    print(f"[SIGNUP] 🔨 Creating user record...")
    user = User(
        email=signup_data.email,
        hashed_password=get_password_hash(signup_data.password),
        role="employee",
        is_active=False
    )
    db.add(user)
    print(f"[SIGNUP] 📌 User added to session, committing...")
    db.commit()
    print(f"[SIGNUP] ✅ User committed to database")
    db.refresh(user)
    print(f"[SIGNUP] ✅ User created with ID: {user.id}")
    
    print(f"[SIGNUP] 🔨 Encrypting CNIC with AES-256...")
    encrypted_cnic = aes_encryption.encrypt_cnic(signup_data.cnic)
    
    print(f"[SIGNUP] 🔨 Creating employee record...")
    employee = Employee(
        user_id=user.id,
        full_name=signup_data.full_name,
        cnic=hashed_cnic,
        cnic_encrypted=encrypted_cnic,
        security_question=get_password_hash(signup_data.security_question),
        security_answer=get_password_hash(signup_data.security_answer),
        is_approved=False
    )
    db.add(employee)
    print(f"[SIGNUP] 📌 Employee added to session, committing...")
    db.commit()
    print(f"[SIGNUP] ✅ Employee committed to database")
    db.refresh(employee)
    print(f"[SIGNUP] ✅ Employee record created with ID: {employee.id}, Status: pending approval")
    
    print(f"[SIGNUP] ✅ SIGNUP COMPLETE - Sending response...")
    return {"message": "Registration successful. Waiting for HR approval."}

@app.get("/api/auth/public-key")
async def get_public_key():
    return {
        "public_key": rsa_key_exchange.get_public_key_pem(),
        "key_format": "PEM",
        "algorithm": "RSA-4096"
    }

@app.post("/api/auth/login")
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    # Find user
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account not approved yet")
    
    # For HR and Admin, require security questions and OTP
    if user.role in ['hr', 'admin']:
        # Verify security answer
        if not user.security_answer or not verify_password(login_data.security_answer, user.security_answer):
            raise HTTPException(status_code=400, detail="Invalid security answer")
        
        # Verify OTP
        otp_records = db.query(OTP).filter(
            OTP.email == login_data.email,
            OTP.expires_at > datetime.now(),
            OTP.is_used == False
        ).all()
        
        valid_otp_record = None
        for record in otp_records:
            if verify_password(login_data.otp, record.otp_code):
                valid_otp_record = record
                break
        
        if not valid_otp_record:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
        # Mark OTP as used
        valid_otp_record.is_used = True
        db.commit()
        
        # Create JWT token
        access_token = create_access_token({"sub": user.email, "role": user.role})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": user.role,
            "employee_id": None
        }
    
    # For employees, require security questions and OTP
    employee = db.query(Employee).filter(Employee.user_id == user.id).first()
    if not employee:
        raise HTTPException(status_code=400, detail="Employee record not found")
    
    if not verify_password(login_data.security_answer, employee.security_answer):
        raise HTTPException(status_code=400, detail="Invalid security answer")
    
    # Verify OTP for employees
    otp_records = db.query(OTP).filter(
        OTP.email == login_data.email,
        OTP.expires_at > datetime.now(),
        OTP.is_used == False
    ).all()
    
    valid_otp_record = None
    for record in otp_records:
        if verify_password(login_data.otp, record.otp_code):
            valid_otp_record = record
            break
    
    if not valid_otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Mark OTP as used
    valid_otp_record.is_used = True
    db.commit()
    
    # Create JWT token
    access_token = create_access_token({"sub": user.email, "role": user.role})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "employee_id": employee.id
    }

@app.post("/api/auth/request-otp")
async def request_otp(email: str, db: Session = Depends(get_db)):
    print(f"\n[DEBUG] request_otp called with email: {email}")
    try:
        user = db.query(User).filter(User.email == email).first()
        print(f"[DEBUG] User found: {user is not None}")
        if not user:
            raise HTTPException(status_code=400, detail="Email not found")
        
        print(f"[DEBUG] User active: {user.is_active}")
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Account not approved yet")
        
        print(f"[DEBUG] Sending OTP email...")
        try:
            success = await send_otp_email(db, email)
            print(f"[DEBUG] OTP send result: {success}")
        except Exception as email_error:
            print(f"[WARNING] Email sending failed: {email_error}")
            print(f"[INFO] Generating OTP without sending email (DEV MODE)")
            from app.email_service import generate_otp
            from datetime import timedelta
            otp_code = generate_otp()
            expires_at = datetime.now() + timedelta(minutes=10)
            otp = OTP(email=email, otp_code=get_password_hash(otp_code), expires_at=expires_at)
            db.add(otp)
            db.commit()
            print(f"[DEV] Generated OTP: {otp_code}")
            success = True
        
        if success:
            return {"message": "OTP sent to your email"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send OTP")
    except Exception as e:
        print(f"[ERROR] OTP endpoint error: {e}")
        print(traceback.format_exc())
        raise

@app.get("/api/debug/all-employees")
async def debug_all_employees(db: Session = Depends(get_db)):
    """Debug endpoint to check all employees in database"""
    all_employees = db.query(Employee).all()
    users_map = {u.id: u.email for u in db.query(User).all()}
    
    result = []
    for emp in all_employees:
        result.append({
            "id": emp.id,
            "user_id": emp.user_id,
            "email": users_map.get(emp.user_id, "NO_USER"),
            "full_name": emp.full_name,
            "cnic": emp.cnic,
            "is_approved": emp.is_approved,
            "created_at": emp.created_at.isoformat() if emp.created_at else None
        })
    
    print(f"\n[DEBUG] Total employees in database: {len(result)}")
    for emp in result:
        print(f"  - {emp['full_name']} ({emp['email']}): Approved={emp['is_approved']}")
    
    return result

@app.get("/api/hr/pending-approvals")
async def get_pending_approvals(db: Session = Depends(get_db)):
    pending_employees = db.query(Employee).filter(
        (Employee.is_approved == False) & (Employee.is_disapproved == False)
    ).all()
    total_employees = db.query(Employee).filter(Employee.is_approved == True).count()
    
    print(f"\n[HR APPROVALS] Found {len(pending_employees)} pending employees")
    print(f"[HR APPROVALS] Found {total_employees} approved employees")
    
    result = []
    for emp in pending_employees:
        user = db.query(User).filter(User.id == emp.user_id).first()
        if user:
            decrypted_cnic = "Unable to decrypt"
            try:
                if emp.cnic_encrypted:
                    decrypted_cnic = aes_encryption.decrypt_cnic(emp.cnic_encrypted)
            except Exception as e:
                print(f"[WARNING] Failed to decrypt CNIC for {emp.full_name}: {e}")
            
            emp_data = {
                "id": emp.id,
                "full_name": emp.full_name,
                "email": user.email,
                "cnic": decrypted_cnic,
                "department": emp.department or "N/A",
                "position": emp.position or "N/A",
                "security_question": emp.security_question,
                "created_at": emp.created_at.isoformat() if emp.created_at else None
            }
            print(f"[HR APPROVALS] Added employee: {emp.full_name} ({user.email})")
            result.append(emp_data)
    
    return {
        "pending_employees": result,
        "total_employees": total_employees,
        "pending_count": len(result)
    }

@app.post("/api/hr/approve-employee")
async def approve_employee(approval_data: HRApproval, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == approval_data.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Generate employee ID
    employee_id = f"EMP{employee.id:04d}"
    
    # Update employee record
    employee.employee_id = employee_id
    employee.department = approval_data.department
    employee.position = approval_data.position
    employee.is_approved = True
    employee.approved_at = datetime.now()
    
    # Activate user account
    user = db.query(User).filter(User.id == employee.user_id).first()
    user.is_active = True
    
    db.commit()
    
    # Send approval email
    await send_approval_email(user.email, employee.full_name, employee_id)
    
    return {"message": "Employee approved successfully"}

@app.post("/api/hr/disapprove-employee")
async def disapprove_employee(data: dict, db: Session = Depends(get_db)):
    employee_id = data.get('employee_id')
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee.is_disapproved = True
    db.commit()
    
    print(f"[HR DISAPPROVAL] Employee {employee.full_name} (ID: {employee.id}) has been disapproved")
    
    return {"message": "Employee disapproved successfully"}

@app.post("/api/employee/mark-attendance")
async def mark_attendance(request: MarkAttendanceRequest, db: Session = Depends(get_db)):
    today = date.today()

    dev_mode = os.getenv("DEV_MODE", "false").lower() == "true"
    
    print(f"\n[MARK ATTENDANCE] Employee ID: {request.employee_id} | Type: {type(request.employee_id)}")
    
    if not dev_mode and not validate_location(request.latitude, request.longitude):
        raise HTTPException(
            status_code=400, 
            detail="Location not authorized. You must be at NUST H-12 Islamabad to mark attendance."
        )
    
    if dev_mode:
        print("[DEV MODE] Location validation skipped")

    existing_attendance = db.query(Attendance).filter(
        Attendance.employee_id == request.employee_id,
        func.date(Attendance.date) == today
    ).first()

    if existing_attendance:
        raise HTTPException(status_code=400, detail="Attendance already marked for today")

    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    
    hmac_signature = hmac_integrity.compute_attendance_hmac(
        employee_id=request.employee_id,
        date_str=date_str,
        status="present",
        latitude=str(request.latitude),
        longitude=str(request.longitude)
    )
    
    attendance = Attendance(
        employee_id=request.employee_id,
        date=now,
        status="present",
        marked_at=now,
        latitude=str(request.latitude),
        longitude=str(request.longitude),
        location_name=request.location_name or "NUST H-12 Islamabad",
        hmac=hmac_signature
    )

    db.add(attendance)
    db.commit()
    
    print(f"[MARK ATTENDANCE] ✅ Saved attendance record: ID={attendance.id}, Employee={attendance.employee_id}, Status={attendance.status}")
    print(f"[MARK ATTENDANCE] 🔐 HMAC Signature: {hmac_signature[:16]}...")

    return {"message": "Attendance marked successfully"}


@app.get("/api/employee/my-attendance")
async def get_my_attendance(employee_id: int, db: Session = Depends(get_db)):
    attendance_records = db.query(Attendance).filter(
        Attendance.employee_id == employee_id
    ).order_by(Attendance.date.desc()).all()
    
    result = []
    for record in attendance_records:
        date_str = record.date.strftime("%Y-%m-%d") if record.date else ""
        
        is_valid = hmac_integrity.verify_attendance_hmac(
            employee_id=record.employee_id,
            date_str=date_str,
            status=record.status,
            stored_hmac=record.hmac,
            latitude=record.latitude or "",
            longitude=record.longitude or ""
        )
        
        result.append({
            "id": record.id,
            "employee_id": record.employee_id,
            "date": record.date.isoformat() if record.date else None,
            "status": record.status,
            "marked_at": record.marked_at.isoformat() if record.marked_at else None,
            "latitude": record.latitude,
            "longitude": record.longitude,
            "location_name": record.location_name or "N/A",
            "integrity_verified": is_valid,
            "tampered": not is_valid
        })
    
    return result

@app.get("/api/admin/all-attendance")
async def get_all_attendance(
    db: Session = Depends(get_db),
    start_date: str = None,
    end_date: str = None
):
    try:
        print("[*] Loading attendance records...")
        
        result = []
        approved_employees = db.query(Employee).filter(Employee.is_approved == True).all()
        print("[INFO] Found {} approved employees".format(len(approved_employees)))
        
        if not start_date:
            start_date = str(date.today())
        if not end_date:
            end_date = str(date.today())
        
        print(f"[ADMIN] Date range: {start_date} to {end_date}")
        
        for employee in approved_employees:
            user = db.query(User).filter(User.id == employee.user_id).first()
            attendance_records = db.query(Attendance).filter(
                Attendance.employee_id == employee.id,
                func.date(Attendance.date) >= start_date,
                func.date(Attendance.date) <= end_date
            ).order_by(Attendance.date.desc()).all()
            
            for attendance_record in attendance_records:
                date_str = attendance_record.date.strftime("%Y-%m-%d") if attendance_record.date else ""
                
                is_valid = hmac_integrity.verify_attendance_hmac(
                    employee_id=attendance_record.employee_id,
                    date_str=date_str,
                    status=attendance_record.status,
                    stored_hmac=attendance_record.hmac,
                    latitude=attendance_record.latitude or "",
                    longitude=attendance_record.longitude or ""
                )
                
                result.append({
                    "date": str(attendance_record.date),
                    "employee_name": employee.full_name or "Unknown",
                    "employee_id": employee.employee_id or "PENDING",
                    "email": user.email if user else "N/A",
                    "department": employee.department or "N/A",
                    "position": employee.position or "N/A",
                    "status": attendance_record.status,
                    "marked_at": str(attendance_record.marked_at) if attendance_record.marked_at else None,
                    "latitude": attendance_record.latitude,
                    "longitude": attendance_record.longitude,
                    "location_name": attendance_record.location_name or "N/A",
                    "integrity_verified": is_valid,
                    "tampered": not is_valid
                })
        
        print("[SUCCESS] Returning {} employee records".format(len(result)))
        return result
    except Exception as e:
        print("[ERROR] Fatal error in get_all_attendance: {}".format(str(e)))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/employee-report/{employee_id}")
async def get_employee_report(
    employee_id: int,
    db: Session = Depends(get_db),
    start_date: str = None,
    end_date: str = None
):
    try:
        if not start_date:
            start_date = str(date.today() - __import__('datetime').timedelta(days=30))
        if not end_date:
            end_date = str(date.today())
        
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        user = db.query(User).filter(User.id == employee.user_id).first()
        
        attendance_records = db.query(Attendance).filter(
            Attendance.employee_id == employee_id,
            func.date(Attendance.date) >= start_date,
            func.date(Attendance.date) <= end_date
        ).order_by(Attendance.date.desc()).all()
        
        total_days = len(attendance_records)
        present_days = len([a for a in attendance_records if a.status == 'present'])
        absent_days = len([a for a in attendance_records if a.status == 'absent'])
        
        attendance_data = []
        for a in attendance_records:
            date_str = a.date.strftime("%Y-%m-%d") if a.date else ""
            is_valid = hmac_integrity.verify_attendance_hmac(
                employee_id=a.employee_id,
                date_str=date_str,
                status=a.status,
                stored_hmac=a.hmac,
                latitude=a.latitude or "",
                longitude=a.longitude or ""
            )
            attendance_data.append({
                "date": str(a.date),
                "status": a.status,
                "marked_at": str(a.marked_at) if a.marked_at else None,
                "location": a.location_name or "N/A",
                "integrity_verified": is_valid,
                "tampered": not is_valid
            })
        
        return {
            "employee_name": employee.full_name,
            "employee_id": employee.employee_id,
            "department": employee.department or "N/A",
            "email": user.email if user else "N/A",
            "start_date": start_date,
            "end_date": end_date,
            "total_days": total_days,
            "present_days": present_days,
            "absent_days": absent_days,
            "attendance_rate": round((present_days / total_days * 100) if total_days > 0 else 0, 2),
            "attendance_records": attendance_data
        }
    except Exception as e:
        print("[ERROR] Error in get_employee_report: {}".format(str(e)))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/hr/employee-stats")
async def get_employee_stats(db: Session = Depends(get_db)):
    total_employees = db.query(Employee).filter(Employee.is_approved == True).count()
    pending_approvals = db.query(Employee).filter(Employee.is_approved == False).count()
    
    return {
        "total_employees": total_employees,
        "pending_approvals": pending_approvals
    }

@app.get("/api/debug/all-employees")
async def get_all_employees(db: Session = Depends(get_db)):
    try:
        employees = db.query(Employee).all()
        result = []
        for emp in employees:
            user = db.query(User).filter(User.id == emp.user_id).first()
            if user:
                result.append({
                    "id": emp.id,
                    "full_name": emp.full_name,
                    "email": user.email,
                    "cnic": emp.cnic
                })
        return result
    except Exception as e:
        print("[ERROR] Debug all-employees error: {}".format(str(e)))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/employees-list")
async def get_employees_list(db: Session = Depends(get_db)):
    """Get list of all approved employees for admin"""
    try:
        employees = db.query(Employee).filter(Employee.is_approved == True).all()
        result = []
        for emp in employees:
            user = db.query(User).filter(User.id == emp.user_id).first()
            result.append({
                "id": emp.id,
                "employee_id": emp.employee_id,
                "full_name": emp.full_name,
                "email": user.email if user else "N/A",
                "department": emp.department or "N/A",
                "position": emp.position or "N/A"
            })
        return result
    except Exception as e:
        print("[ERROR] Error in get_employees_list: {}".format(str(e)))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/all-employees-stats")
async def get_all_employees_stats(db: Session = Depends(get_db)):
    """Get all employees with their attendance statistics"""
    try:
        employees = db.query(Employee).filter(Employee.is_approved == True).order_by(Employee.full_name).all()
        result = []
        
        for emp in employees:
            user = db.query(User).filter(User.id == emp.user_id).first()
            
            attendance_records = db.query(Attendance).filter(
                Attendance.employee_id == emp.id
            ).all()
            
            total_attendance = len(attendance_records)
            present_count = len([a for a in attendance_records if a.status == 'present'])
            absent_count = len([a for a in attendance_records if a.status == 'absent'])
            attendance_rate = round((present_count / total_attendance * 100) if total_attendance > 0 else 0, 2)
            
            last_attendance = db.query(Attendance).filter(
                Attendance.employee_id == emp.id
            ).order_by(Attendance.date.desc()).first()
            
            result.append({
                "id": emp.id,
                "employee_id": emp.employee_id,
                "full_name": emp.full_name,
                "email": user.email if user else "N/A",
                "department": emp.department or "N/A",
                "position": emp.position or "N/A",
                "cnic": emp.cnic or "N/A",
                "total_attendance": total_attendance,
                "present_count": present_count,
                "absent_count": absent_count,
                "attendance_rate": attendance_rate,
                "last_attendance": str(last_attendance.date) if last_attendance else "No record",
                "joined_at": str(emp.created_at.date()) if emp.created_at else "N/A"
            })
        
        return result
    except Exception as e:
        print("[ERROR] Error in get_all_employees_stats: {}".format(str(e)))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/employee-attendance-history/{employee_id}")
async def get_employee_attendance_history(
    employee_id: int,
    db: Session = Depends(get_db),
    start_date: str = None,
    end_date: str = None
):
    """Get complete attendance history for a specific employee"""
    try:
        if not start_date:
            start_date = str(date.today() - __import__('datetime').timedelta(days=90))
        if not end_date:
            end_date = str(date.today())
        
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        user = db.query(User).filter(User.id == employee.user_id).first()
        
        attendance_records = db.query(Attendance).filter(
            Attendance.employee_id == employee_id,
            func.date(Attendance.date) >= start_date,
            func.date(Attendance.date) <= end_date
        ).order_by(Attendance.date.desc()).all()
        
        total_days = len(attendance_records)
        present_days = len([a for a in attendance_records if a.status == 'present'])
        absent_days = len([a for a in attendance_records if a.status == 'absent'])
        
        attendance_data = []
        for a in attendance_records:
            date_str = a.date.strftime("%Y-%m-%d") if a.date else ""
            is_valid = hmac_integrity.verify_attendance_hmac(
                employee_id=a.employee_id,
                date_str=date_str,
                status=a.status,
                stored_hmac=a.hmac,
                latitude=a.latitude or "",
                longitude=a.longitude or ""
            )
            attendance_data.append({
                "date": str(a.date.date()) if a.date else "N/A",
                "status": a.status,
                "marked_at": str(a.marked_at) if a.marked_at else "N/A",
                "location": a.location_name or "N/A",
                "latitude": a.latitude or "N/A",
                "longitude": a.longitude or "N/A",
                "integrity_verified": is_valid,
                "tampered": not is_valid
            })
        
        return {
            "employee_name": employee.full_name,
            "employee_id": employee.employee_id,
            "email": user.email if user else "N/A",
            "department": employee.department or "N/A",
            "position": employee.position or "N/A",
            "start_date": start_date,
            "end_date": end_date,
            "total_days": total_days,
            "present_days": present_days,
            "absent_days": absent_days,
            "attendance_rate": round((present_days / total_days * 100) if total_days > 0 else 0, 2),
            "attendance_records": attendance_data
        }
    except Exception as e:
        print("[ERROR] Error in get_employee_attendance_history: {}".format(str(e)))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/generate-report/{employee_id}")
async def generate_report(
    employee_id: int,
    db: Session = Depends(get_db),
    start_date: str = None,
    end_date: str = None
):
    """Generate attendance report in TXT format"""
    try:
        if not start_date:
            start_date = str(date.today() - __import__('datetime').timedelta(days=90))
        if not end_date:
            end_date = str(date.today())
        
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        user = db.query(User).filter(User.id == employee.user_id).first()
        
        attendance_records = db.query(Attendance).filter(
            Attendance.employee_id == employee_id,
            func.date(Attendance.date) >= start_date,
            func.date(Attendance.date) <= end_date
        ).order_by(Attendance.date.asc()).all()
        
        total_days = len(attendance_records)
        present_days = len([a for a in attendance_records if a.status == 'present'])
        absent_days = len([a for a in attendance_records if a.status == 'absent'])
        attendance_rate = round((present_days / total_days * 100) if total_days > 0 else 0, 2)
        
        report_lines = []
        report_lines.append("=" * 80)
        report_lines.append("EMPLOYEE ATTENDANCE REPORT".center(80))
        report_lines.append("=" * 80)
        report_lines.append("")
        report_lines.append("EMPLOYEE INFORMATION")
        report_lines.append("-" * 80)
        report_lines.append("Name:          {}".format(employee.full_name))
        report_lines.append("Employee ID:   {}".format(employee.employee_id))
        report_lines.append("Email:         {}".format(user.email if user else "N/A"))
        report_lines.append("Department:    {}".format(employee.department or "N/A"))
        report_lines.append("Position:      {}".format(employee.position or "N/A"))
        report_lines.append("")
        report_lines.append("REPORT PERIOD")
        report_lines.append("-" * 80)
        report_lines.append("From Date:     {}".format(start_date))
        report_lines.append("To Date:       {}".format(end_date))
        report_lines.append("")
        report_lines.append("ATTENDANCE SUMMARY")
        report_lines.append("-" * 80)
        report_lines.append("Total Days:    {}".format(total_days))
        report_lines.append("Present Days:  {}".format(present_days))
        report_lines.append("Absent Days:   {}".format(absent_days))
        report_lines.append("Attendance Rate: {}%".format(attendance_rate))
        report_lines.append("")
        report_lines.append("DETAILED ATTENDANCE RECORDS")
        report_lines.append("-" * 80)
        report_lines.append("Date          | Status   | Time              | Location")
        report_lines.append("-" * 80)
        
        for record in attendance_records:
            date_str = str(record.date.date()) if record.date else "N/A"
            status_str = record.status.upper()
            time_str = record.marked_at.strftime("%H:%M:%S") if record.marked_at else "N/A"
            location_str = record.location_name or "N/A"
            
            date_only = record.date.strftime("%Y-%m-%d") if record.date else ""
            is_valid = hmac_integrity.verify_attendance_hmac(
                employee_id=record.employee_id,
                date_str=date_only,
                status=record.status,
                stored_hmac=record.hmac,
                latitude=record.latitude or "",
                longitude=record.longitude or ""
            )
            
            tamper_flag = " [TAMPERED]" if not is_valid else ""
            report_lines.append("{} | {} | {} | {}{}".format(
                date_str.ljust(13),
                status_str.ljust(8),
                time_str.ljust(17),
                location_str[:30],
                tamper_flag
            ))
        
        report_lines.append("-" * 80)
        report_lines.append("Generated on: {}".format(datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        report_lines.append("=" * 80)
        
        report_content = "\n".join(report_lines)
        
        return {
            "report": report_content,
            "filename": "Attendance_Report_{}_{}_{}.txt".format(
                employee.employee_id,
                start_date.replace("-", ""),
                end_date.replace("-", "")
            )
        }
    except Exception as e:
        print("[ERROR] Error in generate_report: {}".format(str(e)))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/debug/status")
async def debug_status(db: Session = Depends(get_db)):
    try:
        attendance_count = db.query(Attendance).count()
        employee_count = db.query(Employee).count()
        user_count = db.query(User).count()
        
        return {
            "backend": "OK",
            "database": "OK",
            "total_attendance": attendance_count,
            "total_employees": employee_count,
            "total_users": user_count
        }
    except Exception as e:
        print("[ERROR] Debug status error: {}".format(str(e)))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Employee Attendance System API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)