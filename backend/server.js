const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 10000;

// Middlewares
app.use(cors());

app.get("/api/stream", async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: "URL manquante" });
  }

  // Clean the URL: Remove query parameters like ?igsh=...
  const cleanUrl = videoUrl.split('?')[0];

  try {
    console.log(`Fetching direct URL for: ${videoUrl}`);
    
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
    
    let directMp4Url = null;

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

    if (!directMp4Url || directMp4Url.includes('instagram.com/reel')) {
      console.error("Structure de réponse API non reconnue ou lien invalide:", JSON.stringify(apiData, null, 2));
      throw new Error("Lien MP4 direct non trouvé. L'API a renvoyé la page HTML au lieu de la vidéo.");
    }

    console.log(`Direct URL found: ${directMp4Url.substring(0, 50)}...`);
    console.log(`Proxying stream with Range support...`);

    // 2. Proxy de stream avec support des "Ranges" (essentiel pour les vidéos)
    const streamHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.instagram.com/'
    };

    if (req.headers.range) {
      console.log(`Browser requested Range: ${req.headers.range}`);
      streamHeaders.range = req.headers.range;
    }

    try {
      const videoStream = await axios({
        method: 'get',
        url: directMp4Url,
        responseType: 'stream',
        headers: streamHeaders,
        timeout: 10000,
        validateStatus: false
      });

      console.log(`Source Status: ${videoStream.status}`);
      console.log(`Source Headers:`, JSON.stringify(videoStream.headers, null, 2));

      res.status(videoStream.status);
      
      const headersToForward = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
      ];

      headersToForward.forEach(header => {
        if (videoStream.headers[header]) {
          res.setHeader(header, videoStream.headers[header]);
        }
      });

      videoStream.data.pipe(res);

      videoStream.data.on('error', (err) => {
        console.error('Stream error while piping:', err.message);
      });
    } catch (streamErr) {
      console.error('Error initiating video stream:', streamErr.message);
      throw streamErr;
    }

  } catch (error) {
    if (error.response) {
      console.error("API Error Response Data:", JSON.stringify(error.response.data, null, 2));
      console.error("API Error Status:", error.response.status);
    }
    console.error("Erreur Backend:", error.message);
    res.status(500).json({ 
      error: "Impossible de récupérer le Reel", 
      details: error.response ? error.response.data : error.message,
      message: "Vérifie ta clé RapidAPI et tes crédits restants."
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", provider: "rapidapi" });
});

app.listen(PORT, () => {
  console.log(`Serveur via RapidAPI sur le port ${PORT}`);
});
