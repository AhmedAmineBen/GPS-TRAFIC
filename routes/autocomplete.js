const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

router.get('/autocomplete', async (req, res) => {
  try {
    const query = req.query.q?.trim();
    if (!query || query.length < 3) return res.json([]);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1`,
      { headers: { 'User-Agent': 'MyMapApp/1.0 (contact@monsite.com)' }, timeout: 3000 }
    );
    const data = await response.json();
    const suggestions = data.slice(0, 5).map(item => ({
      display_name: item.display_name,
      lat: item.lat,
      lon: item.lon
    }));
    res.json(suggestions);
  } catch (error) {
    console.error('Erreur autocomplete:', error);
    res.json([]);
  }
});

module.exports = router;
