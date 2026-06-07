'use strict';

/**
 * RuleBasedModel
 * --------------
 * Implements the same IModel interface as the ML model adapter.
 * Used as fallback when the ML endpoint is unavailable.
 *
 * Input:  feature vector from featureExtractor.js
 * Output: { score: 0-100, confidence: 0-1, factors: string[] }
 */
class RuleBasedModel {
  get name() { return 'rule-based-fallback'; }

  /**
   * @param {Object} features - normalised feature vector
   * @param {Object} raw      - raw signal values for human-readable factors
   * @returns {{ score: number, confidence: number, factors: string[] }}
   */
  predict(features, raw) {
    let score = 30; // baseline
    const factors = [];

    // Time signals
    if (raw.isNight)   { score += 25; factors.push('Late night hours (22:00–05:00)'); }
    else if (raw.isEvening) { score += 10; factors.push('Evening / early morning hours'); }
    if (raw.isWeekend) { score += 5;  factors.push('Weekend'); }

    // Area SOS density
    if (raw.sosDensity500m >= 10)     { score += 20; factors.push('High SOS activity within 500m'); }
    else if (raw.sosDensity500m >= 5) { score += 10; factors.push('Moderate SOS activity within 500m'); }
    else if (raw.sosDensity500m >= 1) { score += 5;  factors.push('Some SOS history nearby'); }

    // Incident density
    if (raw.incidentHighNearby >= 5)     { score += 20; factors.push('High-severity incidents near location'); }
    else if (raw.incidentHighNearby >= 2) { score += 10; factors.push('Recent serious incidents nearby'); }
    if (raw.incidentAnyNearby  >= 10)    { score += 5;  factors.push('Elevated incident reports in area'); }

    // Area baseline risk
    if (raw.avgRiskNearby != null && raw.avgRiskNearby >= 70) {
      score += 10; factors.push('High average risk score for this area');
    }

    // User behaviour
    if (raw.userWeeklyFreq >= 3)  { score += 15; factors.push('Multiple SOS alerts triggered this week'); }
    else if (raw.userWeeklyFreq >= 1) { score += 5; factors.push('Recent SOS activity by this user'); }

    return {
      score: Math.min(Math.max(Math.round(score), 0), 100),
      confidence: 0.6,   // rule-based is less confident than a trained model
      factors,
      model: this.name,
    };
  }
}

module.exports = new RuleBasedModel();
