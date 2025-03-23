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
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

connectToMongo();

// Updated Schema with deviceId, removed username
const keySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  deviceId: { type: String, default: null }, // Back to deviceId
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: "30d" },
});

const Key = mongoose.model("access_keys", keySchema);

// Generate Key Endpoint
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

// Original Verify Key Endpoint with deviceId
app.post("/verify-key", async (req, res) => {
  try {
    const { key, deviceId } = req.body;

    if (!key || !deviceId) {
      return res.status(400).json({ error: "Key and Device ID are required" });
    }

    const normalizedKey = key.trim().toUpperCase();
    const existingKey = await Key.findOne({ key: normalizedKey });

    if (!existingKey) {
      console.log(`Key not found: "${normalizedKey}"`);
      return res.status(404).json({ error: "Invalid key" });
    }

    const isUsed = existingKey.used || false;
    const hasDeviceId = existingKey.deviceId !== undefined && existingKey.deviceId !== null;

    if (isUsed && hasDeviceId) {
      console.log(`Key already used: "${normalizedKey}", Device: ${existingKey.deviceId}`);
      return res.status(400).json({ error: "Key already used" });
    }

    existingKey.deviceId = deviceId;
    existingKey.used = true;
    await existingKey.save();

    console.log(`Key verified: "${normalizedKey}", Device: ${deviceId}`);
    res.json({ success: true, message: "Key verified successfully" });
  } catch (err) {
    console.error("Error verifying key:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// New Verify Access Key Function with deviceId
async function verifyAccessKey(key, deviceId) {
  try {
    const normalizedKey = key.trim().toUpperCase();
    const keyExists = await Key.findOne({ key: normalizedKey });

    if (!keyExists) {
      return { success: false, status: "invalid", message: "Invalid Access Key" };
    }

    if (keyExists.used && keyExists.deviceId !== deviceId) {
      return { success: false, status: "used", message: "This key has already been used by another device" };
    }

    if (!keyExists.used) {
      // Update key with deviceId if unused
      await Key.updateOne(
        { key: normalizedKey },
        { $set: { used: true, deviceId } }
      );
    }

    return { success: true, status: "valid", message: "Access Key verified successfully" };
  } catch (error) {
    console.error("Error in verifyAccessKey:", error);
    return { success: false, status: "error", message: "An error occurred during verification" };
  }
}

// New Verify Endpoint with deviceId
app.post("/verify", async (req, res) => {
  const { key, deviceId } = req.body;

  if (!key || !deviceId) {
    return res.status(400).json({ success: false, message: "Missing required fields: key, deviceId" });
  }

  const result = await verifyAccessKey(key, deviceId);
  res.status(result.success ? 200 : 403).json(result);
});

// Key Generation Function
function generateKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
  let key = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0 && i < 12) key += "-";
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Root Endpoint
app.get("/", (req, res) => {
  res.send("Key Generation API is running");
});

// Export App and Function
module.exports = { app, verifyAccessKey };
