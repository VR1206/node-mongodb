const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.set("strictQuery", true);

const MONGO_URL =
  process.env.MONGO_URL ||
  "mongodb+srv://testing:Jakhar9014@vip.qrk6v.mongodb.net/PREMIUM_keys?retryWrites=true&w=majority&appName=VIP";

mongoose
  .connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err);
    process.exit(1);
  });

// 🔑 Key Schema
const keySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    deviceId: { type: String, default: null },
    used: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: "30d" }, // Expires in 30 days
  },
  { timestamps: true }
);

const Key = mongoose.model("access_keys", keySchema);

// 🔑 Batch Key Generation API
app.post("/generate-key", async (req, res) => {
  try {
    const { count = 1 } = req.body;
    const keys = Array.from({ length: Math.min(count, 10) }, generateKey).map((key) => ({ key }));

    await Key.insertMany(keys);
    console.log(`🔑 ${keys.length} Keys Generated`);

    res.json({ success: true, keys: keys.map((k) => k.key) });
  } catch (err) {
    console.error("❌ Error generating keys:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// ✅ Key Verification API (with Device ID check)
app.post("/verify-key", async (req, res) => {
  try {
    const { key, deviceId } = req.body;
    if (!key || !deviceId) {
      return res.status(400).json({ success: false, message: "Key and Device ID are required" });
    }

    const normalizedKey = key.trim().toUpperCase();
    const normalizedDeviceId = deviceId.trim().toLowerCase(); // Normalize Device ID

    const existingKey = await Key.findOne({ key: normalizedKey }).lean();

    if (!existingKey) {
      console.log(`❌ Key not found: "${normalizedKey}"`);
      return res.json({ success: false, message: "Invalid Key" });
    }

    if (!existingKey.used) {
      // First-time use, store Device ID
      await Key.updateOne({ key: normalizedKey }, { used: true, deviceId: normalizedDeviceId });
      console.log(`✅ Key verified for the first time: "${normalizedKey}", Device: ${normalizedDeviceId}`);
      return res.json({ success: true, message: "Key verified and Device ID stored" });
    }

    if (existingKey.deviceId === normalizedDeviceId) {
      console.log(`✅ Key already verified and running on the same device: "${normalizedKey}"`);
      return res.json({ success: true, message: "Key verified successfully" });
    } else {
      console.log(`❌ Key already used but being accessed from a new device: "${normalizedKey}"`);
      return res.json({ success: false, message: "This Key has already been used on another device" });
    }
  } catch (err) {
    console.error("❌ Error verifying key:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// 🔑 Optimized Key Generation Function
function generateKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
  let key = "";

  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) key += "-"; // Add hyphen after every 4 characters
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return key;
}

// 🌍 API Running Message
app.get("/", (req, res) => {
  res.send("🚀 Key Generation And Verification API is Running");
});

// 🔥 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
