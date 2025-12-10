// Importér Express frameworket
const express = require("express");
// Importér Axios til at sende HTTP-forespørgsler til MotorAPI
const axios = require("axios");
// Opret en ny router-instans til at håndtere forespørgsler til MotorAPI
const router = express.Router();

// MotorAPI base URL
const BASE_URL = "https://v1.motorapi.dk";

 // GET-request til /vehicles/:plate
 // Modtager et registreringsnummer (nummerplade) som parameter
 // Henter detaljerede oplysninger om bilen fra MotorAPI
 // Returnerer samlet JSON med køretøj, miljødata og udstyr
    router.get("/:plate", async (req, res) => {
        // Hent nummerpladen fra URL-parameteren
        // Eksempel: /vehicles/AB12345 → plate = "AB12345"
        const plate = req.params.plate;

        // Hent API-nøglen fra miljøvariabler (.env)
        const token = process.env.MOTORAPI_KEY;

        // Hvis API-nøglen mangler, kan vi ikke kalde MotorAPI
        if (!token) {
        return res.status(500).json({ error: "MOTORAPI_KEY mangler i .env" });
    }

    try {
        // Hent grundlæggende køretøjsdata (mærke, model, status m.m.)
        const vehicleRes = await axios.get(`${BASE_URL}/vehicles/${plate}`, {
        // Sender API-nøglen sammen med requesten, så MotorAPI kan verificere, at serveren har tilladelse til at hente køretøjsdata
            headers: { "X-AUTH-TOKEN": token }
        });

        // Hent miljøinformation (CO₂-udledning, brændstofforbrug, Euro-norm)
        const envRes = await axios.get(`${BASE_URL}/vehicles/${plate}/environment`, {
            headers: { "X-AUTH-TOKEN": token }
        });

        // Hent udstyrsdetaljer (fx gearkasse, sikkerhed, komfort)
        const equipRes = await axios.get(`${BASE_URL}/vehicles/${plate}/equipment`, {
            headers: { "X-AUTH-TOKEN": token }
        });

        // Send alle tre svar samlet tilbage til frontend som ét JSON-objekt
        res.json({
            registration: plate,
            vehicle: vehicleRes.data,
            environment: envRes.data,
            equipment: equipRes.data
        });

    } catch (err) {
        // Log detaljeret fejlmeddelelse, hvis MotorAPI returnerer en fejl
        console.error("MotorAPI fejl:", err.response?.data || err.message);
        // Brug statuskode fra MotorAPI, hvis den findes – ellers 500
        const status = err.response?.status || 500;
        // Send fejlbesked tilbage til klienten
        res.status(status).json({ error: "MotorAPI request fejlede", details: err.response?.data });
    }
});

// Eksportér routeren så den kan bruges i server.js
module.exports = router;