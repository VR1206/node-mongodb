const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://testing:Jakhar9014@vip.qrk6v.mongodb.net/access_keys?retryWrites=true&w=majority&appName=VIP";

if (!MONGO_URL) {
  console.error("MongoDB URL is missing in environment variables");
  process.exit(1);
}

mongoose
  .connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  });

const keySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  used: { type: Boolean, required: true, default: false },
  deviceId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, expires: "30d" },
});

const Key = mongoose.model("PREMIUM_keys", keySchema);

// ✅ **Generate Key Route**
app.post("/generate-key", async (req, res) => {
  try {
    const key = generateKey();
    const newKey = new Key({ key });
    await newKey.save();
    res.json({ success: true, key });
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// ✅ **Verify Key Route (Fixed)**
app.post("/verify-key", async (req, res) => {
  try {
    const { key, deviceId } = req.body;

    if (!key || !deviceId) {
      return res.status(400).json({ success: false, message: "❌ Key and Device ID are required!" });
    }

    const existingKey = await Key.findOne({ key });

    if (!existingKey) {
      return res.status(404).json({ success: false, message: "❌ Invalid Key!" });
    }

    if (existingKey.used) {
      if (existingKey.deviceId !== deviceId) {
        return res.status(400).json({ success: false, message: "❌ Key already used on another device!" });
      }
    } else {
      existingKey.used = true;
      existingKey.deviceId = deviceId;
      await existingKey.save();
    }

    res.json({ success: true, message: "✅ Key verified successfully!" });

  } catch (err) {
    console.error("Verification Error:", err);
    res.status(500).json({ success: false, message: "❌ Internal Server Error" });
  }
});

// ✅ **Generate a new key function**
function generateKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
  let key = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0 && i < 12) key += "-";
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

app.get("/", (req, res) => {
  res.send("Key Generation API is running");
});

module.exports = app;
