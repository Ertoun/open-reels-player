import React, { useState, useEffect } from 'react';
import { Lock, LogIn, Plus, Trash2, Edit3, Save, X, LogOut, Video, LayoutList, LayoutGrid, Play, Eye, EyeOff, Search, Check, Inbox } from 'lucide-react';

const Admin = ({ apiBaseUrl, onBack }) => {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [pendingVideos, setPendingVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingVideo, setEditingVideo] = useState(null); // null = list mode, {} = add mode, {id...} = edit mode
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'submissions'

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlaylists();
      fetchSubmissions();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        localStorage.setItem('adminToken', data.token);
        setIsAuthenticated(true);
      } else {
        setError('Mot de passe incorrect');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setPlaylists([]);
    setPendingVideos([]);
  };

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/playlists`);
      const data = await res.json();
      setPlaylists(data);
    } catch (err) {
      setError('Impossible de charger les playlists');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingVideos(data);
      }
    } catch (err) {
      console.error("Failed to fetch submissions");
    }
  };

  const savePlaylist = async (newPlaylists) => {
      try {
          const res = await fetch(`${apiBaseUrl}/api/playlists`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(newPlaylists)
          });
          if (!res.ok) throw new Error('Failed to save');
          setPlaylists(newPlaylists);
          setEditingVideo(null);
      } catch (err) {
          setError('Erreur lors de la sauvegarde');
      }
  };

  const handleDelete = async (id) => {
      if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?')) return;
      const updated = playlists.filter(v => v.id !== id);
      await savePlaylist(updated);
  };

  const handleSaveVideo = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const videoData = {
          title: formData.get('title'),
          url: formData.get('url'),
          tags: formData.get('tags'),
      };

      let updatedPlaylists;
      if (editingVideo.id) {
          // Edit
          updatedPlaylists = playlists.map(p => p.id === editingVideo.id ? { ...p, ...videoData } : p);
      } else {
          // Add
          updatedPlaylists = [...playlists, { id: Date.now().toString(), ...videoData }];
      }
      await savePlaylist(updatedPlaylists);
  };

  const handleApprove = async (id) => {
    try {
        const res = await fetch(`${apiBaseUrl}/api/submissions/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id })
        });
        if (res.ok) {
            setPendingVideos(prev => prev.filter(v => v.id !== id));
            fetchPlaylists(); // Refresh library
        } else {
             alert('Approval failed');
        }
    } catch (err) {
        alert('Approval failed');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject and delete this submission?')) return;
     try {
        const res = await fetch(`${apiBaseUrl}/api/submissions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            setPendingVideos(prev => prev.filter(v => v.id !== id));
        } else {
             alert('Rejection failed');
        }
    } catch (err) {
        alert('Rejection failed');
    }
  };

  const filteredPlaylists = playlists.filter(video => {
    const q = searchQuery.toLowerCase();
    return video.title.toLowerCase().includes(q) || 
           (video.tags && video.tags.toLowerCase().includes(q));
  });


  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <div className="w-full max-w-md bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-red-500/10 rounded-full text-red-500">
              <Lock className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-6 text-white">Admin Access</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 pr-10 text-white focus:outline-none focus:border-red-500 transition-colors"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Checking...' : <><LogIn className="w-4 h-4" /> Login</>}
            </button>
          </form>
           <button onClick={onBack} className="w-full mt-4 text-gray-500 hover:text-white text-sm">Back to Player</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-lg"><Video className="w-5 h-5"/></div>
                Admin Dashboard
            </h2>
            <div className="flex gap-4 mt-2">
                <button 
                    onClick={() => setActiveTab('library')}
                    className={`text-sm font-bold pb-1 border-b-2 transition-colors ${activeTab === 'library' ? 'text-white border-red-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                >
                    Library
                </button>
                <button 
                    onClick={() => setActiveTab('submissions')}
                    className={`text-sm font-bold pb-1 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'submissions' ? 'text-white border-red-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                >
                    Submissions
                    {pendingVideos.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingVideos.length}</span>
                    )}
                </button>
            </div>
        </div>
        <div className="flex items-center gap-3">
             {activeTab === 'library' && (
                 <div className="bg-[#1a1a1a] p-1 rounded-lg border border-gray-800 flex gap-1 mr-2">
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                      title="List View"
                    >
                      <LayoutList className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                       title="Grid View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                 </div>
             )}
             <button onClick={onBack} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-sm font-bold transition-colors">
                Back to Site
             </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-bold transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
        </div>
      </div>

      {activeTab === 'submissions' ? (
          <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-gray-400" />
                  Pending Submissions
              </h3>
              {pendingVideos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 border border-gray-800 rounded-xl bg-[#1a1a1a]">
                      No pending submissions.
                  </div>
              ) : (
                  <div className="grid gap-3 grid-cols-1">
                      {pendingVideos.map(video => (
                          <div key={video.id} className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 flex justify-between items-center group hover:border-gray-700 transition-all">
                              <div className="flex-1 min-w-0 pr-4">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-white truncate">{video.title}</h4>
                                    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Pending</span>
                                  </div>
                                  <p className="text-xs text-blue-400 truncate mt-0.5">{video.url}</p>
                                  <div className="flex gap-2 mt-2">
                                      {video.tags?.split(',').map(tag => (
                                          <span key={tag} className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400">{tag.trim()}</span>
                                      ))}
                                  </div>
                                  <p className="text-[10px] text-gray-600 mt-2">Submitted: {new Date(video.submittedAt).toLocaleString()}</p>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => handleApprove(video.id)} className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded-lg transition-colors flex items-center gap-1" title="Approve">
                                      <Check className="w-4 h-4"/> <span className="text-xs font-bold hidden md:inline">Approve</span>
                                  </button>
                                  <button onClick={() => handleReject(video.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition-colors" title="Reject">
                                      <Trash2 className="w-4 h-4"/>
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      ) : (
        /* Library View */
        <>
            {editingVideo ? (
                <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                        <h3 className="text-xl font-bold">{editingVideo.id ? 'Edit Video' : 'Add New Video'}</h3>
                        <button onClick={() => setEditingVideo(null)} className="text-gray-500 hover:text-white"><X className="w-6 h-6"/></button>
                    </div>
                    <form onSubmit={handleSaveVideo} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Title</label>
                            <input name="title" defaultValue={editingVideo.title} required className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-red-500 outline-none" placeholder="Video Title" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">URL</label>
                            <input name="url" defaultValue={editingVideo.url} required className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-red-500 outline-none" placeholder="https://..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tags (comma separated)</label>
                            <input name="tags" defaultValue={editingVideo.tags} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-red-500 outline-none" placeholder="sport, funny..." />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={() => setEditingVideo(null)} className="flex-1 py-3 rounded-xl bg-gray-800 font-bold text-gray-300 hover:bg-gray-700">Cancel</button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-200 shadow-lg flex justify-center items-center gap-2">
                                <Save className="w-4 h-4"/> Save
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input 
                        type="text" 
                        placeholder="Search video by title or tag..." 
                        className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-500/50 transition-all font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setEditingVideo({})}
                        className="py-3 px-6 bg-white text-black rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 font-bold shadow-lg"
                    >
                        <Plus className="w-5 h-5" /> Add Video
                    </button>
                    </div>

                    <div className="text-sm text-gray-400">
                    Showing <span className="text-white font-bold">{filteredPlaylists.length}</span> results (Total: <span className="text-white font-bold">{playlists.length}</span>)
                    </div>

                    {viewMode === 'list' ? (
                    <div className="grid gap-3 grid-cols-1">
                        {filteredPlaylists.map(video => (
                            <div key={video.id} className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 flex justify-between items-center group hover:border-gray-700 transition-all">
                                <div className="flex-1 min-w-0 pr-4">
                                    <h4 className="font-bold text-white truncate">{video.title}</h4>
                                    <p className="text-xs text-blue-400 truncate mt-0.5">{video.url}</p>
                                    <div className="flex gap-2 mt-2">
                                        {video.tags?.split(',').map(tag => (
                                            <span key={tag} className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400">{tag.trim()}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingVideo(video)} className="p-2 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 rounded-lg transition-colors" title="Edit"><Edit3 className="w-4 h-4"/></button>
                                    <button onClick={() => handleDelete(video.id)} className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {filteredPlaylists.map(video => (
                            <div key={video.id} className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden group hover:border-gray-600 transition-all flex flex-col">
                                {/* Mock Thumbnail / Player Area */}
                                <div 
                                    className="aspect-video bg-black/50 relative flex items-center justify-center group-hover:bg-black/40 transition-colors cursor-pointer"
                                    onClick={() => setEditingVideo(video)}
                                >
                                    <div className="p-3 bg-white/5 rounded-full border border-white/5 group-hover:scale-110 transition-transform group-hover:bg-white/10 group-hover:border-white/20">
                                        <Edit3 className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                        <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(video.id); }} 
                                        className="p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-lg backdrop-blur-md transition-colors"
                                        title="Delete"
                                        >
                                        <Trash2 className="w-3 h-3"/>
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3 flex-1 flex flex-col">
                                    <h4 className="font-bold text-sm text-white line-clamp-1 mb-1" title={video.title}>{video.title}</h4>
                                    <p className="text-[10px] text-blue-400 truncate mb-2">{video.url}</p>
                                    <div className="mt-auto flex flex-wrap gap-1">
                                        {video.tags?.split(',').slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-gray-500 border border-white/5">{tag.trim()}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    )}

                    {filteredPlaylists.length === 0 && !loading && (
                        <div className="text-center py-12 text-gray-500">
                        {searchQuery ? 'No videos match your search.' : 'No videos in the library.'}
                        </div>
                    )}
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default Admin;
