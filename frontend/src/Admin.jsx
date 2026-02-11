import React, { useState, useEffect } from 'react';
import { Lock, LogIn, Plus, Trash2, Edit3, Save, X, LogOut, Video } from 'lucide-react';

const Admin = ({ apiBaseUrl, onBack }) => {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [password, setPassword] = useState('');
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingVideo, setEditingVideo] = useState(null); // null = list mode, {} = add mode, {id...} = edit mode

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlaylists();
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
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                autoFocus
              />
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
    <div className="p-6 max-w-6xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-lg"><Video className="w-5 h-5"/></div>
                Library Management
            </h2>
            <p className="text-gray-500 text-sm mt-1">Manage global playlist items available to all users.</p>
        </div>
        <div className="flex gap-3">
             <button onClick={onBack} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-sm font-bold transition-colors">
                Back to Site
             </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-bold transition-all"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
        </div>
      </div>

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
                           <Save className="w-4 h-4"/> Save Internal Video
                       </button>
                   </div>
               </form>
          </div>
      ) : (
        <div className="space-y-4">
             <button
                onClick={() => setEditingVideo({})}
                className="w-full py-4 border-2 border-dashed border-gray-800 rounded-2xl text-gray-500 hover:text-white hover:border-gray-600 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-bold"
            >
                <Plus className="w-5 h-5" /> Add New Library Video
            </button>

            <div className="grid gap-3">
                {playlists.map(video => (
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
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingVideo(video)} className="p-2 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 rounded-lg transition-colors"><Edit3 className="w-4 h-4"/></button>
                            <button onClick={() => handleDelete(video.id)} className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    </div>
                ))}
            </div>
             {playlists.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">No videos in the library.</div>
            )}
        </div>
      )}
    </div>
  );
};

export default Admin;
