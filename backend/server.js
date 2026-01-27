const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { spawn } = require("child_process");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 10000;

// Middlewares
app.use(cors());
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

// Function to get the direct MP4 URL using yt-dlp
const getDirectUrl = (instagramUrl) => {
  return new Promise((resolve, reject) => {
    // -g: get-url, --f: format (mp4)
    const embedUrl = instagramUrl.replace("/reel/", "/reels/embed/");
    const process = spawn("/usr/local/bin/yt-dlp", ["--no-check-certificate", "--get-url", embedUrl]);
    let output = "";
    let errorOutput = "";

    process.on('error', (err) => {
        if (err.code === 'ENOENT') {
            reject(new Error('yt-dlp not found. Please install it on your system.'));
        } else {
            reject(err);
        }
    });

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput}`));
      }
    });
  });
};

app.get("/api/stream", async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: "URL parameter is required" });
  }

  try {
    console.log(`Extracting URL for: ${videoUrl}`);
    const directUrl = await getDirectUrl(videoUrl);
    console.log(`Direct URL found: ${directUrl.substring(0, 50)}...`);

    // Prepare headers for the request to Instagram content servers
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Referer: "https://www.instagram.com/",
    };

    // Handle Range header from client for seeking
    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    // Fetch the video stream
    const response = await axios({
      method: "get",
      url: directUrl,
      responseType: "stream",
      headers: headers,
    });

    // Forward status and headers (especially Content-Range and Content-Length)
    res.status(response.status);
    Object.keys(response.headers).forEach((key) => {
      // Filter out some headers that might interfere
      if (
        [
          "content-type",
          "content-length",
          "content-range",
          "accept-ranges",
        ].includes(key.toLowerCase())
      ) {
        res.setHeader(key, response.headers[key]);
      }
    });

    // Ensure content-type is video/mp4 if not set
    if (!res.getHeader("content-type")) {
      res.setHeader("content-type", "video/mp4");
    }

    // Pipe the stream to the response
    response.data.pipe(res);
  } catch (error) {
    console.error("Error streaming video:", error.message);
    res
      .status(500)
      .json({ error: "Failed to stream video", details: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
