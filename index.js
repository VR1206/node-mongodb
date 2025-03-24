const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connection setup
mongoose.set("strictQuery", true);
const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://testing:Jakhar9014@vip.qrk6v.mongodb.net/PREMIUM_keys?retryWrites=true&w=majority&appName=VIP";

if (!MONGO_URL) {
  console.error("❌ MongoDB URL is missing in environment variables");
  process.exit(1);
}

const connectToMongo = async () => {
  try {
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Faster timeout for connection
    });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err);
    process.exit(1);
  }
};

connectToMongo();

// Key Schema with indexing for faster queries
const keySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true }, // Indexed for faster lookup
  deviceId: { type: String, default: null },
  used: { type: Boolean, default: false, index: true }, // Indexed for faster filtering
  createdAt: { type: Date, default: Date.now, expires: "30d" },
});

const Key = mongoose.model("access_keys", keySchema);

// Faster Key Generation Function
function generateKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
  let key = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) key += "-";
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

// Generate Key Endpoint
app.post("/generate-key", async (req, res) => {
  try {
    const key = generateKey();
    await Key.create({ key }); // Use create() for single operation
    console.log(`🔑 Generated key: ${key}`);
    res.json({ success: true, key });
  } catch (err) {
    console.error("❌ Error generating key:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Verify Key Endpoint
app.post("/verify-key", async (req, res) => {
  try {
    const { key, deviceId } = req.body;

    if (!key || !deviceId) {
      return res.status(400).json({ success: false, message: "Key and Device ID are required" });
    }

    const normalizedKey = key.trim().toUpperCase();
    const existingKey = await Key.findOne({ key: normalizedKey }).lean(); // Use lean() for faster reads

    if (!existingKey) {
      console.log(`❌ Key not found: "${normalizedKey}"`);
      return res.json({ success: false, message: "Invalid key" });
    }

    if (existingKey.used && existingKey.deviceId !== deviceId) {
      console.log(`❌ Key already used: "${normalizedKey}", Device: ${existingKey.deviceId}`);
      return res.json({ success: false, message: "This key has already been used by another device" });
    }

    if (!existingKey.used) {
      await Key.updateOne(
        { key: normalizedKey },
        { $set: { deviceId, used: true } },
        { w: "majority" } // Ensure write consistency
      );
    }

    console.log(`✅ Key verified: "${normalizedKey}", Device: ${deviceId}`);
    res.json({ success: true, message: "Key verified successfully" });
  } catch (err) {
    console.error("❌ Error verifying key:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.get("/", (req, res) => {
  res.send("🚀 Key Generation And Verify API is running");
});

module.exports = app;
