require('dotenv').config();
const express = require('express');
const session = require('express-session');
const anime = require('animejs');
const flash = require('express-flash');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuration du moteur de template EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session et Flash messages
app.use(session({
    secret: 'votre-secret-sécurisé',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));
app.use(flash());

// Importer et monter les routes
app.use('/', require('./routes/index'));
app.use('/', require('./routes/geocode'));
app.use('/', require('./routes/autocomplete'));
app.use('/', require('./routes/calculate'));
app.use('/', require('./routes/routes')); // Module mis à jour pour la persistance
app.use('/', require('./routes/traffic')); // Nouvelle route pour le trafic

app.listen(port, () => {
  console.log(`Serveur actif sur http://localhost:${port}`);
});
