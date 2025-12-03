// Importér Mongoose til at håndtere MongoDB-modeller
const mongoose = require("mongoose");

// Definér et schema for billeder i databasen
// Hvert billede indeholder filnavn, base64-data og en tidsstempel
const imageSchema = new mongoose.Schema({
    filename: String,
    data: String, // base64 billede (allerede med markeringer)
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Eksportér modellen så den kan bruges i imageRoutes.js
module.exports = mongoose.model("Image", imageSchema);