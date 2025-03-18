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
});
const Key = mongoose.model("Key", keySchema);

app.post("/verify", async (req, res) => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== "string") {
      return res.status(400).json({ error: "Invalid key format" });
    }

    const foundKey = await Key.findOne({ key }).lean();
    if (!foundKey) {
      return res.status(404).json({ error: "Invalid key" });
    }

    if (!foundKey.valid) {
      return res.status(403).json({ error: "Key is no longer valid" });
    }

    res.json({ success: true, message: "Key is valid" });
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/", (req, res) => {
  res.send("Key Verification API is running");
});

module.exports = app;
