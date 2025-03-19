import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Key Schema
const keySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    used: { type: Boolean, default: false },
    deviceId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});
const Key = mongoose.model("Key", keySchema);

// ✅ Verify Key API
app.post("/verify", async (req, res) => {
    const { key, deviceId } = req.body;

    console.log("🛠️ Received Key:", key);
    console.log("🛠️ Received Device ID:", deviceId);

    try {
        const foundKey = await Key.findOne({ key: key.toUpperCase() });

        console.log("🔍 Found Key in DB:", foundKey);

        if (!foundKey) {
            return res.status(400).json({ error: "❌ Invalid key" });
        }

        if (foundKey.used) {
            return res.status(400).json({ error: "❌ Key already used" });
        }

        // ✅ Mark key as used
        foundKey.used = true;
        foundKey.deviceId = deviceId;
        await foundKey.save();

        return res.json({ success: true, message: "✅ Key Activated!" });
    } catch (error) {
        console.error("❌ Error verifying key:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Default route
app.get("/", (req, res) => {
    res.send("🎉 Key Generator Backend Running!");
});

// ✅ Start Server (Only for local development)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// ✅ Vercel Deployment (Export Handler)
export default app;
