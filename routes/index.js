const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const DEFAULT_COORDS = {
    lat: 48.8584,
    lng: 2.2945,
    zoom: 15,
    address: 'Tour Eiffel'
};

// Page d'accueil et rendu de l'interface
router.get('/', (req, res) => {
  try {
    const mapConfig = req.query.result 
      ? JSON.parse(decodeURIComponent(req.query.result)) 
      : DEFAULT_COORDS;
    res.render('index', {
      mapConfig,
      message: req.flash('message')[0]
    });
  } catch (error) {
    console.error('Erreur route /:', error);
    res.status(500).send('Erreur de traitement');
  }
});

// Recherche d'adresse classique (redirection)
router.post('/search', async (req, res) => {
  try {
    const address = req.body.address?.trim();
    if (!address || address.length < 3) {
      req.flash('message', { type: 'error', text: 'Adresse trop courte (min 3 caractères)' });
      return res.redirect('/');
    }
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`,
      { headers: { 'User-Agent': 'MyMapApp/1.0 (contact@monsite.com)' }, timeout: 5000 }
    );
    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
    const data = await response.json();
    if (!data?.length) {
      req.flash('message', { type: 'error', text: 'Aucun résultat trouvé' });
      return res.redirect('/');
    }
    const result = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      zoom: 18,
      address: data[0].display_name || address
    };
    res.redirect(`/?result=${encodeURIComponent(JSON.stringify(result))}`);
  } catch (error) {
    console.error('Erreur recherche:', error);
    req.flash('message', {
      type: 'error',
      text: error.message.includes('timed out') ? 'Temps de réponse dépassé' : 'Erreur de recherche'
    });
    res.redirect('/');
  }
});

module.exports = router;
