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

  try {
    console.log(`Fetching direct URL for: ${videoUrl}`);
    
    // 1. Appeler l'API de RapidAPI pour obtenir le lien .mp4 réel
    const options = {
      method: 'GET',
      url: 'https://instagram-reels-downloader-api.p.rapidapi.com/get_reel_download_url',
      params: { url: videoUrl },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, 
        'X-RapidAPI-Host': 'instagram-reels-downloader-api.p.rapidapi.com'
      }
    };

    const apiResponse = await axios.request(options);
    
    // L'API renvoie généralement un objet avec l'URL de téléchargement
    const directMp4Url = apiResponse.data.download_url || apiResponse.data.url;

    if (!directMp4Url) {
      console.error("API Response:", apiResponse.data);
      throw new Error("Lien MP4 non trouvé dans la réponse de l'API");
    }

    console.log(`Direct URL found, proxying stream...`);

    // 2. Proxy de stream pour bypass les CORS et servir le contenu proprement
    const videoStream = await axios({
      method: 'get',
      url: directMp4Url,
      responseType: 'stream',
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.instagram.com/'
      }
    });

    res.setHeader('Content-Type', 'video/mp4');
    
    // Forward essential headers
    if (videoStream.headers['content-length']) {
      res.setHeader('content-length', videoStream.headers['content-length']);
    }

    videoStream.data.pipe(res);

  } catch (error) {
    console.error("Erreur API:", error.message);
    res.status(500).json({ 
      error: "Impossible de récupérer le Reel", 
      details: error.message,
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
