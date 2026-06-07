"""
SafeGuard ML Risk Scoring Service
===================================
A minimal FastAPI microservice that the MLModelAdapter calls.
Deploy this separately (Docker, EC2, GCP, etc.).

Install:
    pip install fastapi uvicorn scikit-learn joblib numpy pydantic

Train & save your model (run once):
    python train_model.py

Run:
    uvicorn ml_service:app --host 0.0.0.0 --port 8000

Environment variables (backend .env):
    ML_MODEL_URL=http://localhost:8000
    ML_MODEL_TIMEOUT_MS=3000
    ML_MODEL_API_KEY=your-secret-key   # optional
"""

from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel, Field
from typing import Optional, List
import numpy as np
import joblib
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("safeguard-ml")

app = FastAPI(title="SafeGuard Risk Scoring Service", version="1.0.0")

# ── Load model on startup ──────────────────────────────────────────────────────
# Replace with your actual trained model file
MODEL_PATH = os.getenv("MODEL_PATH", "risk_model.joblib")
API_KEY    = os.getenv("ML_MODEL_API_KEY", None)

model = None
try:
    model = joblib.load(MODEL_PATH)
    logger.info(f"Model loaded from {MODEL_PATH}")
except FileNotFoundError:
    logger.warning(f"Model file not found at {MODEL_PATH}. Using dummy model.")


# ── Feature schema — must match featureExtractor.js exactly ───────────────────
class FeatureVector(BaseModel):
    hour_sin:          float = Field(..., ge=-1, le=1)
    hour_cos:          float = Field(..., ge=-1, le=1)
    day_sin:           float = Field(..., ge=-1, le=1)
    day_cos:           float = Field(..., ge=-1, le=1)
    is_night:          float = Field(..., ge=0, le=1)
    is_evening:        float = Field(..., ge=0, le=1)
    is_weekend:        float = Field(..., ge=0, le=1)
    sos_density_500m:  float = Field(..., ge=0, le=1)
    sos_density_1km:   float = Field(..., ge=0, le=1)
    incident_high_1km: float = Field(..., ge=0, le=1)
    incident_any_500m: float = Field(..., ge=0, le=1)
    area_avg_risk:     float = Field(..., ge=0, le=1)
    user_weekly_freq:  float = Field(..., ge=0, le=1)
    user_monthly_freq: float = Field(..., ge=0, le=1)
    lat_norm:          float = Field(..., ge=0, le=1)
    lng_norm:          float = Field(..., ge=0, le=1)


class PredictRequest(BaseModel):
    features: FeatureVector


class PredictResponse(BaseModel):
    score:         int
    confidence:    float
    factors:       List[str]
    model_version: str


# ── Feature order must match training ─────────────────────────────────────────
FEATURE_ORDER = [
    "hour_sin", "hour_cos", "day_sin", "day_cos",
    "is_night", "is_evening", "is_weekend",
    "sos_density_500m", "sos_density_1km",
    "incident_high_1km", "incident_any_500m",
    "area_avg_risk",
    "user_weekly_freq", "user_monthly_freq",
    "lat_norm", "lng_norm",
]


def feature_to_array(fv: FeatureVector) -> np.ndarray:
    return np.array([[getattr(fv, k) for k in FEATURE_ORDER]], dtype=np.float32)


def generate_factors(fv: FeatureVector, score: int) -> List[str]:
    """Human-readable explanation of top risk signals."""
    factors = []
    if fv.is_night        >= 0.5: factors.append("Late night hours")
    if fv.is_evening      >= 0.5: factors.append("Evening / early morning")
    if fv.is_weekend      >= 0.5: factors.append("Weekend")
    if fv.sos_density_500m >= 0.5: factors.append("High SOS activity in area")
    elif fv.sos_density_500m >= 0.2: factors.append("Moderate SOS activity nearby")
    if fv.incident_high_1km >= 0.5: factors.append("High-severity incidents nearby")
    if fv.area_avg_risk   >= 0.6: factors.append("High baseline risk for this area")
    if fv.user_weekly_freq >= 0.6: factors.append("Multiple SOS alerts this week")
    return factors or (["Low risk area"] if score < 40 else [])


# ── Auth middleware ────────────────────────────────────────────────────────────
def verify_api_key(authorization: Optional[str] = Header(None)):
    if not API_KEY:
        return  # no key configured = open
    if not authorization or authorization != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Endpoints ──────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": model is not None}


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest, authorization: Optional[str] = Header(None)):
    verify_api_key(authorization)

    fv = request.features
    print("🔥 ML MODEL CALLED")
    print("Features:", fv)

    if model is not None:
        print("✅ USING TRAINED MODEL")
        # ── Real trained model ─────────────────────────────────────────────
        X = feature_to_array(fv)
        try:
            # If classifier: predict_proba gives P(high_risk)
            if hasattr(model, "predict_proba"):
                prob = float(model.predict_proba(X)[0][1])
                print("PROBABILITY =", prob)
                score = int(round(20 + prob * 60))
                print("SCORE =", score)
                print("FEATURES =", fv)
                confidence = float(max(prob, 1 - prob))
                print(f"🎯 Risk Score: {score}")
                print(f"📊 Confidence: {confidence}")
            # If regressor: direct score output
            else:
                raw_score  = float(model.predict(X)[0])
                score      = int(round(max(0, min(100, raw_score))))
                confidence = 0.85
        except Exception as e:
            logger.error(f"Model prediction failed: {e}")
            raise HTTPException(status_code=500, detail=f"Model error: {e}")
    else:
        print("⚠️ USING DUMMY FALLBACK MODEL")
        # ── Dummy model (no model file found) ─────────────────────────────
        # Weighted sum of most important features as a placeholder
        raw = (
            fv.is_night          * 0.25 +
            fv.sos_density_500m  * 0.20 +
            fv.incident_high_1km * 0.20 +
            fv.area_avg_risk     * 0.15 +
            fv.user_weekly_freq  * 0.10 +
            fv.is_evening        * 0.05 +
            fv.is_weekend        * 0.05
        )
        score      = int(round(30 + raw * 70))   # scale to 30-100
        confidence = 0.5

    factors = generate_factors(fv, score)
    

    return PredictResponse(
        score         = score,
        confidence    = confidence,
        factors       = factors,
        model_version = "1.0.0",
    )
    