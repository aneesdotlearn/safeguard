"""
Train SafeGuard Risk Model
===========================
Generates synthetic training data and trains a GradientBoosting classifier.
Includes `safe_zone_inside` as a protective feature that reduces risk score.

Replace the synthetic data section with real labeled data exported from MongoDB.

Usage:
    python train_model.py

Output:
    risk_model.joblib   ← loaded by ml_service_example.py

How to export real data from MongoDB:
    mongoexport --uri "$MONGODB_URI" --collection sos \
      --fields "aiRiskScore,aiRiskFactors,location,createdAt,user" \
      --out sos_export.json
"""

import numpy as np
import joblib
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_sample_weight

# ── Feature names — must exactly match featureExtractor.js + ml_service_example.py ──
FEATURE_NAMES = [
    "hour_sin",           # cyclic encoding of hour (sin)
    "hour_cos",           # cyclic encoding of hour (cos)
    "day_sin",            # cyclic encoding of day-of-week (sin)
    "day_cos",            # cyclic encoding of day-of-week (cos)
    "is_night",           # 1 if hour in [22, 5)
    "is_evening",         # 1 if hour in [20,22) or [5,7)
    "is_weekend",         # 1 if Saturday or Sunday
    "sos_density_500m",   # normalised SOS count within 500m (last 30d)
    "sos_density_1km",    # normalised SOS count within 1km  (last 30d)
    "incident_high_1km",  # normalised high-severity incident count 1km (60d)
    "incident_any_500m",  # normalised any incident count 500m (60d)
    "area_avg_risk",      # normalised average risk score of nearby SOS alerts
    "user_weekly_freq",   # normalised user SOS frequency last 7 days
    "user_monthly_freq",  # normalised user SOS frequency last 30 days
    "lat_norm",           # latitude  normalised to [0, 1]
    "lng_norm",           # longitude normalised to [0, 1]
    "safe_zone_inside",   # 1 if current coordinates are inside a user safe zone
]

N_FEATURES = len(FEATURE_NAMES)
IDX = {name: i for i, name in enumerate(FEATURE_NAMES)}  # quick lookup by name

# ── Synthetic data generation ──────────────────────────────────────────────────
N = 8000  # total synthetic samples (increase for better generalisation)
np.random.seed(42)

hours      = np.random.randint(0, 24, N)
days       = np.random.randint(0, 7,  N)
is_night   = ((hours >= 22) | (hours < 5)).astype(float)
is_evening = (((hours >= 20) & (hours < 22)) | ((hours >= 5) & (hours < 7))).astype(float)
is_weekend = ((days == 0) | (days == 6)).astype(float)

# safe_zone_inside: ~30% of samples are inside a safe zone
safe_zone_inside = np.random.binomial(1, 0.30, N).astype(float)

X = np.column_stack([
    np.sin(2 * np.pi * hours / 24),          # hour_sin
    np.cos(2 * np.pi * hours / 24),          # hour_cos
    np.sin(2 * np.pi * days  / 7),           # day_sin
    np.cos(2 * np.pi * days  / 7),           # day_cos
    is_night,                                 # is_night
    is_evening,                               # is_evening
    is_weekend,                               # is_weekend
    np.random.beta(1, 5, N),                  # sos_density_500m
    np.random.beta(1, 4, N),                  # sos_density_1km
    np.random.beta(1, 8, N),                  # incident_high_1km
    np.random.beta(1, 6, N),                  # incident_any_500m
    np.random.uniform(0, 1, N),               # area_avg_risk
    np.random.beta(1, 9, N),                  # user_weekly_freq
    np.random.beta(1, 7, N),                  # user_monthly_freq
    np.random.uniform(0, 1, N),               # lat_norm
    np.random.uniform(0, 1, N),               # lng_norm
    safe_zone_inside,                         # safe_zone_inside  ← NEW
])

assert X.shape[1] == N_FEATURES, f"Feature count mismatch: {X.shape[1]} vs {N_FEATURES}"

# ── Synthetic label logic ──────────────────────────────────────────────────────
# A sample is HIGH-RISK (1) when:
#   - late night OR
#   - high area SOS density OR
#   - high incident count OR
#   - high area baseline risk + moderate SOS density
#
# UNLESS the user is inside a safe zone — safe zone acts as a dampener.
# In real data this label comes from actual incident outcomes / human review.

danger_signal = (
    (X[:, IDX["is_night"]]           > 0.5)                                      |
    (X[:, IDX["sos_density_500m"]]   > 0.40)                                     |
    (X[:, IDX["incident_high_1km"]]  > 0.35)                                     |
    ((X[:, IDX["area_avg_risk"]]     > 0.60) & (X[:, IDX["sos_density_1km"]] > 0.20))
)

# Safe zone suppresses the high-risk label with 70% probability
# (real world: being home at night is safer, but not 100% safe)
safe_zone_suppression = (
    (X[:, IDX["safe_zone_inside"]] == 1) &
    (np.random.uniform(0, 1, N) < 0.70)
)

y = (danger_signal & ~safe_zone_suppression).astype(int)

print(f"Samples        : {N}")
print(f"Inside safe zone: {int(safe_zone_inside.sum())} ({safe_zone_inside.mean()*100:.1f}%)")
print(f"High-risk (1)  : {y.sum()} ({y.mean()*100:.1f}%)")
print(f"Low-risk  (0)  : {(1-y).sum()} ({(1-y).mean()*100:.1f}%)")
print(f"Features       : {N_FEATURES} → {FEATURE_NAMES}")

# ── Train / test split ─────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

# Handle class imbalance with sample weights
sample_weights = compute_sample_weight("balanced", y_train)

# ── Pipeline: scale → GradientBoosting ────────────────────────────────────────
pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("clf", GradientBoostingClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=4,
        subsample=0.8,
        min_samples_leaf=10,
        random_state=42,
    )),
])

print("\nTraining model…")
pipeline.fit(X_train, y_train, clf__sample_weight=sample_weights)

# ── Evaluation ─────────────────────────────────────────────────────────────────
y_pred      = pipeline.predict(X_test)
y_prob      = pipeline.predict_proba(X_test)[:, 1]
roc_auc     = roc_auc_score(y_test, y_prob)

print("\n── Classification Report ──────────────────────────────────")
print(classification_report(y_test, y_pred, target_names=["Low Risk", "High Risk"]))
print(f"ROC-AUC: {roc_auc:.4f}")

# ── Cross-validation ───────────────────────────────────────────────────────────
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(pipeline, X, y, cv=cv, scoring="roc_auc")
print(f"\n5-Fold CV ROC-AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# ── Feature importances ────────────────────────────────────────────────────────
importances = pipeline.named_steps["clf"].feature_importances_
ranked = sorted(zip(FEATURE_NAMES, importances), key=lambda x: -x[1])

print("\n── Feature Importances (all) ──────────────────────────────")
for name, imp in ranked:
    bar = "█" * int(imp * 200)
    marker = " ← safe zone signal" if name == "safe_zone_inside" else ""
    print(f"  {name:25s}: {imp:.4f}  {bar}{marker}")

# Verify safe_zone_inside learned a meaningful weight
sz_importance = dict(ranked)["safe_zone_inside"]
print(f"\nsafe_zone_inside importance: {sz_importance:.4f}")
if sz_importance < 0.01:
    print("  ⚠️  Low importance — consider increasing N or adjusting label logic.")
else:
    print("  ✅  Safe zone feature is contributing meaningfully to predictions.")

# ── Sanity check: score should be lower inside safe zones ─────────────────────
print("\n── Safe Zone Sanity Check ─────────────────────────────────")
# Create two identical high-risk scenarios differing only in safe_zone_inside
scenario_base = np.array([[
    np.sin(2 * np.pi * 23 / 24),  # hour_sin  (23:00)
    np.cos(2 * np.pi * 23 / 24),  # hour_cos
    np.sin(2 * np.pi * 6  / 7),   # day_sin
    np.cos(2 * np.pi * 6  / 7),   # day_cos
    1.0,   # is_night
    0.0,   # is_evening
    1.0,   # is_weekend
    0.5,   # sos_density_500m  (moderate)
    0.4,   # sos_density_1km
    0.3,   # incident_high_1km
    0.3,   # incident_any_500m
    0.65,  # area_avg_risk     (high baseline)
    0.4,   # user_weekly_freq
    0.3,   # user_monthly_freq
    0.5,   # lat_norm
    0.5,   # lng_norm
    0.0,   # safe_zone_inside  ← OUTSIDE
]])

scenario_safe = scenario_base.copy()
scenario_safe[0, IDX["safe_zone_inside"]] = 1.0   # ← INSIDE safe zone

prob_outside = pipeline.predict_proba(scenario_base)[0][1]
prob_inside  = pipeline.predict_proba(scenario_safe)[0][1]

score_outside = int(round(prob_outside * 100))
score_inside  = int(round(prob_inside  * 100))

print(f"  Same scenario, outside safe zone → risk score: {score_outside}/100")
print(f"  Same scenario, inside  safe zone → risk score: {score_inside}/100")

if score_inside < score_outside:
    print(f"  ✅  Safe zone correctly reduces risk by {score_outside - score_inside} points.")
else:
    print("  ⚠️  Safe zone did not reduce risk — retrain with more data or adjust label logic.")

# ── Save model ─────────────────────────────────────────────────────────────────
joblib.dump(pipeline, "risk_model.joblib")
print("\n✅  Model saved to risk_model.joblib")
print("    Run: uvicorn ml_service_example:app --host 0.0.0.0 --port 8000")