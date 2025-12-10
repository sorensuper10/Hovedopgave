// Importér Express frameworket
const express = require('express');
// Opret en ny router-instans til at håndtere scanning (OCR) relaterede ruter
const router = express.Router();
// Importér nødvendige moduler
const multer = require('multer'); // Multer bruges til at håndtere upload af filer (billeder)
const axios = require('axios'); // Axios bruges til at sende HTTP-requests til Python-serveren
const FormData = require('form-data'); // FormData bruges til at sende multipart/form-data til OCR-API'en

// Initialisér multer til at håndtere enkeltbillede-upload
const upload = multer();

 // POST-request til /scan
 // Modtager et billede fra klienten (web eller app) og sender det videre til Python OCR-servicen.
 // Python-servicen analyserer billedet (fx nummerplade eller km-tal) og returnerer resultaterne.
router.post('/', upload.single('image'), async (req, res) => {
    // Tjek om der overhovedet er uploadet et billede
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });
    try {
        // Opretter en container til data, der kan sendes via POST
        const form = new FormData();
        // Tilføjer billedet som en in-memory buffer, så Python-API’en kan modtage og analysere det uden at gemme filen på serveren
        form.append("image", req.file.buffer, req.file.originalname);
        // Send POST-request til Python OCR-API’en (defineret i .env som PYTHON_WORKER_URL)
        const response = await axios.post(
            process.env.PYTHON_WORKER_URL + "/ocr", // URL til OCR endpoint
            form,
            { headers: form.getHeaders() } // Sørg for at sende korrekte HTTP headers
        );
        // Send OCR-resultatet direkte tilbage til klienten
        res.json(response.data);
    } catch (err) {
        // Log og håndter fejl, fx hvis Python-serveren ikke svarer
        console.error("OCR Worker Error:", err);
        res.status(500).json({ error: "Python worker failed" });
    }
});

// Eksportér routeren så den kan bruges i server.js
module.exports = router;