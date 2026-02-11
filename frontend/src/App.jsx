import React, { useState, useEffect, useRef } from 'react';
import { Play, ExternalLink, Loader2, Info, Plus, Library, User, Heart, Bookmark, Trash2, Edit3, X, Download, Lock } from 'lucide-react';
import Admin from './Admin';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:10000'
  : 'https://open-reels-player.onrender.com';

function App() {
  const [isAdminMode, setIsAdminMode] = useState(window.location.pathname === '/admin' || window.location.search.includes('admin=true'));
  const [initialPlaylists, setInitialPlaylists] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for tabs
  const [activeTab, setActiveTab] = useState('library'); // 'library', 'favorites', 'personal', 'add'
  const [searchQuery, setSearchQuery] = useState('');
  const [showPlayer, setShowPlayer] = useState(true);
  const videoRef = useRef(null);
  
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
  const [formFields, setFormFields] = useState({ title: '', url: '', tags: '' });
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showFooter, setShowFooter] = useState(false);

  // Fetch initial playlists from backend
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/playlists`)
      .then(res => res.json())
      .then(data => setInitialPlaylists(data))
      .catch(err => console.error("Failed to fetch playlists:", err));
  }, []);

  // Persist data
  useEffect(() => {
    localStorage.setItem('customReels', JSON.stringify(customReels));
  }, [customReels]);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const handleVideoSelect = async (video) => {
    if (currentVideo?.id === video.id) {
      if (videoRef.current) {
        if (videoRef.current.paused) videoRef.current.play();
        else videoRef.current.pause();
      }
      setShowPlayer(true); // Ensure player is shown
      return;
    }

    setCurrentVideo(video);
    setLoading(true);
    setError('');
    setStreamUrl('');

    try {
      const proxyUrl = `${API_BASE_URL}/api/stream?url=${encodeURIComponent(video.url)}`;
      setStreamUrl(proxyUrl);
      setShowPlayer(true); // Always show player when a new video is selected
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

    if (!formFields.url.startsWith('http')) {
      setFormError('L\'URL doit être un lien valide (http/https).');
      return;
    }

    if (editingId) {
      // Update existing reel
      setCustomReels(prev => prev.map(reel => 
        reel.id === editingId 
          ? { ...reel, title: formFields.title, url: formFields.url, tags: formFields.tags }
          : reel
      ));
      // Update current video if it was the one edited
      if (currentVideo?.id === editingId) {
        setCurrentVideo(prev => ({ ...prev, title: formFields.title, url: formFields.url, tags: formFields.tags }));
      }
      setEditingId(null);
    } else {
      // Add new reel
      const newReel = {
        id: `custom-${Date.now()}`,
        title: formFields.title,
        url: formFields.url,
        tags: formFields.tags,
        isCustom: true
      };
      setCustomReels(prev => [newReel, ...prev]);
    }

    setFormFields({ title: '', url: '', tags: '' });
    setActiveTab('personal');
  };

  const startEdit = (e, video) => {
    e.stopPropagation();
    setEditingId(video.id);
    setFormFields({ title: video.title, url: video.url, tags: video.tags || '' });
    setActiveTab('add');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormFields({ title: '', url: '', tags: '' });
    setActiveTab('personal');
  };

  const deleteCustomReel = (e, videoId) => {
    e.stopPropagation();
    setCustomReels(prev => prev.filter(v => v.id !== videoId));
    if (currentVideo?.id === videoId) setCurrentVideo(null);
  };

  const exportPlaylist = (type) => {
    let data = [];
    let filename = 'playlist.json';
    
    if (type === 'favorites') {
      const allReels = [...initialPlaylists, ...customReels];
      data = allReels.filter(v => favorites.includes(v.id));
      filename = 'favorites.json';
    } else if (type === 'personal') {
      data = customReels;
      filename = 'personal.json';
    }
    
    if (data.length === 0) return;
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      case 'personal':
        return customReels;
      case 'library':
      default:
        return initialPlaylists;
    }
  };

  const getFilteredAndSearchedList = () => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      
      const personalMatches = customReels.filter(v => 
        v.title.toLowerCase().includes(q) || 
        (v.tags && v.tags.toLowerCase().includes(q)) ||
        (q === 'youtube' && (v.url.includes('youtube.com') || v.url.includes('youtu.be')))
      );

      const libraryMatches = initialPlaylists.filter(v => {
        if (personalMatches.some(p => p.url === v.url)) return false;
        
        return v.title.toLowerCase().includes(q) || 
          (v.tags && v.tags.toLowerCase().includes(q)) ||
          (q === 'youtube' && (v.url.includes('youtube.com') || v.url.includes('youtu.be')))
      });

      return { personal: personalMatches, library: libraryMatches, isSearch: true };
    }
    return { data: getFilteredPlaylists(), isSearch: false };
  };

  const displayList = getFilteredAndSearchedList();

  const renderVideoItem = (video) => (
    <button
      key={video.id}
      onClick={() => handleVideoSelect(video)}
      className={`w-full text-left p-2 rounded-xl transition-all duration-300 flex gap-3 group relative border ${
        currentVideo?.id === video.id 
        ? 'bg-white/5 border-white/10 ring-1 ring-white/5' 
        : 'bg-transparent border-transparent hover:bg-white/[0.03]'
      }`}
    >
      <div className="flex flex-col flex-1 pr-14 min-w-0">
        <h4 className={`font-bold text-[13px] line-clamp-1 transition-colors leading-tight mb-1.5 ${
          currentVideo?.id === video.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
        }`}>
          {video.title}
        </h4>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[9px] font-black bg-white/5 px-1.5 py-0.5 rounded-md border border-white/10 text-gray-500 uppercase tracking-tighter">
            {video.url.includes('youtube.com') || video.url.includes('youtu.be') ? 'YOUTUBE' : 'CLIP'}
          </span>
          {video.isCustom && (
            <span className="text-[9px] font-black bg-red-500/10 px-1.5 py-0.5 rounded-md border border-red-500/20 text-red-600 uppercase tracking-tighter">
              CUSTOM
            </span>
          )}
          {(video.tags || "").split(',')
            .map(t => t.trim())
            .filter(Boolean)
            .slice(0, 5)
            .map(tag => (
              <span key={tag} className="text-[9px] font-semibold bg-white/10 px-1.5 py-0.5 rounded-md border border-white/5 text-gray-400 truncate max-w-[70px]">
                {tag}
              </span>
            ))
          }
        </div>
      </div>

      <div className="absolute top-2 right-3 flex flex-row gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button 
          onClick={(e) => toggleFavorite(e, video.id)}
          className={`p-1.5 rounded-full transition-all shadow-sm ${
            isFavorite(video.id) ? 'text-red-500 bg-white/10 border border-white/10' : 'text-gray-500 hover:text-white bg-black/40 backdrop-blur-md border border-white/5'
          }`}
        >
          <Heart className="w-3.5 h-3.5" fill={isFavorite(video.id) ? "currentColor" : "none"} />
        </button>
        {video.isCustom && (
          <>
            <button 
              onClick={(e) => startEdit(e, video)}
              className="p-1.5 rounded-full text-gray-500 hover:text-blue-400 bg-black/40 backdrop-blur-md border border-white/5 transition-all shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => deleteCustomReel(e, video.id)}
              className="p-1.5 rounded-full text-gray-500 hover:text-red-400 bg-black/40 backdrop-blur-md border border-white/5 transition-all shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </button>
  );

  if (isAdminMode) {
    return <Admin apiBaseUrl={API_BASE_URL} onBack={() => setIsAdminMode(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="p-3 md:p-6 border-b border-gray-800 flex justify-between items-center bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2.5 bg-red-600 rounded-lg md:rounded-xl shadow-lg shadow-red-600/10">
            <Play className="w-4 h-4 md:w-5 md:h-5 text-white fill-white" />
          </div>
          <h1 className="text-lg md:text-2xl font-black text-white tracking-tighter">
            OPEN<span className="text-red-600">REELS</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
              onClick={() => setIsAdminMode(true)}
              className="p-2 md:p-2.5 rounded-xl text-gray-500 hover:text-white transition-all hover:bg-white/10"
              title="Admin Login"
            >
            <Lock className="w-4.5 h-4.5 md:w-5 md:h-5" />
          </button>
          {currentVideo && (
            <button 
              onClick={() => {
                if (showPlayer && videoRef.current) videoRef.current.pause();
                setShowPlayer(!showPlayer);
              }}
              className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2.5 rounded-lg md:rounded-xl transition-all border ${showPlayer ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-white/10 border-white/10 text-white'}`}
              title={showPlayer ? "Hide Player" : "Show Player"}
            >
              <Play className={`w-4 h-4 md:w-5 md:h-5 ${showPlayer ? 'opacity-50' : ''}`} />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Toggle</span>
            </button>
          )}
          <button 
            onClick={() => setShowFooter(!showFooter)}
            className={`p-2 md:p-2.5 rounded-xl transition-all ${showFooter ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
            title="Toggle Information"
          >
            <Info className="w-4.5 h-4.5 md:w-5 md:h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row gap-0 md:gap-8 p-0 md:p-8 md:overflow-hidden min-h-screen md:min-h-[calc(100dvh-140px)]">
        {/* Player View */}
        <div className={`flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] md:rounded-[2.5rem] relative max-h-full md:max-h-[85vh] w-[min(92vw,450px)] md:w-full mx-auto my-8 md:my-0 md:border border-gray-800/50 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2rem] transition-all duration-500 ${!showPlayer ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
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
                      Please wait... Fetching direct video buffer from source via yt-dlp...
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

              {streamUrl && showPlayer && (
                <video
                  ref={videoRef}
                  key={streamUrl}
                  src={streamUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain transition-all duration-700 cursor-pointer"
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
          {!showPlayer && currentVideo && (
            <button 
              onClick={() => setShowPlayer(true)}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-bold shadow-2xl active:scale-95 transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Show Player
            </button>
          )}
        </div>
        {/* --- PLAYLISTS SIDEBAR CONTAINER --- */}
        <div className="w-full md:w-[380px] h-auto flex flex-col bg-[#141414] md:rounded-3xl border-b md:border border-gray-800 overflow-hidden md:max-h-[85vh] shadow-2xl">
          
          {/* SEARCH SECTION */}
          <div className="p-3 border-b border-gray-800 bg-black/10 space-y-3">
            <div className="relative group">
              <Info className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search by title or theme..." 
                className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl py-2 pl-9 pr-10 text-xs focus:outline-none focus:border-red-500/50 transition-all font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Tag Cloud */}
            <div className="flex flex-wrap gap-1.5 px-0.5">
              {['volley', 'exo', 'cat', 'autre'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                    searchQuery === tag 
                      ? 'bg-red-500/10 border-red-500/50 text-red-500' 
                      : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          
          {/* TABS NAVIGATION (Library, Favorites, Personal, Add) */}
          <div className="flex border-b border-gray-800 p-1 gap-1 bg-black/20">
            {[
              { id: 'library', icon: Library, label: 'Library' },
              { id: 'favorites', icon: Heart, label: 'Favorites' },
              { id: 'personal', icon: User, label: 'Personal' },
              { id: 'add', icon: editingId ? Edit3 : Plus, label: editingId ? 'Edit' : 'Add' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'add') setEditingId(null);
                }}
                className={`flex-1 flex flex-col items-center justify-center md:py-2.5 rounded-lg md:rounded-xl transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-white/10 text-white shadow-inner' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <tab.icon className={`w-4 h-4 md:w-5 md:h-5 mb-0.5 md:mb-1 ${activeTab === tab.id ? 'text-red-600' : ''}`} />
                <span className="text-[8px] md:text-[10px] uppercase font-bold tracking-tight md:tracking-wider">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* MAIN CONTENT AREA (Form or Video List) */}
          <div className="flex-1 max-h-[60vh] md:max-h-[71vh] overflow-y-auto p-4 space-y-3 custom-scrollbar">
            
            {/* ADD / EDIT VIDEO FORM SECTION */}
            {activeTab === 'add' ? (
              <div className="space-y-6 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold mb-1">{editingId ? 'Edit Video' : 'Add New Video'}</h3>
                    <p className="text-xs text-gray-500">
                      {editingId ? 'Update your video details below.' : 'Paste a YouTube or Instagram link to add it to your collection.'}
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
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Video URL (YT, IG, etc.)</label>
                    <input 
                      type="text" 
                      placeholder="https://www.youtube.com/watch?v=... ou Instagram"
                      className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                      value={formFields.url}
                      onChange={(e) => setFormFields({...formFields, url: e.target.value})}
                    />
                    <p className="text-[10px] text-gray-600 px-1">
                      Supports: YouTube, Instagram, Twitter/X, Facebook, and more via yt-dlp.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Themes / Chips (e.g. funny, sports)</label>
                    <input 
                      type="text" 
                      placeholder="funny, nature, volleyball..."
                      className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                      value={formFields.tags}
                      onChange={(e) => setFormFields({...formFields, tags: e.target.value})}
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
              /* PLAYLIST CONTENT SECTION (Library, Favorites, OR Personal) */
              <div className="space-y-4">
                
                {/* TAB HEADER (Export Button & Item Count) */}
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">
                      {displayList.isSearch 
                        ? 'Search Results' 
                        : (activeTab === 'favorites' ? 'Favorites' : activeTab === 'personal' ? 'Personal' : 'Library')}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-medium">
                      {displayList.isSearch 
                        ? (displayList.personal.length + displayList.library.length)
                        : displayList.data.length} items
                    </p>
                  </div>
                  {!displayList.isSearch && displayList.data.length > 0 && (activeTab === 'favorites' || activeTab === 'personal') && (
                    <button 
                      onClick={() => exportPlaylist(activeTab)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black text-gray-400 hover:text-white transition-all border border-white/10 shadow-sm"
                      title="Download as JSON"
                    >
                      <Download className="w-3 h-3" />
                      EXPORT JSON
                    </button>
                  )}
                </div>

                {/* VIDEO LIST RENDERING */}
                {displayList.isSearch ? (
                  <>
                    {displayList.personal.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-[10px] font-black text-blue-500/50 uppercase tracking-widest px-2 pt-2">Personal Results</div>
                        {displayList.personal.map(video => renderVideoItem(video))}
                      </div>
                    )}
                    {displayList.library.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 pt-2">Library Results</div>
                        {displayList.library.map(video => renderVideoItem(video))}
                      </div>
                    )}
                    {displayList.personal.length === 0 && displayList.library.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-12 opacity-30">
                        <Bookmark className="w-12 h-12 mb-4" />
                        <p className="text-sm">No matches found.</p>
                      </div>
                    )}
                  </>
                ) : (
                  displayList.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 opacity-40">
                      <Bookmark className="w-12 h-12" />
                      <p className="text-sm">No reels here yet.</p>
                    </div>
                  ) : (
                    displayList.data.map((video) => renderVideoItem(video))
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Legal Banner */}
      <footer className={`p-6 md:px-12 bg-[#0a0a0a] border-t border-gray-900 z-40 ${!showFooter ? 'hidden md:block' : 'block'}`}>
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
