'use strict';

const SOS = require('../../models/SOS');
const { Incident, SafeZone } = require('../../models/index');
const logger = require('../../utils/logger');

/**
 * extractFeatures()
 * Returns a normalised feature vector including a safe zone signal.
 * safe_zone_inside = 1.0 means the user is currently inside one of their active safe zones.
 */
async function extractFeatures({ userId, coordinates, time = new Date() }) {
  const [lng, lat] = coordinates;
  const now = time instanceof Date ? time : new Date(time);

  const hour      = now.getHours();
  const dayOfWeek = now.getDay();
  const isNight   = hour >= 22 || hour < 5;
  const isEvening = (hour >= 20 && hour < 22) || (hour >= 5 && hour < 7);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const THIRTY_DAYS = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const SIXTY_DAYS  = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const SEVEN_DAYS  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);

  const [
    sosDensity500m,
    sosDensity1km,
    incidentHighNearby,
    incidentAnyNearby,
    userWeeklyFreq,
    userMonthlyFreq,
    avgRiskNearby,
    // New: fetch all active safe zones for this user
    userSafeZones,
  ] = await Promise.all([
    SOS.countDocuments({ location: { $geoWithin: { $centerSphere: [[lng, lat], 500  / 6378100] } }, createdAt: { $gte: THIRTY_DAYS } }),
    SOS.countDocuments({ location: { $geoWithin: { $centerSphere: [[lng, lat], 1000 / 6378100] } }, createdAt: { $gte: THIRTY_DAYS } }),
    Incident.countDocuments({ location: { $geoWithin: { $centerSphere: [[lng, lat], 1000 / 6378100] } }, severity: { $in: ['high', 'critical'] }, createdAt: { $gte: SIXTY_DAYS } }),
    Incident.countDocuments({ location: { $geoWithin: { $centerSphere: [[lng, lat], 500  / 6378100] } }, createdAt: { $gte: SIXTY_DAYS } }),
    SOS.countDocuments({ user: userId, createdAt: { $gte: SEVEN_DAYS } }),
    SOS.countDocuments({ user: userId, createdAt: { $gte: THIRTY_DAYS } }),
    SOS.aggregate([
      { $match: { location: { $geoWithin: { $centerSphere: [[lng, lat], 1000 / 6378100] } }, createdAt: { $gte: THIRTY_DAYS }, aiRiskScore: { $exists: true, $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$aiRiskScore' } } },
    ]).then((r) => r[0]?.avg ?? null),

    // Fetch user's active safe zones with their coordinates + radius
    SafeZone.find({ user: userId, isActive: true }).select('location radius').lean(),
  ]);

  // ── Safe zone check ────────────────────────────────────────────────────────
  // Use the Haversine formula to check if current position is inside any zone
  const insideSafeZone = userSafeZones.some((zone) => {
    const [zLng, zLat] = zone.location.coordinates;
    const dist = haversineMeters(lat, lng, zLat, zLng);
    return dist <= zone.radius;
  });

  // ── Normalised feature vector ──────────────────────────────────────────────
  const features = {
    hour_sin:          Math.sin((2 * Math.PI * hour) / 24),
    hour_cos:          Math.cos((2 * Math.PI * hour) / 24),
    day_sin:           Math.sin((2 * Math.PI * dayOfWeek) / 7),
    day_cos:           Math.cos((2 * Math.PI * dayOfWeek) / 7),
    is_night:          isNight   ? 1 : 0,
    is_evening:        isEvening ? 1 : 0,
    is_weekend:        isWeekend ? 1 : 0,
    sos_density_500m:  Math.min(sosDensity500m  / 20, 1),
    sos_density_1km:   Math.min(sosDensity1km   / 40, 1),
    incident_high_1km: Math.min(incidentHighNearby / 10, 1),
    incident_any_500m: Math.min(incidentAnyNearby  / 20, 1),
    area_avg_risk:     avgRiskNearby != null ? avgRiskNearby / 100 : 0.3,
    user_weekly_freq:  Math.min(userWeeklyFreq  / 5,  1),
    user_monthly_freq: Math.min(userMonthlyFreq / 15, 1),
    lat_norm:          (lat  + 90)  / 180,
    lng_norm:          (lng  + 180) / 360,
    // Safe zone signal: 1 = inside a safe zone, 0 = outside all zones
    safe_zone_inside:  insideSafeZone ? 1 : 0,
  };

  const raw = {
    hour, dayOfWeek, isNight, isEvening, isWeekend,
    sosDensity500m, sosDensity1km,
    incidentHighNearby, incidentAnyNearby,
    userWeeklyFreq, userMonthlyFreq,
    avgRiskNearby,
    insideSafeZone,
    safeZoneCount: userSafeZones.length,
    coordinates,
  };

  logger.debug('Features extracted', { insideSafeZone, safeZoneCount: userSafeZones.length });

  return { features, raw };
}

/**
 * Haversine distance in metres between two lat/lng points.
 */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R  = 6378100; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { extractFeatures };