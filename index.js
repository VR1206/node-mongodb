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

const keySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    deviceId: { type: String, default: null },
    used: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: "30d" },
  },
  { timestamps: true }
);

const Key = mongoose.model("access_keys", keySchema);

// 🔑 Batch Key Generation Support
app.post("/generate-key", async (req, res) => {
  try {
    const { count = 1 } = req.body; // Default ek key generate karega
    const keys = Array.from({ length: Math.min(count, 10) }, generateKey).map(
      (key) => ({ key })
    );

    await Key.insertMany(keys);
    console.log(`🔑 ${keys.length} Keys Generated`);

    res.json({ success: true, keys: keys.map((k) => k.key) });
  } catch (err) {
    console.error("❌ Error generating keys:", err);
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
    const existingKey = await Key.findOne({ key: normalizedKey }).lean(); // Lean query for faster execution

    if (!existingKey) {
      console.log(`❌ Key not found: "${normalizedKey}"`);
      return res.json({ success: false, message: "Invalid key" });
    }

    if (existingKey.used && existingKey.deviceId !== deviceId) {
      console.log(`❌ Key already used: "${normalizedKey}", Device: ${existingKey.deviceId}`);
      return res.json({ success: false, message: "This key has already been used by another device" });
    }

    if (!existingKey.used) {
      await Key.updateOne({ key: normalizedKey }, { used: true, deviceId });
    }

    console.log(`✅ Key verified: "${normalizedKey}", Device: ${deviceId}`);
    res.json({ success: true, message: "Key verified successfully" });
  } catch (err) {
    console.error("❌ Error verifying key:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// 🔑 Optimized Key Generation Function
function generateKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
  return Array.from({ length: 12 }, (_, i) =>
    i > 0 && i % 4 === 0 ? "-" : chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

app.get("/", (req, res) => {
  res.send("🚀 Key Generation And Verify API is running");
});

module.exports = app;
