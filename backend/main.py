from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers.analytics import router as analytics_router
from routers.batch import router as batch_router
from routers.demo import router as demo_router
from routers.evaluate import router as evaluate_router
from routers.health import router as health_router
from services.firebase import init_firebase

app = FastAPI(title="Shadow Twin API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
    init_firebase(settings)


app.include_router(health_router)
app.include_router(demo_router)
app.include_router(evaluate_router)
app.include_router(analytics_router)
app.include_router(batch_router)
