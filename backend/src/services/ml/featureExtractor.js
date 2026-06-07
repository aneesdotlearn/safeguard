'use strict';

const SOS = require('../../models/SOS');
const { Incident } = require('../../models/index');
const logger = require('../../utils/logger');

/**
 * extractFeatures()
 * ------------------
 * Queries MongoDB for every measurable signal and returns a flat,
 * normalised feature vector that can be fed to any model:
 *   - a scikit-learn / XGBoost REST endpoint
 *   - a TensorFlow.js model loaded in-process
 *   - a Python FastAPI microservice
 *   - the built-in rule-based fallback
 *
 * ALL values are normalised to [0, 1] so the downstream model
 * receives consistent input regardless of scale.
 *
 * @param {Object} params
 * @param {string} params.userId      - MongoDB ObjectId string
 * @param {number[]} params.coordinates - [lng, lat]
 * @param {Date}   params.time        - timestamp of the event
 * @returns {Promise<Object>}          - feature vector + raw signals
 */
async function extractFeatures({ userId, coordinates, time = new Date() }) {
  const [lng, lat] = coordinates;
  const now = time instanceof Date ? time : new Date(time);

  // ── Time features ─────────────────────────────────────────────────────────
  const hour       = now.getHours();               // 0-23
  const dayOfWeek  = now.getDay();                 // 0=Sun … 6=Sat
  const isNight    = hour >= 22 || hour < 5;       // boolean
  const isEvening  = (hour >= 20 && hour < 22) || (hour >= 5 && hour < 7);
  const isWeekend  = dayOfWeek === 0 || dayOfWeek === 6;

  // ── Geospatial signals (parallel queries) ─────────────────────────────────
  const GEO_QUERY = (maxDistance) => ({
    $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: maxDistance },
  });

  const THIRTY_DAYS  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const SIXTY_DAYS   = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const SEVEN_DAYS   = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);

  const [
    sosDensity500m,
    sosDensity1km,
    incidentHighNearby,
    incidentAnyNearby,
    userWeeklyFreq,
    userMonthlyFreq,
    avgRiskNearby,
  ] = await Promise.all([
    // SOS alerts within 500m, last 30 days
    SOS.countDocuments({ location: { $geoWithin: { $centerSphere: [[lng, lat], 500 / 6378100] } }, createdAt: { $gte: THIRTY_DAYS } }),

    // SOS alerts within 1km, last 30 days
    SOS.countDocuments({ location: { $geoWithin: { $centerSphere: [[lng, lat], 1000 / 6378100] } }, createdAt: { $gte: THIRTY_DAYS } }),

    // High/critical incidents within 1km, last 60 days
    Incident.countDocuments({ location: { $geoWithin: { $centerSphere: [[lng, lat], 1000 / 6378100] } }, severity: { $in: ['high', 'critical'] }, createdAt: { $gte: SIXTY_DAYS } }),

    // Any incidents within 500m, last 60 days
    Incident.countDocuments({ location: { $geoWithin: { $centerSphere: [[lng, lat], 500 / 6378100] } }, createdAt: { $gte: SIXTY_DAYS } }),

    // This user's SOS count in last 7 days
    SOS.countDocuments({ user: userId, createdAt: { $gte: SEVEN_DAYS } }),

    // This user's SOS count in last 30 days
    SOS.countDocuments({ user: userId, createdAt: { $gte: THIRTY_DAYS } }),

    // Average AI risk score of nearby SOS alerts (area risk baseline)
    SOS.aggregate([
      {
        $match: {
          location: { $geoWithin: { $centerSphere: [[lng, lat], 1000 / 6378100] } },
          createdAt: { $gte: THIRTY_DAYS },
          aiRiskScore: { $exists: true, $ne: null },
        },
      },
      { $group: { _id: null, avg: { $avg: '$aiRiskScore' } } },
    ]).then((r) => r[0]?.avg ?? null),
  ]);

  // ── Normalised features (all values in [0, 1]) ────────────────────────────
  const features = {
    // Time
    hour_sin:          Math.sin((2 * Math.PI * hour) / 24),       // cyclic encoding
    hour_cos:          Math.cos((2 * Math.PI * hour) / 24),       // cyclic encoding
    day_sin:           Math.sin((2 * Math.PI * dayOfWeek) / 7),
    day_cos:           Math.cos((2 * Math.PI * dayOfWeek) / 7),
    is_night:          isNight   ? 1 : 0,
    is_evening:        isEvening ? 1 : 0,
    is_weekend:        isWeekend ? 1 : 0,

    // Area danger signals (capped + normalised)
    sos_density_500m:  Math.min(sosDensity500m  / 20, 1),         // cap at 20
    sos_density_1km:   Math.min(sosDensity1km   / 40, 1),         // cap at 40
    incident_high_1km: Math.min(incidentHighNearby / 10, 1),      // cap at 10
    incident_any_500m: Math.min(incidentAnyNearby  / 20, 1),      // cap at 20
    area_avg_risk:     avgRiskNearby != null ? avgRiskNearby / 100 : 0.3, // normalise 0-100 → 0-1

    // User behaviour signals
    user_weekly_freq:  Math.min(userWeeklyFreq  / 5,  1),         // cap at 5
    user_monthly_freq: Math.min(userMonthlyFreq / 15, 1),         // cap at 15

    // Geolocation (raw — useful for grid-based models)
    lat_norm:          (lat + 90)  / 180,                          // 0-1
    lng_norm:          (lng + 180) / 360,                          // 0-1
  };

  // ── Raw signals (kept for logging + explainability) ───────────────────────
  const raw = {
    hour, dayOfWeek, isNight, isEvening, isWeekend,
    sosDensity500m, sosDensity1km,
    incidentHighNearby, incidentAnyNearby,
    userWeeklyFreq, userMonthlyFreq,
    avgRiskNearby,
    coordinates,
  };

  return { features, raw };
}

module.exports = { extractFeatures };
