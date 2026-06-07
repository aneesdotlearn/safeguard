"""
Train SafeGuard Risk Model
===========================
Generates synthetic training data and trains a GradientBoosting classifier.
Replace the synthetic data with real labeled data from your MongoDB export.

Usage:
    python train_model.py

Output:
    risk_model.joblib   ← load this in ml_service_example.py
"""

import numpy as np
import joblib
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

FEATURE_NAMES = [
    "hour_sin", "hour_cos", "day_sin", "day_cos",
    "is_night", "is_evening", "is_weekend",
    "sos_density_500m", "sos_density_1km",
    "incident_high_1km", "incident_any_500m",
    "area_avg_risk",
    "user_weekly_freq", "user_monthly_freq",
    "lat_norm", "lng_norm",
]

N = 5000  # synthetic samples

np.random.seed(42)
X = np.column_stack([
    np.sin(2 * np.pi * np.random.randint(0, 24, N) / 24),   # hour_sin
    np.cos(2 * np.pi * np.random.randint(0, 24, N) / 24),   # hour_cos
    np.sin(2 * np.pi * np.random.randint(0, 7,  N) / 7),    # day_sin
    np.cos(2 * np.pi * np.random.randint(0, 7,  N) / 7),    # day_cos
    np.random.binomial(1, 0.25, N),                           # is_night
    np.random.binomial(1, 0.15, N),                           # is_evening
    np.random.binomial(1, 0.28, N),                           # is_weekend
    np.random.beta(1, 5, N),                                  # sos_density_500m
    np.random.beta(1, 4, N),                                  # sos_density_1km
    np.random.beta(1, 8, N),                                  # incident_high_1km
    np.random.beta(1, 6, N),                                  # incident_any_500m
    np.random.uniform(0, 1, N),                               # area_avg_risk
    np.random.beta(1, 9, N),                                  # user_weekly_freq
    np.random.beta(1, 7, N),                                  # user_monthly_freq
    np.random.uniform(0, 1, N),                               # lat_norm
    np.random.uniform(0, 1, N),                               # lng_norm
])

# Synthetic label: high-risk = 1
# Real data: export labeled SOS outcomes from MongoDB
y = (
    (X[:, 4] > 0.5) |                    # is_night
    (X[:, 7] > 0.4) |                    # high sos density
    (X[:, 8] > 0.5) |                    # high incident density
    ((X[:, 11] > 0.6) & (X[:, 7] > 0.2))  # high area risk + density
).astype(int)

print(f"Samples: {N} | Positive (high-risk): {y.sum()} ({y.mean()*100:.1f}%)")

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("clf", GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=4,
        subsample=0.8,
        random_state=42,
    )),
])

pipeline.fit(X_train, y_train)
y_pred = pipeline.predict(X_test)

print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=["Low Risk", "High Risk"]))

# Feature importance
importances = pipeline.named_steps["clf"].feature_importances_
print("\nTop feature importances:")
for name, imp in sorted(zip(FEATURE_NAMES, importances), key=lambda x: -x[1])[:8]:
    print(f"  {name:25s}: {imp:.4f}")

joblib.dump(pipeline, "risk_model.joblib")
print("\nModel saved to risk_model.joblib")
print("Run: uvicorn ml_service_example:app --host 0.0.0.0 --port 8000")
