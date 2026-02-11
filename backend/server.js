const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { exec } = require("child_process");
const { promisify } = require("util");
const execPromise = promisify(exec);
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// Middlewares
app.use(cors());

app.get("/api/stream", async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: "URL manquante" });
  }

  // Clean the URL: Remove common tracking parameters but keep essential ones (like ?v= for YouTube)
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
    // Fallback to minimal cleaning if URL parsing fails
    cleanUrl = videoUrl.split("?")[0];
  }

  try {
    console.log(`Fetching direct URL for: ${videoUrl}`);

    let directMp4Url = null;

    /* --- VERSION RapidAPI (Désactivée) ---
    // 1. Appeler l'API de RapidAPI pour obtenir le lien .mp4 réel
    const options = {
      method: 'GET',
      url: 'https://instagram-reels-downloader-api.p.rapidapi.com/download',
      params: { url: cleanUrl },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, 
        'X-RapidAPI-Host': 'instagram-reels-downloader-api.p.rapidapi.com'
      }
    };

    const apiResponse = await axios.request(options);
    const apiData = apiResponse.data;
    const responseData = apiData.data || apiData;
    
    // 1. Try to find the video in the 'medias' array first (it's the most reliable source for this API)
    if (responseData.medias && Array.isArray(responseData.medias) && responseData.medias.length > 0) {
      // Find the first media that is a video
      const videoMedia = responseData.medias.find(m => m.type === 'video') || responseData.medias[0];
      directMp4Url = videoMedia.url;
    }

    // 2. Fallback to download_url or url BUT ONLY if it's not the original Instagram link
    if (!directMp4Url || directMp4Url.includes('instagram.com/reels/') || directMp4Url.includes('instagram.com/reel/')) {
       if (responseData.download_url && !responseData.download_url.includes('instagram.com/')) {
         directMp4Url = responseData.download_url;
       } else if (responseData.url && !responseData.url.includes('instagram.com/')) {
         directMp4Url = responseData.url;
       }
    }
    -------------------------------------- */

    // --- VERSION Local yt-dlp ---
    console.log(`Using yt-dlp to fetch direct URL for: ${cleanUrl}`);
    const cookiesPath = path.join(__dirname, "cookies.txt");
    // Using format that prioritizes merged MP4 for browser compatibility
    const formatSelection = '"best[ext=mp4]/best"';
    let ytDlpCommand = `yt-dlp -f ${formatSelection} -g "${cleanUrl}"`;

    if (fs.existsSync(cookiesPath)) {
      console.log("Using cookies.txt for yt-dlp");
      ytDlpCommand = `yt-dlp --cookies "${cookiesPath}" -f ${formatSelection} -g "${cleanUrl}"`;
    } else {
      console.log(
        "No cookies.txt found in backend folder. Running without cookies.",
      );
    }

    try {
      const { stdout, stderr } = await execPromise(ytDlpCommand);
      if (stdout) {
        const urls = stdout.trim().split("\n");
        console.log(`yt-dlp returned ${urls.length} URL(s)`);
        directMp4Url = urls[0]; // Usually the first one is the best/combined
      }
      if (stderr && !directMp4Url) {
        console.error("yt-dlp stderr:", stderr);
      }
    } catch (ytErr) {
      console.error("yt-dlp execution error:", ytErr.message);
      throw new Error(
        "Impossible de récupérer l'URL avec yt-dlp. Vérifie tes cookies ou l'URL.",
      );
    }

    if (!directMp4Url) {
      console.error("Lien direct non trouvé avec yt-dlp.");
      throw new Error("Lien MP4 direct non trouvé via yt-dlp.");
    }

    console.log(`Direct URL found: ${directMp4Url.substring(0, 50)}...`);
    console.log(`Proxying stream with Range support...`);

    // 2. Proxy de stream avec support des "Ranges" (essentiel pour les vidéos)
    const urlObj = new URL(videoUrl);
    const streamHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: `${urlObj.protocol}//${urlObj.hostname}/`,
    };

    if (req.headers.range) {
      console.log(`Browser requested Range: ${req.headers.range}`);
      streamHeaders.range = req.headers.range;
    }

    try {
      const videoStream = await axios({
        method: "get",
        url: directMp4Url,
        responseType: "stream",
        headers: streamHeaders,
        timeout: 10000,
        validateStatus: false,
      });

      console.log(`Source Status: ${videoStream.status}`);
      console.log(
        `Source Headers:`,
        JSON.stringify(videoStream.headers, null, 2),
      );

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

      videoStream.data.on("error", (err) => {
        console.error("Stream error while piping:", err.message);
      });
    } catch (streamErr) {
      console.error("Error initiating video stream:", streamErr.message);
      throw streamErr;
    }
  } catch (error) {
    if (error.response) {
      console.error(
        "API Error Response Data:",
        JSON.stringify(error.response.data, null, 2),
      );
      console.error("API Error Status:", error.response.status);
    }
    console.error("Erreur Backend:", error.message);

    let userMessage = "L'URL est peut-etre invalide ou la vidéo est privée.";
    if (videoUrl.includes("tiktok.com")) {
      userMessage =
        "Impossible de récupérer cette vidéo TikTok. Veuillez vérifier le lien.";
    } else if (videoUrl.includes("instagram.com")) {
      userMessage =
        "Impossible de récupérer ce Reel Instagram. Le lien est peut-être expiré.";
    }

    res.status(500).json({
      error: "Impossible de récupérer la vidéo",
      details: error.message,
      message: userMessage,
    });
  }
});

// --- Playlist Management ---

const PLAYLISTS_FILE = path.join(__dirname, "data", "playlists.json");

// Helper to read playlists
const readPlaylists = () => {
  if (!fs.existsSync(PLAYLISTS_FILE)) {
    return [];
  }
  const data = fs.readFileSync(PLAYLISTS_FILE, "utf-8");
  return JSON.parse(data);
};

// Helper to write playlists
const writePlaylists = (data) => {
  fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(data, null, 2), "utf-8");
};

// Auth Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  // Simple "token" check - in real app use JWT. Here we just use the password as token for simplicity/demo
  // or a simple base64 of it. Let's just expect "Azeroth-token" for now to keep it extremely simple
  // or just check against the password directly if we treat it as an API key.

  // Real-world: verifying a specific token.
  if (token === "Azeroth-Session-Token") {
    next();
  } else {
    res.status(403).json({ error: "Forbidden" });
  }
};

app.post("/api/auth/login", express.json(), (req, res) => {
  const { password } = req.body;
  if (password === "Azeroth") {
    res.json({ token: "Azeroth-Session-Token", success: true });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

app.get("/api/playlists", (req, res) => {
  try {
    const playlists = readPlaylists();
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: "Failed to read playlists" });
  }
});

app.post("/api/playlists", express.json(), authenticate, (req, res) => {
  try {
    const newPlaylists = req.body;
    if (!Array.isArray(newPlaylists)) {
      return res.status(400).json({ error: "Invalid format" });
    }
    writePlaylists(newPlaylists);
    res.json({ success: true, count: newPlaylists.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to save playlists" });
  }
});

// End Playlist Management

// --- Submission Management ---
const PENDING_FILE = path.join(__dirname, "data", "pending.json");
const { v4: uuidv4 } = require('uuid');

const readPending = () => {
  if (!fs.existsSync(PENDING_FILE)) return [];
  try {
    const data = fs.readFileSync(PENDING_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) { return []; }
};

const writePending = (data) => {
  fs.writeFileSync(PENDING_FILE, JSON.stringify(data, null, 2), "utf-8");
};

// 1. Submit a video (Public)
app.post("/api/submissions", express.json(), (req, res) => {
    try {
        const { title, url, tags } = req.body;
        if (!title || !url) return res.status(400).json({ error: "Missing fields" });

        const pending = readPending();
        // Simple duplicate check
         if (pending.some(v => v.url === url)) {
            return res.status(409).json({ error: "Already pending" });
        }
        
        const newSubmission = {
            id: uuidv4(),
            title,
            url,
            tags: tags || "",
            submittedAt: new Date().toISOString()
        };

        pending.push(newSubmission);
        writePending(pending);

        console.log(`New submission: ${title}`);
        res.json({ success: true, message: "Submission received" });
    } catch (err) {
        console.error("Submission error:", err);
        res.status(500).json({ error: "Submission failed" });
    }
});

// 2. List submissions (Admin only)
app.get("/api/submissions", authenticate, (req, res) => {
    try {
        const pending = readPending();
        res.json(pending);
    } catch (err) {
        res.status(500).json({ error: "Failed to read submissions" });
    }
});

// 3. Approve submission (Admin only)
app.post("/api/submissions/approve", express.json(), authenticate, (req, res) => {
    try {
        const { id } = req.body;
        const pending = readPending();
        const submissionIndex = pending.findIndex(v => v.id === id);

        if (submissionIndex === -1) return res.status(404).json({ error: "Submission not found" });

        const submission = pending[submissionIndex];
        
        // Add to main playlists
        const playlists = readPlaylists();
        // Avoid duplicate ID collision if any, though uuid is safe. 
        // We might want to keep the ID or generate a new simple one? 
        // Let's keep the UUID to ensure uniqueness.
        playlists.push({
            id: submission.id,
            title: submission.title,
            url: submission.url,
            tags: submission.tags
        });
        writePlaylists(playlists);

        // Remove from pending
        pending.splice(submissionIndex, 1);
        writePending(pending);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Approval failed" });
    }
});

// 4. Reject submission (Admin only)
app.delete("/api/submissions/:id", authenticate, (req, res) => {
    try {
        const { id } = req.params;
        let pending = readPending();
        const initialLength = pending.length;
        pending = pending.filter(v => v.id !== id);

        if (pending.length === initialLength) return res.status(404).json({ error: "Submission not found" });

        writePending(pending);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Rejection failed" });
    }
});

// End Submission Management

app.get("/health", (req, res) => {
  const cookiesExist = fs.existsSync(path.join(__dirname, "cookies.txt"));
  res.json({
    status: "ok",
    provider: "yt-dlp",
    usingCookies: cookiesExist,
  });
});

app.listen(PORT, () => {
  console.log(`Serveur via yt-dlp sur le port ${PORT}`);
});
