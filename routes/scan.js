const express = require('express');
const router = express.Router();
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');

// --- Multer Storage (gem ALTID som .jpg) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const base = Date.now(); // unik id
        cb(null, base + ".jpg"); // tving .jpg extension
    }
});

const upload = multer({ storage: storage });

// --------------------------------------------------------------
// POST /scan - modtager billede og sender til Python
// --------------------------------------------------------------
router.post('/', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
    }

    const imagePath = path.join(__dirname, '..', req.file.path);

    const pythonCmd = `"C:\\Users\\soren\\AppData\\Local\\Programs\\Python\\Python313\\python.exe" ai/ai_scan.py "${imagePath}"`;

    exec(pythonCmd, (error, stdout, stderr) => {
        if (error) {
            console.error("PYTHON ERROR:", stderr);
            return res.status(500).json({ error: "OCR failed" });
        }

        try {
            const result = JSON.parse(stdout);
            res.json(result);
        } catch (e) {
            console.error("JSON ERROR:", stdout);
            res.status(500).json({ error: "Invalid OCR output", raw: stdout });
        }
    });
});

module.exports = router;
