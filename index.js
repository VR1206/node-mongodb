const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect("mongodb+srv://testing:Jakhar9014@vip.qrk6v.mongodb.net/?retryWrites=true&w=majority&appName=VIP", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// Key Schema
const keySchema = new mongoose.Schema({
    key: String,
    used: { type: Boolean, default: false },
    deviceId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

const Key = mongoose.model("Key", keySchema);

// Generate Key API
app.post("/generate", async (req, res) => {
    const key = Math.random().toString(36).substring(2, 10).toUpperCase() + "-" +
                Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const newKey = new Key({ key });
    await newKey.save();

    res.json({ success: true, key });
});

// Verify Key API
app.post("/verify", async (req, res) => {
    const { key, deviceId } = req.body;
    if (!key || !deviceId) return res.status(400).json({ error: "Invalid request" });

    try {
        const foundKey = await Key.findOne({ key: key.toUpperCase() });
        if (!foundKey) return res.status(400).json({ error: "❌ Invalid key" });

        if (foundKey.used) return res.status(400).json({ error: "❌ Key already used" });

        foundKey.used = true;
        foundKey.deviceId = deviceId;
        await foundKey.save();

        res.json({ success: true, message: "✅ Key Activated!" });
    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
