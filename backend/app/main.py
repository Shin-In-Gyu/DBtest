from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.knu import router as knu_router

app = FastAPI(debug=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(knu_router, prefix="/api/knu", tags=["KNU"])
