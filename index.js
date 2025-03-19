const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://testing:Jakhar9014@vip.qrk6v.mongodb.net/PREMIUM_keys?retryWrites=true&w=majority&appName=VIP";

mongoose
  .connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// Schema & Model
const keySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  used: { type: Boolean, default: false },
  deviceId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

const Key = mongoose.model("access_keys", keySchema);

// API Routes
app.post("/api/verify", async (req, res) => {
  try {
    const { key, deviceId } = req.body;
    if (!key || !deviceId) return res.status(400).json({ error: "Key and Device ID required" });

    const foundKey = await Key.findOne({ key: key.toUpperCase() });
    if (!foundKey) return res.status(404).json({ error: "Invalid key" });

    if (foundKey.used && foundKey.deviceId !== deviceId) {
      return res.status(403).json({ error: "Key is already used on another device" });
    }

    foundKey.used = true;
    foundKey.deviceId = deviceId;
    await foundKey.save();

    res.json({ success: true, message: "Key is valid and activated" });
  } catch (err) {
    console.error("❌ Server Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Root Route
app.get("/", (req, res) => {
  res.send("✅ Key Verification API is running");
});

// Export for Vercel
module.exports = app;
