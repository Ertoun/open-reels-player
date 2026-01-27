import React, { useState, useEffect } from 'react';
import { Play, ExternalLink, Loader2, Info } from 'lucide-react';
import playlists from './playlists.json';

const API_BASE_URL = 'http://localhost:3001'; // Update this for production

function App() {
  const [currentVideo, setCurrentVideo] = useState(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVideoSelect = async (video) => {
    setCurrentVideo(video);
    setLoading(true);
    setError('');
    setStreamUrl('');

    try {
      // The backend will extract and proxy the stream
      const proxyUrl = `${API_BASE_URL}/api/stream?url=${encodeURIComponent(video.url)}`;
      setStreamUrl(proxyUrl);
    } catch (err) {
      setError('Impossible de charger la vidéo.');
      console.error(err);
    } finally {
      // We don't set loading false immediately because the player needs to load
    }
  };

  const onPlayerLoaded = () => {
    setLoading(false);
  };

  const onPlayerError = () => {
    setLoading(false);
    setError('Erreur de lecture. Le lien est peut-être expiré.');
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-gray-800 flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] bg-clip-text text-transparent">
          Open-Reels Player
        </h1>
        <div className="text-sm text-gray-400">Open Source Instagram Viewer</div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row gap-6 p-6 overflow-hidden">
        {/* Playlists Sidebar */}
        <div className="w-full md:w-80 overflow-y-auto space-y-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-300 px-2">Playlist</h2>
          {playlists.map((video) => (
            <button
              key={video.id}
              onClick={() => handleVideoSelect(video)}
              className={`w-full text-left p-3 rounded-xl transition-all flex gap-3 group ${
                currentVideo?.id === video.id 
                ? 'bg-[#1a1a1a] border border-gray-700' 
                : 'hover:bg-[#1a1a1a] border border-transparent'
              }`}
            >
              <div className="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                <img 
                  src={video.thumbnail} 
                  alt={video.title} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-6 h-6 text-white" fill="white" />
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <p className="font-medium text-sm line-clamp-2">{video.title}</p>
                <p className="text-xs text-gray-500 mt-1">Reel</p>
              </div>
            </button>
          ))}
        </div>

        {/* Player View */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#141414] rounded-2xl relative min-h-[500px] border border-gray-800 overflow-hidden">
          {!currentVideo ? (
            <div className="text-gray-500 text-center space-y-4">
              <Play className="w-16 h-16 mx-auto opacity-20" />
              <p>Sélectionnez une vidéo pour commencer</p>
            </div>
          ) : (
            <>
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 backdrop-blur-sm">
                  <Loader2 className="w-12 h-12 text-[#e1306c] animate-spin mb-4" />
                  <p className="text-lg font-medium">Récupération du flux...</p>
                  <p className="text-sm text-gray-400 mt-2 italic px-6 text-center">
                    Ceci peut prendre quelques secondes (yt-dlp en cours)
                  </p>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                  <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-xl text-center max-w-xs">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button 
                      onClick={() => handleVideoSelect(currentVideo)}
                      className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                    >
                      Réessayer
                    </button>
                  </div>
                </div>
              )}

              {streamUrl && (
                <video
                  key={streamUrl}
                  src={streamUrl}
                  controls
                  autoPlay
                  className="max-h-full max-w-full aspect-[9/16]"
                  onCanPlay={onPlayerLoaded}
                  onError={onPlayerError}
                />
              )}

              <div className="absolute top-4 right-4 flex gap-2">
                <a 
                  href={currentVideo.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-black/50 hover:bg-black/80 backdrop-blur-md p-2 rounded-full transition-all border border-white/10"
                  title="Voir sur Instagram"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Legal Banner */}
      <footer className="p-4 bg-black/50 border-t border-gray-800 text-[10px] md:text-xs text-gray-500 space-y-2">
        <div className="flex items-start gap-2 max-w-4xl mx-auto">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col md:flex-row gap-4">
            <p>
              <strong className="text-gray-400">FR :</strong> Ce lecteur est un outil open source de démonstration. Aucune donnée n'est hébergée sur nos serveurs. Les vidéos sont streamées directement depuis la plateforme d'origine. Veuillez respecter les droits d'auteur.
            </p>
            <p>
              <strong className="text-gray-400">EN :</strong> This player is an open-source demonstration tool. No data is hosted on our servers. Videos are streamed directly from the source platform. Please respect copyright laws.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
