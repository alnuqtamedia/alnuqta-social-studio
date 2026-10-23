"""Private, single-speaker SILMA service. Reference files never leave this host."""
import base64
import io
import os
import secrets
import threading
import wave
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


def create_app(synthesizer=None):
    token = os.environ.get("PRIVATE_VOICE_TOKEN", "")
    if len(token) < 32:
        raise RuntimeError("Set PRIVATE_VOICE_TOKEN to a random secret of at least 32 characters")
    origin = os.environ.get("PRIVATE_VOICE_ORIGIN", "https://alnuqta-social-studio.vercel.app")
    if not origin.startswith(("https://", "http://localhost:")) or origin.endswith("/"):
        raise RuntimeError("Set one exact Studio origin, without a trailing slash")
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(CORSMiddleware, allow_origins=[origin], allow_methods=["POST"],
                       allow_headers=["Authorization", "Content-Type"])
    lock = threading.Lock()
    model = None
    reference = os.environ.get("PRIVATE_VOICE_REFERENCE", "")
    transcript_path = os.environ.get("PRIVATE_VOICE_TRANSCRIPT", "")
    if synthesizer is None:
        if not Path(reference).is_file() or not Path(transcript_path).is_file():
            raise RuntimeError("Private reference WAV and matching UTF-8 transcript are required")
        transcript = Path(transcript_path).read_text().strip()
        if not transcript:
            raise RuntimeError("Reference transcript is empty")
        with wave.open(reference, "rb") as audio:
            duration = audio.getnframes() / audio.getframerate()
            if audio.getnchannels() != 1 or audio.getframerate() != 24000 or not 2 <= duration <= 8.05:
                raise RuntimeError("Use a mono 24 kHz WAV of 2–8 seconds with its exact transcript")

    def authorize(authorization):
        if not secrets.compare_digest(authorization or "", "Bearer " + token):
            raise HTTPException(401, "Unauthorized")

    @app.post("/status")
    def status(authorization: str | None = Header(default=None)):
        authorize(authorization)
        return {"available": True, "voice": "private-owner", "engine": "silma-tts", "generated": True}

    class Speech(BaseModel):
        text: str = Field(min_length=1, max_length=6000)

    @app.post("/speech")
    def speech(body: Speech, authorization: str | None = Header(default=None)):
        nonlocal model
        authorize(authorization)
        text = body.text.strip()
        if not text:
            raise HTTPException(422, "Empty text")
        if not lock.acquire(blocking=False):
            raise HTTPException(429, "Voice service is busy")
        try:
            if synthesizer is not None:
                data, duration = synthesizer(text)
            else:
                import soundfile as sf
                from silma_tts.api import SilmaTTS
                if model is None:
                    model = SilmaTTS(device=os.environ.get("PRIVATE_VOICE_DEVICE", "cpu"))
                wav, sr, _ = model.infer(ref_file=reference, ref_text=transcript,
                                        gen_text=text, speed=1.0)
                out = io.BytesIO()
                sf.write(out, wav, sr, format="WAV", subtype="PCM_16")
                data, duration = out.getvalue(), len(wav) / sr
            return {"audio": base64.b64encode(data).decode(), "mimeType": "audio/wav",
                    "duration": duration, "voice": "private-owner", "generated": True}
        except HTTPException:
            raise
        except Exception:
            # Do not leak reference paths, text or model internals to clients/logs.
            raise HTTPException(503, "Private voice generation failed") from None
        finally:
            lock.release()

    return app
