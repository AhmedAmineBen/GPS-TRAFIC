document.addEventListener('DOMContentLoaded', () => {
  // Variables globales
  let map, routingControl = null;
  let waypoints = [];
  let markers = [];
  let isDrawing = false;
  let coordMarker = null;
  let trafficLayer = null;
  let isCoordDisplayMode = false; // nouveau mode pour afficher les coordonnées

  // Initialisation de la carte selon la configuration (ex: Rabat)
  const { lat, lng, zoom } = window.mapConfig;
  map = L.map('map').setView([lat, lng], zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  // Si un résultat de recherche est présent, on affiche un marqueur
  if (location.search.includes('result=')) {
    const searchMarker = L.marker([lat, lng]).addTo(map);
    searchMarker.bindPopup(window.mapConfig.address).openPopup();
  }

  // Références DOM
  const toggleDrawingBtn = document.getElementById('toggleDrawing');
  const coordBtn = document.getElementById('coordBtn');
  const markLocationBtn = document.getElementById('markLocation');
  const traceRouteBtn = document.getElementById('traceRoute');
  const coordInput = document.getElementById('coordInput');
  const addressInput = document.getElementById('addressInput');
  const searchForm = document.getElementById('searchForm');
  const autocompleteResults = document.getElementById('autocompleteResults');
  const showCoordBtn = document.getElementById('showCoordBtn'); // nouveau bouton pour afficher les coordonnées

  // Mise à jour de l'UI en fonction du mode dessin
  const updateUIState = () => {
    if (isDrawing) {
      coordBtn.innerHTML = '<i class="bi bi-plus-lg"></i>';
      traceRouteBtn.disabled = false;
      toggleDrawingBtn.textContent = 'Désactiver dessin sur la carte';
    } else {
      coordBtn.innerHTML = '<i class="bi bi-search"></i>';
      traceRouteBtn.disabled = true;
      toggleDrawingBtn.textContent = 'Activer dessin sur la carte';
    }
  };
  updateUIState();

  // Basculement du mode dessin
  toggleDrawingBtn.addEventListener('click', () => {
    // Si le mode affichage coordonnées est actif, on le désactive
    if (isCoordDisplayMode) {
      map.off('click', onMapClickForCoords);
      showCoordBtn.textContent = "Afficher Coordonnées";
      isCoordDisplayMode = false;
    }
    isDrawing = !isDrawing;
    if (isDrawing) {
      map.on('click', onMapClick);
    } else {
      map.off('click', onMapClick);
    }
    updateUIState();
  });

  // Nouvelle fonctionnalité : affichage des coordonnées sur un point sélectionné
  const onMapClickForCoords = (e) => {
    placeCoordMarker(e.latlng);
    // Le mode se désactive après la sélection
    isCoordDisplayMode = false;
    showCoordBtn.textContent = "Afficher Coordonnées";
    map.off('click', onMapClickForCoords);
  };

  showCoordBtn.addEventListener('click', () => {
    if (isCoordDisplayMode) {
      // Désactivation si déjà activé
      map.off('click', onMapClickForCoords);
      showCoordBtn.textContent = "Afficher Coordonnées";
      isCoordDisplayMode = false;
    } else {
      // Si le mode dessin est actif, on le désactive pour éviter un conflit
      if (isDrawing) {
        isDrawing = false;
        map.off('click', onMapClick);
        updateUIState();
      }
      isCoordDisplayMode = true;
      showCoordBtn.textContent = "Sélectionnez un point sur la carte";
      map.on('click', onMapClickForCoords);
    }
  });

  // Ajout d'un point sur la carte lors d'un clic (mode dessin)
  const onMapClick = (e) => {
    if (!isDrawing) return;
    addWaypoint(e.latlng);
    autoZoom();
  };

  // Ajout d'un waypoint avec un marqueur personnalisé
  const addWaypoint = (latlng) => {
    const marker = L.marker(latlng, {
      draggable: true,
      icon: L.divIcon({
        className: 'custom-marker',
        html: `<div>${waypoints.length + 1}</div>`,
        iconSize: [30, 30]
      })
    }).addTo(map).bindPopup(`Point ${waypoints.length + 1}`);

    marker.on('dragend', (e) => {
      const index = markers.indexOf(marker);
      if (index > -1) {
        waypoints[index] = e.target.getLatLng();
        if (routingControl) updateRoute();
      }
    });

    markers.push(marker);
    waypoints.push(latlng);
    document.getElementById('numPoints').textContent = waypoints.length;
    autoZoom();
  };

  // Placement d'un marqueur simple en mode non dessin
  const placeCoordMarker = (latlng) => {
    if (coordMarker) {
      map.removeLayer(coordMarker);
    }
    coordMarker = L.marker(latlng).addTo(map);
    coordMarker.bindPopup(`Coordonnées : ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`).openPopup();
    autoZoom();
  };

  // Traitement du bouton de saisie des coordonnées
  coordBtn.addEventListener('click', () => {
    const input = coordInput.value.trim();
    if (!input) return;
    const parts = input.split(',').map(part => parseFloat(part.trim()));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
      alert('Veuillez entrer des coordonnées valides au format lat,lng');
      return;
    }
    const latlng = L.latLng(parts[0], parts[1]);
    if (isDrawing) {
      addWaypoint(latlng);
    } else {
      placeCoordMarker(latlng);
    }
    map.setView(latlng, 18);
    coordInput.value = '';
  });

  // Géolocalisation pour marquer la position actuelle
  markLocationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLatLng = L.latLng(position.coords.latitude, position.coords.longitude);
          if (isDrawing) {
            addWaypoint(currentLatLng);
          } else {
            placeCoordMarker(currentLatLng);
          }
          map.setView(currentLatLng, 18);
        },
        (error) => {
          alert("Erreur lors de la localisation : " + error.message);
        }
      );
    } else {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
    }
  });

  // Soumission du formulaire de recherche d'adresse (mode dessin ou non)
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const address = addressInput.value.trim();
    if (!address) return;
    try {
      const response = await fetch(`/geocode?address=${encodeURIComponent(address)}`);
      if (!response.ok) {
        alert('Aucun résultat trouvé pour cette adresse.');
        return;
      }
      const result = await response.json();
      const latlng = L.latLng(result.lat, result.lng);

      if (isDrawing) {
        addWaypoint(latlng);
      } else {
        placeCoordMarker(latlng);
      }
      map.setView(latlng, 18);
      addressInput.value = '';
    } catch (error) {
      console.error('Erreur lors du géocodage:', error);
    }
    autoZoom();
  });

  // Autocomplétion sur l'input adresse
  addressInput.addEventListener('input', async function () {
    const query = this.value.trim();
    if (query.length < 3) {
      autocompleteResults.style.display = 'none';
      return;
    }
    try {
      const response = await fetch(`/autocomplete?q=${encodeURIComponent(query)}`);
      const suggestions = await response.json();
      autocompleteResults.innerHTML = '';
      autocompleteResults.style.display = 'block';
      suggestions.forEach(item => {
        const a = document.createElement('a');
        a.className = 'list-group-item list-group-item-action';
        a.textContent = item.display_name;
        a.href = '#';
        a.addEventListener('click', () => {
          addressInput.value = item.display_name;
          autocompleteResults.style.display = 'none';
          searchForm.dispatchEvent(new Event('submit', { cancelable: true }));
        });
        autocompleteResults.appendChild(a);
      });
    } catch (error) {
      console.error('Erreur autocomplete:', error);
    }
  });

  // Fermeture automatique des suggestions d'autocomplétion
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#autocompleteResults') && e.target !== addressInput) {
      autocompleteResults.style.display = 'none';
    }
  });

  // Ajustement automatique du zoom pour inclure tous les marqueurs
  const autoZoom = () => {
    const visibleMarkers = [...markers];
    if (coordMarker && coordMarker._map) {
      visibleMarkers.push(coordMarker);
    }
    if (visibleMarkers.length > 0) {
      const group = L.featureGroup(visibleMarkers);
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  };

  // Calcul de l'itinéraire et récupération des infos trafic
  traceRouteBtn.addEventListener('click', () => {
    if (waypoints.length < 2) {
      alert("Veuillez ajouter au moins 2 points pour tracer l'itinéraire.");
      return;
    }
    updateRoute();
  });

  // Bouton "Tout réinitialiser"
  document.getElementById('clearAll').addEventListener('click', () => {
    clearAll();
  });

  // Fonction principale de mise à jour de la route
  const updateRoute = () => {
    if (routingControl) {
      map.removeControl(routingControl);
    }
    if (trafficLayer) {
      map.removeLayer(trafficLayer);
    }
    trafficLayer = L.layerGroup().addTo(map);

    routingControl = L.Routing.control({
      waypoints: waypoints,
      routeWhileDragging: true,
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1'
      }),
      lineOptions: {
        styles: [{ opacity: 0 }]
      },
      createMarker: () => null
    }).addTo(map);

    // Ajout du bouton de réduction/agrandissement transparent en haut à droite
    routingControl.on('routesfound', async function (e) {
      updateDistanceDisplay();
      addToggleInstructionsButton();
      
      const routeCoords = e.routes[0].coordinates;
      const totalPoints = routeCoords.length;
      const trafficStats = [];
      const desiredRequestCount = 10;
      const step = Math.max(1, Math.ceil(totalPoints / desiredRequestCount));

      for (let startIndex = 0; startIndex < totalPoints - 1; startIndex += step) {
        const endIndex = Math.min(startIndex + step, totalPoints - 1);
        const midIndex = Math.floor((startIndex + endIndex) / 2);
        const midpoint = routeCoords[midIndex];

        try {
          const response = await fetch(`/traffic?lat=${midpoint.lat}&lng=${midpoint.lng}`);
          if (!response.ok) {
            console.error("Erreur API trafic pour le tronçon", startIndex, "à", endIndex);
            continue;
          }
          const data = await response.json();
          if (!data.flowSegmentData) {
            console.error("Réponse API trafic incomplète sur le tronçon", startIndex, endIndex);
            continue;
          }

          // On force les valeurs statiques pour l'affichage
          const staticCurrentSpeed = 25;
          const staticFreeFlowSpeed = 25;
          const staticConfidence = 1;
          const staticRatio = 1.00;
          const staticColor = 'green';

          const subSegmentCoords = routeCoords.slice(startIndex, endIndex + 1);
          const segmentPolyline = L.polyline(subSegmentCoords, {
            color: staticColor,
            weight: 5,
            opacity: 0.8
          }).addTo(trafficLayer);

          segmentPolyline.bindPopup(
            `Vitesse actuelle: ${staticCurrentSpeed} km/h<br>
            Vitesse libre: ${staticFreeFlowSpeed} km/h<br>
            Confiance: ${staticConfidence}`
          );

          segmentPolyline.bindTooltip(
            `Tronçon ${trafficStats.length + 1}<br>
            Vitesse actuelle: ${staticCurrentSpeed} km/h<br>
            Vitesse libre: ${staticFreeFlowSpeed} km/h<br>
            Confiance: ${staticConfidence}`,
            { sticky: true }
          );

          L.circleMarker(routeCoords[endIndex], {
            radius: 4,
            color: 'blue',
            fillColor: 'blue',
            fillOpacity: 1
          }).addTo(trafficLayer);

          // Enregistrement des données statiques pour le panneau de statistiques
          trafficStats.push({
            tronconIndex: trafficStats.length + 1,
            currentSpeed: staticCurrentSpeed,
            freeFlowSpeed: staticFreeFlowSpeed,
            confidence: staticConfidence,
            ratio: staticRatio,
            color: staticColor
          });
        } catch (error) {
          console.error("Erreur lors de la récupération des données trafic:", error);
        }
      }
      displayTrafficStats(trafficStats);
    });
  };

  // Fonction pour ajouter le bouton de réduction/agrandissement transparent en haut à droite
  const addToggleInstructionsButton = () => {
    const container = document.querySelector('.leaflet-routing-container');
    if (!container) return;

    // Vérifie si le bouton n'existe pas déjà
    if (!container.querySelector('.toggle-instructions-btn')) {
      const btn = document.createElement('button');
      btn.className = 'toggle-instructions-btn';
      // Bouton sans texte
      btn.textContent = '';
      
      // Positionnement via le CSS (top et right déjà défini)
      // Insère le bouton dans le container (en fin pour qu'il soit en haut à droite)
      container.appendChild(btn);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        container.classList.toggle('collapsed');
      });
    }
  };

  // Mise à jour des distances et détails des segments via l'endpoint /calculate
  const updateDistanceDisplay = async () => {
    try {
      const response = await fetch('/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: waypoints.map(p => ({ lat: p.lat, lng: p.lng }))
        })
      });
      const data = await response.json();
      document.getElementById('totalDistance').textContent = `${data.total} km`;
      document.getElementById('totalDuration').textContent = `${data.totalDuration} min`;

      let segmentsHtml = '<ul class="list-group">';
      data.segments.forEach((seg, index) => {
        segmentsHtml += `<li class="list-group-item">Segment ${index + 1}: ${seg.distance} km - Durée: ${seg.duration} min</li>`;
      });
      segmentsHtml += '</ul>';
      document.getElementById('segmentDistances').innerHTML = segmentsHtml;
    } catch (error) {
      console.error('Erreur calcul:', error);
    }
  };

  // Affichage des statistiques de trafic dans la box dédiée (valeurs statiques)
  const displayTrafficStats = (trafficStats) => {
    const container = document.getElementById('trafficStatsBox');
    if (!container) return;
    container.innerHTML = '';
    trafficStats.forEach((t, index) => {
      const div = document.createElement('div');
      div.className = 'border p-2 mb-2';
      div.innerHTML = `
        <strong>Tronçon ${index + 1}</strong><br>
        Vitesse actuelle : ${t.currentSpeed} km/h<br>
        Vitesse libre : ${t.freeFlowSpeed} km/h<br>
        Confiance : ${t.confidence}<br>
        Ratio : ${t.ratio.toFixed(2)} (<span style="color:${t.color}">${t.color}</span>)
      `;
      container.appendChild(div);
    });
  };

  // Sauvegarde de l'itinéraire via le formulaire de la modale
  document.getElementById('saveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (waypoints.length === 0) {
      alert("Aucun itinéraire à sauvegarder !");
      return;
    }
    const routeName = document.getElementById('routeName').value.trim();
    if (!routeName) {
      alert("Veuillez renseigner un nom pour l'itinéraire.");
      return;
    }
    try {
      const response = await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: routeName, waypoints })
      });
      const result = await response.json();
      if (result.success) {
        alert("Itinéraire sauvegardé !");
        const saveModal = bootstrap.Modal.getInstance(document.getElementById('saveModal'));
        saveModal.hide();
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde :", error);
    }
  });

  // Chargement des itinéraires sauvegardés
  const loadSavedRoutes = async () => {
    try {
      const response = await fetch('/saved');
      const routes = await response.json();
      const listContainer = document.getElementById('savedRoutesList');
      listContainer.innerHTML = '';
      if (routes.length === 0) {
        listContainer.innerHTML = '<p class="text-center">Aucun itinéraire sauvegardé</p>';
        return;
      }
      routes.forEach(route => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
        item.textContent = route.name;
        const btnGroup = document.createElement('div');

        const loadBtn = document.createElement('button');
        loadBtn.className = 'btn btn-sm btn-outline-primary';
        loadBtn.textContent = 'Charger';
        loadBtn.addEventListener('click', (e) => {
          e.preventDefault();
          chargerItineraire(route);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm btn-outline-danger ms-2';
        delBtn.textContent = 'Supprimer';
        delBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          if (confirm("Confirmez-vous la suppression ?")) {
            await fetch(`/route/${route.id}`, { method: 'DELETE' });
            loadSavedRoutes();
          }
        });

        btnGroup.append(loadBtn, delBtn);
        item.appendChild(btnGroup);
        listContainer.appendChild(item);
      });
    } catch (error) {
      console.error('Erreur lors du chargement des itinéraires :', error);
    }
  };

  document.getElementById('refreshSaved').addEventListener('click', loadSavedRoutes);
  const loadModalEl = document.getElementById('loadModal');
  loadModalEl.addEventListener('shown.bs.modal', loadSavedRoutes);

  // Chargement d'un itinéraire sauvegardé sur la carte
  const chargerItineraire = (route) => {
    clearAll();
    waypoints = route.waypoints.map(p => L.latLng(p.lat, p.lng));
    waypoints.forEach((latlng, index) => {
      const marker = L.marker(latlng, {
        draggable: true,
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div>${index + 1}</div>`,
          iconSize: [30, 30]
        })
      }).addTo(map).bindPopup(`Point ${index + 1}`);
      marker.on('dragend', (e) => {
        const idx = markers.indexOf(marker);
        if (idx > -1) {
          waypoints[idx] = e.target.getLatLng();
          if (routingControl) updateRoute();
        }
      });
      markers.push(marker);
    });
    if (markers.length > 0) {
      map.fitBounds(L.featureGroup(markers).getBounds());
    }
    updateRoute();
    const loadModal = bootstrap.Modal.getInstance(loadModalEl);
    loadModal.hide();
  };

  // Réinitialisation complète de la carte et des variables
  const clearAll = () => {
    waypoints = [];
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    if (routingControl) {
      map.removeControl(routingControl);
      routingControl = null;
    }
    document.getElementById('totalDistance').textContent = '0 km';
    document.getElementById('totalDuration').textContent = '0 min';
    // Réinitialisation des détails des segments
    document.getElementById('segmentDistances').innerHTML = '';
    coordInput.value = '';
    document.getElementById('numPoints').textContent = '0';
    if (coordMarker) {
      map.removeLayer(coordMarker);
      coordMarker = null;
    }
    if (trafficLayer) {
      map.removeLayer(trafficLayer);
      trafficLayer = null;
    }
    const trafficBox = document.getElementById('trafficStatsBox');
    if (trafficBox) {
      trafficBox.innerHTML = '';
    }
    map.setView([lat, lng], zoom);
  };
});
