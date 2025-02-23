const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

router.post('/calculate', async (req, res) => {
  try {
    const { points } = req.body;
    if (!points || points.length < 2) {
      return res.status(400).json({ error: 'Au moins 2 points requis' });
    }
    const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;
    const response = await fetch(osrmUrl);
    if (!response.ok) throw new Error(`Erreur OSRM ${response.status}`);
    const osrmData = await response.json();
    if (!osrmData.routes || !osrmData.routes.length) {
      return res.status(500).json({ error: 'Aucun itinéraire trouvé par OSRM' });
    }
    const route = osrmData.routes[0];
    const totalKm = (route.distance / 1000).toFixed(2);
    const totalDuration = (route.duration / 60).toFixed(2); // en minutes
    const segments = route.legs.map(leg => ({
      distance: (leg.distance / 1000).toFixed(2),
      duration: (leg.duration / 60).toFixed(2)
    }));
    res.json({ total: totalKm, totalDuration, segments, unit: 'km' });
  } catch (error) {
    console.error('Erreur calcul:', error);
    res.status(500).json({ error: 'Erreur de calcul' });
  }
});

module.exports = router;
