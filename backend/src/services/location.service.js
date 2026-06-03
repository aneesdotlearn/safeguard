'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Reverse geocode using OpenStreetMap Nominatim (no API key required)
 * In production, replace with a paid provider (Google Maps, HERE, etc.)
 */
async function reverseGeocode(lat, lng) {
  const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
    params: { lat, lon: lng, format: 'json', addressdetails: 1 },
    headers: { 'User-Agent': 'SafeGuard-App/1.0' },
    timeout: 5000,
  });
  return response.data.display_name || null;
}

module.exports = { reverseGeocode };
