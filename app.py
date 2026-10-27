from fastapi import FastAPI
from fastapi.responses import HTMLResponse
import os

app = FastAPI()

@app.get("/", response_class=HTMLResponse)
def read_root():
    # Templates or root lo unna file ni direct ga chadivi pampisthundi
    paths = ["templates/index.html", "index.html", "static/index.html"]
    for path in paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
    return "<h1>System Ready - Please check index.html path</h1>"

@app.get("/health")
def health():
    return {"status": "ok"}
