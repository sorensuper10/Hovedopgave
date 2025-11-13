// Indlæs miljøvariabler fra .env-filen
require('dotenv').config();

// Importér nødvendige pakker
const express = require('express'); // Express bruges til at oprette webserver og ruter
const mongoose = require('mongoose'); // Mongoose bruges til at forbinde og arbejde med MongoDB
const session = require("express-session"); // express-session håndterer login-sessioner
const userRoute = require("./routes/userRoutes"); // Import af userRoutes filen

// Initialiser Express-applikationen
const app = express();

// ⚠️ VIGTIGT på Render (proxy + https)
app.set("trust proxy", 1);

// Hent databaseforbindelse og port fra miljøvariabler (.env)
const dbConnectionString = process.env.DB_CONNECTION_STRING; // Indeholder MongoDB URI
const port = process.env.PORT || 3000; // Standardport = 3000, hvis ingen port er defineret i .env

// express-session bruges til at gemme login-informationer midlertidigt i browseren
app.use(session({
    secret: "hemmeligNøgle", // Nøgle til at signere session-cookies (bør normalt ligge i .env)
    resave: false,            // Gem ikke sessioner igen, hvis de ikke er ændret
    saveUninitialized: false, // Undgå at gemme tomme sessioner (bedre ydeevne og sikkerhed)
    cookie: { secure: process.env.NODE_ENV === "production" } // Brug sikre cookies i production
}));

// Forbind til MongoDB via Mongoose
mongoose.connect(dbConnectionString)
    .then(() => console.log("✅ MongoDB connected"))  // Bekræft at forbindelsen lykkedes
    .catch((err) => console.error("❌ MongoDB connection error:", err)); // Fejlhåndtering

// Middleware gør det muligt for Express at håndtere JSON-data fra API-kald
app.use(express.json());
// Tillader at modtage form-data (fra fx HTML-formularer)
app.use(express.urlencoded({ extended: true }));

// Gør 'public'-mappen tilgængelig for statiske filer (HTML, CSS, billeder, scripts)
app.use(express.static('public'));

// Alle ruter relateret til brugere håndteres i userRoutes.js under /api/users/
app.use('/api/users', userRoute);

// Start Express-serveren og log besked i konsollen
app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));