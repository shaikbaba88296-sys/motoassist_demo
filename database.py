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
    
    # 1. Service Jobs Table
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
        issue_status TEXT DEFAULT 'pending',
        eta TEXT DEFAULT '05:00 PM',
        updated_at TEXT
    )
    """)

    # 2. Call Logs Table
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

    # Multi-scenario diverse datasets injection
    cursor.execute("SELECT COUNT(*) FROM service_jobs")
    count = cursor.fetchone()[0]
    if count < 6:
        cursor.execute("DELETE FROM service_jobs")
        sample_vehicles = [
            ('AP09XX1234', 'Ravi Kumar', '9876543210', 1200.0, 1200.0, 75, 'Front Brake Pad', 450.0, 'pending', '05:00 PM', datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
            ('AP21BC5678', 'Suresh Reddy', '9123456780', 2500.0, 2500.0, 45, 'Clutch Plate & Engine Oil Leak', 1800.0, 'pending', '06:30 PM', datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
            ('TS07EF9999', 'Praveen Kumar', '9988776655', 850.0, 850.0, 85, 'Battery Replacement', 1250.0, 'pending', '04:00 PM', datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
            ('AP39AZ4321', 'Mahesh Naidu', '9012345678', 1500.0, 2700.0, 95, 'Chain Sprocket Set', 1200.0, 'approved', '05:15 PM', datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
            ('KA04MK7711', 'Rajesh Varma', '9345678901', 950.0, 950.0, 90, 'General Inspection (No Issues)', 0.0, 'approved', '04:30 PM', datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
            ('TN09ZZ3344', 'Anitha Rao', '9456123789', 1100.0, 1100.0, 60, 'Rear Tyre Tube Replacement', 600.0, 'rejected', '05:45 PM', datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        ]
        cursor.executemany("""
        INSERT INTO service_jobs (vehicle_no, customer_name, phone, base_bill, current_bill, status_percent, issue_part, issue_cost, issue_status, eta, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, sample_vehicles)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Multi-scenario datasets loaded successfully!")
