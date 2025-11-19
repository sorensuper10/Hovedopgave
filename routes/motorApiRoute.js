const express = require("express");
const router = express.Router();
const axios = require("axios");

router.get("/:plate", async (req, res) => {
    const plate = req.params.plate;
    const apiKey = process.env.MOTORAPI_KEY;

    try {
        const response = await axios.get(
            `https://api.motorapi.dk/v1/vehicles/${plate}`,
            {
                headers: {
                    "X-AUTH-TOKEN": apiKey
                }
            }
        );

        res.json(response.data);

    } catch (err) {
        if (err.response && err.response.status === 404) {
            return res.json({ error: "Nummerplade ikke fundet" });
        }

        console.error("MotorAPI error:", err);
        res.status(500).json({ error: "MotorAPI fejl" });
    }
});

module.exports = router;