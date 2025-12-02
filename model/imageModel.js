const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
    filename: String,
    data: String, // base64 billede
    marks: [
        {
            x: Number,
            y: Number,
            radius: Number,
            color: String
        }
    ]
});

module.exports = mongoose.model("Image", imageSchema);