'use strict';

const axios = require('axios');
const logger = require('../../utils/logger');
const ruleBasedModel = require('./ruleBasedModel');

/**
 * MLModelAdapter
 * --------------
 * Sends the feature vector to an external ML microservice.
 * Implements automatic fallback to ruleBasedModel on:
 *   - connection refused (service not running)
 *   - timeout (> ML_MODEL_TIMEOUT_MS)
 *   - non-200 response
 *   - any unexpected error
 *
 * Expected ML service contract
 * ────────────────────────────
 * POST <ML_MODEL_URL>/predict
 * Content-Type: application/json
 *
 * Request body:
 * {
 *   "features": {
 *     "hour_sin": 0.5, "hour_cos": 0.866,
 *     "is_night": 1, "is_weekend": 0,
 *     "sos_density_500m": 0.3,
 *     ... (all keys from featureExtractor.js)
 *   }
 * }
 *
 * Expected response:
 * {
 *   "score": 74,              // integer 0-100
 *   "confidence": 0.87,       // float 0-1
 *   "factors": [              // optional — human-readable explanations
 *     "High SOS density in area",
 *     "Late night risk"
 *   ],
 *   "model_version": "1.2.0"  // optional
 * }
 *
 * Compatible with:
 *   - Python FastAPI / Flask microservice (see docs/ml-service-example.py)
 *   - AWS SageMaker endpoint (set ML_MODEL_URL to SageMaker endpoint)
 *   - Google Vertex AI endpoint
 *   - Any REST service implementing the above contract
 */
class MLModelAdapter {
  constructor() {
    this.url     = process.env.ML_MODEL_URL || null;
    this.timeout = parseInt(process.env.ML_MODEL_TIMEOUT_MS, 10) || 3000;
    this.apiKey  = process.env.ML_MODEL_API_KEY || null;
    this.enabled = !!this.url;

    if (this.enabled) {
      logger.info(`ML model adapter ready → ${this.url} (timeout: ${this.timeout}ms)`);
    } else {
      logger.info('ML_MODEL_URL not set — using rule-based fallback');
    }
  }

  /**
   * @param {Object} features - normalised feature vector
   * @param {Object} raw      - raw signals (for fallback)
   * @returns {Promise<{ score, confidence, factors, model }>}
   */
  async predict(features, raw) {
    // ── If no ML endpoint is configured, use rule-based immediately ──────────
    if (!this.enabled) {
      return ruleBasedModel.predict(features, raw);
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

      const response = await axios.post(
        `${this.url}/predict`,
        { features },
        { timeout: this.timeout, headers }
      );

      const { score, confidence = 0.9, factors = [], model_version } = response.data;

      // Validate response
      if (typeof score !== 'number' || score < 0 || score > 100) {
        throw new Error(`ML service returned invalid score: ${score}`);
      }

      logger.debug(`ML prediction: score=${score} confidence=${confidence} model=${model_version}`);

      return {
        score:      Math.round(score),
        confidence,
        factors:    Array.isArray(factors) ? factors : [],
        model:      `ml-service@${model_version || 'unknown'}`,
      };

    } catch (err) {
      // Log the error but do NOT crash — always fall back
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      const isRefused = err.code === 'ECONNREFUSED';

      logger.warn(
        `ML model ${isTimeout ? 'timed out' : isRefused ? 'unreachable' : 'error'} → falling back to rule-based`,
        { error: err.message, url: this.url }
      );

      const result = ruleBasedModel.predict(features, raw);
      return { ...result, model: `${result.model}+fallback` };
    }
  }
}

module.exports = new MLModelAdapter();
