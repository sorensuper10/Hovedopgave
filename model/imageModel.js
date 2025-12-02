const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
    filename: String,
    data: String, // base64 billede (allerede med markeringer)
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Image", imageSchema);