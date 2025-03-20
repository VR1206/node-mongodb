const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for all origins

// MongoDB Connection
const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://testing:Jakhar9014@vip.qrk6v.mongodb.net/PREMIUM_keys?retryWrites=true&w=majority&appName=VIP";

if (!MONGO_URL) {
  console.error("MongoDB URL is missing in environment variables");
  process.exit(1);
}

// Retry logic for MongoDB connection
const connectToMongo = async () => {
  for (let i = 0; i < 3; i++) {
    try {
      await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
      console.log("Connected to MongoDB");
      return;
    } catch (err) {
      console.error(`MongoDB Connection Attempt ${i + 1} Failed:`, err);
      if (i === 2) {
        console.error("Max retries reached. Exiting...");
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
    }
  }
};

connectToMongo();

// Key Schema
const keySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  deviceId: { type: String, default: null },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: "30d" }, // Auto-delete after 30 days
});

const Key = mongoose.model("access_keys", keySchema);

// Generate Key API
app.post("/generate-key", async (req, res) => {
  try {
    const key = generateKey();
    const newKey = new Key({ key });
    await newKey.save();

    console.log(`Generated key: ${key}`);
    res.json({ success: true, key });
  } catch (err) {
    console.error("Error generating key:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Verify Key API
app.post("/verify-key", async (req, res) => {
  try {
    const { key, deviceId } = req.body;

    // Input validation
    if (!key || !deviceId) {
      return res.status(400).json({ error: "Key and Device ID are required" });
    }

    // Normalize key to avoid case/whitespace issues
    const normalizedKey = key.trim().toUpperCase();

    // Fetch key from MongoDB
    const existingKey = await Key.findOne({ key: normalizedKey });

    if (!existingKey) {
      console.log(`Key not found: ${normalizedKey}`);
      return res.status(404).json({ error: "Invalid key" });
    }

    // Handle missing fields by setting defaults
    const isUsed = existingKey.used || false;
    const hasDeviceId = existingKey.deviceId !== undefined && existingKey.deviceId !== null;

    if (isUsed && hasDeviceId) {
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

// For Vercel, export the app
module.exports = app;
