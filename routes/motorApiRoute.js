const express = require("express");
const axios = require("axios");
const router = express.Router();

// MotorAPI base URL
const BASE_URL = "https://v1.motorapi.dk";

// GET /vehicle/:plate → henter data fra MotorAPI
router.get("/:plate", async (req, res) => {
    const plate = req.params.plate;
    const token = process.env.MOTORAPI_KEY;

    if (!token) {
        return res.status(500).json({ error: "MOTORAPI_KEY mangler i .env" });
    }

    try {
        // 1️⃣ Fetch basic vehicle details
        const vehicleRes = await axios.get(`${BASE_URL}/vehicles/${plate}`, {
            headers: { "X-AUTH-TOKEN": token }
        });

        // 2️⃣ Fetch environment info
        const envRes = await axios.get(`${BASE_URL}/vehicles/${plate}/environment`, {
            headers: { "X-AUTH-TOKEN": token }
        });

        // 3️⃣ Fetch equipment
        const equipRes = await axios.get(`${BASE_URL}/vehicles/${plate}/equipment`, {
            headers: { "X-AUTH-TOKEN": token }
        });

        // Send samlet data til frontend
        res.json({
            registration: plate,
            vehicle: vehicleRes.data,
            environment: envRes.data,
            equipment: equipRes.data
        });

    } catch (err) {
        console.error("MotorAPI fejl:", err.response?.data || err.message);
        const status = err.response?.status || 500;
        res.status(status).json({ error: "MotorAPI request fejlede", details: err.response?.data });
    }
});

module.exports = router;