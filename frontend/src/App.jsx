import React, { useState, useEffect } from 'react';
import { Play, ExternalLink, Loader2, Info, Plus, Library, User, Heart, Bookmark, Trash2, Edit3, X } from 'lucide-react';
import initialPlaylists from './playlists.json';

const API_BASE_URL = 'https://open-reels-player.onrender.com';

function App() {
  const [currentVideo, setCurrentVideo] = useState(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for tabs
  const [activeTab, setActiveTab] = useState('library'); // 'library', 'favorites', 'my-reels', 'add'
  
  // State for playlists and favorites
  const [customReels, setCustomReels] = useState(() => {
    const saved = localStorage.getItem('customReels');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // State for Add/Edit form
  const [formFields, setFormFields] = useState({ title: '', url: '', thumbnail: '' });
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Persist data
  useEffect(() => {
    localStorage.setItem('customReels', JSON.stringify(customReels));
  }, [customReels]);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const handleVideoSelect = async (video) => {
    setCurrentVideo(video);
    setLoading(true);
    setError('');
    setStreamUrl('');

    try {
      const proxyUrl = `${API_BASE_URL}/api/stream?url=${encodeURIComponent(video.url)}`;
      setStreamUrl(proxyUrl);
    } catch (err) {
      setError('Impossible de charger la vidéo.');
      console.error(err);
    }
  };

  const toggleFavorite = (e, videoId) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(videoId) 
        ? prev.filter(id => id !== videoId) 
        : [...prev, videoId]
    );
  };

  const isFavorite = (videoId) => favorites.includes(videoId);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formFields.title || !formFields.url) {
      setFormError('Le titre et l\'URL sont requis.');
      return;
    }

    if (!formFields.url.includes('instagram.com/')) {
      setFormError('L\'URL doit être un lien Instagram valide.');
      return;
    }

    if (editingId) {
      // Update existing reel
      setCustomReels(prev => prev.map(reel => 
        reel.id === editingId 
          ? { ...reel, title: formFields.title, url: formFields.url, thumbnail: formFields.thumbnail || reel.thumbnail }
          : reel
      ));
      // Update current video if it was the one edited
      if (currentVideo?.id === editingId) {
        setCurrentVideo(prev => ({ ...prev, title: formFields.title, url: formFields.url, thumbnail: formFields.thumbnail || prev.thumbnail }));
      }
      setEditingId(null);
    } else {
      // Add new reel
      const newReel = {
        id: `custom-${Date.now()}`,
        title: formFields.title,
        url: formFields.url,
        thumbnail: formFields.thumbnail || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&q=80',
        isCustom: true
      };
      setCustomReels(prev => [newReel, ...prev]);
    }

    setFormFields({ title: '', url: '', thumbnail: '' });
    setActiveTab('my-reels');
  };

  const startEdit = (e, video) => {
    e.stopPropagation();
    setEditingId(video.id);
    setFormFields({ title: video.title, url: video.url, thumbnail: video.thumbnail });
    setActiveTab('add');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormFields({ title: '', url: '', thumbnail: '' });
    setActiveTab('my-reels');
  };

  const deleteCustomReel = (e, videoId) => {
    e.stopPropagation();
    setCustomReels(prev => prev.filter(v => v.id !== videoId));
    if (currentVideo?.id === videoId) setCurrentVideo(null);
  };

  const onPlayerLoaded = () => setLoading(false);
  const onPlayerError = () => {
    setLoading(false);
    setError('Erreur de lecture. Le lien est peut-être expiré.');
  };

  const getFilteredPlaylists = () => {
    switch (activeTab) {
      case 'favorites':
        const allReels = [...initialPlaylists, ...customReels];
        return allReels.filter(v => favorites.includes(v.id));
      case 'my-reels':
        return customReels;
      case 'library':
      default:
        return initialPlaylists;
    }
  };

  const displayList = getFilteredPlaylists();

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="p-4 md:p-6 border-b border-gray-800 flex justify-between items-center bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-600 rounded-xl shadow-lg shadow-red-600/10">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tighter">
            OPEN<span className="text-red-600">REELS</span>
          </h1>
        </div>
        <div className="hidden md:block text-xs font-medium text-gray-500 bg-gray-900/50 px-3 py-1.5 rounded-full border border-gray-800">
          PROXIED INSTAGRAM PLAYER
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row gap-0 md:gap-8 p-0 md:p-8 overflow-hidden h-[calc(100vh-140px)]">
        {/* Playlists Sidebar */}
        <div className="w-full md:w-[380px] flex flex-col bg-[#141414] md:rounded-3xl border-b md:border border-gray-800 overflow-hidden shadow-2xl">
          {/* Tabs Navigation */}
          <div className="flex border-b border-gray-800 p-2 gap-1 bg-black/20">
            {[
              { id: 'library', icon: Library, label: 'Library' },
              { id: 'favorites', icon: Heart, label: 'Favs' },
              { id: 'my-reels', icon: User, label: 'Mine' },
              { id: 'add', icon: editingId ? Edit3 : Plus, label: editingId ? 'Edit' : 'Add' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'add') setEditingId(null);
                }}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-white/10 text-white shadow-inner' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <tab.icon className={`w-5 h-5 mb-1 ${activeTab === tab.id ? 'text-red-600' : ''}`} />
                <span className="text-[10px] uppercase font-bold tracking-wider">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {activeTab === 'add' ? (
              <div className="space-y-6 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold mb-1">{editingId ? 'Edit Reel' : 'Add New Reel'}</h3>
                    <p className="text-xs text-gray-500">
                      {editingId ? 'Update your reel details below.' : 'Paste an Instagram link to add it to your collection.'}
                    </p>
                  </div>
                  {editingId && (
                    <button 
                      onClick={cancelEdit}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Title</label>
                    <input 
                      type="text" 
                      placeholder="My favorite reel..."
                      className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                      value={formFields.title}
                      onChange={(e) => setFormFields({...formFields, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Instagram URL</label>
                    <input 
                      type="text" 
                      placeholder="https://www.instagram.com/reel/..."
                      className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                      value={formFields.url}
                      onChange={(e) => setFormFields({...formFields, url: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Thumbnail URL (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                      value={formFields.thumbnail}
                      onChange={(e) => setFormFields({...formFields, thumbnail: e.target.value})}
                    />
                  </div>
                  
                  {formError && <p className="text-xs text-red-500 pl-1">{formError}</p>}
                  
                  <div className="flex gap-3 pt-2">
                    {editingId && (
                      <button 
                        type="button"
                        onClick={cancelEdit}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 p-3 rounded-xl font-bold text-sm transition-all"
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="submit"
                      className="flex-[2] bg-white text-black hover:bg-gray-200 p-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform"
                    >
                      {editingId ? 'Save Changes' : 'Add to Collection'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                {displayList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 opacity-40">
                    <Bookmark className="w-12 h-12" />
                    <p className="text-sm">No reels here yet.</p>
                  </div>
                ) : (
                  displayList.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => handleVideoSelect(video)}
                      className={`w-full text-left p-2.5 rounded-2xl transition-all duration-300 flex gap-4 group relative border ${
                        currentVideo?.id === video.id 
                        ? 'bg-white/5 border-white/10 ring-1 ring-white/5' 
                        : 'bg-transparent border-transparent hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="relative w-20 h-28 rounded-xl overflow-hidden flex-shrink-0 bg-gray-900 shadow-lg">
                        <img 
                          src={video.thumbnail} 
                          alt={video.title} 
                          className={`w-full h-full object-cover transition-all duration-500 ${
                            currentVideo?.id === video.id ? 'scale-110 opacity-100' : 'opacity-40 group-hover:opacity-80'
                          }`}
                        />
                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                          currentVideo?.id === video.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          <div className="p-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
                            <Play className="w-4 h-4 text-white fill-white" />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center flex-1 pr-6">
                        <h4 className={`font-semibold text-sm line-clamp-2 transition-colors ${
                          currentVideo?.id === video.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                        }`}>
                          {video.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/10 text-gray-400">
                             REEL
                           </span>
                          {video.isCustom && (
                            <span className="text-[10px] font-bold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 text-red-600">
                              CUSTOM
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Floating Actions */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => toggleFavorite(e, video.id)}
                          className={`p-2 rounded-full transition-all ${
                            isFavorite(video.id) ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-gray-500 hover:text-white bg-black/40 backdrop-blur-md'
                          }`}
                        >
                          <Heart className="w-4 h-4" fill={isFavorite(video.id) ? "currentColor" : "none"} />
                        </button>
                        {video.isCustom && (
                          <>
                            <button 
                              onClick={(e) => startEdit(e, video)}
                              className="p-2 rounded-full text-gray-500 hover:text-blue-400 bg-black/40 backdrop-blur-md transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => deleteCustomReel(e, video.id)}
                              className="p-2 rounded-full text-gray-500 hover:text-red-400 bg-black/40 backdrop-blur-md transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* Player View */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] md:rounded-[2.5rem] relative max-h-full md:max-h-[85vh] max-w-full md:max-w-lg mx-auto md:border border-gray-800/50 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] md:translate-y-[-2vh]">
          {!currentVideo ? (
            <div className="text-gray-500 text-center space-y-6 p-12">
              <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                <div className="absolute inset-0 bg-white/5 rounded-full animate-pulse" />
                <Play className="w-12 h-12 text-white opacity-10" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-300">Ready to watch?</p>
                <p className="text-sm text-gray-600 mt-2">Select a reel from the sidebar to stream it anonymously.</p>
              </div>
            </div>
          ) : (
            <>
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 backdrop-blur-xl">
                  <div className="relative">
                    <div className="absolute -inset-4 bg-white/10 blur-xl opacity-20 animate-pulse rounded-full" />
                    <Loader2 className="w-14 h-14 text-white animate-spin relative" />
                  </div>
                  <div className="mt-8 text-center space-y-2">
                    <p className="text-lg font-bold tracking-tight">ENCRYPTED STREAM</p>
                    <p className="text-xs text-gray-500 italic px-8 max-w-[280px]">
                      Fetching direct video buffer from Instagram servers via yt-dlp...
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30 p-8">
                  <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-[2rem] text-center max-w-xs backdrop-blur-md">
                    <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Info className="w-6 h-6" />
                    </div>
                    <p className="text-red-400 font-medium mb-6 leading-relaxed">{error}</p>
                    <button 
                      onClick={() => handleVideoSelect(currentVideo)}
                      className="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-500/20"
                    >
                      Retry Connection
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
                  className="w-full h-full object-contain transition-all duration-700"
                  onCanPlay={onPlayerLoaded}
                  onError={onPlayerError}
                />
              )}

              <div className="absolute top-6 left-6 right-6 flex justify-between items-center pointer-events-none">
                <div className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 pointer-events-auto">
                    <p className="text-xs font-bold truncate max-w-[200px]">{currentVideo.title}</p>
                </div>
                <div className="flex gap-2 pointer-events-auto">
                    <button 
                      onClick={(e) => toggleFavorite(e, currentVideo.id)}
                      className={`p-3 rounded-full backdrop-blur-xl transition-all border border-white/10 ${
                        isFavorite(currentVideo.id) ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/20' : 'bg-black/40 text-white hover:bg-black/60'
                      }`}
                    >
                      <Heart className="w-5 h-5" fill={isFavorite(currentVideo.id) ? "white" : "none"} />
                    </button>
                    <a 
                    href={currentVideo.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-black/40 hover:bg-black/60 backdrop-blur-xl p-3 rounded-full transition-all border border-white/10 text-white"
                    title="View Original on Instagram"
                    >
                    <ExternalLink className="w-5 h-5" />
                    </a>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Legal Banner */}
      <footer className="p-6 md:px-12 bg-[#0a0a0a] border-t border-gray-900 z-40">
        <div className="flex flex-col md:flex-row items-center gap-6 max-w-7xl mx-auto">
          <div className="p-3 bg-gray-900 rounded-2xl border border-gray-800">
             <Info className="w-5 h-5 text-gray-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
            <p className="text-[10px] md:text-xs text-gray-500 leading-relaxed uppercase tracking-wider">
              <strong className="text-gray-400 block mb-1">FRN / DISCLAIMER</strong>
              Ce lecteur est un outil open source de démonstration. Aucune donnée n'est hébergée. Les flux sont routés directement.
            </p>
            <p className="text-[10px] md:text-xs text-gray-500 leading-relaxed uppercase tracking-wider">
              <strong className="text-gray-400 block mb-1">ENG / DISCLAIMER</strong>
              This player is an open-source demo tool. No data is hosted on our infrastructure. Streams are proxied direct from source.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
