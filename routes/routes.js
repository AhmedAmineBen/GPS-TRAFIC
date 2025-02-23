const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const DATA_FILE = path.join(__dirname, '..', 'routes.json');

// Fonction pour charger les itinéraires depuis le fichier JSON
function loadRoutes() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Erreur lors de la lecture du fichier des itinéraires :", error);
  }
  return [];
}

// Fonction pour sauvegarder les itinéraires dans le fichier JSON
function saveRoutesToFile(routes) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(routes, null, 2), 'utf8');
  } catch (error) {
    console.error("Erreur lors de l'écriture du fichier des itinéraires :", error);
  }
}

// Charger les itinéraires existants et déterminer le prochain id
let savedRoutes = loadRoutes();
let nextId = savedRoutes.length > 0 ? Math.max(...savedRoutes.map(r => r.id)) + 1 : 1;

// Sauvegarder un itinéraire
router.post('/save', (req, res) => {
  try {
    const { name, waypoints } = req.body;
    if (!name || !waypoints || !Array.isArray(waypoints) || waypoints.length === 0) {
      return res.status(400).json({ success: false, error: 'Données invalides' });
    }
    const newRoute = { id: nextId++, name, waypoints };
    savedRoutes.push(newRoute);
    saveRoutesToFile(savedRoutes);
    res.json({ success: true, route: newRoute });
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    res.status(500).json({ success: false, error: 'Erreur de sauvegarde' });
  }
});

// Récupérer la liste des itinéraires sauvegardés
router.get('/saved', (req, res) => {
  // Recharger les données pour être sûr d'avoir la version persistée
  savedRoutes = loadRoutes();
  res.json(savedRoutes);
});

// Charger un itinéraire spécifique
router.get('/route/:id', (req, res) => {
  savedRoutes = loadRoutes();
  const route = savedRoutes.find(r => r.id === parseInt(req.params.id));
  if (!route) {
    return res.status(404).json({ error: 'Itinéraire non trouvé' });
  }
  res.json(route);
});

// Supprimer un itinéraire
router.delete('/route/:id', (req, res) => {
  savedRoutes = loadRoutes();
  const id = parseInt(req.params.id);
  const index = savedRoutes.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Itinéraire non trouvé' });
  }
  savedRoutes.splice(index, 1);
  saveRoutesToFile(savedRoutes);
  res.json({ success: true });
});

module.exports = router;
