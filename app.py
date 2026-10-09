from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI(title="MotoAssist Prototype")

service_data = {
    "vehicle_number": "AP09XX1234",
    "customer_name": "Ravi Kumar",
    "status": "In Progress (70%)",
    "original_work": "General Service & Oil Change",
    "extra_repair": {
        "issue": "Front Brake Pad worn out",
        "estimated_cost": 450,
        "additional_time": "25 mins",
        "approval_status": "Pending"
    },
    "current_bill": 1200,
    "eta": "05:00 PM"
}

class ApprovalRequest(BaseModel):
    decision: str

@app.get("/api/status")
def get_status():
    return service_data

@app.post("/api/approve")
def update_approval(req: ApprovalRequest):
    if req.decision.lower() == "approved":
        service_data["extra_repair"]["approval_status"] = "Approved"
        service_data["current_bill"] += service_data["extra_repair"]["estimated_cost"]
        service_data["eta"] = "05:30 PM"
        return {"success": True, "message": "Repair approved", "new_bill": service_data["current_bill"], "eta": service_data["eta"]}
    else:
        service_data["extra_repair"]["approval_status"] = "Rejected"
        return {"success": True, "message": "Repair rejected", "new_bill": service_data["current_bill"], "eta": service_data["eta"]}

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def home():
    return FileResponse("static/index.html")