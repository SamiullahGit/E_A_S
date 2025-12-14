import os
import sys
from datetime import datetime
from sqlalchemy import text

os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.models import User
from app.encryption import get_password_hash

SECURITY_QUESTIONS = [
    "What was the name of your first pet?",
    "In what city were you born?",
    "What is your mother's maiden name?",
    "What was the name of your elementary school?",
    "What is your favorite book?",
    "What was your first car model?",
    "What is the name of your favorite childhood friend?",
    "In what city or town did your mother and father meet?"
]

def print_header():
    print("\n" + "="*60)
    print(" EMPLOYEE ATTENDANCE SYSTEM - DATABASE RESET".center(60))
    print("="*60 + "\n")

def reset_database():
    """Drop all tables and recreate them"""
    print("🗑️  Dropping all existing tables...")
    Base.metadata.drop_all(bind=engine)
    print("✅ All tables dropped successfully\n")
    
    print("🔨 Creating new tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created successfully\n")

def display_security_questions():
    """Display available security questions"""
    print("Available Security Questions:")
    print("-" * 60)
    for i, question in enumerate(SECURITY_QUESTIONS, 1):
        print(f"{i}. {question}")
    print()

def get_user_input(prompt, input_type=str, valid_range=None):
    """Get user input with validation"""
    while True:
        try:
            user_input = input(prompt).strip()
            
            if input_type == int:
                value = int(user_input)
                if valid_range and (value < valid_range[0] or value > valid_range[1]):
                    print(f"❌ Please enter a number between {valid_range[0]} and {valid_range[1]}")
                    continue
                return value
            elif input_type == str:
                if not user_input:
                    print("❌ Input cannot be empty. Please try again.")
                    continue
                return user_input
        except ValueError:
            print("❌ Invalid input. Please try again.")
            continue

def setup_user(role):
    """Setup a new user (Admin or HR)"""
    role_title = role.upper()
    print(f"\n{'='*60}")
    print(f" SETUP {role_title} USER".center(60))
    print('='*60 + "\n")
    
    email = get_user_input(f"Enter {role} email: ", str)
    
    while True:
        password = get_user_input(f"Enter {role} password: ", str)
        password_confirm = get_user_input(f"Confirm {role} password: ", str)
        
        if password != password_confirm:
            print("❌ Passwords do not match. Please try again.\n")
            continue
        
        if len(password) < 8:
            print("❌ Password must be at least 8 characters long.\n")
            continue
        
        break
    
    display_security_questions()
    question_index = get_user_input(
        f"Select a security question (1-{len(SECURITY_QUESTIONS)}): ",
        int,
        valid_range=(1, len(SECURITY_QUESTIONS))
    )
    
    selected_question = SECURITY_QUESTIONS[question_index - 1]
    security_answer = get_user_input(f"Answer to security question: ", str)
    
    return {
        "email": email,
        "password": password,
        "security_question": selected_question,
        "security_answer": security_answer,
        "role": role
    }

def create_user_in_db(user_data):
    """Create user in database"""
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        if existing_user:
            print(f"⚠️  User with email {user_data['email']} already exists. Skipping...\n")
            return False
        
        hashed_password = get_password_hash(user_data["password"])
        hashed_security_question = get_password_hash(user_data["security_question"])
        hashed_security_answer = get_password_hash(user_data["security_answer"])
        
        new_user = User(
            email=user_data["email"],
            hashed_password=hashed_password,
            role=user_data["role"],
            is_active=True,
            security_question=hashed_security_question,
            security_answer=hashed_security_answer,
            created_at=datetime.now()
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"✅ {user_data['role'].upper()} user created successfully!")
        print(f"   Email: {user_data['email']}")
        print(f"   Security Question: {user_data['security_question']}\n")
        
        return True
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating user: {str(e)}\n")
        return False
    finally:
        db.close()

def verify_database():
    """Verify database setup"""
    db = SessionLocal()
    try:
        admin_count = db.query(User).filter(User.role == "admin").count()
        hr_count = db.query(User).filter(User.role == "hr").count()
        
        print(f"\n{'='*60}")
        print(" DATABASE VERIFICATION".center(60))
        print('='*60)
        print(f"✅ Admin users: {admin_count}")
        print(f"✅ HR users: {hr_count}")
        print(f"✅ Database is ready!\n")
    except Exception as e:
        print(f"❌ Error verifying database: {str(e)}\n")
    finally:
        db.close()

def main():
    print_header()
    
    try:
        reset_database()
        
        admin_data = setup_user("admin")
        hr_data = setup_user("hr")
        
        print("\n" + "="*60)
        print(" CREATING USERS IN DATABASE".center(60))
        print("="*60 + "\n")
        
        create_user_in_db(admin_data)
        create_user_in_db(hr_data)
        
        verify_database()
        
        print("="*60)
        print(" SETUP COMPLETE ✨".center(60))
        print("="*60 + "\n")
        
    except KeyboardInterrupt:
        print("\n\n❌ Setup cancelled by user.\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
