from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os

app = FastAPI(title="MotoAssist Voice Desk")

# Mount static folder
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_root():
    # static లోపల ఉన్న index.html నే నేరుగా లోడ్ చేస్తుంది
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    return FileResponse("index.html")

@app.get("/api/ping")
def ping():
    return {"status": "ok"}
