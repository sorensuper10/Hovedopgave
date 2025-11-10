// Importér Mongoose til at håndtere MongoDB-modeller
const mongoose = require("mongoose");

// Definér et schema for brugere i databasen
// Hver bruger har et unikt brugernavn og en hashed adgangskode
const userSchema = new mongoose.Schema({
    username: {
        type: String,          // Brugernavn gemmes som tekst
        required: true,        // Skal udfyldes
        unique: true,          // Skal være unikt i databasen
        trim: true             // Fjerner mellemrum før/efter input
    },
    passwordHash: {
        type: String,          // Gemmer den hashed adgangskode (ikke i klar tekst)
        required: true
    },
});

// Eksportér modellen så den kan bruges i controlleren
module.exports = mongoose.model("User", userSchema);