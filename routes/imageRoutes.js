// Importér Express frameworket
const express = require("express");
// Opret en ny router-instans til at håndtere billedrelaterede ruter
const router = express.Router();
// Importér Image-modellen fra imageModel.js (Mongoose-model til billeder)
const Image = require("../model/imageModel");

// POST-request til /uploadImage
// Bruges til at modtage og gemme et færdigbehandlet billede (med markeringer)
// Modtager base64-data fra klienten og gemmer det direkte i databasen
router.post("/uploadImage", async (req, res) => {
    try {
        const { filename, data } = req.body;
        if (!data) {
            return res.status(400).json({ success: false, message: "Intet billede modtaget" });
        }
        // Gem billedet direkte (færdig version med markeringer)
        const newImage = new Image({
            filename,
            data,
            createdAt: new Date()
        });
        // Gem i MongoDB
        await newImage.save();
        // Send succesrespons med det nye billedes ID
        res.json({ success: true, id: newImage._id });
    } catch (err) {
        console.error("Fejl ved upload:", err);
        res.status(500).json({ success: false, message: "Fejl ved upload" });
    }
});

// GET-request til /images
// Henter alle billeder fra databasen og returnerer dem som JSON
// Bruges af galleri- og billedarkiv-siderne i webappen
router.get("/images", async (req, res) => {
    try {
        // Hent alle billeder fra databasen, sorteret efter oprettelse
        const images = await Image.find().sort({ _id: 1 });
        // Send billederne tilbage som JSON
        res.json({ success: true, images });
    } catch (err) {
        // Log detaljeret fejlbesked i konsollen til debugging
        console.error("Fejl ved hentning af billeder:", err);
        // Send en klar og brugervenlig fejlbesked til klienten
        res.status(500).json({ success: false, message: "Fejl ved hentning" });
    }
});

// Eksportér routeren så den kan bruges i server.js
module.exports = router;