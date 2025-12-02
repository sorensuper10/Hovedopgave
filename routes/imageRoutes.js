const express = require("express");
const router = express.Router();
const Image = require("../model/imageModel");

router.post("/uploadImage", async (req, res) => {
    try {
        const { filename, data, marks } = req.body;

        if (!data) {
            return res.status(400).json({ success: false, message: "Intet billede modtaget" });
        }

        const newImage = new Image({
            filename,
            data,
            marks: marks || []
        });

        await newImage.save();

        res.json({ success: true, id: newImage._id });
    } catch (err) {
        console.error("Fejl ved upload:", err);
        res.status(500).json({ success: false, message: "Fejl ved upload" });
    }
});

module.exports = router;