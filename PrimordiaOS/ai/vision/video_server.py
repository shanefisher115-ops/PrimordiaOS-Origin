import subprocess
import tempfile
import os
import sys
import shutil
import math
import wave
import struct
from pathlib import Path
from fastapi import FastAPI
from pydantic import BaseModel
from PIL import Image, ImageDraw

from fastapi.staticfiles import StaticFiles

from backend.routes.render_video import router as render_video_router
from backend.video_encoder import get_ffmpeg_bin

app = FastAPI(title="PrimordialOS Video Render Service")
app.include_router(render_video_router)

out_dir = Path("out").resolve()
out_dir.mkdir(exist_ok=True)
app.mount("/videos", StaticFiles(directory=str(out_dir)), name="videos")

@app.get("/health")
def health_check():
    return {
        "status": "ONLINE",
        "service": "PrimordialOS Video Render API",
        "ffmpeg": get_ffmpeg_bin()
    }

if __name__ == "__main__":
    import uvicorn
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print(f"Starting PrimordialOS Video Render Server on port {port}...")
    uvicorn.run(app, host="127.0.0.1", port=port)
