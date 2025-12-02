const express = require("express");
const router = express.Router();
const Image = require("../model/imageModel");

router.post("/uploadImage", async (req, res) => {
    try {
        const { filename, data } = req.body;

        if (!data) {
            return res.status(400).json({ success: false, message: "Intet billede modtaget" });
        }

        // gem billedet direkte (færdig version med markeringer)
        const newImage = new Image({
            filename,
            data,
            createdAt: new Date()
        });

        await newImage.save();
        res.json({ success: true, id: newImage._id });
    } catch (err) {
        console.error("Fejl ved upload:", err);
        res.status(500).json({ success: false, message: "Fejl ved upload" });
    }
});

// 📸 Hent alle billeder fra databasen
router.get("/images", async (req, res) => {
    try {
        const images = await Image.find().sort({ _id: 1 });
        res.json({ success: true, images });
    } catch (err) {
        console.error("Fejl ved hentning af billeder:", err);
        res.status(500).json({ success: false, message: "Fejl ved hentning" });
    }
});

module.exports = router;