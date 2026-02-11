require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { exec } = require("child_process");
const { promisify } = require("util");
const execPromise = promisify(exec);
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 10000;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connecté à MongoDB Atlas"))
  .catch((err) => console.error("Erreur de connexion MongoDB:", err));

// Schemas
const videoSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  title: String,
  url: String,
  tags: String,
  addedAt: { type: Date, default: Date.now },
});

const submissionSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  title: String,
  url: String,
  tags: String,
  submittedAt: { type: Date, default: Date.now },
});

const Video = mongoose.model("Video", videoSchema);
const Submission = mongoose.model("Submission", submissionSchema);

// Middlewares
app.use(cors());
app.use(express.json());

app.get("/api/stream", async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: "URL manquante" });
  }

  // Clean the URL
  let cleanUrl = videoUrl;
  try {
    const urlObj = new URL(videoUrl);
    const trackingParams = [
      "igsh",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "si",
    ];
    trackingParams.forEach((p) => urlObj.searchParams.delete(p));
    cleanUrl = urlObj.toString();
  } catch (e) {
    cleanUrl = videoUrl.split("?")[0];
  }

  try {
    console.log(`Fetching direct URL for: ${videoUrl}`);
    let directMp4Url = null;

    // --- VERSION Local yt-dlp ---
    console.log(`Using yt-dlp to fetch direct URL for: ${cleanUrl}`);
    const cookiesPath = path.join(__dirname, "cookies.txt");
    const formatSelection = '"best[ext=mp4]/best"';
    let ytDlpCommand = `yt-dlp -f ${formatSelection} -g "${cleanUrl}"`;

    if (fs.existsSync(cookiesPath)) {
      ytDlpCommand = `yt-dlp --cookies "${cookiesPath}" -f ${formatSelection} -g "${cleanUrl}"`;
    }

    try {
      const { stdout } = await execPromise(ytDlpCommand);
      if (stdout) {
        const urls = stdout.trim().split("\n");
        directMp4Url = urls[0];
      }
    } catch (ytErr) {
      console.error("yt-dlp execution error:", ytErr.message);
      throw new Error(
        "Impossible de récupérer l'URL avec yt-dlp. Vérifie tes cookies ou l'URL.",
      );
    }

    if (!directMp4Url) {
      throw new Error("Lien MP4 direct non trouvé via yt-dlp.");
    }

    // Proxy Stream
    const urlObj = new URL(videoUrl);
    const streamHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: `${urlObj.protocol}//${urlObj.hostname}/`,
    };

    if (req.headers.range) {
      streamHeaders.range = req.headers.range;
    }

    const videoStream = await axios({
      method: "get",
      url: directMp4Url,
      responseType: "stream",
      headers: streamHeaders,
      timeout: 15000,
      validateStatus: false,
    });

    res.status(videoStream.status);
    const headersToForward = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
    ];

    headersToForward.forEach((header) => {
      if (videoStream.headers[header]) {
        res.setHeader(header, videoStream.headers[header]);
      }
    });

    videoStream.data.pipe(res);
  } catch (error) {
    console.error("Erreur Backend:", error.message);
    let userMessage = "L'URL est peut-etre invalide ou la vidéo est privée.";
    if (videoUrl.includes("instagram.com")) {
      userMessage =
        "Impossible de récupérer ce Reel Instagram. Le lien est peut-être expiré ou les cookies ont expiré.";
    }
    res.status(500).json({ error: "Impossible de récupérer la vidéo", message: userMessage });
  }
});

// Auth Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (token === "Azeroth-Session-Token") {
    next();
  } else {
    res.status(403).json({ error: "Forbidden" });
  }
};

app.post("/api/auth/login", (req, res) => {
  const { password } = req.body;
  if (password === "Azeroth") {
    res.json({ token: "Azeroth-Session-Token", success: true });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

// --- Playlist Management (MongoDB) ---

app.get("/api/playlists", async (req, res) => {
  try {
    const videos = await Video.find().sort({ addedAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: "Failed to read playlists" });
  }
});

app.post("/api/playlists", authenticate, async (req, res) => {
  try {
    const newPlaylists = req.body;
    if (!Array.isArray(newPlaylists)) {
      return res.status(400).json({ error: "Invalid format" });
    }
    
    // Pour simplifier cette implémentation (qui attend un tableau complet du frontend),
    // on vide la collection et on réinsère tout. 
    // Optimization: In a real app, use updates instead of clear+insert.
    await Video.deleteMany({});
    await Video.insertMany(newPlaylists);
    
    res.json({ success: true, count: newPlaylists.length });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: "Failed to save playlists" });
  }
});

// --- Submission Management (MongoDB) ---

app.post("/api/submissions", async (req, res) => {
  try {
    const { title, url, tags } = req.body;
    if (!title || !url) return res.status(400).json({ error: "Missing fields" });

    const exists = await Submission.findOne({ url });
    if (exists) return res.status(409).json({ error: "Already pending" });

    const newSubmission = new Submission({
      id: uuidv4(),
      title,
      url,
      tags: tags || "",
    });

    await newSubmission.save();
    res.json({ success: true, message: "Submission received" });
  } catch (err) {
    res.status(500).json({ error: "Submission failed" });
  }
});

app.get("/api/submissions", authenticate, async (req, res) => {
  try {
    const pending = await Submission.find().sort({ submittedAt: -1 });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: "Failed to read submissions" });
  }
});

app.post("/api/submissions/approve", authenticate, async (req, res) => {
  try {
    const { id } = req.body;
    const submission = await Submission.findOne({ id });
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    // Add to main Video collection
    const newVideo = new Video({
      id: submission.id,
      title: submission.title,
      url: submission.url,
      tags: submission.tags,
    });
    await newVideo.save();

    // Remove from pending
    await Submission.deleteOne({ id });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Approval failed" });
  }
});

app.delete("/api/submissions/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await Submission.deleteOne({ id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Rejection failed" });
  }
});

app.get("/health", (req, res) => {
  const cookiesExist = fs.existsSync(path.join(__dirname, "cookies.txt"));
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    provider: "yt-dlp",
    usingCookies: cookiesExist,
  });
});

app.listen(PORT, () => {
  console.log(`Serveur via yt-dlp sur le port ${PORT}`);
});
