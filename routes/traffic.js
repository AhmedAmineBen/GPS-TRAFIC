const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

router.get('/traffic', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Paramètres manquants' });
  }
  try {
    const apiKey = process.env.TOMTOM_API_KEY;
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

module.exports = router;
