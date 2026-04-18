import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, BookOpen, BarChart3, Search, Trash2, Shield,
  ChevronDown, ChevronUp, Edit3, Plus, X, Save, RefreshCw,
  AlertTriangle, GripVertical
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'content', label: 'Content', icon: BookOpen },
  { id: 'stats', label: 'Overview', icon: BarChart3 },
];

// ── API helper ──────────────────────────────────────────
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
      {/* Search bar */}
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

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
      )}

      {/* Users table */}
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
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {search ? 'No users match your search' : 'No registered users yet'}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
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
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.is_admin ? (
                        <span className="text-xs text-slate-300">Protected</span>
                      ) : deleteConfirm === u.username ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleDelete(u.username)}
                            className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(u.username)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
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

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const loadModules = async (toolId) => {
    if (modules[toolId]) return;
    try {
      const data = await adminFetch(`/tools/${toolId}/modules`, token);
      setModules((prev) => ({ ...prev, [toolId]: data }));
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleTool = (toolId) => {
    if (expandedTool === toolId) {
      setExpandedTool(null);
    } else {
      setExpandedTool(toolId);
      loadModules(toolId);
    }
  };

  const startEditModule = (mod) => {
    setEditingModule(mod.id);
    setEditForm({
      title: mod.title || '',
      level: mod.level || 'beginner',
      minutes: mod.minutes || 10,
      description: mod.description || '',
    });
  };

  const saveModule = async (moduleId) => {
    try {
      await adminFetch(`/modules/${moduleId}`, token, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      // Update local state
      setModules((prev) => {
        const updated = { ...prev };
        for (const toolId in updated) {
          updated[toolId] = updated[toolId].map((m) =>
            m.id === moduleId ? { ...m, ...editForm } : m
          );
        }
        return updated;
      });
      setEditingModule(null);
      setSuccess(`Module "${editForm.title}" updated`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteModule = async (moduleId, toolId) => {
    try {
      await adminFetch(`/modules/${moduleId}`, token, { method: 'DELETE' });
      setModules((prev) => ({
        ...prev,
        [toolId]: prev[toolId].filter((m) => m.id !== moduleId),
      }));
      setTools((prev) =>
        prev.map((t) =>
          t.id === toolId ? { ...t, module_count: t.module_count - 1 } : t
        )
      );
      setSuccess(`Module deleted`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    }
  };

  const startEditTool = (tool) => {
    setEditingTool(tool.id);
    setToolEditForm({
      name: tool.name || '',
      tagline: tool.tagline || '',
      description: tool.description || '',
    });
  };

  const saveTool = async (toolId) => {
    try {
      await adminFetch(`/tools/${toolId}`, token, {
        method: 'PUT',
        body: JSON.stringify(toolEditForm),
      });
      setTools((prev) =>
        prev.map((t) => (t.id === toolId ? { ...t, ...toolEditForm } : t))
      );
      setEditingTool(null);
      setSuccess(`Tool "${toolEditForm.name}" updated`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />
        Loading content...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-2 rounded-lg">
          {success}
        </div>
      )}

      {tools.map((tool) => (
        <div key={tool.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Tool header */}
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => toggleTool(tool.id)}
              className="flex items-center gap-3 flex-1 text-left"
            >
              {expandedTool === tool.id ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
              <div>
                {editingTool === tool.id ? (
                  <input
                    value={toolEditForm.name}
                    onChange={(e) =>
                      setToolEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-slate-900 border-b border-primary px-1 focus:outline-none"
                  />
                ) : (
                  <span className="font-semibold text-slate-900">{tool.name}</span>
                )}
                <span className="ml-2 text-xs text-slate-400">
                  {tool.module_count} modules · {tool.category_id}
                </span>
              </div>
            </button>
            <div className="flex items-center gap-1">
              {editingTool === tool.id ? (
                <>
                  <button
                    onClick={() => saveTool(tool.id)}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                    title="Save"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingTool(null)}
                    className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startEditTool(tool)}
                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg"
                  title="Edit tool"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Tagline edit */}
          {editingTool === tool.id && (
            <div className="px-4 pb-3 space-y-2">
              <input
                value={toolEditForm.tagline}
                onChange={(e) =>
                  setToolEditForm((f) => ({ ...f, tagline: e.target.value }))
                }
                placeholder="Tagline"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <textarea
                value={toolEditForm.description}
                onChange={(e) =>
                  setToolEditForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Description"
                rows={2}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          )}

          {/* Modules list */}
          <AnimatePresence>
            {expandedTool === tool.id && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-slate-100"
              >
                <div className="divide-y divide-slate-50">
                  {(modules[tool.id] || []).map((mod) => (
                    <div
                      key={mod.id}
                      className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50/50 text-sm"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />

                      {editingModule === mod.id ? (
                        <div className="flex-1 space-y-2">
                          <input
                            value={editForm.title}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, title: e.target.value }))
                            }
                            className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                          <div className="flex gap-2">
                            <select
                              value={editForm.level}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  level: e.target.value,
                                }))
                              }
                              className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                            >
                              <option value="beginner">Beginner</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="advanced">Advanced</option>
                            </select>
                            <input
                              type="number"
                              value={editForm.minutes}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  minutes: parseInt(e.target.value) || 0,
                                }))
                              }
                              className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                              placeholder="min"
                            />
                            <button
                              onClick={() => saveModule(mod.id)}
                              className="text-emerald-600 hover:bg-emerald-50 p-1 rounded-lg"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingModule(null)}
                              className="text-slate-400 hover:bg-slate-100 p-1 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <span className="text-slate-800 font-medium truncate block">
                              {mod.title}
                            </span>
                            <span className="text-xs text-slate-400">
                              {mod.level} · {mod.minutes}min
                              {mod.day ? ` · Day ${mod.day}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => startEditModule(mod)}
                              className="p-1 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg"
                              title="Edit module"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteModule(mod.id, tool.id)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                              title="Delete module"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {modules[tool.id] && modules[tool.id].length === 0 && (
                    <div className="px-4 py-4 text-center text-sm text-slate-400">
                      No modules in this tool
                    </div>
                  )}
                  {!modules[tool.id] && (
                    <div className="px-4 py-4 text-center text-sm text-slate-400">
                      <RefreshCw className="w-4 h-4 animate-spin inline-block mr-1" />
                      Loading...
                    </div>
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
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />
        Loading stats...
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: 'Registered Users', value: stats.users, color: 'bg-blue-500', icon: Users },
    { label: 'Courses', value: stats.tools, color: 'bg-violet-500', icon: BookOpen },
    { label: 'Total Modules', value: stats.modules, color: 'bg-emerald-500', icon: BarChart3 },
    { label: 'Enrollments', value: stats.enrollments, color: 'bg-amber-500', icon: Shield },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col items-center text-center"
        >
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
            <p className="text-sm text-slate-500">Manage users and course content</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-6">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center
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
        {activeTab === 'stats' && <StatsTab token={token} />}
      </div>
    </div>
  );
};

export default AdminPanel;
