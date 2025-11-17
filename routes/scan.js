const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const upload = multer();

router.post('/', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    try {
        const form = new FormData();
        form.append("image", req.file.buffer, req.file.originalname);

        const response = await axios.post(
            process.env.PYTHON_WORKER_URL + "/ocr",
            form,
            { headers: form.getHeaders() }
        );

        res.json(response.data);

    } catch (err) {
        console.error("OCR Worker Error:", err);
        res.status(500).json({ error: "Python worker failed" });
    }
});

module.exports = router;