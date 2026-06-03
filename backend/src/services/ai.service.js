'use strict';

const SOS = require('../models/SOS');
const { Incident } = require('../models/index');
const logger = require('../utils/logger');

async function aiRiskAnalysis({ userId, coordinates, time = new Date() }) {
  const [lng, lat] = coordinates;
  const factors = [];
  let score = 30; // baseline

  // Factor 1: Time of day (no DB, never fails)
  const hour = time.getHours();
  if (hour >= 22 || hour < 5) { score += 25; factors.push('Late night hours'); }
  else if (hour >= 20 || hour < 7) { score += 10; factors.push('Evening/early morning'); }

  // Factor 2: Day of week (no DB, never fails)
  const day = time.getDay();
  if (day === 0 || day === 6) { score += 5; factors.push('Weekend'); }

  // Factor 3: Nearby SOS density (500m, last 30 days)
  // $near does NOT work with countDocuments — use $geoWithin + $centerSphere
  // $centerSphere radius must be in radians: metres / 6378100
  try {
    const nearbySOS = await SOS.countDocuments({
      location: {
        $geoWithin: {
          $centerSphere: [[lng, lat], 500 / 6378100],
        },
      },
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });
    if (nearbySOS >= 10) { score += 20; factors.push('High SOS activity area'); }
    else if (nearbySOS >= 5) { score += 10; factors.push('Moderate SOS activity area'); }
    else if (nearbySOS >= 1) { score += 5; factors.push('Some SOS history nearby'); }
  } catch (e) {
    logger.warn('AI factor 3 (nearby SOS) failed:', e.message, e.stack);
  }

  // Factor 4: Nearby high-severity incidents (1km, last 60 days)
  try {
    const nearbyIncidents = await Incident.countDocuments({
      location: {
        $geoWithin: {
          $centerSphere: [[lng, lat], 1000 / 6378100],
        },
      },
      createdAt: { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
      severity: { $in: ['high', 'critical'] },
    });
    if (nearbyIncidents >= 5) { score += 20; factors.push('High severity incidents in area'); }
    else if (nearbyIncidents >= 2) { score += 10; factors.push('Recent incidents nearby'); }
  } catch (e) {
    logger.warn('AI factor 4 (nearby incidents) failed:', e.message, e.stack);
  }

  // Factor 5: User's own SOS frequency this week
  try {
    const userRecentSOS = await SOS.countDocuments({
      user: userId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });
    if (userRecentSOS >= 3) { score += 15; factors.push('Multiple SOS this week'); }
  } catch (e) {
    logger.warn('AI factor 5 (user SOS history) failed:', e.message, e.stack);
  }

  score = Math.min(Math.max(Math.round(score), 0), 100);
  logger.info(`AI risk score computed: ${score}, factors: ${factors.join(', ') || 'none'}`);

  return { score, factors, level: getRiskLevel(score) };
}

function getRiskLevel(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

module.exports = { aiRiskAnalysis };