'use strict';

const SAFE_ZONE_REDUCTION = 20; // points deducted when inside a safe zone

class RuleBasedModel {
  get name() { return 'rule-based-fallback'; }

  predict(features, raw) {
    let score = 30;
    const factors = [];

    // ── Positive risk signals ────────────────────────────────────────────────
    if (raw.isNight)   { score += 25; factors.push('Late night hours (22:00–05:00)'); }
    else if (raw.isEvening) { score += 10; factors.push('Evening / early morning hours'); }
    if (raw.isWeekend) { score += 5;  factors.push('Weekend'); }

    if (raw.sosDensity500m >= 10)      { score += 20; factors.push('High SOS activity within 500m'); }
    else if (raw.sosDensity500m >= 5)  { score += 10; factors.push('Moderate SOS activity within 500m'); }
    else if (raw.sosDensity500m >= 1)  { score += 5;  factors.push('Some SOS history nearby'); }

    if (raw.incidentHighNearby >= 5)   { score += 20; factors.push('High-severity incidents near location'); }
    else if (raw.incidentHighNearby >= 2) { score += 10; factors.push('Recent serious incidents nearby'); }
    if (raw.incidentAnyNearby  >= 10)  { score += 5;  factors.push('Elevated incident reports in area'); }

    if (raw.avgRiskNearby != null && raw.avgRiskNearby >= 70) {
      score += 10; factors.push('High average risk score for this area');
    }

    if (raw.userWeeklyFreq >= 3)       { score += 15; factors.push('Multiple SOS alerts triggered this week'); }
    else if (raw.userWeeklyFreq >= 1)  { score += 5;  factors.push('Recent SOS activity by this user'); }

    // ── Safe zone reduction (applied after all positive signals) ─────────────
    if (raw.insideSafeZone) {
      score -= SAFE_ZONE_REDUCTION;
      factors.push('Inside a safe zone (risk reduced)');
    }

    return {
      score:      Math.min(Math.max(Math.round(score), 0), 100),
      confidence: 0.6,
      factors,
      model:      this.name,
    };
  }
}

module.exports = new RuleBasedModel();