// Importér Mongoose til at håndtere MongoDB-modeller
const mongoose = require("mongoose");

// Definér et schema for billeder i databasen
// Hvert billede indeholder filnavn, base64-data og en tidsstempel
const imageSchema = new mongoose.Schema({
    filename: String, // Filnavn på billedet
    data: String,     // Selve billeddataen gemt som en Base64-kodet streng. Indeholder både originalbilledet og eventuelle markeringer.
    createdAt: {      // Dato og tid for hvornår billedet blev gemt
        type: Date,
        default: Date.now
    }
});

// Eksportér modellen så den kan bruges i imageRoutes.js
module.exports = mongoose.model("Image", imageSchema);