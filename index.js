const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.set("strictQuery", true);

const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://testing:Jakhar9014@vip.qrk6v.mongodb.net/PREMIUM_keys?retryWrites=true&w=majority&appName=VIP";

if (!MONGO_URL) {
  console.error("❌ MongoDB URL is missing in environment variables");
  process.exit(1);
}

const connectToMongo = async () => {
  let attempts = 0;
  while (attempts < 5) {
    try {
      await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
      console.log("✅ Connected to MongoDB");
      return;
    } catch (err) {
      attempts++;
      console.error(`⚠️ MongoDB Connection Attempt ${attempts} Failed:`, err);
      if (attempts >= 5) {
        console.error("❌ Max retries reached. Exiting...");
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

connectToMongo();

const keySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  deviceId: { type: String, default: null },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: "30d" },
});

const Key = mongoose.model("access_keys", keySchema);

app.post("/generate-key", async (req, res) => {
  try {
    const key = generateKey();
    const newKey = new Key({ key });
    await newKey.save();

    console.log(`🔑 Generated key: ${key}`);
    res.json({ success: true, key });
  } catch (err) {
    console.error("❌ Error generating key:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.post("/verify-key", async (req, res) => {
  try {
    const { key, deviceId } = req.body;

    if (!key || !deviceId) {
      return res.status(400).json({ success: false, message: "Key and Device ID are required" });
    }

    const normalizedKey = key.trim().toUpperCase();
    const existingKey = await Key.findOne({ key: normalizedKey });

    if (!existingKey) {
      console.log(`❌ Key not found: "${normalizedKey}"`);
      return res.json({ success: false, message: "Invalid key" });
    }

    if (existingKey.used && existingKey.deviceId !== deviceId) {
      console.log(`❌ Key already used: "${normalizedKey}", Device: ${existingKey.deviceId}`);
      return res.json({ success: false, message: "This key has already been used by another device" });
    }

    if (!existingKey.used) {
      existingKey.deviceId = deviceId;
      existingKey.used = true;
      await existingKey.save();
    }

    console.log(`✅ Key verified: "${normalizedKey}", Device: ${deviceId}`);
    res.json({ success: true, message: "Key verified successfully" });
  } catch (err) {
    console.error("❌ Error verifying key:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// 🔑 Improved Key Generation Function
function generateKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
  return Array(12)
    .fill(null)
    .map((_, i) => (i > 0 && i % 4 === 0 ? "-" : chars[Math.floor(Math.random() * chars.length)]))
    .join("");
}

app.get("/", (req, res) => {
  res.send("✅ Key Generation API is running");
});

// Export app for serverless compatibility
module.exports = app;
