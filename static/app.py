from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
from datetime import datetime
import database

app = FastAPI(title="MotoAssist Voice Desk")

# Mount static folder
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize Database tables on startup
@app.on_event("startup")
def on_startup():
    database.init_db()

class ApprovalRequest(BaseModel):
    decision: str
    vehicle_no: str = "AP09XX1234"

class LogRequest(BaseModel):
    vehicle_no: str = "AP09XX1234"
    user_speech: str
    bot_response: str
    action_taken: str = "none"

@app.get("/")
def read_root():
    return FileResponse("static/index.html")

# 1. Fetch live service status from SQLite Database
@app.get("/api/status")
def get_service_status(vehicle_no: str = "AP09XX1234"):
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM service_jobs WHERE vehicle_no = ?", (vehicle_no,))
    job = cursor.fetchone()
    conn.close()

    if not job:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    return {
        "vehicle_no": job["vehicle_no"],
        "customer_name": job["customer_name"],
        "status_percent": job["status_percent"],
        "base_bill": job["base_bill"],
        "current_bill": job["current_bill"],
        "issue_part": job["issue_part"],
        "issue_cost": job["issue_cost"],
        "issue_status": job["issue_status"],
        "eta": job["eta"]
    }

# 2. Process Approval and Update Database
@app.post("/api/approve")
def process_approval(req: ApprovalRequest):
    conn = database.get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM service_jobs WHERE vehicle_no = ?", (req.vehicle_no,))
    job = cursor.fetchone()
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="Vehicle not found")

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if req.decision == "approved":
        new_bill = job["base_bill"] + job["issue_cost"]
        new_eta = "05:30 PM"
        cursor.execute("""
            UPDATE service_jobs 
            SET current_bill = ?, issue_status = 'approved', eta = ?, updated_at = ?
            WHERE vehicle_no = ?
        """, (new_bill, new_eta, now, req.vehicle_no))
    else:
        new_bill = job["base_bill"]
        new_eta = "05:00 PM"
        cursor.execute("""
            UPDATE service_jobs 
            SET current_bill = ?, issue_status = 'rejected', eta = ?, updated_at = ?
            WHERE vehicle_no = ?
        """, (new_bill, new_eta, now, req.vehicle_no))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "decision": req.decision,
        "new_bill": new_bill,
        "eta": new_eta
    }

# 3. Save Call & Conversation Logs
@app.post("/api/log")
def log_conversation(log: LogRequest):
    conn = database.get_db()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute("""
        INSERT INTO call_logs (vehicle_no, user_speech, bot_response, action_taken, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (log.vehicle_no, log.user_speech, log.bot_response, log.action_taken, now))
    
    conn.commit()
    conn.close()
    return {"status": "logged"}
