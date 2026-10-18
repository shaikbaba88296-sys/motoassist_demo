import sqlite3
from datetime import datetime

DB_NAME = "motoassist.db"

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Vehicles & Service Jobs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS service_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_no TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        base_bill REAL DEFAULT 1200.0,
        current_bill REAL DEFAULT 1200.0,
        status_percent INTEGER DEFAULT 70,
        issue_part TEXT DEFAULT 'Front Brake Pad',
        issue_cost REAL DEFAULT 450.0,
        issue_status TEXT DEFAULT 'pending', -- pending, approved, rejected
        eta TEXT DEFAULT '05:00 PM',
        updated_at TEXT
    )
    """)

    # 2. Call Logs & Interaction History
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS call_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_no TEXT,
        user_speech TEXT,
        bot_response TEXT,
        action_taken TEXT,
        timestamp TEXT
    )
    """)

    # Insert sample record if table is empty
    cursor.execute("SELECT COUNT(*) FROM service_jobs")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO service_jobs (vehicle_no, customer_name, phone, updated_at)
        VALUES ('AP09XX1234', 'Ravi Kumar', '9876543210', ?)
        """, (datetime.now().strftime("%Y-%m-%d %H:%M:%S"),))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully!")
