import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, BookOpen, BarChart3, Search, Trash2, Shield,
  ChevronDown, ChevronUp, Edit3, Plus, X, Save, RefreshCw,
  AlertTriangle, GripVertical, Upload, FileText, Image,
  Download, Paperclip, File
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'content', label: 'Content', icon: BookOpen },
  { id: 'media', label: 'Media', icon: Upload },
  { id: 'stats', label: 'Overview', icon: BarChart3 },
];

// ── API helpers ─────────────────────────────────────────
const adminFetch = async (path, token, options = {}) => {
  const res = await fetch(`${API_BASE}/api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed (${res.status})`);
  }
  return res.json();
};

const adminUpload = async (path, token, formData) => {
  const res = await fetch(`${API_BASE}/api/admin${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed (${res.status})`);
  }
  return res.json();
};

// ── Helpers ─────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (type, mimeType) => {
  if (type === 'image') return Image;
  if (mimeType?.includes('pdf')) return FileText;
  return File;
};

// ══════════════════════════════════════════════════════════
// USERS TAB
// ══════════════════════════════════════════════════════════
const UsersTab = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await adminFetch(`/users${params}`, token);
      setUsers(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    const timeout = setTimeout(loadUsers, 300);
    return () => clearTimeout(timeout);
  }, [loadUsers]);

  const handleDelete = async (username) => {
    try {
      await adminFetch(`/users/${username}`, token, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.username !== username));
      setDeleteConfirm(null);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by username or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Joined</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Last Login</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />Loading users...
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {search ? 'No users match your search' : 'No registered users yet'}
                </td></tr>
              ) : users.map((u) => (
                <tr key={u.username} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.username}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_admin ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        <Shield className="w-3 h-3" /> Admin
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">User</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.is_admin ? (
                      <span className="text-xs text-slate-300">Protected</span>
                    ) : deleteConfirm === u.username ? (
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => handleDelete(u.username)} className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600">Confirm</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-200">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(u.username)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Delete user">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && users.length > 0 && (
          <div className="px-4 py-2 bg-slate-50 text-xs text-slate-400 border-t border-slate-100">
            Showing {users.length} user{users.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// CONTENT TAB
// ══════════════════════════════════════════════════════════
const ContentTab = ({ token }) => {
  const [tools, setTools] = useState([]);
  const [expandedTool, setExpandedTool] = useState(null);
  const [modules, setModules] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingModule, setEditingModule] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editingTool, setEditingTool] = useState(null);
  const [toolEditForm, setToolEditForm] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadTools = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch('/tools', token);
      setTools(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadTools(); }, [loadTools]);

  const loadModules = async (toolId) => {
    if (modules[toolId]) return;
    try {
      const data = await adminFetch(`/tools/${toolId}/modules`, token);
      setModules((prev) => ({ ...prev, [toolId]: data }));
    } catch (e) { setError(e.message); }
  };

  const toggleTool = (toolId) => {
    if (expandedTool === toolId) { setExpandedTool(null); }
    else { setExpandedTool(toolId); loadModules(toolId); }
  };

  const startEditModule = (mod) => {
    setEditingModule(mod.id);
    setEditForm({ title: mod.title || '', level: mod.level || 'beginner', minutes: mod.minutes || 10, description: mod.description || '' });
  };

  const saveModule = async (moduleId) => {
    try {
      await adminFetch(`/modules/${moduleId}`, token, { method: 'PUT', body: JSON.stringify(editForm) });
      setModules((prev) => {
        const updated = { ...prev };
        for (const toolId in updated) {
          updated[toolId] = updated[toolId].map((m) => m.id === moduleId ? { ...m, ...editForm } : m);
        }
        return updated;
      });
      setEditingModule(null);
      setSuccess(`Module updated`); setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
  };

  const deleteModule = async (moduleId, toolId) => {
    try {
      await adminFetch(`/modules/${moduleId}`, token, { method: 'DELETE' });
      setModules((prev) => ({ ...prev, [toolId]: prev[toolId].filter((m) => m.id !== moduleId) }));
      setTools((prev) => prev.map((t) => t.id === toolId ? { ...t, module_count: t.module_count - 1 } : t));
      setSuccess(`Module deleted`); setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
  };

  const startEditTool = (tool) => {
    setEditingTool(tool.id);
    setToolEditForm({ name: tool.name || '', tagline: tool.tagline || '', description: tool.description || '' });
  };

  const saveTool = async (toolId) => {
    try {
      await adminFetch(`/tools/${toolId}`, token, { method: 'PUT', body: JSON.stringify(toolEditForm) });
      setTools((prev) => prev.map((t) => (t.id === toolId ? { ...t, ...toolEditForm } : t)));
      setEditingTool(null);
      setSuccess(`Tool updated`); setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
  };

  if (loading) return <div className="text-center py-12 text-slate-400"><RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />Loading content...</div>;

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-2 rounded-lg">{success}</div>}

      {tools.map((tool) => (
        <div key={tool.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => toggleTool(tool.id)} className="flex items-center gap-3 flex-1 text-left">
              {expandedTool === tool.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              <div>
                {editingTool === tool.id ? (
                  <input value={toolEditForm.name} onChange={(e) => setToolEditForm((f) => ({ ...f, name: e.target.value }))} onClick={(e) => e.stopPropagation()} className="font-semibold text-slate-900 border-b border-primary px-1 focus:outline-none" />
                ) : (
                  <span className="font-semibold text-slate-900">{tool.name}</span>
                )}
                <span className="ml-2 text-xs text-slate-400">{tool.module_count} modules · {tool.category_id}</span>
              </div>
            </button>
            <div className="flex items-center gap-1">
              {editingTool === tool.id ? (
                <>
                  <button onClick={() => saveTool(tool.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Save"><Save className="w-4 h-4" /></button>
                  <button onClick={() => setEditingTool(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
                </>
              ) : (
                <button onClick={() => startEditTool(tool)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg" title="Edit tool"><Edit3 className="w-4 h-4" /></button>
              )}
            </div>
          </div>

          {editingTool === tool.id && (
            <div className="px-4 pb-3 space-y-2">
              <input value={toolEditForm.tagline} onChange={(e) => setToolEditForm((f) => ({ ...f, tagline: e.target.value }))} placeholder="Tagline" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30" />
              <textarea value={toolEditForm.description} onChange={(e) => setToolEditForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" rows={2} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30" />
            </div>
          )}

          <AnimatePresence>
            {expandedTool === tool.id && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-slate-100">
                <div className="divide-y divide-slate-50">
                  {(modules[tool.id] || []).map((mod) => (
                    <div key={mod.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50/50 text-sm">
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                      {editingModule === mod.id ? (
                        <div className="flex-1 space-y-2">
                          <input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                          <div className="flex gap-2">
                            <select value={editForm.level} onChange={(e) => setEditForm((f) => ({ ...f, level: e.target.value }))} className="border border-slate-200 rounded-lg px-2 py-1 text-xs">
                              <option value="beginner">Beginner</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="advanced">Advanced</option>
                            </select>
                            <input type="number" value={editForm.minutes} onChange={(e) => setEditForm((f) => ({ ...f, minutes: parseInt(e.target.value) || 0 }))} className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs" placeholder="min" />
                            <button onClick={() => saveModule(mod.id)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded-lg"><Save className="w-4 h-4" /></button>
                            <button onClick={() => setEditingModule(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-lg"><X className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <span className="text-slate-800 font-medium truncate block">{mod.title}</span>
                            <span className="text-xs text-slate-400">{mod.level} · {mod.minutes}min{mod.day ? ` · Day ${mod.day}` : ''}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => startEditModule(mod)} className="p-1 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteModule(mod.id, tool.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {modules[tool.id] && modules[tool.id].length === 0 && (
                    <div className="px-4 py-4 text-center text-sm text-slate-400">No modules in this tool</div>
                  )}
                  {!modules[tool.id] && (
                    <div className="px-4 py-4 text-center text-sm text-slate-400"><RefreshCw className="w-4 h-4 animate-spin inline-block mr-1" />Loading...</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// MEDIA TAB (Upload & Manage Documents/Images)
// ══════════════════════════════════════════════════════════
const MediaTab = ({ token }) => {
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fileInputRef = useRef(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = filterType ? `?type=${filterType}` : '';
      const data = await adminFetch(`/media${params}`, token);
      setAssets(data.assets || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, filterType]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    let uploaded = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const asset = await adminUpload('/media/upload', token, formData);
        setAssets((prev) => [asset, ...prev]);
        setTotal((prev) => prev + 1);
        uploaded++;
      } catch (e) {
        setError(e.message);
      }
    }

    setUploading(false);
    if (uploaded > 0) {
      setSuccess(`${uploaded} file${uploaded > 1 ? 's' : ''} uploaded successfully`);
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDelete = async (assetId) => {
    try {
      await adminFetch(`/media/${assetId}`, token, { method: 'DELETE' });
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      setTotal((prev) => prev - 1);
      setDeleteConfirm(null);
      setSuccess('File deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDownload = (assetId, filename) => {
    const url = `${API_BASE}/api/admin/media/${assetId}/download`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    // We need the auth header, so use fetch instead
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.click();
        URL.revokeObjectURL(blobUrl);
      });
  };

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${dragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
          }
          ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.svg,.xlsx,.pptx"
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-slate-400" />
          )}
          <div>
            <p className="text-sm font-medium text-slate-700">
              {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              PDF, DOCX, PNG, JPG, WEBP, SVG, XLSX, PPTX — Max 16 MB each
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-2 rounded-lg">{success}</div>}

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">Filter:</span>
        {['', 'document', 'image'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
              ${filterType === type
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
          >
            {type === '' ? 'All' : type === 'document' ? 'Documents' : 'Images'}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{total} file{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Asset grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />Loading files...
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">{filterType ? `No ${filterType} files yet` : 'No files uploaded yet'}</p>
          <p className="text-xs mt-1">Upload your first file using the area above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {assets.map((asset) => {
            const IconComponent = getFileIcon(asset.type, asset.mime_type);
            const isImage = asset.type === 'image';

            return (
              <div key={asset.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow">
                {/* Preview area */}
                <div className="h-32 bg-slate-50 flex items-center justify-center relative">
                  {isImage ? (
                    <img
                      src={`${API_BASE}/api/content/media/${asset.id}`}
                      alt={asset.alt_text || asset.original_filename}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <IconComponent className="w-10 h-10 text-slate-300" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {asset.file_extension}
                      </span>
                    </div>
                  )}
                  {/* Type badge */}
                  <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded
                    ${asset.type === 'image' ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'}`}>
                    {asset.type === 'image' ? 'IMG' : 'DOC'}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-slate-800 truncate" title={asset.original_filename}>
                    {asset.original_filename}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">{formatBytes(asset.file_size_bytes)}</span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">
                      {asset.uploaded_at ? new Date(asset.uploaded_at).toLocaleDateString() : '—'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleDownload(asset.id, asset.original_filename)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <div className="ml-auto">
                      {deleteConfirm === asset.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(asset.id)} className="text-[11px] bg-red-500 text-white px-2 py-0.5 rounded-lg hover:bg-red-600">Delete</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg hover:bg-slate-200">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(asset.id)} className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// STATS TAB
// ══════════════════════════════════════════════════════════
const StatsTab = ({ token }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await adminFetch('/stats', token);
        setStats(data);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) return <div className="text-center py-12 text-slate-400"><RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />Loading stats...</div>;
  if (!stats) return null;

  const cards = [
    { label: 'Registered Users', value: stats.users, color: 'bg-blue-500', icon: Users },
    { label: 'Courses (Legacy)', value: stats.tools, color: 'bg-violet-500', icon: BookOpen },
    { label: 'LMS Courses', value: stats.courses || 0, color: 'bg-indigo-500', icon: BookOpen },
    { label: 'LMS Lessons', value: stats.lessons || 0, color: 'bg-emerald-500', icon: BarChart3 },
    { label: 'Media Assets', value: stats.media_assets || 0, color: 'bg-amber-500', icon: Upload },
    { label: 'Enrollments', value: stats.enrollments, color: 'bg-rose-500', icon: Shield },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col items-center text-center">
          <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center mb-3`}>
            <card.icon className="w-5 h-5 text-white" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{card.value}</div>
          <div className="text-xs text-slate-500 mt-1">{card.label}</div>
        </div>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// MAIN ADMIN PANEL
// ══════════════════════════════════════════════════════════
export const AdminPanel = () => {
  const { user, token, isAuthenticated, isLoaded } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    if (isLoaded && (!isAuthenticated || !user?.isAdmin)) {
      navigate('/', { replace: true });
    }
  }, [isLoaded, isAuthenticated, user, navigate]);

  if (!isLoaded || !user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Admin Panel</h1>
            <p className="text-sm text-slate-500">Manage users, content, and media</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-6 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap
                  ${isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'users' && <UsersTab token={token} />}
        {activeTab === 'content' && <ContentTab token={token} />}
        {activeTab === 'media' && <MediaTab token={token} />}
        {activeTab === 'stats' && <StatsTab token={token} />}
      </div>
    </div>
  );
};

export default AdminPanel;
