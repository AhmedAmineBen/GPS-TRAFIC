const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

router.get('/geocode', async (req, res) => {
  try {
    const address = req.query.address?.trim();
    if (!address || address.length < 3) {
      return res.status(400).json({ error: 'Adresse trop courte' });
    }
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`,
      { headers: { 'User-Agent': 'MyMapApp/1.0 (contact@monsite.com)' }, timeout: 5000 }
    );
    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
    const data = await response.json();
    if (!data?.length) {
      return res.status(404).json({ error: 'Aucun résultat trouvé' });
    }
    const result = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      address: data[0].display_name || address
    };
    res.json(result);
  } catch (error) {
    console.error('Erreur geocode:', error);
    res.status(500).json({ error: 'Erreur lors du géocodage' });
  }
});

module.exports = router;
