const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://testing:Jakhar9014@vip.qrk6v.mongodb.net/PREMIUM_keys?retryWrites=true&w=majority&appName=VIP";

if (!MONGO_URL) {
  console.error("MongoDB URL is missing in environment variables");
  process.exit(1);
}

mongoose
  .connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err42) => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  });

// Key Schema
const keySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  deviceId: { type: String, default: null },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: "30d" },
});

const Key = mongoose.model("access_keys", keySchema);

// Generate Key API
app.post("/generate-key", async (req, res) => {
  try {
    const key = generateKey();
    const newKey = new Key({ key });
    await newKey.save();

    res.json({ success: true, key });
  } catch (err) {
    console.error("Error generating key:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Verify Key API (Improved)
app.post("/verify-key", async (req, res) => {
  try {
    const { key, deviceId } = req.body;

    // Input validation
    if (!key || !deviceId) {
      return res.status(400).json({ error: "Key and Device ID are required" });
    }

    // Trim and normalize key to avoid whitespace/case issues
    const normalizedKey = key.trim().toUpperCase();

    // Fetch key from MongoDB
    const existingKey = await Key.findOne({ key: normalizedKey });

    if (!existingKey) {
      console.log(`Key not found: ${normalizedKey}`);
      return res.status(404).json({ error: "Invalid key" });
    }

    // Check if key is already used
    if (existingKey.used && existingKey.deviceId) {
      console.log(`Key already used: ${normalizedKey}, Device: ${existingKey.deviceId}`);
      return res.status(400).json({ error: "Key already used" });
    }

    // Mark key as used and assign deviceId
    existingKey.deviceId = deviceId;
    existingKey.used = true;
    await existingKey.save();

    console.log(`Key verified: ${normalizedKey}, Device: ${deviceId}`);
    res.json({ success: true, message: "Key verified successfully" });
  } catch (err) {
    console.error("Error verifying key:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Function to generate a random key
function generateKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
  let key = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0 && i < 12) key += "-";
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Home Route
app.get("/", (req, res) => {
  res.send("Key Generation API is running");
});

module.exports = app;
