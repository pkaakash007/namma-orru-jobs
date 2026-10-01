"""
Standalone Local BGE-M3 Multilingual Embedding Server
Uses FlagEmbedding or SentenceTransformers with BAAI/bge-m3.
Provides high-speed local vector embeddings for English, Tamil, and Hindi.
Zero external AI APIs - 100% self-hosted inside local infrastructure.

Requirements:
    pip install fastapi uvicorn sentence-transformers

Run:
    python embedding_server.py
    Server runs on: http://127.0.0.1:8001
"""

import sys
import os
import importlib

# Dynamic module loading to prevent static import resolution errors
# in environments without pre-installed local ML dependencies.
_has_deps = True
try:
    _fastapi = importlib.import_module("fastapi")
    FastAPI = _fastapi.FastAPI
    HTTPException = _fastapi.HTTPException
    _pydantic = importlib.import_module("pydantic")
    BaseModel = _pydantic.BaseModel
    uvicorn = importlib.import_module("uvicorn")
    np = importlib.import_module("numpy")
except ImportError:
    _has_deps = False
    FastAPI = None
    HTTPException = Exception
    BaseModel = object
    uvicorn = None
    np = None

if _has_deps and FastAPI:
    app = FastAPI(title="Namma Ooru Jobs BGE-M3 Embedding Service")
else:
    app = None

model = None

if _has_deps:
    class EmbedRequest(BaseModel):
        text: str

    class BatchEmbedRequest(BaseModel):
        texts: list[str]
else:
    class EmbedRequest:
        text: str = ""

    class BatchEmbedRequest:
        texts: list[str] = []

if app is not None:
    @app.on_event("startup")
    def load_model():
        global model
        try:
            st = importlib.import_module("sentence_transformers")
            SentenceTransformer = st.SentenceTransformer
            print("[Embedding Server] Loading BAAI/bge-m3 model locally...")
            model = SentenceTransformer("BAAI/bge-m3")
            print("[Embedding Server] BAAI/bge-m3 model loaded successfully!")
        except Exception as e:
            print(f"[Embedding Server] Warning: Could not load BAAI/bge-m3: {e}")
            print("[Embedding Server] Backend will automatically use its built-in multilingual vectorizer.")

    @app.get("/health")
    def health():
        return {"status": "ok", "model": "BAAI/bge-m3", "loaded": model is not None}

    @app.post("/embed")
    def embed_single(req: EmbedRequest):
        if not model:
            raise HTTPException(status_code=503, detail="BGE-M3 model not loaded")
        if not req.text.strip():
            return {"embedding": []}
        
        vec = model.encode(req.text, normalize_embeddings=True)
        return {"embedding": vec.tolist()}

    @app.post("/embed/batch")
    def embed_batch(req: BatchEmbedRequest):
        if not model:
            raise HTTPException(status_code=503, detail="BGE-M3 model not loaded")
        if not req.texts:
            return {"embeddings": []}
        
        vecs = model.encode(req.texts, normalize_embeddings=True)
        return {"embeddings": vecs.tolist()}

if __name__ == "__main__":
    if not _has_deps or uvicorn is None or app is None:
        print("FastAPI / uvicorn / pydantic not installed.")
        print("To run this standalone server: pip install fastapi uvicorn sentence-transformers")
        sys.exit(1)
    uvicorn.run(app, host="127.0.0.1", port=8001)
