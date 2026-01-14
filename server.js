// Indlæs miljøvariabler fra .env-filen
require('dotenv').config();

// Importér nødvendige pakker
const express = require('express'); // Express bruges til at oprette webserver og ruter
const mongoose = require('mongoose'); // Mongoose bruges til at forbinde og arbejde med MongoDB
const session = require("express-session"); // express-session håndterer login-sessioner
const userRoute = require("./routes/userRoutes"); // Import af userRoutes filen
const scanRoute = require('./routes/scanRoutes'); // Import af scanRoute filen
const motorApiRoute = require("./routes/motorApiRoutes"); // Import af motorApiRoute filen
const imageRoute = require("./routes/imageRoutes"); // Import af imageRoutes filen

// Initialiser Express-applikationen
const app = express();

// Fortæller Express, at appen kører bag en proxy (Render)
// og tillader korrekt håndtering af HTTPS, client-IP og secure cookies
app.set("trust proxy", 1);

// Hent databaseforbindelse og port fra miljøvariabler (.env)
const dbConnectionString = process.env.DB_CONNECTION_STRING; // Indeholder MongoDB URI
const port = process.env.PORT || 3000; // Standardport = 3000, hvis ingen port er defineret i .env

// express-session bruges til at gemme login-informationer midlertidigt i browseren
app.use(session({
    secret: "hemmeligNøgle", // Nøgle til at signere session-cookies
    resave: false,            // Gem ikke sessioner igen, hvis de ikke er ændret
    saveUninitialized: false, // Undgå at gemme tomme sessioner (bedre ydeevne og sikkerhed)
    cookie: { secure: process.env.NODE_ENV === "production" } // Brug sikre cookies i production
}));

// Forbind til MongoDB via Mongoose
mongoose.connect(dbConnectionString)
    .then(() => console.log("✅ MongoDB connected"))  // Bekræft at forbindelsen lykkedes
    .catch((err) => console.error("❌ MongoDB connection error:", err)); // Fejlhåndtering

// Middleware gør det muligt for Express at håndtere JSON-data fra API-kald
app.use(express.json({ limit: "50mb" }));
// Tillader at modtage form-data (fra fx HTML-formularer)
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Gør 'public'-mappen tilgængelig for statiske filer (HTML, CSS, billeder, scripts)
app.use(express.static('public'));

// Alle ruter relateret til brugere håndteres i userRoutes.js under /api/users/
app.use('/api/users', userRoute);

// Alle forespørgsler til billedscanning (nummerplade / km-tal) håndteres i scanRoutes.js under /scan
app.use('/scan', scanRoute);

// Alle kald til køretøjsdata (MotorAPI-integration) håndteres i motorApiRoutes.js under /vehicles
app.use('/vehicles', motorApiRoute);

// Alle billedrelaterede ruter (upload, hentning, galleri osv.) håndteres i imageRoute.js under /
app.use("/", imageRoute);

// Start Express-serveren og log besked i konsollen
app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));