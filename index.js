const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.json());

const MONGO_URL =
  process.env.MONGO_URL ||
  "mongodb+srv://testing:Jakhar9014@vip.qrk6v.mongodb.net/?retryWrites=true&w=majority&appName=VIP";

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
  valid: { type: Boolean, required: true, default: true },
  deviceId: { type: String, default: null }, // ✅ Device ID Field
});
const Key = mongoose.model("Key", keySchema);

// ✅ Verify Key with Device ID
app.post("/verify", async (req, res) => {
  try {
    const { key, deviceId } = req.body;
    if (!key || !deviceId || typeof key !== "string" || typeof deviceId !== "string") {
      return res.status(400).json({ error: "Invalid key or device ID format" });
    }

    const foundKey = await Key.findOne({ key });

    if (!foundKey) {
      return res.status(404).json({ error: "Invalid key" });
    }

    if (!foundKey.valid) {
      return res.status(403).json({ error: "Key is no longer valid" });
    }

    if (foundKey.deviceId && foundKey.deviceId !== deviceId) {
      return res.status(403).json({ error: "Key is already used on another device" });
    }

    // ✅ First-time use: Bind key to device
    if (!foundKey.deviceId) {
      foundKey.deviceId = deviceId;
    }

    // ✅ Mark key as used (invalid)
    foundKey.valid = false;
    await foundKey.save();

    res.json({ success: true, message: "Key is valid and registered to this device" });
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Default Route
app.get("/", (req, res) => {
  res.send("Key Verification API is running");
});

module.exports = app;
